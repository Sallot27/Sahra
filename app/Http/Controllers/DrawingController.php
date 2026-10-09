<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DrawingController extends Controller
{
    private const MAX_STROKES = 400;

    private const MAX_POINTS = 12000;

    /** A phone uploads its drawing; the big screen then fetches it by id. */
    public function store(Request $request, string $code): JsonResponse
    {
        $room = Room::where('code', strtoupper($code))->firstOrFail();
        $strokes = $this->clean($request->input('strokes'));

        if ($strokes === []) {
            return response()->json(['message' => 'empty_drawing'], 422);
        }

        $drawing = Drawing::create([
            'room_code' => $room->code,
            'strokes' => json_encode($strokes, JSON_THROW_ON_ERROR),
        ]);

        return response()->json(['id' => $drawing->id], 201);
    }

    public function show(string $id): JsonResponse
    {
        $drawing = Drawing::findOrFail($id);

        return response()->json(['strokes' => json_decode($drawing->strokes, true)]);
    }

    /**
     * Strokes are [{c: 0|1|2, w: 1|2, p: [x, y, x, y, ...]}] with coordinates 0..1000.
     * Anything else is dropped, and the total size is capped.
     */
    private function clean(mixed $input): array
    {
        if (! is_array($input)) {
            return [];
        }

        $out = [];
        $points = 0;

        foreach (array_slice($input, 0, self::MAX_STROKES) as $stroke) {
            if (! is_array($stroke) || ! isset($stroke['p']) || ! is_array($stroke['p'])) {
                continue;
            }

            $p = array_map(
                fn ($v) => max(0, min(1000, (int) $v)),
                array_slice(array_values($stroke['p']), 0, 2000),
            );
            if (count($p) % 2 === 1) {
                array_pop($p);
            }
            if (count($p) < 2) {
                continue;
            }

            $points += count($p);
            if ($points > self::MAX_POINTS) {
                break;
            }

            $out[] = [
                'c' => in_array($stroke['c'] ?? 0, [0, 1, 2], true) ? $stroke['c'] : 0,
                'w' => ($stroke['w'] ?? 1) === 2 ? 2 : 1,
                'p' => $p,
            ];
        }

        return $out;
    }
}
