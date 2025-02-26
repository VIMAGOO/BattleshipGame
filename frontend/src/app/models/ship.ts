export interface Ship {
  id?: number;
  game_id: number;
  type: 'destroyer' | 'submarine' | 'cruiser' | 'battleship' | 'carrier';
  position_x: number;
  position_y: number;
  orientation: 'horizontal' | 'vertical';
  size: number;
  hits: number;
  sunk: boolean;
  created_at?: string;
  updated_at?: string;
}

export const SHIP_SIZES = {
  destroyer: 2,
  submarine: 3,
  cruiser: 3,
  battleship: 4,
  carrier: 5,
};
