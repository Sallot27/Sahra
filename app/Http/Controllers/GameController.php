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
    public const CONTENT_CACHE_KEY = 'game-content-v3';

    public function index(): View
    {
        return view('game', [
            'config' => [
                'reverb' => Reverb::clientConfig(),
                'ready' => Reverb::configured(),
                'api' => '/api',
            ],
        ]);
    }

    /** Everything the three games need, cached until the admin changes something. */
    public function content(): JsonResponse
    {
        // Plain arrays only: Laravel 13 will not unserialize objects from the cache.
        $content = Cache::rememberForever(self::CONTENT_CACHE_KEY, fn () => [
            'topics' => Question::TOPICS,
            'questions' => Question::active()->orderBy('id')->get()->map->toGame()->values()->all(),
            'prompts' => DrawPrompt::active()->orderBy('id')->pluck('text')->values()->all(),
            'words' => Word::active()->orderBy('category')->orderBy('id')->get()
                ->groupBy('category')
                ->map(fn ($group) => $group->pluck('word')->values()->all())
                ->all(),
        ]);

        return response()->json($content);
    }

    /**
     * Quick health report for setup problems: database, content and WebSockets.
     * Shows no secrets.
     */
    public function status(): JsonResponse
    {
        $db = ['connected' => false];
        try {
            $db = [
                'connected' => true,
                'questions' => Question::count(),
                'prompts' => DrawPrompt::count(),
                'words' => Word::count(),
            ];
        } catch (\Throwable $e) {
            $db['error'] = class_basename($e);
        }

        $reverb = Reverb::clientConfig();

        return response()->json([
            'app' => 'ok',
            'database' => $db,
            'websockets' => [
                'configured' => Reverb::configured(),
                'host' => $reverb['host'],
                'port' => $reverb['port'],
                'tls' => $reverb['tls'],
            ],
        ]);
    }

    public static function forgetContent(): void
    {
        Cache::forget(self::CONTENT_CACHE_KEY);
    }
}
