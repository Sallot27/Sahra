<?php

namespace App\Support;

/**
 * Arabic + English word filter (same rules as filterText in public/js/sahra.js).
 * Text is normalized first so diacritics, tatweel, letter variants, digits used
 * as letters and stretched letters do not slip through.
 */
class Profanity
{
    public static function normalize(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');
        $text = preg_replace('/[\x{064B}-\x{065F}\x{0670}\x{0640}\x{200B}-\x{200F}]/u', '', $text);
        $text = preg_replace('/[أإآٱ]/u', 'ا', $text);
        $text = str_replace(['ة', 'ى', 'ؤ', 'ئ', 'گ', 'ڤ', 'پ', 'چ'], ['ه', 'ي', 'و', 'ي', 'ك', 'ف', 'ب', 'ج'], $text);
        $text = strtr($text, ['0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't', '@' => 'a', '$' => 's', '!' => 'i']);

        return preg_replace('/(.)\1{2,}/u', '$1', $text);
    }

    /** Words of the text, plus letters typed one by one ("f u c k") joined back together. */
    public static function tokens(string $normalized): array
    {
        $out = [];
        $run = '';
        foreach (preg_split('/[^\p{L}]+/u', $normalized, -1, PREG_SPLIT_NO_EMPTY) as $tok) {
            if (mb_strlen($tok) === 1) {
                $run .= $tok;
                continue;
            }
            if (mb_strlen($run) > 1) {
                $out[] = $run;
            }
            $run = '';
            $out[] = $tok;
        }
        if (mb_strlen($run) > 1) {
            $out[] = $run;
        }

        return $out;
    }

    public static function contains(string $text): bool
    {
        $any = array_filter(array_map([self::class, 'normalize'], config('profanity.anywhere', [])));
        $whole = array_map([self::class, 'normalize'], config('profanity.whole', []));

        foreach (self::tokens(self::normalize($text)) as $tok) {
            foreach ($any as $w) {
                if (str_contains($tok, $w)) {
                    return true;
                }
            }
            if (in_array($tok, $whole, true) || in_array(preg_replace('/^(وال|ال|يا|و)/u', '', $tok), $whole, true)) {
                return true;
            }
        }

        return false;
    }
}
