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
                'edition' => config('sahra.edition'),
                'hostCode' => config('sahra.host_codes') !== [],
            ],
        ]);
    }

    /** Everything the three games need, cached until the admin changes something. */
    public function content(): JsonResponse
    {
        // Plain arrays only: Laravel 13 will not unserialize objects from the cache.
        $commercial = config('sahra.edition') === 'commercial';
        $content = Cache::rememberForever(self::cacheKey(), fn () => [
            'topics' => Question::topics(),
            'questions' => Question::active()
                ->when($commercial, fn ($q) => $q->where(fn ($w) => $w
                    ->whereNull('topic')->orWhereNotIn('topic', Question::LICENSED_TOPICS)))
                ->orderBy('id')->get()->map->toGame()->values()->all(),
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
            'edition' => config('sahra.edition'),
            'host_code_required' => config('sahra.host_codes') !== [],
            'database' => $db,
            'websockets' => [
                'configured' => Reverb::configured(),
                'host' => $reverb['host'],
                'port' => $reverb['port'],
                'tls' => $reverb['tls'],
            ],
        ]);
    }

    private static function cacheKey(?string $edition = null): string
    {
        return self::CONTENT_CACHE_KEY.'-'.($edition ?? config('sahra.edition'));
    }

    public static function forgetContent(): void
    {
        Cache::forget(self::CONTENT_CACHE_KEY);
        Cache::forget(self::cacheKey('private'));
        Cache::forget(self::cacheKey('commercial'));
    }
}
