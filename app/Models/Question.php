<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    /** The 10 categories players choose from in فبركة, in display order. */
    public const TOPICS = [
        'حيوانات', 'تاريخ غريب', 'أكل وشرب', 'جسم الإنسان', 'علوم وفضاء',
        'دول ومدن', 'عادات وقوانين', 'كلمات وأصلها', 'شركات واختراعات', 'رياضة وألعاب',
        'سبيستون', 'أفلام ومسلسلات', 'ديزني', 'أغاني الأفلام',
    ];

    /** Topics built on other companies' films, characters and songs: private edition only. */
    public const LICENSED_TOPICS = ['سبيستون', 'أفلام ومسلسلات', 'ديزني', 'أغاني الأفلام'];

    /** Topics shown in the current edition. */
    public static function topics(): array
    {
        return config('sahra.edition') === 'commercial'
            ? array_values(array_diff(self::TOPICS, self::LICENSED_TOPICS))
            : self::TOPICS;
    }

    protected $fillable = ['category', 'topic', 'text', 'answer', 'alternates', 'decoys', 'active'];

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
            't' => $this->topic ?: 'منوعات',
            'q' => $this->text,
            'a' => $this->answer,
            'alt' => array_values($this->alternates ?? []),
            'd' => array_values($this->decoys ?? []),
        ];
    }
}
