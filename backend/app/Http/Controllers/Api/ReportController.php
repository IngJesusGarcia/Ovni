<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    protected ReportService $reportService;

    public function __construct(ReportService $reportService)
    {
        $this->reportService = $reportService;
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
}
