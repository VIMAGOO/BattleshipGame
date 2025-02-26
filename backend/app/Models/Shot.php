<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shot extends Model
{
    use HasFactory;

    protected $fillable = [
        'game_id',
        'position_x',
        'position_y',
        'hit',
    ];

    protected $casts = [
        'position_x' => 'integer',
        'position_y' => 'integer',
        'hit' => 'boolean',
    ];

    public function game()
    {
        return $this->belongsTo(Game::class);
    }
}