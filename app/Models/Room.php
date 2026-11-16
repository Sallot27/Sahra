<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

class Room extends Model
{
    use Prunable;

    protected $fillable = ['code', 'host_token_hash', 'last_active_at', 'kicked'];

    protected $hidden = ['host_token_hash'];

    protected function casts(): array
    {
        return ['last_active_at' => 'datetime', 'kicked' => 'array'];
    }

    public function checkHostToken(?string $token): bool
    {
        return is_string($token) && $token !== ''
            && hash_equals($this->host_token_hash, hash('sha256', $token));
    }

    public function isKicked(string $uid): bool
    {
        return in_array($uid, $this->kicked ?? [], true);
    }

    /** Rooms nobody touched for 6 hours are removed by `model:prune` (hourly). */
    public function prunable(): Builder
    {
        return static::where('updated_at', '<', now()->subHours(6));
    }
}
