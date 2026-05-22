<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\CashRegisterController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingController;

/*
|--------------------------------------------------------------------------
| API Routes — SICAR POS
|--------------------------------------------------------------------------
*/

// ── Auth (public) ──
Route::prefix('v1/auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
});

Route::get('v1/ping', function () {
    return response()->json(['status' => 'alive'], 200);
});

// ── Protected routes ──
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    // Products
    Route::get('products/search',           [ProductController::class, 'search']);
    Route::get('products/barcode/{code}',   [ProductController::class, 'findByBarcode']);
    Route::get('products/export',           [ProductController::class, 'export']);
    Route::get('products/template',         [ProductController::class, 'template']);
    Route::post('products/import/preview',  [ProductController::class, 'importPreview']);
    Route::post('products/import',          [ProductController::class, 'import']);
    Route::apiResource('products', ProductController::class);

    // Categories
    Route::apiResource('categories', CategoryController::class);

    // Inventory
    Route::post('inventory/entry', [InventoryController::class, 'entry']);
    Route::post('inventory/exit', [InventoryController::class, 'exit']);
    Route::post('inventory/adjust', [InventoryController::class, 'adjust']);
    Route::get('inventory/movements', [InventoryController::class, 'movements']);
    Route::get('inventory/kardex/{product}', [InventoryController::class, 'kardex']);

    // Clients
    Route::get('clients/{client}/purchases', [ClientController::class, 'purchases']);
    Route::post('clients/{client}/pay-balance', [ClientController::class, 'payBalance']);
    Route::apiResource('clients', ClientController::class);

    // Sales
    Route::get('sales/held', [SaleController::class, 'heldSales']);
    Route::post('sales/hold', [SaleController::class, 'hold']);
    Route::post('sales/{heldSale}/resume', [SaleController::class, 'resume']);
    Route::post('sales/{sale}/cancel', [SaleController::class, 'cancel']);
    Route::get('sales/{sale}/ticket', [SaleController::class, 'ticket']);
    Route::apiResource('sales', SaleController::class)->only(['index', 'store', 'show']);

    // Cash Register
    Route::post('cash-registers/open', [CashRegisterController::class, 'open']);
    Route::get('cash-registers/current', [CashRegisterController::class, 'current']);
    Route::get('cash-registers/history', [CashRegisterController::class, 'history']);
    Route::post('cash-registers/{cashRegister}/close', [CashRegisterController::class, 'close']);
    Route::post('cash-registers/{cashRegister}/income', [CashRegisterController::class, 'income']);
    Route::post('cash-registers/{cashRegister}/withdrawal', [CashRegisterController::class, 'withdrawal']);
    Route::get('cash-registers/{cashRegister}/report', [CashRegisterController::class, 'report']);

    // Reports (admin only)
    Route::middleware('role:admin')->prefix('reports')->group(function () {
        Route::get('dashboard', [ReportController::class, 'dashboard']);
        Route::get('sales', [ReportController::class, 'sales']);
        Route::get('sales-by-user', [ReportController::class, 'salesByUser']);
        Route::get('top-products', [ReportController::class, 'topProducts']);
        Route::get('profits', [ReportController::class, 'profits']);
    });

    // Settings (admin only)
    Route::middleware('role:admin')->group(function () {
        Route::get('settings', [SettingController::class, 'index']);
        Route::put('settings', [SettingController::class, 'update']);
    });

    
});
