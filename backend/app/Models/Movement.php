<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Movement extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'type',
        'quantity',
        'stock_before',
        'stock_after',
        'reference_type',
        'reference_id',
        'notes',
        'user_id',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'stock_before' => 'decimal:3',
        'stock_after' => 'decimal:3',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // ── Scopes ──

    public function scopeType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeForProduct($query, int $productId)
    {
        return $query->where('product_id', $productId);
    }

    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('created_at', [$from, $to]);
    }
}
