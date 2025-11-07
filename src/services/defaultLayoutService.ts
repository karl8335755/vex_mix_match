/**
 * Default Layout Service
 * Manages saving and loading the default layout to/from local storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
// Import legacy API for documentDirectory (SDK 54 still supports it)
import { documentDirectory } from 'expo-file-system/build/legacy/FileSystem';
import { Pin, Beam, FieldLayout } from '../types/models';
import { generateId } from '../utils/routeCalculations';
import { Platform } from 'react-native';

const DEFAULT_LAYOUT_KEY = '@mix_match:default_layout_data';
// Use legacy API for documentDirectory (still available in SDK 54)
const DEFAULT_LAYOUT_FILE_PATH = Platform.OS !== 'web' && documentDirectory
  ? `${documentDirectory}defaultLayout.json`
  : '';

/**
 * Save default layout to local storage
 */
export async function saveDefaultLayout(layout: FieldLayout): Promise<void> {
  try {
    // Save to AsyncStorage for runtime access
    await AsyncStorage.setItem(DEFAULT_LAYOUT_KEY, JSON.stringify({
      pins: layout.pins,
      beams: layout.beams,
      layoutName: layout.name,
      updatedAt: layout.updatedAt,
    }));

    // Also save to a JSON file for persistence (native only - not available on web)
    if (Platform.OS !== 'web' && DEFAULT_LAYOUT_FILE_PATH) {
      await FileSystem.writeAsStringAsync(
        DEFAULT_LAYOUT_FILE_PATH,
        JSON.stringify({
          pins: layout.pins,
          beams: layout.beams,
          layoutName: layout.name,
          updatedAt: layout.updatedAt,
        }, null, 2)
      );
    }

    console.log('✅ Default layout saved:', layout.name);
  } catch (error) {
    console.error('❌ Failed to save default layout:', error);
    throw error;
  }
}

/**
 * Load default layout from local storage
 */
export async function loadDefaultLayout(): Promise<{ pins: Pin[]; beams: Beam[]; layoutName?: string } | null> {
  try {
    // Try AsyncStorage first
    const stored = await AsyncStorage.getItem(DEFAULT_LAYOUT_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        pins: data.pins || [],
        beams: data.beams || [],
        layoutName: data.layoutName,
      };
    }

    // Fallback to file system (native only - not available on web)
    if (Platform.OS !== 'web' && DEFAULT_LAYOUT_FILE_PATH) {
      if (await FileSystem.getInfoAsync(DEFAULT_LAYOUT_FILE_PATH).then(info => info.exists)) {
        const fileContent = await FileSystem.readAsStringAsync(DEFAULT_LAYOUT_FILE_PATH);
        const data = JSON.parse(fileContent);
        return {
          pins: data.pins || [],
          beams: data.beams || [],
          layoutName: data.layoutName,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Failed to load default layout:', error);
    return null;
  }
}

/**
 * Check if default layout exists
 */
export async function hasDefaultLayout(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(DEFAULT_LAYOUT_KEY);
    if (stored) return true;

    // Check file system (native only - not available on web)
    if (Platform.OS !== 'web' && DEFAULT_LAYOUT_FILE_PATH) {
      const fileInfo = await FileSystem.getInfoAsync(DEFAULT_LAYOUT_FILE_PATH);
      return fileInfo.exists;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get default layout with fresh IDs
 */
export function getDefaultLayoutWithFreshIds(pins: Pin[], beams: Beam[]): { pins: Pin[]; beams: Beam[] } {
  return {
    pins: pins.map(pin => ({
      ...pin,
      id: generateId(),
    })),
    beams: beams.map(beam => ({
      ...beam,
      id: generateId(),
    })),
  };
}

