/**
 * Field label utilities for chess-style coordinate system
 * Columns: A-H (8 columns)
 * Rows: 1-6 (6 rows)
 */

import { FieldPosition } from '../types/models';

// Field dimensions
const FIELD_WIDTH = 48;
const FIELD_HEIGHT = 48;
const NUM_COLUMNS = 8;
const NUM_ROWS = 6;

const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROW_LABELS = ['1', '2', '3', '4', '5', '6'];

/**
 * Convert field label (e.g., "A7") to field coordinates
 * @param label - Label like "A7", "B6", etc.
 * @returns FieldPosition or null if invalid
 */
export function labelToPosition(label: string): FieldPosition | null {
  if (!label || label.length < 2) return null;
  
  const upperLabel = label.toUpperCase().trim();
  const columnChar = upperLabel[0];
  const rowStr = upperLabel.slice(1);
  
  // Find column index (A=0, B=1, etc.)
  const columnIndex = COLUMN_LABELS.indexOf(columnChar);
  if (columnIndex === -1) return null;
  
  // Find row index (1=0, 2=1, etc.)
  const rowNum = parseInt(rowStr, 10);
  if (isNaN(rowNum) || rowNum < 1 || rowNum > NUM_ROWS) return null;
  const rowIndex = rowNum - 1;
  
  // Calculate center of the square
  const squareWidth = FIELD_WIDTH / NUM_COLUMNS;
  const squareHeight = FIELD_HEIGHT / NUM_ROWS;
  
  const x = (columnIndex + 0.5) * squareWidth;
  const y = (rowIndex + 0.5) * squareHeight;
  
  return {
    x,
    y,
    rotation: 0,
  };
}

/**
 * Convert field coordinates to label (e.g., {x: 3, y: 42} -> "A7")
 * @param position - FieldPosition
 * @returns Label string like "A7", "B6", etc.
 */
export function positionToLabel(position: FieldPosition): string {
  const squareWidth = FIELD_WIDTH / NUM_COLUMNS;
  const squareHeight = FIELD_HEIGHT / NUM_ROWS;
  
  // Find which square the position is in
  const columnIndex = Math.floor(Math.max(0, Math.min(FIELD_WIDTH - 0.01, position.x)) / squareWidth);
  const rowIndex = Math.floor(Math.max(0, Math.min(FIELD_HEIGHT - 0.01, position.y)) / squareHeight);
  
  // Convert to labels
  const columnLabel = COLUMN_LABELS[Math.min(columnIndex, NUM_COLUMNS - 1)];
  const rowLabel = ROW_LABELS[Math.min(rowIndex, NUM_ROWS - 1)];
  
  return `${columnLabel}${rowLabel}`;
}

/**
 * Get grid intersection position (snaps to grid centers)
 * @param position - FieldPosition
 * @returns Snapped FieldPosition
 */
export function snapToGrid(position: FieldPosition): FieldPosition {
  const squareWidth = FIELD_WIDTH / NUM_COLUMNS;
  const squareHeight = FIELD_HEIGHT / NUM_ROWS;
  
  const columnIndex = Math.round(position.x / squareWidth);
  const rowIndex = Math.round(position.y / squareHeight);
  
  return {
    x: Math.max(0, Math.min(FIELD_WIDTH, columnIndex * squareWidth)),
    y: Math.max(0, Math.min(FIELD_HEIGHT, rowIndex * squareHeight)),
    rotation: position.rotation || 0,
  };
}

/**
 * Get all valid column labels
 */
export function getColumnLabels(): string[] {
  return [...COLUMN_LABELS];
}

/**
 * Get all valid row labels
 */
export function getRowLabels(): string[] {
  return [...ROW_LABELS];
}





