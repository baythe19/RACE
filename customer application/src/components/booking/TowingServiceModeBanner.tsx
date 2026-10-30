import React from 'react';
import { Text, View } from 'react-native';
import { AlertTriangle, Calendar, Zap } from 'lucide-react-native';

import type { TowingServiceModeId } from '../../types/towingBooking';
import type { BookingTheme } from './bookingTheme';
import { colors, typography } from '../../theme';

const CARD_OUTLINE = '#E7E5E4';

const MODE_META: Record<
  TowingServiceModeId,
  { title: string; hint: string; Icon: typeof Zap; accent: string }
> = {
  instant: {
    title: 'Instant towing',
    hint: 'Normal dispatch · standard ETA',
    Icon: Zap,
    accent: colors.primary,
  },
  scheduled: {
    title: 'Scheduled towing',
    hint: 'Book for later · date on step 1',
    Icon: Calendar,
    accent: '#0284C7',
  },
  emergency: {
    title: 'Emergency towing',
    hint: 'Priority queue · accident / breakdown',
    Icon: AlertTriangle,
    accent: colors.error,
  },
};

type Props = {
  mode: TowingServiceModeId;
  t: BookingTheme;
};

/** Shows which towing *service tier* is active (not tow-truck type or vehicle reg). */
export default function TowingServiceModeBanner({ mode, t }: Props) {
  const meta = MODE_META[mode] ?? MODE_META.instant;
  const Icon = meta.Icon;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.px(10),
        borderRadius: t.px(14),
        borderWidth: 1,
        borderColor: CARD_OUTLINE,
        backgroundColor: colors.background,
        paddingHorizontal: t.px(12),
        paddingVertical: t.px(10),
        marginBottom: t.px(8),
      }}>
      <Icon size={t.px(18)} color={meta.accent} strokeWidth={2.4} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: t.px(12),
            fontWeight: typography.weights.bold,
            color: colors.dark,
          }}
          numberOfLines={1}>
          {meta.title}
        </Text>
        <Text
          style={{
            fontSize: t.px(11),
            color: colors.grey,
            marginTop: t.px(1),
          }}
          numberOfLines={2}>
          {meta.hint}
        </Text>
      </View>
    </View>
  );
}

/** Short label for wizard header tag (right of title). */
export function getTowingServiceModeHeaderTag(mode: TowingServiceModeId): string {
  if (mode === 'scheduled') return 'Scheduled';
  if (mode === 'emergency') return 'Emergency';
  return 'Instant';
}

export type TowingHeaderTagVariant = 'instant' | 'scheduled' | 'emergency';

export function getTowingServiceModeHeaderTagVariant(mode: TowingServiceModeId): TowingHeaderTagVariant {
  if (mode === 'scheduled') return 'scheduled';
  if (mode === 'emergency') return 'emergency';
  return 'instant';
}

export function getTowingServiceModeHeaderIcon(mode: TowingServiceModeId): typeof Zap {
  return (MODE_META[mode] ?? MODE_META.instant).Icon;
}

export function towingServiceTimingLabel(
  mode: TowingServiceModeId,
  dateLabel: string,
  timeLabel: string,
): string {
  if (mode === 'instant') return 'Now · dispatched immediately';
  if (mode === 'emergency') return 'Priority · nearest tow ASAP';
  return `${dateLabel}, ${timeLabel}`;
}
