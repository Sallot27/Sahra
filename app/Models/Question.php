<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    protected $fillable = ['category', 'text', 'answer', 'alternates', 'decoys', 'active'];

    protected function casts(): array
    {
        return [
            'alternates' => 'array',
            'decoys' => 'array',
            'active' => 'boolean',
        ];
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('active', true);
    }

    /** Shape the game client expects. */
    public function toGame(): array
    {
        return [
            'id' => $this->id,
            'c' => $this->category,
            'q' => $this->text,
            'a' => $this->answer,
            'alt' => array_values($this->alternates ?? []),
            'd' => array_values($this->decoys ?? []),
        ];
    }
}
