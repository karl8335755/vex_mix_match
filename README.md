# Mix & Match Route Planner

A mobile app for planning routes and strategies for VEX IQ Mix and Match competitions (2025-2026).

## Required Resources

Before building the GUI, you'll need to gather these resources:

### 1. **Official Game Manual**
- Download from: https://www.vexrobotics.com/mix-and-match-manual
- Contains:
  - Field specifications and dimensions
  - Exact positions of goals, pins, beams, barriers
  - Scoring rules and point values
  - Robot specifications and constraints
  - Match timing and rules

### 2. **Field CAD Files**
- Download from: https://www.vexrobotics.com/iq/downloads/cad-snapcad
- Needed for:
  - Accurate field element positions
  - Visual reference for field layout
  - Verifying coordinate systems

### 3. **Scoring System Details**
- Points for different stack configurations
- Points for matching colors in goals
- Bonus points or special scoring rules
- Time-based scoring if applicable

### 4. **Field Element Specifications**
- Exact positions of:
  - Red, Blue, Yellow, Green goals
  - Starting positions of pins and beams
  - Barrier positions
  - Starting zones for robots
- Coordinate system (tiles vs inches)

### 5. **Robot Capabilities**
- Maximum speed
- Turning radius
- Pickup/placement mechanism constraints
- Battery life considerations

## Current Status

### ✅ Completed
- Project setup (React Native/Expo with TypeScript)
- Backend data models (routes, strategies, waypoints)
- Storage service (save/load functionality)
- Field configuration service
- Route calculation utilities
- Type-safe data structures with Zod validation

### 📋 Next Steps
1. Gather official field specifications (update `src/services/fieldConfig.ts`)
2. Implement GUI components:
   - Field visualization
   - Route editor
   - Strategy manager
   - Save/load interface
3. Add scoring calculations based on official rules
4. Test with real competition scenarios

## Project Structure

```
src/
├── types/
│   └── models.ts          # Core data models
├── services/
│   ├── storage.ts         # Save/load service
│   └── fieldConfig.ts    # Field configuration
└── utils/
    ├── routeCalculations.ts  # Route time/score calculations
    └── formatters.ts         # Date/time formatting
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on iOS/Android:
```bash
npm run ios
# or
npm run android
```

## Notes

- Field positions are currently placeholder values
- Scoring calculations need to be updated with official rules
- Field element positions need verification from CAD files






