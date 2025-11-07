/**
 * Hybrid SVG Field Component
 * Uses SVG for all elements with background image support
 * Better layering and easier to add elements later
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  PanResponderInstance,
} from 'react-native';
import Svg, {
  Rect,
  Circle,
  Line,
  Image as SvgImage,
  G,
} from 'react-native-svg';
import { FieldPosition, Waypoint, Pin, PinColor } from '../types/models';

interface SvgFieldProps {
  waypoints: Waypoint[];
  pins?: Pin[];
  selectedPinColor?: PinColor;
  onWaypointAdd: (position: FieldPosition) => void;
  onWaypointMove: (id: string, position: FieldPosition) => void;
  onWaypointRemove: (id: string) => void;
  onPinAdd?: (position: FieldPosition, color: PinColor) => void;
  onPinMove?: (id: string, position: FieldPosition) => void;
  onPinRemove?: (id: string) => void;
  fieldWidth?: number;
  fieldHeight?: number;
  containerStyle?: object;
  showGrid?: boolean;
  useBackgroundImage?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FIELD_SIZE = Math.min(SCREEN_WIDTH - 32, 350);

export const SvgField: React.FC<SvgFieldProps> = ({
  waypoints,
  pins = [],
  selectedPinColor = PinColor.RED,
  onWaypointAdd: _onWaypointAdd,
  onWaypointMove,
  onWaypointRemove: _onWaypointRemove,
  onPinAdd,
  onPinMove,
  onPinRemove: _onPinRemove,
  fieldWidth = 48,
  fieldHeight = 48,
  containerStyle,
  showGrid = false,
  useBackgroundImage = true,
}) => {
  const [dragStart, setDragStart] = useState<{ x: number; y: number; id: string; type: 'pin' | 'waypoint' } | null>(null);

  const containerWidth = (containerStyle as any)?.width || FIELD_SIZE;
  const calculatedFieldSize = Math.min(containerWidth - 16, FIELD_SIZE);
  const scale = calculatedFieldSize / 48;

  const screenToField = (screenX: number, screenY: number): FieldPosition => ({
    x: screenX / scale,
    y: screenY / scale,
    rotation: 0,
  });

  const fieldToScreen = (fieldX: number, fieldY: number) => ({
    x: fieldX * scale,
    y: fieldY * scale,
  });

  // Pan responder for field interactions
  const fieldPanResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        
        // Check if clicking on a pin
        for (const pin of pins) {
          const pinScreen = fieldToScreen(pin.position.x, pin.position.y);
          const dx = Math.abs(locationX - pinScreen.x);
          const dy = Math.abs(locationY - pinScreen.y);
          if (dx < 15 && dy < 15 && onPinMove) {
            setDragStart({ x: locationX, y: locationY, id: pin.id, type: 'pin' });
            return;
          }
        }
        
        // Check if clicking on a waypoint
        for (const waypoint of waypoints) {
          const wpScreen = fieldToScreen(waypoint.position.x, waypoint.position.y);
          const dx = Math.abs(locationX - wpScreen.x);
          const dy = Math.abs(locationY - wpScreen.y);
          if (dx < 15 && dy < 15) {
            setDragStart({ x: locationX, y: locationY, id: waypoint.id, type: 'waypoint' });
            return;
          }
        }
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (dragStart && onPinMove && dragStart.type === 'pin') {
          const newX = dragStart.x + gestureState.dx;
          const newY = dragStart.y + gestureState.dy;
          const fieldPos = screenToField(newX, newY);
          const clampedPos = {
            x: Math.max(0, Math.min(fieldWidth, fieldPos.x)),
            y: Math.max(0, Math.min(fieldHeight, fieldPos.y)),
            rotation: 0,
          };
          onPinMove(dragStart.id, clampedPos);
        } else if (dragStart && dragStart.type === 'waypoint') {
          const newX = dragStart.x + gestureState.dx;
          const newY = dragStart.y + gestureState.dy;
          const fieldPos = screenToField(newX, newY);
          const clampedPos = {
            x: Math.max(0, Math.min(fieldWidth, fieldPos.x)),
            y: Math.max(0, Math.min(fieldHeight, fieldPos.y)),
            rotation: 0,
          };
          onWaypointMove(dragStart.id, clampedPos);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!dragStart) {
          // Simple tap - add pin
          if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
            const { locationX, locationY } = evt.nativeEvent;
            const fieldPos = screenToField(locationX, locationY);
            
            const tapOnPin = pins.some((pin) => {
              const pinScreen = fieldToScreen(pin.position.x, pin.position.y);
              return Math.abs(locationX - pinScreen.x) < 15 && Math.abs(locationY - pinScreen.y) < 15;
            });
            
            const tapOnWaypoint = waypoints.some((wp) => {
              const wpScreen = fieldToScreen(wp.position.x, wp.position.y);
              return Math.abs(locationX - wpScreen.x) < 15 && Math.abs(locationY - wpScreen.y) < 15;
            });
            
            if (!tapOnPin && !tapOnWaypoint && onPinAdd) {
              onPinAdd(fieldPos, selectedPinColor);
            }
          }
        }
        setDragStart(null);
      },
    })
  ).current;

  const getPinColor = (color: PinColor) => {
    switch (color) {
      case PinColor.RED:
        return { fill: '#ef4444', stroke: '#dc2626' };
      case PinColor.BLUE:
        return { fill: '#3b82f6', stroke: '#2563eb' };
      case PinColor.YELLOW:
        return { fill: '#eab308', stroke: '#ca8a04' };
      default:
        return { fill: '#9ca3af', stroke: '#6b7280' };
    }
  };

  const renderGrid = () => {
    if (!showGrid) return null;
    const tileSize = 8 * scale;
    const tilesX = Math.ceil(fieldWidth / 8);
    const tilesY = Math.ceil(fieldHeight / 8);
    
    return (
      <G opacity={0.3}>
        {Array.from({ length: tilesX + 1 }).map((_, i) => (
          <Line
            key={`grid-v-${i}`}
            x1={i * tileSize}
            y1={0}
            x2={i * tileSize}
            y2={fieldHeight * scale}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}
        {Array.from({ length: tilesY + 1 }).map((_, i) => (
          <Line
            key={`grid-h-${i}`}
            x1={0}
            y1={i * tileSize}
            x2={fieldWidth * scale}
            y2={i * tileSize}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}
      </G>
    );
  };

  return (
    <View style={[styles.container, containerStyle]} {...fieldPanResponder.panHandlers}>
      <Svg width={calculatedFieldSize} height={calculatedFieldSize} viewBox={`0 0 ${calculatedFieldSize} ${calculatedFieldSize}`}>
        {/* Field background */}
        <Rect
          x={0}
          y={0}
          width={calculatedFieldSize}
          height={calculatedFieldSize}
          fill="#f3f4f6"
          stroke="#9ca3af"
          strokeWidth={2 * scale}
          rx={8 * scale}
        />
        
        {/* Background image (if enabled) - rendered first */}
        {useBackgroundImage && (
          <SvgImage
            href={require('../../assets/field-background.png')}
            x={0}
            y={0}
            width={calculatedFieldSize}
            height={calculatedFieldSize}
            preserveAspectRatio="xMidYMid meet"
            opacity={0.9}
          />
        )}
        
        {/* Grid lines */}
        {renderGrid()}
        
        {/* Route path - behind pins/waypoints */}
        {waypoints.length > 1 && (
          <G>
            {waypoints.map((waypoint, index) => {
              if (index === 0) return null;
              const prev = waypoints[index - 1];
              // index is used above, so keep it
              const start = fieldToScreen(prev.position.x, prev.position.y);
              const end = fieldToScreen(waypoint.position.x, waypoint.position.y);
              return (
                <Line
                  key={`path-${index}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#2563eb"
                  strokeWidth={3 * scale}
                  strokeDasharray={`${5 * scale},${5 * scale}`}
                  opacity={0.6}
                />
              );
            })}
          </G>
        )}
        
        {/* Pins - as SVG circles */}
        <G>
          {pins.map((pin) => {
            const screenPos = fieldToScreen(pin.position.x, pin.position.y);
            const colors = getPinColor(pin.color);
            const isDragging = dragStart?.id === pin.id && dragStart?.type === 'pin';
            
            return (
              <Circle
                key={pin.id}
                cx={screenPos.x}
                cy={screenPos.y}
                r={10 * scale}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={2 * scale}
                opacity={isDragging ? 0.85 : 1}
              />
            );
          })}
        </G>
        
        {/* Waypoints - as SVG circles */}
        <G>
          {waypoints.map((waypoint, _index) => {
            const screenPos = fieldToScreen(waypoint.position.x, waypoint.position.y);
            const isDragging = dragStart?.id === waypoint.id && dragStart?.type === 'waypoint';
            
            return (
              <G key={waypoint.id}>
                <Circle
                  cx={screenPos.x}
                  cy={screenPos.y}
                  r={12 * scale}
                  fill="#2563eb"
                  stroke="#1e40af"
                  strokeWidth={3 * scale}
                  opacity={isDragging ? 0.85 : 1}
                />
                <Circle
                  cx={screenPos.x}
                  cy={screenPos.y}
                  r={8 * scale}
                  fill="#fff"
                  opacity={0.3}
                />
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
});
