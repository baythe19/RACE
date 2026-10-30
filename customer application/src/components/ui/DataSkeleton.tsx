import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../theme';

export type DataSkeletonVariant =
  | 'list'
  | 'cards'
  | 'detail'
  | 'profile'
  | 'wallet'
  | 'home'
  | 'services'
  | 'bookings'
  | 'bookingDetail';

/**
 * Shared shimmer driver. One looping translateX value breathes life into every
 * bone on the screen — children read it through `useAnimatedBone()` so all
 * placeholders shimmer in sync (cheaper than N loops, and it looks intentional).
 */
const ShimmerContext = React.createContext<Animated.Value | null>(null);

function useShimmerDriver(): Animated.Value {
  const translateX = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [translateX]);
  return translateX;
}

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
  const translateX = React.useContext(ShimmerContext);
  // Highlight sweep sits above the base bone; distance is oversized so the
  // shine fully exits before wrapping around.
  return (
    <View
      style={[styles.bone, { width, height, borderRadius: radius }, style]}>
      {translateX ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.boneShine,
            { transform: [{ translateX: Animated.multiply(translateX, 240) }] },
          ]}
        />
      ) : null}
    </View>
  );
}

function Row({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Section heading bone (matches 19px extrabold section titles). */
function SectionTitle({ width = '42%' }: { width?: number | `${number}%` }) {
  return <Bone width={width} height={18} radius={7} style={styles.sectionTitle} />;
}

/** Status pill — matches the small bold rounded chips on cards. */
function StatusPill({ width = 64, tone = 'success' }: { width?: number; tone?: 'success' | 'grey' | 'gold' }) {
  const bg = tone === 'success' ? '#E8F8EE' : tone === 'gold' ? '#FEF3C7' : '#F3F4F6';
  return (
    <View style={[styles.pillWrap, { backgroundColor: bg }]}>
      <Bone width={width} height={9} radius={4} />
    </View>
  );
}

/** Pulsing placeholders shown only before the first real response. */
export default function DataSkeleton({
  variant = 'list',
  testID,
}: {
  variant?: DataSkeletonVariant;
  testID?: string;
}) {
  const translateX = useShimmerDriver();
  const content = useMemo(() => renderVariant(variant), [variant]);

  return (
    <ShimmerContext.Provider value={translateX}>
      <Animated.View
        testID={testID ?? `dataSkeleton-${variant}`}
        accessibilityLabel="Loading"
        accessibilityRole="progressbar"
        style={[styles.container, { opacity: 0.95 }]}>
        {content}
      </Animated.View>
    </ShimmerContext.Provider>
  );
}

function renderVariant(variant: DataSkeletonVariant): React.ReactNode {
  if (variant === 'home') {
    // Matches HomeScreen: greeting block → curved 24/7 card → Our Services
    // (4 tiles) → Popular Services (header + 2×2 grid).
    return (
      <>
        {/* Greeting */}
        <Bone width="48%" height={24} radius={8} />
        <Bone width="62%" height={30} radius={9} style={styles.spacedXs} />
        <Bone width="34%" height={13} radius={6} style={styles.spacedSm} />
        {/* Curved roadside card */}
        <View style={[styles.heroCard, styles.spacedLg]}>
          <Bone width={64} height={26} radius={7} />
          <Bone width="72%" height={18} radius={7} style={styles.spacedSm} />
          <Bone width="58%" height={11} radius={5} style={styles.spacedXs} />
          <View style={[styles.heroCta, styles.spacedMd]}>
            <Bone width="46%" height={13} radius={6} />
          </View>
        </View>
        {/* Our Services tiles */}
        <SectionTitle width="34%" />
        <Row style={[styles.spacedSm, { gap: 8 }]}>
          {[0, 1, 2, 3].map(index => (
            <View key={index} style={[styles.serviceTile, styles.cardBordered]}>
              <Bone width={46} height={46} radius={14} />
              <Bone width="72%" height={10} radius={5} style={[styles.spacedSm, styles.selfCenter]} />
            </View>
          ))}
        </Row>
        {/* Popular services 2×2 grid */}
        <Row style={[styles.spaceBetween, styles.spacedLg]}>
          <Bone width="44%" height={18} radius={7} />
          <Bone width={56} height={13} radius={5} />
        </Row>
        <View style={styles.popularGrid}>
          {[0, 1, 2, 3].map(index => (
            <View key={index} style={[styles.popularCard, styles.cardBordered]}>
              <Bone width="58%" height={58} radius={12} style={styles.selfCenter} />
              <Bone width="76%" height={12} radius={6} style={styles.spacedSm} />
              <Bone width="44%" height={10} radius={5} style={styles.spacedXs} />
            </View>
          ))}
        </View>
      </>
    );
  }

  if (variant === 'services') {
    // Matches ServiceListScreen: category hero → service item cards
    // (left accent stripe + label + two-line description + chevron).
    return (
      <>
        <View style={[styles.categoryHero, styles.spacedXs]}>
          <Bone width={56} height={56} radius={16} />
          <Bone width="52%" height={17} radius={7} style={[styles.spacedSm, styles.selfCenter]} />
          <Bone width="78%" height={11} radius={5} style={[styles.spacedXs, styles.selfCenter]} />
        </View>
        {[0, 1, 2, 3, 4].map(index => (
          <View key={index} style={[styles.serviceItem, styles.cardBordered, styles.spacedSm]}>
            <View style={styles.accentStripe} />
            <View style={[styles.dot, { backgroundColor: '#EDEFF2' }]} />
            <View style={styles.textGroup}>
              <Bone width={index % 2 ? '56%' : '68%'} height={14} radius={6} />
              <Bone width="86%" height={10} radius={5} style={styles.spacedXs} />
              <Bone width={index % 2 ? '70%' : '58%'} height={10} radius={5} style={styles.spacedXs} />
            </View>
            <Bone width={10} height={16} radius={4} />
          </View>
        ))}
      </>
    );
  }

  if (variant === 'bookings') {
    // Matches BookingsScreen: tab pills → ActiveBookingCard (ID + status pill,
    // service row, two route lines, driver, actions) → history rows.
    return (
      <>
        <Row style={[styles.spacedXs, { gap: 6, marginBottom: 12, justifyContent: 'center' }]}>
          <Bone width={44} height={28} radius={6} />
          <Bone width={68} height={28} radius={6} />
          <Bone width={48} height={28} radius={6} />
          <Bone width={58} height={28} radius={6} />
          <Bone width={54} height={28} radius={6} />
        </Row>
        {[0, 1].map(index => (
          <Card key={index} style={styles.spacedSm}>
            <Row style={styles.spaceBetween}>
              <Bone width={96} height={12} radius={5} />
              <StatusPill width={58} />
            </Row>
            <Row style={styles.spacedSm}>
              <Bone width={28} height={28} radius={8} />
              <Bone width="58%" height={14} radius={6} />
            </Row>
            <View style={[styles.routeGroup, styles.spacedSm]}>
              <Row style={{ gap: 8 }}>
                <Bone width={6} height={6} radius={3} />
                <Bone width="78%" height={11} radius={5} />
              </Row>
              <Row style={{ gap: 8 }}>
                <Bone width={6} height={6} radius={3} />
                <Bone width="64%" height={11} radius={5} />
              </Row>
            </View>
            <Row style={[styles.spacedSm, { marginTop: 10 }]}>
              <Bone width={28} height={28} radius={14} />
              <Bone width="44%" height={11} radius={5} />
            </Row>
          </Card>
        ))}
        {[0, 1, 2].map(index => (
          <View key={`h-${index}`} style={[styles.historyRow, styles.cardBordered, styles.spacedSm]}>
            <Bone width={40} height={40} radius={10} />
            <View style={styles.textGroup}>
              <Bone width="62%" height={13} radius={6} />
              <Bone width="42%" height={10} radius={5} style={styles.spacedXs} />
              <Bone width="74%" height={10} radius={5} style={styles.spacedXs} />
            </View>
            <View style={styles.historyRight}>
              <StatusPill width={50} tone="grey" />
              <Bone width={44} height={13} radius={5} style={[styles.spacedXs, styles.selfEnd]} />
            </View>
          </View>
        ))}
      </>
    );
  }

  if (variant === 'bookingDetail') {
    // Matches BookingDetailScreen: booking-ID strip → service chips card →
    // trip route (dots + two addresses) → driver row → fare summary → CTA.
    return (
      <>
        {/* Booking ID strip */}
        <View style={[styles.strip, styles.cardBordered]}>
          <View style={styles.textGroup}>
            <Bone width={64} height={9} radius={4} />
            <Bone width="52%" height={14} radius={6} style={styles.spacedXs} />
          </View>
          <Bone width={64} height={11} radius={5} />
        </View>
        {/* Service card with meta chips */}
        <Card style={styles.spacedSm}>
          <Bone width="48%" height={15} radius={6} />
          <Row style={[styles.spacedSm, { gap: 6, flexWrap: 'wrap' }]}>
            {[0, 1, 2, 3].map(index => (
              <View key={index} style={styles.metaChip}>
                <Bone width={index % 2 ? 54 : 66} height={10} radius={4} />
              </View>
            ))}
          </Row>
        </Card>
        {/* Trip route */}
        <Card style={styles.spacedSm}>
          <Bone width="34%" height={13} radius={6} />
          <Row style={[styles.spacedSm, { alignItems: 'stretch', gap: 12 }]}>
            <View style={styles.routeDots}>
              <Bone width={28} height={28} radius={14} />
              <View style={styles.routeLine} />
              <Bone width={28} height={28} radius={14} />
            </View>
            <View style={[styles.textGroup, { justifyContent: 'space-between', paddingVertical: 2 }]}>
              <View>
                <Bone width={44} height={9} radius={4} />
                <Bone width="82%" height={12} radius={5} style={styles.spacedXs} />
              </View>
              <View>
                <Bone width={52} height={9} radius={4} />
                <Bone width="68%" height={12} radius={5} style={styles.spacedXs} />
              </View>
            </View>
          </Row>
        </Card>
        {/* Driver */}
        <Card style={styles.spacedSm}>
          <Bone width="30%" height={13} radius={6} />
          <Row style={styles.spacedSm}>
            <Bone width={40} height={40} radius={20} />
            <View style={styles.textGroup}>
              <Bone width="46%" height={13} radius={6} />
              <Bone width="72%" height={10} radius={5} style={styles.spacedXs} />
            </View>
            <Bone width={40} height={40} radius={20} />
          </Row>
        </Card>
        {/* Fare summary */}
        <Card style={styles.spacedSm}>
          <Row style={{ gap: 6 }}>
            <Bone width={14} height={14} radius={7} />
            <Bone width="38%" height={13} radius={6} />
          </Row>
          {[0, 1, 2, 3].map(index => (
            <Row key={index} style={[styles.spaceBetween, styles.fareRow]}>
              <Bone width={index % 2 ? '44%' : '56%'} height={11} radius={5} />
              <Bone width={44} height={11} radius={5} />
            </Row>
          ))}
          <View style={styles.divider} />
          <Row style={styles.spaceBetween}>
            <Bone width="20%" height={13} radius={6} />
            <Bone width={56} height={16} radius={6} />
          </Row>
        </Card>
        {/* CTA */}
        <Bone width="100%" height={48} radius={14} style={[styles.spacedLg, styles.selfCenter]} />
      </>
    );
  }

  if (variant === 'profile') {
    return (
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
  }

  if (variant === 'detail') {
    return (
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
  }

  if (variant === 'wallet') {
    return (
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
  }

  if (variant === 'cards') {
    return (
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
  }

  // list (default)
  return (
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

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  bone: {
    backgroundColor: '#EDEFF2',
    overflow: 'hidden',
  },
  boneShine: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    left: -180,
    width: 120,
    backgroundColor: '#FFFFFF',
    opacity: 0.55,
    transform: [{ rotate: '12deg' }],
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  cardBordered: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
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
  selfCenter: { alignSelf: 'center' },
  selfEnd: { alignSelf: 'flex-end' },
  spacedXs: { marginTop: 4 },
  spacedSm: { marginTop: 8 },
  spacedMd: { marginTop: 12 },
  spacedLg: { marginTop: 18 },
  sectionTitle: { marginBottom: 2 },

  // home
  heroCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 18,
    minHeight: 168,
  },
  heroCta: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FDF0D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTile: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginTop: 12,
  },
  popularCard: {
    width: '48.5%',
    height: 128,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'flex-end',
  },

  // services
  categoryHero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFF9EC',
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    overflow: 'hidden',
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#EDEFF2',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },

  // bookings
  routeGroup: { gap: 5 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  historyRight: { alignItems: 'flex-end', flexShrink: 0 },
  pillWrap: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  // booking detail
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  routeDots: { alignItems: 'center', width: 28 },
  routeLine: {
    width: 2,
    flex: 1,
    minHeight: 18,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  fareRow: { marginTop: 10 },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: 10,
  },
});
