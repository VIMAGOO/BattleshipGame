<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\GameController;
use App\Http\Controllers\API\StatisticsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Rutas públicas
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Rutas protegidas
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Game
    Route::post('/games', [GameController::class, 'startGame']);
    Route::get('/games', [GameController::class, 'listGames']);
    Route::get('/games/{game}', [GameController::class, 'getGameState']);
    Route::post('/games/{game}/shots', [GameController::class, 'makeShot']);
    
    // Statistics
    Route::get('/statistics', [StatisticsController::class, 'getUserStatistics']);
    Route::get('/leaderboard', [StatisticsController::class, 'getLeaderboard']);
});