<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\Product;
use App\Models\HeldSale;
use App\Models\CashMovement;
use App\Models\Client;
use App\Models\ActivityLog;
use App\Models\Setting;
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

            // 1. Validar stock inicial
            $this->inventoryService->validateMultipleStock($items);

            // 2. Extraer IDs y traer TODOS los productos involucrados en UNA SOLA consulta SQL
            $productIds = collect($items)->pluck('product_id')->unique()->toArray();
            $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

            // 3. Calcular totales y mapear detalles en memoria
            $subtotal = 0;
            $discount = $data['discount'] ?? 0;
            $saleDetailsData = [];

            foreach ($items as $item) {
                $productId = $item['product_id'];
                
                $product = $products->get($productId);
                if (!$product) {
                    throw new \Exception("El producto con ID {$productId} no existe en el catálogo.");
                }

                $qty = $item['quantity'];
                $price = $item['price'] ?? $product->price;
                $itemDiscount = $item['discount'] ?? 0;
                $itemSubtotal = ($price * $qty) - $itemDiscount;

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

            // 4. Crear la cabecera de la venta
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

            // 5. Enlazar los detalles a la venta e insertarlos en Bulk
            foreach ($saleDetailsData as &$detail) {
                $detail['sale_id'] = $sale->id;
            }
            unset($detail);

            SaleDetail::insert($saleDetailsData);

            // 6. Descontar existencias y registrar movimientos de inventario
            foreach ($items as $item) {
                $product = $products->get($item['product_id']);
                $this->inventoryService->recordSaleMovement(
                    $product,
                    $item['quantity'],
                    $sale->id,
                    $userId
                );
            }

            // 7. Registrar flujo en la caja
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

            // 8. Incrementar saldo de cliente si es crédito
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
        if ($sale->isCancelled()) {
            throw new \Exception('Esta venta ya fue cancelada.');
        }

        return DB::transaction(function () use ($sale, $reason, $cancelledBy) {
            foreach ($sale->details as $detail) {
                $product = Product::find($detail->product_id);
                if ($product) {
                    $this->inventoryService->reverseSaleMovement(
                        $product,
                        $detail->quantity,
                        $sale->id,
                        $cancelledBy
                    );
                }
            }

            if ($sale->cash_register_id) {
                CashMovement::create([
                    'cash_register_id' => $sale->cash_register_id,
                    'type'             => 'cancelacion',
                    'amount'           => $sale->total,
                    'description'      => "Cancelación venta #{$sale->ticket_number}",
                    'user_id'          => $cancelledBy,
                    'reference_id'     => $sale->id,
                    'reference_type'   => 'sale',
                ]);
            }

            if ($sale->payment_type === 'credito' && $sale->client_id) {
                Client::where('id', $sale->client_id)
                    ->where('balance', '>=', $sale->total)
                    ->decrement('balance', $sale->total);
            }

            $sale->update([
                'status'        => 'cancelada',
                'cancel_reason' => $reason,
                'cancelled_by'  => $cancelledBy,
                'cancelled_at'  => now(),
            ]);

            ActivityLog::log('cancelar', 'ventas', "Cancelación venta {$sale->ticket_number}: {$reason}", [
                'sale_id' => $sale->id,
                'total'   => $sale->total,
                'reason'  => $reason,
            ]);

            return $sale->fresh(['details.product', 'user', 'client']);
        });
    }

    /**
     * Refund specific quantities of items from a sale
     */
    public function refundSaleItems(Sale $sale, array $refundItems, string $reason, int $userId): Sale
    {
        if ($sale->isCancelled()) {
            throw new \Exception('No se pueden reembolsar artículos de una venta cancelada.');
        }

        return DB::transaction(function () use ($sale, $refundItems, $reason, $userId) {
            $totalRefundAmount = 0;
            $itemsRefundedCount = 0;

            foreach ($refundItems as $refund) {
                $detailId = $refund['sale_detail_id'];
                $refundQty = (float) $refund['quantity'];

                if ($refundQty <= 0) {
                    continue;
                }

                $detail = SaleDetail::where('sale_id', $sale->id)->where('id', $detailId)->first();
                if (!$detail) {
                    throw new \Exception("Detalle de venta con ID {$detailId} no pertenece a esta venta.");
                }

                $remainingQty = (float) ($detail->quantity - $detail->refunded_quantity);
                if ($refundQty > $remainingQty) {
                    throw new \Exception("La cantidad a reembolsar ({$refundQty}) para el producto '{$detail->product_name}' excede el remanente disponible ({$remainingQty}).");
                }

                // Incrementar cantidad reembolsada
                $detail->increment('refunded_quantity', $refundQty);

                // Revertir inventario
                $product = Product::find($detail->product_id);
                if ($product) {
                    $this->inventoryService->reverseSaleMovement(
                        $product,
                        $refundQty,
                        $sale->id,
                        $userId,
                        "Devolución parcial: {$reason}"
                    );
                }

                // Calcular monto devuelto (precio menos descuento proporcional)
                $discountPerUnit = $detail->quantity > 0 ? ($detail->discount / $detail->quantity) : 0;
                $itemRefundTotal = ($detail->price * $refundQty) - ($discountPerUnit * $refundQty);

                $totalRefundAmount += $itemRefundTotal;
                $itemsRefundedCount++;
            }

            if ($totalRefundAmount <= 0) {
                throw new \Exception('No se especificaron cantidades válidas para reembolsar.');
            }

            // Registrar movimiento de retiro de caja si aplica
            if ($sale->cash_register_id) {
                CashMovement::create([
                    'cash_register_id' => $sale->cash_register_id,
                    'type'             => 'retiro',
                    'amount'           => $totalRefundAmount,
                    'description'      => "Reembolso parcial venta #{$sale->ticket_number}: {$reason}",
                    'user_id'          => $userId,
                    'reference_id'     => $sale->id,
                    'reference_type'   => 'sale',
                ]);
            }

            // Descontar saldo del cliente si fue venta a crédito
            if ($sale->payment_type === 'credito' && $sale->client_id) {
                Client::where('id', $sale->client_id)
                    ->where('balance', '>=', $totalRefundAmount)
                    ->decrement('balance', $totalRefundAmount);
            }

            // Recargar detalles y comprobar si todo está completamente devuelto
            $sale->load('details');
            $allRefunded = true;
            foreach ($sale->details as $d) {
                if ($d->quantity > $d->refunded_quantity) {
                    $allRefunded = false;
                    break;
                }
            }

            // Si todos los artículos de la venta fueron devueltos, marcar la venta como cancelada
            if ($allRefunded) {
                $sale->update([
                    'status'        => 'cancelada',
                    'cancel_reason' => "Reembolso total de artículos: {$reason}",
                    'cancelled_by'  => $userId,
                    'cancelled_at'  => now(),
                ]);
            }

            ActivityLog::log('reembolso', 'ventas', "Reembolso parcial venta {$sale->ticket_number} por \${$totalRefundAmount}: {$reason}", [
                'sale_id'       => $sale->id,
                'refund_amount' => $totalRefundAmount,
                'reason'        => $reason,
            ]);

            return $sale->fresh(['details.product', 'user', 'client']);
        });
    }

    /**
     * Hold a sale for later
     */
    public function holdSale(array $data): HeldSale
    {
        return HeldSale::create([
            'user_id'   => auth()->id(),
            'client_id' => $data['client_id'] ?? null,
            'items'     => $data['items'],
            'subtotal'  => $data['subtotal'] ?? 0,
            'discount'  => $data['discount'] ?? 0,
            'total'     => $data['total'] ?? 0,
            'notes'     => $data['notes'] ?? null,
        ]);
    }

    /**
     * Get all held sales for the current user
     */
    public function getHeldSales()
    {
        return HeldSale::where('user_id', auth()->id())
            ->with('client:id,name')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Resume a held sale (delete it and return data)
     */
    public function resumeHeldSale(HeldSale $heldSale): array
    {
        $data = $heldSale->toArray();
        $heldSale->delete();
        return $data;
    }

    /**
     * Get ticket data for printing
     */
    public function getTicketData(Sale $sale): array
    {
        $sale->load('details.product', 'user:id,name', 'client:id,name');

        return [
            'sale'     => $sale,
            'settings' => [
                'business_name'    => Setting::getValue('business_name', 'Mi Abarrotes'),
                'business_address' => Setting::getValue('business_address', ''),
                'business_phone'   => Setting::getValue('business_phone', ''),
                'ticket_header'    => Setting::getValue('ticket_header', ''),
                'ticket_footer'    => Setting::getValue('ticket_footer', '¡Gracias por su compra!'),
            ],
        ];
    }
}