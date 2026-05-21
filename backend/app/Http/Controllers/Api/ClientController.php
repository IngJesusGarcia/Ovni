<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Sale;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::query();

        if ($request->filled('search')) {
            $query->where('name', 'LIKE', "%{$request->search}%");
        }
        if ($request->filled('with_debt')) {
            $query->withDebt();
        }

        return response()->json(
            $query->orderBy('name')->paginate($request->get('per_page', 25))
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'credit_limit' => 'nullable|numeric|min:0',
        ]);

        return response()->json(Client::create($validated), 201);
    }

    public function show(Client $client)
    {
        return response()->json($client);
    }

    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'credit_limit' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $client->update($validated);

        return response()->json($client);
    }

    public function destroy(Client $client)
    {
        if ($client->id === 1) {
            return response()->json(['message' => 'No puedes eliminar al cliente general.'], 422);
        }

        $client->delete();
        return response()->json(['message' => 'Cliente eliminado correctamente.']);
    }

    /**
     * Get purchase history for a client
     */
    public function purchases(Client $client)
    {
        $purchases = Sale::where('client_id', $client->id)
            ->completed()
            ->with('details:id,sale_id,product_name,quantity,price,subtotal')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($purchases);
    }

    /**
     * Pay balance for a client
     */
    public function payBalance(Request $request, Client $client)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
        ]);

        $amount = min($request->amount, $client->balance);

        Client::where('id', $client->id)
            ->where('balance', '>=', $amount)
            ->decrement('balance', $amount);

        return response()->json([
            'message' => "Abono de \${$amount} registrado correctamente.",
            'client' => $client->fresh(),
        ]);
    }
}
