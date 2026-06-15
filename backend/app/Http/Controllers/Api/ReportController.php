<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use App\Services\XlsxService;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    protected ReportService $reportService;
    protected XlsxService $xlsx;

    public function __construct(ReportService $reportService, XlsxService $xlsx)
    {
        $this->reportService = $reportService;
        $this->xlsx = $xlsx;
    }

    public function dashboard()
    {
        return response()->json($this->reportService->dashboardStats());
    }

    public function sales(Request $request)
    {
        $request->validate(['from' => 'required|date', 'to' => 'required|date']);
        return response()->json($this->reportService->salesByDate($request->from, $request->to));
    }

    public function salesByUser(Request $request)
    {
        return response()->json($this->reportService->salesByUser($request->from, $request->to));
    }

    public function topProducts(Request $request)
    {
        return response()->json($this->reportService->topProducts($request->from, $request->to, $request->get('limit', 20)));
    }

    public function profits(Request $request)
    {
        $request->validate(['from' => 'required|date', 'to' => 'required|date']);
        return response()->json($this->reportService->profitReport($request->from, $request->to));
    }

    // ── Excel exports ──

    public function exportSales(Request $request)
    {
        $request->validate(['from' => 'required|date', 'to' => 'required|date']);
        $data = $this->reportService->salesByDate($request->from, $request->to);

        $headers = ['Folio', 'Fecha', 'Cajero', 'Cliente', 'Subtotal', 'Descuento', 'Total', 'Estado'];
        $rows = collect($data['sales'])->map(fn($s) => [
            $s['id'],
            \Carbon\Carbon::parse($s['created_at'])->format('d/m/Y H:i'),
            $s['user']['name'] ?? '—',
            $s['client']['name'] ?? 'Público General',
            number_format($s['subtotal'] ?? $s['total'], 2),
            number_format($s['discount'] ?? 0, 2),
            number_format($s['total'], 2),
            $s['status'],
        ])->toArray();

        $xlsx = $this->xlsx->generate($headers, $rows, 'Ventas');
        $filename = 'ventas_' . $request->from . '_' . $request->to . '.xlsx';

        return response($xlsx, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function exportTopProducts(Request $request)
    {
        $products = $this->reportService->topProducts($request->from, $request->to, 100);

        $headers = ['Código', 'Producto', 'Cantidad Vendida', 'Ingresos', 'Ganancia'];
        $rows = collect($products)->map(fn($p) => [
            $p->code ?? '—',
            $p->product_name,
            number_format($p->total_quantity, 2),
            number_format($p->total_revenue, 2),
            number_format($p->total_profit, 2),
        ])->toArray();

        $xlsx = $this->xlsx->generate($headers, $rows, 'Top Productos');
        $from = $request->from ?? 'todo';
        $to   = $request->to   ?? 'todo';
        $filename = "top_productos_{$from}_{$to}.xlsx";

        return response($xlsx, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function exportProfits(Request $request)
    {
        $request->validate(['from' => 'required|date', 'to' => 'required|date']);
        $data = $this->reportService->profitReport($request->from, $request->to);

        $headers = ['Fecha', 'Ventas', 'Ingresos', 'Costo', 'Ganancia'];
        $rows = collect($data['daily'])->map(fn($d) => [
            $d->date,
            $d->sales_count,
            number_format($d->revenue, 2),
            number_format($d->cost, 2),
            number_format($d->profit, 2),
        ])->toArray();

        $xlsx = $this->xlsx->generate($headers, $rows, 'Ganancias');
        $filename = 'ganancias_' . $request->from . '_' . $request->to . '.xlsx';

        return response($xlsx, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
