// src/app/pages/history-panel/history-panel.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';

import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { StatisticsChartComponent } from '../../shared/statistics-chart/statistics-chart.component';
import { GameService } from '../../services/game.service';
import { StatisticsService } from '../../services/statistics.service';
import { AuthService } from '../../services/auth.service';
import { Game, GameStats } from '../../models/game';

// Interfaz para los datos del leaderboard
interface LeaderboardPlayer {
  username: string;
  score: number;
  accuracy: number;
  total_shots: number;
  hits: number;
  duration_seconds: number;
}

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
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    DatePipe,
  ],
  templateUrl: './history-panel.component.html',
  styleUrls: ['./history-panel.component.css'],
})
export class HistoryPanelComponent implements OnInit, OnDestroy {
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
    'actions', // Nueva columna para acciones
  ];
  pageSize = 5;
  pageSizeOptions = [5, 10, 25];
  pageIndex = 0;
  totalGames = 0;

  loading = true;

  // Propiedades para el leaderboard
  leaderboard: LeaderboardPlayer[] = [];
  leaderboardColumns: string[] = ['position', 'username', 'score', 'accuracy', 'time'];
  loadingLeaderboard = true;
  currentUsername = ''; // Para destacar al usuario actual en el ranking

  // Filtros de período para estadísticas
  selectedPeriod: 'all' | 'monthly' | 'weekly' | 'daily' = 'all';

  // Suscripciones
  private subscriptions: Subscription[] = [];

  constructor(
    private gameService: GameService,
    private statisticsService: StatisticsService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router // Añadido para navegación
  ) {
    // Obtener el nombre de usuario actual si está disponible
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentUsername = currentUser.username;
    }
  }

  ngOnInit(): void {
    // Iniciar carga de datos en secuencia para mejorar rendimiento
    this.loadData();
  }

  ngOnDestroy(): void {
    // Limpiar todas las suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Método para cargar todos los datos en secuencia
  loadData(): void {
    this.loading = true;
    console.log('Iniciando carga de datos');

    // Primero cargamos las estadísticas
    this.loadStatistics(() => {
      // Después cargamos el historial de juegos
      this.loadGameHistory();
      // Y finalmente el leaderboard
      this.loadLeaderboard();
    });
  }

  loadGameHistory(): void {
    console.log('Cargando historial de juegos');

    const subscription = this.gameService.getUserGames().subscribe({
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

    this.subscriptions.push(subscription);
  }

  loadStatistics(callback?: () => void): void {
    console.log('Cargando estadísticas');

    const subscription = this.statisticsService.getUserStatistics().pipe(
      finalize(() => {
        if (callback) callback();
      })
    ).subscribe({
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

    this.subscriptions.push(subscription);
  }

  loadLeaderboard(): void {
    this.loadingLeaderboard = true;
    console.log('Cargando leaderboard');

    const subscription = this.statisticsService.getLeaderboard().subscribe({
      next: (response: any) => {
        console.log('Leaderboard response:', response);
        // Procesamos la respuesta para asegurarnos de tener el formato correcto
        if (Array.isArray(response)) {
          this.leaderboard = response;
        } else if (response && typeof response === 'object' && 'leaderboard' in response) {
          this.leaderboard = response.leaderboard;
        } else {
          this.leaderboard = [];
          console.error('Formato de respuesta de leaderboard inesperado:', response);
        }

        // Aseguramos que los datos numéricos son efectivamente números
        this.leaderboard = this.leaderboard.map(player => ({
          ...player,
          score: Number(player.score),
          accuracy: Number(player.accuracy),
          hits: Number(player.hits),
          total_shots: Number(player.total_shots),
          duration_seconds: Number(player.duration_seconds)
        }));

        this.loadingLeaderboard = false;
      },
      error: (error) => {
        console.error('Error loading leaderboard:', error);
        this.loadingLeaderboard = false;
        this.snackBar.open('Error cargando el ranking', 'Cerrar', {
          duration: 5000,
        });
      }
    });

    this.subscriptions.push(subscription);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updateDisplayedGames();
  }

  onSortChange(sort: Sort): void {
    this.applySort(sort);
  }

  // Método para retomar una partida en progreso
  resumeGame(game: Game): void {
    console.log('Retomando partida:', game.id);
    // Guardar el ID de la partida en localStorage o sessionStorage
    sessionStorage.setItem('current_game_id', game.id?.toString() || '');
    // Navegar a la pantalla de juego
    this.router.navigate(['/game']);
  }

  // Método para ver una partida completada
  viewGame(game: Game): void {
    console.log('Visualizando partida:', game.id);
    // Obtener el estado final del juego
    this.gameService.getGameById(game.id!).subscribe({
      next: (gameDetails) => {
        // Almacenar el juego completo con detalles en sessionStorage
        sessionStorage.setItem('view_game', JSON.stringify(gameDetails));
        sessionStorage.setItem('view_mode', 'true');
        // Navegar a la pantalla de juego
        this.router.navigate(['/game']);
      },
      error: (error) => {
        console.error('Error al cargar los detalles del juego:', error);
        this.snackBar.open('Error al cargar los detalles de la partida', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  // Método para manejar el cambio de período de análisis
  onPeriodChange(): void {
    this.loading = true;
    console.log(`Cambiando período a: ${this.selectedPeriod}`);

    if (this.selectedPeriod === 'all') {
      // Si es "all", recargamos las estadísticas normales
      this.loadStatistics(() => {
        this.loading = false;
      });
    } else {
      // Si es otro período, cargamos las estadísticas específicas del período
      const subscription = this.statisticsService.getStatisticsByPeriod(this.selectedPeriod)
        .pipe(
          finalize(() => {
            this.loading = false;
          })
        )
        .subscribe({
          next: (stats) => {
            console.log(`${this.selectedPeriod} statistics loaded:`, stats);

            if (stats && typeof stats === 'object') {
              // Actualizamos las estadísticas con los datos del período
              this.gameStats = stats;
            } else {
              // Si no hay datos para el período, mostramos un mensaje
              this.snackBar.open(`No hay datos disponibles para el período seleccionado`, 'Cerrar', {
                duration: 3000,
              });
            }
          },
          error: (error) => {
            console.error(`Error loading ${this.selectedPeriod} statistics:`, error);
            this.snackBar.open(`Error cargando estadísticas del período`, 'Cerrar', {
              duration: 5000,
            });
          }
        });

      this.subscriptions.push(subscription);
    }
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

  // Método específico para formatear la precisión del leaderboard
  formatLeaderboardAccuracy(accuracy: number): string {
    return `${accuracy.toFixed(1)}%`;
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

  // Utilizar el método formatTime de statisticsService directamente
  formatTime(seconds: number): string {
    return this.statisticsService.formatTime(seconds);
  }
}