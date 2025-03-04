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

// Interfaces para los nuevos componentes
interface ShipStatus {
  id: string;
  name: string;
  sunk: boolean;
  type: string;
}

interface GameMessage {
  text: string;
  type: 'hit' | 'miss' | 'sunk';
  icon: string;
  timestamp: Date;
}

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

  // Nuevo: estado de barcos
  shipsStatus: ShipStatus[] = [
    { id: 'carrier', name: 'Portaaviones', sunk: false, type: 'carrier' },
    { id: 'battleship', name: 'Acorazado', sunk: false, type: 'battleship' },
    { id: 'cruiser', name: 'Crucero', sunk: false, type: 'cruiser' },
    { id: 'submarine', name: 'Submarino', sunk: false, type: 'submarine' },
    { id: 'destroyer', name: 'Destructor', sunk: false, type: 'destroyer' }
  ];

  // Nuevo: mensajes del juego
  gameMessages: GameMessage[] = [];
  maxMessages = 10; // Número máximo de mensajes a mostrar

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

  resetShipsStatus(): void {
    // Restablecer el estado de todos los barcos
    this.shipsStatus.forEach(ship => {
      ship.sunk = false;
    });
  }

  resetGameMessages(): void {
    // Limpiar todos los mensajes
    this.gameMessages = [];
  }

  loadCurrentGame(): void {
    this.isLoading = true;
    this.resetGameMessages();
    this.resetShipsStatus();

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
        this.updateShipsStatusFromBoard(); // Nuevo: actualizar estado de barcos basado en el tablero
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
              this.updateShipsStatusFromBoard(); // Nuevo: actualizar estado de barcos basado en el tablero
            } else {
              this.gameBoard = this.gameService.initializeEmptyBoard();
            }

            this.updateGameStats();
            this.isLoading = false;
            this.isGameOver = game.status === 'completed';

            // Añadir mensaje de bienvenida si es un juego nuevo
            if (game.total_shots === 0) {
              this.addGameMessage('¡Bienvenido! Comienza a disparar', 'miss', 'info');
            }
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
    this.resetShipsStatus();
    this.resetGameMessages();

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

          // Añadir mensaje de bienvenida
          this.addGameMessage('¡Nueva partida! Comienza a disparar', 'miss', 'info');
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

        // Verificar si se hundió un barco y actualizar la lista de barcos
        if (response.sunk && response.ship_type) {
          this.updateShipStatus(response.ship_type, true);

          // Agregar mensaje de barco hundido
          const shipName = this.getShipName(response.ship_type);
          this.addGameMessage(`¡Has hundido un ${shipName}!`, 'sunk', 'dangerous');
        } else if (response.hit) {
          // Agregar mensaje de impacto
          this.addGameMessage('¡Has dado a un barco!', 'hit', 'check_circle');
        } else {
          // Agregar mensaje de agua
          this.addGameMessage('Agua...', 'miss', 'water_drop');
        }

        // Check if game is over
        if (response.game_over) {
          this.isGameOver = true;
          this.currentGame!.status = 'completed';
          this.currentGame!.score = response.score || 0;
          this.gameStats.score = response.score || 0;

          // Agregar mensaje de fin de juego
          this.addGameMessage('¡Felicidades! Has hundido todos los barcos', 'sunk', 'emoji_events');

          this.snackBar.open(
            '¡Felicidades! Has hundido todos los barcos',
            'Cerrar',
            { duration: 5000 }
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

  // Actualizar estado de un barco específico
  updateShipStatus(shipType: string, isSunk: boolean): void {
    const shipIndex = this.shipsStatus.findIndex(ship => ship.type === shipType);
    if (shipIndex !== -1) {
      this.shipsStatus[shipIndex].sunk = isSunk;
    }
  }

  // Añadir mensaje al log de mensajes
  addGameMessage(text: string, type: 'hit' | 'miss' | 'sunk', icon: string): void {
    // Añadir al principio para que los más recientes aparezcan primero
    this.gameMessages.unshift({
      text,
      type,
      icon,
      timestamp: new Date()
    });

    // Limitar el número de mensajes
    if (this.gameMessages.length > this.maxMessages) {
      this.gameMessages = this.gameMessages.slice(0, this.maxMessages);
    }
  }

  // Actualizar estado de barcos basado en el tablero actual
  updateShipsStatusFromBoard(): void {
    // Primero resetear todos los barcos a no hundidos
    this.resetShipsStatus();

    // Verificar si hay información de barcos en el juego actual
    if (this.currentGame && this.currentGame.ships) {
      // Filtrar los barcos hundidos
      const sunkShips = this.currentGame.ships.filter(ship => ship.sunk);
      // Actualizar el estado de los barcos hundidos
      sunkShips.forEach(ship => {
        this.updateShipStatus(ship.type, true);
      });
    } else {
      // Intentar detectar barcos hundidos analizando el tablero
      // Esto es una aproximación simplificada para juegos en progreso o visualizaciones
      // donde no tenemos la lista explícita de barcos hundidos

      // Para cada tipo de barco, verificar si hay suficientes celdas marcadas como hit
      // Esta lógica depende de la estructura de tu modelo de juego
      // y podría necesitar ajustes según la implementación exacta

      // Ejemplo simple: si hay suficientes hits en el tablero para un tipo de barco,
      // consideramos que está hundido (esto es una aproximación)
      const hitCount = this.countHitsOnBoard();

      // Asumiendo un orden de hundimiento típico: destroyer, submarine, cruiser, etc.
      if (hitCount >= 2) this.updateShipStatus('destroyer', true);  // Destructor (2 celdas)
      if (hitCount >= 5) this.updateShipStatus('submarine', true);  // Submarino (3 celdas)
      if (hitCount >= 8) this.updateShipStatus('cruiser', true);    // Crucero (3 celdas)
      if (hitCount >= 12) this.updateShipStatus('battleship', true); // Acorazado (4 celdas)
      if (hitCount >= 17) this.updateShipStatus('carrier', true);    // Portaaviones (5 celdas)
    }
  }

  // Contar hits en el tablero
  countHitsOnBoard(): number {
    let hits = 0;
    for (let row of this.gameBoard) {
      for (let cell of row) {
        if (cell.status === 'hit') {
          hits++;
        }
      }
    }
    return hits;
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