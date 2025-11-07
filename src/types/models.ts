/**
 * Core data models for VEX IQ Mix and Match route planning
 */

import { z } from 'zod';

/**
 * Field coordinates (x, y) in field units
 * Field is typically 48" x 48" (6 tiles x 6 tiles)
 */
export interface FieldPosition {
  x: number; // 0-48 inches or tile coordinates
  y: number;
  rotation?: number; // degrees (0-360)
}

/**
 * Waypoint for route planning
 */
export interface Waypoint {
  id: string;
  position: FieldPosition;
  action?: RobotAction;
  timestamp?: number; // seconds into match
}

/**
 * Robot actions at waypoints
 */
export enum RobotAction {
  PICKUP_PIN = 'pickup_pin',
  PICKUP_BEAM = 'pickup_beam',
  PLACE_STACK = 'place_stack',
  PLACE_GOAL = 'place_goal',
  WAIT = 'wait',
  SCORE = 'score',
}

/**
 * Pin colors for Mix and Match
 */
export enum PinColor {
  RED = 'red',
  BLUE = 'blue',
  YELLOW = 'yellow',
}

/**
 * Pin element - draggable pin on the field
 */
export interface Pin {
  id: string;
  position: FieldPosition;
  color: PinColor;
}

/**
 * Beam element - draggable beam on the field
 */
export interface Beam {
  id: string;
  position: FieldPosition;
  rotation?: number; // degrees (0-360) for orientation
}

/**
 * Field element types
 */
export enum FieldElement {
  GOAL_RED = 'goal_red',
  GOAL_BLUE = 'goal_blue',
  GOAL_YELLOW = 'goal_yellow',
  GOAL_GREEN = 'goal_green',
  PINS_STARTING = 'pins_starting',
  BEAMS_STARTING = 'beams_starting',
  BARRIER = 'barrier',
}

/**
 * Field element position
 */
export interface ElementPosition {
  element: FieldElement;
  position: FieldPosition;
}

/**
 * Route - a sequence of waypoints
 */
export interface Route {
  id: string;
  name: string;
  description?: string;
  waypoints: Waypoint[];
  estimatedTime: number; // seconds
  estimatedScore: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Strategy - collection of routes and game plan
 */
export interface Strategy {
  id: string;
  name: string;
  description?: string;
  routes: Route[];
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Field layout - saved configuration of pins and beams on the field
 */
export interface FieldLayout {
  id: string;
  name: string;
  description?: string;
  pins: Pin[];
  beams: Beam[];
  isDefault?: boolean; // Default layout for current year
  createdAt: string;
  updatedAt: string;
}

/**
 * Field configuration
 */
export interface FieldConfig {
  width: number; // inches
  height: number; // inches
  tileSize: number; // inches per tile
  elements: ElementPosition[];
}

/**
 * Match scenario (for testing different starting conditions)
 */
export interface MatchScenario {
  id: string;
  name: string;
  startingPositions: {
    pins: FieldPosition[];
    beams: FieldPosition[];
  };
  opponentStart?: FieldPosition;
  notes?: string;
}

// Zod schemas for validation
export const FieldPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number().optional(),
});

export const WaypointSchema = z.object({
  id: z.string(),
  position: FieldPositionSchema,
  action: z.nativeEnum(RobotAction).optional(),
  timestamp: z.number().optional(),
});

export const RouteSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  waypoints: z.array(WaypointSchema),
  estimatedTime: z.number(),
  estimatedScore: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PinSchema = z.object({
  id: z.string(),
  position: FieldPositionSchema,
  color: z.nativeEnum(PinColor),
});

export const BeamSchema = z.object({
  id: z.string(),
  position: FieldPositionSchema,
  rotation: z.number().optional(),
});

export const FieldLayoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  pins: z.array(PinSchema),
  beams: z.array(BeamSchema),
  isDefault: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const StrategySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  routes: z.array(RouteSchema),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});


