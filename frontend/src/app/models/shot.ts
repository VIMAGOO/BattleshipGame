export interface Shot {
  id?: number;
  game_id: number;
  position_x: number;
  position_y: number;
  hit: boolean;
  created_at?: string;
  updated_at?: string;
}
