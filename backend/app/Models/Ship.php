<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ship extends Model
{
    use HasFactory;

    protected $fillable = [
        'game_id',
        'type',
        'position_x',
        'position_y',
        'orientation',
        'size',
        'hits',
        'sunk',
    ];

    protected $casts = [
        'position_x' => 'integer',
        'position_y' => 'integer',
        'size' => 'integer',
        'hits' => 'integer',
        'sunk' => 'boolean',
    ];

    public function game()
    {
        return $this->belongsTo(Game::class);
    }
}