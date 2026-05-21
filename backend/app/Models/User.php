<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
    ];

    // ── Relationships ──

    public function permission()
    {
        return $this->hasOne(Permission::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function cashRegisters()
    {
        return $this->hasMany(CashRegister::class);
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class);
    }

    // ── Scopes ──

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    // ── Helpers ──

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isCajero(): bool
    {
        return $this->role === 'cajero';
    }

    public function canDiscount(): bool
    {
        if ($this->isAdmin()) return true;
        return $this->permission?->can_discount ?? false;
    }

    public function canCancel(): bool
    {
        if ($this->isAdmin()) return true;
        return $this->permission?->can_cancel ?? false;
    }

    public function canReturn(): bool
    {
        if ($this->isAdmin()) return true;
        return $this->permission?->can_return ?? false;
    }

    public function maxDiscountPercent(): float
    {
        if ($this->isAdmin()) return 100;
        return $this->permission?->max_discount_percent ?? 0;
    }

    public function activeCashRegister()
    {
        return $this->cashRegisters()->where('status', 'abierta')->latest()->first();
    }
}
