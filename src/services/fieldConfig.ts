/**
 * Field configuration for VEX IQ Mix and Match
 * Based on official field specifications
 */

import { FieldConfig, FieldElement, FieldPosition } from '../types/models';

/**
 * Standard Mix and Match field configuration
 * Field: 48" x 48" (6 tiles x 6 tiles)
 * Each tile: 8" x 8"
 */
export const STANDARD_FIELD_CONFIG: FieldConfig = {
  width: 48, // inches
  height: 48,
  tileSize: 8,
  elements: [
    // Goals - approximate positions (need to verify with official CAD)
    // Red goal (top-left area)
    {
      element: FieldElement.GOAL_RED,
      position: { x: 12, y: 12, rotation: 0 },
    },
    // Blue goal (top-right area)
    {
      element: FieldElement.GOAL_BLUE,
      position: { x: 36, y: 12, rotation: 0 },
    },
    // Yellow goal (bottom-left area)
    {
      element: FieldElement.GOAL_YELLOW,
      position: { x: 12, y: 36, rotation: 0 },
    },
    // Green goal (bottom-right area)
    {
      element: FieldElement.GOAL_GREEN,
      position: { x: 36, y: 36, rotation: 0 },
    },
    // Starting pins position (need actual position from game manual)
    {
      element: FieldElement.PINS_STARTING,
      position: { x: 8, y: 8, rotation: 0 },
    },
    // Starting beams position (need actual position from game manual)
    {
      element: FieldElement.BEAMS_STARTING,
      position: { x: 40, y: 8, rotation: 0 },
    },
    // Barriers (need actual positions from game manual)
    // Add barriers as needed
  ],
};

/**
 * Field configuration service
 */
export class FieldConfigService {
  /**
   * Get standard field configuration
   */
  static getStandardConfig(): FieldConfig {
    return STANDARD_FIELD_CONFIG;
  }

  /**
   * Convert inches to tile coordinates
   */
  static inchesToTiles(inches: number): number {
    return inches / STANDARD_FIELD_CONFIG.tileSize;
  }

  /**
   * Convert tile coordinates to inches
   */
  static tilesToInches(tiles: number): number {
    return tiles * STANDARD_FIELD_CONFIG.tileSize;
  }

  /**
   * Check if a position is within field bounds
   */
  static isWithinBounds(position: FieldPosition): boolean {
    return (
      position.x >= 0 &&
      position.x <= STANDARD_FIELD_CONFIG.width &&
      position.y >= 0 &&
      position.y <= STANDARD_FIELD_CONFIG.height
    );
  }

  /**
   * Get element at position (with tolerance)
   */
  static getElementAtPosition(
    config: FieldConfig,
    position: FieldPosition,
    tolerance: number = 2
  ): FieldElement | null {
    for (const element of config.elements) {
      const dx = Math.abs(element.position.x - position.x);
      const dy = Math.abs(element.position.y - position.y);
      if (dx <= tolerance && dy <= tolerance) {
        return element.element;
      }
    }
    return null;
  }
}

