<?php

namespace App\Services;

use App\Constants\GameStatus;
use App\Models\Game;
use App\Models\Ship;
use App\Models\Shot;
use App\Models\User;
use App\Exceptions\Game\InvalidMoveException;
use App\Exceptions\Game\GameOverException;
use Carbon\Carbon;

class GameService
{
    private ShipPlacementService $shipPlacementService;
    private StatisticsService $statisticsService;

    public function __construct(
        ShipPlacementService $shipPlacementService,
        StatisticsService $statisticsService
    ) {
        $this->shipPlacementService = $shipPlacementService;
        $this->statisticsService = $statisticsService;
    }

    /**
     * Start a new game for a user
     *
     * @param User $user
     * @return Game
     */
    public function startNewGame(User $user): Game
    {
        // Mark user as having played
        if (!$user->has_played) {
            $user->has_played = true;
            $user->save();
        }

        // Create new game
        $game = Game::create([
            'user_id' => $user->id,
            'start_time' => Carbon::now(),
            'status' => GameStatus::IN_PROGRESS,
        ]);

        // Place ships randomly
        $this->shipPlacementService->placeShipsRandomly($game);

        return $game;
    }

    /**
     * Make a shot in the game
     *
     * @param Game $game
     * @param int $x
     * @param int $y
     * @return array
     * @throws InvalidMoveException
     * @throws GameOverException
     */
    public function makeShot(Game $game, int $x, int $y): array
    {
        // Check if game is already completed
        if ($game->status === GameStatus::COMPLETED) {
            throw new GameOverException('Game is already completed.');
        }

        // Check if shot is within board boundaries (0-9)
        if ($x < 0 || $x > 9 || $y < 0 || $y > 9) {
            throw new InvalidMoveException('Shot is outside the board boundaries.');
        }

        // Check if position was already shot
        $existingShot = $game->shots()->where('position_x', $x)->where('position_y', $y)->first();
        if ($existingShot) {
            throw new InvalidMoveException('You have already fired at this position.');
        }

        // Check if shot hits any ship
        $hit = false;
        $sunkShip = null;

        foreach ($game->ships as $ship) {
            if ($this->shipIsHit($ship, $x, $y)) {
                $hit = true;
                
                // Increment ship hits
                $ship->hits++;
                
                // Check if ship is sunk
                if ($ship->hits >= $ship->size) {
                    $ship->sunk = true;
                    $sunkShip = $ship;
                }
                
                $ship->save();
                break;
            }
        }

        // Record the shot
        $shot = Shot::create([
            'game_id' => $game->id,
            'position_x' => $x,
            'position_y' => $y,
            'hit' => $hit,
        ]);

        // Update game statistics
        $game->total_shots++;
        if ($hit) {
            $game->hits++;
        } else {
            $game->misses++;
        }

        // Check if all ships are sunk (game over)
        $allShipsSunk = $game->ships()->where('sunk', false)->count() === 0;
        
        if ($allShipsSunk) {
            $game->status = GameStatus::COMPLETED;
            $game->end_time = Carbon::now();
            
            // Calculate score
            $game->score = $this->calculateScore($game);
        }
        
        $game->save();

        return [
            'hit' => $hit,
            'sunk' => $sunkShip ? true : false,
            'ship_type' => $sunkShip ? $sunkShip->type : null,
            'game_over' => $allShipsSunk,
            'shot' => $shot,
        ];
    }

    /**
     * Check if a ship is hit by the shot
     *
     * @param Ship $ship
     * @param int $x
     * @param int $y
     * @return bool
     */
    private function shipIsHit(Ship $ship, int $x, int $y): bool
    {
        if ($ship->orientation === 'horizontal') {
            return $y === $ship->position_y && 
                   $x >= $ship->position_x && 
                   $x < $ship->position_x + $ship->size;
        } else {
            return $x === $ship->position_x && 
                   $y >= $ship->position_y && 
                   $y < $ship->position_y + $ship->size;
        }
    }

    /**
     * Calculate game score based on hits, misses and time
     *
     * @param Game $game
     * @return int
     */
    private function calculateScore(Game $game): int
    {
        // Base score: 1000 points
        $baseScore = 1000;
        
        // Accuracy bonus: up to 500 points
        $accuracy = $game->hits / $game->total_shots;
        $accuracyBonus = (int)($accuracy * 500);
        
        // Time penalty: -10 points per minute
        $minutes = $game->start_time->diffInMinutes($game->end_time);
        $timePenalty = min(500, $minutes * 10); // Cap at 500 points
        
        return $baseScore + $accuracyBonus - $timePenalty;
    }

    /**
     * Get game board state
     *
     * @param Game $game
     * @param bool $showShips Whether to reveal ship positions (for debugging or game over)
     * @return array
     */
    public function getGameBoardState(Game $game, bool $showShips = false): array
    {
        $board = [];
        
        // Initialize empty board
        for ($y = 0; $y < 10; $y++) {
            for ($x = 0; $x < 10; $x++) {
                $board[$y][$x] = [
                    'shot' => false,
                    'hit' => false,
                    'ship' => null,
                ];
            }
        }
        
        // Add ships to board if showShips is true
        if ($showShips) {
            foreach ($game->ships as $ship) {
                if ($ship->orientation === 'horizontal') {
                    for ($i = 0; $i < $ship->size; $i++) {
                        $board[$ship->position_y][$ship->position_x + $i]['ship'] = [
                            'type' => $ship->type,
                            'sunk' => $ship->sunk,
                        ];
                    }
                } else {
                    for ($i = 0; $i < $ship->size; $i++) {
                        $board[$ship->position_y + $i][$ship->position_x]['ship'] = [
                            'type' => $ship->type,
                            'sunk' => $ship->sunk,
                        ];
                    }
                }
            }
        }
        
        // Add shots to board
        foreach ($game->shots as $shot) {
            $board[$shot->position_y][$shot->position_x]['shot'] = true;
            $board[$shot->position_y][$shot->position_x]['hit'] = $shot->hit;
        }
        
        return $board;
    }
}