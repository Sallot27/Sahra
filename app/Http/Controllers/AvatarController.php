<?php

namespace App\Http\Controllers;

use App\Models\Avatar;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AvatarController extends Controller
{
    private const MAX_BYTES = 80_000;

    /** A phone uploads a small selfie (already cropped and shrunk on the phone). */
    public function store(Request $request, string $code): JsonResponse
    {
        if (strlen((string) $request->getContent()) > 150_000) {
            return response()->json(['message' => 'image_too_large'], 413);
        }

        $room = Room::where('code', strtoupper($code))->firstOrFail();

        if (! preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$#', (string) $request->input('image'), $m)) {
            return response()->json(['message' => 'bad_image'], 422);
        }

        $bytes = base64_decode($m[2], true);
        $info = $bytes === false ? false : @getimagesizefromstring($bytes);
        if ($bytes === false || strlen($bytes) > self::MAX_BYTES || ! $info || $info[0] > 512 || $info[1] > 512) {
            return response()->json(['message' => 'bad_image'], 422);
        }

        $avatar = Avatar::create([
            'room_code' => $room->code,
            'mime' => 'image/'.$m[1],
            'data' => base64_encode($bytes),
        ]);

        return response()->json(['id' => $avatar->id], 201);
    }

    public function show(string $id): Response
    {
        $avatar = Avatar::findOrFail($id);

        return response(base64_decode($avatar->data), 200, [
            'Content-Type' => $avatar->mime,
            'Cache-Control' => 'public, max-age=43200, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
