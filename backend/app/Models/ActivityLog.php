<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'action',
        'module',
        'description',
        'properties',
        'ip',
    ];

    protected $casts = [
        'properties' => 'array',
    ];

    public const UPDATED_AT = null;

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function log(
        string $action,
        string $module,
        ?string $description = null,
        ?array $properties = null,
        ?int $userId = null
    ): self {
        return static::create([
            'user_id' => $userId ?? auth()->id(),
            'action' => $action,
            'module' => $module,
            'description' => $description,
            'properties' => $properties,
            'ip' => request()->ip(),
        ]);
    }

    public function scopeModule($query, string $module)
    {
        return $query->where('module', $module);
    }

    public function scopeAction($query, string $action)
    {
        return $query->where('action', $action);
    }
}
