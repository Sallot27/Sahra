<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Players' selfies: small images kept only for a few hours.
        Schema::create('avatars', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('room_code', 8)->index();
            $table->string('mime', 20);
            $table->longText('data'); // base64
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('avatars');
    }
};
