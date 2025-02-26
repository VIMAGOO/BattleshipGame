<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\StatisticsService;
use Illuminate\Http\JsonResponse;

class StatisticsController extends Controller
{
    private StatisticsService $statisticsService;

    public function __construct(StatisticsService $statisticsService)
    {
        $this->statisticsService = $statisticsService;
    }

    /**
     * Get user statistics
     *
     * @return JsonResponse
     */
    public function getUserStatistics(): JsonResponse
    {
        $user = auth()->user();
        $statistics = $this->statisticsService->getUserStatistics($user);

        return response()->json($statistics);
    }

    /**
     * Get global leaderboard
     *
     * @return JsonResponse
     */
    public function getLeaderboard(): JsonResponse
    {
        $leaderboard = $this->statisticsService->getLeaderboard();

        return response()->json([
            'leaderboard' => $leaderboard
        ]);
    }
}