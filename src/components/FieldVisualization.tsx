/**
 * Field visualization component
 * Renders the VEX IQ Mix and Match field with interactive elements
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Polygon } from 'react-native-svg';
import { FieldConfig, FieldElement, FieldPosition } from '../types/models';

interface FieldVisualizationProps {
  config: FieldConfig;
  waypoints?: Array<{ position: FieldPosition; id: string }>;
  onWaypointAdd?: (position: FieldPosition) => void;
  onWaypointMove?: (id: string, position: FieldPosition) => void;
  scale?: number; // Scale factor for display
}

export const FieldVisualization: React.FC<FieldVisualizationProps> = ({
  config,
  waypoints = [],
  scale = 1,
}) => {
  const fieldWidth = config.width * scale;
  const fieldHeight = config.height * scale;

  const renderFieldElement = (element: FieldElement, position: FieldPosition) => {
    const x = position.x * scale;
    const y = position.y * scale;
    const size = 8 * scale; // Element size in inches * scale

    switch (element) {
      case FieldElement.GOAL_RED:
        return (
          <Rect
            key={`${element}-${x}-${y}`}
            x={x - size / 2}
            y={y - size / 2}
            width={size}
            height={size}
            fill="#ef4444"
            stroke="#991b1b"
            strokeWidth={2}
            rx={2}
          />
        );

      case FieldElement.GOAL_BLUE:
        return (
          <Rect
            key={`${element}-${x}-${y}`}
            x={x - size / 2}
            y={y - size / 2}
            width={size}
            height={size}
            fill="#3b82f6"
            stroke="#1e40af"
            strokeWidth={2}
            rx={2}
          />
        );

      case FieldElement.GOAL_YELLOW:
        return (
          <Rect
            key={`${element}-${x}-${y}`}
            x={x - size / 2}
            y={y - size / 2}
            width={size}
            height={size}
            fill="#eab308"
            stroke="#854d0e"
            strokeWidth={2}
            rx={2}
          />
        );

      case FieldElement.GOAL_GREEN:
        return (
          <Rect
            key={`${element}-${x}-${y}`}
            x={x - size / 2}
            y={y - size / 2}
            width={size}
            height={size}
            fill="#22c55e"
            stroke="#166534"
            strokeWidth={2}
            rx={2}
          />
        );

      case FieldElement.PINS_STARTING:
        return (
          <Circle
            key={`${element}-${x}-${y}`}
            cx={x}
            cy={y}
            r={size / 3}
            fill="#fbbf24"
            stroke="#92400e"
            strokeWidth={1.5}
          />
        );

      case FieldElement.BEAMS_STARTING:
        return (
          <Rect
            key={`${element}-${x}-${y}`}
            x={x - size / 2}
            y={y - size / 6}
            width={size}
            height={size / 3}
            fill="#d97706"
            stroke="#78350f"
            strokeWidth={1.5}
            rx={1}
          />
        );

      case FieldElement.BARRIER:
        return (
          <Rect
            key={`${element}-${x}-${y}`}
            x={x - size / 2}
            y={y - size / 2}
            width={size}
            height={size}
            fill="#6b7280"
            stroke="#374151"
            strokeWidth={2}
            opacity={0.7}
          />
        );

      default:
        return null;
    }
  };

  const renderWaypoint = (waypoint: { position: FieldPosition; id: string }, _index: number) => {
    const x = waypoint.position.x * scale;
    const y = waypoint.position.y * scale;
    const radius = 6 * scale;

    return (
      <Circle
        key={waypoint.id}
        cx={x}
        cy={y}
        r={radius}
        fill="#2563eb"
        stroke="#1e40af"
        strokeWidth={2}
        opacity={0.8}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Svg width={fieldWidth} height={fieldHeight} viewBox={`0 0 ${fieldWidth} ${fieldHeight}`}>
        {/* Field background */}
        <Rect
          x={0}
          y={0}
          width={fieldWidth}
          height={fieldHeight}
          fill="#f3f4f6"
          stroke="#9ca3af"
          strokeWidth={2}
        />

        {/* Grid lines (optional - helps with positioning) */}
        {Array.from({ length: Math.floor(config.width / config.tileSize) + 1 }).map((_, i) => (
          <React.Fragment key={`grid-v-${i}`}>
            <Rect
              x={i * config.tileSize * scale}
              y={0}
              width={1}
              height={fieldHeight}
              fill="#e5e7eb"
              opacity={0.5}
            />
            <Rect
              x={0}
              y={i * config.tileSize * scale}
              width={fieldWidth}
              height={1}
              fill="#e5e7eb"
              opacity={0.5}
            />
          </React.Fragment>
        ))}

        {/* Field elements */}
        {config.elements.map((elem) => renderFieldElement(elem.element, elem.position))}

        {/* Route waypoints */}
        {waypoints.map((waypoint, index) => renderWaypoint(waypoint, index))}

        {/* Waypoint connections (path) */}
        {waypoints.length > 1 && (
          <Polygon
            points={waypoints
              .map((w) => `${w.position.x * scale},${w.position.y * scale}`)
              .join(' ')}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="5,5"
            opacity={0.5}
          />
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
  },
});

