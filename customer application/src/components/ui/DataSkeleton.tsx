import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../theme';

export type DataSkeletonVariant = 'list' | 'cards' | 'detail' | 'profile' | 'wallet';

function Bone({
  width = '100%',
  height = 12,
  radius = 8,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: object;
}) {
  return (
    <View style={[styles.bone, { width, height, borderRadius: radius }, style]} />
  );
}

function Row({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Pulsing placeholders shown only before the first real response. */
export default function DataSkeleton({
  variant = 'list',
  testID,
}: {
  variant?: DataSkeletonVariant;
  testID?: string;
}) {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  let content: React.ReactNode;
  if (variant === 'profile') {
    content = (
      <>
        <Card>
          <Row>
            <Bone width={56} height={56} radius={28} />
            <View style={styles.textGroup}>
              <Bone width="62%" height={16} />
              <Bone width="44%" height={11} />
            </View>
          </Row>
          <Bone width="100%" height={52} radius={12} style={styles.spacedMd} />
        </Card>
        <Card>
          {[0, 1, 2, 3].map(index => (
            <Row key={index} style={styles.menuRow}>
              <Bone width={36} height={36} radius={18} />
              <View style={styles.textGroup}>
                <Bone width={index % 2 ? '48%' : '60%'} height={13} />
                <Bone width="78%" height={9} />
              </View>
              <Bone width={14} height={14} radius={7} />
            </Row>
          ))}
        </Card>
      </>
    );
  } else if (variant === 'detail') {
    content = (
      <>
        <Card>
          <Bone width="42%" height={11} />
          <Bone width="68%" height={18} style={styles.spacedSm} />
          <Bone width="52%" height={11} style={styles.spacedMd} />
        </Card>
        <Card>
          <Bone width="36%" height={12} />
          <Bone width="92%" height={12} style={styles.spacedMd} />
          <Bone width="78%" height={12} style={styles.spacedSm} />
          <Bone width="64%" height={12} style={styles.spacedSm} />
        </Card>
        <Card>
          <Row>
            <Bone width={42} height={42} radius={21} />
            <View style={styles.textGroup}>
              <Bone width="55%" height={14} />
              <Bone width="72%" height={10} />
            </View>
            <Bone width={40} height={40} radius={20} />
          </Row>
        </Card>
        <Bone width="100%" height={48} radius={12} style={styles.spacedMd} />
      </>
    );
  } else if (variant === 'wallet') {
    content = (
      <>
        <Bone width="100%" height={110} radius={16} />
        <Bone width="40%" height={14} style={styles.spacedLg} />
        {[0, 1].map(index => (
          <Card key={index} style={styles.spacedSm}>
            <Row>
              <Bone width={22} height={22} radius={6} />
              <View style={styles.textGroup}>
                <Bone width="48%" height={13} />
                <Bone width="64%" height={10} />
              </View>
              <Bone width={18} height={18} radius={4} />
            </Row>
          </Card>
        ))}
      </>
    );
  } else if (variant === 'cards') {
    content = (
      <>
        {[0, 1, 2].map(index => (
          <Card key={index} style={styles.spacedSm}>
            <Row style={styles.spaceBetween}>
              <Bone width={88} height={18} radius={6} />
              <Bone width={72} height={18} radius={6} />
            </Row>
            <Bone width="58%" height={14} style={styles.spacedSm} />
            <Bone width="82%" height={11} style={styles.spacedXs} />
            <Bone width="100%" height={40} radius={10} style={styles.spacedMd} />
          </Card>
        ))}
      </>
    );
  } else {
    content = (
      <>
        {[0, 1, 2, 3].map(index => (
          <Card key={index} style={styles.listCard}>
            <Row>
              <Bone width={42} height={42} radius={21} />
              <View style={styles.textGroup}>
                <Bone width={index % 2 ? '52%' : '66%'} height={13} />
                <Bone width="84%" height={10} style={styles.spacedXs} />
                <Bone width="40%" height={9} style={styles.spacedXs} />
              </View>
              <Bone width={54} height={20} radius={10} />
            </Row>
          </Card>
        ))}
      </>
    );
  }

  return (
    <Animated.View
      testID={testID ?? `dataSkeleton-${variant}`}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={[styles.container, { opacity }]}>
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  bone: {
    backgroundColor: '#EDEFF2',
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textGroup: {
    flex: 1,
    gap: 7,
  },
  listCard: {
    minHeight: 74,
    justifyContent: 'center',
  },
  menuRow: {
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  spacedXs: { marginTop: 4 },
  spacedSm: { marginTop: 8 },
  spacedMd: { marginTop: 12 },
  spacedLg: { marginTop: 18 },
});
