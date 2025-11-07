/**
 * Comparison View Component
 * Shows multiple routes side-by-side for comparison
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InteractiveField } from './InteractiveField';
import { Route } from '../types/models';
import { formatTime } from '../utils/formatters';

interface ComparisonViewProps {
  routes: Route[];
  onBack: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPARISON_FIELD_SIZE = (SCREEN_WIDTH - 48) / 2; // Two fields side by side

export const ComparisonView: React.FC<ComparisonViewProps> = ({ routes, onBack }) => {
  const [selectedRoutes, setSelectedRoutes] = useState<Route[]>(
    routes.slice(0, Math.min(2, routes.length))
  );

  const toggleRoute = (route: Route) => {
    if (selectedRoutes.find((r) => r.id === route.id)) {
      // Remove route
      setSelectedRoutes(selectedRoutes.filter((r) => r.id !== route.id));
    } else {
      // Add route (max 2 for side-by-side comparison)
      if (selectedRoutes.length < 2) {
        setSelectedRoutes([...selectedRoutes, route]);
      } else {
        // Replace first route
        setSelectedRoutes([selectedRoutes[1], route]);
      }
    }
  };

  const renderComparisonFields = () => {
    if (selectedRoutes.length === 0) {
      return (
        <View style={styles.emptyComparison}>
          <Text style={styles.emptyText}>Select routes to compare</Text>
        </View>
      );
    }

    if (selectedRoutes.length === 1) {
      return (
        <View style={styles.singleFieldContainer}>
          <View style={styles.fieldWrapper}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldTitle}>{selectedRoutes[0].name}</Text>
              <Text style={styles.fieldStats}>
                {selectedRoutes[0].waypoints.length} waypoints • {formatTime(selectedRoutes[0].estimatedTime)} • {selectedRoutes[0].estimatedScore} pts
              </Text>
            </View>
            <View style={styles.fieldContainer}>
              <InteractiveField
                waypoints={selectedRoutes[0].waypoints}
                onWaypointAdd={() => {}}
                onWaypointMove={() => {}}
                onWaypointRemove={() => {}}
                fieldWidth={48}
                fieldHeight={48}
                containerStyle={{ width: SCREEN_WIDTH - 64 }}
              />
            </View>
          </View>
        </View>
      );
    }

    // Two routes side-by-side
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.comparisonContainer}>
          {selectedRoutes.map((route, index) => (
            <View key={route.id} style={styles.fieldWrapper}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldTitle}>{route.name}</Text>
                <Text style={styles.fieldStats}>
                  {route.waypoints.length} waypoints • {formatTime(route.estimatedTime)} • {route.estimatedScore} pts
                </Text>
              </View>
              <View style={styles.fieldContainer}>
                <InteractiveField
                  waypoints={route.waypoints}
                  onWaypointAdd={() => {}}
                  onWaypointMove={() => {}}
                  onWaypointRemove={() => {}}
                  fieldWidth={48}
                  fieldHeight={48}
                  containerStyle={{ width: COMPARISON_FIELD_SIZE }}
                />
              </View>
              {index === 0 && (
                <View style={styles.vsBadge}>
                  <Text style={styles.vsText}>VS</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderComparisonStats = () => {
    if (selectedRoutes.length !== 2) return null;

    const [route1, route2] = selectedRoutes;
    const timeDiff = route1.estimatedTime - route2.estimatedTime;
    const scoreDiff = route1.estimatedScore - route2.estimatedScore;
    const waypointDiff = route1.waypoints.length - route2.waypoints.length;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Comparison</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Time Difference</Text>
            <Text style={[styles.statValue, timeDiff > 0 ? styles.statWorse : styles.statBetter]}>
              {timeDiff > 0 ? '+' : ''}{formatTime(Math.abs(timeDiff))}
            </Text>
            <Text style={styles.statNote}>
              {route1.name} is {Math.abs(timeDiff)}s {timeDiff > 0 ? 'slower' : 'faster'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Score Difference</Text>
            <Text style={[styles.statValue, scoreDiff > 0 ? styles.statBetter : styles.statWorse]}>
              {scoreDiff > 0 ? '+' : ''}{scoreDiff}
            </Text>
            <Text style={styles.statNote}>
              {route1.name} scores {Math.abs(scoreDiff)} more points
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Waypoints</Text>
            <Text style={styles.statValue}>
              {route1.waypoints.length} vs {route2.waypoints.length}
            </Text>
            <Text style={styles.statNote}>
              {waypointDiff > 0 ? route1.name : route2.name} has {Math.abs(waypointDiff)} more waypoints
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Route Comparison</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Comparison Fields */}
        {renderComparisonFields()}

        {/* Comparison Stats */}
        {renderComparisonStats()}

        {/* Route Selection */}
        <View style={styles.selectionSection}>
          <Text style={styles.sectionTitle}>Select Routes to Compare (max 2)</Text>
          <View style={styles.routeList}>
            {routes.map((route) => {
              const isSelected = selectedRoutes.find((r) => r.id === route.id);
              return (
                <TouchableOpacity
                  key={route.id}
                  style={[
                    styles.routeSelectCard,
                    isSelected && styles.routeSelectCardActive,
                  ]}
                  onPress={() => toggleRoute(route)}
                >
                  <View style={styles.routeSelectContent}>
                    <Text style={[
                      styles.routeSelectName,
                      isSelected && styles.routeSelectNameActive,
                    ]}>
                      {route.name}
                    </Text>
                    <Text style={styles.routeSelectStats}>
                      {route.waypoints.length} waypoints • {formatTime(route.estimatedTime)} • {route.estimatedScore} pts
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  comparisonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  singleFieldContainer: {
    padding: 16,
    alignItems: 'center',
  },
  fieldWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    minWidth: SCREEN_WIDTH - 32,
  },
  fieldHeader: {
    marginBottom: 12,
    alignItems: 'center',
  },
  fieldTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  fieldStats: {
    fontSize: 14,
    color: '#6b7280',
  },
  fieldContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ef4444',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  vsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyComparison: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsRow: {
    gap: 12,
  },
  statItem: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statBetter: {
    color: '#10b981',
  },
  statWorse: {
    color: '#ef4444',
  },
  statNote: {
    fontSize: 12,
    color: '#9ca3af',
  },
  selectionSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  routeList: {
    gap: 8,
  },
  routeSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    backgroundColor: '#f9fafb',
  },
  routeSelectCardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  routeSelectContent: {
    flex: 1,
  },
  routeSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  routeSelectNameActive: {
    color: '#2563eb',
  },
  routeSelectStats: {
    fontSize: 14,
    color: '#6b7280',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

