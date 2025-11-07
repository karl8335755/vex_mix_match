/**
 * Interactive Field Component with SVG field background
 * Uses field.svg as background with draggable pins and waypoints
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  Text,
  PanResponder,
  PanResponderInstance,
} from 'react-native';
import Svg, { Line, Circle, G, Text as SvgText, Defs, Pattern, Rect, LinearGradient, Stop, Polygon } from 'react-native-svg';
import { FieldPosition, Waypoint, Pin, PinColor, Beam } from '../types/models';
import { positionToLabel } from '../utils/fieldLabels';

interface InteractiveFieldProps {
  waypoints: Waypoint[];
  pins?: Pin[];
  beams?: Beam[];
  selectedPinColor?: PinColor;
  selectedPinId?: string | null;
  selectedBeamId?: string | null;
  isAddingWaypoint?: boolean;
  onWaypointAdd: (position: FieldPosition) => void;
  onWaypointMove: (id: string, position: FieldPosition) => void;
  onWaypointRemove: (id: string) => void;
  onPinAdd?: (position: FieldPosition, color: PinColor) => void;
  onPinMove?: (id: string, position: FieldPosition) => void;
  onPinRemove?: (id: string) => void;
  onPinClick?: (id: string, pin: Pin) => void;
  onPinToggleHighlight?: (id: string) => void;
  onBeamAdd?: (position?: FieldPosition) => void;
  onBeamMove?: (id: string, position: FieldPosition) => void;
  onBeamRemove?: (id: string) => void;
  onBeamToggleHighlight?: (id: string) => void;
  fieldWidth?: number;
  fieldHeight?: number;
  containerStyle?: object;
}

// Screen width available if needed in the future
// const { width: SCREEN_WIDTH } = Dimensions.get('window');

// SVG field dimensions from field.svg
// viewBox: 0 0 1200 900
// Actual field area: starts at (60, 40), size 1080x760 (8 columns × 6 rows)
const SVG_VIEWBOX_WIDTH = 1200;
const SVG_VIEWBOX_HEIGHT = 900;
const SVG_FIELD_X = 60;
const SVG_FIELD_Y = 40;
const SVG_FIELD_WIDTH = 1080;
const SVG_FIELD_HEIGHT = 760;

// Pin stacking constants
const PIN_SNAP_DISTANCE = 2.5; // Field units - pins snap together when within this distance
const PIN_STACK_OFFSET = 3; // SVG pixels - offset for stacked pin visualization

// Inline SVG field content (replaces field.svg file)
const FieldSvgContent = (
  <G transform="translate(60,40)">
    <Defs>
      <Pattern id="dotPattern" width="12" height="12" patternUnits="userSpaceOnUse">
        <Rect width="12" height="12" fill="#ffffff"/>
        <Circle cx="6" cy="6" r="0.9" fill="#d8d8d8"/>
      </Pattern>
      <LinearGradient id="trayGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#fafafa"/>
        <Stop offset="1" stopColor="#efefef"/>
      </LinearGradient>
    </Defs>
    {/* Tray base */}
    <Rect x="0" y="0" width="1080" height="760" rx="6" ry="6"
          fill="#f6f6f6" stroke="#dcdcdc" strokeWidth="6"/>
    <Rect x="36" y="30" width="1008" height="700" rx="3" ry="3"
          fill="url(#trayGrad)" stroke="#e3e3e3" strokeWidth="3"/>
    <Rect x="46" y="40" width="988" height="680" fill="url(#dotPattern)"/>
    
    {/* Grid lines - vertical */}
    <G stroke="#151515" strokeWidth="10" strokeLinecap="square" opacity="0.95">
      <Line x1="107.75" y1="40" x2="107.75" y2="720"/>
      <Line x1="231.25" y1="40" x2="231.25" y2="720"/>
      <Line x1="354.75" y1="40" x2="354.75" y2="720"/>
      <Line x1="478.25" y1="40" x2="478.25" y2="720"/>
      <Line x1="601.75" y1="40" x2="601.75" y2="720"/>
      <Line x1="725.25" y1="40" x2="725.25" y2="720"/>
      <Line x1="848.75" y1="40" x2="848.75" y2="720"/>
      <Line x1="972.25" y1="40" x2="972.25" y2="720"/>
    </G>
    
    {/* Grid lines - horizontal */}
    <G stroke="#151515" strokeWidth="10" strokeLinecap="square" opacity="0.95">
      <Line x1="46" y1="96.6667" x2="1034" y2="96.6667"/>
      <Line x1="46" y1="210" x2="1034" y2="210"/>
      <Line x1="46" y1="323.3333" x2="1034" y2="323.3333"/>
      <Line x1="46" y1="436.6667" x2="1034" y2="436.6667"/>
      <Line x1="46" y1="550" x2="1034" y2="550"/>
      <Line x1="46" y1="663.3333" x2="1034" y2="663.3333"/>
    </G>
    
    {/* Column labels (A-H) - Top */}
    <G fill="#1f2937" fontSize="28" fontWeight="700" textAnchor="middle">
      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((label, index) => {
        const x = 46 + (index + 0.5) * (988 / 8); // Center of each column
        return (
          <SvgText key={`col-top-${label}`} x={x} y={25} fontSize="28" fill="#1f2937" fontWeight="700">
            {label}
          </SvgText>
        );
      })}
    </G>
    
    {/* Column labels (A-H) - Bottom */}
    <G fill="#1f2937" fontSize="28" fontWeight="700" textAnchor="middle">
      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((label, index) => {
        const x = 46 + (index + 0.5) * (988 / 8); // Center of each column
        return (
          <SvgText key={`col-bottom-${label}`} x={x} y={755} fontSize="28" fill="#1f2937" fontWeight="700">
            {label}
          </SvgText>
        );
      })}
    </G>
    
    {/* Row labels (1-6) - Left */}
    <G fill="#1f2937" fontSize="28" fontWeight="700" textAnchor="middle">
      {['1', '2', '3', '4', '5', '6'].map((label, index) => {
        const y = 40 + (index + 0.5) * (680 / 6); // Center of each row
        return (
          <SvgText key={`row-left-${label}`} x={25} y={y + 8} fontSize="28" fill="#1f2937" fontWeight="700">
            {label}
          </SvgText>
        );
      })}
    </G>
    
    {/* Row labels (1-6) - Right */}
    <G fill="#1f2937" fontSize="28" fontWeight="700" textAnchor="middle">
      {['1', '2', '3', '4', '5', '6'].map((label, index) => {
        const y = 40 + (index + 0.5) * (680 / 6); // Center of each row
        return (
          <SvgText key={`row-right-${label}`} x={1055} y={y + 8} fontSize="28" fill="#1f2937" fontWeight="700">
            {label}
          </SvgText>
        );
      })}
    </G>
    
    {/* Intersection dots */}
    <G fill="#111">
      {[107.75, 231.25, 354.75, 478.25, 601.75, 725.25, 848.75, 972.25].map((x) => 
        [96.6667, 210, 323.3333, 436.6667, 550, 663.3333].map((y) => (
          <Rect key={`dot-${x}-${y}`} x={x-9} y={y-9} width="18" height="18" rx="2" ry="2"/>
        ))
      )}
    </G>
    
    {/* Red line on left edge between rows 3 and 4 */}
    <Line
      x1="46"
      y1="380"
      x2="107.75"
      y2="380"
      stroke="#ff0041"
      strokeWidth="10"
    />
    
    {/* Blue line on right edge between rows 3 and 4 */}
    <Line
      x1="972.25"
      y1="380"
      x2="1034"
      y2="380"
      stroke="#00bcff"
      strokeWidth="10"
    />
    
    {/* Red triangle at bottom-left corner (1.2x scale, moved 5 units closer to corner) */}
    <Polygon
      points={`41,725 115.1,725 41,656.996`}
      fill="#ff0041"
    />
    
    {/* Cyan triangle at bottom-right corner (1.2x scale, moved 5 units closer to corner) */}
    <Polygon
      points={`1039,730 964.9,730 1039,661.996`}
      fill="#00bcff"
    />
    
    {/* Small blue square at top-left corner */}
    <Rect
      x="39"
      y="33"
      width="57.6"
      height="57.6"
      fill="#00bcff"
      rx="2"
      ry="2"
    />
    
    {/* Small red square at top-right corner */}
    <Rect
      x="985"
      y="33"
      width="57.6"
      height="57.6"
      fill="#ff0041"
      rx="2"
      ry="2"
    />
    
    {/* Yellow rectangle in center spanning 1.1 squares */}
    <Rect
      x="472.075"
      y="317.67"
      width="135.85"
      height="124.66"
      fill="#ffd112"
      rx="2"
      ry="2"
    />
    
    {/* Red slanted pin holder at C1 (top edge, column C) */}
    <G transform="translate(339.75, 34)">
      <Polygon
        points="0,0 30,0 35,15 5,15"
        fill="#ff0041"
        stroke="#dc2626"
        strokeWidth="2"
      />
      {/* Slanted holder detail */}
      <Rect
        x="8"
        y="5"
        width="14"
        height="8"
        fill="#dc2626"
        rx="1"
      />
    </G>
    
    {/* Blue slanted pin holder at F1 (top edge, column F) */}
    <G transform="translate(710.25, 34)">
      <Polygon
        points="0,0 30,0 35,15 5,15"
        fill="#00bcff"
        stroke="#0284c7"
        strokeWidth="2"
      />
      {/* Slanted holder detail */}
      <Rect
        x="8"
        y="5"
        width="14"
        height="8"
        fill="#0284c7"
        rx="1"
      />
    </G>
    
    {/* Blue stand at D6 (bottom edge, column D) */}
    <G transform="translate(468.25, 718)">
      <Polygon
        points="0,0 30,0 35,15 5,15"
        fill="#00bcff"
        stroke="#0284c7"
        strokeWidth="2"
      />
      {/* Slanted holder detail */}
      <Rect
        x="8"
        y="5"
        width="14"
        height="8"
        fill="#0284c7"
        rx="1"
      />
    </G>
    
    {/* Red stand at E6 (bottom edge, column E) */}
    <G transform="translate(591.75, 718)">
      <Polygon
        points="0,0 30,0 35,15 5,15"
        fill="#ff0041"
        stroke="#dc2626"
        strokeWidth="2"
      />
      {/* Slanted holder detail */}
      <Rect
        x="8"
        y="5"
        width="14"
        height="8"
        fill="#dc2626"
        rx="1"
      />
    </G>
  </G>
);

