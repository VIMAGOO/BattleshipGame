// src/app/shared/statistics-chart/statistics-chart.component.ts
import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game, GameStats } from '../../models/game';
import { MatCardModule } from '@angular/material/card';
import { StatisticsService } from '../../services/statistics.service';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

// Registrar los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-statistics-chart',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './statistics-chart.component.html',
  styleUrls: ['./statistics-chart.component.css'],
})
export class StatisticsChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() games: Game[] = [];
  @Input() stats: GameStats | null = null;

  // Referencias a los elementos del DOM para los gráficos
  @ViewChild('accuracyChart') accuracyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('shotDistributionChart') shotDistributionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('gameTimeChart') gameTimeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('scoreComparisonChart') scoreComparisonChartRef!: ElementRef<HTMLCanvasElement>;

  // Instancias de los gráficos
  private accuracyChart: Chart | null = null;
  private shotDistributionChart: Chart | null = null;
  private gameTimeChart: Chart | null = null;
  private scoreComparisonChart: Chart | null = null;

  // Control de inicialización
  private chartsInitialized = false;
  private viewInitialized = false;
  private dataReady = false;

  // Datos del leaderboard para comparativa
  leaderboardData: any[] = [];
  private leaderboardSubscription: Subscription | null = null;

  // Chart data
  chartData: any = {
    accuracy: 0,
    totalGames: 0,
    totalShots: 0,
    averageShots: 0,
    bestTime: '',
    averageTime: '',
  };

  constructor(private statisticsService: StatisticsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['games'] && this.games && this.games.length > 0) ||
      (changes['stats'] && this.stats)
    ) {
      console.log('Statistics data changed:', this.stats);
      this.calculateChartData();
      this.dataReady = true;
      this.checkAndInitializeCharts();
    }
  }

  ngAfterViewInit(): void {
    console.log('View initialized, checking chart refs');
    this.viewInitialized = true;

    // Cargar datos del leaderboard para la comparativa
    this.leaderboardSubscription = this.statisticsService.getLeaderboard().subscribe(data => {
      console.log('Leaderboard data loaded:', data);
      this.leaderboardData = data;

      // Intentar inicializar los gráficos después de un pequeño retraso
      // para asegurar que el DOM ha terminado de renderizarse
      setTimeout(() => {
        this.checkAndInitializeCharts();
      }, 100);
    });
  }

  ngOnDestroy(): void {
    // Limpiar las suscripciones
    if (this.leaderboardSubscription) {
      this.leaderboardSubscription.unsubscribe();
    }

    // Destruir los gráficos para evitar memory leaks
    this.destroyCharts();
  }

  private checkAndInitializeCharts(): void {
    console.log('Checking chart initialization conditions:');
    console.log('View initialized:', this.viewInitialized);
    console.log('Data ready:', this.dataReady);
    console.log('Charts initialized:', this.chartsInitialized);
    console.log('Chart elements exist:', this.chartElementsExist());

    // Solo inicializar si tenemos los elementos del DOM, los datos, y no han sido inicializados aún
    if (this.viewInitialized && this.dataReady && !this.chartsInitialized && this.chartElementsExist()) {
      console.log('All conditions met, initializing charts');
      this.initializeCharts();
    } else if (this.viewInitialized && this.dataReady && !this.chartElementsExist()) {
      console.log('DOM elements not ready yet, retrying in 200ms');
      // Si los elementos no están listos, intentar de nuevo después de un corto tiempo
      setTimeout(() => {
        this.checkAndInitializeCharts();
      }, 200);
    }
  }

  private chartElementsExist(): boolean {
    const accuracyExists = !!this.accuracyChartRef?.nativeElement;
    const shotDistExists = !!this.shotDistributionChartRef?.nativeElement;
    const timeExists = !!this.gameTimeChartRef?.nativeElement;
    const scoreExists = !!this.scoreComparisonChartRef?.nativeElement;

    console.log('Chart elements check:');
    console.log('- Accuracy chart exists:', accuracyExists);
    console.log('- Shot distribution chart exists:', shotDistExists);
    console.log('- Game time chart exists:', timeExists);
    console.log('- Score comparison chart exists:', scoreExists);

    return accuracyExists && shotDistExists && timeExists;
  }

  private calculateChartData(): void {
    // Si tenemos estadísticas precalculadas, usarlas
    if (this.stats) {
      console.log('Using precalculated stats:', this.stats);
      this.chartData = {
        accuracy: this.stats.accuracy || 0,
        totalGames: this.stats.total_games || 0,
        totalShots: this.stats.total_shots || 0,
        averageShots: this.stats.total_games
          ? Math.round(this.stats.total_shots / this.stats.total_games)
          : 0,
        bestTime: this.stats.best_time || 'N/A',
        averageTime: this.stats.average_time || '00:00',
      };
      return;
    }

    // Calcular desde los juegos si no hay estadísticas precalculadas
    if (!this.games || this.games.length === 0) {
      console.log('No games available for chart data calculation');
      return;
    }

    const totalGames = this.games.length;
    const totalShots = this.games.reduce(
      (sum, game) => sum + (game.total_shots || 0),
      0
    );
    const totalHits = this.games.reduce((sum, game) => sum + (game.hits || 0), 0);

    // Calcular duración para juegos completados
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

    console.log('Chart data calculated:', this.chartData);
  }

  getAccuracyBarWidth(): string {
    return `${this.chartData.accuracy}%`;
  }

  private initializeCharts(): void {
    console.log('Initializing charts...');

    try {
      // Verificar si los elementos del DOM están disponibles
      if (!this.chartElementsExist()) {
        console.error('Chart elements not found in DOM, cannot initialize charts');
        return;
      }

      // Destruir los gráficos anteriores para evitar duplicados
      this.destroyCharts();

      // Inicializar cada gráfico
      this.createAccuracyEvolutionChart();
      this.createShotDistributionChart();
      this.createGameTimeChart();

      // Solo crear la comparativa si hay datos de leaderboard
      if (this.leaderboardData && this.leaderboardData.length > 0 && this.scoreComparisonChartRef) {
        this.createScoreComparisonChart();
      }

      // Marcar como inicializados
      this.chartsInitialized = true;
      console.log('Charts initialized successfully');
    } catch (error) {
      console.error('Error initializing charts:', error);
    }
  }

  private destroyCharts(): void {
    if (this.accuracyChart) {
      this.accuracyChart.destroy();
      this.accuracyChart = null;
    }
    if (this.shotDistributionChart) {
      this.shotDistributionChart.destroy();
      this.shotDistributionChart = null;
    }
    if (this.gameTimeChart) {
      this.gameTimeChart.destroy();
      this.gameTimeChart = null;
    }
    if (this.scoreComparisonChart) {
      this.scoreComparisonChart.destroy();
      this.scoreComparisonChart = null;
    }

    this.chartsInitialized = false;
  }

  private createAccuracyEvolutionChart(): void {
    try {
      // Preparar datos para el gráfico de evolución de precisión
      let games = [...this.games].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      // Limitar a los últimos 10 juegos para mejor visualización
      if (games.length > 10) {
        games = games.slice(games.length - 10);
      }

      const labels = games.map((game, index) => `Partida ${index + 1}`);
      const accuracyData = games.map(game =>
        game.total_shots > 0 ? Math.round(((game.hits || 0) / game.total_shots) * 100) : 0
      );

      const ctx = this.accuracyChartRef.nativeElement.getContext('2d');
      if (!ctx) {
        console.error('Could not get 2D context for accuracy chart');
        return;
      }

      this.accuracyChart = new Chart(ctx, {
        type: 'line' as ChartType,
        data: {
          labels: labels,
          datasets: [{
            label: 'Precisión (%)',
            data: accuracyData,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Precisión (%)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Partidas'
              }
            }
          }
        } as ChartConfiguration['options']
      });

      console.log('Accuracy evolution chart created');
    } catch (error) {
      console.error('Error creating accuracy evolution chart:', error);
    }
  }

  private createShotDistributionChart(): void {
    try {
      // Para el gráfico de distribución de disparos (aciertos vs fallos)
      let totalHits = 0;
      let totalMisses = 0;

      if (this.stats) {
        totalHits = this.stats.total_hits || 0;
        totalMisses = this.stats.total_misses || 0;
      } else if (this.games && this.games.length > 0) {
        totalHits = this.games.reduce((sum, game) => sum + (game.hits || 0), 0);
        totalMisses = this.games.reduce((sum, game) => sum + (game.misses || 0), 0);
      }

      const ctx = this.shotDistributionChartRef.nativeElement.getContext('2d');
      if (!ctx) {
        console.error('Could not get 2D context for shot distribution chart');
        return;
      }

      this.shotDistributionChart = new Chart(ctx, {
        type: 'pie' as ChartType,
        data: {
          labels: ['Aciertos', 'Fallos'],
          datasets: [{
            data: [totalHits, totalMisses],
            backgroundColor: [
              'rgba(75, 192, 192, 0.7)',
              'rgba(255, 99, 132, 0.7)'
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: function (context: any) {
                  const value = context.raw;
                  const total = totalHits + totalMisses;
                  const percentage = total > 0 ? Math.round((value as number / total) * 100) : 0;
                  return `${context.label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        } as ChartConfiguration['options']
      });

      console.log('Shot distribution chart created');
    } catch (error) {
      console.error('Error creating shot distribution chart:', error);
    }
  }

  private createGameTimeChart(): void {
    try {
      // Para el gráfico de evolución de tiempo de juego
      const completedGames = [...this.games]
        .filter(game => game.status === 'completed' && game.end_time)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      // Limitar a los últimos 10 juegos completados
      const gamesToShow = completedGames.length > 10 ? completedGames.slice(completedGames.length - 10) : completedGames;

      const labels = gamesToShow.map((game, index) => `Partida ${index + 1}`);
      const timeData = gamesToShow.map(game => {
        if (game.start_time && game.end_time) {
          return this.statisticsService.calculateGameDuration(game.start_time, game.end_time) / 60; // Convertir a minutos
        }
        return 0;
      });

      const ctx = this.gameTimeChartRef.nativeElement.getContext('2d');
      if (!ctx) {
        console.error('Could not get 2D context for game time chart');
        return;
      }

      this.gameTimeChart = new Chart(ctx, {
        type: 'bar' as ChartType,
        data: {
          labels: labels,
          datasets: [{
            label: 'Tiempo (min)',
            data: timeData,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Tiempo (minutos)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Partidas'
              }
            }
          }
        } as ChartConfiguration['options']
      });

      console.log('Game time chart created');
    } catch (error) {
      console.error('Error creating game time chart:', error);
    }
  }

  private createScoreComparisonChart(): void {
    try {
      if (!this.scoreComparisonChartRef?.nativeElement || !this.leaderboardData || this.leaderboardData.length === 0) {
        console.log('Score comparison chart not created: missing element or data');
        return;
      }

      // Preparar datos para la comparativa de puntuaciones
      const topPlayers = [...this.leaderboardData]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // Top 5 jugadores

      const labels = topPlayers.map(player => player.username);
      const scores = topPlayers.map(player => player.score);

      const ctx = this.scoreComparisonChartRef.nativeElement.getContext('2d');
      if (!ctx) {
        console.error('Could not get 2D context for score comparison chart');
        return;
      }

      this.scoreComparisonChart = new Chart(ctx, {
        type: 'bar' as ChartType,
        data: {
          labels: labels,
          datasets: [{
            label: 'Puntuación',
            data: scores,
            backgroundColor: 'rgba(153, 102, 255, 0.7)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y', // Barras horizontales
          scales: {
            x: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Puntuación'
              }
            }
          }
        } as ChartConfiguration['options']
      });

      console.log('Score comparison chart created');
    } catch (error) {
      console.error('Error creating score comparison chart:', error);
    }
  }
}