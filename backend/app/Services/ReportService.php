<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\Product;
use App\Models\CashRegister;
use Illuminate\Support\Facades\DB;

class ReportService
{
    /**
     * Dashboard stats for today
     */
    public function dashboardStats(): array
    {
        $today = today();

        $salesToday = Sale::whereDate('created_at', $today)->completed();
        $salesTotal = (clone $salesToday)->sum('total');
        $salesCount = (clone $salesToday)->count();

        $profit = DB::table('sale_details')
            ->join('sales', 'sales.id', '=', 'sale_details.sale_id')
            ->whereDate('sales.created_at', $today)
            ->where('sales.status', 'completada')
            ->selectRaw('SUM(sale_details.subtotal - (sale_details.cost * sale_details.quantity)) as profit')
            ->value('profit') ?? 0;

        $lowStockCount = Product::active()->lowStock()->count();

        $topProducts = DB::table('sale_details')
            ->join('sales', 'sales.id', '=', 'sale_details.sale_id')
            ->whereDate('sales.created_at', $today)
            ->where('sales.status', 'completada')
            ->select('sale_details.product_name', DB::raw('SUM(sale_details.quantity) as total_qty'), DB::raw('SUM(sale_details.subtotal) as total_amount'))
            ->groupBy('sale_details.product_name')
            ->orderByDesc('total_qty')
            ->limit(5)
            ->get();

        return [
            'sales_total' => round($salesTotal, 2),
            'sales_count' => $salesCount,
            'profit' => round($profit, 2),
            'low_stock_count' => $lowStockCount,
            'top_products' => $topProducts,
        ];
    }

    /**
     * Sales by date range
     */
    public function salesByDate(string $from, string $to): array
    {
        $sales = Sale::completed()
            ->dateRange($from, $to)
            ->with('user:id,name', 'client:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        $summary = [
            'total' => $sales->sum('total'),
            'count' => $sales->count(),
            'average' => $sales->count() > 0 ? round($sales->avg('total'), 2) : 0,
        ];

        return [
            'sales' => $sales,
            'summary' => $summary,
        ];
    }

    /**
     * Sales by user
     */
    public function salesByUser(?string $from = null, ?string $to = null): array
    {
        $query = Sale::completed()
            ->select('user_id', DB::raw('COUNT(*) as sales_count'), DB::raw('SUM(total) as total'))
            ->groupBy('user_id')
            ->with('user:id,name');

        if ($from && $to) {
            $query->dateRange($from, $to);
        }

        return $query->get()->toArray();
    }

    /**
     * Top selling products
     */
    public function topProducts(?string $from = null, ?string $to = null, int $limit = 20): array
    {
        $query = DB::table('sale_details')
            ->join('sales', 'sales.id', '=', 'sale_details.sale_id')
            ->join('products', 'products.id', '=', 'sale_details.product_id')
            ->where('sales.status', 'completada')
            ->select(
                'products.id',
                'products.code',
                'sale_details.product_name',
                DB::raw('SUM(sale_details.quantity) as total_quantity'),
                DB::raw('SUM(sale_details.subtotal) as total_revenue'),
                DB::raw('SUM(sale_details.subtotal - (sale_details.cost * sale_details.quantity)) as total_profit')
            )
            ->groupBy('products.id', 'products.code', 'sale_details.product_name');

        if ($from && $to) {
            $query->whereBetween('sales.created_at', [$from, $to]);
        }

        return $query->orderByDesc('total_quantity')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /**
     * Profit report
     */
    public function profitReport(string $from, string $to): array
    {
        $dailyProfits = DB::table('sale_details')
            ->join('sales', 'sales.id', '=', 'sale_details.sale_id')
            ->where('sales.status', 'completada')
            ->whereBetween('sales.created_at', [$from, $to])
            ->select(
                DB::raw('DATE(sales.created_at) as date'),
                DB::raw('SUM(sale_details.subtotal) as revenue'),
                DB::raw('SUM(sale_details.cost * sale_details.quantity) as cost'),
                DB::raw('SUM(sale_details.subtotal - (sale_details.cost * sale_details.quantity)) as profit'),
                DB::raw('COUNT(DISTINCT sales.id) as sales_count')
            )
            ->groupBy(DB::raw('DATE(sales.created_at)'))
            ->orderBy('date')
            ->get();

        $totals = [
            'revenue' => $dailyProfits->sum('revenue'),
            'cost' => $dailyProfits->sum('cost'),
            'profit' => $dailyProfits->sum('profit'),
            'sales_count' => $dailyProfits->sum('sales_count'),
        ];

        return [
            'daily' => $dailyProfits,
            'totals' => $totals,
        ];
    }
}
