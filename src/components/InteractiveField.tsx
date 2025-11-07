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
  onPinLongPress?: (id: string, pin: Pin) => void;
  onPinToggleHighlight?: (id: string) => void;
  pinSnapEnabled?: boolean;
  onBeamAdd?: (position?: FieldPosition) => void;
  onBeamMove?: (id: string, position: FieldPosition) => void;
  onBeamRemove?: (id: string) => void;
  onBeamClick?: (id: string, beam: Beam) => void;
  onBeamToggleHighlight?: (id: string) => void;
  onClearSelection?: () => void;
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
  onPinLongPress,
  onPinToggleHighlight: _onPinToggleHighlight,
  pinSnapEnabled = true,
  onBeamAdd: _onBeamAdd,
  onBeamMove,
  onBeamRemove,
  onBeamClick,
  onBeamToggleHighlight: _onBeamToggleHighlight,
  onClearSelection,
  fieldWidth = 48,
  fieldHeight = 48,
  containerStyle,
}) => {
  const [dragStart, setDragStart] = useState<{ x: number; y: number; id: string; type: 'pin' | 'waypoint' | 'beam'; originalX?: number; originalY?: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; id: string; type: 'pin' | 'waypoint' | 'beam'; originalX?: number; originalY?: number } | null>(null);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [dragState, setDragState] = useState<{ x: number; y: number; type: string } | null>(null);
  const [tapStart, setTapStart] = useState<{ x: number; y: number; id: string; type: 'pin' | 'waypoint' | 'beam' } | null>(null);
  const [containerMetrics, setContainerMetrics] = useState<{ width: number; height: number; pageX: number; pageY: number } | null>(null);
  const containerRef = useRef<View>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressFiredRef = useRef<boolean>(false);
  
  // Keep ref in sync with state
  useEffect(() => {
    dragStartRef.current = dragStart;
  }, [dragStart]);

  // Group pins into stacks if they share the same position
  const groupPinsIntoStacks = useCallback((): Map<string, Pin[]> => {
    const stacks = new Map<string, Pin[]>();
    const processed = new Set<string>();
    const POSITION_TOLERANCE = 0.1;

    for (const pin of pins) {
      if (processed.has(pin.id)) continue;

      const stack: Pin[] = [pin];
      processed.add(pin.id);

      for (const otherPin of pins) {
        if (processed.has(otherPin.id)) continue;
        const dx = Math.abs(pin.position.x - otherPin.position.x);
        const dy = Math.abs(pin.position.y - otherPin.position.y);
        if (dx < POSITION_TOLERANCE && dy < POSITION_TOLERANCE) {
          stack.push(otherPin);
          processed.add(otherPin.id);
        }
      }

      if (stack.length > 1) {
        stacks.set(stack[0].id, stack);
      }
    }

    return stacks;
  }, [pins]);

  const handleContainerLayout = useCallback(() => {
    if (!containerRef.current) {
      return;
    }
    if (Platform.OS !== 'web' && typeof (containerRef.current as any).measure === 'function') {
      (containerRef.current as any).measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setContainerMetrics({ width, height, pageX, pageY });
      });
    } else if (Platform.OS === 'web') {
      const node = containerRef.current as any;
      if (node && node.getBoundingClientRect) {
        const rect = node.getBoundingClientRect();
        setContainerMetrics({ width: rect.width, height: rect.height, pageX: rect.left, pageY: rect.top });
      }
    }
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      handleContainerLayout();
    });

    return () => {
      subscription?.remove();
    };
  }, [handleContainerLayout]);

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
  const findNearbyTarget = useCallback((position: FieldPosition, excludeId?: string, draggingPin?: Pin): { pin?: Pin; hole?: { beam: Beam; index: number; position: FieldPosition } } | null => {
    const POSITION_TOLERANCE = 0.1;
    const HOLE_SNAP_DISTANCE = 2.5; // Field units for snapping to beam holes
    
    // Check if the dragging pin is snappable (defaults to true)
    const isDraggingPinSnappable = draggingPin?.snappable !== false;
    
    // First check for nearby pins (only if snap is enabled globally AND dragging pin is snappable)
    if (pinSnapEnabled && isDraggingPinSnappable) {
      for (const pin of pins) {
        if (pin.id === excludeId) continue;
        
        // Check if target pin is also snappable (defaults to true)
        const isTargetPinSnappable = pin.snappable !== false;
        if (!isTargetPinSnappable) continue;
        
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
    }
    
    // Then check for nearby beam holes (only if dragging pin is snappable)
    if (beams && isDraggingPinSnappable) {
      for (const beam of beams) {
        // Check if beam allows snapping (defaults to true)
        const isBeamSnappable = beam.snappable !== false;
        if (!isBeamSnappable) continue;
        
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
  }, [pins, beams, pinSnapEnabled, getBeamHolePositions]);

  // Convert screen coordinates to SVG coordinates
  const screenToSvg = useCallback((screenX: number, screenY: number) => {
    // Use containerMetrics if available (more accurate), otherwise fall back to display dimensions
    const width = containerMetrics?.width ?? svgDisplayWidth;
    const height = containerMetrics?.height ?? svgDisplayHeight;
    
    // Ensure we have valid dimensions
    if (!width || !height || width <= 0 || height <= 0) {
      console.warn('⚠️ Invalid container dimensions:', { width, height, containerMetrics });
      return { x: 0, y: 0 };
    }
    
    // Normalize coordinates to 0-1 range, then scale to SVG viewbox
    const normalizedX = Math.max(0, Math.min(1, screenX / width));
    const normalizedY = Math.max(0, Math.min(1, screenY / height));
    const svgX = normalizedX * SVG_VIEWBOX_WIDTH;
    const svgY = normalizedY * SVG_VIEWBOX_HEIGHT;
    
    return { x: svgX, y: svgY };
  }, [containerMetrics, svgDisplayWidth, svgDisplayHeight]);

  // Helper function to extract coordinates from events (works on web and native)
  const getCoordinatesFromEvent = useCallback((evt: any): { x: number; y: number } | null => {
    if (Platform.OS === 'web') {
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
      // For native platforms, use pageX/pageY with containerMetrics for accurate coordinates
      // This accounts for any transforms or offsets of the container
      const pageX = evt.nativeEvent.pageX;
      const pageY = evt.nativeEvent.pageY;
      
      if (pageX === undefined || pageY === undefined) {
        // Fallback to locationX/locationY if pageX/pageY not available
        const locationX = evt.nativeEvent.locationX;
        const locationY = evt.nativeEvent.locationY;
        if (locationX !== undefined && locationY !== undefined) {
          return { x: locationX, y: locationY };
        }
        return null;
      }
      
      if (containerMetrics && containerMetrics.pageX !== undefined && containerMetrics.pageY !== undefined) {
        // Calculate relative to container position
        return {
          x: pageX - containerMetrics.pageX,
          y: pageY - containerMetrics.pageY,
        };
      }
      
      // If containerMetrics not available, try locationX/locationY as fallback
      const locationX = evt.nativeEvent.locationX;
      const locationY = evt.nativeEvent.locationY;
      if (locationX !== undefined && locationY !== undefined) {
        return { x: locationX, y: locationY };
      }
      
      return null;
    }
  }, [containerMetrics]);

  // Detect element at position
  const detectElementAtPosition = useCallback((x: number, y: number) => {
    const svgCoords = screenToSvg(x, y);
    
    // Check beams first (larger) - only visible beams
    for (const beam of beams) {
      if (beam.visible === false) continue;
      
      const beamSvg = fieldToSvg(beam.position.x, beam.position.y);
      const beamHalfWidth = 93.75 / 2 + 5;
      const beamHalfHeight = 37.5 / 2 + 5;
      const dx = Math.abs(svgCoords.x - beamSvg.x);
      const dy = Math.abs(svgCoords.y - beamSvg.y);
      
      if (dx < beamHalfWidth && dy < beamHalfHeight && onBeamMove) {
        return { type: 'beam' as const, id: beam.id, element: beam };
      }
    }
    
    // Check pins - only visible pins
    for (const pin of pins) {
      if (pin.visible === false) continue;
      
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
          return true;
        }
        // Also respond to empty space clicks to add waypoints
        return true;
      },
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        const coords = getCoordinatesFromEvent(evt);
        if (!coords) return;
        
        const detected = detectElementAtPosition(coords.x, coords.y);
        if (detected) {
          // Store tap start for click detection
          const dragStartValue = { x: coords.x, y: coords.y, id: detected.id, type: detected.type };
          setTapStart({ x: coords.x, y: coords.y, id: detected.id, type: detected.type });
          setDragStart(dragStartValue);
          dragStartRef.current = dragStartValue; // Update ref immediately
          
          // Store original position for tap detection
          const pos = detected.element.position;
          dragStartRef.current.originalX = pos.x;
          dragStartRef.current.originalY = pos.y;
          
          setDragState({ x: pos.x, y: pos.y, type: detected.type });
          const debugMsg = `Touching ${detected.type} ${detected.id} at screen (${coords.x.toFixed(1)}, ${coords.y.toFixed(1)})`;
          setDebugInfo(debugMsg);
          
          // Immediately select pin/beam when touched (for both tap and drag)
          if (detected.type === 'pin' && onPinClick) {
            const pin = detected.element as Pin;
            console.log('👆 Pin touched - selecting:', detected.id);
            onPinClick(detected.id, pin);
          } else if (detected.type === 'beam' && onBeamClick) {
            const beam = detected.element as Beam;
            console.log('👆 Beam touched - selecting:', detected.id);
            onBeamClick(detected.id, beam);
          }
          
          // Start long-press timer for pins
          if (detected.type === 'pin' && onPinLongPress) {
            const pin = detected.element as Pin;
            longPressFiredRef.current = false; // Reset flag
            longPressTimerRef.current = setTimeout(() => {
              longPressFiredRef.current = true; // Mark as fired
              console.log('🔘 Long-press detected on pin:', detected.id);
              onPinLongPress(detected.id, pin);
              setDebugInfo(`Long-pressed pin ${detected.id}`);
              longPressTimerRef.current = null; // Clear timer ref after firing
            }, 500); // 500ms long-press duration
          }
        } else {
          // Empty space - prepare for potential waypoint addition
          const dragStartValue = { x: coords.x, y: coords.y, id: '', type: 'waypoint' as const };
          setTapStart({ x: coords.x, y: coords.y, id: '', type: 'waypoint' });
          setDragStart(dragStartValue);
          dragStartRef.current = dragStartValue; // Update ref immediately
          const svgCoords = screenToSvg(coords.x, coords.y);
          const fieldPos = svgToField(svgCoords.x, svgCoords.y);
          setDragState({ x: fieldPos.x, y: fieldPos.y, type: 'waypoint' });
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const currentDragStart = dragStartRef.current;
        if (!currentDragStart) {
          return;
        }
        
        // Don't clear tapStart here - we'll check movement in onPanResponderRelease
        // Only cancel long-press timer if dragging significantly (increased threshold for mobile)
        if (Math.abs(gestureState.dx) > 15 || Math.abs(gestureState.dy) > 15) {
          // Cancel long-press timer if dragging significantly
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
            console.log('🚫 Long-press cancelled due to movement');
          }
        }
        
        // Only update position if there's significant movement (to prevent tap from moving element)
        const dx = Math.abs(gestureState.dx || 0);
        const dy = Math.abs(gestureState.dy || 0);
        const hasSignificantMovement = dx > 5 || dy > 5;
        
        if (!hasSignificantMovement) {
          // Don't update position for very small movements (likely a tap)
          return;
        }
        
        const coords = getCoordinatesFromEvent(evt);
        if (!coords) {
          return;
        }
        
        const svgCoords = screenToSvg(coords.x, coords.y);
        let fieldPos = svgToField(svgCoords.x, svgCoords.y);
        
        // Snap pin to nearby pin or beam hole if close enough and stack not full
        if (currentDragStart.type === 'pin') {
          const draggingPin = pins.find(p => p.id === currentDragStart.id);
          const nearbyTarget = findNearbyTarget(fieldPos, currentDragStart.id, draggingPin);
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
        
        setDragState({ x: fieldPos.x, y: fieldPos.y, type: currentDragStart.type });
        const dragMsg = `${currentDragStart.type} ${currentDragStart.id}: screen(${coords.x.toFixed(1)}, ${coords.y.toFixed(1)}) -> field(${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`;
        setDebugInfo(dragMsg);
        
        if (currentDragStart.type === 'pin' && onPinMove) {
          console.log('📌 Pin moved:', currentDragStart.id, `to (${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`);
          onPinMove(currentDragStart.id, fieldPos);
        } else if (currentDragStart.type === 'waypoint') {
          onWaypointMove(currentDragStart.id, fieldPos);
        } else if (currentDragStart.type === 'beam' && onBeamMove) {
          console.log('🔧 Beam moved:', currentDragStart.id, `to (${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`);
          onBeamMove(currentDragStart.id, fieldPos);
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        // Pan responder terminated
      },
      onPanResponderRelease: (_evt, gestureState) => {
        // Check if long-press timer fired
        const longPressFired = longPressFiredRef.current;
        
        // Clear long-press timer if it hasn't fired yet
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        
        // Reset flag for next interaction
        longPressFiredRef.current = false;
        
        // Capture tapStart and dragStart before clearing them
        const currentTapStart = tapStart;
        const currentDragStart = dragStart;
        
        // Check if this was a tap (not a drag) - check both gesture movement AND actual element movement
        const dx = Math.abs(gestureState.dx || 0);
        const dy = Math.abs(gestureState.dy || 0);
        
        // Also check if the element actually moved from its original position
        // Check BEFORE clearing state, using the ref which has the original position
        let elementMoved = false;
        const originalX = dragStartRef.current?.originalX;
        const originalY = dragStartRef.current?.originalY;
        
        if (currentDragStart && originalX !== undefined && originalY !== undefined) {
          const currentElement = currentDragStart.type === 'pin' 
            ? pins.find(p => p.id === currentDragStart.id)
            : currentDragStart.type === 'beam'
            ? beams.find(b => b.id === currentDragStart.id)
            : null;
          
          if (currentElement) {
            const elementDx = Math.abs(currentElement.position.x - originalX);
            const elementDy = Math.abs(currentElement.position.y - originalY);
            // Element moved more than 0.5 field units (about 0.5 inches)
            elementMoved = elementDx > 0.5 || elementDy > 0.5;
          }
        }
        
        // Consider it a tap if gesture movement is small AND element didn't actually move
        // Increased threshold for mobile devices (20px instead of 10px)
        const isTap = (dx < 20 && dy < 20) && !elementMoved;
        
        console.log('📱 Release:', {
          type: currentTapStart?.type,
          id: currentTapStart?.id,
          dx,
          dy,
          originalX,
          originalY,
          currentElementX: currentDragStart?.type === 'pin' 
            ? pins.find(p => p.id === currentDragStart.id)?.position.x
            : currentDragStart?.type === 'beam'
            ? beams.find(b => b.id === currentDragStart.id)?.position.x
            : undefined,
          elementMoved,
          isTap,
          longPressFired,
        });
        
        // Clear drag state first
        if (dragStart) {
          setDebugInfo(`Drag completed: ${dragStart.type} ${dragStart.id}`);
        }
        setDragStart(null);
        dragStartRef.current = null; // Clear ref
        setDragState(null);
        setTapStart(null);
        
        // Handle tap/click after clearing state
        // Also handle selection on drag release if element was dragged
        if (currentTapStart && currentDragStart && !longPressFired) {
          if (isTap) {
            // Handle pin/beam tap (single click)
            if (currentTapStart.type === 'pin' && currentTapStart.id) {
              if (onPinClick) {
                const pin = pins.find(p => p.id === currentTapStart.id);
                if (pin) {
                  console.log('👆 Pin clicked:', currentTapStart.id);
                  onPinClick(currentTapStart.id, pin);
                  setDebugInfo(`Selected pin ${currentTapStart.id}`);
                }
              }
            } else if (currentTapStart.type === 'beam' && currentTapStart.id) {
              if (onBeamClick) {
                const beam = beams.find(b => b.id === currentTapStart.id);
                if (beam) {
                  console.log('👆 Beam clicked:', currentTapStart.id);
                  onBeamClick(currentTapStart.id, beam);
                  setDebugInfo(`Selected beam ${currentTapStart.id}`);
                }
              }
            } else if (currentTapStart.type === 'waypoint' && !currentTapStart.id && onWaypointAdd && isAddingWaypoint) {
              // Empty space tap - add waypoint only if in waypoint addition mode
              const coords = screenToSvg(currentTapStart.x, currentTapStart.y);
              const fieldPos = svgToField(coords.x, coords.y);
              onWaypointAdd(fieldPos);
              setDebugInfo(`Added waypoint at (${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`);
            } else if (currentTapStart.type === 'waypoint' && !currentTapStart.id && !isAddingWaypoint) {
              // Empty space tap (not in waypoint mode) - clear selection
              if (onClearSelection) {
                onClearSelection();
                setDebugInfo('Selection cleared');
              }
            }
          } else {
            // It was a drag - select the element after dragging
            if (currentTapStart.type === 'pin' && currentTapStart.id && onPinClick) {
              const pin = pins.find(p => p.id === currentTapStart.id);
              if (pin) {
                console.log('👆 Pin selected after drag:', currentTapStart.id);
                onPinClick(currentTapStart.id, pin);
              }
            } else if (currentTapStart.type === 'beam' && currentTapStart.id && onBeamClick) {
              const beam = beams.find(b => b.id === currentTapStart.id);
              if (beam) {
                console.log('👆 Beam selected after drag:', currentTapStart.id);
                onBeamClick(currentTapStart.id, beam);
              }
            }
          }
        }
      },
    });
  }, [beams, pins, waypoints, onPinMove, onWaypointMove, onBeamMove, onPinClick, onBeamClick, onPinLongPress, onPinRemove, onWaypointAdd, onClearSelection, isAddingWaypoint, dragStart, tapStart, detectElementAtPosition, screenToSvg, svgToField, getCoordinatesFromEvent, findNearbyTarget, pinSnapEnabled]);

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
      const draggingPin = pins.find(p => p.id === dragStart.id);
      const nearbyTarget = findNearbyTarget(fieldPos, dragStart.id, draggingPin);
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
    
    if (dragStart.type === 'pin' && onPinMove) {
      console.log('📌 Pin moved:', dragStart.id, `to (${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`);
      onPinMove(dragStart.id, fieldPos);
    } else if (dragStart.type === 'waypoint') {
      onWaypointMove(dragStart.id, fieldPos);
    } else if (dragStart.type === 'beam' && onBeamMove) {
      console.log('🔧 Beam moved:', dragStart.id, `to (${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`);
      onBeamMove(dragStart.id, fieldPos);
    }
    
    // Only preventDefault if event is cancelable (not passive)
    if (e.cancelable !== false) {
      e.preventDefault();
    }
  }, [dragStart, screenToSvg, svgToField, onPinMove, onWaypointMove, onBeamMove, findNearbyTarget, pinSnapEnabled]);

  const handleWebMouseUp = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    
    // Get current tapStart and dragStart before clearing them
    const currentTapStart = tapStart;
    const currentDragStart = dragStart;
    
    // Clear drag state first
    if (dragStart) {
      setDebugInfo(`Drag completed: ${dragStart.type} ${dragStart.id}`);
    }
    setDragStart(null);
    setDragState(null);
    setTapStart(null);
    
    // Handle tap/click after clearing state
    if (currentTapStart && currentDragStart) {
      // Check if this was a tap (not a drag) - calculate movement from tapStart to current position
      const rect = e.currentTarget?.querySelector('svg')?.getBoundingClientRect();
      if (!rect) return;
      
      const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX);
      const clientY = e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY);
      
      if (clientX !== undefined && clientY !== undefined) {
        const currentX = clientX - rect.left;
        const currentY = clientY - rect.top;
        const dx = Math.abs(currentX - currentTapStart.x);
        const dy = Math.abs(currentY - currentTapStart.y);
        
        if (dx < 10 && dy < 10) {
          // Handle pin/beam tap (single click)
          if (currentTapStart.type === 'pin' && currentTapStart.id) {
            if (onPinClick) {
              const pin = pins.find(p => p.id === currentTapStart.id);
              if (pin) {
                console.log('👆 Pin clicked:', currentTapStart.id);
                onPinClick(currentTapStart.id, pin);
                setDebugInfo(`Selected pin ${currentTapStart.id}`);
              }
            }
          } else if (currentTapStart.type === 'beam' && currentTapStart.id) {
            if (onBeamClick) {
              const beam = beams.find(b => b.id === currentTapStart.id);
              if (beam) {
                console.log('👆 Beam clicked:', currentTapStart.id);
                onBeamClick(currentTapStart.id, beam);
                setDebugInfo(`Selected beam ${currentTapStart.id}`);
              }
            }
          } else if (currentTapStart.type === 'waypoint' && !currentTapStart.id && onWaypointAdd && isAddingWaypoint) {
            // Empty space tap - add waypoint only if in waypoint addition mode
            const coords = screenToSvg(currentTapStart.x, currentTapStart.y);
            const fieldPos = svgToField(coords.x, coords.y);
            onWaypointAdd(fieldPos);
            setDebugInfo(`Added waypoint at (${fieldPos.x.toFixed(1)}, ${fieldPos.y.toFixed(1)})`);
          } else if (currentTapStart.type === 'waypoint' && !currentTapStart.id && !isAddingWaypoint) {
            // Empty space tap (not in waypoint mode) - clear selection
            if (onClearSelection) {
              onClearSelection();
              setDebugInfo('Selection cleared');
            }
          }
        }
      }
    }
  }, [tapStart, dragStart, onPinClick, onBeamClick, onWaypointAdd, onClearSelection, isAddingWaypoint, pins, beams, screenToSvg, svgToField]);


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
      onLayout={handleContainerLayout}
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
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const angleRad = Math.atan2(dy, dx);
              const arrowSize = 10;
              const arrowOffset = 18;
              const arrowX = end.x - Math.cos(angleRad) * arrowOffset;
              const arrowY = end.y - Math.sin(angleRad) * arrowOffset;
              const backX = arrowX - Math.cos(angleRad) * arrowSize;
              const backY = arrowY - Math.sin(angleRad) * arrowSize;
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
                <G key={`route-${index}`}>
                  <Line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="#38bdf8"
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                  <Polygon
                    points={`${end.x},${end.y} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`}
                    fill="#38bdf8"
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
        
        {/* Beams - rendered below pins */}
        <G>
          {beams.filter(beam => beam.visible !== false).map((beam) => {
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
                  stroke={isSelected ? '#3b82f6' : 'none'}
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
              
              // Render stacked pins with offset to show all colors (only visible pins)
              stackPins.filter(pin => pin.visible !== false).forEach((pin, index) => {
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
                      r={isSelected ? 18 : 15}
                      fill={colors.fill}
                      stroke={isSelected ? '#000000' : colors.stroke}
                      strokeWidth={isSelected ? 5 : 3}
                      opacity={isDragging ? 0.85 : 0.9}
                    />
                    {Platform.OS === 'web' ? (
                      <Rect
                        x={svgPos.x - (isSelected ? 18 : 15) + offsetX}
                        y={svgPos.y - (isSelected ? 18 : 15) + offsetY}
                        width={(isSelected ? 18 : 15) * 2}
                        height={(isSelected ? 18 : 15) * 2}
                        fill="transparent"
                      />
                    ) : null}
                  </G>
                );
              });
            });
            
            // Render all pins not in stacks (normal rendering) - only visible pins
            pins.filter(pin => pin.visible !== false).forEach(pin => {
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
                      r={isSelected ? 18 : 15}
                      fill={colors.fill}
                      stroke={isSelected ? '#000000' : colors.stroke}
                      strokeWidth={isSelected ? 5 : 3}
                      opacity={isDragging ? 0.85 : 1}
                    />
                    {Platform.OS === 'web' ? (
                      <Rect
                        x={svgPos.x - (isSelected ? 18 : 15)}
                        y={svgPos.y - (isSelected ? 18 : 15)}
                        width={(isSelected ? 18 : 15) * 2}
                        height={(isSelected ? 18 : 15) * 2}
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






