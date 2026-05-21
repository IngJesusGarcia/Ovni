<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'description',
        'price',
        'cost',
        'stock',
        'min_stock',
        'unit',
        'has_expiration',
        'category_id',
        'is_active',
        'use_inventory',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'cost' => 'decimal:2',
        'stock' => 'decimal:3',
        'min_stock' => 'decimal:3',
        'has_expiration' => 'boolean',
        'is_active' => 'boolean',
        'use_inventory' => 'boolean',
    ];

    // ── Relationships ──

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function batches()
    {
        return $this->hasMany(ProductBatch::class);
    }

    public function saleDetails()
    {
        return $this->hasMany(SaleDetail::class);
    }

    public function movements()
    {
        return $this->hasMany(Movement::class);
    }

    // ── Scopes ──

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeInStock($query)
    {
        return $query->where('stock', '>', 0);
    }

    public function scopeLowStock($query)
    {
        return $query->whereColumn('stock', '<=', 'min_stock')
                     ->where('min_stock', '>', 0);
    }

    public function scopeSearch($query, string $term)
    {
        return $query->where(function ($q) use ($term) {
            $q->where('code', 'LIKE', "%{$term}%")
              ->orWhere('name', 'LIKE', "%{$term}%");
        });
    }

    // ── Helpers ──

    public function hasEnoughStock(float $quantity): bool
    {
        return $this->stock >= $quantity;
    }

    public function isByWeight(): bool
    {
        return $this->unit === 'kg';
    }
}
