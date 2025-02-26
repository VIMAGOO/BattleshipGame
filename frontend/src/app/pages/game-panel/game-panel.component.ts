// src/app/pages/game-panel/game-panel.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
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
export class GamePanelComponent implements OnInit {
  currentGame: Game | null = null;
  gameBoard: CellState[][] = [];

  isLoading = true;
  isGameOver = false;
  isFiringShot = false;

  gameStats = {
    shots: 0,
    hits: 0,
    misses: 0,
    accuracy: 0,
  };

  constructor(
    private gameService: GameService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCurrentGame();
  }

  loadCurrentGame(): void {
    this.isLoading = true;

    this.gameService.getCurrentGame().subscribe({
      next: (game) => {
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
      },
    });
  }

  // En GamePanelComponent, ajusta el método startNewGame():
  startNewGame(): void {
    this.isLoading = true;

    this.gameService.startNewGame().subscribe({
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
  }

  // Ajusta el método handleCellClick para verificar el ID:
  handleCellClick(shotRequest: ShotRequest): void {
    if (!this.currentGame || !this.currentGame.id) {
      console.error('No valid game available:', this.currentGame);
      this.snackBar.open('Error: No hay partida activa válida', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    if (this.isGameOver || this.isFiringShot) {
      return;
    }

    console.log(
      'Firing shot at game ID:',
      this.currentGame.id,
      'Position:',
      shotRequest
    );
    this.isFiringShot = true;

    this.gameService.fireShot(this.currentGame.id!, shotRequest).subscribe({
      next: (response: ShotResponse) => {
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
          this.snackBar.open(
            '¡Felicidades! Has hundido todos los barcos',
            'Cerrar',
            { duration: 5000 }
          );
        } else if (response.sunk) {
          // Show message for sunk ship
          this.snackBar.open(
            `¡Has hundido un ${this.getShipName(response.ship_type)}!`,
            'Cerrar',
            { duration: 3000 }
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
  }

  private updateGameStats(): void {
    if (!this.currentGame) return;

    this.gameStats = {
      shots: this.currentGame.total_shots,
      hits: this.currentGame.hits,
      misses: this.currentGame.misses,
      accuracy:
        this.currentGame.total_shots > 0
          ? Math.round(
              (this.currentGame.hits / this.currentGame.total_shots) * 100
            )
          : 0,
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
