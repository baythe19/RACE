import React, { useCallback, useRef, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type ViewToken,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation';
import SoftScreenFade from '../../components/auth/SoftScreenFade';
import { images } from '../../assets';
import { useAppDispatch } from '../../redux/hooks';
import { setSignupPath } from '../../redux/onboarding/onboardingSlice';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const CANVAS_W = 375;
const CANVAS_H = 812;

const PALETTE = {
  amber: '#F7B500',
  orange: '#F5A011',
  ink: '#151519',
  gray: '#9A9AA0',
  label: '#2A2B2F',
  dotInactive: '#DCDCDC',
  white: '#FFFFFF',
};

type Feature = {
  lib: 'mci' | 'io';
  icon: string;
  label: string;
};

/** Left-high → right-low (slides 1 and 3). */
const SWOOSH_DOWN =
  'M0 52 C 110 46, 210 88, 285 102 C 315 108, 348 112, 375 113 L 375 120 L 0 120 Z';
/** Left-low → right-high (slides 2 and 4). */
const SWOOSH_UP =
  'M0 113 C 27 112, 60 108, 90 102 C 165 88, 265 46, 375 52 L 375 120 L 0 120 Z';

type Slide = {
  id: string;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
  /** Shift photo up (negative) so the hero frames the subject, not the bottom. */
  imageShift: number;
  /** Flip the image/text wave so consecutive slides flow opposite directions. */
  waveFlip: boolean;
  badge: Feature;
  features: Feature[];
};

const SLIDES: Slide[] = [
  {
    id: '1',
    image: images.onboarding1,
    imageShift: -0.08,
    waveFlip: false,
    title: '24/7 Roadside\nAssistance',
    subtitle:
      'Fast, reliable and professional\nhelp whenever you need it most,\nanywhere on the road.',
    badge: { lib: 'mci', icon: 'car', label: 'Car' },
    features: [
      { lib: 'mci', icon: 'tow-truck', label: 'Towing' },
      { lib: 'mci', icon: 'account', label: 'Drivers' },
      { lib: 'io', icon: 'construct', label: 'Quick Fix' },
    ],
  },
  {
    id: '2',
    image: images.onboarding2,
    imageShift: -0.04,
    waveFlip: true,
    title: 'Trusted &\nVerified Experts',
    subtitle:
      'Our professionals are verified,\ntrained and ready to assist you\nwhenever help is needed.',
    badge: { lib: 'mci', icon: 'shield-check', label: 'Verified' },
    features: [
      { lib: 'mci', icon: 'check-decagram', label: 'Verified' },
      { lib: 'mci', icon: 'shield-account', label: 'Trained' },
      { lib: 'mci', icon: 'account-tie', label: 'Professional' },
    ],
  },
  {
    id: '3',
    image: images.onboarding3,
    imageShift: -0.06,
    waveFlip: false,
    title: 'Quick Response\nNear You',
    subtitle:
      'We reach you quickly with our\ntrusted nearby service network\nso help is always close by.',
    badge: { lib: 'mci', icon: 'map-marker', label: 'Nearby' },
    features: [
      { lib: 'mci', icon: 'map-marker-path', label: 'Live Tracking' },
      { lib: 'mci', icon: 'map-marker-radius', label: 'Nearby Support' },
      { lib: 'mci', icon: 'clock-outline', label: 'Estimated Time' },
    ],
  },
  {
    id: '4',
    image: images.onboarding4,
    imageShift: -0.05,
    waveFlip: true,
    title: '24/7 Support\nAlways Available',
    subtitle:
      "We're here for you anytime,\nanywhere you need our help,\nday or night.",
    badge: { lib: 'mci', icon: 'headset', label: 'Support' },
    features: [
      { lib: 'mci', icon: 'phone', label: 'Call' },
      { lib: 'io', icon: 'chatbubble-ellipses', label: 'Chat' },
      { lib: 'mci', icon: 'map-marker', label: 'Track' },
    ],
  },
];

function FeatureIcon({
  feature,
  size,
  color,
}: {
  feature: Feature;
  size: number;
  color: string;
}) {
  if (feature.lib === 'mci') {
    return (
      <MaterialCommunityIcons
        name={feature.icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={size}
        color={color}
      />
    );
  }
  return (
    <Ionicons
      name={feature.icon as keyof typeof Ionicons.glyphMap}
      size={size}
      color={color}
    />
  );
}

export default function OnboardingScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const s = Math.min(screenW / CANVAS_W, screenH / CANVAS_H);
  const heroH = Math.min(420 * s, screenH * 0.53);

  const listRef = useRef<FlatList<Slide>>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLast = activeIndex === SLIDES.length - 1;

  const setIndex = useCallback((index: number) => {
    const next = Math.max(0, Math.min(index, SLIDES.length - 1));
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, []);

  const scrollTo = useCallback(
    (index: number, animated = true) => {
      const next = Math.max(0, Math.min(index, SLIDES.length - 1));
      listRef.current?.scrollToIndex({ index: next, animated });
      setIndex(next);
    },
    [setIndex],
  );

  const leaveOnboarding = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const parent = navigation.getParent();
    if (parent?.canGoBack()) {
      parent.goBack();
      return;
    }
    dispatch(setSignupPath({ accountType: 'customer', vendorType: null }));
    navigation.navigate('MobileNumber');
  }, [dispatch, navigation]);

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        if (activeIndexRef.current > 0) {
          scrollTo(activeIndexRef.current - 1);
          return true;
        }
        leaveOnboarding();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, [leaveOnboarding, scrollTo]),
  );

  const goNext = () => {
    if (!isLast) {
      scrollTo(activeIndex + 1);
      return;
    }
    dispatch(setSignupPath({ accountType: 'customer', vendorType: null }));
    navigation.navigate('MobileNumber');
  };

  const skip = () => {
    dispatch(setSignupPath({ accountType: 'customer', vendorType: null }));
    navigation.navigate('MobileNumber');
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / screenW);
    if (index !== activeIndexRef.current) {
      setIndex(index);
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const index = viewableItems[0]?.index;
      if (typeof index === 'number') {
        setIndex(index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  const renderSlide = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={[styles.slide, { width: screenW }]}>
      <View style={[styles.hero, { height: heroH }]}>
        <Image
          source={item.image}
          style={{
            position: 'absolute',
            left: 0,
            width: screenW,
            height: heroH * 1.22,
            top: heroH * item.imageShift,
          }}
          resizeMode="cover"
          fadeDuration={0}
        />

        <Svg
          style={styles.swoosh}
          width={screenW}
          height={120 * s}
          viewBox="0 0 375 120"
          preserveAspectRatio="none">
          <Path d={item.waveFlip ? SWOOSH_UP : SWOOSH_DOWN} fill={PALETTE.white} />
        </Svg>

        <View
          style={[
            styles.badge,
            {
              ...(item.waveFlip ? { right: 22 * s } : { left: 22 * s }),
              bottom: 18 * s,
              width: 60 * s,
              height: 60 * s,
              borderRadius: 20 * s,
            },
          ]}>
          <FeatureIcon feature={item.badge} size={30 * s} color={PALETTE.orange} />
        </View>

        {!isLast ? (
          <Pressable
            onPress={skip}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            style={({ pressed }) => [
              styles.skipBtn,
              {
                top: 54 * s,
                right: 22 * s,
                paddingHorizontal: 18 * s,
                paddingVertical: 9 * s,
                borderRadius: 19 * s,
              },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.skipTxt, { fontSize: 15 * s }]} allowFontScaling={false}>
              Skip
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.content,
          {
            paddingHorizontal: 24 * s,
            paddingTop: 4 * s,
            paddingBottom: 8 * s,
            backgroundColor: PALETTE.white,
          },
        ]}>
        <View>
          <Text
            style={[styles.title, { fontSize: 32 * s, lineHeight: 40 * s }]}
            numberOfLines={2}
            allowFontScaling={false}>
            {item.title}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { marginTop: 14 * s, fontSize: 17 * s, lineHeight: 25 * s },
            ]}
            numberOfLines={3}
            allowFontScaling={false}>
            {item.subtitle}
          </Text>
        </View>

        <View style={[styles.features, { marginTop: 20 * s }]}>
          {item.features.map(feature => (
            <View key={feature.label} style={styles.feature}>
              <View
                style={[
                  styles.featureIcon,
                  {
                    width: 56 * s,
                    height: 56 * s,
                    borderRadius: 16 * s,
                  },
                ]}>
                <FeatureIcon feature={feature} size={26 * s} color={PALETTE.orange} />
              </View>
              <Text
                style={[styles.featureLabel, { marginTop: 8 * s, fontSize: 13 * s }]}
                numberOfLines={1}
                allowFontScaling={false}>
                {feature.label}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.contentSpacer} />
      </View>
    </View>
  );

  return (
    <SoftScreenFade duration={200} style={styles.screen}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <FlatList
        style={styles.list}
        ref={listRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        renderItem={renderSlide}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: screenW,
          offset: screenW * index,
          index,
        })}
        initialNumToRender={1}
        windowSize={3}
      />

      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: 24 * s,
            paddingBottom: 22 * s,
          },
        ]}>
        <View style={styles.dots}>
          {SLIDES.map((_, index) => (
            <Pressable
              key={index}
              onPress={() => scrollTo(index)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Go to slide ${index + 1}`}
              style={[
                styles.dot,
                {
                  width: 8 * s,
                  height: 8 * s,
                  borderRadius: 4 * s,
                  marginHorizontal: 4.5 * s,
                },
                index === activeIndex ? styles.dotActive : null,
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={goNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? "Let's Go" : 'Next'}
          style={({ pressed }) => [
            styles.nextBtn,
            {
              marginTop: 28 * s,
              height: 50 * s,
              borderRadius: 25 * s,
            },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.nextTxt, { fontSize: 17 * s }]} allowFontScaling={false}>
            {isLast ? "Let's Go" : 'Next'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18 * s}
            color={PALETTE.ink}
            style={styles.nextArrow}
          />
        </Pressable>
      </View>
    </SoftScreenFade>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PALETTE.white },
  list: { flex: 1 },
  slide: { flex: 1, backgroundColor: PALETTE.white },
  hero: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#DCE7F1',
  },
  swoosh: { position: 'absolute', left: 0, bottom: 0 },
  skipBtn: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  skipTxt: { fontWeight: '600', color: '#1B1C1E' },
  badge: {
    position: 'absolute',
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6B5A23',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  content: {
    flex: 1,
    backgroundColor: PALETTE.white,
    zIndex: 2,
  },
  contentSpacer: { flex: 1 },
  title: {
    fontWeight: '900',
    color: PALETTE.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontWeight: '400',
    color: PALETTE.gray,
  },
  features: { flexDirection: 'row', alignItems: 'flex-start' },
  feature: { flex: 1, alignItems: 'center' },
  featureIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF6E0',
  },
  featureLabel: { fontWeight: '600', color: PALETTE.label, textAlign: 'center' },
  footer: { backgroundColor: PALETTE.white },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dot: { backgroundColor: PALETTE.dotInactive },
  dotActive: { backgroundColor: PALETTE.amber },
  nextBtn: {
    backgroundColor: PALETTE.amber,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PALETTE.amber,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  nextTxt: { fontWeight: '700', color: PALETTE.ink },
  nextArrow: { marginLeft: 8 },
  pressed: { opacity: 0.88 },
});
