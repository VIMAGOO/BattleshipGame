// src/app/services/game.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Game, ShotRequest, ShotResponse, CellState } from '../models/game';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) { }

  // Start a new game
  startNewGame(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/games`, {});
  }

  // Get current game state - Con soporte para retomar partidas guardadas
  getCurrentGame(): Observable<Game> {
    return new Observable<Game>((observer) => {
      // Comprobar si hay un ID de juego en sessionStorage (de una partida que se está retomando)
      const savedGameId = sessionStorage.getItem('current_game_id');

      if (savedGameId) {
        // Si hay un ID guardado, obtener esa partida específica
        this.getGameById(parseInt(savedGameId, 10)).subscribe({
          next: (game) => {
            // Si la partida está en progreso, la retomamos
            if (game.status === 'in_progress') {
              // Una vez cargada la partida, limpiar el ID guardado
              sessionStorage.removeItem('current_game_id');
              observer.next(game);
            } else {
              // Si la partida ya no está en progreso, crear una nueva
              this.createNewGameAndNotify(observer);
            }
          },
          error: (err) => {
            console.error('Error getting saved game:', err);
            // Si falla, crear una nueva partida
            this.createNewGameAndNotify(observer);
          }
        });
      } else {
        // Comportamiento normal: buscar partidas activas o crear nueva
        this.getUserGames().subscribe({
          next: (response: any) => {
            console.log('Games response:', response);

            // Si hay juegos activos, usar el primero
            if (response.active_games && response.active_games.length > 0) {
              const gameId = response.active_games[0].id;

              this.getGameById(gameId).subscribe({
                next: (game) => observer.next(game),
                error: (err) => {
                  console.error('Error getting game by ID:', err);
                  // Si falla, crear un nuevo juego
                  this.createNewGameAndNotify(observer);
                },
              });
            } else {
              // Si no hay juegos activos, crear uno nuevo
              this.createNewGameAndNotify(observer);
            }
          },
          error: (err) => {
            console.error('Error getting user games:', err);
            // Si falla, crear un nuevo juego
            this.createNewGameAndNotify(observer);
          },
        });
      }
    });
  }

  // Método auxiliar para crear un nuevo juego y notificar al observer
  private createNewGameAndNotify(observer: any): void {
    this.startNewGame().subscribe({
      next: (response: any) => {
        console.log('New game response:', response);

        // Verificar que la respuesta tenga la estructura esperada
        if (response && response.game && response.game.id) {
          const game: Game = {
            id: response.game.id,
            user_id: 0,
            start_time: response.game.start_time,
            status: response.game.status,
            total_shots: 0,
            hits: 0,
            misses: 0,
            score: 0,
          };
          observer.next(game);
        } else {
          observer.error('Invalid response format for new game');
        }
      },
      error: (err) => observer.error(err),
    });
  }

  // Get game by ID
  getGameById(id: number): Observable<Game> {
    return this.http.get<any>(`${this.apiUrl}/games/${id}`).pipe(
      tap((response) => console.log('Game by ID response:', response)),
      map((response) => {
        // Extraer datos del juego de la respuesta
        const gameData = response.game || response;

        return {
          id: gameData.id,
          user_id: gameData.user_id || 0,
          start_time: gameData.start_time,
          end_time: gameData.end_time,
          status: gameData.status,
          total_shots: gameData.total_shots || 0,
          hits: gameData.hits || 0,
          misses: gameData.misses || 0,
          score: gameData.score || 0,
          // Crear un tablero a partir de la respuesta o inicializar uno vacío
          board: response.board
            ? this.transformBoardFormat(response.board)
            : this.initializeEmptyBoard(),
        };
      }),
      catchError((error) => {
        console.error('Error fetching game:', error);
        return throwError(() => error);
      })
    );
  }

  // Get all games for current user
  getUserGames(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/games`);
  }

  // Fire a shot
  fireShot(gameId: number, shotRequest: ShotRequest): Observable<ShotResponse> {
    console.log(`Firing shot at game ${gameId}:`, shotRequest);

    return this.http
      .post<any>(`${this.apiUrl}/games/${gameId}/shots`, shotRequest)
      .pipe(
        tap((response) => console.log('Shot response from server:', response)),
        map((response) => {
          // Transformar la respuesta al formato esperado
          const shotResponse: ShotResponse = {
            hit: response.hit,
            sunk: !!response.sunk_ship, // Convertir a booleano
            ship_type: response.sunk_ship ? response.sunk_ship.type : null,
            game_over: response.game_over || false,
            score: response.score || 0,
            board: null,
          };

          // Si hay un estado final del tablero, añadirlo a la respuesta
          if (response.game_over && response.board) {
            shotResponse.board = this.transformBoardFormat(response.board);
          }

          return shotResponse;
        }),
        catchError((error) => {
          console.error('Error firing shot:', error);
          return throwError(() => error);
        })
      );
  }

  // Comprobar si hay una partida en modo visualización
  checkForViewMode(): Observable<Game | null> {
    const viewMode = sessionStorage.getItem('view_mode');
    const viewGameData = sessionStorage.getItem('view_game');

    if (viewMode === 'true' && viewGameData) {
      try {
        // Limpiar los datos de sessionStorage
        sessionStorage.removeItem('view_mode');
        sessionStorage.removeItem('view_game');

        // Devolver el juego almacenado
        return of(JSON.parse(viewGameData));
      } catch (error) {
        console.error('Error parsing view game data:', error);
      }
    }

    return of(null);
  }

  // Transformar el formato del tablero del backend al formato esperado por el frontend
  transformBoardFormat(backendBoard: any[][]): CellState[][] {
    const frontendBoard: CellState[][] = [];

    for (let y = 0; y < backendBoard.length; y++) {
      const row: CellState[] = [];
      for (let x = 0; x < backendBoard[y].length; x++) {
        const cell = backendBoard[y][x];
        const cellState: CellState = {
          x,
          y,
          status: 'empty',
        };

        if (cell.shot) {
          cellState.status = cell.hit ? 'hit' : 'miss';
        } else if (cell.ship) {
          cellState.status = 'ship';
          cellState.shipType = cell.ship.type;
        }

        row.push(cellState);
      }
      frontendBoard.push(row);
    }

    return frontendBoard;
  }

  // Initialize board with empty cells
  initializeEmptyBoard(size: number = 10): CellState[][] {
    const board: CellState[][] = [];
    for (let y = 0; y < size; y++) {
      const row: CellState[] = [];
      for (let x = 0; x < size; x++) {
        row.push({
          x,
          y,
          status: 'empty',
        });
      }
      board.push(row);
    }
    return board;
  }

  // Update board with shot results
  updateBoardWithShot(
    board: CellState[][],
    shot: ShotRequest,
    hit: boolean
  ): CellState[][] {
    const updatedBoard = JSON.parse(JSON.stringify(board)); // Deep clone
    updatedBoard[shot.position_y][shot.position_x].status = hit
      ? 'hit'
      : 'miss';
    return updatedBoard;
  }
}