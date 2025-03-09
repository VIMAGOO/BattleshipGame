// src/app/pages/game-panel/game-panel.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
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
  imgPath: string; // Añadido: ruta de la imagen del barco
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

  // Control de tiempo
  gameTime = 0; // Tiempo en segundos
  timerSubscription?: Subscription;
  isTabActive = true;

  // Clave para almacenar el tiempo en localStorage
  private readonly GAME_TIME_KEY = 'battleship_game_time';

  gameStats = {
    shots: 0,
    hits: 0,
    misses: 0,
    accuracy: 0,
    score: 0, // Añadido: para mostrar puntuación final
  };

  // Nuevo: estado de barcos (ahora con rutas de imágenes)
  shipsStatus: ShipStatus[] = [
    { id: 'carrier', name: 'Portaaviones', sunk: false, type: 'carrier', imgPath: 'assets/images/ships/carrier.png' },
    { id: 'battleship', name: 'Acorazado', sunk: false, type: 'battleship', imgPath: 'assets/images/ships/battleship.png' },
    { id: 'cruiser', name: 'Crucero', sunk: false, type: 'cruiser', imgPath: 'assets/images/ships/cruiser.png' },
    { id: 'submarine', name: 'Submarino', sunk: false, type: 'submarine', imgPath: 'assets/images/ships/submarine.png' },
    { id: 'destroyer', name: 'Destructor', sunk: false, type: 'destroyer', imgPath: 'assets/images/ships/destroyer.png' }
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
    // Iniciar eventos de visibilidad
    this.initVisibilityEvents();
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());

    // Guardar el tiempo actual antes de destruir el componente
    if (this.currentGame && this.currentGame.id && !this.isGameOver && !this.isViewMode) {
      this.saveGameTime();
    }

    // Detener el temporizador cuando se destruye el componente
    this.stopTimer();
  }

  // Escuchar eventos de visibilidad del documento
  private initVisibilityEvents(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  // Gestionar cambios de visibilidad del documento
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.isTabActive = true;
      this.startTimer();
    } else {
      this.isTabActive = false;
      this.stopTimer();
    }
  }

  // Cargar el tiempo guardado para una partida específica
  private loadGameTime(gameId: number): void {
    try {
      const savedTimes = JSON.parse(localStorage.getItem(this.GAME_TIME_KEY) || '{}');
      if (savedTimes[gameId]) {
        this.gameTime = parseInt(savedTimes[gameId], 10);
        console.log(`Tiempo cargado para partida ${gameId}: ${this.gameTime} segundos`);
      } else {
        this.gameTime = 0;
        console.log(`No hay tiempo guardado para partida ${gameId}, iniciando en 0`);
      }
    } catch (error) {
      console.error('Error al cargar tiempo guardado:', error);
      this.gameTime = 0;
    }
  }

  // Guardar el tiempo actual para una partida específica
  private saveGameTime(): void {
    if (!this.currentGame || !this.currentGame.id) return;

    try {
      const gameId = this.currentGame.id;
      const savedTimes = JSON.parse(localStorage.getItem(this.GAME_TIME_KEY) || '{}');
      savedTimes[gameId] = this.gameTime;
      localStorage.setItem(this.GAME_TIME_KEY, JSON.stringify(savedTimes));
      console.log(`Tiempo guardado para partida ${gameId}: ${this.gameTime} segundos`);
    } catch (error) {
      console.error('Error al guardar tiempo:', error);
    }
  }

  // Iniciar el temporizador del juego
  private startTimer(): void {
    // Solo iniciar el temporizador si no es modo visualización y el juego no ha terminado
    if (!this.isViewMode && !this.isGameOver && !this.timerSubscription) {
      this.timerSubscription = interval(1000).subscribe(() => {
        if (this.isTabActive) {
          this.gameTime++;
          // Guardar el tiempo cada segundo
          this.saveGameTime();
        }
      });
    }
  }

  // Detener el temporizador
  private stopTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = undefined;
    }
  }

  // Formatear tiempo para mostrar como MM:SS
  formatTime(): string {
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = this.gameTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
    // Reiniciar el tiempo de juego
    this.gameTime = 0;
    // Detener temporizador existente
    this.stopTimer();

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

            // Cargar tiempo guardado para esta partida o iniciar en 0
            if (game.id) {
              this.loadGameTime(game.id);
            }

            // Iniciar temporizador solo si no es un juego completado
            if (!this.isGameOver) {
              this.startTimer();
            }

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

    // Reiniciar tiempo de juego para la nueva partida
    this.gameTime = 0;
    this.stopTimer();

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

          // Iniciar temporizador para la nueva partida
          this.startTimer();

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

          // Detener temporizador cuando el juego termina
          this.stopTimer();

          // Guardar tiempo final para estadísticas
          if (this.currentGame && this.currentGame.id) {
            this.saveGameTime();
          }

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
  // Método mejorado para updateShipsStatusFromBoard
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
      // Si no tenemos ships explícitamente, vamos a analizar el tablero
      // para identificar los patrones de barcos hundidos

      // Encontrar todos los 'hits' en el tablero
      const hitCells: { x: number, y: number }[] = [];

      for (let y = 0; y < this.gameBoard.length; y++) {
        for (let x = 0; x < this.gameBoard[y].length; x++) {
          if (this.gameBoard[y][x].status === 'hit') {
            hitCells.push({ x, y });
          }
        }
      }

      // No hay hits, no hay barcos hundidos
      if (hitCells.length === 0) return;

      // Encontrar agrupaciones contiguas de hits (que representan barcos hundidos)
      const visitedCells = new Set<string>();
      const shipGroups: { x: number, y: number }[][] = [];

      for (const cell of hitCells) {
        const cellKey = `${cell.x},${cell.y}`;
        if (!visitedCells.has(cellKey)) {
          // Encontramos un nuevo barco, vamos a explorarlo usando BFS
          const shipGroup: { x: number, y: number }[] = [];
          const queue: { x: number, y: number }[] = [cell];

          while (queue.length > 0) {
            const currentCell = queue.shift()!;
            const currentKey = `${currentCell.x},${currentCell.y}`;

            if (visitedCells.has(currentKey)) continue;

            visitedCells.add(currentKey);
            shipGroup.push(currentCell);

            // Comprobamos las 4 direcciones (arriba, abajo, izquierda, derecha)
            const directions = [
              { x: 0, y: -1 }, // arriba
              { x: 0, y: 1 },  // abajo
              { x: -1, y: 0 }, // izquierda
              { x: 1, y: 0 }   // derecha
            ];

            for (const dir of directions) {
              const nextX = currentCell.x + dir.x;
              const nextY = currentCell.y + dir.y;

              // Verificar límites del tablero
              if (nextX >= 0 && nextX < 10 && nextY >= 0 && nextY < 10) {
                const nextKey = `${nextX},${nextY}`;

                // Si es un hit y no lo hemos visitado, añadirlo a la cola
                if (this.gameBoard[nextY][nextX].status === 'hit' && !visitedCells.has(nextKey)) {
                  queue.push({ x: nextX, y: nextY });
                }
              }
            }
          }

          // Añadimos el grupo encontrado a nuestra lista de barcos
          if (shipGroup.length > 0) {
            shipGroups.push(shipGroup);
          }
        }
      }

      // Ahora, determinamos qué tipo de barco es cada grupo según su tamaño
      for (const group of shipGroups) {
        const size = group.length;

        // Mapeamos el tamaño del barco a su tipo
        switch (size) {
          case 2:
            this.updateShipStatus('destroyer', true);
            break;
          case 3:
            // Tenemos dos barcos de tamaño 3, vamos a verificar cuáles ya están hundidos
            if (this.shipsStatus.find(ship => ship.type === 'submarine' && ship.sunk)) {
              this.updateShipStatus('cruiser', true);
            } else {
              this.updateShipStatus('submarine', true);
            }
            break;
          case 4:
            this.updateShipStatus('battleship', true);
            break;
          case 5:
            this.updateShipStatus('carrier', true);
            break;
        }
      }
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