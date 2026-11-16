<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Support\Profanity;
use App\Support\Reverb;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoomController extends Controller
{
    private const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

    /** The big screen opens a room and gets a secret host token back. */
    public function store(Request $request): JsonResponse
    {
        if (! Reverb::configured()) {
            return response()->json(['message' => 'websockets_not_configured'], 503);
        }

        // Paid copies: only the big screen needs a purchase code, players join free.
        $codes = config('sahra.host_codes');
        if ($codes !== []) {
            $given = strtoupper(trim((string) $request->input('host_code', '')));
            $ok = false;
            foreach ($codes as $code) {
                $ok = hash_equals($code, $given) || $ok;
            }
            if (! $ok) {
                return response()->json(['message' => 'host_code_required'], 403);
            }
        }

        for ($attempt = 0; $attempt < 20; $attempt++) {
            $code = '';
            for ($i = 0; $i < 4; $i++) {
                $code .= self::LETTERS[random_int(0, strlen(self::LETTERS) - 1)];
            }

            $existing = Room::where('code', $code)->first();
            if ($existing && $existing->updated_at->gt(now()->subHours(6))) {
                continue; // code still in use
            }
            $existing?->delete();

            $token = Str::random(40);
            Room::create([
                'code' => $code,
                'host_token_hash' => hash('sha256', $token),
                'last_active_at' => now(),
            ]);

            return response()->json(['code' => $code, 'host_token' => $token], 201);
        }

        return response()->json(['message' => 'no_free_code'], 503);
    }

    /** A phone checks the code before connecting. */
    public function show(string $code): JsonResponse
    {
        $room = Room::where('code', strtoupper($code))->first();

        if (! $room || $room->updated_at->lt(now()->subHours(6))) {
            return response()->json(['message' => 'room_not_found'], 404);
        }

        return response()->json(['code' => $room->code]);
    }

    /** The big screen removes a player; that player cannot join this room again. */
    public function kick(Request $request, string $code): JsonResponse
    {
        $data = $request->validate([
            'host_token' => ['required', 'string', 'max:64'],
            'uid' => ['required', 'string', 'regex:/^[a-z0-9]{6,24}$/'],
        ]);
        $room = Room::where('code', strtoupper($code))->first();

        if (! $room || ! $room->checkHostToken($data['host_token'])) {
            return response()->json(['message' => 'forbidden'], 403);
        }

        $kicked = $room->kicked ?? [];
        if (! in_array($data['uid'], $kicked, true) && count($kicked) < 100) {
            $kicked[] = $data['uid'];
        }
        $room->forceFill(['kicked' => $kicked])->save();

        return response()->json(['ok' => true]);
    }

    /** The big screen keeps its room from expiring during a long evening. */
    public function alive(Request $request, string $code): JsonResponse
    {
        $room = Room::where('code', strtoupper($code))->first();

        if (! $room || ! $room->checkHostToken((string) $request->input('host_token', ''))) {
            return response()->json(['message' => 'forbidden'], 403);
        }

        $room->forceFill(['last_active_at' => now()])->touch();

        return response()->json(['ok' => true]);
    }

    /**
     * Authorizes joining the room's presence channel. Only the holder of the
     * host token may join as the host; everyone else joins as a player.
     */
    public function auth(Request $request): JsonResponse
    {
        $data = $request->validate([
            'socket_id' => ['required', 'string', 'regex:/^\d+\.\d+$/'],
            'channel_name' => ['required', 'string', 'regex:/^presence-room\.[A-Z]{4}$/'],
            'uid' => ['required', 'string', 'regex:/^[a-z0-9]{6,24}$/'],
            'name' => ['nullable', 'string', 'max:14'],
            'host_token' => ['nullable', 'string', 'max:64'],
        ]);

        $code = substr($data['channel_name'], strlen('presence-room.'));
        $room = Room::where('code', $code)->first();

        if (! $room) {
            return response()->json(['message' => 'room_not_found'], 404);
        }

        $isHost = $room->checkHostToken($data['host_token'] ?? null);

        if (! $isHost && $room->isKicked($data['uid'])) {
            return response()->json(['message' => 'kicked'], 403);
        }
        if (! $isHost && Profanity::contains((string) ($data['name'] ?? ''))) {
            return response()->json(['message' => 'bad_name'], 422);
        }
        $room->forceFill(['last_active_at' => now()])->touch();

        $member = [
            'user_id' => ($isHost ? 'h-' : 'p-').$data['uid'],
            'user_info' => [
                'role' => $isHost ? 'host' : 'player',
                'name' => Str::limit(trim((string) ($data['name'] ?? '')), 14, '') ?: 'لاعب',
            ],
        ];

        return response()->json(Reverb::presenceAuth($data['socket_id'], $data['channel_name'], $member));
    }
}
