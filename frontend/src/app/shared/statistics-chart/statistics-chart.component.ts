// src/app/shared/statistics-chart/statistics-chart.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game, GameStats } from '../../models/game';
import { MatCardModule } from '@angular/material/card';
import { StatisticsService } from '../../services/statistics.service';

@Component({
  selector: 'app-statistics-chart',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './statistics-chart.component.html',
  styleUrls: ['./statistics-chart.component.css'],
})
export class StatisticsChartComponent implements OnChanges {
  @Input() games: Game[] = [];
  @Input() stats: GameStats | null = null;

  // Chart data
  chartData: any = {
    accuracy: 0,
    totalGames: 0,
    totalShots: 0,
    averageShots: 0,
    bestTime: '',
    averageTime: '',
  };

  constructor(private statisticsService: StatisticsService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['games'] && this.games && this.games.length > 0) ||
      (changes['stats'] && this.stats)
    ) {
      this.calculateChartData();
    }
  }

  private calculateChartData(): void {
    // If we have pre-calculated stats, use them
    if (this.stats) {
      this.chartData = {
        accuracy: this.stats.accuracy,
        totalGames: this.stats.total_games,
        totalShots: this.stats.total_shots,
        averageShots: this.stats.total_games
          ? Math.round(this.stats.total_shots / this.stats.total_games)
          : 0,
        bestTime: this.stats.best_time || 'N/A',
        averageTime: this.stats.average_time,
      };
      return;
    }

    // Otherwise calculate from games
    if (!this.games || this.games.length === 0) {
      return;
    }

    const totalGames = this.games.length;
    const totalShots = this.games.reduce(
      (sum, game) => sum + game.total_shots,
      0
    );
    const totalHits = this.games.reduce((sum, game) => sum + game.hits, 0);

    // Calculate game durations for completed games
    const completedGames = this.games.filter(
      (game) => game.status === 'completed' && game.end_time
    );
    let totalDuration = 0;
    let bestTime = Number.MAX_VALUE;

    completedGames.forEach((game) => {
      if (game.start_time && game.end_time) {
        const duration = this.statisticsService.calculateGameDuration(
          game.start_time,
          game.end_time
        );
        totalDuration += duration;
        if (duration < bestTime) {
          bestTime = duration;
        }
      }
    });

    this.chartData = {
      accuracy: this.statisticsService.calculateAccuracy(totalHits, totalShots),
      totalGames,
      totalShots,
      averageShots: totalGames ? Math.round(totalShots / totalGames) : 0,
      bestTime:
        completedGames.length > 0
          ? this.statisticsService.formatTime(bestTime)
          : 'N/A',
      averageTime:
        completedGames.length > 0
          ? this.statisticsService.formatTime(
              Math.round(totalDuration / completedGames.length)
            )
          : 'N/A',
    };
  }

  getAccuracyBarWidth(): string {
    return `${this.chartData.accuracy}%`;
  }
}
