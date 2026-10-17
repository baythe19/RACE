import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

type SkeletonVariant = 'dashboard' | 'active-job' | 'verification' | 'notifications' | 'earnings' | 'bank' | 'history' | 'profile';

function Bone({ width = '100%', height = 12, radius = 7, style }: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: object;
}) {
  return <View style={[styles.bone, { width, height, borderRadius: radius }, style]} />;
}

function Row({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Low-cost pulsing placeholders used only before the first real response. */
export default function DriverDataSkeleton({
  variant,
  testID,
}: {
  variant: SkeletonVariant;
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
  if (variant === 'dashboard') {
    content = <>
      <Bone width="54%" height={21} />
      <Bone width="72%" height={12} style={styles.spacedSm} />
      <Card style={styles.dashboardStatus}><Row><Bone width={40} height={40} radius={20} /><View style={styles.textGroup}><Bone width="58%" /><Bone width="82%" style={styles.spacedXs} /></View><Bone width={66} height={30} radius={16} /></Row></Card>
      <Card style={styles.dashboardMetrics}><Row style={styles.spaceBetween}><Bone width="35%" /><Bone width="24%" /></Row><Bone width="46%" height={28} style={styles.spacedMd} /><Bone width="100%" height={62} radius={12} style={styles.spacedMd} /></Card>
      <Card><Bone width="42%" /><Row style={styles.spacedMd}><Bone width={38} height={38} radius={12} /><View style={styles.textGroup}><Bone width="68%" /><Bone width="88%" style={styles.spacedXs} /></View></Row><Row style={styles.spacedSm}><Bone width={38} height={38} radius={12} /><View style={styles.textGroup}><Bone width="56%" /><Bone width="76%" style={styles.spacedXs} /></View></Row></Card>
    </>;
  } else if (variant === 'active-job') {
    content = <><Row style={styles.activeHeader}><Bone width={24} height={24} radius={12} /><View style={styles.textGroup}><Bone width="40%" /><Bone width="24%" height={9} /></View><Bone width={20} height={20} radius={10} /></Row><Bone height={220} radius={18} /><Card style={styles.spacedMd}><Bone width="48%" /><Bone width="76%" style={styles.spacedMd} /><Bone width="88%" style={styles.spacedSm} /><Bone width="65%" style={styles.spacedSm} /></Card><Bone height={48} radius={14} style={styles.spacedMd} /></>;
  } else if (variant === 'verification') {
    content = <><Card style={styles.centerCard}><Bone width={58} height={58} radius={29} /><Bone width="64%" height={18} style={styles.spacedMd} /><Bone width="88%" style={styles.spacedSm} /><Bone width="74%" style={styles.spacedXs} /></Card><Card><Bone width="42%" /><Bone width="92%" style={styles.spacedMd} /><Bone width="78%" style={styles.spacedSm} /></Card><Bone height={46} radius={14} style={styles.spacedMd} /></>;
  } else if (variant === 'earnings') {
    content = <><Card style={styles.hero}><Bone width="45%" /><Bone width="54%" height={30} style={styles.spacedMd} /><Bone width="78%" style={styles.spacedSm} /><Row style={[styles.alignEnd, styles.spacedLg]}>{[28, 48, 36, 62, 42, 54, 32].map((height, index) => <Bone key={index} width="9%" height={height} radius={5} />)}</Row></Card><Card><Bone width="42%" /><Bone width="100%" height={54} radius={12} style={styles.spacedMd} /><Bone width="100%" height={54} radius={12} style={styles.spacedSm} /></Card></>;
  } else if (variant === 'profile') {
    content = <><Card><Row><Bone width={58} height={58} radius={29} /><View style={styles.textGroup}><Bone width="68%" height={16} /><Bone width="42%" /></View></Row><Bone width="100%" height={58} radius={12} style={styles.spacedMd} /></Card><Card>{[0, 1, 2, 3].map(index => <Row key={index} style={styles.profileRow}><Bone width={38} height={38} radius={19} /><View style={styles.textGroup}><Bone width={index % 2 ? '52%' : '64%'} /><Bone width="82%" height={9} /></View><Bone width={16} height={16} radius={8} /></Row>)}</Card></>;
  } else if (variant === 'bank') {
    content = <><Card><Bone width="42%" /><Bone height={46} radius={12} style={styles.spacedMd} /><Bone width="42%" style={styles.spacedMd} /><Bone height={46} radius={12} style={styles.spacedSm} /><Bone width="36%" style={styles.spacedMd} /><Bone height={46} radius={12} style={styles.spacedSm} /><Bone width="100%" height={48} radius={14} style={styles.spacedLg} /></Card></>;
  } else {
    content = <>{[0, 1, 2, 3].map(index => <Card key={index} style={styles.listCard}><Row><Bone width={42} height={42} radius={21} /><View style={styles.textGroup}><Bone width={index % 2 ? '55%' : '68%'} /><Bone width="84%" style={styles.spacedXs} /><Bone width="42%" height={9} style={styles.spacedXs} /></View><Bone width={54} height={20} radius={10} /></Row></Card>)}</>;
  }

  return (
    <Animated.View
      testID={testID ?? `${variant}LoadingSkeleton`}
      accessibilityLabel="Loading your latest information"
      accessibilityRole="progressbar"
      style={[styles.container, { opacity }]}>
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingVertical: 8 },
  bone: { backgroundColor: '#E8EDF3' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8ECF0', padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textGroup: { flex: 1, gap: 7 },
  dashboardStatus: { marginTop: 8, padding: 12 },
  activeHeader: { marginBottom: 4 },
  profileRow: { minHeight: 54, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0' },
  dashboardMetrics: { padding: 14 },
  centerCard: { minHeight: 176, alignItems: 'center', justifyContent: 'center', padding: 22 },
  hero: { minHeight: 190 },
  listCard: { minHeight: 74, justifyContent: 'center' },
  spacedXs: { marginTop: 4 },
  spacedSm: { marginTop: 8 },
  spacedMd: { marginTop: 12 },
  spacedLg: { marginTop: 20 },
  spaceBetween: { justifyContent: 'space-between' },
  alignEnd: { alignItems: 'flex-end', justifyContent: 'space-between' },
});
