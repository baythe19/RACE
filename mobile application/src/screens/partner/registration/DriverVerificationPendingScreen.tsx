import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Check, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PartnerHeaderLogo from '../../../components/partner/PartnerHeaderLogo';
import VerificationUnderReviewArtwork from '../../../components/partner/VerificationUnderReviewArtwork';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { completeOnboarding } from '../../../redux/auth/authSlice';
import { finishPartnerSignup } from '../../../redux/onboarding/onboardingSlice';
import { saveTokens } from '../../../services/api';
import { usePartnerRegistrationStore } from '../../../store/partnerRegistrationStore';
import type {
  PartnerRegistrationStackParamList,
  PartnerRootStackParamList,
} from '../../../types/partnerNavigation';

type Props = NativeStackScreenProps<
  PartnerRegistrationStackParamList,
  'DriverVerificationPending'
>;

const REF_W = 390;

export default function DriverVerificationPendingScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(1.22, Math.max(0.88, width / REF_W));
  const px = (val: number) => Math.max(1, Math.round(val * scale));

  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const driverPersonal = usePartnerRegistrationStore((s) => s.driverPersonal);

  const handleViewApplication = () => {
    // Navigate back to DriverReview so the user can see/edit everything
    navigation.navigate('DriverReview', route.params ?? { role: 'driver' });
  };

  const handleGoToDashboard = async () => {
    dispatch(finishPartnerSignup());

    if (!authUser) {
      const token = 'mock-driver-token';
      await saveTokens(token, token);
    }

    dispatch(
      completeOnboarding(
        authUser
          ? {
              ...authUser,
              role: 'driver',
              fullName: driverPersonal.fullName || authUser.fullName || 'Rajesh Kumar',
              email: driverPersonal.email || authUser.email,
              isProfileCompleted: true,
            }
          : {
              id: `driver-${Date.now()}`,
              mobileNumber: driverPersonal.mobileNumber || '9876543210',
              role: 'driver',
              fullName: driverPersonal.fullName || 'Rajesh Kumar',
              email: driverPersonal.email || 'rajesh.driver@gmail.com',
              isVerified: true,
              isProfileCompleted: true,
            },
      ),
    );

    const rootNavigation =
      navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
    const routeNames = rootNavigation?.getState()?.routeNames;
    if (routeNames && routeNames.includes('PartnerMain')) {
      rootNavigation?.reset({
        index: 0,
        routes: [{ name: 'PartnerMain' }],
      });
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Logo */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + px(6),
            minHeight: insets.top + px(58),
            paddingHorizontal: px(16),
          },
        ]}>
        <PartnerHeaderLogo width={px(104)} />
      </View>

      <ScrollView
        style={styles.scrollView}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: px(24),
            paddingTop: px(12),
            paddingBottom: insets.bottom + px(28),
          },
        ]}>
        {/* Hero Illustration */}
        <View style={[styles.heroWrap, { marginVertical: px(12) }]}>
          <VerificationUnderReviewArtwork size={px(140)} />
        </View>

        {/* Title & Subtitle */}
        <Text style={[styles.title, { fontSize: px(21), marginBottom: px(8) }]}>
          Your account is under verification
        </Text>
        <Text style={[styles.subtitle, { fontSize: px(13.5), marginBottom: px(24) }]}>
          We're reviewing your documents. You'll be notified once approved. You can still complete
          or update your details below.
        </Text>

        {/* Vertical Progress Tracker Card */}
        <View style={[styles.trackerCard, { padding: px(16), marginBottom: px(16) }]}>
          {/* Step 1: Details submitted */}
          <View style={styles.stepRow}>
            <View style={styles.stepIndicatorCol}>
              <View style={[styles.stepCircle, styles.circleDone, { width: px(24), height: px(24) }]}>
                <Check size={px(14)} color="#FFFFFF" strokeWidth={3} />
              </View>
              <View style={[styles.connectorLine, styles.lineGold, { height: px(24) }]} />
            </View>
            <View style={styles.stepContentCol}>
              <Text style={[styles.stepTitle, { fontSize: px(14.5) }]}>Details submitted</Text>
            </View>
          </View>

          {/* Step 2: Under review */}
          <View style={styles.stepRow}>
            <View style={styles.stepIndicatorCol}>
              <View style={[styles.stepCircle, styles.circleActive, { width: px(24), height: px(24) }]}>
                <View style={styles.circleActiveDot} />
              </View>
              <View style={[styles.connectorLine, styles.lineGrey, { height: px(24) }]} />
            </View>
            <View style={styles.stepContentCol}>
              <Text style={[styles.stepTitle, styles.stepTitleActive, { fontSize: px(14.5) }]}>
                Under review
              </Text>
            </View>
          </View>

          {/* Step 3: Background check */}
          <View style={styles.stepRow}>
            <View style={styles.stepIndicatorCol}>
              <View style={[styles.stepCircle, styles.circleIdle, { width: px(24), height: px(24) }]}>
                <Check size={px(13)} color="#9CA3AF" strokeWidth={2.4} />
              </View>
              <View style={[styles.connectorLine, styles.lineGrey, { height: px(24) }]} />
            </View>
            <View style={styles.stepContentCol}>
              <Text style={[styles.stepTitle, styles.stepTitleIdle, { fontSize: px(14.5) }]}>
                Background check
              </Text>
            </View>
          </View>

          {/* Step 4: Approved */}
          <View style={styles.stepRow}>
            <View style={styles.stepIndicatorCol}>
              <View style={[styles.stepCircle, styles.circleIdle, { width: px(24), height: px(24) }]}>
                <Check size={px(13)} color="#9CA3AF" strokeWidth={2.4} />
              </View>
            </View>
            <View style={styles.stepContentCol}>
              <Text style={[styles.stepTitle, styles.stepTitleIdle, { fontSize: px(14.5) }]}>
                Approved
              </Text>
            </View>
          </View>
        </View>

        {/* Info Box Callout */}
        <View
          style={[
            styles.infoBox,
            { paddingVertical: px(14), paddingHorizontal: px(16), marginBottom: px(24) },
          ]}>
          <View style={styles.infoIconBox}>
            <Info size={px(18)} color="#1F2937" strokeWidth={2.2} />
          </View>
          <Text style={[styles.infoBoxText, { fontSize: px(13) }]}>
            This usually takes 24–48 hours. We'll notify you in the app.
          </Text>
        </View>

        {/* Buttons */}
        <View style={{ gap: px(12) }}>
          <Pressable
            onPress={handleViewApplication}
            style={({ pressed }) => [
              styles.primaryOutlinedBtn,
              { height: px(50), borderRadius: px(14) },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="View my application">
            <Text style={[styles.primaryOutlinedBtnText, { fontSize: px(15) }]}>
              View my application
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void handleGoToDashboard()}
            style={({ pressed }) => [
              styles.secondaryLinkBtn,
              { paddingVertical: px(10) },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go to Dashboard (Read only)">
            <Text style={[styles.secondaryLinkText, { fontSize: px(14) }]}>
              Go to Dashboard (Read only)
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  trackerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  stepRow: {
    flexDirection: 'row',
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 32,
    marginRight: 12,
  },
  stepCircle: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: '#10B981',
  },
  circleActive: {
    backgroundColor: '#F59E0B',
  },
  circleActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  circleIdle: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  connectorLine: {
    width: 2.5,
    marginVertical: 2,
    borderRadius: 2,
  },
  lineGold: {
    backgroundColor: '#F59E0B',
  },
  lineGrey: {
    backgroundColor: '#E5E7EB',
  },
  stepContentCol: {
    flex: 1,
    paddingTop: 2,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  stepTitle: {
    color: '#111827',
    fontWeight: '600',
  },
  stepTitleActive: {
    color: '#111827',
    fontWeight: '700',
  },
  stepTitleIdle: {
    color: '#6B7280',
    fontWeight: '500',
  },
  infoBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  infoIconBox: {
    marginRight: 10,
  },
  infoBoxText: {
    flex: 1,
    color: '#1F2937',
    fontWeight: '600',
    lineHeight: 18,
  },
  primaryOutlinedBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  primaryOutlinedBtnText: {
    color: '#111827',
    fontWeight: '700',
  },
  secondaryLinkBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLinkText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
