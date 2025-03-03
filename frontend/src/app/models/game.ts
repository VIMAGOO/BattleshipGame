import { Ship } from './ship';
import { Shot } from './shot';

export interface Game {
  id?: number;
  user_id: number;
  start_time: string;
  end_time?: string;
  status: 'in_progress' | 'completed';
  total_shots: number;
  hits: number;
  misses: number;
  score: number;
  created_at?: string;
  updated_at?: string;
  ships?: Ship[];
  shots?: Shot[];
  // Para la interfaz visual
  board?: CellState[][];
}

export interface GameStats {
  total_games: number;
  total_shots: number;
  total_hits: number;
  total_misses: number;
  accuracy: number;
  average_time: string;
  best_time?: string;
  best_score?: number;
}

export interface CellState {
  x: number;
  y: number;
  status: 'empty' | 'hit' | 'miss' | 'ship';
  shipType?: string;
}

export interface ShotRequest {
  position_x: number;
  position_y: number;
}

export interface ShotResponse {
  hit: boolean;
  sunk?: boolean;
  ship_type?: string;
  game_over?: boolean;
  score?: number;
  board?: CellState[][] | null; // Añadir null como posible tipo
}
