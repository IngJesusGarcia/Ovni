<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'can_discount',
        'can_return',
        'can_cancel',
        'max_discount_percent',
    ];

    protected $casts = [
        'can_discount' => 'boolean',
        'can_return' => 'boolean',
        'can_cancel' => 'boolean',
        'max_discount_percent' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
