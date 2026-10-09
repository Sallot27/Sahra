<?php

namespace App\Support;

/**
 * Reverb connection settings. On Laravel Cloud these REVERB_* variables are
 * injected automatically when a WebSocket application is attached.
 */
class Reverb
{
    /** Settings that are safe to send to the browser (never the secret). */
    public static function clientConfig(): array
    {
        $scheme = config('reverb.apps.apps.0.options.scheme', env('REVERB_SCHEME', 'https'));
        $port = (int) config('reverb.apps.apps.0.options.port', env('REVERB_PORT', 443));

        return [
            'key' => (string) config('reverb.apps.apps.0.key'),
            'host' => (string) (config('reverb.apps.apps.0.options.host') ?: request()->getHost()),
            'port' => $port,
            'tls' => $scheme === 'https',
        ];
    }

    public static function configured(): bool
    {
        return filled(config('reverb.apps.apps.0.key')) && filled(config('reverb.apps.apps.0.secret'));
    }

    /**
     * Signs a presence-channel subscription the same way Pusher does:
     * auth = key:HMAC_SHA256(secret, "socket_id:channel:channel_data").
     */
    public static function presenceAuth(string $socketId, string $channel, array $member): array
    {
        $key = (string) config('reverb.apps.apps.0.key');
        $secret = (string) config('reverb.apps.apps.0.secret');
        $channelData = json_encode($member, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', "{$socketId}:{$channel}:{$channelData}", $secret);

        return [
            'auth' => "{$key}:{$signature}",
            'channel_data' => $channelData,
        ];
    }
}
