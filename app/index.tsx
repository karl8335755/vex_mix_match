import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  Modal,
  PanResponder,
  Switch,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageService } from '@/src/services/storage';
import { generateId, calculateRouteTime, calculateRouteScore } from '@/src/utils/routeCalculations';
import { Route, Strategy, Waypoint, RobotAction, FieldPosition, Pin, PinColor, Beam, FieldLayout } from '@/src/types/models';
import { formatTime } from '@/src/utils/formatters';
import { InteractiveField } from '@/src/components/InteractiveField';
import { ComparisonView } from '@/src/components/ComparisonView';
import { positionToLabel } from '@/src/utils/fieldLabels';
import { getDefaultLayout, getTeamMatchDefaultLayout, TEAM_MATCH_DEFAULT_LAYOUT_ID } from '@/src/constants/defaultLayout';

export default function HomeScreen() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [routeName, setRouteName] = useState('');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [beams, setBeams] = useState<Beam[]>([]);
  const [selectedPinColor, setSelectedPinColor] = useState<PinColor>(PinColor.RED);
  const [loading, setLoading] = useState(true);
  const [strategyName, setStrategyName] = useState('');
  const [showStrategyInput, setShowStrategyInput] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedBeamId, setSelectedBeamId] = useState<string | null>(null);
  const [fieldLayouts, setFieldLayouts] = useState<FieldLayout[]>([]);
  const [showLayoutInput, setShowLayoutInput] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [isAddingWaypoint, setIsAddingWaypoint] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'layouts' | 'routes' | 'strategies' | null>(null);
  const [routesMenuOpen, setRoutesMenuOpen] = useState(false);
  const [layoutsMenuOpen, setLayoutsMenuOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [pinSnapEnabled, setPinSnapEnabled] = useState(true);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [propertiesPanelPosition, setPropertiesPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const isDebugBuild = __DEV__ || Platform.OS === 'web';

  useEffect(() => {
    loadData();
    
    // Intercept console.log for debug overlay (web only)
    if (Platform.OS === 'web') {
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        originalLog(...args);
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        setDebugMessages(prev => {
          const newMessages = [...prev.slice(-9), message]; // Keep last 10 messages
          return newMessages;
        });
      };
      
      return () => {
        console.log = originalLog;
      };
    }
    
    // Check initial orientation
    const checkOrientation = () => {
      const window = Dimensions.get('window');
      setIsPortrait(window.height > window.width);
    };
    
    checkOrientation();
    
    // Listen for orientation changes
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setIsPortrait(window.height > window.width);
    });
    
    // Note: Orientation locking removed to allow portrait mode
    // Lock screen orientation to landscape (only on native, not web) - DISABLED
    // if (Platform.OS !== 'web') {
    //   ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    //   
    //   // Cleanup: unlock orientation when component unmounts (optional)
    //   return () => {
    //     ScreenOrientation.unlockAsync();
    //   };
    // }
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Auto-save pins and beams whenever they change
  useEffect(() => {
    const autoSaveTimer = setTimeout(async () => {
      if (pins.length > 0 || beams.length > 0) {
        await StorageService.saveAutoSave(pins, beams);
      }
    }, 500); // Debounce: save 500ms after last change

    return () => clearTimeout(autoSaveTimer);
  }, [pins, beams]);

  // Debug: Log all pins whenever pins state changes
  useEffect(() => {
    if (pins.length > 0) {
      console.log('📌 All Pins:', pins.map(p => ({
        id: p.id,
        color: p.color,
        position: { x: p.position.x.toFixed(2), y: p.position.y.toFixed(2), rotation: p.position.rotation },
      })));
      console.log('📌 Pin Summary:', {
        total: pins.length,
        byColor: {
          red: pins.filter(p => p.color === PinColor.RED).length,
          blue: pins.filter(p => p.color === PinColor.BLUE).length,
          yellow: pins.filter(p => p.color === PinColor.YELLOW).length,
        },
      });
    } else {
      console.log('📌 No pins on field');
    }
  }, [pins]);

  const loadData = async () => {
    try {
      setLoading(true);
      const loadedStrategies = await StorageService.getAllStrategies();
      const loadedRoutes = await StorageService.getAllRoutes();
      const loadedLayouts = await StorageService.getAllFieldLayouts();
      
      // Add built-in Team Match Default layout to the list (always available, non-removable)
      const builtInLayout = getTeamMatchDefaultLayout();
      const allLayouts = [builtInLayout, ...loadedLayouts];
      
      setStrategies(loadedStrategies);
      setRoutes(loadedRoutes);
      setFieldLayouts(allLayouts);
      
      // Always load Team Match Default layout on startup (unless auto-save exists)
      const autoSave = await StorageService.getAutoSave();
      if (autoSave && (autoSave.pins.length > 0 || autoSave.beams.length > 0)) {
        console.log('💾 Restoring auto-saved layout:', { pins: autoSave.pins.length, beams: autoSave.beams.length });
        console.log('💾 Auto-saved pins:', autoSave.pins.map(p => ({
          id: p.id,
          color: p.color,
          position: { x: p.position.x.toFixed(2), y: p.position.y.toFixed(2), rotation: p.position.rotation },
        })));
        setPins(autoSave.pins);
        setBeams(autoSave.beams);
        setSelectedLayoutId(null); // Not a saved layout
      } else {
        // Always load Team Match Default layout from static file
        console.log('📋 Loading Team Match Default layout from static file');
        const staticDefaultLayout = getDefaultLayout();
        setPins(staticDefaultLayout.pins);
        setBeams(staticDefaultLayout.beams);
        setSelectedLayoutId(TEAM_MATCH_DEFAULT_LAYOUT_ID); // Mark as selected built-in layout
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addWaypoint = (position?: FieldPosition) => {
    const newWaypoint: Waypoint = {
      id: generateId(),
      position: position || {
        x: Math.random() * 48,
        y: Math.random() * 48,
        rotation: 0,
      },
      action: RobotAction.PICKUP_PIN,
    };
    setWaypoints([...waypoints, newWaypoint]);
  };

  const handleWaypointMove = (id: string, position: FieldPosition) => {
    setWaypoints(
      waypoints.map((w) =>
        w.id === id ? { ...w, position } : w
      )
    );
  };

  const removeWaypoint = (id: string) => {
    setWaypoints(waypoints.filter((w) => w.id !== id));
  };

  const addPin = (position?: FieldPosition, color?: PinColor) => {
    // If no position provided, use starting position with spacing
    let startPosition: FieldPosition;
    if (position) {
      startPosition = position;
    } else {
      // Use starting position from field config (8, 8) with spacing for multiple pins
      const START_X = 8;
      const START_Y = 8;
      const SPACING = 2.5; // Field units between pins
      
      // Count existing pins to determine offset
      const existingPinCount = pins.length;
      const row = Math.floor(existingPinCount / 5); // 5 pins per row
      const col = existingPinCount % 5;
      
      startPosition = {
        x: START_X + (col * SPACING),
        y: START_Y + (row * SPACING),
        rotation: 0,
      };
    }
    
    const newPin: Pin = {
      id: generateId(),
      position: startPosition,
      color: color || selectedPinColor,
    };
    console.log('➕ Pin added:', {
      id: newPin.id,
      color: newPin.color,
      position: { x: newPin.position.x.toFixed(2), y: newPin.position.y.toFixed(2), rotation: newPin.position.rotation },
    });
    setPins([...pins, newPin]);
  };

  const handlePinColorClick = (color: PinColor) => {
    // Check limits before adding
    const colorCount = pins.filter(p => p.color === color).length;
    let maxCount = 0;
    
    switch (color) {
      case PinColor.YELLOW:
        maxCount = 17;
        break;
      case PinColor.BLUE:
        maxCount = 10;
        break;
      case PinColor.RED:
        maxCount = 10;
        break;
    }
    
    if (colorCount >= maxCount) {
      Alert.alert('Limit Reached', `Maximum of ${maxCount} ${color} pins allowed`);
      return;
    }
    
    // Set the selected color and add a pin at a random position
    setSelectedPinColor(color);
    addPin(undefined, color);
  };

  const handlePinMove = (id: string, position: FieldPosition) => {
    const pin = pins.find(p => p.id === id);
    if (!pin) {
      console.error('❌ Pin not found:', id);
      return;
    }
    
    const safeX = Number.isFinite(position.x) ? position.x : pin.position.x;
    const safeY = Number.isFinite(position.y) ? position.y : pin.position.y;
    const safeRotation = Number.isFinite(position.rotation) ? position.rotation : (pin.position.rotation ?? 0);
    
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      console.warn('⚠️ Received non-finite pin position, falling back to pin\'s current position', position);
    }
    
    // Clamp position to field bounds
    const FIELD_WIDTH = 48;
    const FIELD_HEIGHT = 48;
    const clampedPosition: FieldPosition = {
      x: Math.max(0, Math.min(FIELD_WIDTH, safeX)),
      y: Math.max(0, Math.min(FIELD_HEIGHT, safeY)),
      rotation: safeRotation || 0,
    };
    
    console.log('↔️ Pin moved:', {
      id,
      color: pin.color,
      oldPosition: { x: pin.position.x.toFixed(2), y: pin.position.y.toFixed(2) },
      newPosition: { x: clampedPosition.x.toFixed(2), y: clampedPosition.y.toFixed(2), rotation: clampedPosition.rotation },
    });
    
    // Find all pins in the same stack (at the exact same position)
    // Also check if pin is on a beam hole - if so, move with beam
    const POSITION_TOLERANCE = 0.1;
    const HOLE_SNAP_DISTANCE = 2.5; // Field units for snapping to beam holes
    const PIN_SNAP_DISTANCE = 2.5; // Field units for snapping pins together
    const stackPins: Pin[] = [];
    
    if (pin) {
      // Find all pins at the same position as the pin being moved (using OLD position for stack detection)
      // Only if snap is enabled globally AND this pin is snappable
      const isPinSnappable = pin.snappable !== false;
      if (pinSnapEnabled && isPinSnappable) {
        for (const p of pins) {
          // Only stack with other snappable pins
          const isTargetPinSnappable = p.snappable !== false;
          if (!isTargetPinSnappable) continue;
          
          const dx = Math.abs(p.position.x - pin.position.x);
          const dy = Math.abs(p.position.y - pin.position.y);
          
          if (dx < POSITION_TOLERANCE && dy < POSITION_TOLERANCE) {
            stackPins.push(p);
          }
        }
      }
      
      // Check if the NEW position is near a beam hole and snap to it (only if pin is snappable)
      let snappedHolePosition: FieldPosition | null = null;
      let isMovingToBeamHole = false;
      if (isPinSnappable) {
        for (const beam of beams) {
          // Check if beam allows snapping (defaults to true)
          const isBeamSnappable = beam.snappable !== false;
          if (!isBeamSnappable) continue;
          
          const holeSpacing = 23.4375; // SVG units
          const beamCenterSvgX = (beam.position.x / 48) * 1080 + 60;
          const beamCenterSvgY = (beam.position.y / 48) * 760 + 40;
          const rotation = beam.rotation || 0;
          const rotationRad = (rotation * Math.PI) / 180;
          
          const localHoles = [
            { x: -holeSpacing, y: 0 },
            { x: 0, y: 0 },
            { x: holeSpacing, y: 0 },
          ];
          
          for (const localHole of localHoles) {
            const rotatedX = localHole.x * Math.cos(rotationRad) - localHole.y * Math.sin(rotationRad);
            const rotatedY = localHole.x * Math.sin(rotationRad) + localHole.y * Math.cos(rotationRad);
            
            const svgX = beamCenterSvgX + rotatedX;
            const svgY = beamCenterSvgY + rotatedY;
            
            const holeFieldX = ((svgX - 60) / 1080) * 48;
            const holeFieldY = ((svgY - 40) / 760) * 48;
            
            // Check distance to beam hole
            const holeDx = Math.abs(holeFieldX - clampedPosition.x);
            const holeDy = Math.abs(holeFieldY - clampedPosition.y);
            const distance = Math.sqrt(holeDx * holeDx + holeDy * holeDy);
            
            // If close enough to snap, check if hole is available
            if (distance < HOLE_SNAP_DISTANCE) {
              // Check if this hole already has a pin (excluding the pin being moved)
              let holePinCount = 0;
              for (const p of pins) {
                if (p.id === id) continue; // Skip the pin being moved
                const existingDx = Math.abs(p.position.x - holeFieldX);
                const existingDy = Math.abs(p.position.y - holeFieldY);
                if (existingDx < POSITION_TOLERANCE && existingDy < POSITION_TOLERANCE) {
                  holePinCount++;
                }
              }
              
              // Only snap if hole is empty
              if (holePinCount === 0) {
                snappedHolePosition = { x: holeFieldX, y: holeFieldY, rotation: 0 };
                isMovingToBeamHole = true;
                console.log(`📌 Pin snapped to beam hole at (${holeFieldX.toFixed(2)}, ${holeFieldY.toFixed(2)})`);
                break;
              }
            }
          }
          if (isMovingToBeamHole) break;
        }
      }
      
      // Check if pin is CURRENTLY on a beam hole (using OLD position)
      let isCurrentlyOnBeamHole = false;
      for (const beam of beams) {
        const holeSpacing = 23.4375; // SVG units
        const beamCenterSvgX = (beam.position.x / 48) * 1080 + 60;
        const beamCenterSvgY = (beam.position.y / 48) * 760 + 40;
        const rotation = beam.rotation || 0;
        const rotationRad = (rotation * Math.PI) / 180;
        
        const localHoles = [
          { x: -holeSpacing, y: 0 },
          { x: 0, y: 0 },
          { x: holeSpacing, y: 0 },
        ];
        
        for (const localHole of localHoles) {
          const rotatedX = localHole.x * Math.cos(rotationRad) - localHole.y * Math.sin(rotationRad);
          const rotatedY = localHole.x * Math.sin(rotationRad) + localHole.y * Math.cos(rotationRad);
          
          const svgX = beamCenterSvgX + rotatedX;
          const svgY = beamCenterSvgY + rotatedY;
          
          const holeFieldX = ((svgX - 60) / 1080) * 48;
          const holeFieldY = ((svgY - 40) / 760) * 48;
          
          // Check OLD position against beam hole
          const holeDx = Math.abs(holeFieldX - pin.position.x);
          const holeDy = Math.abs(holeFieldY - pin.position.y);
          
          if (holeDx < POSITION_TOLERANCE && holeDy < POSITION_TOLERANCE) {
            isCurrentlyOnBeamHole = true;
            break;
          }
        }
        if (isCurrentlyOnBeamHole) break;
      }
      
      // Use snapped position if moving to beam hole, otherwise use the clamped position
      const finalPosition = snappedHolePosition || clampedPosition;
      
      // If moving to a beam hole, snap to exact hole position (don't stack with other pins)
      // If currently on a beam hole, don't move with other pins (it moves with the beam)
      // Otherwise, move all pins in the stack together
      if (isMovingToBeamHole) {
        // Pin is snapping to a beam hole - move only this pin to the exact hole position
        console.log(`📌 Pin attaching to beam hole at (${finalPosition.x.toFixed(2)}, ${finalPosition.y.toFixed(2)})`);
        setPins(
          pins.map((p) =>
            p.id === id ? { ...p, position: finalPosition } : p
          )
        );
      } else if (stackPins.length > 1 && !isCurrentlyOnBeamHole && pinSnapEnabled) {
        // Move all pins in the stack together (only if snap is enabled)
        console.log(`📦 Moving ${stackPins.length} pins together as a stack`);
        setPins(
          pins.map((p) => {
            // Check if this pin is in the stack
            const isInStack = stackPins.some(sp => sp.id === p.id);
            if (isInStack) {
              // Move all pins in the stack to the new position
              return { ...p, position: finalPosition };
            }
            return p;
          })
        );
      } else {
        // Single pin, snap disabled, or pin currently on beam hole - move normally
        setPins(
          pins.map((p) =>
            p.id === id ? { ...p, position: finalPosition } : p
          )
        );
      }
    }
  };

  const removePin = (id: string) => {
    const pin = pins.find(p => p.id === id);
    console.log('➖ Pin removed:', {
      id,
      color: pin?.color,
      position: pin ? { x: pin.position.x.toFixed(2), y: pin.position.y.toFixed(2) } : null,
    });
    setPins(pins.filter((p) => p.id !== id));
  };

  const addBeam = (position?: FieldPosition) => {
    // Limit to 2 beams
    if (beams.length >= 2) {
      Alert.alert('Limit Reached', 'Maximum of 2 beams allowed');
      return;
    }
    
    // If no position provided, use starting position with spacing
    let startPosition: FieldPosition;
    if (position) {
      startPosition = position;
    } else {
      // Use starting position from field config (40, 8) with spacing for multiple beams
      const START_X = 40;
      const START_Y = 8;
      const SPACING = 5; // Field units between beams
      
      // Count existing beams to determine offset
      const existingBeamCount = beams.length;
      
      startPosition = {
        x: START_X,
        y: START_Y + (existingBeamCount * SPACING),
        rotation: 0,
      };
    }
    
    const newBeam: Beam = {
      id: generateId(),
      position: startPosition,
      rotation: 0,
    };
    
    // Validate position values
    if (isNaN(newBeam.position.x) || isNaN(newBeam.position.y)) {
      newBeam.position.x = 40;
      newBeam.position.y = 8;
    }
    
    setBeams([...beams, newBeam]);
  };

  const handleBeamMove = (id: string, position: FieldPosition) => {
    const beam = beams.find(b => b.id === id);
    console.log('↔️ Beam moved:', {
      id,
      oldPosition: beam ? { x: beam.position.x.toFixed(2), y: beam.position.y.toFixed(2) } : null,
      newPosition: { x: position.x.toFixed(2), y: position.y.toFixed(2), rotation: position.rotation },
    });
    
    // Calculate old and new beam hole positions
    const POSITION_TOLERANCE = 0.1;
    const holeSpacing = 23.4375; // SVG units
    
    if (beam) {
      // Calculate old beam hole positions
      const oldBeamCenterSvgX = (beam.position.x / 48) * 1080 + 60;
      const oldBeamCenterSvgY = (beam.position.y / 48) * 760 + 40;
      const oldRotation = beam.rotation || 0;
      const oldRotationRad = (oldRotation * Math.PI) / 180;
      
      const localHoles = [
        { x: -holeSpacing, y: 0 },
        { x: 0, y: 0 },
        { x: holeSpacing, y: 0 },
      ];
      
      // Find pins that were on beam holes
      const pinsOnBeam: { pin: Pin; holeIndex: number }[] = [];
      for (const pin of pins) {
        for (let i = 0; i < localHoles.length; i++) {
          const localHole = localHoles[i];
          const rotatedX = localHole.x * Math.cos(oldRotationRad) - localHole.y * Math.sin(oldRotationRad);
          const rotatedY = localHole.x * Math.sin(oldRotationRad) + localHole.y * Math.cos(oldRotationRad);
          
          const svgX = oldBeamCenterSvgX + rotatedX;
          const svgY = oldBeamCenterSvgY + rotatedY;
          
          const holeFieldX = ((svgX - 60) / 1080) * 48;
          const holeFieldY = ((svgY - 40) / 760) * 48;
          
          const holeDx = Math.abs(holeFieldX - pin.position.x);
          const holeDy = Math.abs(holeFieldY - pin.position.y);
          
          if (holeDx < POSITION_TOLERANCE && holeDy < POSITION_TOLERANCE) {
            pinsOnBeam.push({ pin, holeIndex: i });
            break;
          }
        }
      }
      
      // Update beam position
      setBeams(
        beams.map((b) =>
          b.id === id ? { ...b, position } : b
        )
      );
      
      // Move pins that were on beam holes to new hole positions
      if (pinsOnBeam.length > 0) {
        const newBeamCenterSvgX = (position.x / 48) * 1080 + 60;
        const newBeamCenterSvgY = (position.y / 48) * 760 + 40;
        const newRotation = position.rotation || 0;
        const newRotationRad = (newRotation * Math.PI) / 180;
        
        setPins(
          pins.map((p) => {
            const pinOnBeam = pinsOnBeam.find(pob => pob.pin.id === p.id);
            if (pinOnBeam) {
              const localHole = localHoles[pinOnBeam.holeIndex];
              const rotatedX = localHole.x * Math.cos(newRotationRad) - localHole.y * Math.sin(newRotationRad);
              const rotatedY = localHole.x * Math.sin(newRotationRad) + localHole.y * Math.cos(newRotationRad);
              
              const svgX = newBeamCenterSvgX + rotatedX;
              const svgY = newBeamCenterSvgY + rotatedY;
              
              const holeFieldX = ((svgX - 60) / 1080) * 48;
              const holeFieldY = ((svgY - 40) / 760) * 48;
              
              return { ...p, position: { x: holeFieldX, y: holeFieldY, rotation: 0 } };
            }
            return p;
          })
        );
      }
    } else {
      // Beam not found, move normally
      setBeams(
        beams.map((b) =>
          b.id === id ? { ...b, position } : b
        )
      );
    }
  };

  const removeBeam = (id: string) => {
    const beam = beams.find(b => b.id === id);
    console.log('➖ Beam removed:', {
      id,
      position: beam ? { x: beam.position.x.toFixed(2), y: beam.position.y.toFixed(2) } : null,
    });
    setBeams(beams.filter((b) => b.id !== id));
  };

  const togglePinHighlight = (id: string) => {
    if (selectedPinId === id) {
      setSelectedPinId(null);
      console.log('🔲 Pin highlight removed:', id);
    } else {
      setSelectedPinId(id);
      console.log('✅ Pin highlighted:', id);
    }
  };

  const toggleBeamHighlight = (id: string) => {
    if (selectedBeamId === id) {
      setSelectedBeamId(null);
      console.log('🔲 Beam highlight removed:', id);
    } else {
      setSelectedBeamId(id);
      console.log('✅ Beam highlighted:', id);
    }
  };


  const handlePinClick = (id: string, pin: Pin) => {
    setSelectedPinId(id);
    setSelectedBeamId(null); // Clear beam selection
    console.log('👆 Pin selected:', {
      id,
      color: pin.color,
      position: { x: pin.position.x.toFixed(2), y: pin.position.y.toFixed(2) },
      snappable: pin.snappable ?? true,
    });
  };

  const handleBeamClick = (id: string, beam: Beam) => {
    setSelectedBeamId(id);
    setSelectedPinId(null); // Clear pin selection
    console.log('👆 Beam selected:', {
      id,
      position: { x: beam.position.x.toFixed(2), y: beam.position.y.toFixed(2) },
      snappable: beam.snappable ?? true,
    });
  };

  const handleClearSelection = () => {
    setSelectedPinId(null);
    setSelectedBeamId(null);
    setPropertiesPanelPosition(null); // Reset position when closing
  };

  // Properties panel drag handler
  const propertiesPanelDragRef = useRef({ startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const propertiesPanelRef = useRef<View>(null);
  
  const propertiesPanelPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to drags on the header area
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const currentPos = propertiesPanelPosition || { x: 0, y: 0 };
        propertiesPanelDragRef.current = {
          startX: pageX,
          startY: pageY,
          currentX: currentPos.x,
          currentY: currentPos.y,
        };
      },
      onPanResponderMove: (evt, gestureState) => {
        const { currentX, currentY } = propertiesPanelDragRef.current;
        const newX = currentX + gestureState.dx;
        const newY = currentY + gestureState.dy;
        
        // Get screen dimensions to constrain movement
        const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
        const panelWidth = 140;
        const panelHeight = 200; // Approximate height
        
        // Constrain to screen bounds
        const constrainedX = Math.max(0, Math.min(newX, screenWidth - panelWidth));
        const constrainedY = Math.max(0, Math.min(newY, screenHeight - panelHeight));
        
        // Update ref for next move
        propertiesPanelDragRef.current.currentX = constrainedX;
        propertiesPanelDragRef.current.currentY = constrainedY;
        
        setPropertiesPanelPosition({ x: constrainedX, y: constrainedY });
      },
      onPanResponderRelease: () => {
        // Position is already set in onPanResponderMove
      },
    })
  ).current;

  const togglePinSnappable = (id: string) => {
    setPins(pins.map(p => 
      p.id === id 
        ? { ...p, snappable: p.snappable === false ? true : false }
        : p
    ));
  };

  // Initialize properties panel position when it first appears
  useEffect(() => {
    if ((selectedPinId || selectedBeamId) && !propertiesPanelPosition && propertiesPanelRef.current) {
      // Use setTimeout to ensure the panel is rendered before measuring
      setTimeout(() => {
        if (propertiesPanelRef.current) {
          propertiesPanelRef.current.measure((x, y, width, height, pageX: number, pageY: number) => {
            setPropertiesPanelPosition({ x: pageX, y: pageY });
          });
        }
      }, 100);
    }
  }, [selectedPinId, selectedBeamId, propertiesPanelPosition]);

  const toggleBeamSnappable = (id: string) => {
    setBeams(beams.map(b => 
      b.id === id 
        ? { ...b, snappable: b.snappable === false ? true : false }
        : b
    ));
  };

  const togglePinVisibility = (id: string) => {
    setPins(pins.map(p => 
      p.id === id 
        ? { ...p, visible: p.visible === false ? true : false }
        : p
    ));
  };

  const toggleBeamVisibility = (id: string) => {
    setBeams(beams.map(b => 
      b.id === id 
        ? { ...b, visible: b.visible === false ? true : false }
        : b
    ));
  };

  const handlePinLongPress = (id: string, pin: Pin) => {
    console.log('🔘 Long-press handler called for pin:', {
      id,
      color: pin.color,
      position: { x: pin.position.x.toFixed(2), y: pin.position.y.toFixed(2) },
    });
    
    // Find all pins in the same stack (at the exact same position)
    const POSITION_TOLERANCE = 0.1;
    const stackPins: Pin[] = [];
    
    for (const p of pins) {
      const dx = Math.abs(p.position.x - pin.position.x);
      const dy = Math.abs(p.position.y - pin.position.y);
      
      if (dx < POSITION_TOLERANCE && dy < POSITION_TOLERANCE) {
        stackPins.push(p);
      }
    }
    
    console.log(`📦 Found ${stackPins.length} pins in stack`);
    
    // Only unstack if there are multiple pins
    if (stackPins.length <= 1) {
      console.log('⚠️ Only one pin in stack, nothing to unstack');
      return;
    }
    
    // Spread pins horizontally side by side
    const SPACING = 2.5; // Field units between pins
    const startX = pin.position.x - ((stackPins.length - 1) * SPACING) / 2;
    
    const updatedPins = pins.map(p => {
      const stackIndex = stackPins.findIndex(sp => sp.id === p.id);
      if (stackIndex >= 0) {
        return {
          ...p,
          position: {
            ...p.position,
            x: startX + (stackIndex * SPACING),
            y: pin.position.y, // Keep same Y position
          },
        };
      }
      return p;
    });
    
    setPins(updatedPins);
    console.log(`📦 Unstacked ${stackPins.length} pins side by side`);
  };

  // Helper function to log all current pins (can be called from console)
  const logAllPins = () => {
    console.log('📋 Current Pin State:', {
      total: pins.length,
      pins: pins.map(p => ({
        id: p.id,
        color: p.color,
        position: { x: p.position.x.toFixed(2), y: p.position.y.toFixed(2), rotation: p.position.rotation },
      })),
      byColor: {
        red: pins.filter(p => p.color === PinColor.RED).map(p => ({ id: p.id, position: { x: p.position.x.toFixed(2), y: p.position.y.toFixed(2) } })),
        blue: pins.filter(p => p.color === PinColor.BLUE).map(p => ({ id: p.id, position: { x: p.position.x.toFixed(2), y: p.position.y.toFixed(2) } })),
        yellow: pins.filter(p => p.color === PinColor.YELLOW).map(p => ({ id: p.id, position: { x: p.position.x.toFixed(2), y: p.position.y.toFixed(2) } })),
      },
    });
    return pins;
  };

  // Expose logAllPins to window for console access (web only)
  useEffect(() => {
    if (Platform.OS === 'web') {
      (window as any).logAllPins = logAllPins;
      (window as any).getAllPins = () => pins;
      // Expose storage helpers for debugging
      (window as any).checkStorage = async () => {
        const data = await StorageService.getAllFieldLayouts();
        console.log('📦 Current layouts in storage:', data);
        return data;
      };
      (window as any).clearStorage = async () => {
        await StorageService.clearAutoSave();
        console.log('🧹 Cleared auto-save');
      };
      // Expose function to load team match layout
      (window as any).loadTeamMatchLayout = () => {
        loadTeamMatchLayout();
      };
      // Expose function to check default layout storage
      (window as any).checkDefaultLayout = async () => {
        // Debug: Check default layout
        console.log('=== Checking Default Layout ===');
        try {
          const defaultLayout = getDefaultLayout();
          console.log('✅ Default layout loaded');
          console.log('Pins:', defaultLayout.pins.length);
          console.log('Beams:', defaultLayout.beams.length);
        } catch (error) {
          console.error('Error checking default layout:', error);
        }
      };
    }
  }, [pins]);

  // Function to load Team Match Default layout
  const loadTeamMatchLayout = async () => {
    console.log('🎯 Loading Team Match Default layout...');
    
    try {
      // Always load from static file (built-in Team Match Default)
      console.log('📋 Loading Team Match Default layout from static file');
      const defaultLayout = getDefaultLayout();
      setPins(defaultLayout.pins);
      setBeams(defaultLayout.beams);
      setSelectedLayoutId(TEAM_MATCH_DEFAULT_LAYOUT_ID);
      
      console.log(`✅ Loaded Team Match Default layout with ${defaultLayout.pins.length} pins and ${defaultLayout.beams.length} beams`);
    } catch (error) {
      console.error('❌ Error loading Team Match Default layout:', error);
      Alert.alert('Error', 'Failed to load Team Match Default layout');
    }
  };

  const updateWaypointPosition = (id: string, field: 'x' | 'y', value: string) => {
    const numValue = parseFloat(value) || 0;
    setWaypoints(
      waypoints.map((w) =>
        w.id === id
          ? {
              ...w,
              position: { ...w.position, [field]: numValue },
            }
          : w
      )
    );
  };

  const updateWaypointAction = (id: string, action: RobotAction) => {
    setWaypoints(
      waypoints.map((w) =>
        w.id === id ? { ...w, action } : w
      )
    );
  };

  const saveRoute = async () => {
    if (!routeName.trim()) {
      Alert.alert('Error', 'Please enter a route name');
      return;
    }

    if (waypoints.length === 0) {
      Alert.alert('Error', 'Add at least one waypoint');
      return;
    }

    try {
      const now = new Date().toISOString();
      const route: Route = {
        id: currentRoute?.id || generateId(),
        name: routeName,
        waypoints,
        estimatedTime: calculateRouteTime(waypoints),
        estimatedScore: calculateRouteScore(waypoints),
        createdAt: currentRoute?.createdAt || now,
        updatedAt: now,
      };

      await StorageService.saveRoute(route);
      await loadData();
      Alert.alert('Success', 'Route saved!');
      setCurrentRoute(null);
      setRouteName('');
      setWaypoints([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save route');
    }
  };

  const loadRoute = (route: Route) => {
    setCurrentRoute(route);
    setRouteName(route.name);
    setWaypoints(route.waypoints);
  };

  const deleteRoute = async (id: string) => {
    Alert.alert(
      'Delete Route',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteRoute(id);
              await loadData();
              if (currentRoute?.id === id) {
                setCurrentRoute(null);
                setRouteName('');
                setWaypoints([]);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete route');
            }
          },
        },
      ]
    );
  };

  const getColorHex = (color: PinColor): string => {
    switch (color) {
      case PinColor.RED:
        return '#ef4444';
      case PinColor.BLUE:
        return '#3b82f6';
      case PinColor.YELLOW:
        return '#eab308';
      default:
        return '#9ca3af';
    }
  };

  const createStrategy = async () => {
    if (routes.length === 0) {
      Alert.alert('Error', 'Create at least one route first');
      return;
    }

    if (!strategyName.trim()) {
      Alert.alert('Error', 'Please enter a strategy name');
      return;
    }

    try {
      const now = new Date().toISOString();
      const strategy: Strategy = {
        id: generateId(),
        name: strategyName.trim(),
        routes: routes.slice(0, 3), // Use first 3 routes as example
        createdAt: now,
        updatedAt: now,
      };

      await StorageService.saveStrategy(strategy);
      await loadData();
      setStrategyName('');
      setShowStrategyInput(false);
      Alert.alert('Success', 'Strategy created!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create strategy');
    }
  };

  const saveFieldLayout = async () => {
    if (!layoutName.trim()) {
      Alert.alert('Error', 'Please enter a layout name');
      return;
    }

    try {
      console.log('💾 Starting save process...', { 
        name: layoutName.trim(), 
        pins: pins.length, 
        beams: beams.length,
      });
      
      // Log pin details for debugging
      console.log('💾 Pins to save:', pins.map(p => ({
        id: p.id,
        color: p.color,
        position: { x: p.position.x, y: p.position.y },
      })));
      
      const now = new Date().toISOString();
      const layout: FieldLayout = {
        id: generateId(),
        name: layoutName.trim(),
        pins: [...pins],
        beams: [...beams],
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      };

      console.log('💾 Layout object created:', {
        id: layout.id,
        name: layout.name,
        pinsCount: layout.pins.length,
        beamsCount: layout.beams.length,
      });
      
      await StorageService.saveFieldLayout(layout);
      console.log('💾 ✅ StorageService.saveFieldLayout completed successfully');
      
      // Clear auto-save after successful save
      await StorageService.clearAutoSave();
      console.log('💾 Cleared auto-save');
      
      await loadData();
      console.log('💾 Reloaded data');
      
      setLayoutName('');
      setShowLayoutInput(false);
      
      console.log('💾 ✅ Save process complete!');
      Alert.alert('Success', 'Field layout saved!');
    } catch (error) {
      console.error('💾 ❌ Error in saveFieldLayout:', error);
      console.error('💾 Error type:', typeof error);
      console.error('💾 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      Alert.alert('Error', `Failed to save field layout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSaveLayoutWithPrompt = async () => {
    console.log('🔘 Save button clicked!', { layoutName: layoutName.trim(), pins: pins.length, beams: beams.length });
    
    if (!layoutName.trim()) {
      console.warn('⚠️ No layout name provided');
      Alert.alert('Error', 'Please enter a layout name');
      return;
    }

    // Save directly without asking about default
    await saveFieldLayout();
  };

  const loadFieldLayout = async (layout: FieldLayout) => {
    // Handle built-in Team Match Default layout
    if (layout.id === TEAM_MATCH_DEFAULT_LAYOUT_ID) {
      const defaultLayout = getDefaultLayout();
      setPins(defaultLayout.pins);
      setBeams(defaultLayout.beams);
      setSelectedLayoutId(TEAM_MATCH_DEFAULT_LAYOUT_ID);
      console.log(`✅ Loaded layout: ${layout.name} (Team Match Default)`);
      return;
    }
    
    // Handle regular saved layouts
    setPins(layout.pins);
    setBeams(layout.beams);
    setSelectedLayoutId(layout.id);
    console.log(`✅ Loaded layout: ${layout.name}`);
  };

  const deleteFieldLayout = async (id: string) => {
    // Prevent deletion of built-in Team Match Default layout
    if (id === TEAM_MATCH_DEFAULT_LAYOUT_ID) {
      Alert.alert('Cannot Delete', 'Team Match Default is a built-in layout and cannot be deleted.');
      return;
    }
    
    console.log('🗑️ Delete layout clicked:', id);
    
    // On web, use browser confirm dialog which is more reliable
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this layout?');
      if (!confirmed) {
        console.log('❌ Delete cancelled');
        return;
      }
      
      try {
        console.log('🗑️ Deleting layout:', id);
        await StorageService.deleteFieldLayout(id);
        console.log('🗑️ ✅ Layout deleted successfully');
        await loadData();
        if (selectedLayoutId === id) {
          setSelectedLayoutId(null);
          setPins([]);
          setBeams([]);
        }
        Alert.alert('Success', 'Layout deleted!');
      } catch (error) {
        console.error('🗑️ ❌ Error deleting layout:', error);
        Alert.alert('Error', `Failed to delete layout: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // On native, use Alert dialog
      Alert.alert(
        'Delete Layout',
        'Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🗑️ Deleting layout:', id);
                await StorageService.deleteFieldLayout(id);
                console.log('🗑️ ✅ Layout deleted successfully');
                await loadData();
                if (selectedLayoutId === id) {
                  setSelectedLayoutId(null);
                  setPins([]);
                  setBeams([]);
                }
                Alert.alert('Success', 'Layout deleted!');
              } catch (error) {
                console.error('🗑️ ❌ Error deleting layout:', error);
                Alert.alert('Error', 'Failed to delete layout');
              }
            },
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showComparison) {
    return (
      <ComparisonView
        routes={routes}
        onBack={() => setShowComparison(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Main Field View - Takes up most of the screen */}
      <View style={styles.fieldContainer}>
        {/* Floating Hamburger Button - Always visible */}
        {!isPortrait && (
          <View style={styles.hamburgerAndLayoutRow}>
            <TouchableOpacity
              style={styles.floatingHamburger}
              onPress={() => setUiVisible(!uiVisible)}
            >
              {uiVisible ? (
                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M15 18L9 12L15 6"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              ) : (
                <Text style={styles.floatingHamburgerText}>☰</Text>
              )}
            </TouchableOpacity>
            {uiVisible && (
              <View style={styles.layoutNameLandscape}>
                <Text style={styles.layoutNameTextLandscape}>
                  {selectedLayoutId === TEAM_MATCH_DEFAULT_LAYOUT_ID
                    ? 'Team Match Default'
                    : selectedLayoutId
                    ? fieldLayouts.find(l => l.id === selectedLayoutId)?.name || 'Custom Layout'
                    : 'Default Layout'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Compact Header - Toggleable */}
        {uiVisible && (
          <View style={[
            styles.compactHeader,
            isPortrait && styles.compactHeaderPortrait,
          ]}>
            <Text style={styles.compactTitle}>Mix & Match Planner</Text>
          </View>
        )}

        {/* Current Layout Name */}
        {uiVisible && isPortrait && (
          <View style={styles.layoutNameBar}>
            <Text style={styles.layoutNameText}>
              {selectedLayoutId === TEAM_MATCH_DEFAULT_LAYOUT_ID
                ? 'Team Match Default'
                : selectedLayoutId
                ? fieldLayouts.find(l => l.id === selectedLayoutId)?.name || 'Custom Layout'
                : 'Default Layout'}
            </Text>
          </View>
        )}

        {/* Field - Full screen focus */}
        <View style={[
          styles.fieldWrapper,
          isPortrait && styles.fieldWrapperPortrait,
        ]}>
          <View style={[
            styles.fieldContainerInner,
            isPortrait && !uiVisible && styles.fieldContainerInnerPortraitHidden,
            isPortrait && uiVisible && styles.fieldContainerInnerPortrait,
            !isPortrait && !uiVisible && styles.fieldContainerInnerLandscapeHidden,
            !isPortrait && uiVisible && styles.fieldContainerInnerLandscape,
          ]}>
            <InteractiveField
              waypoints={waypoints}
              pins={pins}
              beams={beams}
              selectedPinColor={selectedPinColor}
              selectedPinId={selectedPinId}
              selectedBeamId={selectedBeamId}
              isAddingWaypoint={isAddingWaypoint}
              onWaypointAdd={addWaypoint}
              onWaypointMove={handleWaypointMove}
              onWaypointRemove={removeWaypoint}
              onPinMove={handlePinMove}
              onPinRemove={removePin}
              onPinClick={handlePinClick}
              onPinLongPress={handlePinLongPress}
              onPinToggleHighlight={togglePinHighlight}
              pinSnapEnabled={pinSnapEnabled}
              onBeamAdd={addBeam}
              onBeamMove={handleBeamMove}
              onBeamRemove={removeBeam}
              onBeamClick={handleBeamClick}
              onBeamToggleHighlight={toggleBeamHighlight}
              onClearSelection={handleClearSelection}
            />
          </View>
        </View>

        {/* Hamburger Button - Portrait mode (always visible) */}
        {isPortrait && (
          <TouchableOpacity
            style={styles.floatingHamburgerPortraitLeft}
            onPress={() => setUiVisible(!uiVisible)}
          >
            {uiVisible ? (
              <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15 18L9 12L15 6"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ) : (
              <Text style={styles.floatingHamburgerText}>☰</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Floating Controls - Pin/Beam buttons at top in portrait */}
        {uiVisible && isPortrait && (
          <View style={styles.floatingControlsPortraitTop}>
            {/* Pin Color Buttons - Centered */}
            <View style={styles.pinColorGroupPortraitCentered}>
              {Object.values(PinColor).map((color) => {
                const colorCount = pins.filter(p => p.color === color).length;
                let maxCount = 0;
                
                switch (color) {
                  case PinColor.YELLOW:
                    maxCount = 17;
                    break;
                  case PinColor.BLUE:
                    maxCount = 10;
                    break;
                  case PinColor.RED:
                    maxCount = 10;
                    break;
                }
                
                const isDisabled = colorCount >= maxCount;
                
                return (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.floatingColorButton,
                      { backgroundColor: getColorHex(color) },
                      isDisabled && styles.floatingColorButtonDisabled,
                    ]}
                    onPress={() => handlePinColorClick(color)}
                    disabled={isDisabled}
                  >
                    <Text style={styles.floatingColorButtonText}>
                      {color.charAt(0).toUpperCase()}
                    </Text>
                    <Text style={styles.floatingColorCount}>{colorCount}/{maxCount}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[
                  styles.floatingBeamButton,
                  beams.length >= 2 && styles.floatingColorButtonDisabled,
                ]}
                onPress={() => addBeam()}
                disabled={beams.length >= 2}
              >
                <Text style={styles.floatingBeamButtonText}>Beam</Text>
                <Text style={styles.floatingColorCount}>{beams.length}/2</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Floating Controls - Landscape mode (left side) */}
        {uiVisible && !isPortrait && (
          <View style={styles.floatingControls}>
            {/* Buttons Row */}
            <View style={styles.landscapeButtonsRow}>
              {/* Column 1: Pin/Beam Buttons */}
              <View style={styles.pinColorGroup}>
              {Object.values(PinColor).map((color) => {
                const colorCount = pins.filter(p => p.color === color).length;
                let maxCount = 0;
                
                switch (color) {
                  case PinColor.YELLOW:
                    maxCount = 17;
                    break;
                  case PinColor.BLUE:
                    maxCount = 10;
                    break;
                  case PinColor.RED:
                    maxCount = 10;
                    break;
                }
                
                const isDisabled = colorCount >= maxCount;
                
                return (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.floatingColorButton,
                      { backgroundColor: getColorHex(color) },
                      isDisabled && styles.floatingColorButtonDisabled,
                    ]}
                    onPress={() => handlePinColorClick(color)}
                    disabled={isDisabled}
                  >
                    <Text style={styles.floatingColorButtonText}>
                      {color.charAt(0).toUpperCase()}
                    </Text>
                    <Text style={styles.floatingColorCount}>{colorCount}/{maxCount}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[
                  styles.floatingBeamButton,
                  beams.length >= 2 && styles.floatingColorButtonDisabled,
                ]}
                onPress={() => addBeam()}
                disabled={beams.length >= 2}
              >
                <Text style={styles.floatingBeamButtonText}>Beam</Text>
                <Text style={styles.floatingColorCount}>{beams.length}/2</Text>
              </TouchableOpacity>
            </View>
            
            {/* Column 2: Action Buttons */}
            <View style={styles.actionGroup}>
              <TouchableOpacity
                style={[
                  styles.floatingActionButton,
                  isAddingWaypoint && styles.floatingActionButtonActive,
                ]}
                onPress={() => setIsAddingWaypoint(!isAddingWaypoint)}
              >
                <Text style={styles.floatingActionButtonText}>
                  {isAddingWaypoint ? '✓ Waypoint' : '+ Waypoint'}
                </Text>
              </TouchableOpacity>
              
              {/* Save Route Button */}
              <TouchableOpacity
                style={[
                  styles.floatingActionButton,
                  waypoints.length === 0 && styles.floatingActionButtonDisabled,
                ]}
                onPress={saveRoute}
                disabled={waypoints.length === 0}
              >
                <Text style={styles.floatingActionButtonText}>
                  Save Route
                </Text>
              </TouchableOpacity>
              
              {/* Routes Collapsible Menu */}
              <View style={styles.collapsibleMenu}>
                <TouchableOpacity
                  style={[
                    styles.floatingActionButton,
                    routesMenuOpen && styles.floatingActionButtonMenuActive,
                  ]}
                  onPress={() => {
                    setRoutesMenuOpen(!routesMenuOpen);
                    setLayoutsMenuOpen(false);
                  }}
                >
                  <Text style={styles.floatingActionButtonText}>
                    Routes {routes.length > 0 ? `(${routes.length})` : ''}
                  </Text>
                  <Text style={styles.menuArrow}>{routesMenuOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {routesMenuOpen && (
                  <View style={styles.menuDropdown}>
                    {routes.length === 0 ? (
                      <Text style={styles.menuEmptyText}>No routes saved</Text>
                    ) : (
                      <ScrollView style={styles.menuScrollView}>
                        {routes.map((route) => (
                          <TouchableOpacity
                            key={route.id}
                            style={styles.menuItem}
                            onPress={() => {
                              loadRoute(route);
                              setRoutesMenuOpen(false);
                            }}
                          >
                            <Text style={styles.menuItemText} numberOfLines={1}>
                              {route.name}
                            </Text>
                            <Text style={styles.menuItemSubtext}>
                              {route.waypoints.length} pts • {formatTime(route.estimatedTime)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    {routes.length >= 2 && (
                      <TouchableOpacity
                        style={styles.menuActionButton}
                        onPress={() => {
                          setShowComparison(true);
                          setRoutesMenuOpen(false);
                        }}
                      >
                        <Text style={styles.menuActionButtonText}>Compare Routes</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Layouts Collapsible Menu */}
              <View style={styles.collapsibleMenu}>
                <TouchableOpacity
                  style={[
                    styles.floatingActionButton,
                    layoutsMenuOpen && styles.floatingActionButtonMenuActive,
                  ]}
                  onPress={() => {
                    setLayoutsMenuOpen(!layoutsMenuOpen);
                    setRoutesMenuOpen(false);
                  }}
                >
                  <Text style={styles.floatingActionButtonText}>
                    Layouts
                  </Text>
                  <Text style={styles.menuArrow}>{layoutsMenuOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {layoutsMenuOpen && (
                  <View style={styles.menuDropdown}>
                    {fieldLayouts.length === 0 ? (
                      <Text style={styles.menuEmptyText}>No layouts saved</Text>
                    ) : (
                      <ScrollView style={styles.menuScrollView}>
                        {fieldLayouts.map((layout) => (
                          <View key={layout.id} style={styles.menuItem}>
                            <TouchableOpacity
                              style={styles.menuItemContent}
                              onPress={() => {
                                loadFieldLayout(layout);
                                setLayoutsMenuOpen(false);
                              }}
                            >
                              <View style={styles.menuItemHeader}>
                                <Text style={styles.menuItemText} numberOfLines={1}>
                                  {layout.name}
                                </Text>
                                <View style={styles.menuBadgeContainer}>
                                  {layout.id === TEAM_MATCH_DEFAULT_LAYOUT_ID && (
                                    <View style={[styles.menuBadge, styles.menuBadgeBuiltIn]}>
                                      <Text style={styles.menuBadgeText}>Built-in</Text>
                                    </View>
                                  )}
                                  {layout.isDefault && layout.id !== TEAM_MATCH_DEFAULT_LAYOUT_ID && (
                                    <View style={styles.menuBadge}>
                                      <Text style={styles.menuBadgeText}>Default</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                              <Text style={styles.menuItemSubtext}>
                                {layout.pins.length} pins • {layout.beams.length} beams
                              </Text>
                            </TouchableOpacity>
                            {layout.id !== TEAM_MATCH_DEFAULT_LAYOUT_ID && (
                              <TouchableOpacity
                                style={styles.menuItemDelete}
                                onPress={() => {
                                  deleteFieldLayout(layout.id);
                                  setLayoutsMenuOpen(false);
                                }}
                              >
                                <Text style={styles.menuItemDeleteText}>×</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </ScrollView>
                    )}
                    <TouchableOpacity
                      style={styles.menuActionButton}
                      onPress={() => {
                        loadTeamMatchLayout();
                        setLayoutsMenuOpen(false);
                      }}
                    >
                      <Text style={styles.menuActionButtonText}>Load Default</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Save Layout Button */}
              <View style={styles.layoutSaveContainer}>
                {!showLayoutInput ? (
                  <View style={styles.layoutSaveColumn}>
                    <TouchableOpacity
                      style={[styles.floatingActionButton, styles.layoutSaveButton]}
                      onPress={() => setShowLayoutInput(true)}
                    >
                      <Text style={styles.floatingActionButtonText}>Save Layout</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.floatingActionButton, styles.clearAllButtonInline, styles.layoutSaveButton]}
                      onPress={() => {
                        // Remove all elements from the field
                        setPins([]);
                        setBeams([]);
                        // Clear all waypoints and route data
                        setWaypoints([]);
                        setRouteName('');
                        setCurrentRoute(null);
                        setIsAddingWaypoint(false);
                        setSelectedPinId(null);
                        setSelectedBeamId(null);
                        setSelectedLayoutId(null);
                      }}
                    >
                      <Text style={styles.floatingActionButtonText}>Clear All</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.layoutNameInputInline}
                      placeholder="Layout name..."
                      value={layoutName}
                      onChangeText={setLayoutName}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.floatingActionButton, styles.floatingActionButtonSmall]}
                      onPress={() => {
                        setShowLayoutInput(false);
                        setLayoutName('');
                      }}
                    >
                      <Text style={styles.floatingActionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.floatingActionButton, styles.floatingActionButtonSmall, styles.floatingActionButtonSave]}
                      onPress={handleSaveLayoutWithPrompt}
                    >
                      <Text style={styles.floatingActionButtonText}>Save</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
            </View>
          </View>
        )}

        {/* Floating Controls - Action buttons at bottom in portrait */}
        {uiVisible && isPortrait && (
          <View style={styles.floatingControlsPortraitBottom}>
            {waypoints.length > 0 && (
              <View style={styles.routeInfoPortrait}>
                <Text style={styles.routeInfoTextPortrait}>
                  {waypoints.length} waypoints • {formatTime(calculateRouteTime(waypoints))} • {calculateRouteScore(waypoints)} pts
                </Text>
                <TextInput
                  style={styles.routeNameInputPortrait}
                  placeholder="Route name..."
                  value={routeName}
                  onChangeText={setRouteName}
                />
                <TouchableOpacity
                  style={styles.saveButtonPortrait}
                  onPress={saveRoute}
                >
                  <Text style={styles.saveButtonPortraitText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.actionGroupPortrait}>
              {/* Row 1: Waypoint, Save Route, Routes */}
              <View style={styles.portraitButtonRow}>
                <TouchableOpacity
                  style={[
                    styles.floatingActionButton,
                    isAddingWaypoint && styles.floatingActionButtonActive,
                  ]}
                  onPress={() => setIsAddingWaypoint(!isAddingWaypoint)}
                >
                  <Text style={styles.floatingActionButtonText}>
                    {isAddingWaypoint ? '✓ Waypoint' : '+ Waypoint'}
                  </Text>
                </TouchableOpacity>
                
                {/* Save Route Button */}
                <TouchableOpacity
                  style={[
                    styles.floatingActionButton,
                    waypoints.length === 0 && styles.floatingActionButtonDisabled,
                  ]}
                  onPress={saveRoute}
                  disabled={waypoints.length === 0}
                >
                  <Text style={styles.floatingActionButtonText}>
                    Save Route
                  </Text>
                </TouchableOpacity>
                
                {/* Routes Collapsible Menu */}
                <View style={styles.collapsibleMenu}>
                  <TouchableOpacity
                    style={[
                      styles.floatingActionButton,
                      routesMenuOpen && styles.floatingActionButtonMenuActive,
                    ]}
                    onPress={() => {
                      setRoutesMenuOpen(!routesMenuOpen);
                      setLayoutsMenuOpen(false);
                    }}
                  >
                    <Text style={styles.floatingActionButtonText}>
                      Routes {routes.length > 0 ? `(${routes.length})` : ''}
                    </Text>
                    <Text style={styles.menuArrow}>{routesMenuOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {routesMenuOpen && (
                    <View style={[
                      styles.menuDropdown,
                      isPortrait && styles.menuDropdownPortrait,
                    ]}>
                      {routes.length === 0 ? (
                        <Text style={styles.menuEmptyText}>No routes saved</Text>
                      ) : (
                        <ScrollView style={styles.menuScrollView}>
                          {routes.map((route) => (
                            <TouchableOpacity
                              key={route.id}
                              style={styles.menuItem}
                              onPress={() => {
                                loadRoute(route);
                                setRoutesMenuOpen(false);
                              }}
                            >
                              <Text style={styles.menuItemText} numberOfLines={1}>
                                {route.name}
                              </Text>
                              <Text style={styles.menuItemSubtext}>
                                {route.waypoints.length} pts • {formatTime(route.estimatedTime)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                      {routes.length >= 2 && (
                        <TouchableOpacity
                          style={styles.menuActionButton}
                          onPress={() => {
                            setShowComparison(true);
                            setRoutesMenuOpen(false);
                          }}
                        >
                          <Text style={styles.menuActionButtonText}>Compare Routes</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Row 2: Layouts, Save Layout, Clear All */}
              <View style={styles.portraitButtonRow}>
                {/* Layouts Collapsible Menu */}
                <View style={styles.collapsibleMenu}>
                  <TouchableOpacity
                    style={[
                      styles.floatingActionButton,
                      layoutsMenuOpen && styles.floatingActionButtonMenuActive,
                    ]}
                    onPress={() => {
                      setLayoutsMenuOpen(!layoutsMenuOpen);
                      setRoutesMenuOpen(false);
                    }}
                  >
                    <Text style={styles.floatingActionButtonText}>
                      Layouts
                    </Text>
                    <Text style={styles.menuArrow}>{layoutsMenuOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {layoutsMenuOpen && (
                    <View style={[
                      styles.menuDropdown,
                      isPortrait && styles.menuDropdownPortrait,
                    ]}>
                      {fieldLayouts.length === 0 ? (
                        <Text style={styles.menuEmptyText}>No layouts saved</Text>
                      ) : (
                        <ScrollView style={styles.menuScrollView}>
                          {fieldLayouts.map((layout) => (
                            <View key={layout.id} style={styles.menuItem}>
                              <TouchableOpacity
                                style={styles.menuItemContent}
                                onPress={() => {
                                  loadFieldLayout(layout);
                                  setLayoutsMenuOpen(false);
                                }}
                              >
                                <View style={styles.menuItemHeader}>
                                  <Text style={styles.menuItemText} numberOfLines={1}>
                                    {layout.name}
                                  </Text>
                                  {layout.isDefault && (
                                    <View style={styles.menuBadge}>
                                      <Text style={styles.menuBadgeText}>Default</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.menuItemSubtext}>
                                  {layout.pins.length} pins • {layout.beams.length} beams
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.menuItemDelete}
                                onPress={() => {
                                  deleteFieldLayout(layout.id);
                                  setLayoutsMenuOpen(false);
                                }}
                              >
                                <Text style={styles.menuItemDeleteText}>×</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>
                      )}
                      <TouchableOpacity
                        style={styles.menuActionButton}
                        onPress={() => {
                          loadTeamMatchLayout();
                          setLayoutsMenuOpen(false);
                        }}
                      >
                        <Text style={styles.menuActionButtonText}>Load Default</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Save Layout Button */}
                {!showLayoutInput ? (
                  <TouchableOpacity
                    style={styles.floatingActionButton}
                    onPress={() => setShowLayoutInput(true)}
                  >
                    <Text style={styles.floatingActionButtonText}>Save Layout</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TextInput
                      style={styles.layoutNameInputInline}
                      placeholder="Layout name..."
                      value={layoutName}
                      onChangeText={setLayoutName}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.floatingActionButton, styles.floatingActionButtonSmall]}
                      onPress={() => {
                        setShowLayoutInput(false);
                        setLayoutName('');
                      }}
                    >
                      <Text style={styles.floatingActionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.floatingActionButton, styles.floatingActionButtonSmall, styles.floatingActionButtonSave]}
                      onPress={handleSaveLayoutWithPrompt}
                    >
                      <Text style={styles.floatingActionButtonText}>Save</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Clear All Button */}
                <TouchableOpacity
                  style={[styles.floatingActionButton, styles.clearAllButtonInline]}
                  onPress={() => {
                    // Remove all elements from the field
                    setPins([]);
                    setBeams([]);
                    // Clear all waypoints and route data
                    setWaypoints([]);
                    setRouteName('');
                    setCurrentRoute(null);
                    setIsAddingWaypoint(false);
                    setSelectedPinId(null);
                    setSelectedBeamId(null);
                    setSelectedLayoutId(null);
                  }}
                >
                  <Text style={styles.floatingActionButtonText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Route Info Bar - Compact at bottom (only in landscape) */}
        {uiVisible && waypoints.length > 0 && !isPortrait && (
          <View style={styles.routeInfoBar}>
            <Text style={styles.routeInfoText}>
              {waypoints.length} waypoints • {formatTime(calculateRouteTime(waypoints))} • {calculateRouteScore(waypoints)} pts
            </Text>
            <TextInput
              style={styles.routeNameInputCompact}
              placeholder="Route name..."
              value={routeName}
              onChangeText={setRouteName}
            />
            <TouchableOpacity
              style={styles.saveButtonCompact}
              onPress={saveRoute}
            >
              <Text style={styles.saveButtonCompactText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Backdrop overlay - closes sidebar when clicked */}
      {uiVisible && sidebarOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setSidebarOpen(false)}
        />
      )}

      {/* Collapsible Sidebar */}
      {uiVisible && sidebarOpen && (
        <View style={styles.sidebar}>
          <ScrollView style={styles.sidebarContent}>
            {/* Field Layouts Panel */}
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarTitle}>Field Layouts</Text>
              {!showLayoutInput ? (
                <TouchableOpacity style={styles.sidebarButton} onPress={() => setShowLayoutInput(true)}>
                  <Text style={styles.sidebarButtonText}>Save Current</Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <TextInput
                    style={styles.sidebarInput}
                    placeholder="Layout name"
                    value={layoutName}
                    onChangeText={setLayoutName}
                    autoFocus
                  />
                  <View style={styles.sidebarButtonRow}>
                    <TouchableOpacity
                      style={[styles.sidebarButton, styles.sidebarButtonSmall]}
                      onPress={() => {
                        setShowLayoutInput(false);
                        setLayoutName('');
                      }}
                    >
                      <Text style={styles.sidebarButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sidebarButton, styles.sidebarButtonSmall, styles.sidebarButtonSave]}
                      onPress={handleSaveLayoutWithPrompt}
                    >
                      <Text style={styles.sidebarButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={styles.sidebarButton}
                onPress={loadTeamMatchLayout}
              >
                <Text style={styles.sidebarButtonText}>Load Default</Text>
              </TouchableOpacity>
              {fieldLayouts.length > 0 && (
                <ScrollView style={styles.sidebarList}>
                  {fieldLayouts.map((layout) => (
                    <View key={layout.id} style={styles.sidebarItem}>
                      <View style={styles.sidebarItemContent}>
                        <Text style={styles.sidebarItemName}>{layout.name}</Text>
                        <View style={styles.menuBadgeContainer}>
                          {layout.id === TEAM_MATCH_DEFAULT_LAYOUT_ID && (
                            <View style={[styles.menuBadge, styles.menuBadgeBuiltIn]}>
                              <Text style={styles.menuBadgeText}>Built-in</Text>
                            </View>
                          )}
                          {layout.isDefault && layout.id !== TEAM_MATCH_DEFAULT_LAYOUT_ID && (
                            <View style={styles.menuBadge}>
                              <Text style={styles.menuBadgeText}>Default</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={styles.sidebarItemInfo}>
                        {layout.pins.length} pins • {layout.beams.length} beams
                      </Text>
                      <View style={styles.sidebarItemActions}>
                        <TouchableOpacity
                          style={styles.sidebarItemButton}
                          onPress={() => loadFieldLayout(layout)}
                        >
                          <Text style={styles.sidebarItemButtonText}>Load</Text>
                        </TouchableOpacity>
                        {layout.id !== TEAM_MATCH_DEFAULT_LAYOUT_ID && (
                          <TouchableOpacity
                            style={[styles.sidebarItemButton, styles.sidebarItemButtonDelete]}
                            onPress={() => deleteFieldLayout(layout.id)}
                          >
                            <Text style={styles.sidebarItemButtonText}>Delete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Saved Routes Panel */}
            <View style={styles.sidebarSection}>
              <View style={styles.sidebarSectionHeader}>
                <Text style={styles.sidebarTitle}>Saved Routes</Text>
                {routes.length >= 2 && (
                  <TouchableOpacity
                    style={styles.compareButtonSmall}
                    onPress={() => setShowComparison(true)}
                  >
                    <Text style={styles.compareButtonTextSmall}>Compare</Text>
                  </TouchableOpacity>
                )}
              </View>
              {routes.length === 0 ? (
                <Text style={styles.sidebarEmptyText}>No routes saved</Text>
              ) : (
                <ScrollView style={styles.sidebarList}>
                  {routes.map((route) => (
                    <View key={route.id} style={styles.sidebarItem}>
                      <Text style={styles.sidebarItemName}>{route.name}</Text>
                      <Text style={styles.sidebarItemInfo}>
                        {route.waypoints.length} waypoints • {formatTime(route.estimatedTime)} • {route.estimatedScore} pts
                      </Text>
                      <View style={styles.sidebarItemActions}>
                        <TouchableOpacity
                          style={styles.sidebarItemButton}
                          onPress={() => loadRoute(route)}
                        >
                          <Text style={styles.sidebarItemButtonText}>Load</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.sidebarItemButton, styles.sidebarItemButtonDelete]}
                          onPress={() => deleteRoute(route.id)}
                        >
                          <Text style={styles.sidebarItemButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Strategies Panel */}
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarTitle}>Strategies</Text>
              {!showStrategyInput ? (
                <TouchableOpacity style={styles.sidebarButton} onPress={() => setShowStrategyInput(true)}>
                  <Text style={styles.sidebarButtonText}>Create Strategy</Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <TextInput
                    style={styles.sidebarInput}
                    placeholder="Strategy name"
                    value={strategyName}
                    onChangeText={setStrategyName}
                    autoFocus
                  />
                  <View style={styles.sidebarButtonRow}>
                    <TouchableOpacity
                      style={[styles.sidebarButton, styles.sidebarButtonSmall]}
                      onPress={() => {
                        setShowStrategyInput(false);
                        setStrategyName('');
                      }}
                    >
                      <Text style={styles.sidebarButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sidebarButton, styles.sidebarButtonSmall, styles.sidebarButtonSave]}
                      onPress={createStrategy}
                    >
                      <Text style={styles.sidebarButtonText}>Create</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {strategies.length > 0 && (
                <ScrollView style={styles.sidebarList}>
                  {strategies.map((strategy) => (
                    <View key={strategy.id} style={styles.sidebarItem}>
                      <Text style={styles.sidebarItemName}>{strategy.name}</Text>
                      <Text style={styles.sidebarItemInfo}>
                        {strategy.routes.length} routes
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Waypoint Details Modal - Only show when waypoints exist */}
      {uiVisible && waypoints.length > 0 && activePanel === 'routes' && (
        <Modal
          visible={activePanel === 'routes'}
          transparent
          animationType="slide"
          onRequestClose={() => setActivePanel(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Waypoints ({waypoints.length})</Text>
                <TouchableOpacity onPress={() => setActivePanel(null)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                {waypoints.map((waypoint, index) => (
                  <View key={waypoint.id} style={styles.waypointCardCompact}>
                    <Text style={styles.waypointTitleCompact}>
                      Waypoint {index + 1} - {positionToLabel(waypoint.position)}
                    </Text>
                    <View style={styles.waypointRowCompact}>
                      <Text style={styles.labelCompact}>X:</Text>
                      <TextInput
                        style={styles.numberInputCompact}
                        value={waypoint.position.x.toFixed(1)}
                        onChangeText={(v) => updateWaypointPosition(waypoint.id, 'x', v)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.labelCompact}>Y:</Text>
                      <TextInput
                        style={styles.numberInputCompact}
                        value={waypoint.position.y.toFixed(1)}
                        onChangeText={(v) => updateWaypointPosition(waypoint.id, 'y', v)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.actionRowCompact}>
                      {Object.values(RobotAction).map((action) => (
                        <TouchableOpacity
                          key={action}
                          style={[
                            styles.actionButtonCompact,
                            waypoint.action === action && styles.actionButtonActiveCompact,
                          ]}
                          onPress={() => updateWaypointAction(waypoint.id, action)}
                        >
                          <Text
                            style={[
                              styles.actionButtonTextCompact,
                              waypoint.action === action && styles.actionButtonTextActiveCompact,
                            ]}
                          >
                            {action.split('_').pop()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButtonCompact}
                      onPress={() => removeWaypoint(waypoint.id)}
                    >
                      <Text style={styles.deleteButtonTextCompact}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Debug Messages Overlay - Bottom Left */}
      {isDebugBuild && debugMessages.length > 0 && (
        <View style={styles.debugOverlay}>
          {debugMessages.map((msg, index) => (
            <Text key={index} style={styles.debugText} numberOfLines={1}>
              {msg.length > 100 ? msg.substring(0, 100) + '...' : msg}
            </Text>
          ))}
        </View>
      )}

      {/* Properties Panel - Right Side */}
      {(selectedPinId || selectedBeamId) && (
        <View 
          ref={propertiesPanelRef}
          style={[
            styles.propertiesPanel,
            propertiesPanelPosition && {
              right: undefined,
              top: undefined,
              left: propertiesPanelPosition.x,
              top: propertiesPanelPosition.y,
            }
          ]}
        >
          <View 
            style={styles.propertiesPanelHeader}
            {...propertiesPanelPanResponder.panHandlers}
          >
            <Text style={styles.propertiesPanelTitle}>
              {selectedPinId ? 'Pin Properties' : 'Beam Properties'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClearSelection}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          {selectedPinId && (() => {
            const selectedPin = pins.find(p => p.id === selectedPinId);
            if (!selectedPin) return null;
            
            return (
              <>
                <View style={styles.propertyRow}>
                  <Text style={styles.propertyLabel}>Snappable</Text>
                  <Switch
                    value={selectedPin.snappable !== false}
                    onValueChange={() => togglePinSnappable(selectedPinId)}
                    trackColor={{ false: '#767577', true: '#3b82f6' }}
                    thumbColor={selectedPin.snappable !== false ? '#fff' : '#f4f3f4'}
                  />
                </View>
                
                <View style={styles.propertyRow}>
                  <Text style={styles.propertyLabel}>Visible</Text>
                  <Switch
                    value={selectedPin.visible !== false}
                    onValueChange={() => togglePinVisibility(selectedPinId)}
                    trackColor={{ false: '#767577', true: '#3b82f6' }}
                    thumbColor={selectedPin.visible !== false ? '#fff' : '#f4f3f4'}
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    removePin(selectedPinId);
                    setSelectedPinId(null);
                  }}
                >
                  <Text style={styles.removeButtonText}>Remove Pin</Text>
                </TouchableOpacity>
              </>
            );
          })()}
          
          {selectedBeamId && (() => {
            const selectedBeam = beams.find(b => b.id === selectedBeamId);
            if (!selectedBeam) return null;
            
            return (
              <>
                <View style={styles.propertyRow}>
                  <Text style={styles.propertyLabel}>Snappable</Text>
                  <Switch
                    value={selectedBeam.snappable !== false}
                    onValueChange={() => toggleBeamSnappable(selectedBeamId)}
                    trackColor={{ false: '#767577', true: '#3b82f6' }}
                    thumbColor={selectedBeam.snappable !== false ? '#fff' : '#f4f3f4'}
                  />
                </View>
                
                <View style={styles.propertyRow}>
                  <Text style={styles.propertyLabel}>Visible</Text>
                  <Switch
                    value={selectedBeam.visible !== false}
                    onValueChange={() => toggleBeamVisibility(selectedBeamId)}
                    trackColor={{ false: '#767577', true: '#3b82f6' }}
                    thumbColor={selectedBeam.visible !== false ? '#fff' : '#f4f3f4'}
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    removeBeam(selectedBeamId);
                    setSelectedBeamId(null);
                  }}
                >
                  <Text style={styles.removeButtonText}>Remove Beam</Text>
                </TouchableOpacity>
              </>
            );
          })()}
        </View>
      )}

      {/* Snap Toggle - Right side, centered vertically */}
      {uiVisible && (
        <View style={styles.snapToggleContainer}>
          <Text style={styles.snapToggleLabel}>Snap</Text>
          <Switch
            value={pinSnapEnabled}
            onValueChange={setPinSnapEnabled}
            trackColor={{ false: '#767577', true: '#2563eb' }}
            thumbColor={pinSnapEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
  },
  fieldContainer: {
    flex: 1,
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 10,
    gap: 12,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(5px)',
      boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
    } : {
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  } as any,
  compactHeaderPortrait: {
    paddingVertical: 16,
  },
  compactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  layoutNameBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  layoutNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  layoutNameLandscape: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.7)',
    borderRadius: 8,
    minWidth: 140,
  },
  landscapeButtonsRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  layoutNameTextLandscape: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'left',
  },
  headerMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerMenuButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 8,
    borderRadius: 4,
  },
  menuButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  floatingHamburgerPortrait: {
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(5px)',
      boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
    } : {
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 10,
    }),
  } as any,
  hamburgerAndLayoutRow: {
    position: 'absolute',
    top: 60,
    left: 58,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingHamburger: {
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(5px)',
      boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
    } : {
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 10,
    }),
  } as any,
  floatingHamburgerText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  fieldWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    width: '100%',
    height: '100%',
  },
  fieldWrapperPortrait: {
    // In portrait, we'll rotate the field container
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: -50,
  },
  fieldContainerInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldContainerInnerPortrait: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldContainerInnerLandscape: {
    transform: [{ translateX: 120 }, { translateY: 15 }],
  },
  fieldContainerInnerLandscapeHidden: {
    transform: [{ translateX: 65 }, { translateY: 20 }, { scale: 1.14 }],
  },
  fieldContainerInnerPortraitHidden: {
    transform: [{ translateX: 65 }, { translateY: 20 }, { scale: 1.14 }],
  },
  floatingControls: {
    position: 'absolute',
    top: 140,
    left: 58,
    zIndex: 200,
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  floatingControlsPortraitTop: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 200,
    gap: 6,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 10,
    }),
  } as any,
  floatingHamburgerPortraitLeft: {
    position: 'absolute',
    top: 105,
    left: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 1000,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(5px)',
      boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
    } : {
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 10,
    }),
  } as any,
  pinColorGroupPortraitCentered: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  floatingControlsPortraitBottom: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'column',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 200,
    gap: 6,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(10px)',
      boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 10,
    }),
  } as any,
  routeInfoPortrait: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  routeInfoTextPortrait: {
    flex: 1,
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  routeNameInputPortrait: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    backgroundColor: '#fff',
  },
  saveButtonPortrait: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  saveButtonPortraitText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  pinColorGroup: {
    flexDirection: 'column',
    gap: 10,
    alignItems: 'flex-start',
    marginTop: -10,
  },
  propertiesPanel: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -50,
    width: 140,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
    zIndex: 200,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  propertiesPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  propertiesPanelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  closeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    lineHeight: 16,
  },
  propertyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  propertyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  removeButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  snapToggleContainer: {
    position: 'absolute',
    right: 12,
    bottom: 20,
    alignItems: 'center',
    gap: 8,
    zIndex: 200,
  },
  snapToggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  pinColorGroupPortrait: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  floatingColorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1f2937',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    }),
  },
  floatingColorButtonDisabled: {
    opacity: 0.5,
  },
  floatingColorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    ...(Platform.OS === 'web' ? {
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
    } : {
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }),
  },
  floatingColorCount: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    marginTop: 2,
    ...(Platform.OS === 'web' ? {
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
    } : {
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }),
  },
  floatingBeamButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1f2937',
    backgroundColor: '#6c7173',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    }),
  },
  floatingBeamButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    ...(Platform.OS === 'web' ? {
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
    } : {
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }),
  },
  actionGroup: {
    flexDirection: 'column',
    gap: 10,
    alignItems: 'flex-start',
    marginTop: -10,
  },
  actionGroupPortrait: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
    width: '100%',
  },
  portraitButtonRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'wrap',
  },
  floatingActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(5px)',
      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
    } : {
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5,
    }),
  } as any,
  floatingActionButtonActive: {
    backgroundColor: '#10b981',
  },
  floatingActionButtonMenuActive: {
    backgroundColor: '#6366f1',
  },
  floatingActionButtonDisabled: {
    opacity: 0.5,
  },
  floatingActionButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  menuArrow: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  floatingActionButtonSmall: {
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  floatingActionButtonSave: {
    backgroundColor: '#10b981',
  },
  layoutSaveContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  layoutSaveColumn: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-start',
  },
  layoutSaveButton: {
    // Same size as other action buttons (Routes, Layouts, Waypoint)
  },
  layoutNameInputInline: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
    minWidth: 150,
    flex: 1,
  },
  collapsibleMenu: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  menuDropdown: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 6,
    minWidth: 90,
    maxWidth: 110,
    maxHeight: 125,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    }),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 2000,
  },
  menuDropdownPortrait: {
    // Portrait mode uses same styling as landscape
  },
  menuScrollView: {
    maxHeight: 90,
  },
  menuItem: {
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemDelete: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  menuItemDeleteText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    lineHeight: 9,
  },
  menuItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  menuItemText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  menuItemSubtext: {
    fontSize: 8,
    color: '#6b7280',
  },
  menuBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    marginLeft: 4,
  },
  menuBadgeContainer: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  menuBadgeBuiltIn: {
    backgroundColor: '#6366f1',
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '600',
  },
  menuEmptyText: {
    fontSize: 9,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 8,
  },
  menuActionButton: {
    padding: 10,
    backgroundColor: '#f59e0b',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    alignItems: 'center',
  },
  menuActionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  routeInfoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
    zIndex: 10,
  },
  routeInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  routeNameInputCompact: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    backgroundColor: '#fff',
  },
  saveButtonCompact: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  saveButtonCompactText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 320,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
    zIndex: 200,
    ...(Platform.OS === 'web' ? {
      boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 50,
  },
  sidebarSection: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  sidebarSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sidebarButton: {
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  sidebarButtonSmall: {
    flex: 1,
    marginBottom: 0,
  },
  sidebarButtonSave: {
    backgroundColor: '#10b981',
    marginLeft: 8,
  },
  sidebarButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sidebarButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  sidebarList: {
    maxHeight: 200,
  },
  sidebarItem: {
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sidebarItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sidebarItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  sidebarItemInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  sidebarItemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  sidebarItemButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  sidebarItemButtonDefault: {
    backgroundColor: '#10b981',
  },
  sidebarItemButtonDelete: {
    backgroundColor: '#ef4444',
  },
  sidebarItemButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  sidebarEmptyText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 12,
  },
  defaultBadgeSmall: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeTextSmall: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  compareButtonSmall: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  compareButtonTextSmall: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  clearAllButtonInline: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    } : {
      shadowColor: '#ef4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 10,
    }),
  } as any,
  clearAllButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    margin: 12,
  },
  clearAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalClose: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  waypointCardCompact: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  waypointTitleCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  waypointRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelCompact: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 6,
    width: 15,
  },
  numberInputCompact: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 6,
    width: 50,
    marginRight: 8,
    fontSize: 12,
    backgroundColor: '#fff',
  },
  actionRowCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 4,
  },
  actionButtonCompact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  actionButtonActiveCompact: {
    backgroundColor: '#2563eb',
  },
  actionButtonTextCompact: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionButtonTextActiveCompact: {
    color: '#fff',
  },
  deleteButtonCompact: {
    padding: 4,
    alignItems: 'center',
  },
  deleteButtonTextCompact: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    padding: 4,
    maxWidth: 300,
    zIndex: 9999,
  },
  debugText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'monospace',
    lineHeight: 12,
    marginBottom: 2,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 99,
  },
  debugButtonRow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 300,
  },
  debugButton: {
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(6px)' }
      : {}),
  } as any,
  debugButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

