/**
 * Route calculation and scoring utilities
 */

import { Waypoint, RobotAction, FieldPosition } from '../types/models';
import { FieldConfigService } from '../services/fieldConfig';

/**
 * Calculate estimated time for a route
 * Simple estimation based on distance and actions
 */
export function calculateRouteTime(waypoints: Waypoint[]): number {
  if (waypoints.length < 2) return 0;

  let totalTime = 0;
  const ROBOT_SPEED = 12; // inches per second (approximate)
  const ACTION_TIME = 2; // seconds per action

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    
    // Calculate distance
    const dx = curr.position.x - prev.position.x;
    const dy = curr.position.y - prev.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Add travel time
    totalTime += distance / ROBOT_SPEED;
    
    // Add action time if waypoint has an action
    if (curr.action) {
      totalTime += ACTION_TIME;
    }
  }

  return Math.round(totalTime);
}

/**
 * Calculate estimated score for a route
 * This is a placeholder - actual scoring depends on game rules
 */
export function calculateRouteScore(waypoints: Waypoint[]): number {
  let score = 0;
  
  for (const waypoint of waypoints) {
    switch (waypoint.action) {
      case RobotAction.PLACE_STACK:
        score += 5; // Base points for placing stack
        break;
      case RobotAction.PLACE_GOAL:
        score += 3; // Points for placing in goal
        break;
      case RobotAction.SCORE:
        score += 10; // Major scoring action
        break;
      default:
        break;
    }
  }
  
  return score;
}

/**
 * Validate route waypoints
 */
export function validateRoute(waypoints: Waypoint[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (waypoints.length === 0) {
    errors.push('Route must have at least one waypoint');
  }

  for (const waypoint of waypoints) {
    if (!FieldConfigService.isWithinBounds(waypoint.position)) {
      errors.push(`Waypoint ${waypoint.id} is out of bounds`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a unique ID for routes/strategies
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Calculate distance between two positions
 */
export function calculateDistance(
  pos1: FieldPosition,
  pos2: FieldPosition
): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two positions
 */
export function calculateAngle(
  pos1: FieldPosition,
  pos2: FieldPosition
): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

