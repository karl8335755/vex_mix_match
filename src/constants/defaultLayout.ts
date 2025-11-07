/**
 * Default Layout - Auto-generated file
 * This file is automatically updated when you set a layout as default
 * DO NOT manually edit this file - it will be overwritten
 * 
 * Generated: 2025-11-07T00:11:36.290Z
 * Layout: Team Match
 */

import { Pin, Beam, PinColor } from '../types/models';
import { generateId } from '../utils/routeCalculations';

/**
 * Default layout configuration
 * This gets loaded automatically on app startup
 */
export const DEFAULT_LAYOUT_CONFIG: {
  pins: Pin[];
  beams: Beam[];
  layoutName?: string;
} = {
  pins: [
    { id: '1762474161043-472mf6uzd', color: PinColor.RED, position: { x: 26.905317769131, y: 45.76366987507679, rotation: 0 } },
    { id: '1762474161043-uw03ajkgg', color: PinColor.RED, position: { x: 15.750972762645915, y: 2.8556215441327053, rotation: 0 } },
    { id: '1762474161043-f52qot37i', color: PinColor.BLUE, position: { x: 32.249027237354085, y: 2.708171206225681, rotation: 0 } },
    { id: '1762474161043-qw9bqrv3n', color: PinColor.RED, position: { x: 4.804150453955902, y: 41.85623592054065, rotation: 0 } },
    { id: '1762474161043-n9vs1n3wa', color: PinColor.BLUE, position: { x: 29.447470817120617, y: 16.86340364530002, rotation: 0 } },
    { id: '1762474161043-pvfrg02cl', color: PinColor.YELLOW, position: { x: 43.24773022049287, y: 5.952078640180217, rotation: 0 } },
    { id: '1762474161043-0hqkqqbb5', color: PinColor.YELLOW, position: { x: 23.896238651102465, y: 16.937128814253533, rotation: 0 } },
    { id: '1762474161043-1xs95gfce', color: PinColor.YELLOW, position: { x: 37.74837872892348, y: 9.71206225680934, rotation: 0 } },
    { id: '1762474161043-dwi938tuw', color: PinColor.YELLOW, position: { x: 29.447470817120617, y: 9.859512594716364, rotation: 0 } },
    { id: '1762474161043-cqq56aqyx', color: PinColor.YELLOW, position: { x: 18.44876783398184, y: 9.638337087855824, rotation: 0 } },
    { id: '1762474161043-n3j9lm7ms', color: PinColor.YELLOW, position: { x: 23.94811932555123, y: 23.79356952693017, rotation: 0 } },
    { id: '1762474161043-c37tawgwh', color: PinColor.YELLOW, position: { x: 18.34500648508431, y: 24.235920540651236, rotation: 0 } },
    { id: '1762474161043-0xebet7gc', color: PinColor.YELLOW, position: { x: 23.896238651102465, y: 38.5386033176326, rotation: 0 } },
    { id: '1762474161043-gmchne92s', color: PinColor.YELLOW, position: { x: 12.69001297016861, y: 16.937128814253533, rotation: 0 } },
    { id: '1762474161043-c5mj4c612', color: PinColor.YELLOW, position: { x: 10.251621271076523, y: 9.933237763669876, rotation: 0 } },
    { id: '1762474161043-7b6qiuhh3', color: PinColor.YELLOW, position: { x: 29.447470817120617, y: 23.94101986483719, rotation: 0 } },
    { id: '1762474161043-uh34sh96q', color: PinColor.YELLOW, position: { x: 18.34500648508431, y: 31.387261929141918, rotation: 0 } },
    { id: '1762474161043-n44g00cv0', color: PinColor.YELLOW, position: { x: 29.395590142671857, y: 31.16608642228138, rotation: 0 } },
    { id: '1762474161043-qfbnj5xp4', color: PinColor.YELLOW, position: { x: 12.741893644617377, y: 24.162195371697727, rotation: 0 } },
    { id: '1762474161043-taxhs85rn', color: PinColor.YELLOW, position: { x: 34.89494163424124, y: 23.94101986483719, rotation: 0 } },
    { id: '1762474161043-xmu80sp7t', color: PinColor.YELLOW, position: { x: 34.998702983138784, y: 16.86340364530002, rotation: 0 } },
    { id: '1762474161043-rzv7f6e3w', color: PinColor.YELLOW, position: { x: 4.85603112840467, y: 6.02580380913373, rotation: 0 } },
    { id: '1762474161043-kdy0z0ufx', color: PinColor.BLUE, position: { x: 21.35408560311284, y: 45.61621953716977, rotation: 0 } },
    { id: '1762474161043-4efxuurq2', color: PinColor.BLUE, position: { x: 43.1958495460441, y: 42.00368625844767, rotation: 0 } },
    { id: '1762474161043-sugq06l78', color: PinColor.BLUE, position: { x: 46.72373540856031, y: 25.636698750767973, rotation: 0 } },
    { id: '1762474161043-9hlr1ni3o', color: PinColor.BLUE, position: { x: 46.72373540856031, y: 28.806881015768994, rotation: 0 } },
    { id: '1762474161043-j1hp7jze6', color: PinColor.BLUE, position: { x: 46.67185473411155, y: 31.82961294286299, rotation: 0 } },
    { id: '1762474161043-zpuot8qwq', color: PinColor.BLUE, position: { x: 46.72373540856031, y: 22.68769199262748, rotation: 0 } },
    { id: '1762474161043-k36ypbdjw', color: PinColor.BLUE, position: { x: 46.67185473411155, y: 20.033585910301042, rotation: 0 } },
    { id: '1762474161043-0xuayjavr', color: PinColor.BLUE, position: { x: 46.568093385214006, y: 17.305754659021094, rotation: 0 } },
    { id: '1762474161043-yhbze0m74', color: PinColor.RED, position: { x: 0.9649805447470814, y: 28.954331353676018, rotation: 0 } },
    { id: '1762474161043-d0g9aae9j', color: PinColor.RED, position: { x: 0.9130998702983137, y: 31.75588777390948, rotation: 0 } },
    { id: '1762474161043-p105n4t84', color: PinColor.RED, position: { x: 18.293125810635537, y: 16.86340364530002, rotation: 0 } },
    { id: '1762474161043-s9060i17q', color: PinColor.RED, position: { x: 0.8093385214007784, y: 18.116731517509727, rotation: 0 } },
    { id: '1762474161043-cnoxbqduy', color: PinColor.RED, position: { x: 0.9649805447470814, y: 26.152774933442554, rotation: 0 } },
    { id: '1762474161043-9yofuul6l', color: PinColor.RED, position: { x: 0.8612191958495461, y: 20.697112430882655, rotation: 0 } },
    { id: '1762474161043-m39dctcdc', color: PinColor.RED, position: { x: 0.9130998702983137, y: 23.424943682162603, rotation: 0 } },
  ],
  beams: [
    { id: '1762474161043-gdpbbmsxx', position: { x: 24, y: 9.71206225680934, rotation: 0 } },
    { id: '1762474161043-is49sbuxk', position: { x: 23.94811932555123, y: 31.16608642228138, rotation: 0 } },
  ],
  layoutName: 'Team Match',
};

