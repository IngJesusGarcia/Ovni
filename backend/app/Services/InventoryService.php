<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Movement;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    /**
     * Add stock to a product (entrada)
     */
    public function addStock(Product $product, float $quantity, ?string $notes = null, ?int $userId = null): Movement
    {
        return DB::transaction(function () use ($product, $quantity, $notes, $userId) {
            $stockBefore = $product->stock;

            // Atomic increment
            Product::where('id', $product->id)->increment('stock', $quantity);
            $product->refresh();

            return Movement::create([
                'product_id' => $product->id,
                'type' => 'entrada',
                'quantity' => $quantity,
                'stock_before' => $stockBefore,
                'stock_after' => $product->stock,
                'notes' => $notes,
                'user_id' => $userId ?? auth()->id(),
            ]);
        });
    }

    /**
     * Remove stock from a product (salida)
     */
    public function removeStock(Product $product, float $quantity, ?string $notes = null, ?int $userId = null): Movement
    {
        return DB::transaction(function () use ($product, $quantity, $notes, $userId) {
            // Validate stock availability
            $this->validateStock($product, $quantity);

            $stockBefore = $product->stock;

            // Atomic decrement with stock check
            $updated = Product::where('id', $product->id)
                ->where('stock', '>=', $quantity)
                ->decrement('stock', $quantity);

            if (!$updated) {
                throw new \Exception("Stock insuficiente para {$product->name}. Disponible: {$product->stock}");
            }

            $product->refresh();

            return Movement::create([
                'product_id' => $product->id,
                'type' => 'salida',
                'quantity' => $quantity,
                'stock_before' => $stockBefore,
                'stock_after' => $product->stock,
                'notes' => $notes,
                'user_id' => $userId ?? auth()->id(),
            ]);
        });
    }

    /**
     * Adjust stock to a specific amount (ajuste)
     */
    public function adjustStock(Product $product, float $newQuantity, ?string $notes = null, ?int $userId = null): Movement
    {
        return DB::transaction(function () use ($product, $newQuantity, $notes, $userId) {
            $stockBefore = $product->stock;
            $difference = $newQuantity - $stockBefore;

            $product->update(['stock' => $newQuantity]);

            return Movement::create([
                'product_id' => $product->id,
                'type' => 'ajuste',
                'quantity' => abs($difference),
                'stock_before' => $stockBefore,
                'stock_after' => $newQuantity,
                'notes' => $notes ?? "Ajuste de {$stockBefore} a {$newQuantity}",
                'user_id' => $userId ?? auth()->id(),
            ]);
        });
    }

    /**
     * Record a sale movement (called from SaleService)
     */
    public function recordSaleMovement(Product $product, float $quantity, int $saleId, int $userId): Movement
    {
        $stockBefore = $product->stock;

        // Skip stock decrement for generic fast product OR products that don't use inventory
        if ($product->code === 'RAPIDO' || !$product->use_inventory) {
            return Movement::create([
                'product_id' => $product->id,
                'type' => 'venta',
                'quantity' => $quantity,
                'stock_before' => $stockBefore,
                'stock_after' => $stockBefore,
                'reference_type' => 'sale',
                'reference_id' => $saleId,
                'user_id' => $userId,
            ]);
        }

        // Atomic decrement with stock check
        $updated = Product::where('id', $product->id)
            ->where('stock', '>=', $quantity)
            ->decrement('stock', $quantity);

        if (!$updated) {
            throw new \Exception("Stock insuficiente para {$product->name}. Disponible: {$product->stock}");
        }

        $product->refresh();

        return Movement::create([
            'product_id' => $product->id,
            'type' => 'venta',
            'quantity' => $quantity,
            'stock_before' => $stockBefore,
            'stock_after' => $product->stock,
            'reference_type' => 'sale',
            'reference_id' => $saleId,
            'user_id' => $userId,
        ]);
    }

    /**
     * Reverse a sale movement (cancelación / devolución)
     */
    public function reverseSaleMovement(Product $product, float $quantity, int $saleId, int $userId, ?string $notes = null): Movement
    {
        $stockBefore = $product->stock;

        // Skip stock increment for generic fast product OR products that don't use inventory
        if ($product->code === 'RAPIDO' || !$product->use_inventory) {
            return Movement::create([
                'product_id' => $product->id,
                'type' => 'cancelacion',
                'quantity' => $quantity,
                'stock_before' => $stockBefore,
                'stock_after' => $stockBefore,
                'reference_type' => 'sale',
                'reference_id' => $saleId,
                'notes' => $notes ?? 'Cancelación de venta',
                'user_id' => $userId,
            ]);
        }

        Product::where('id', $product->id)->increment('stock', $quantity);
        $product->refresh();

        return Movement::create([
            'product_id' => $product->id,
            'type' => 'cancelacion',
            'quantity' => $quantity,
            'stock_before' => $stockBefore,
            'stock_after' => $product->stock,
            'reference_type' => 'sale',
            'reference_id' => $saleId,
            'notes' => $notes ?? 'Cancelación de venta',
            'user_id' => $userId,
        ]);
    }

    /**
     * Validate that a product has enough stock
     */
    public function validateStock(Product $product, float $quantity): void
    {
        if ($product->code === 'RAPIDO' || !$product->use_inventory) {
            return;
        }

        if ($product->stock < $quantity) {
            throw new \Exception(
                "Stock insuficiente para '{$product->name}'. Disponible: {$product->stock} {$product->unit}, Solicitado: {$quantity}"
            );
        }
    }

    /**
     * Validate multiple items stock at once
     */
    public function validateMultipleStock(array $items): void
    {
        foreach ($items as $item) {
            $product = Product::findOrFail($item['product_id']);
            $this->validateStock($product, $item['quantity']);
        }
    }

    /**
     * Get kardex for a product
     */
    public function getKardex(int $productId, ?string $from = null, ?string $to = null)
    {
        $query = Movement::where('product_id', $productId)
            ->with('user:id,name')
            ->orderBy('created_at', 'desc');

        if ($from) {
            $query->where('created_at', '>=', $from);
        }
        if ($to) {
            $query->where('created_at', '<=', $to);
        }

        return $query->paginate(50);
    }
}
