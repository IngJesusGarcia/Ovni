<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\HeldSale;
use App\Services\SaleService;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    protected SaleService $saleService;

    public function __construct(SaleService $saleService)
    {
        $this->saleService = $saleService;
    }

    /**
     * Create a new sale
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.price' => 'nullable|numeric|min:0',
            'items.*.name' => 'nullable|string|max:255',
            'items.*.discount' => 'nullable|numeric|min:0',
            'client_id' => 'nullable|exists:clients,id',
            'payment_type' => 'required|string|in:efectivo,tarjeta,transferencia,mixto,credito',
            'payment_details' => 'nullable|array',
            'discount' => 'nullable|numeric|min:0',
            'cash_register_id' => 'nullable|integer',
        ]);

        try {
            $sale = $this->saleService->createSale($validated);
            return response()->json([
                'message' => 'Venta registrada correctamente.',
                'sale' => $sale,
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Show sale details
     */
    public function show(Sale $sale)
    {
        return response()->json(
            $sale->load('details.product', 'user:id,name', 'client:id,name')
        );
    }

    /**
     * Cancel a sale
     */
    public function cancel(Request $request, Sale $sale)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        try {
            $cancelled = $this->saleService->cancelSale(
                $sale,
                $request->reason,
                auth()->id()
            );

            return response()->json([
                'message' => 'Venta cancelada correctamente.',
                'sale' => $cancelled,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Hold a sale
     */
    public function hold(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'client_id' => 'nullable|exists:clients,id',
            'subtotal' => 'nullable|numeric',
            'discount' => 'nullable|numeric',
            'total' => 'nullable|numeric',
            'notes' => 'nullable|string',
        ]);

        $held = $this->saleService->holdSale($validated);

        return response()->json([
            'message' => 'Venta guardada en espera.',
            'held_sale' => $held,
        ], 201);
    }

    /**
     * Get held sales
     */
    public function heldSales()
    {
        return response()->json($this->saleService->getHeldSales());
    }

    /**
     * Resume a held sale
     */
    public function resume(HeldSale $heldSale)
    {
        $data = $this->saleService->resumeHeldSale($heldSale);

        return response()->json([
            'message' => 'Venta recuperada.',
            'data' => $data,
        ]);
    }

    /**
     * Get ticket data for (re)printing
     */
    public function ticket(Sale $sale)
    {
        return response()->json(
            $this->saleService->getTicketData($sale)
        );
    }

    /**
     * List recent sales
     */
    public function index(Request $request)
    {
        $query = Sale::with('user:id,name', 'client:id,name')
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to);
        }

        return response()->json($query->paginate($request->get('per_page', 20)));
    }
}
