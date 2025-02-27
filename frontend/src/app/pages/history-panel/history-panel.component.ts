// src/app/pages/history-panel/history-panel.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { StatisticsChartComponent } from '../../shared/statistics-chart/statistics-chart.component';
import { GameService } from '../../services/game.service';
import { StatisticsService } from '../../services/statistics.service';
import { Game, GameStats } from '../../models/game';

@Component({
  selector: 'app-history-panel',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    StatisticsChartComponent,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    DatePipe,
  ],
  templateUrl: './history-panel.component.html',
  styleUrls: ['./history-panel.component.css'],
})
export class HistoryPanelComponent implements OnInit {
  games: Game[] = [];
  filteredGames: Game[] = [];
  displayedGames: Game[] = [];
  gameStats: GameStats | null = null;

  // Table configuration
  displayedColumns: string[] = [
    'date',
    'status',
    'shots',
    'hits',
    'accuracy',
    'time',
    'score',
  ];
  pageSize = 5;
  pageSizeOptions = [5, 10, 25];
  pageIndex = 0;
  totalGames = 0;

  loading = true;

  constructor(
    private gameService: GameService,
    private statisticsService: StatisticsService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadGameHistory();
    this.loadStatistics();
  }

  loadGameHistory(): void {
    this.loading = true;

    this.gameService.getUserGames().subscribe({
      next: (response) => {
        console.log('Game history response:', response);
        // Combinamos juegos activos y completados
        const activeGames = response.active_games || [];
        const completedGames = response.completed_games || [];
        this.games = [...activeGames, ...completedGames];

        if (this.games.length === 0) {
          console.log('No games found');
        } else {
          console.log(`Found ${this.games.length} games`);
        }

        this.applySort({ active: 'date', direction: 'desc' });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading game history:', error);
        this.loading = false;
        this.snackBar.open('Error cargando el historial de juegos', 'Cerrar', {
          duration: 5000,
        });
      },
    });
  }

  loadStatistics(): void {
    this.statisticsService.getUserStatistics().subscribe({
      next: (stats) => {
        console.log('Statistics loaded:', stats);
        this.gameStats = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.snackBar.open('Error cargando estadísticas', 'Cerrar', {
          duration: 5000,
        });
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updateDisplayedGames();
  }

  onSortChange(sort: Sort): void {
    this.applySort(sort);
  }

  private applySort(sort: Sort): void {
    this.filteredGames = [...this.games];

    if (!sort.active || sort.direction === '') {
      this.updateDisplayedGames();
      return;
    }

    this.filteredGames = this.filteredGames.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'date':
          return this.compare(
            new Date(a.start_time).getTime(),
            new Date(b.start_time).getTime(),
            isAsc
          );
        case 'status':
          return this.compare(a.status, b.status, isAsc);
        case 'shots':
          return this.compare(a.total_shots || 0, b.total_shots || 0, isAsc);
        case 'hits':
          return this.compare(a.hits || 0, b.hits || 0, isAsc);
        case 'accuracy':
          const accuracyA =
            a.total_shots > 0 ? ((a.hits || 0) / a.total_shots) * 100 : 0;
          const accuracyB =
            b.total_shots > 0 ? ((b.hits || 0) / b.total_shots) * 100 : 0;
          return this.compare(accuracyA, accuracyB, isAsc);
        case 'time':
          const timeA = this.calculateGameTime(a);
          const timeB = this.calculateGameTime(b);
          return this.compare(timeA, timeB, isAsc);
        case 'score':
          return this.compare(a.score || 0, b.score || 0, isAsc);
        default:
          return 0;
      }
    });

    this.updateDisplayedGames();
  }

  private updateDisplayedGames(): void {
    const startIndex = this.pageIndex * this.pageSize;
    this.totalGames = this.filteredGames.length;
    this.displayedGames = this.filteredGames.slice(
      startIndex,
      startIndex + this.pageSize
    );
    console.log('Displayed games updated:', this.displayedGames);
  }

  private compare(a: any, b: any, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  private calculateGameTime(game: Game): number {
    if (game.status !== 'completed' || !game.end_time) {
      return 0;
    }

    return this.statisticsService.calculateGameDuration(
      game.start_time,
      game.end_time
    );
  }

  formatAccuracy(hits: number = 0, totalShots: number = 0): string {
    return totalShots > 0 ? `${Math.round((hits / totalShots) * 100)}%` : '0%';
  }

  formatGameTime(game: Game): string {
    if (game.status !== 'completed' || !game.end_time) {
      return 'En progreso';
    }

    const durationInSeconds = this.calculateGameTime(game);
    return this.statisticsService.formatTime(durationInSeconds);
  }

  formatStatus(status: string): string {
    return status === 'completed' ? 'Completado' : 'En progreso';
  }
}
