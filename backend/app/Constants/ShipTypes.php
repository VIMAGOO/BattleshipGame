<?php

namespace App\Constants;

class ShipTypes
{
    public const DESTROYER = 'destroyer';
    public const SUBMARINE = 'submarine';
    public const CRUISER = 'cruiser';
    public const BATTLESHIP = 'battleship';
    public const CARRIER = 'carrier';

    public static function getSize(string $type): int
    {
        return match ($type) {
            self::DESTROYER => 2,
            self::SUBMARINE => 3,
            self::CRUISER => 3,
            self::BATTLESHIP => 4,
            self::CARRIER => 5,
            default => 0,
        };
    }

    public static function getAll(): array
    {
        return [
            self::DESTROYER,
            self::SUBMARINE,
            self::CRUISER,
            self::BATTLESHIP,
            self::CARRIER,
        ];
    }

    public static function getAllWithSizes(): array
    {
        return [
            self::DESTROYER => 2,
            self::SUBMARINE => 3,
            self::CRUISER => 3,
            self::BATTLESHIP => 4,
            self::CARRIER => 5,
        ];
    }
}