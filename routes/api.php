<?php

use App\Http\Controllers\DrawingController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\RoomController;
use Illuminate\Support\Facades\Route;

Route::get('/status', [GameController::class, 'status'])->middleware('throttle:30,1');
Route::get('/content', [GameController::class, 'content'])->middleware('throttle:60,1');

Route::post('/rooms', [RoomController::class, 'store'])->middleware('throttle:10,1');
Route::get('/rooms/{code}', [RoomController::class, 'show'])->middleware('throttle:60,1');
Route::post('/rooms/auth', [RoomController::class, 'auth'])->middleware('throttle:120,1');

Route::post('/rooms/{code}/drawings', [DrawingController::class, 'store'])->middleware('throttle:30,1');
Route::get('/drawings/{id}', [DrawingController::class, 'show'])->middleware('throttle:240,1');
