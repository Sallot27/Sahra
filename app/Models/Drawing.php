<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

class Drawing extends Model
{
    use HasUlids, Prunable;

    protected $fillable = ['room_code', 'strokes'];

    public function prunable(): Builder
    {
        return static::where('created_at', '<', now()->subHours(6));
    }
}
