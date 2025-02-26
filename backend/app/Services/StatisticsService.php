<?php

namespace App\Services;

use App\Constants\GameStatus;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StatisticsService
{
    /**
     * Get user's statistics
     *
     * @param User $user
     * @return array
     */
    public function getUserStatistics(User $user): array
    {
        $totalGames = $user->games()->where('status', GameStatus::COMPLETED)->count();
        
        if ($totalGames === 0) {
            return [
                'total_games' => 0,
                'best_score' => 0,
                'average_score' => 0,
                'total_shots' => 0,
                'total_hits' => 0,
                'total_misses' => 0,
                'accuracy' => 0,
                'average_time' => 0,
                'best_time' => 0,
                'games_history' => [],
            ];
        }
        
        $bestGame = $user->games()
            ->where('status', GameStatus::COMPLETED)
            ->orderBy('score', 'desc')
            ->first();
            
        $fastestGame = $user->games()
            ->where('status', GameStatus::COMPLETED)
            ->selectRaw('*, TIMESTAMPDIFF(SECOND, start_time, end_time) as duration')
            ->orderBy('duration', 'asc')
            ->first();
        
        $stats = $user->games()
            ->where('status', GameStatus::COMPLETED)
            ->select(
                DB::raw('SUM(total_shots) as total_shots'),
                DB::raw('SUM(hits) as total_hits'),
                DB::raw('SUM(misses) as total_misses'),
                DB::raw('AVG(score) as average_score'),
                DB::raw('AVG(TIMESTAMPDIFF(SECOND, start_time, end_time)) as average_time_seconds')
            )
            ->first();
            
        $gamesHistory = $user->games()
            ->where('status', GameStatus::COMPLETED)
            ->select(
                'id',
                'start_time',
                'end_time',
                'total_shots',
                'hits',
                'misses',
                'score',
                DB::raw('TIMESTAMPDIFF(SECOND, start_time, end_time) as duration_seconds')
            )
            ->orderBy('start_time', 'desc')
            ->get();
            
        return [
            'total_games' => $totalGames,
            'best_score' => $bestGame->score,
            'average_score' => round($stats->average_score, 2),
            'total_shots' => $stats->total_shots,
            'total_hits' => $stats->total_hits,
            'total_misses' => $stats->total_misses,
            'accuracy' => $stats->total_shots > 0 ? round(($stats->total_hits / $stats->total_shots) * 100, 2) : 0,
            'average_time' => round($stats->average_time_seconds, 2),
            'best_time' => $fastestGame->duration ?? 0,
            'games_history' => $gamesHistory,
        ];
    }
    
    /**
     * Get global leaderboard
     *
     * @param int $limit
     * @return array
     */
    public function getLeaderboard(int $limit = 10): array
    {
        $topScores = DB::table('games')
            ->join('users', 'games.user_id', '=', 'users.id')
            ->where('games.status', GameStatus::COMPLETED)
            ->select(
                'users.username',
                'games.score',
                'games.hits',
                'games.total_shots',
                DB::raw('(games.hits / games.total_shots * 100) as accuracy'),
                DB::raw('TIMESTAMPDIFF(SECOND, games.start_time, games.end_time) as duration_seconds')
            )
            ->orderBy('games.score', 'desc')
            ->limit($limit)
            ->get();
            
        return $topScores->toArray();
    }
}