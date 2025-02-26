<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Game extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'start_time',
        'end_time',
        'status',
        'total_shots',
        'hits',
        'misses',
        'score',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'total_shots' => 'integer',
        'hits' => 'integer',
        'misses' => 'integer',
        'score' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function ships()
    {
        return $this->hasMany(Ship::class);
    }

    public function shots()
    {
        return $this->hasMany(Shot::class);
    }
}