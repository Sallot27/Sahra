<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Word extends Model
{
    protected $fillable = ['category', 'word', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('active', true);
    }
}
