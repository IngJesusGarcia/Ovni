<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'product_id',
        'product_name',
        'quantity',
        'refunded_quantity',
        'price',
        'cost',
        'discount',
        'subtotal',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'refunded_quantity' => 'decimal:3',
        'price' => 'decimal:2',
        'cost' => 'decimal:2',
        'discount' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    protected $appends = ['remaining_quantity'];

    public function getRemainingQuantityAttribute(): float
    {
        return (float) max(0, $this->quantity - ($this->refunded_quantity ?? 0));
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function getProfit(): float
    {
        return $this->subtotal - ($this->cost * $this->quantity);
    }
}
