<?php

namespace App\Constants;

class GameStatus
{
    public const IN_PROGRESS = 'in_progress';
    public const COMPLETED = 'completed';

    public static function getAll(): array
    {
        return [
            self::IN_PROGRESS,
            self::COMPLETED,
        ];
    }
}