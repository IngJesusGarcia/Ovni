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
     * Create a new sale with full transaction support
     */
    public function createSale(array $data): Sale
    {
        return DB::transaction(function () use ($data) {
            $userId = auth()->id();
            $items = $data['items'];

            // 1. Validate ALL stock first
            $this->inventoryService->validateMultipleStock($items);

            // 2. Calculate totals
            $subtotal = 0;
            $discount = $data['discount'] ?? 0;
            $saleDetails = [];

            foreach ($items as $item) {
                $product = Product::findOrFail($item['product_id']);
                $qty = $item['quantity'];
                $price = $item['price'] ?? $product->price;
                $itemDiscount = $item['discount'] ?? 0;
                $itemSubtotal = ($price * $qty) - $itemDiscount;

                $saleDetails[] = [
                    'product_id' => $product->id,
                    'product_name' => $item['name'] ?? $product->name,
                    'quantity' => $qty,
                    'price' => $price,
                    'cost' => $product->cost,
                    'discount' => $itemDiscount,
                    'subtotal' => $itemSubtotal,
                ];

                $subtotal += $itemSubtotal;
            }

            $total = $subtotal - $discount;

            // 3. Create sale
            $sale = Sale::create([
                'ticket_number' => Sale::generateTicketNumber(),
                'user_id' => $userId,
                'client_id' => $data['client_id'] ?? null,
                'cash_register_id' => $data['cash_register_id'] ?? null,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => $total,
                'payment_type' => $data['payment_type'] ?? 'efectivo',
                'payment_details' => $data['payment_details'] ?? null,
                'status' => 'completada',
            ]);

            // 4. Create sale details
            foreach ($saleDetails as $detail) {
                $sale->details()->create($detail);
            }

            // 5. Deduct stock and record movements
            foreach ($items as $item) {
                $product = Product::findOrFail($item['product_id']);
                $this->inventoryService->recordSaleMovement(
                    $product,
                    $item['quantity'],
                    $sale->id,
                    $userId
                );
            }

            // 6. Record cash movement
            if ($data['cash_register_id']) {
                CashMovement::create([
                    'cash_register_id' => $data['cash_register_id'],
                    'type' => 'venta',
                    'amount' => $total,
                    'description' => "Venta #{$sale->ticket_number}",
                    'user_id' => $userId,
                    'reference_id' => $sale->id,
                    'reference_type' => 'sale',
                ]);
            }

            // 7. Update client balance if credit sale
            if ($data['payment_type'] === 'credito' && $data['client_id']) {
                Client::where('id', $data['client_id'])->increment('balance', $total);
            }

            // 8. Activity log
            ActivityLog::log('crear', 'ventas', "Venta {$sale->ticket_number} por \${$total}", [
                'sale_id' => $sale->id,
                'total' => $total,
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
            // 1. Reverse stock for each detail
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

            // 2. Record negative cash movement
            if ($sale->cash_register_id) {
                CashMovement::create([
                    'cash_register_id' => $sale->cash_register_id,
                    'type' => 'cancelacion',
                    'amount' => $sale->total,
                    'description' => "Cancelación venta #{$sale->ticket_number}",
                    'user_id' => $cancelledBy,
                    'reference_id' => $sale->id,
                    'reference_type' => 'sale',
                ]);
            }

            // 3. Reverse client balance if credit
            if ($sale->payment_type === 'credito' && $sale->client_id) {
                Client::where('id', $sale->client_id)
                    ->where('balance', '>=', $sale->total)
                    ->decrement('balance', $sale->total);
            }

            // 4. Update sale status
            $sale->update([
                'status' => 'cancelada',
                'cancel_reason' => $reason,
                'cancelled_by' => $cancelledBy,
                'cancelled_at' => now(),
            ]);

            // 5. Activity log
            ActivityLog::log('cancelar', 'ventas', "Cancelación venta {$sale->ticket_number}: {$reason}", [
                'sale_id' => $sale->id,
                'total' => $sale->total,
                'reason' => $reason,
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
            'user_id' => auth()->id(),
            'client_id' => $data['client_id'] ?? null,
            'items' => $data['items'],
            'subtotal' => $data['subtotal'] ?? 0,
            'discount' => $data['discount'] ?? 0,
            'total' => $data['total'] ?? 0,
            'notes' => $data['notes'] ?? null,
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
            'sale' => $sale,
            'settings' => [
                'business_name' => \App\Models\Setting::getValue('business_name', 'Mi Abarrotes'),
                'business_address' => \App\Models\Setting::getValue('business_address', ''),
                'business_phone' => \App\Models\Setting::getValue('business_phone', ''),
                'ticket_header' => \App\Models\Setting::getValue('ticket_header', ''),
                'ticket_footer' => \App\Models\Setting::getValue('ticket_footer', '¡Gracias por su compra!'),
            ],
        ];
    }
}
