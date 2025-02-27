// src/app/services/statistics.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import { GameStats } from '../models/game';

@Injectable({
  providedIn: 'root',
})
export class StatisticsService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) { }

  // Get user statistics
  getUserStatistics(): Observable<GameStats> {
    return this.http.get<GameStats>(`${this.apiUrl}/statistics`).pipe(
      catchError(error => {
        console.error('Error fetching statistics:', error);
        // Retornar un objeto de estadísticas vacío en caso de error
        return of({
          total_games: 0,
          total_shots: 0,
          total_hits: 0,
          total_misses: 0,
          accuracy: 0,
          average_time: '00:00'
        });
      })
    );
  }

  // Get leaderboard with processing to ensure numeric values
  getLeaderboard(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/leaderboard`).pipe(
      map(response => {
        // Determinar si la respuesta es un array o un objeto con propiedad leaderboard
        let leaderboardData;
        if (Array.isArray(response)) {
          leaderboardData = response;
        } else if (response && typeof response === 'object' && 'leaderboard' in response) {
          leaderboardData = response.leaderboard;
        } else {
          leaderboardData = [];
        }

        // Asegurarse de que los valores numéricos son realmente números
        return leaderboardData.map((player: any) => ({
          ...player,
          score: Number(player.score),
          accuracy: Number(player.accuracy) || 0,
          hits: Number(player.hits) || 0,
          total_shots: Number(player.total_shots) || 1, // Evitar división por cero
          duration_seconds: Number(player.duration_seconds) || 0
        }));
      }),
      catchError(error => {
        console.error('Error fetching leaderboard:', error);
        return of([]);
      })
    );
  }

  // Get historical game data for charts
  getHistoricalGameData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statistics/history`).pipe(
      catchError(error => {
        console.error('Error fetching historical data:', error);
        return of([]);
      })
    );
  }

  // Calculate accuracy from games
  calculateAccuracy(hits: number, totalShots: number): number {
    if (!totalShots || totalShots === 0) return 0;
    return Math.round((hits / totalShots) * 100);
  }

  // Format time duration (from seconds to mm:ss)
  formatTime(seconds: number): string {
    if (!seconds) return '00:00';

    seconds = Math.round(seconds); // Asegurarse de que es un entero
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  // Calculate game duration in seconds
  calculateGameDuration(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 0;

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (isNaN(start) || isNaN(end)) return 0;

    return Math.floor((end - start) / 1000);
  }

  // Método para obtener estadísticas de juego por período (para gráficos de evolución)
  getStatisticsByPeriod(period: 'daily' | 'weekly' | 'monthly'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statistics/${period}`).pipe(
      catchError(error => {
        console.error(`Error fetching ${period} statistics:`, error);
        return of([]);
      })
    );
  }
}