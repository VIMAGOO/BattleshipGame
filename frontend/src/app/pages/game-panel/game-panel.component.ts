// src/app/pages/game-panel/game-panel.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { GameBoardComponent } from '../../shared/game-board/game-board.component';
import { GameService } from '../../services/game.service';
import { Game, CellState, ShotRequest, ShotResponse } from '../../models/game';

@Component({
  selector: 'app-game-panel',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    GameBoardComponent,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './game-panel.component.html',
  styleUrls: ['./game-panel.component.css'],
})
export class GamePanelComponent implements OnInit, OnDestroy {
  currentGame: Game | null = null;
  gameBoard: CellState[][] = [];

  isLoading = true;
  isGameOver = false;
  isFiringShot = false;
  isViewMode = false; // Nuevo: modo visualización para partidas completadas

  gameStats = {
    shots: 0,
    hits: 0,
    misses: 0,
    accuracy: 0,
    score: 0, // Añadido: para mostrar puntuación final
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private gameService: GameService,
    private snackBar: MatSnackBar,
    private router: Router // Añadido: para navegación al historial
  ) { }

  ngOnInit(): void {
    this.loadCurrentGame();
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadCurrentGame(): void {
    this.isLoading = true;

    // Primero verificar si estamos en modo visualización
    const viewModeSubscription = this.gameService.checkForViewMode().subscribe(viewGame => {
      if (viewGame) {
        // Si es una partida en modo visualización
        this.currentGame = viewGame;
        if (viewGame.board) {
          this.gameBoard = viewGame.board;
        }
        this.isViewMode = true;
        this.isGameOver = true; // En modo visualización, siempre tratamos como si el juego hubiera terminado
        this.updateGameStats();
        this.isLoading = false;
        console.log('Visualizando partida completada:', this.currentGame);
      } else {
        // Obtener partida actual (nueva o retomada)
        const gameSubscription = this.gameService.getCurrentGame().subscribe({
          next: (game) => {
            console.log('Game loaded:', game);
            this.currentGame = game;

            // Initialize game board from response or create empty board
            if (game.board) {
              this.gameBoard = game.board;
            } else {
              this.gameBoard = this.gameService.initializeEmptyBoard();
            }

            this.updateGameStats();
            this.isLoading = false;
            this.isGameOver = game.status === 'completed';
          },
          error: (error) => {
            console.error('Error loading game:', error);
            this.isLoading = false;
            this.snackBar.open(
              'Error cargando la partida. Intenta iniciar una nueva.',
              'Cerrar',
              { duration: 5000 }
            );
          }
        });
        this.subscriptions.push(gameSubscription);
      }
    });

    this.subscriptions.push(viewModeSubscription);
  }

  // Método para iniciar una nueva partida
  startNewGame(): void {
    this.isLoading = true;

    const subscription = this.gameService.startNewGame().subscribe({
      next: (response: any) => {
        console.log('New game response:', response);

        // Extraer información del juego de la respuesta
        if (response && response.game && response.game.id) {
          this.currentGame = {
            id: response.game.id,
            user_id: 0,
            start_time: response.game.start_time,
            status: response.game.status,
            total_shots: 0,
            hits: 0,
            misses: 0,
            score: 0,
          };

          this.gameBoard = this.gameService.initializeEmptyBoard();
          this.updateGameStats();
          this.isLoading = false;
          this.isGameOver = false;
          this.isViewMode = false; // Asegurarnos de que no estamos en modo visualización
        } else {
          console.error('Invalid game response format:', response);
          this.snackBar.open(
            'Error al iniciar nueva partida: formato inválido',
            'Cerrar',
            { duration: 5000 }
          );
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error starting new game:', error);
        this.isLoading = false;
        this.snackBar.open('Error al iniciar nueva partida', 'Cerrar', {
          duration: 5000,
        });
      },
    });

    this.subscriptions.push(subscription);
  }

  // Método para manejar clicks en celdas
  handleCellClick(shotRequest: ShotRequest): void {
    // No disparar si:
    // - Estamos en modo visualización
    // - No hay partida activa
    // - La partida ha terminado
    // - Ya se está realizando un disparo
    if (this.isViewMode || !this.currentGame || !this.currentGame.id || this.isGameOver || this.isFiringShot) {
      return;
    }

    console.log(
      'Firing shot at game ID:',
      this.currentGame.id,
      'Position:',
      shotRequest
    );
    this.isFiringShot = true;

    const subscription = this.gameService.fireShot(this.currentGame.id, shotRequest).subscribe({
      next: (response: ShotResponse) => {
        console.log('Shot response:', response); // Añadir para depurar

        // Update board with shot result
        if (response.board) {
          this.gameBoard = response.board;
        } else {
          this.gameBoard = this.gameService.updateBoardWithShot(
            this.gameBoard,
            shotRequest,
            response.hit
          );
        }

        // Update game status
        if (this.currentGame) {
          this.currentGame.total_shots =
            (this.currentGame.total_shots || 0) + 1;
          if (response.hit) {
            this.currentGame.hits = (this.currentGame.hits || 0) + 1;
          } else {
            this.currentGame.misses = (this.currentGame.misses || 0) + 1;
          }
        }

        this.updateGameStats();

        // Check if game is over
        if (response.game_over) {
          this.isGameOver = true;
          this.currentGame!.status = 'completed';
          this.currentGame!.score = response.score || 0;
          this.gameStats.score = response.score || 0;
          this.snackBar.open(
            '¡Felicidades! Has hundido todos los barcos',
            'Cerrar',
            { duration: 5000 }
          );
        } else if (response.sunk) {
          // Show message for sunk ship
          const shipType = response.ship_type || '';
          console.log('Barco hundido:', shipType); // Añadir para depurar
          this.snackBar.open(
            `¡Has hundido un ${this.getShipName(shipType)}!`,
            'Cerrar',
            { duration: 3000 }
          );
        } else if (response.hit) {
          // Nueva notificación cuando das a un barco pero no lo hundes
          this.snackBar.open(
            '¡Has dado a un barco!',
            'Cerrar',
            { duration: 2000 }
          );
        } else {
          // Nueva notificación para disparos fallidos
          this.snackBar.open(
            'Agua...',
            'Cerrar',
            { duration: 1500 }
          );
        }

        this.isFiringShot = false;
      },
      error: (error) => {
        console.error('Error firing shot:', error);
        this.isFiringShot = false;
        this.snackBar.open('Error al realizar el disparo', 'Cerrar', {
          duration: 3000,
        });
      },
    });

    this.subscriptions.push(subscription);
  }

  // Método para ir al historial
  goToHistory(): void {
    this.router.navigate(['/history']);
  }

  private updateGameStats(): void {
    if (!this.currentGame) return;

    this.gameStats = {
      shots: this.currentGame.total_shots || 0,
      hits: this.currentGame.hits || 0,
      misses: this.currentGame.misses || 0,
      accuracy:
        this.currentGame.total_shots > 0
          ? Math.round(
            (this.currentGame.hits / this.currentGame.total_shots) * 100
          )
          : 0,
      score: this.currentGame.score || 0,
    };
  }

  private getShipName(shipType: string | undefined): string {
    if (!shipType) return 'barco';

    const shipNames: { [key: string]: string } = {
      destroyer: 'destructor',
      submarine: 'submarino',
      cruiser: 'crucero',
      battleship: 'acorazado',
      carrier: 'portaaviones',
    };

    return shipNames[shipType] || 'barco';
  }
}