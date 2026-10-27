import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  View,
  StyleSheet,
  Image,
  Text,
  useWindowDimensions,
  StatusBar,
  type LayoutChangeEvent,
} from 'react-native';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock3, MapPin, ShieldCheck, Zap } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { getCustomerOnboardingRouteFromStep } from '../../store/customerOnboardingRoute';
import { images } from '../../assets';
import { getCoverBackgroundFrame } from './splashBackground';

/** Brand splash — no CTAs; auto-continues to walkthrough or resume in-progress signup. */
/** Foreground-active display time; pauses while the app is backgrounded. */
const SPLASH_DISPLAY_MS = 2800;
const DESIGN_WIDTH = 375;

const TRUST_ITEMS = [
  { label: '24/7', detail: 'Support', Icon: Clock3 },
  { label: 'Fast', detail: 'Response', Icon: Zap },
  { label: 'Verified', detail: 'Professionals', Icon: ShieldCheck },
  { label: 'Near You', detail: 'Always', Icon: MapPin },
] as const;

type SplashNav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

type SplashScreenProps = {
  onFinished?: () => void;
};

function SplashScreen({ onFinished }: SplashScreenProps) {
  const navigation = useNavigation<SplashNav>();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const customerOnboardingStep = useAuthStore(state => state.customerOnboardingStep);
  const { width: winW, height: winH } = useWindowDimensions();
  const [layout, setLayout] = useState({ w: winW, h: winH });
  const navigatingRef = useRef(false);
  const authSnapshotRef = useRef({ isAuthenticated, customerOnboardingStep });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerStartedAtRef = useRef<number | null>(null);
  const remainingMsRef = useRef(SPLASH_DISPLAY_MS);
  const scale = layout.w / DESIGN_WIDTH;
  const bgFrame = useMemo(
    () => getCoverBackgroundFrame(layout.w, layout.h),
    [layout.h, layout.w],
  );
  authSnapshotRef.current = { isAuthenticated, customerOnboardingStep };

  const onRootLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    if (Math.abs(width - layout.w) < 0.5 && Math.abs(height - layout.h) < 0.5) return;
    setLayout({ w: width, h: height });
  };

  useEffect(() => {
    const prefetch = [
      images.splashBackground,
      images.onboarding1,
      images.onboarding2,
      images.onboarding3,
      images.onboarding4,
    ];
    for (const moduleId of prefetch) {
      // Prefetch only. A dropped Expo tunnel must not surface as an uncaught rejection;
      // the Image still loads from the same Metro URL.
      void Asset.fromModule(moduleId).downloadAsync().catch(() => undefined);
    }
  }, []);

  const continueFromSplash = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;

    if (onFinished) {
      onFinished();
      return;
    }

    const { isAuthenticated: hasSession, customerOnboardingStep: step } =
      authSnapshotRef.current;
    if (hasSession && step === 'done') {
      return;
    }

    if (hasSession && step !== 'done') {
      navigation.navigate('Auth', {
        screen: getCustomerOnboardingRouteFromStep(step),
        initial: true,
      });
      return;
    }

    navigation.navigate('Auth', { screen: 'Onboarding', initial: true });
  }, [navigation, onFinished]);

  useFocusEffect(
    useCallback(() => {
      navigatingRef.current = false;
      remainingMsRef.current = SPLASH_DISPLAY_MS;

      const clearSplashTimer = () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        timerStartedAtRef.current = null;
      };

      const scheduleSplashTimer = () => {
        if (navigatingRef.current || timerRef.current) return;
        if (remainingMsRef.current <= 0) {
          continueFromSplash();
          return;
        }
        timerStartedAtRef.current = Date.now();
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          timerStartedAtRef.current = null;
          continueFromSplash();
        }, remainingMsRef.current);
      };

      const onAppStateChange = (nextState: string) => {
        if (nextState === 'active') {
          scheduleSplashTimer();
          return;
        }

        if (timerRef.current && timerStartedAtRef.current !== null) {
          const elapsed = Date.now() - timerStartedAtRef.current;
          remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
        }
        clearSplashTimer();
      };

      const subscription = AppState.addEventListener('change', onAppStateChange);
      if (AppState.currentState === 'active') {
        scheduleSplashTimer();
      }

      return () => {
        clearSplashTimer();
        subscription.remove();
      };
    }, [continueFromSplash]),
  );

  const logoWidth = Math.min(210 * scale, layout.w * 0.54);
  const logoHeight = logoWidth * (230 / 480);
  const fogHeight = Math.max(layout.h * 0.46, 280 * scale);

  return (
    <View style={styles.root} onLayout={onRootLayout}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <Image
        source={images.splashBackground}
        style={{
          position: 'absolute',
          left: bgFrame.left,
          top: bgFrame.top,
          width: bgFrame.width,
          height: bgFrame.height,
        }}
        resizeMode="stretch"
        fadeDuration={0}
      />

      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(236,245,252,0.78)',
          'rgba(247,243,236,0.42)',
          'rgba(255,248,232,0.16)',
          'rgba(255,248,232,0)',
        ]}
        locations={[0, 0.38, 0.68, 1]}
        style={[styles.skyFog, { height: fogHeight }]}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 10 * scale,
            paddingHorizontal: 22 * scale,
          },
        ]}>
        <Image
          source={images.logoTransparent}
          style={{
            width: logoWidth,
            height: logoHeight,
          }}
          resizeMode="contain"
          fadeDuration={0}
        />

        <View style={[styles.copy, { marginTop: 10 * scale, maxWidth: layout.w - 44 * scale }]}>
          <Text
            style={[styles.title, { fontSize: 19.5 * scale, lineHeight: 24 * scale }]}
            allowFontScaling={false}>
            <Text style={styles.titleAccent}>24/7 </Text>
            ROADSIDE ASSISTANCE{'\n'}& TOWING SERVICE
          </Text>
          <Text
            style={[styles.subtitle, { marginTop: 10 * scale, fontSize: 12.5 * scale }]}
            allowFontScaling={false}>
            Wherever you are, we'll get you moving.
          </Text>
        </View>

        <View style={[styles.trustRow, { marginTop: 16 * scale, width: layout.w - 36 * scale }]}>
          {TRUST_ITEMS.map(({ label, detail, Icon }, index) => (
            <View key={`${label}-${detail}`} style={styles.trustCell}>
              {index > 0 ? <View style={styles.trustDivider} /> : null}
              <View style={styles.trustItem}>
                <View
                  style={[
                    styles.trustIcon,
                    {
                      width: 40 * scale,
                      height: 40 * scale,
                      borderRadius: 20 * scale,
                    },
                  ]}>
                  <Icon size={18 * scale} color="#E8A317" strokeWidth={2.2} />
                </View>
                <Text
                  style={[styles.trustLabel, { marginTop: 6 * scale, fontSize: 10.5 * scale }]}
                  numberOfLines={1}
                  allowFontScaling={false}>
                  {label}
                </Text>
                <Text
                  style={[styles.trustDetail, { fontSize: 9.5 * scale }]}
                  numberOfLines={1}
                  allowFontScaling={false}>
                  {detail}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View pointerEvents="none" style={styles.preloadContainer}>
        <Image source={images.onboarding1} style={styles.preload} fadeDuration={0} />
        <Image source={images.onboarding2} style={styles.preload} fadeDuration={0} />
        <Image source={images.onboarding3} style={styles.preload} fadeDuration={0} />
        <Image source={images.onboarding4} style={styles.preload} fadeDuration={0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#1A1208',
  },
  skyFog: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    zIndex: 2,
  },
  copy: {
    alignItems: 'center',
  },
  title: {
    color: '#12161C',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.15,
  },
  titleAccent: {
    color: '#F0A415',
  },
  subtitle: {
    color: '#5E6670',
    fontWeight: '500',
    textAlign: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  trustCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  trustDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    minHeight: 52,
    marginTop: 6,
    marginRight: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  trustIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
  },
  trustLabel: {
    color: '#1E252C',
    fontWeight: '700',
    textAlign: 'center',
  },
  trustDetail: {
    color: '#3D4650',
    fontWeight: '500',
    textAlign: 'center',
  },
  preloadContainer: {
    position: 'absolute',
    top: 0,
    left: -9999,
    width: 1,
    height: 1,
  },
  preload: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export default SplashScreen;
