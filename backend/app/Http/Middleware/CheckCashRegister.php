<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\CashRegister;

class CheckCashRegister
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        $openRegister = CashRegister::where('user_id', $user->id)
            ->where('status', 'abierta')
            ->first();

        if (!$openRegister) {
            return response()->json([
                'message' => 'Debes abrir una caja antes de realizar ventas.',
                'error_code' => 'NO_CASH_REGISTER',
            ], 403);
        }

        // Attach the register to the request for easy access
        $request->merge(['cash_register_id' => $openRegister->id]);

        return $next($request);
    }
}
