<?php

namespace App\Http\Controllers;

use App\Models\DrawPrompt;
use App\Models\Question;
use App\Models\Word;
use App\Support\Reverb;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\View\View;

class GameController extends Controller
{
    public const CONTENT_CACHE_KEY = 'game-content';

    public function index(): View
    {
        return view('game', [
            'config' => [
                'reverb' => Reverb::clientConfig(),
                'ready' => Reverb::configured(),
                'api' => url('/api'),
            ],
        ]);
    }

    /** Everything the three games need, cached until the admin changes something. */
    public function content(): JsonResponse
    {
        $content = Cache::rememberForever(self::CONTENT_CACHE_KEY, fn () => [
            'questions' => Question::active()->orderBy('id')->get()->map->toGame()->values(),
            'prompts' => DrawPrompt::active()->orderBy('id')->pluck('text')->values(),
            'words' => Word::active()->orderBy('category')->orderBy('id')->get()
                ->groupBy('category')
                ->map(fn ($group) => $group->pluck('word')->values()),
        ]);

        return response()->json($content);
    }

    public static function forgetContent(): void
    {
        Cache::forget(self::CONTENT_CACHE_KEY);
    }
}