/**
 * Get the default layout
 * This creates fresh instances with new IDs each time to avoid conflicts
 */
export function getDefaultLayout(): { pins: Pin[]; beams: Beam[] } {
  return {
    pins: DEFAULT_LAYOUT_CONFIG.pins.map(pin => ({
      ...pin,
      id: generateId(), // Generate new ID for each pin
    })),
    beams: DEFAULT_LAYOUT_CONFIG.beams.map(beam => ({
      ...beam,
      id: generateId(), // Generate new ID for each beam
    })),
  };
}

/**
 * Built-in Team Match Default Layout ID
 * This layout is always available and cannot be deleted
 */
export const TEAM_MATCH_DEFAULT_LAYOUT_ID = '__builtin_team_match_default__';

/**
 * Get the built-in Team Match Default layout
 * This creates a FieldLayout object that can be used in the UI
 */
export function getTeamMatchDefaultLayout(): { id: string; name: string; pins: Pin[]; beams: Beam[]; isDefault: boolean; createdAt: string; updatedAt: string } {
  const defaultLayout = getDefaultLayout();
  return {
    id: TEAM_MATCH_DEFAULT_LAYOUT_ID,
    name: 'Team Match Default',
    pins: defaultLayout.pins,
    beams: defaultLayout.beams,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
