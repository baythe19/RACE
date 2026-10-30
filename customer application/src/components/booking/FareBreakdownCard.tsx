import React from 'react';
import { Text, View } from 'react-native';

import type { DriverFareBreakdown, TowingFareBreakdown } from '../../types/fare';
import { getVehicleCategoryLabel } from '../../utils/vehicleCategory';
import { formatRupee } from '../../utils/towingPricing';
import { colors, typography } from '../../theme';

interface FareLineProps {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
  fontSize?: number;
}

function FareLine({ label, value, bold, accent, fontSize = 14 }: FareLineProps) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text
        style={{
          fontSize,
          fontWeight: bold ? typography.weights.bold : typography.weights.regular,
          color: bold ? colors.dark : colors.grey,
        }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize,
          fontWeight: typography.weights.semibold,
          color: accent ?? colors.dark,
        }}>
        {value}
      </Text>
    </View>
  );
}

interface TowingFareBreakdownCardProps {
  breakdown: TowingFareBreakdown;
  accentColor?: string;
  compact?: boolean;
}

export function TowingFareBreakdownCard({
  breakdown,
  accentColor = '#F59E0B',
  compact = false,
}: TowingFareBreakdownCardProps) {
  const padding = compact ? 12 : 16;
  const gap = compact ? 6 : 10;

  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        padding,
        gap,
      }}>
      <Text
        style={{
          fontSize: compact ? 13 : 15,
          fontWeight: typography.weights.semibold,
          color: colors.dark,
        }}>
        Fare
      </Text>

      {breakdown.isFallback ? (
        <Text style={{ fontSize: 12, color: colors.grey }}>
          Distance unavailable — flat estimate applied
        </Text>
      ) : null}

      <FareLine label="Base fare" value={formatRupee(breakdown.baseFare)} />
      <FareLine
        label="Distance"
        value={breakdown.distanceKm > 0 ? `${breakdown.distanceKm} km` : '—'}
      />
      {breakdown.extraKmCharge > 0 ? (
        <FareLine label="Extra km charge" value={formatRupee(breakdown.extraKmCharge)} />
      ) : null}
      {breakdown.nightSurcharge > 0 ? (
        <FareLine label="Night surcharge" value={formatRupee(breakdown.nightSurcharge)} />
      ) : null}
      {breakdown.prioritySurcharge ? (
        <FareLine label="Emergency priority" value={formatRupee(breakdown.prioritySurcharge)} />
      ) : null}
      {breakdown.scheduledDiscount ? (
        <FareLine
          label="Scheduled booking"
          value={`−${formatRupee(breakdown.scheduledDiscount)}`}
        />
      ) : null}

      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: compact ? 8 : 10, gap: gap }}>
        <FareLine label="Total" value={formatRupee(breakdown.totalFare)} bold fontSize={compact ? 13 : 14} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FFFBEB',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: compact ? 6 : 8,
          }}>
          <Text style={{ fontSize: compact ? 12 : 13, fontWeight: typography.weights.semibold, color: colors.dark }}>
            Pay now · 30%
          </Text>
          <Text style={{ fontSize: compact ? 14 : 15, fontWeight: typography.weights.bold, color: accentColor }}>
            {formatRupee(breakdown.advanceAmount)}
          </Text>
        </View>
        <FareLine
          label="Pay later · 70%"
          value={formatRupee(breakdown.remainingAmount)}
          fontSize={compact ? 12 : 14}
        />
      </View>
    </View>
  );
}

interface DriverFareBreakdownCardProps {
  breakdown: DriverFareBreakdown;
  accentColor?: string;
  compact?: boolean;
}

export function DriverFareBreakdownCard({
  breakdown,
  accentColor = '#F59E0B',
  compact = false,
}: DriverFareBreakdownCardProps) {
  const padding = compact ? 14 : 16;
  const category =
    breakdown.vehicleCategory in { hatchback: 1, sedan: 1, suv: 1 }
      ? getVehicleCategoryLabel(breakdown.vehicleCategory as 'hatchback' | 'sedan' | 'suv')
      : breakdown.vehicleCategory;

  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        padding,
        gap: compact ? 8 : 10,
      }}>
      <Text
        style={{
          fontSize: compact ? 14 : 15,
          fontWeight: typography.weights.semibold,
          color: colors.dark,
        }}>
        Fare
      </Text>

      <FareLine label="Package" value={`${breakdown.packageHours} hours`} />
      <FareLine label="Included" value={`${breakdown.includedKm} km`} />
      <FareLine label="Vehicle" value={category} />

      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 8 }}>
        <FareLine label="Total" value={formatRupee(breakdown.totalFare)} bold />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FEF3C7',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}>
          <Text style={{ fontSize: 14, fontWeight: typography.weights.semibold, color: colors.dark }}>
            Pay now · 30%
          </Text>
          <Text style={{ fontSize: 16, fontWeight: typography.weights.bold, color: accentColor }}>
            {formatRupee(breakdown.advanceAmount)}
          </Text>
        </View>
        <FareLine label="Pay later · 70%" value={formatRupee(breakdown.remainingAmount)} />
      </View>
    </View>
  );
}
