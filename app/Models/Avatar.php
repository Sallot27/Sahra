<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

class Avatar extends Model
{
    use HasUlids, Prunable;

    protected $fillable = ['room_code', 'mime', 'data'];

    /** Selfies are deleted after 12 hours. */
    public function prunable(): Builder
    {
        return static::where('created_at', '<', now()->subHours(12));
    }
}
