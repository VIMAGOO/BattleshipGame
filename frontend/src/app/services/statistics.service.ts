// src/app/services/statistics.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GameStats } from '../models/game';

@Injectable({
  providedIn: 'root',
})
export class StatisticsService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // Get user statistics - coincide con tu API
  getUserStatistics(): Observable<GameStats> {
    return this.http.get<GameStats>(`${this.apiUrl}/statistics`);
  }

  // Get leaderboard - método nuevo que coincide con tu API
  getLeaderboard(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/leaderboard`);
  }

  // Calculate accuracy from games
  calculateAccuracy(hits: number, totalShots: number): number {
    if (totalShots === 0) return 0;
    return Math.round((hits / totalShots) * 100);
  }

  // Format time duration (from seconds to mm:ss)
  formatTime(seconds: number): string {
    if (!seconds) return '00:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  // Calculate game duration in seconds
  calculateGameDuration(startTime: string, endTime: string): number {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.floor((end - start) / 1000);
  }
}
