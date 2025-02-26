<?php

namespace App\Http\Controllers\API;

use App\Exceptions\Game\GameOverException;
use App\Exceptions\Game\InvalidMoveException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Game\ShotRequest;
use App\Models\Game;
use App\Services\GameService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameController extends Controller
{
    private GameService $gameService;

    public function __construct(GameService $gameService)
    {
        $this->gameService = $gameService;
    }

    /**
     * Start a new game
     *
     * @return JsonResponse
     */
    public function startGame(): JsonResponse
    {
        $user = auth()->user();
        $game = $this->gameService->startNewGame($user);

        return response()->json([
            'message' => 'Nueva partida iniciada',
            'game' => [
                'id' => $game->id,
                'start_time' => $game->start_time,
                'status' => $game->status,
            ],
        ]);
    }

    /**
     * Get current game state
     *
     * @param Game $game
     * @return JsonResponse
     */
    public function getGameState(Game $game): JsonResponse
    {
        // Verificar que el juego pertenece al usuario autenticado
        if ($game->user_id !== auth()->id()) {
            return response()->json([
                'message' => 'No tienes permiso para acceder a esta partida',
            ], 403);
        }

        // Determinar si mostrar la posición de los barcos (solo si el juego ha terminado)
        $showShips = $game->status === 'completed';

        return response()->json([
            'game' => [
                'id' => $game->id,
                'start_time' => $game->start_time,
                'end_time' => $game->end_time,
                'status' => $game->status,
                'total_shots' => $game->total_shots,
                'hits' => $game->hits,
                'misses' => $game->misses,
                'score' => $game->score,
            ],
            'board' => $this->gameService->getGameBoardState($game, $showShips),
        ]);
    }

    /**
     * Make a shot
     *
     * @param ShotRequest $request
     * @param Game $game
     * @return JsonResponse
     */
    public function makeShot(ShotRequest $request, Game $game): JsonResponse
    {
        // Verificar que el juego pertenece al usuario autenticado
        if ($game->user_id !== auth()->id()) {
            return response()->json([
                'message' => 'No tienes permiso para acceder a esta partida',
            ], 403);
        }

        try {
            $result = $this->gameService->makeShot(
                $game, 
                $request->position_x, 
                $request->position_y
            );

            $response = [
                'hit' => $result['hit'],
                'position' => [
                    'x' => $result['shot']->position_x,
                    'y' => $result['shot']->position_y,
                ],
                'game_state' => [
                    'status' => $game->status,
                    'total_shots' => $game->total_shots,
                    'hits' => $game->hits,
                    'misses' => $game->misses,
                ],
            ];

            // Añadir información de barco hundido si es el caso
            if ($result['sunk']) {
                $response['sunk_ship'] = [
                    'type' => $result['ship_type'],
                ];
            }

            // Si el juego ha terminado, añadir información final
            if ($result['game_over']) {
                $response['game_over'] = true;
                $response['score'] = $game->score;
                $response['end_time'] = $game->end_time;
                $response['board'] = $this->gameService->getGameBoardState($game, true);
            }

            return response()->json($response);
        } catch (InvalidMoveException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 400);
        } catch (GameOverException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'game_over' => true,
                'score' => $game->score,
            ], 400);
        }
    }

    /**
     * Get list of user's active and completed games
     *
     * @return JsonResponse
     */
    public function listGames(): JsonResponse
    {
        $user = auth()->user();
        
        $activeGames = $user->games()
            ->where('status', 'in_progress')
            ->orderBy('start_time', 'desc')
            ->get();
            
        $completedGames = $user->games()
            ->where('status', 'completed')
            ->orderBy('end_time', 'desc')
            ->get();

        return response()->json([
            'active_games' => $activeGames,
            'completed_games' => $completedGames,
        ]);
    }
}