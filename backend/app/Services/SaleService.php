<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\Product;
use App\Models\HeldSale;
use App\Models\CashMovement;
use App\Models\Client;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;

class SaleService
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    /**
     * Create a new sale with full transaction support (Optimized against 504 Gateway Timeout)
     */
    public function createSale(array $data): Sale
    {
        return DB::transaction(function () use ($data) {
            $userId = auth()->id();
            $items = $data['items'];

            // 1. Validar stock inicial (mantiene tu lógica de negocio)
            $this->inventoryService->validateMultipleStock($items);

            // 2. OPTIMIZACIÓN CLAVE: Extraer IDs y traer TODOS los productos involucrados en UNA SOLA consulta SQL
            $productIds = collect($items)->pluck('product_id')->unique()->toArray();
            $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

            // 3. Calcular totales y mapear detalles en memoria (evitando loops N+1 de red hacia la BD)
            $subtotal = 0;
            $discount = $data['discount'] ?? 0;
            $saleDetailsData = [];

            foreach ($items as $item) {
                $productId = $item['product_id'];
                
                // Buscar el producto directamente en la colección cargada previamente en memoria
                $product = $products->get($productId);
                if (!$product) {
                    throw new \Exception("El producto con ID {$productId} no existe en el catálogo.");
                }

                $qty = $item['quantity'];
                $price = $item['price'] ?? $product->price;
                $itemDiscount = $item['discount'] ?? 0;
                $itemSubtotal = ($price * $qty) - $itemDiscount;

                // Estructuramos el array de inserción masiva compatible con Eloquent/Query Builder
                $saleDetailsData[] = [
                    'product_id'   => $product->id,
                    'product_name' => $item['name'] ?? $product->name,
                    'quantity'     => $qty,
                    'price'        => $price,
                    'cost'         => $product->cost,
                    'discount'     => $itemDiscount,
                    'subtotal'     => $itemSubtotal,
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ];

                $subtotal += $itemSubtotal;
            }

            $total = $subtotal - $discount;

            // 4. Crear la cabecera de la venta (1 consulta INSERT)
            $sale = Sale::create([
                'ticket_number'    => Sale::generateTicketNumber(),
                'user_id'          => $userId,
                'client_id'        => $data['client_id'] ?? null,
                'cash_register_id' => $data['cash_register_id'] ?? null,
                'subtotal'         => $subtotal,
                'discount'         => $discount,
                'total'            => $total,
                'payment_type'     => $data['payment_type'] ?? 'efectivo',
                'payment_details'  => $data['payment_details'] ?? null,
                'status'           => 'completada',
            ]);

            // 5. OPTIMIZACIÓN CLAVE: Enlazar los detalles a la venta e insertarlos en un solo bloque (Bulk Insert)
            foreach ($saleDetailsData as &$detail) {
                $detail['sale_id'] = $sale->id;
            }
            unset($detail); // Romper la referencia de memoria del puntero anterior

            // Ejecuta una sola sentencia masiva SQL en lugar de hacer inserts concurrentes por artículo
            SaleDetail::insert($saleDetailsData);

            // 6. Descontar existencias y registrar el historial de movimientos de inventario
            foreach ($items as $item) {
                $product = $products->get($item['product_id']);
                $this->inventoryService->recordSaleMovement(
                    $product,
                    $item['quantity'],
                    $sale->id,
                    $userId
                );
            }

            // 7. Registrar flujo en la caja abierta actual
            if ($data['cash_register_id']) {
                CashMovement::create([
                    'cash_register_id' => $data['cash_register_id'],
                    'type'             => 'venta',
                    'amount'           => $total,
                    'description'      => "Venta #{$sale->ticket_number}",
                    'user_id'          => $userId,
                    'reference_id'     => $sale->id,
                    'reference_type'   => 'sale',
                ]);
            }

            // 8. Incrementar la cuenta por cobrar si se procesó a crédito comercial
            if ($data['payment_type'] === 'credito' && $data['client_id']) {
                Client::where('id', $data['client_id'])->increment('balance', $total);
            }

            // 9. Registrar auditoría interna en la bitácora
            ActivityLog::log('crear', 'ventas', "Venta {$sale->ticket_number} por \${$total}", [
                'sale_id'     => $sale->id,
                'total'       => $total,
                'items_count' => count($items),
            ]);

            return $sale->load('details.product', 'user', 'client');
        });
    }

    /**
     * Cancel a sale and reverse all operations
     */
    public function cancelSale(Sale $sale, string $reason, int $cancelledBy): Sale
    {
        if ($sale->is