// src/app/shared/game-board/game-board.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CellState, ShotRequest } from '../../models/game';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.css'],
})
export class GameBoardComponent implements OnChanges {
  @Input() board: CellState[][] = [];
  @Input() gameOver = false;
  @Input() isLoading = false;

  @Output() cellClick = new EventEmitter<ShotRequest>();

  // For displaying column headers (A-J)
  columnLabels: string[] = [];
  // For displaying row numbers (1-10)
  rowLabels: number[] = [];

  constructor() {
    this.initLabels();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['board'] && this.board && this.board.length > 0) {
      this.initLabels();
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
        return `cell-ship cell-ship-${cell.shipType}`;
      default:
        return 'cell-empty';
    }
  }
}
