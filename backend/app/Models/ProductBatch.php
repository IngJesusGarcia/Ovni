<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'expiration_date',
        'stock',
        'batch_number',
    ];

    protected $casts = [
        'expiration_date' => 'date',
        'stock' => 'decimal:3',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function scopeExpired($query)
    {
        return $query->where('expiration_date', '<', now());
    }

    public function scopeExpiringSoon($query, int $days = 30)
    {
        return $query->whereBetween('expiration_date', [now(), now()->addDays($days)]);
    }
}
