import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { RouteManeuverStep } from '../../../services/driver/roadRoutingService';
import { formatManeuverDistance } from '../../../services/driver/tripNavigation';
import ManeuverIcon from './ManeuverIcon';

/**
 * Google-Maps-style "Steps" list: every manoeuvre of the leg with its icon,
 * instruction and the distance driven before the next one.
 */
export default function DirectionsList({
  steps,
  maxItems = 40,
}: {
  steps: RouteManeuverStep[];
  maxItems?: number;
}) {
  if (steps.length === 0) return null;
  return (
    <View>
      {steps.slice(0, maxItems).map((step, index) => (
        <View
          key={step.id}
          style={[styles.row, index === 0 && styles.firstRow]}
          accessibilityLabel={`${step.instruction}${
            step.distanceMeters ? `, ${formatManeuverDistance(step.distanceMeters)}` : ''
          }`}>
          <View style={styles.iconWrap}>
            <ManeuverIcon type={step.maneuverType} size={16} color="#0F172A" />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.instruction} numberOfLines={2}>
              {step.instruction}
            </Text>
            {step.distanceMeters > 0 && step.maneuverType !== 'arrive' ? (
              <Text style={styles.distance}>{formatManeuverDistance(step.distanceMeters)}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  firstRow: {
    borderTopWidth: 0,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    marginLeft: 12,
  },
  instruction: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 18,
  },
  distance: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
});
