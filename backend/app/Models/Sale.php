<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'ticket_number',
        'user_id',
        'client_id',
        'cash_register_id',
        'subtotal',
        'discount',
        'total',
        'payment_type',
        'payment_details',
        'status',
        'cancel_reason',
        'cancelled_by',
        'cancelled_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'payment_details' => 'array',
        'cancelled_at' => 'datetime',
    ];

    // ── Relationships ──

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function cashRegister()
    {
        return $this->belongsTo(CashRegister::class);
    }

    public function details()
    {
        return $this->hasMany(SaleDetail::class);
    }

    public function cancelledByUser()
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    // ── Scopes ──

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completada');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelada');
    }

    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }

    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('created_at', [$from, $to]);
    }

    // ── Helpers ──

    public static function generateTicketNumber(): string
    {
        $prefix = 'T' . now()->format('Ymd');
        $lastSale = static::where('ticket_number', 'LIKE', "{$prefix}%")
            ->orderBy('ticket_number', 'desc')
            ->first();

        if ($lastSale) {
            $lastNumber = (int) substr($lastSale->ticket_number, -4);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return $prefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completada';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelada';
    }
}
