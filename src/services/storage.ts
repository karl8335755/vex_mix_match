/**
 * Storage service for saving/loading routes and strategies
 * Uses AsyncStorage for local persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Strategy, Route, StrategySchema, RouteSchema, FieldLayout, FieldLayoutSchema, Pin, Beam } from '../types/models';

const STORAGE_KEYS = {
  STRATEGIES: '@mix_match:strategies',
  ROUTES: '@mix_match:routes',
  CURRENT_STRATEGY: '@mix_match:current_strategy',
  FIELD_LAYOUTS: '@mix_match:field_layouts',
  DEFAULT_LAYOUT: '@mix_match:default_layout',
  AUTO_SAVE_PINS: '@mix_match:auto_save:pins',
  AUTO_SAVE_BEAMS: '@mix_match:auto_save:beams',
} as const;

/**
 * Storage service for managing routes and strategies
 */
export class StorageService {
  /**
   * Save a strategy
   */
  static async saveStrategy(strategy: Strategy): Promise<void> {
    try {
      const strategies = await this.getAllStrategies();
      const index = strategies.findIndex((s) => s.id === strategy.id);
      
      if (index >= 0) {
        strategies[index] = strategy;
      } else {
        strategies.push(strategy);
      }
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.STRATEGIES,
        JSON.stringify(strategies)
      );
    } catch (error) {
      console.error('Failed to save strategy:', error);
      throw new Error('Failed to save strategy');
    }
  }

  /**
   * Get all saved strategies
   */
  static async getAllStrategies(): Promise<Strategy[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.STRATEGIES);
      if (!data) return [];
      
      const strategies = JSON.parse(data) as Strategy[];
      // Validate with Zod
      return strategies.map((s) => StrategySchema.parse(s));
    } catch (error) {
      console.error('Failed to load strategies:', error);
      return [];
    }
  }

  /**
   * Get a strategy by ID
   */
  static async getStrategy(id: string): Promise<Strategy | null> {
    const strategies = await this.getAllStrategies();
    return strategies.find((s) => s.id === id) || null;
  }

  /**
   * Delete a strategy
   */
  static async deleteStrategy(id: string): Promise<void> {
    try {
      const strategies = await this.getAllStrategies();
      const filtered = strategies.filter((s) => s.id !== id);
      await AsyncStorage.setItem(
        STORAGE_KEYS.STRATEGIES,
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error('Failed to delete strategy:', error);
      throw new Error('Failed to delete strategy');
    }
  }

  /**
   * Save a route (standalone, not part of a strategy)
   */
  static async saveRoute(route: Route): Promise<void> {
    try {
      const routes = await this.getAllRoutes();
      const index = routes.findIndex((r) => r.id === route.id);
      
      if (index >= 0) {
        routes[index] = route;
      } else {
        routes.push(route);
      }
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.ROUTES,
        JSON.stringify(routes)
      );
    } catch (error) {
      console.error('Failed to save route:', error);
      throw new Error('Failed to save route');
    }
  }

  /**
   * Get all saved routes
   */
  static async getAllRoutes(): Promise<Route[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ROUTES);
      if (!data) return [];
      
      const routes = JSON.parse(data) as Route[];
      return routes.map((r) => RouteSchema.parse(r));
    } catch (error) {
      console.error('Failed to load routes:', error);
      return [];
    }
  }

  /**
   * Get a route by ID
   */
  static async getRoute(id: string): Promise<Route | null> {
    const routes = await this.getAllRoutes();
    return routes.find((r) => r.id === id) || null;
  }

  /**
   * Delete a route
   */
  static async deleteRoute(id: string): Promise<void> {
    try {
      const routes = await this.getAllRoutes();
      const filtered = routes.filter((r) => r.id !== id);
      await AsyncStorage.setItem(
        STORAGE_KEYS.ROUTES,
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error('Failed to delete route:', error);
      throw new Error('Failed to delete route');
    }
  }

  /**
   * Set the currently active strategy
   */
  static async setCurrentStrategy(strategyId: string | null): Promise<void> {
    try {
      if (strategyId) {
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STRATEGY, strategyId);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_STRATEGY);
      }
    } catch (error) {
      console.error('Failed to set current strategy:', error);
    }
  }

  /**
   * Get the currently active strategy
   */
  static async getCurrentStrategy(): Promise<Strategy | null> {
    try {
      const id = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_STRATEGY);
      if (!id) return null;
      return await this.getStrategy(id);
    } catch (error) {
      console.error('Failed to get current strategy:', error);
      return null;
    }
  }

  /**
   * Clear all data (useful for reset/debugging)
   */
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.STRATEGIES,
        STORAGE_KEYS.ROUTES,
        STORAGE_KEYS.CURRENT_STRATEGY,
        STORAGE_KEYS.FIELD_LAYOUTS,
        STORAGE_KEYS.DEFAULT_LAYOUT,
      ]);
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw new Error('Failed to clear storage');
    }
  }

  /**
   * Save a field layout
   */
  static async saveFieldLayout(layout: FieldLayout): Promise<void> {
    try {
      console.log('💾 StorageService.saveFieldLayout called with:', {
        id: layout.id,
        name: layout.name,
        pinsCount: layout.pins.length,
        beamsCount: layout.beams.length,
        isDefault: layout.isDefault,
      });
      
      const layouts = await this.getAllFieldLayouts();
      console.log('💾 Existing layouts:', layouts.length);
      
      const index = layouts.findIndex((l) => l.id === layout.id);
      
      if (index >= 0) {
        console.log('💾 Updating existing layout at index:', index);
        layouts[index] = layout;
      } else {
        console.log('💾 Adding new layout');
        layouts.push(layout);
      }
      
      // If this is set as default, unset all other defaults
      if (layout.isDefault) {
        layouts.forEach((l) => {
          if (l.id !== layout.id) {
            l.isDefault = false;
          }
        });
        await AsyncStorage.setItem(STORAGE_KEYS.DEFAULT_LAYOUT, layout.id);
        console.log('💾 Set as default layout:', layout.id);
      }
      
      const dataToSave = JSON.stringify(layouts);
      console.log('💾 Saving to AsyncStorage:', {
        key: STORAGE_KEYS.FIELD_LAYOUTS,
        dataLength: dataToSave.length,
        layoutsCount: layouts.length,
      });
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.FIELD_LAYOUTS,
        dataToSave
      );
      
      // Verify it was saved
      const verify = await AsyncStorage.getItem(STORAGE_KEYS.FIELD_LAYOUTS);
      if (verify) {
        const parsed = JSON.parse(verify);
        console.log('💾 ✅ Verified save successful! Layouts in storage:', parsed.length);
      } else {
        console.error('💾 ❌ Verification failed - no data found after save!');
        throw new Error('Save verification failed');
      }
    } catch (error) {
      console.error('💾 ❌ Failed to save field layout:', error);
      console.error('💾 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(`Failed to save field layout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all saved field layouts
   */
  static async getAllFieldLayouts(): Promise<FieldLayout[]> {
    try {
      console.log('📂 Loading field layouts from:', STORAGE_KEYS.FIELD_LAYOUTS);
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FIELD_LAYOUTS);
      console.log('📂 Raw data from storage:', data ? `Found ${data.length} characters` : 'null');
      
      let layouts: FieldLayout[] = [];
      if (data) {
        const parsed = JSON.parse(data) as FieldLayout[];
        layouts = parsed.map((l) => FieldLayoutSchema.parse(l));
        console.log('📂 Parsed layouts:', layouts.length);
      }

      console.log('📂 ✅ Validated layouts:', layouts.length);
      return layouts;
    } catch (error) {
      console.error('📂 ❌ Failed to load field layouts:', error);
      console.error('📂 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  }

  /**
   * Get a field layout by ID
   */
  static async getFieldLayout(id: string): Promise<FieldLayout | null> {
    const layouts = await this.getAllFieldLayouts();
    return layouts.find((l) => l.id === id) || null;
  }

  /**
   * Get the default field layout
   */
  static async getDefaultFieldLayout(): Promise<FieldLayout | null> {
    try {
      const defaultId = await AsyncStorage.getItem(STORAGE_KEYS.DEFAULT_LAYOUT);
      if (!defaultId) {
        // Try to find any layout marked as default
        const layouts = await this.getAllFieldLayouts();
        return layouts.find((l) => l.isDefault) || null;
      }
      return await this.getFieldLayout(defaultId);
    } catch (error) {
      console.error('Failed to get default field layout:', error);
      return null;
    }
  }

  /**
   * Set default field layout
   */
  static async setDefaultFieldLayout(layoutId: string): Promise<void> {
    try {
      const layouts = await this.getAllFieldLayouts();
      layouts.forEach((l) => {
        l.isDefault = l.id === layoutId;
      });
      
      await AsyncStorage.setItem(STORAGE_KEYS.DEFAULT_LAYOUT, layoutId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.FIELD_LAYOUTS,
        JSON.stringify(layouts)
      );
    } catch (error) {
      console.error('Failed to set default field layout:', error);
      throw new Error('Failed to set default field layout');
    }
  }

  /**
   * Delete a field layout
   */
  static async deleteFieldLayout(id: string): Promise<void> {
    try {
      console.log('🗑️ StorageService.deleteFieldLayout called with id:', id);
      
      const layouts = await this.getAllFieldLayouts();
      console.log('🗑️ Current layouts before delete:', layouts.length);
      
      const filtered = layouts.filter((l) => l.id !== id);
      console.log('🗑️ Layouts after filtering:', filtered.length);
      
      if (filtered.length === layouts.length) {
        console.warn('🗑️ ⚠️ Layout not found - nothing to delete');
      }
      
      // If deleting the default, clear default setting
      const defaultId = await AsyncStorage.getItem(STORAGE_KEYS.DEFAULT_LAYOUT);
      console.log('🗑️ Current default layout ID:', defaultId);
      
      if (defaultId === id) {
        console.log('🗑️ Removing default layout setting');
        await AsyncStorage.removeItem(STORAGE_KEYS.DEFAULT_LAYOUT);
      }
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.FIELD_LAYOUTS,
        JSON.stringify(filtered)
      );
      
      // Verify deletion
      const verify = await AsyncStorage.getItem(STORAGE_KEYS.FIELD_LAYOUTS);
      if (verify) {
        const parsed = JSON.parse(verify);
        console.log('🗑️ ✅ Verified deletion successful! Remaining layouts:', parsed.length);
      } else {
        console.log('🗑️ ✅ Verified deletion successful! No layouts remaining');
      }
    } catch (error) {
      console.error('🗑️ ❌ Failed to delete field layout:', error);
      console.error('🗑️ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(`Failed to delete field layout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Auto-save current pins and beams (temporary storage)
   */
  static async saveAutoSave(pins: Pin[], beams: Beam[]): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.AUTO_SAVE_PINS, JSON.stringify(pins)],
        [STORAGE_KEYS.AUTO_SAVE_BEAMS, JSON.stringify(beams)],
      ]);
    } catch (error) {
      console.error('Failed to auto-save:', error);
      // Don't throw - auto-save failures shouldn't break the app
    }
  }

  /**
   * Load auto-saved pins and beams
   */
  static async getAutoSave(): Promise<{ pins: Pin[]; beams: Beam[] } | null> {
    try {
      const [pinsData, beamsData] = await AsyncStorage.multiGet([
        STORAGE_KEYS.AUTO_SAVE_PINS,
        STORAGE_KEYS.AUTO_SAVE_BEAMS,
      ]);
      
      if (!pinsData[1] && !beamsData[1]) {
        return null; // No auto-save data
      }

      const pins = pinsData[1] ? JSON.parse(pinsData[1]) : [];
      const beams = beamsData[1] ? JSON.parse(beamsData[1]) : [];
      
      return { pins, beams };
    } catch (error) {
      console.error('Failed to load auto-save:', error);
      return null;
    }
  }

  /**
   * Clear auto-save (call after successful save)
   */
  static async clearAutoSave(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTO_SAVE_PINS,
        STORAGE_KEYS.AUTO_SAVE_BEAMS,
      ]);
    } catch (error) {
      console.error('Failed to clear auto-save:', error);
    }
  }
}

