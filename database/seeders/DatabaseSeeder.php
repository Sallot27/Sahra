<?php

namespace Database\Seeders;

use App\Models\DrawPrompt;
use App\Models\Question;
use App\Models\Word;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Loads the starter content. Safe to run again: existing rows are kept,
     * so edits made in the admin panel are not overwritten.
     */
    public function run(): void
    {
        $data = fn (string $file) => json_decode(
            file_get_contents(database_path("seeders/data/{$file}")), true, flags: JSON_THROW_ON_ERROR
        );

        foreach ($data('questions.json') as $q) {
            Question::firstOrCreate(
                ['text' => $q['text']],
                [
                    'category' => $q['category'],
                    'answer' => $q['answer'],
                    'alternates' => $q['alternates'],
                    'decoys' => $q['decoys'],
                ],
            );
        }

        foreach ($data('draw_prompts.json') as $text) {
            DrawPrompt::firstOrCreate(['text' => $text]);
        }

        foreach ($data('words.json') as $category => $words) {
            foreach ($words as $word) {
                Word::firstOrCreate(['category' => $category, 'word' => $word]);
            }
        }
    }
}
