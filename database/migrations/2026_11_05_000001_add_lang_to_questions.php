<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ar = Arabic question, en = English-only question (wordplay that only works in English).
        Schema::table('questions', function (Blueprint $table) {
            $table->string('lang', 2)->default('ar')->after('topic')->index();
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn('lang');
        });
    }
};
