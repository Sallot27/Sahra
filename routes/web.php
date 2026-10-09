<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\GameController;
use Illuminate\Support\Facades\Route;

// The game: the same page is the big screen and the phone controller.
Route::get('/', [GameController::class, 'index'])->name('game');

// Content panel at /admin (enabled when ADMIN_PASSWORD is set).
Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/login', [AdminController::class, 'login'])->name('login');
    Route::post('/login', [AdminController::class, 'authenticate'])->name('authenticate');

    Route::middleware('admin')->group(function () {
        Route::post('/logout', [AdminController::class, 'logout'])->name('logout');
        Route::redirect('/', '/admin/questions');

        Route::get('/questions', [AdminController::class, 'questions'])->name('questions');
        Route::get('/questions/new', [AdminController::class, 'editQuestion'])->name('questions.new');
        Route::post('/questions', [AdminController::class, 'saveQuestion'])->name('questions.store');
        Route::get('/questions/{question}', [AdminController::class, 'editQuestion'])->name('questions.edit');
        Route::put('/questions/{question}', [AdminController::class, 'saveQuestion'])->name('questions.update');

        Route::get('/prompts', [AdminController::class, 'prompts'])->name('prompts');
        Route::post('/prompts', [AdminController::class, 'addPrompts'])->name('prompts.store');

        Route::get('/words', [AdminController::class, 'words'])->name('words');
        Route::post('/words', [AdminController::class, 'addWords'])->name('words.store');

        Route::patch('/{type}/{id}/toggle', [AdminController::class, 'toggle'])
            ->whereIn('type', ['questions', 'prompts', 'words'])->whereNumber('id')->name('toggle');
        Route::delete('/{type}/{id}', [AdminController::class, 'destroy'])
            ->whereIn('type', ['questions', 'prompts', 'words'])->whereNumber('id')->name('destroy');
    });
});
