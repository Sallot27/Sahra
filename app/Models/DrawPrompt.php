<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class DrawPrompt extends Model
{
    protected $fillable = ['text', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('active', true);
    }
}
