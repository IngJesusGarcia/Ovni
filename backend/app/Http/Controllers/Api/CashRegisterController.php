<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Services\CashRegisterService;
use Illuminate\Http\Request;

class CashRegisterController extends Controller
{
    protected CashRegisterService $service;

    public function __construct(CashRegisterService $service)
    {
        $this->service = $service;
    }

    public function open(Request $request)
    {
        $request->validate(['initial_amount' => 'required|numeric|min:0']);
        try {
            $register = $this->service->openRegister(auth()->id(), $request->initial_amount);
            return response()->json(['message' => 'Caja abierta correctamente.', 'cash_register' => $register], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function close(Request $request, CashRegister $cashRegister)
    {
        $request->validate(['final_amount' => 'required|numeric|min:0', 'notes' => 'nullable|string']);
        try {
            $register = $this->service->closeRegister($cashRegister, $request->final_amount, $request->notes);
            return response()->json(['message' => 'Caja cerrada correctamente.', 'cash_register' => $register]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function income(Request $request, CashRegister $cashRegister)
    {
        $request->validate(['amount' => 'required|numeric|min:0.01', 'description' => 'required|string|max:255']);
        try {
            $movement = $this->service->addIncome($cashRegister, $request->amount, $request->description);
            return response()->json(['message' => 'Ingreso registrado.', 'movement' => $movement]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function withdrawal(Request $request, CashRegister $cashRegister)
    {
        $request->validate(['amount' => 'required|numeric|min:0.01', 'description' => 'required|string|max:255']);
        try {
            $movement = $this->service->addWithdrawal($cashRegister, $request->amount, $request->description);
            return response()->json(['message' => 'Retiro registrado.', 'movement' => $movement]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function report(CashRegister $cashRegister)
    {
        return response()->json($this->service->getReport($cashRegister));
    }

    public function current()
    {
        $register = $this->service->getCurrentRegister(auth()->id());
        return response()->json(['cash_register' => $register]);
    }

    public function history(Request $request)
    {
        $query = CashRegister::with('user:id,name')->orderBy('created_at', 'desc');
        if ($request->filled('user_id')) $query->where('user_id', $request->user_id);
        return response()->json($query->paginate(15));
    }
}
