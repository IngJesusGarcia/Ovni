<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Movement;
use App\Services\InventoryService;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    /**
     * Stock entry
     */
    public function entry(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|numeric|min:0.001',
            'notes' => 'nullable|string',
        ]);

        try {
            $product = Product::findOrFail($validated['product_id']);
            $movement = $this->inventoryService->addStock(
                $product,
                $validated['quantity'],
                $validated['notes']
            );

            return response()->json([
                'message' => 'Entrada registrada correctamente.',
                'movement' => $movement,
                'product' => $product->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Stock exit
     */
    public function exit(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|numeric|min:0.001',
            'notes' => 'nullable|string',
        ]);

        try {
            $product = Product::findOrFail($validated['product_id']);
            $movement = $this->inventoryService->removeStock(
                $product,
                $validated['quantity'],
                $validated['notes']
            );

            return response()->json([
                'message' => 'Salida registrada correctamente.',
                'movement' => $movement,
                'product' => $product->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Stock adjustment
     */
    public function adjust(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'new_quantity' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        try {
            $product = Product::findOrFail($validated['product_id']);
            $movement = $this->inventoryService->adjustStock(
                $product,
                $validated['new_quantity'],
                $validated['notes']
            );

            return response()->json([
                'message' => 'Ajuste registrado correctamente.',
                'movement' => $movement,
                'product' => $product->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Movement history
     */
    public function movements(Request $request)
    {
        $query = Movement::with(['product:id,code,name', 'user:id,name'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to);
        }

        return response()->json($query->paginate($request->get('per_page', 30)));
    }

    /**
     * Kardex for a specific product
     */
    public function kardex(Request $request, Product $product)
    {
        $kardex = $this->inventoryService->getKardex(
            $product->id,
            $request->from,
            $request->to
        );

        return response()->json([
            'product' => $product,
            'movements' => $kardex,
        ]);
    }
}
