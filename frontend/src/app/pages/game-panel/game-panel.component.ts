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
  // Nueva clave para almacenar el estado de la flota en localStorage
  private readonly SHIPS_STATUS_KEY = 'battleship_ships_status';

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
      
      // Guardar el estado actual de la flota
      this.saveShipsStatus();
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
      
      // Al volver a la página, cargar el estado guardado de la flota
      if (this.currentGame && this.currentGame.id) {
        this.loadShipsStatus();
      }
    } else {
      this.isTabActive = false;
      this.stopTimer();
      
      // Al abandonar la página, guardar el estado actual de la flota
      if (this.currentGame && this.currentGame.id) {
        this.saveShipsStatus();
      }
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

  // NUEVO: Guardar el estado de la flota en localStorage
  private saveShipsStatus(): void {
    if (!this.currentGame || !this.currentGame.id) return;

    try {
      const gameId = this.currentGame.id;
      const savedShipsStatus = JSON.parse(localStorage.getItem(this.SHIPS_STATUS_KEY) || '{}');
      savedShipsStatus[gameId] = this.shipsStatus;
      localStorage.setItem(this.SHIPS_STATUS_KEY, JSON.stringify(savedShipsStatus));
      console.log(`Estado de la flota guardado para partida ${gameId}:`, this.shipsStatus);
    } catch (error) {
      console.error('Error al guardar estado de la flota:', error);
    }
  }

  // NUEVO: Cargar el estado de la flota desde localStorage
  private loadShipsStatus(): void {
    if (!this.currentGame || !this.currentGame.id) return;

    try {
      const gameId = this.currentGame.id;
      const savedShipsStatus = JSON.parse(localStorage.getItem(this.SHIPS_STATUS_KEY) || '{}');
      
      if (savedShipsStatus[gameId]) {
        // Reemplazar el estado actual con el guardado
        this.shipsStatus = savedShipsStatus[gameId];
        console.log(`Estado de la flota cargado para partida ${gameId}:`, this.shipsStatus);
      } else {
        // Si no hay estado guardado, actualizar basado en el tablero
        this.updateShipsStatusFromBoard();
        console.log(`No hay estado de flota guardado para partida ${gameId}, generando desde el tablero`);
      }
    } catch (error) {
      console.error('Error al cargar estado de la flota:', error);
      // En caso de error, intentar recalcular basado en el tablero
      this.updateShipsStatusFromBoard();
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
              
              // IMPORTANTE: Primero intentar cargar el estado guardado de la flota
              if (game.id) {
                this.loadShipsStatus();
              } else {
                // Si no hay ID de juego, actualizar desde el tablero
                this.updateShipsStatusFromBoard();
              }
            } else {
              this.gameBoard = this.gameService.initializeEmptyBoard();
              this.resetShipsStatus();
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

          // Limpiar el estado de la flota guardado para la partida anterior
          if (this.currentGame.id) {
            this.clearSavedShipsStatus(this.currentGame.id);
          }

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

  // NUEVO: Método para limpiar el estado guardado de la flota para una partida
  private clearSavedShipsStatus(gameId: number): void {
    try {
      const savedShipsStatus = JSON.parse(localStorage.getItem(this.SHIPS_STATUS_KEY) || '{}');
      if (savedShipsStatus[gameId]) {
        delete savedShipsStatus[gameId];
        localStorage.setItem(this.SHIPS_STATUS_KEY, JSON.stringify(savedShipsStatus));
        console.log(`Estado de flota eliminado para partida ${gameId}`);
      }
    } catch (error) {
      console.error('Error al limpiar estado de flota guardado:', error);
    }
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
          
          // Importante: Guardar el estado de la flota inmediatamente después de hundir un barco
          this.saveShipsStatus();

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
            // Guardar el estado final de la flota
            this.saveShipsStatus();
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
    // Guardar el estado actual antes de navegar
    if (this.currentGame && this.currentGame.id) {
      this.saveShipsStatus();
      this.saveGameTime();
    }
    
    this.router.navigate(['/history']);
  }

  // Actualizar estado de un barco específico
  updateShipStatus(shipType: string, isSunk: boolean): void {
    const shipIndex = this.shipsStatus.findIndex(ship => ship.type === shipType);
    if (shipIndex !== -1) {
      this.shipsStatus[shipIndex].sunk = isSunk;
      console.log(`Actualizado estado del barco ${shipType} a hundido=${isSunk}`);
    } else {
      console.warn(`No se encontró un barco con tipo ${shipType}`);
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

  // MEJORADO: Método para actualizar estado de barcos basado en el tablero actual
  updateShipsStatusFromBoard(): void {
    // Solo proceder si tenemos un tablero válido
    if (!this.gameBoard || this.gameBoard.length === 0) return;

    // Verificar si ya tenemos estado guardado para esta partida
    if (this.currentGame && this.currentGame.id) {
      const savedShipsStatus = this.getSavedShipsStatus(this.currentGame.id);
      if (savedShipsStatus) {
        // Si hay estado guardado, usarlo en lugar de recalcular
        this.shipsStatus = savedShipsStatus;
        console.log('Usando estado de flota guardado:', this.shipsStatus);
        return;
      }
    }
    
    console.log('Recalculando estado de flota desde el tablero...');

    // Si no hay estado guardado o no se pudo cargar, recalcular basado en el tablero
    // Primero resetear todos los barcos a no hundidos
    this.resetShipsStatus();

    // Verificar si hay información de barcos en el juego actual
    if (this.currentGame && this.currentGame.ships) {
      // Filtrar los barcos hundidos desde la información del juego
      const sunkShips = this.currentGame.ships.filter(ship => ship.sunk);
      // Actualizar el estado de los barcos hundidos
      sunkShips.forEach(ship => {
        this.updateShipStatus(ship.type, true);
      });
      console.log('Estado de flota actualizado desde ships del juego:', this.shipsStatus);
    } else {
      // Si no tenemos ships explícitamente, analizamos el tablero
      this.updateShipsStatusByAnalyzingBoard();
    }
  }

  // NUEVO: Obtener el estado guardado de la flota desde localStorage
  private getSavedShipsStatus(gameId: number): ShipStatus[] | null {
    try {
      const savedShipsStatus = JSON.parse(localStorage.getItem(this.SHIPS_STATUS_KEY) || '{}');
      if (savedShipsStatus[gameId]) {
        return savedShipsStatus[gameId];
      }
    } catch (error) {
      console.error('Error al obtener estado de flota guardado:', error);
    }
    return null;
  }

  // MEJORADO: Método para actualizar estado de barcos analizando el tablero
  private updateShipsStatusByAnalyzingBoard(): void {
    // Encontrar todos los 'hits' en el tablero
    const hitCells: { x: number, y: number, shipType?: string }[] = [];

    for (let y = 0; y < this.gameBoard.length; y++) {
      for (let x = 0; x < this.gameBoard[y].length; x++) {
        if (this.gameBoard[y][x].status === 'hit') {
          hitCells.push({ 
            x, 
            y, 
            shipType: this.gameBoard[y][x].shipType 
          });
        }
      }
    }

    // No hay hits, no hay barcos hundidos
    if (hitCells.length === 0) {
      console.log('No se encontraron hits en el tablero');
      return;
    }

    // Encontrar grupos contiguos de celdas con hits (barcos potencialmente hundidos)
    const visitedCells = new Set<string>();
    const shipGroups: { cells: { x: number, y: number, shipType?: string }[], shipType?: string }[] = [];

    for (const cell of hitCells) {
      const cellKey = `${cell.x},${cell.y}`;
      if (!visitedCells.has(cellKey)) {
        // Encontramos un nuevo grupo, explorarlo con BFS
        const shipGroup: { x: number, y: number, shipType?: string }[] = [];
        const queue: { x: number, y: number, shipType?: string }[] = [cell];
        let groupShipType: string | undefined = cell.shipType;

        while (queue.length > 0) {
          const currentCell = queue.shift()!;
          const currentKey = `${currentCell.x},${currentCell.y}`;

          if (visitedCells.has(currentKey)) continue;

          visitedCells.add(currentKey);
          shipGroup.push(currentCell);

          // Si el tipo de barco está definido, usarlo para este grupo
          if (currentCell.shipType && !groupShipType) {
            groupShipType = currentCell.shipType;
          }

          // Explorar celdas adyacentes (arriba, abajo, izquierda, derecha)
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
                queue.push({ 
                  x: nextX, 
                  y: nextY, 
                  shipType: this.gameBoard[nextY][nextX].shipType 
                });
              }
            }
          }
        }

        // Añadir el grupo encontrado a nuestra lista de grupos
        if (shipGroup.length > 0) {
          shipGroups.push({ cells: shipGroup, shipType: groupShipType });
        }
      }
    }

    console.log('Grupos de barcos encontrados:', shipGroups);

    // Para cada grupo, determinar qué tipo de barco representa según tamaño y tipo de barco (si está disponible)
    for (const group of shipGroups) {
      const size = group.cells.length;
      const shipType = group.shipType;

      // Si el grupo tiene un tipo de barco definido, usarlo
      if (shipType) {
        this.updateShipStatus(shipType, true);
        console.log(`Barco hundido encontrado con tipo explícito: ${shipType}, tamaño: ${size}`);
        continue;
      }

      // Si no hay tipo de barco, inferirlo por el tamaño
      // y verificar cuáles ya están hundidos para evitar duplicados
      this.determineShipTypeBySize(size);
    }
  }

  // NUEVO: Método para determinar el tipo de barco según tamaño
  private determineShipTypeBySize(size: number): void {
    // Mapear el tamaño del barco a su tipo y determinar qué barcos ya están hundidos
    switch (size) {
      case 5: // Portaaviones
        if (!this.shipsStatus.find(ship => ship.type === 'carrier' && ship.sunk)) {
          this.updateShipStatus('carrier', true);
          console.log('Determinado como portaaviones (tamaño 5)');
        }
        break;
      case 4: // Acorazado
        if (!this.shipsStatus.find(ship => ship.type === 'battleship' && ship.sunk)) {
          this.updateShipStatus('battleship', true);
          console.log('Determinado como acorazado (tamaño 4)');
        }
        break;
      case 3: // Crucero o Submarino
        // Verificar cuál de los dos barcos de tamaño 3 ya está hundido
        if (!this.shipsStatus.find(ship => ship.type === 'cruiser' && ship.sunk)) {
          this.updateShipStatus('cruiser', true);
          console.log('Determinado como crucero (tamaño 3)');
        } else if (!this.shipsStatus.find(ship => ship.type === 'submarine' && ship.sunk)) {
          this.updateShipStatus('submarine', true);
          console.log('Determinado como submarino (tamaño 3)');
        }
        break;
      case 2: // Destructor
        if (!this.shipsStatus.find(ship => ship.type === 'destroyer' && ship.sunk)) {
          this.updateShipStatus('destroyer', true);
          console.log('Determinado como destructor (tamaño 2)');
        }
        break;
    }
  }
  
  // MEJORADO: Contar hits en el tablero
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
  
  // NUEVO: Verificar si un barco está hundido basado en el tablero
  isShipSunkOnBoard(shipType: string): boolean {
    // Obtener el tamaño esperado del barco
    const shipSizes: { [key: string]: number } = {
      'carrier': 5,
      'battleship': 4,
      'cruiser': 3,
      'submarine': 3,
      'destroyer': 2
    };
    
    const expectedSize = shipSizes[shipType];
    if (!expectedSize) return false;
    
    // Contar celdas con hits que tengan este tipo de barco
    let hitCount = 0;
    for (let row of this.gameBoard) {
      for (let cell of row) {
        if (cell.status === 'hit' && cell.shipType === shipType) {
          hitCount++;
        }
      }
    }
    
    // El barco está hundido si todos sus segmentos han sido alcanzados
    return hitCount === expectedSize;
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
    
    // Cuando actualizamos las estadísticas del juego, también
    // aprovechamos para guardar el estado actual si el juego está en progreso
    if (this.currentGame.id && this.currentGame.status !== 'completed' && !this.isViewMode) {
      this.saveShipsStatus();
    }
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