<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // فبركة: strange true facts with a blank (_____)
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->string('category', 60);
            $table->text('text');
            $table->string('answer', 80);
            $table->json('alternates');
            $table->json('decoys');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // ارسمها: secret drawing prompts
        Schema::create('draw_prompts', function (Blueprint $table) {
            $table->id();
            $table->string('text', 80)->unique();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // برا السالفة: topic words grouped by category
        Schema::create('words', function (Blueprint $table) {
            $table->id();
            $table->string('category', 60);
            $table->string('word', 60);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['category', 'word']);
        });

        // A room is opened by the big screen; players join it by code.
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('code', 4)->unique();
            $table->string('host_token_hash', 64);
            $table->timestamp('last_active_at')->nullable();
            $table->timestamps();
        });

        // Drawings are uploaded over HTTP (they are too big for a WebSocket message).
        Schema::create('drawings', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('room_code', 4)->index();
            $table->longText('strokes');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drawings');
        Schema::dropIfExists('rooms');
        Schema::dropIfExists('words');
        Schema::dropIfExists('draw_prompts');
        Schema::dropIfExists('questions');
    }
};
