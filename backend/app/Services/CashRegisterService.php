<?php

namespace App\Services;

use App\Models\CashRegister;
use App\Models\CashMovement;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;

class CashRegisterService
{
    /**
     * Open a new cash register
     */
    public function openRegister(int $userId, float $initialAmount): CashRegister
    {
        // Check if user already has an open register
        $existingOpen = CashRegister::where('user_id', $userId)
            ->where('status', 'abierta')
            ->first();

        if ($existingOpen) {
            throw new \Exception('Ya tienes una caja abierta. Ciérrala antes de abrir otra.');
        }

        $register = CashRegister::create([
            'user_id' => $userId,
            'initial_amount' => $initialAmount,
            'status' => 'abierta',
            'opened_at' => now(),
        ]);

        ActivityLog::log('apertura', 'caja', "Apertura de caja con \${$initialAmount}", [
            'cash_register_id' => $register->id,
            'initial_amount' => $initialAmount,
        ]);

        return $register;
    }

    /**
     * Close a cash register (corte de caja)
     */
    public function closeRegister(CashRegister $register, float $countedAmount, ?string $notes = null): CashRegister
    {
        if (!$register->isOpen()) {
            throw new \Exception('Esta caja ya está cerrada.');
        }

        return DB::transaction(function () use ($register, $countedAmount, $notes) {
            $expectedAmount = $register->calculateExpectedAmount();
            $difference = $countedAmount - $expectedAmount;

            $register->update([
                'final_amount' => $countedAmount,
                'expected_amount' => $expectedAmount,
                'difference' => $difference,
                'status' => 'cerrada',
                'closed_at' => now(),
                'notes' => $notes,
            ]);

            ActivityLog::log('corte', 'caja', "Corte de caja. Esperado: \${$expectedAmount}, Contado: \${$countedAmount}, Diferencia: \${$difference}", [
                'cash_register_id' => $register->id,
                'expected_amount' => $expectedAmount,
                'final_amount' => $countedAmount,
                'difference' => $difference,
            ]);

            return $register->fresh();
        });
    }

    /**
     * Add an income to the register
     */
    public function addIncome(CashRegister $register, float $amount, string $description): CashMovement
    {
        if (!$register->isOpen()) {
            throw new \Exception('No puedes agregar ingresos a una caja cerrada.');
        }

        return CashMovement::create([
            'cash_register_id' => $register->id,
            'type' => 'ingreso',
            'amount' => $amount,
            'description' => $description,
            'user_id' => auth()->id(),
        ]);
    }

    /**
     * Add a withdrawal from the register
     */
    public function addWithdrawal(CashRegister $register, float $amount, string $description): CashMovement
    {
        if (!$register->isOpen()) {
            throw new \Exception('No puedes hacer retiros de una caja cerrada.');
        }

        return CashMovement::create([
            'cash_register_id' => $register->id,
            'type' => 'retiro',
            'amount' => $amount,
            'description' => $description,
            'user_id' => auth()->id(),
        ]);
    }

    /**
     * Get a complete report for a register
     */
    public function getReport(CashRegister $register): array
    {
        $register->load(['user:id,name', 'cashMovements.user:id,name', 'sales' => function ($q) {
            $q->completed();
        }]);

        $salesTotal = $register->sales->sum('total');
        $salesCount = $register->sales->count();
        $incomes = $register->cashMovements->where('type', 'ingreso')->sum('amount');
        $withdrawals = $register->cashMovements->where('type', 'retiro')->sum('amount');
        $cancellations = $register->cashMovements->where('type', 'cancelacion')->sum('amount');

        return [
            'register' => $register,
            'summary' => [
                'initial_amount' => (float) $register->initial_amount,
                'sales_total' => $salesTotal,
                'sales_count' => $salesCount,
                'incomes' => $incomes,
                'withdrawals' => $withdrawals,
                'cancellations' => $cancellations,
                'expected_amount' => $register->initial_amount + $salesTotal + $incomes - $withdrawals - $cancellations,
                'final_amount' => $register->final_amount,
                'difference' => $register->difference,
            ],
            'movements' => $register->cashMovements,
            'sales' => $register->sales,
        ];
    }

    /**
     * Get the current open register for a user
     */
    public function getCurrentRegister(int $userId): ?CashRegister
    {
        return CashRegister::where('user_id', $userId)
            ->where('status', 'abierta')
            ->latest()
            ->first();
    }
}