export const InteractiveField: React.FC<InteractiveFieldProps> = ({
  waypoints,
  pins = [],
  beams = [],
  selectedPinColor: _selectedPinColor = PinColor.RED,
  selectedPinId = null,
  selectedBeamId = null,
  isAddingWaypoint = false,
  onWaypointAdd,
  onWaypointMove,
  onWaypointRemove: _onWaypointRemove,
  onPinAdd: _onPinAdd,
  onPinMove,
  onPinRemove,
  onPinClick,
  onPinToggleHighlight: _onPinToggleHighlight,
  onBeamAdd: _onBeamAdd,
  onBeamMove,
  onBeamRemove,
  onBeamToggleHighlight: _onBeamToggleHighlight,
  fieldWidth = 48,
  fieldHeight = 48,
  containerStyle,
}) => {
  const [dragStart, setDragStart] = useState<{ x: number; y: number; id: string; type: 'pin' | 'waypoint' | 'beam' } | null>(null);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [dragState, setDragState] = useState<{ x: number; y: number; type: string } | null>(null);
  const [tapStart, setTapStart] = useState<{ x: number; y: number; id: string; type: 'pin' | 'waypoint' | 'beam' } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastClickTime, setLastClickTime] = useState<{ time: number; id: string | null }>({ time: 0, id: null });
  const containerRef = useRef<View>(null);

  // Group pins into stacks only if they're at the exact same position (after being dragged together)
  // Also considers beam holes as part of stacks
  const groupPinsIntoStacks = useCallback((): Map<string, Pin[]> => {
    const stacks = new Map<string, Pin[]>();
    const processed = new Set<string>();
    
    // Only stack pins that are at the exact same position (within a very small tolerance)
    const POSITION_TOLERANCE = 0.1; // Very small tolerance for "exact same" position
    
    for (const pin of pins) {
      if (processed.has(pin.id)) continue;
      
      // Find all pins at the exact same position
      const stack: Pin[] = [pin];
      processed.add(pin.id);
      
      for (const otherPin of pins) {
        if (processed.has(otherPin.id)) continue;
        
        const dx = Math.abs(pin.position.x - otherPin.position.x);
        const dy = Math.abs(pin.position.y - otherPin.position.y);
        
        // Only stack if positions are exactly the same (within tolerance)
        if (dx < POSITION_TOLERANCE && dy < POSITION_TOLERANCE) {
          stack.push(otherPin);
          processed.add(otherPin.id);
        }
      }
      
      // Only create a stack if there are multiple pins at the same position
      if (stack.length > 1) {
        stacks.set(stack[0].id, stack);
      }
    }
    
    return stacks;
  }, [pins]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => {
      subscription?.remove();
      // Clean up long press timer on unmount
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  // Check if device is in landscape mode
  const isLandscape = dimensions.width > dimensions.height;
  
  // Calculate display size - use 95% of viewport
  const containerWidth = (containerStyle as any)?.width;
  let calculatedFieldSize: number;
  let svgDisplayWidth: number;
  let svgDisplayHeight: number;
  
  const svgAspectRatio = SVG_VIEWBOX_WIDTH / SVG_VIEWBOX_HEIGHT;
  
  if (isLandscape) {
    // In landscape, make field 20% wider by using full viewport width
    const maxHeight = dimensions.height * 1.0;
    // Use full viewport width (this maximizes width)
    svgDisplayWidth = dimensions.width * 1.0; // Full width
    svgDisplayHeight = svgDisplayWidth / svgAspectRatio;
    
    // If height exceeds, scale to fit
    if (svgDisplayHeight > maxHeight) {
      svgDisplayHeight = maxHeight;
      svgDisplayWidth = maxHeight * svgAspectRatio;
    }
    
    calculatedFieldSize = svgDisplayWidth;
  } else {
    // In portrait, use 95% of viewport width
    const maxWidth = dimensions.width * 0.95;
    calculatedFieldSize = containerWidth ? Math.min(containerWidth - 16, maxWidth) : maxWidth;
    svgDisplayWidth = calculatedFieldSize;
    svgDisplayHeight = calculatedFieldSize / svgAspectRatio;
  }
  
  // Convert our field coordinates (0-48) to SVG coordinates
  const fieldToSvg = useCallback((fieldX: number, fieldY: number) => {
    // Validate input values
    const validX = isNaN(fieldX) || fieldX === undefined ? 0 : fieldX;
    const validY = isNaN(fieldY) || fieldY === undefined ? 0 : fieldY;
    
    const svgX = SVG_FIELD_X + (validX / fieldWidth) * SVG_FIELD_WIDTH;
    const svgY = SVG_FIELD_Y + (validY / fieldHeight) * SVG_FIELD_HEIGHT;
    return { x: svgX, y: svgY };
  }, [fieldWidth, fieldHeight]);

  // Convert SVG coordinates to our field coordinates
  const svgToField = useCallback((svgX: number, svgY: number): FieldPosition => {
    const fieldX = ((svgX - SVG_FIELD_X) / SVG_FIELD_WIDTH) * fieldWidth;
    const fieldY = ((svgY - SVG_FIELD_Y) / SVG_FIELD_HEIGHT) * fieldHeight;
    return {
      x: Math.max(0, Math.min(fieldWidth, fieldX)),
      y: Math.max(0, Math.min(fieldHeight, fieldY)),
      rotation: 0,
    };
  }, [fieldWidth, fieldHeight]);

  // Get beam hole positions in field coordinates
  const getBeamHolePositions = useCallback((beam: Beam): FieldPosition[] => {
    const holeSpacing = 23.4375; // SVG units - spacing between holes
    const beamCenterSvg = fieldToSvg(beam.position.x, beam.position.y);
    const rotation = beam.rotation || 0;
    const rotationRad = (rotation * Math.PI) / 180;
    
    // Beam holes in local coordinates (relative to beam center)
    const localHoles = [
      { x: -holeSpacing, y: 0 }, // Left hole
      { x: 0, y: 0 },             // Center hole
      { x: holeSpacing, y: 0 },   // Right hole
    ];
    
    return localHoles.map(localHole => {
      // Rotate around beam center
      const rotatedX = localHole.x * Math.cos(rotationRad) - localHole.y * Math.sin(rotationRad);
      const rotatedY = localHole.x * Math.sin(rotationRad) + localHole.y * Math.cos(rotationRad);
      
      // Convert from SVG to field coordinates
      const svgX = beamCenterSvg.x + rotatedX;
      const svgY = beamCenterSvg.y + rotatedY;
      
      const fieldX = ((svgX - SVG_FIELD_X) / SVG_FIELD_WIDTH) * fieldWidth;
      const fieldY = ((svgY - SVG_FIELD_Y) / SVG_FIELD_HEIGHT) * fieldHeight;
      
      return { x: fieldX, y: fieldY, rotation: 0 };
    });
  }, [fieldToSvg, fieldWidth, fieldHeight]);

  // Find nearby pins or beam holes for snapping
  const findNearbyTarget = useCallback((position: FieldPosition, excludeId?: string): { pin?: Pin; hole?: { beam: Beam; index: number; position: FieldPosition } } | null => {
    const POSITION_TOLERANCE = 0.1;
    const HOLE_SNAP_DISTANCE = 2.5; // Field units for snapping to beam holes
    
    // First check for nearby pins
    for (const pin of pins) {
      if (pin.id === excludeId) continue;
      
      const dx = Math.abs(pin.position.x - position.x);
      const dy = Math.abs(pin.position.y - position.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < PIN_SNAP_DISTANCE) {
        // Check if this pin is already in a full stack (3 pins)
        let stackCount = 0;
        
        for (const p of pins) {
          const stackDx = Math.abs(p.position.x - pin.position.x);
          const stackDy = Math.abs(p.position.y - pin.position.y);
          
          if (stackDx < POSITION_TOLERANCE && stackDy < POSITION_TOLERANCE) {
            stackCount++;
          }
        }
        
        // Only allow snapping if stack has less than 3 pins
        if (stackCount < 3) {
          return { pin };
        }
      }
    }
    
    // Then check for nearby beam holes
    if (beams) {
      for (const beam of beams) {
        const holePositions = getBeamHolePositions(beam);
        
        for (let i = 0; i < holePositions.length; i++) {
          const holePos = holePositions[i];
          const dx = Math.abs(holePos.x - position.x);
          const dy = Math.abs(holePos.y - position.y);
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < HOLE_SNAP_DISTANCE) {
            // Check if this hole already has a pin
            let holePinCount = 0;
            for (const pin of pins) {
              const holeDx = Math.abs(pin.position.x - holePos.x);
              const holeDy = Math.abs(pin.position.y - holePos.y);
              
              if (holeDx < POSITION_TOLERANCE && holeDy < POSITION_TOLERANCE) {
                holePinCount++;
              }
            }
            
            // Each hole can only hold one pin
            if (holePinCount === 0) {
              return { hole: { beam, index: i, position: holePos } };
            }
          }
        }
      }
    }
    
    return null;
  }, [pins, beams, getBeamHolePositions]);

  // Convert screen coordinates to SVG coordinates
  const screenToSvg = useCallback((screenX: number, screenY: number) => {
    // Scale screen coordinates to SVG viewBox
    const svgX = (screenX / svgDisplayWidth) * SVG_VIEWBOX_WIDTH;
    const svgY = (screenY / svgDisplayHeight) * SVG_VIEWBOX_HEIGHT;
    return { x: svgX, y: svgY };
  }, [svgDisplayWidth, svgDisplayHeight]);

  // Helper function to extract coordinates from events (works on web and native)
  const getCoordinatesFromEvent = useCallback((evt: any): { x: number; y: number } | null => {
    if (Platform.OS === 'web') {
      // For web, find the SVG element or its container
      try {
        const target = evt.nativeEvent.target as HTMLElement;
        const svgElement = target?.closest('svg');
        if (!svgElement) return null;
        
        const rect = svgElement.getBoundingClientRect();
        if (!rect) return null;
        
        return {
          x: evt.nativeEvent.pageX - rect.left,
          y: evt.nativeEvent.pageY - rect.top,
        };
      } catch (error) {
        console.error('Error getting coordinates:', error);
        return null;
      }
    } else {
      // Native: use locationX and locationY relative to the view
      const locationX = evt.nativeEvent.locationX;
      const locationY = evt.nativeEvent.locationY;
      if (locationX === undefined || locationY === undefined) return null;
      return { x: locationX, y: locationY };
    }
  }, []);

  // Detect element at position
  const detectElementAtPosition = useCallback((x: number, y: number) => {
    const svgCoords = screenToSvg(x, y);
    
    // Check beams first (larger)
    for (const beam of beams) {
      const beamSvg = fieldToSvg(beam.position.x, beam.position.y);
      const beamHalfWidth = 93.75 / 2 + 5;
      const beamHalfHeight = 37.5 / 2 + 5;
      const dx = Math.abs(svgCoords.x - beamSvg.x);
      const dy = Math.abs(svgCoords.y - beamSvg.y);
      
      if (dx < beamHalfWidth && dy < beamHalfHeight && onBeamMove) {
        return { type: 'beam' as const, id: beam.id, element: beam };
      }
    }
    
    // Check pins
    for (const pin of pins) {
      const pinSvg = fieldToSvg(pin.position.x, pin.position.y);
      const dx = Math.abs(svgCoords.x - pinSvg.x);
      const dy = Math.abs(svgCoords.y - pinSvg.y);
      
      if (dx < 15 && dy < 15 && onPinMove) {
        return { type: 'pin' as const, id: pin.id, element: pin };
      }
    }
    
    // Check waypoints
    for (const waypoint of waypoints) {
      const wpSvg = fieldToSvg(waypoint.position.x, waypoint.position.y);
      const dx = Math.abs(svgCoords.x - wpSvg.x);
      const dy = Math.abs(svgCoords.y - wpSvg.y);
      if (dx < 15 && dy < 15) {
        return { type: 'waypoint' as const, id: waypoint.id, element: waypoint };
      }
    }
    
    return null;
  }, [beams, pins, waypoints, onPinMove, onBeamMove, screenToSvg, fieldToSvg]);

  // PanResponder for all platforms
  const panResponder = useRef<PanResponderInstance | null>(null);
  
  useEffect(() => {
    panResponder.current = PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const coords = getCoordinatesFromEvent(evt);
        if (!coords) return false;
        
        const detected = detectElementAtPosition(coords.x, coords.y);
        if (detected) {
          const debugMsg = `Detected ${detected.type} ${detected.id} at (${coords.x.toFixed(1)}, ${coords.y.toFixed(1)})`;
          setDebugInfo(debugMsg);
          console.log('🔍 [DEBUG]', debugMsg);
          return true;
        }
        // Also respond to empty space clicks to add waypoints
        return true;
      },
      onMoveShouldSetPanResponder: () => {
        // Only respond to moves if we're already dragging
        return !!dragStart;
      },
      onPanResponderGrant: (evt) => {
        const coords = getCoordinatesFromEvent(evt);
        if (!coords) return;
        
        const detected = detectElementAtPosition(coords.x, coords.y);
        if (detected) {
          // Store tap start for click detection
          setTapStart({ x: coords.x, y: coords.y, id: detected.id, type: detected.type });
          setDragStart({ x: coords.x, y: coords.y, id: detected.id, type: detected.type });
          const pos = detected.element.position;
          setDragState({ x: pos.x, y: pos.y, type: detected.type });
          const debugMsg = `Touching ${detected.type} ${detected.id} at screen (${coords.x.toFixed(1)}, ${coords.y.toFixed(1)})`;
          setDebugInfo(debugMsg);
          console.log('👆 [DEBUG]', debugMsg);
          
          // Set up long press timer for pins (native only)
          if (detected.type === 'pin' && onPinRemove && Platform.OS !== 'web') {
            const timer = setTimeout(() => {
              console.log('🗑️ Long-press delete pin:', detected.id);
              onPinRemove(detected.id);
              setDebugInfo(`Deleted pin ${detected.id}`);
              setLongPressTimer(null);
            }, 500); // 500ms long press
            setLongPressTimer(timer);
          } else if (detected.type === 'beam' && onBeamRemove && Platform.OS !== 'web') {
            const timer = setTimeout(() => {
              console.log('🗑️ Long-press delete beam:', detected.id);
              onBeamRemove(detected.id);
              setDebugInfo(`Deleted beam ${detected.id}`);
              setLongPressTimer(null);
            }, 500); // 500ms long press
            setLongPressTimer(timer);
          }
        } else {
          // Empty space - prepare for potential waypoint addition
          setTapStart({ x: coords.x, y: coords.y, id: '', type: 'waypoint' });
          setDragStart({ x: coords.x, y: coords.y, id: '', type: 'waypoint' });
          const svgCoords = screenToSvg(coords.x, coords.y);
          const fieldPos = svgToField(svgCoords.x, svgCoords.y);
          setDragState({ x: fieldPos.x, y: fieldPos.y, type: 'waypoint' });
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!dragStart) return;
        
        // If moved more than 5 pixels, treat as drag and cancel long press
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          setTapStart(null); // Clear tap start if dragging
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
          }
        }
        
        const coords = getCoordinatesFromEvent(evt);
        if (!coords) return;
        
        const svgCoords = screenToSvg(coords.x, coords.y);
        let fieldPos = svgToField(svgCoords.x, svgCoords.y);
        
        // Snap pin to nearby pin or beam hole if close enough and stack not full
        if (dragStart.type === 'pin') {
          const nearbyTarget = findNearbyTarget(fieldPos, dragStart.id);
          if (nearbyTarget) {
            if (nearbyTarget.pin) {
              // Snap to the nearby pin's position
              fieldPos = { ...nearbyTarget.pin.position };
              setDebugInfo(`Snapped to pin ${nearbyTarget.pin.id} at (${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`);
            } else if (nearbyTarget.hole) {
              // Snap to the beam hole position
              fieldPos = { ...nearbyTarget.hole.position };
              setDebugInfo(`Snapped to beam ${nearbyTarget.hole.beam.id} hole ${nearbyTarget.hole.index} at (${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`);
            }
          }
        }
        
        setDragState({ x: fieldPos.x, y: fieldPos.y, type: dragStart.type });
        const dragMsg = `${dragStart.type} ${dragStart.id}: screen(${coords.x.toFixed(1)}, ${coords.y.toFixed(1)}) -> field(${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`;
        setDebugInfo(dragMsg);
        if (dragStart.type === 'beam') {
          console.log('🔧 [DEBUG] Beam drag:', dragMsg);
        }
        
        if (dragStart.type === 'pin' && onPinMove) {
          onPinMove(dragStart.id, fieldPos);
        } else if (dragStart.type === 'waypoint') {
          onWaypointMove(dragStart.id, fieldPos);
        } else if (dragStart.type === 'beam' && onBeamMove) {
          onBeamMove(dragStart.id, fieldPos);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        // Cancel long press timer if it exists
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          setLongPressTimer(null);
        }
        
        // Check if this was a tap (not a drag)
        if (tapStart && Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          // It was a tap - check for double-click on pins
          if (tapStart.type === 'pin' && tapStart.id) {
            const currentTime = Date.now();
            const timeSinceLastClick = currentTime - lastClickTime.time;
            const isDoubleClick = timeSinceLastClick < 300 && lastClickTime.id === tapStart.id;
            
            if (isDoubleClick && onPinRemove) {
              // Double-click detected - remove pin
              console.log('🗑️ Double-click remove pin (native):', tapStart.id);
              onPinRemove(tapStart.id);
              setDebugInfo(`Removed pin ${tapStart.id}`);
              setLastClickTime({ time: 0, id: null });
            } else {
              // Single click - trigger normal click handler
              if (onPinClick) {
                const pin = pins.find(p => p.id === tapStart.id);
                if (pin) {
                  onPinClick(tapStart.id, pin);
                  setDebugInfo(`Clicked pin ${tapStart.id}`);
                }
              }
              // Store this click for potential double-click detection
              setLastClickTime({ time: currentTime, id: tapStart.id });
            }
          } else if (tapStart.type === 'waypoint' && !tapStart.id && onWaypointAdd && isAddingWaypoint) {
            // Empty space tap - add waypoint only if in waypoint addition mode
            const svgCoords = screenToSvg(tapStart.x, tapStart.y);
            const fieldPos = svgToField(svgCoords.x, svgCoords.y);
            onWaypointAdd(fieldPos);
            setDebugInfo(`Added waypoint at (${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`);
          }
        }
        
        if (dragStart) {
          setDebugInfo(`Drag completed: ${dragStart.type} ${dragStart.id}`);
        }
        setDragStart(null);
        setDragState(null);
        setTapStart(null);
      },
    });
  }, [beams, pins, waypoints, onPinMove, onWaypointMove, onBeamMove, onPinClick, onPinRemove, onWaypointAdd, isAddingWaypoint, dragStart, tapStart, detectElementAtPosition, screenToSvg, svgToField, getCoordinatesFromEvent, lastClickTime, longPressTimer, findNearbyTarget]);

  // Web-specific mouse/touch handlers (more reliable than PanResponder on web)
  // Works for both desktop (mouse) and mobile browsers (touch)
  const handleWebMouseDown = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    
    const svgElement = e.currentTarget?.querySelector('svg');
    if (!svgElement) return;
    
    const rect = svgElement.getBoundingClientRect();
    // Support both mouse and touch events
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
    
    if (clientX === undefined || clientY === undefined) return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const detected = detectElementAtPosition(x, y);
    if (detected) {
      setTapStart({ x, y, id: detected.id, type: detected.type });
      setDragStart({ x, y, id: detected.id, type: detected.type });
      const pos = detected.element.position;
      setDragState({ x: pos.x, y: pos.y, type: detected.type });
      setDebugInfo(`Touching ${detected.type} ${detected.id} at screen (${x.toFixed(1)}, ${y.toFixed(1)})`);
      // Only preventDefault if event is cancelable (not passive)
      if (e.cancelable !== false) {
        e.preventDefault();
      }
    } else {
      // Empty space - prepare for potential waypoint addition
      setTapStart({ x, y, id: '', type: 'waypoint' });
      setDragStart({ x, y, id: '', type: 'waypoint' });
      const svgCoords = screenToSvg(x, y);
      const fieldPos = svgToField(svgCoords.x, svgCoords.y);
      setDragState({ x: fieldPos.x, y: fieldPos.y, type: 'waypoint' });
      // Only preventDefault if event is cancelable (not passive)
      if (e.cancelable !== false) {
        e.preventDefault();
      }
    }
  }, [detectElementAtPosition, screenToSvg, svgToField]);

  const handleWebMouseMove = useCallback((e: any) => {
    if (Platform.OS !== 'web' || !dragStart) return;
    
    const svgElement = e.currentTarget?.querySelector('svg');
    if (!svgElement) return;
    
    const rect = svgElement.getBoundingClientRect();
    // Support both mouse and touch events
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
    
    if (clientX === undefined || clientY === undefined) return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // If moved more than 5 pixels, treat as drag
    const dx = Math.abs(x - dragStart.x);
    const dy = Math.abs(y - dragStart.y);
    if (dx > 5 || dy > 5) {
      setTapStart(null);
    }
    
    const svgCoords = screenToSvg(x, y);
    let fieldPos = svgToField(svgCoords.x, svgCoords.y);
    
    // Snap pin to nearby pin or beam hole if close enough and stack not full
    if (dragStart.type === 'pin') {
      const nearbyTarget = findNearbyTarget(fieldPos, dragStart.id);
      if (nearbyTarget) {
        if (nearbyTarget.pin) {
          // Snap to the nearby pin's position
          fieldPos = { ...nearbyTarget.pin.position };
          setDebugInfo(`Snapped to pin ${nearbyTarget.pin.id} at (${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`);
        } else if (nearbyTarget.hole) {
          // Snap to the beam hole position
          fieldPos = { ...nearbyTarget.hole.position };
          setDebugInfo(`Snapped to beam ${nearbyTarget.hole.beam.id} hole ${nearbyTarget.hole.index} at (${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`);
        }
      }
    }
    
    setDragState({ x: fieldPos.x, y: fieldPos.y, type: dragStart.type });
    const dragMsg = `${dragStart.type} ${dragStart.id}: screen(${x.toFixed(1)}, ${y.toFixed(1)}) -> field(${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`;
    setDebugInfo(dragMsg);
    if (dragStart.type === 'beam') {
      console.log('🔧 [DEBUG] Beam drag (web):', dragMsg);
    }
    
    if (dragStart.type === 'pin' && onPinMove) {
      onPinMove(dragStart.id, fieldPos);
    } else if (dragStart.type === 'waypoint') {
      onWaypointMove(dragStart.id, fieldPos);
    } else if (dragStart.type === 'beam' && onBeamMove) {
      onBeamMove(dragStart.id, fieldPos);
    }
    
    // Only preventDefault if event is cancelable (not passive)
    if (e.cancelable !== false) {
      e.preventDefault();
    }
  }, [dragStart, screenToSvg, svgToField, onPinMove, onWaypointMove, onBeamMove, findNearbyTarget]);

  const handleWebMouseUp = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    
    if (tapStart && dragStart) {
      // Check if this was a tap (not a drag)
      const dx = Math.abs(dragStart.x - tapStart.x);
      const dy = Math.abs(dragStart.y - tapStart.y);
      
      if (dx < 5 && dy < 5) {
        // It was a tap - check for double-click on pins
        if (tapStart.type === 'pin' && tapStart.id) {
          const currentTime = Date.now();
          const timeSinceLastClick = currentTime - lastClickTime.time;
          const isDoubleClick = timeSinceLastClick < 300 && lastClickTime.id === tapStart.id;
          
          if (isDoubleClick && onPinRemove) {
            // Double-click detected - remove pin
            console.log('🗑️ Double-click remove pin:', tapStart.id);
            onPinRemove(tapStart.id);
            setDebugInfo(`Removed pin ${tapStart.id}`);
            setLastClickTime({ time: 0, id: null });
          } else {
            // Single click - trigger normal click handler
            if (onPinClick) {
              const pin = pins.find(p => p.id === tapStart.id);
              if (pin) {
                onPinClick(tapStart.id, pin);
                setDebugInfo(`Clicked pin ${tapStart.id}`);
              }
            }
            // Store this click for potential double-click detection
            setLastClickTime({ time: currentTime, id: tapStart.id });
          }
        } else if (tapStart.type === 'waypoint' && !tapStart.id && onWaypointAdd && isAddingWaypoint) {
          // Empty space tap - add waypoint only if in waypoint addition mode
          const svgElement = e.currentTarget?.querySelector('svg');
          if (svgElement) {
            const rect = svgElement.getBoundingClientRect();
            const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX);
            const clientY = e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY);
            
            if (clientX !== undefined && clientY !== undefined) {
              const x = clientX - rect.left;
              const y = clientY - rect.top;
              const svgCoords = screenToSvg(x, y);
              const fieldPos = svgToField(svgCoords.x, svgCoords.y);
              onWaypointAdd(fieldPos);
              setDebugInfo(`Added waypoint at (${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`);
            }
          }
        }
      }
    }
    
    if (dragStart) {
      setDebugInfo(`Drag completed: ${dragStart.type} ${dragStart.id}`);
    }
    setDragStart(null);
    setDragState(null);
    setTapStart(null);
  }, [tapStart, dragStart, onPinClick, onPinRemove, onWaypointAdd, isAddingWaypoint, pins, screenToSvg, svgToField, lastClickTime, findNearbyTarget]);


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

  return (
    <View 
      ref={containerRef}
      style={[styles.container, containerStyle]}
      {...(Platform.OS === 'web' ? {
        onMouseDown: handleWebMouseDown,
        onMouseMove: handleWebMouseMove,
        onMouseUp: handleWebMouseUp,
        onMouseLeave: handleWebMouseUp,
        // Touch events for mobile browsers
        onTouchStart: handleWebMouseDown,
        onTouchMove: handleWebMouseMove,
        onTouchEnd: handleWebMouseUp,
      } : (panResponder.current ? panResponder.current.panHandlers : {}))}
    >
        {/* Debug Info Display - Hidden but kept for future debugging */}
        {false && debugInfo && dragState && (() => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const state = dragState!; // Non-null assertion - code is disabled anyway
          return (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>{debugInfo}</Text>
              <Text style={styles.debugText}>
                Position: ({state.x.toFixed(1)}, {state.y.toFixed(1)}) | {positionToLabel({ x: state.x, y: state.y })}
              </Text>
            </View>
          );
        })()}
        
        <Svg
          width={svgDisplayWidth}
          height={svgDisplayHeight}
          viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          style={styles.svg}
        >
        {/* SVG Field Background - inline SVG content */}
        {FieldSvgContent}
        
        {/* Invisible interaction layer - covers entire field for better touch detection */}
        <Rect
          x={SVG_FIELD_X}
          y={SVG_FIELD_Y}
          width={SVG_FIELD_WIDTH}
          height={SVG_FIELD_HEIGHT}
          fill="transparent"
          stroke="none"
        />
        
        {/* Route path - rendered behind pins/waypoints */}
        {waypoints.length > 1 ? (
          <G>
            {waypoints.map((waypoint, index) => {
              if (index === 0) return null;
              const prev = waypoints[index - 1];
              const start = fieldToSvg(prev.position.x, prev.position.y);
              const end = fieldToSvg(waypoint.position.x, waypoint.position.y);
              
              // Calculate angle for arrow
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const angleRad = Math.atan2(dy, dx);
              
              // Arrow dimensions
              const arrowSize = 10;
              const arrowOffset = 18; // Offset from end point to avoid overlap with waypoint circle
              
              // Calculate arrowhead position (slightly before the endpoint)
              const arrowX = end.x - Math.cos(angleRad) * arrowOffset;
              const arrowY = end.y - Math.sin(angleRad) * arrowOffset;
              
              // Arrow tip points toward the end waypoint
              // Back points are behind the tip (toward the start)
              const backX = arrowX - Math.cos(angleRad) * arrowSize;
              const backY = arrowY - Math.sin(angleRad) * arrowSize;
              
              // Arrowhead wing points (30 degrees from center line)
              const wingAngle1 = angleRad + (150 * Math.PI / 180);
              const wingAngle2 = angleRad - (150 * Math.PI / 180);
              
              const arrowPoint1 = {
                x: backX + Math.cos(wingAngle1) * arrowSize,
                y: backY + Math.sin(wingAngle1) * arrowSize,
              };
              const arrowPoint2 = {
                x: backX + Math.cos(wingAngle2) * arrowSize,
                y: backY + Math.sin(wingAngle2) * arrowSize,
              };
              
              return (
                <G key={`path-${index}`}>
                  {/* Subtle line connecting waypoints */}
                  <Line
                    x1={start.x}
                    y1={start.y}
                    x2={arrowX}
                    y2={arrowY}
                    stroke="#000000"
                    strokeWidth={2}
                    opacity={0.4}
                  />
                  {/* Single arrowhead at the tip */}
                  <Polygon
                    points={`${arrowX},${arrowY} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`}
                    fill="#000000"
                    opacity={0.6}
                  />
                </G>
              );
            })}
          </G>
        ) : null}
        
        {/* Waypoints - rendered before pins/beams */}
        <G>
          {waypoints.map((waypoint, index) => {
            const svgPos = fieldToSvg(waypoint.position.x, waypoint.position.y);
            const isDragging = dragStart?.id === waypoint.id && dragStart?.type === 'waypoint';
            
            return (
              <G key={waypoint.id}>
                <Circle
                  cx={svgPos.x}
                  cy={svgPos.y}
                  r={16}
                  fill="#ffffff"
                  stroke="#000000"
                  strokeWidth={2}
                  opacity={isDragging ? 0.85 : 1}
                />
                <SvgText
                  x={svgPos.x}
                  y={svgPos.y + 4}
                  fontSize={14}
                  fontWeight="bold"
                  fill="#000000"
                  textAnchor="middle"
                  opacity={isDragging ? 0.85 : 1}
                >
                  {index + 1}
                </SvgText>
              </G>
            );
          })}
        </G>
        
        {/* Pins - rendered on top with stacking (only for pins at exact same position) */}
        <G>
          {(() => {
            const stacks = groupPinsIntoStacks();
            const renderedPins = new Set<string>();
            const pinElements: React.ReactNode[] = [];
            
            // Render stacked pins (only pins that were dragged together)
            stacks.forEach((stackPins, _stackKey) => {
              const basePin = stackPins[0];
              const svgPos = fieldToSvg(basePin.position.x, basePin.position.y);
              
              // Render stacked pins with offset to show all colors
              stackPins.forEach((pin, index) => {
                renderedPins.add(pin.id);
                const colors = getPinColor(pin.color);
                const isDragging = dragStart?.id === pin.id && dragStart?.type === 'pin';
                const isSelected = selectedPinId === pin.id;
                
                // Offset stacked pins slightly to show all colors
                const offsetX = (index - (stackPins.length - 1) / 2) * PIN_STACK_OFFSET;
                const offsetY = (index - (stackPins.length - 1) / 2) * PIN_STACK_OFFSET;
                
                pinElements.push(
                  <G key={pin.id}>
                    <Circle
                      cx={svgPos.x + offsetX}
                      cy={svgPos.y + offsetY}
                      r={15}
                      fill={colors.fill}
                      stroke={isSelected ? '#000000' : colors.stroke}
                      strokeWidth={isSelected ? 5 : 3}
                      opacity={isDragging ? 0.85 : 0.9}
                    />
                    {Platform.OS === 'web' ? (
                      <Rect
                        x={svgPos.x - 15 + offsetX}
                        y={svgPos.y - 15 + offsetY}
                        width={30}
                        height={30}
                        fill="transparent"
                      />
                    ) : null}
                  </G>
                );
              });
            });
            
            // Render all pins not in stacks (normal rendering)
            pins.forEach(pin => {
              if (!renderedPins.has(pin.id)) {
                const svgPos = fieldToSvg(pin.position.x, pin.position.y);
                const colors = getPinColor(pin.color);
                const isDragging = dragStart?.id === pin.id && dragStart?.type === 'pin';
                const isSelected = selectedPinId === pin.id;
                
                pinElements.push(
                  <G key={pin.id}>
                    <Circle
                      cx={svgPos.x}
                      cy={svgPos.y}
                      r={15}
                      fill={colors.fill}
                      stroke={isSelected ? '#000000' : colors.stroke}
                      strokeWidth={isSelected ? 5 : 3}
                      opacity={isDragging ? 0.85 : 1}
                    />
                    {Platform.OS === 'web' ? (
                      <Rect
                        x={svgPos.x - 15}
                        y={svgPos.y - 15}
                        width={30}
                        height={30}
                        fill="transparent"
                      />
                    ) : null}
                  </G>
                );
              }
            });
            
            return pinElements;
          })()}
        </G>
        
        {/* Beams - rendered on top of everything */}
        <G>
          {beams.map((beam) => {
            const svgPos = fieldToSvg(beam.position.x, beam.position.y);
            const isDragging = dragStart?.id === beam.id && dragStart?.type === 'beam';
            const isSelected = selectedBeamId === beam.id;
            const rotation = beam.rotation || 0;
            
            // Validate SVG position values
            const validX = isNaN(svgPos.x) || !isFinite(svgPos.x) ? SVG_FIELD_X + SVG_FIELD_WIDTH / 2 : svgPos.x;
            const validY = isNaN(svgPos.y) || !isFinite(svgPos.y) ? SVG_FIELD_Y + SVG_FIELD_HEIGHT / 2 : svgPos.y;
            const validRotation = isNaN(rotation) || !isFinite(rotation) ? 0 : rotation;
            
            return (
              <G 
                key={beam.id}
                transform={`translate(${validX}, ${validY}) rotate(${validRotation})`}
                opacity={isDragging ? 0.85 : 1}
              >
                {/* Main beam body - rounded ends like half circles */}
                <Rect
                  x={-93.75 / 2}
                  y={-37.5 / 2}
                  width="93.75"
                  height="37.5"
                  fill="#6c7173"
                  rx="18.75"
                  ry="18.75"
                  stroke={isSelected ? '#000000' : 'none'}
                  strokeWidth={isSelected ? 5 : 0}
                />
                {/* Holes along the beam - centered (3 holes, 0.75x spacing) */}
                {[0, 1, 2].map((i) => {
                  const spacing = 23.4375; // 18.75 * 1.25
                  return (
                    <Circle
                      key={`beam-hole-${i}`}
                      cx={(i - 1) * spacing}
                      cy={0}
                      r="7.5"
                      fill="#ffffff"
                      stroke="#6c7173"
                      strokeWidth="1.875"
                    />
                  );
                })}
                {Platform.OS === 'web' ? (
                  <Rect
                    x={-93.75 / 2}
                    y={-37.5 / 2}
                    width="93.75"
                    height="37.5"
                    fill="transparent"
                  />
                ) : null}
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
    overflow: 'visible', // Allow overflow for wider field
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    } : {}),
  },
  svg: {
    // SVG styles
  },
  debugInfo: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 4,
    zIndex: 1000,
    maxWidth: 300,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'monospace',
  },
});
