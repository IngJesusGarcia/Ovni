<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashRegister extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'initial_amount',
        'final_amount',
        'expected_amount',
        'difference',
        'status',
        'opened_at',
        'closed_at',
        'notes',
    ];

    protected $casts = [
        'initial_amount' => 'decimal:2',
        'final_amount' => 'decimal:2',
        'expected_amount' => 'decimal:2',
        'difference' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    // ── Relationships ──

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function cashMovements()
    {
        return $this->hasMany(CashMovement::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    // ── Scopes ──

    public function scopeOpen($query)
    {
        return $query->where('status', 'abierta');
    }

    public function scopeClosed($query)
    {
        return $query->where('status', 'cerrada');
    }

    // ── Helpers ──

    public function isOpen(): bool
    {
        return $this->status === 'abierta';
    }

    public function calculateExpectedAmount(): float
    {
        $salesTotal = $this->sales()->completed()->sum('total');
        $incomes = $this->cashMovements()->where('type', 'ingreso')->sum('amount');
        $withdrawals = $this->cashMovements()->where('type', 'retiro')->sum('amount');
        $cancellations = $this->cashMovements()->where('type', 'cancelacion')->sum('amount');

        return $this->initial_amount + $salesTotal + $incomes - $withdrawals - $cancellations;
    }
}
