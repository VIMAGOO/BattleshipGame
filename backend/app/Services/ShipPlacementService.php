<?php

namespace App\Services;

use App\Constants\ShipTypes;
use App\Models\Game;
use App\Models\Ship;

class ShipPlacementService
{
    private const BOARD_SIZE = 10;

    /**
     * Place ships randomly on the board for a game
     *
     * @param Game $game
     * @return void
     */
    public function placeShipsRandomly(Game $game): void
    {
        $board = array_fill(0, self::BOARD_SIZE, array_fill(0, self::BOARD_SIZE, false));
        
        foreach (ShipTypes::getAllWithSizes() as $type => $size) {
            $placed = false;
            
            while (!$placed) {
                // Randomly choose orientation
                $orientation = rand(0, 1) === 0 ? 'horizontal' : 'vertical';
                
                // Calculate maximum valid starting position based on orientation and ship size
                $maxX = $orientation === 'horizontal' ? self::BOARD_SIZE - $size : self::BOARD_SIZE - 1;
                $maxY = $orientation === 'vertical' ? self::BOARD_SIZE - $size : self::BOARD_SIZE - 1;
                
                // Generate random starting position
                $x = rand(0, $maxX);
                $y = rand(0, $maxY);
                
                // Check if ship can be placed here without overlapping
                if ($this->canPlaceShip($board, $x, $y, $size, $orientation)) {
                    // Place ship on board
                    if ($orientation === 'horizontal') {
                        for ($i = 0; $i < $size; $i++) {
                            $board[$y][$x + $i] = true;
                        }
                    } else {
                        for ($i = 0; $i < $size; $i++) {
                            $board[$y + $i][$x] = true;
                        }
                    }
                    
                    // Create ship record
                    Ship::create([
                        'game_id' => $game->id,
                        'type' => $type,
                        'position_x' => $x,
                        'position_y' => $y,
                        'orientation' => $orientation,
                        'size' => $size,
                        'hits' => 0,
                        'sunk' => false,
                    ]);
                    
                    $placed = true;
                }
            }
        }
    }
    
    /**
     * Check if a ship can be placed at the specified position
     *
     * @param array $board
     * @param int $x
     * @param int $y
     * @param int $size
     * @param string $orientation
     * @return bool
     */
    private function canPlaceShip(array $board, int $x, int $y, int $size, string $orientation): bool
    {
        if ($orientation === 'horizontal') {
            for ($i = 0; $i < $size; $i++) {
                if (isset($board[$y][$x + $i]) && $board[$y][$x + $i]) {
                    return false;
                }
            }
        } else {
            for ($i = 0; $i < $size; $i++) {
                if (isset($board[$y + $i][$x]) && $board[$y + $i][$x]) {
                    return false;
                }
            }
        }
        
        return true;
    }
}