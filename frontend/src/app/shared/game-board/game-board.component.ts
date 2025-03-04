// src/app/shared/game-board/game-board.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CellState, ShotRequest } from '../../models/game';

interface ShipCoordinate {
  x: number;
  y: number;
  orientation: string;
  position: string; // 'start', 'middle', 'end'
}

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.css'],
})
export class GameBoardComponent implements OnChanges, OnInit {
  @Input() board: CellState[][] = [];
  @Input() gameOver = false;
  @Input() isLoading = false;

  @Output() cellClick = new EventEmitter<ShotRequest>();

  // For displaying column headers (A-J)
  columnLabels: string[] = [];
  // For displaying row numbers (1-10)
  rowLabels: number[] = [];

  // Store ship coordinates for better visualization
  shipCoordinates: Map<string, ShipCoordinate> = new Map();

  constructor() {
    this.initLabels();
  }

  ngOnInit(): void {
    this.identifyShipParts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['board'] && this.board && this.board.length > 0) {
      this.initLabels();
      this.identifyShipParts();
    }
  }

  private initLabels(): void {
    if (this.board && this.board.length > 0) {
      const size = this.board.length;

      // Create column labels (A, B, C, ...)
      this.columnLabels = Array(size)
        .fill(0)
        .map((_, i) => String.fromCharCode(65 + i));

      // Create row labels (1, 2, 3, ...)
      this.rowLabels = Array(size)
        .fill(0)
        .map((_, i) => i + 1);
    } else {
      // Default to 10x10 grid if board not provided
      this.columnLabels = Array(10)
        .fill(0)
        .map((_, i) => String.fromCharCode(65 + i));
      this.rowLabels = Array(10)
        .fill(0)
        .map((_, i) => i + 1);
    }
  }

  /**
   * Identify ship parts for better visualization
   * This method analyzes the board to determine the orientation
   * and position (start, middle, end) of each ship part
   */
  private identifyShipParts(): void {
    if (!this.board || this.board.length === 0) return;

    this.shipCoordinates.clear();

    // First pass - identify ships and their orientations
    for (let y = 0; y < this.board.length; y++) {
      for (let x = 0; x < this.board[y].length; x++) {
        const cell = this.board[y][x];

        if ((cell.status === 'ship' || cell.status === 'hit') && cell.shipType) {
          // Check horizontal orientation
          const isHorizontal = this.checkHorizontalOrientation(x, y, cell.shipType);
          // Store the orientation information
          this.shipCoordinates.set(`${x},${y}`, {
            x,
            y,
            orientation: isHorizontal ? 'horizontal' : 'vertical',
            position: 'middle' // Default, will be refined in second pass
          });
        }
      }
    }

    // Second pass - identify start/middle/end positions
    for (const [key, coordinate] of this.shipCoordinates.entries()) {
      const { x, y, orientation } = coordinate;
      const currentCell = this.board[y][x];

      if (orientation === 'horizontal') {
        // Check if it's the start of a horizontal ship
        const leftCell = x > 0 ? this.board[y][x - 1] : null;
        const isStart = !leftCell ||
          leftCell.status !== 'ship' ||
          leftCell.shipType !== currentCell.shipType;

        // Check if it's the end of a horizontal ship
        const rightCell = x < this.board[y].length - 1 ? this.board[y][x + 1] : null;
        const isEnd = !rightCell ||
          rightCell.status !== 'ship' ||
          rightCell.shipType !== currentCell.shipType;

        // Update position info
        if (isStart && isEnd) {
          this.shipCoordinates.set(key, { ...coordinate, position: 'single' });
        } else if (isStart) {
          this.shipCoordinates.set(key, { ...coordinate, position: 'start' });
        } else if (isEnd) {
          this.shipCoordinates.set(key, { ...coordinate, position: 'end' });
        }
      } else {
        // Check if it's the start of a vertical ship
        const topCell = y > 0 ? this.board[y - 1][x] : null;
        const isStart = !topCell ||
          topCell.status !== 'ship' ||
          topCell.shipType !== currentCell.shipType;

        // Check if it's the end of a vertical ship
        const bottomCell = y < this.board.length - 1 ? this.board[y + 1][x] : null;
        const isEnd = !bottomCell ||
          bottomCell.status !== 'ship' ||
          bottomCell.shipType !== currentCell.shipType;

        // Update position info
        if (isStart && isEnd) {
          this.shipCoordinates.set(key, { ...coordinate, position: 'single' });
        } else if (isStart) {
          this.shipCoordinates.set(key, { ...coordinate, position: 'start' });
        } else if (isEnd) {
          this.shipCoordinates.set(key, { ...coordinate, position: 'end' });
        }
      }
    }
  }

  /**
   * Check if a ship part at (x,y) is in horizontal orientation
   */
  private checkHorizontalOrientation(x: number, y: number, shipType: string): boolean {
    // Check horizontally adjacent cells
    const leftCell = x > 0 ? this.board[y][x - 1] : null;
    const rightCell = x < this.board[y].length - 1 ? this.board[y][x + 1] : null;

    const isLeftSameShip = leftCell ?
      ((leftCell.status === 'ship' || leftCell.status === 'hit') &&
        leftCell.shipType === shipType) : false;

    const isRightSameShip = rightCell ?
      ((rightCell.status === 'ship' || rightCell.status === 'hit') &&
        rightCell.shipType === shipType) : false;

    return isLeftSameShip || isRightSameShip;
  }

  /**
   * Get CSS classes for a ship part at position (x,y)
   */
  getShipPartClass(x: number, y: number, cell: CellState): string {
    if (!cell.shipType) return '';

    const key = `${x},${y}`;
    const shipInfo = this.shipCoordinates.get(key);

    if (!shipInfo) return `${cell.shipType}-part`;

    let positionClass = '';
    if (shipInfo.orientation === 'horizontal') {
      if (shipInfo.position === 'start') {
        positionClass = 'ship-part-horizontal-start';
      } else if (shipInfo.position === 'end') {
        positionClass = 'ship-part-horizontal-end';
      } else if (shipInfo.position === 'single') {
        positionClass = 'ship-part-horizontal-start ship-part-horizontal-end';
      } else {
        positionClass = 'ship-part-middle';
      }
    } else {
      if (shipInfo.position === 'start') {
        positionClass = 'ship-part-vertical-start';
      } else if (shipInfo.position === 'end') {
        positionClass = 'ship-part-vertical-end';
      } else if (shipInfo.position === 'single') {
        positionClass = 'ship-part-vertical-start ship-part-vertical-end';
      } else {
        positionClass = 'ship-part-middle';
      }
    }

    return `${cell.shipType}-part ${positionClass}`;
  }

  onCellClick(x: number, y: number): void {
    if (this.isLoading || this.gameOver) {
      return;
    }

    // Don't allow clicking on cells that already have been hit or missed
    if (
      this.board &&
      this.board[y] &&
      this.board[y][x] &&
      (this.board[y][x].status === 'hit' || this.board[y][x].status === 'miss')
    ) {
      return;
    }

    this.cellClick.emit({
      position_x: x,
      position_y: y,
    });
  }

  getCellClass(cell: CellState): string {
    if (!cell) return 'cell-empty';

    switch (cell.status) {
      case 'hit':
        return 'cell-hit';
      case 'miss':
        return 'cell-miss';
      case 'ship':
        return `cell-ship`;
      default:
        return 'cell-empty';
    }
  }
}