<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Services\CashRegisterService;
use App\Services\XlsxService;
use Illuminate\Http\Request;

class CashRegisterController extends Controller
{
    protected CashRegisterService $service;
    protected XlsxService $xlsx;

    public function __construct(CashRegisterService $service, XlsxService $xlsx)
    {
        $this->service = $service;
        $this->xlsx    = $xlsx;
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

    public function export(CashRegister $cashRegister)
    {
        $report = $this->service->getReport($cashRegister);
        $summary = $report['summary'];
        $register = $report['register'];

        // Sheet 1: Resumen
        $summaryHeaders = ['Concepto', 'Valor'];
        $summaryRows = [
            ['Cajero',          $register->user->name ?? '—'],
            ['Estado',          $register->status],
            ['Apertura',        $register->opened_at ? \Carbon\Carbon::parse($register->opened_at)->format('d/m/Y H:i') : '—'],
            ['Cierre',          $register->closed_at ? \Carbon\Carbon::parse($register->closed_at)->format('d/m/Y H:i') : '—'],
            ['Monto Inicial',   '$' . number_format($summary['initial_amount'], 2)],
            ['Ventas',          '$' . number_format($summary['sales_total'], 2)],
            ['# Ventas',        $summary['sales_count']],
            ['Ingresos Extras', '$' . number_format($summary['incomes'], 2)],
            ['Retiros',         '$' . number_format($summary['withdrawals'], 2)],
            ['Cancelaciones',   '$' . number_format($summary['cancellations'], 2)],
            ['Monto Esperado',  '$' . number_format($summary['expected_amount'], 2)],
            ['Monto Contado',   $summary['final_amount'] !== null ? '$' . number_format($summary['final_amount'], 2) : 'Pendiente'],
            ['Diferencia',      $summary['difference'] !== null ? '$' . number_format($summary['difference'], 2) : 'Pendiente'],
        ];

        // Movimientos
        $movHeaders = ['Tipo', 'Monto', 'Descripción', 'Hora'];
        $movRows = collect($report['movements'])->map(fn($m) => [
            ucfirst($m['type'] ?? $m->type),
            '$' . number_format($m['amount'] ?? $m->amount, 2),
            $m['description'] ?? $m->description,
            \Carbon\Carbon::parse($m['created_at'] ?? $m->created_at)->format('d/m/Y H:i'),
        ])->toArray();

        // Ventas del turno
        $salesHeaders = ['Folio', 'Hora', 'Total', 'Estado'];
        $salesRows = collect($report['sales'])->map(fn($s) => [
            $s['id'] ?? $s->id,
            \Carbon\Carbon::parse($s['created_at'] ?? $s->created_at)->format('H:i'),
            '$' . number_format($s['total'] ?? $s->total, 2),
            $s['status'] ?? $s->status,
        ])->toArray();

        // Combine all into one sheet separated by blank rows
        $allHeaders = $summaryHeaders;
        $allRows = array_merge(
            $summaryRows,
            [['', '']],
            [['--- MOVIMIENTOS ---', '']],
            empty($movRows) ? [['Sin movimientos', '']] : array_map(fn($r) => array_combine(array_keys($allHeaders), $r) ?: $r, $movRows),
            [['', '']],
            [['--- VENTAS DEL TURNO ---', '']],
            empty($salesRows) ? [['Sin ventas', '']] : array_map(fn($r) => [$r[0], $r[1], $r[2], $r[3]], $salesRows),
        );

        $xlsx = $this->xlsx->generate($summaryHeaders, $allRows, 'Corte de Caja');
        $filename = 'corte_caja_' . ($register->opened_at ? \Carbon\Carbon::parse($register->opened_at)->format('Ymd') : $register->id) . '.xlsx';

        return response($xlsx, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
