<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One of the 10 big categories players pick from (حيوانات، تاريخ غريب…).
        // `category` stays as the question's funny little title.
        Schema::table('questions', function (Blueprint $table) {
            $table->string('topic', 40)->nullable()->after('category')->index();
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn('topic');
        });
    }
};
