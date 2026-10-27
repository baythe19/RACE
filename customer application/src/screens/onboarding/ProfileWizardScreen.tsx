import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import {
  Animated,
  BackHandler,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path } from 'react-native-svg';
import { IdCard, MapPin, ShieldCheck, Zap } from 'lucide-react-native';

import {
  AUTH_COLORS as COLORS,
  AUTH_DESIGN_HEIGHT,
  AUTH_DESIGN_WIDTH,
} from '../../components/auth/authDesign';
import { AuthHeader } from '../../components/auth/AuthPhoneChrome';
import AuthToast from '../../components/auth/AuthToast';
import {
  GoldCta,
  InfoNote,
  OutlineCta,
  PrivacyNote,
  ProfileDropdown,
  ProfileField,
  ProfileMobileField,
  ProfileStepper,
  VehicleTypeChips,
} from '../../components/onboarding/ProfileSetupChrome';
import {
  AboutYouHero,
  EmergencyHero,
  HERO_VIEWBOX_H,
  HERO_VIEWBOX_W,
  VehicleHero,
} from '../../components/onboarding/ProfileSetupHeroes';
import { dismissOpenProfileDropdown } from '../../components/onboarding/profileDropdownDismiss';
import { KeyboardFormView } from '../../components/ui/AppKeyboard';
import { ensurePreviewAuthSession } from '../../config/uiPreviewAuth';
import { UI_PREVIEW_AUTH_FLOW } from '../../config/uiPreviewMode';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { completeOnboarding } from '../../redux/auth/authSlice';
import { finishVehicleOnboarding } from '../../redux/onboarding/onboardingSlice';
import { markCustomerOnboardingComplete } from '../../store/customerOnboarding';
import { useAuthStore } from '../../store/authStore';
import { useVehicleStore } from '../../store/vehicleStore';
import type { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ProfileWizard'>;
type SetupStep = 1 | 2 | 3 | 4;

const RELATIONSHIPS = ['Parent', 'Spouse', 'Sibling', 'Friend', 'Other'];
const CUSTOM_OPTION = 'Other';
const MAKES = ['Maruti Suzuki', 'Hyundai', 'Honda', 'Tata', CUSTOM_OPTION];
const MODELS_BY_MAKE: Record<string, string[]> = {
  'Maruti Suzuki': ['Swift', 'Baleno', CUSTOM_OPTION],
  Hyundai: ['Creta', 'i20', CUSTOM_OPTION],
  Honda: ['City', 'Amaze', CUSTOM_OPTION],
  Tata: ['Nexon', 'Punch', CUSTOM_OPTION],
  [CUSTOM_OPTION]: [CUSTOM_OPTION],
};
const DONE_ROADSIDE_ART = require('../../assets/images/done-roadside-journey.jpg');
const DONE_ROADSIDE_ASPECT = 825 / 1905;
/** Vertical gap under “RACE is ready…” before chips (and mirrored above hero art). */
const SUCCESS_CHIP_GAP = 36;

/** Fixed space under the stepper before the card. Same number on steps 1–3. */
const WIZARD_HERO_SLOT = 156;
/** How far the white card pulls up over the hero (smaller = card sits lower). */
const WIZARD_CARD_OVERLAP = 12;
/** Top offset for hero SVG — smaller moves art up, larger moves art down. */
const WIZARD_HERO_TOP = 74;
/** Space below hero before the card (larger = card lower; cancels overlap). */
const WIZARD_CARD_GAP = 22;
const VEHICLE_TYPES = ['car', 'bike', 'truck', 'other'] as const;

export default function ProfileWizardScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const screenWidth = Math.min(width, 430);
  const innerHeight = height - insets.top - insets.bottom;
  const scale = Math.min(screenWidth / AUTH_DESIGN_WIDTH, innerHeight / AUTH_DESIGN_HEIGHT);

  const [step, setStep] = useState<SetupStep>(1);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    emergencyName?: string;
    emergencyMobile?: string;
    registration?: string;
    customVehicleType?: string;
    customMake?: string;
    customModel?: string;
  }>({});
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyMobile, setEmergencyMobile] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [registration, setRegistration] = useState('');
  const [vehicleType, setVehicleType] = useState<(typeof VEHICLE_TYPES)[number]>('car');
  const [customVehicleType, setCustomVehicleType] = useState('');
  const [make, setMake] = useState('Maruti Suzuki');
  const [model, setModel] = useState('Swift');
  const [customMake, setCustomMake] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const heroWidth = width;
  const heroBleed = (heroWidth - screenWidth) / 2;
  const heroHeight = heroWidth * (HERO_VIEWBOX_H / HERO_VIEWBOX_W);
  const cardOverlap = WIZARD_CARD_OVERLAP * scale;
  const heroSlot = WIZARD_HERO_SLOT * scale;
  const keyboardOpen = keyboardHeight > 0;
  const [, setDropdownOpen] = useState(false);

  const cardShiftY = useRef(new Animated.Value(0)).current;

  const clearFieldError = useCallback((field: keyof typeof fieldErrors) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleInputFocus = useCallback(
    (targetScrollY?: number) => {
      Animated.timing(cardShiftY, {
        toValue: -Math.round(110 * scale),
        duration: Platform.OS === 'ios' ? 250 : 200,
        useNativeDriver: true,
      }).start();
      if (typeof targetScrollY === 'number') {
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: targetScrollY, animated: true });
        }, 100);
      }
    },
    [cardShiftY, scale],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, event => {
      setKeyboardHeight(event.endCoordinates?.height || 280);
      Animated.timing(cardShiftY, {
        toValue: -Math.round(110 * scale),
        duration: Platform.OS === 'ios' ? 250 : 200,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      Animated.timing(cardShiftY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [cardShiftY, scale]);

  useEffect(() => {
    if (step >= 3) {
      void Asset.fromModule(DONE_ROADSIDE_ART).downloadAsync().catch(() => undefined);
    }
  }, [step]);

  const showStep = useCallback(
    (next: SetupStep) => {
      Keyboard.dismiss();
      dismissOpenProfileDropdown();
      setDropdownOpen(false);
      setFieldErrors({});
      Animated.timing(cardShiftY, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setStep(next);
    },
    [cardShiftY],
  );

  const goBack = () => {
    if (step > 1) {
      showStep((step - 1) as SetupStep);
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step > 1) {
          showStep((step - 1) as SetupStep);
          return true;
        }
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
        return true;
      });
      return () => sub.remove();
    }, [navigation, showStep, step]),
  );

  const continueFromAbout = () => {
    if (!fullName.trim()) {
      setFieldErrors({ fullName: 'Enter your full name to continue' });
      return;
    }
    setFieldErrors({});
    showStep(2);
  };

  const continueFromEmergency = () => {
    const nextErrors: typeof fieldErrors = {};
    if (!emergencyName.trim()) {
      nextErrors.emergencyName = 'Enter contact person name';
    }
    const digits = emergencyMobile.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(digits)) {
      nextErrors.emergencyMobile = 'Enter a valid 10-digit Indian mobile';
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    showStep(3);
  };

  const saveVehicle = () => {
    const nextErrors: typeof fieldErrors = {};
    if (!registration.trim()) {
      nextErrors.registration = 'Enter the vehicle registration number';
    }
    if (vehicleType === 'other' && !customVehicleType.trim()) {
      nextErrors.customVehicleType = 'Enter your custom vehicle type';
    }
    if (make === CUSTOM_OPTION && !customMake.trim()) {
      nextErrors.customMake = 'Enter the vehicle make (brand)';
    }
    if ((make === CUSTOM_OPTION || model === CUSTOM_OPTION) && !customModel.trim()) {
      nextErrors.customModel = 'Enter the vehicle model';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});

    const finalType = vehicleType === 'other' ? customVehicleType.trim() : vehicleType;
    const finalMake = make === CUSTOM_OPTION ? customMake.trim() : make;
    const finalModel = (make === CUSTOM_OPTION || model === CUSTOM_OPTION) ? customModel.trim() : model;

    const newVehId = `veh_${Date.now()}`;
    const newVeh = {
      id: newVehId,
      customerId: user?.id || 'cust_sample_1',
      vehicleType: (finalType.toLowerCase() === 'bike' ? 'bike' : finalType.toLowerCase() === 'truck' ? 'truck' : 'car') as any,
      vehicleSubtype: finalType,
      vehicleNumber: registration.trim().toUpperCase(),
      brand: finalMake,
      model: finalModel,
      color: 'White',
      fuelType: 'petrol' as const,
      qrCode: `https://raceservice.in/qr/${newVehId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    useVehicleStore.setState(state => ({
      vehicles: [newVeh, ...(state.vehicles || []).filter(v => v.id !== newVeh.id)],
      selectedVehicle: newVeh,
    }));

    showStep(4);
  };

  const finishToHome = async () => {
    dispatch(finishVehicleOnboarding());

    if (UI_PREVIEW_AUTH_FLOW) {
      ensurePreviewAuthSession(dispatch, true);
    }

    await markCustomerOnboardingComplete();
    useAuthStore.getState().setCustomerOnboardingStep('done');

    const baseUser = user ?? useAuthStore.getState().user;
    dispatch(
      completeOnboarding(
        baseUser
          ? {
              ...baseUser,
              isProfileCompleted: true,
              fullName: fullName.trim() || baseUser.fullName || 'Preview User',
              email: email.trim() || baseUser.email,
            }
          : undefined,
      ),
    );
  };

  const stepperStep: 1 | 2 | 3 = step === 4 ? 3 : step;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8EE" translucent={false} />
      <View style={[styles.fill, { width: screenWidth, alignSelf: 'center' }]}>
        <AuthHeader scale={scale} onBack={goBack} />
        {step < 4 ? <ProfileStepper scale={scale} step={stepperStep} /> : null}

        {step === 4 ? (
          <KeyboardFormView style={styles.fill} contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 * scale }}>
            <SuccessView scale={scale} screenWidth={screenWidth} onContinue={finishToHome} />
          </KeyboardFormView>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.fill}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: Math.max(60 * scale, keyboardHeight > 0 ? (Platform.OS === 'ios' ? keyboardHeight : 180 * scale) : 40 * scale),
              overflow: 'visible',
            }}>
            <Animated.View style={{ transform: [{ translateY: cardShiftY }] }}>
              <View style={{ height: heroSlot, overflow: 'visible', zIndex: 1 }}>
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: -heroBleed,
                    top: WIZARD_HERO_TOP * scale,
                    width: heroWidth,
                    height: heroHeight,
                    zIndex: 0,
                  }}>
                  {step === 1 ? (
                    <AboutYouHero width={heroWidth} height={heroHeight} />
                  ) : step === 2 ? (
                    <EmergencyHero width={heroWidth} height={heroHeight} />
                  ) : (
                    <VehicleHero width={heroWidth} height={heroHeight} />
                  )}
                </View>
                <View
                  style={{
                    paddingHorizontal: 24 * scale,
                    paddingTop: 12 * scale,
                    backgroundColor: 'transparent',
                    zIndex: 2,
                  }}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    style={{
                      color: '#111318',
                      fontSize: 28 * scale,
                      lineHeight: 36 * scale,
                      fontWeight: '800',
                      letterSpacing: -0.7 * scale,
                    }}>
                    {step === 1
                      ? "Let's get to know you"
                      : step === 2
                        ? 'Add an emergency contact'
                        : 'Set up your vehicle'}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      marginTop: 6 * scale,
                      color: COLORS.secondary,
                      fontSize: 15 * scale,
                      lineHeight: 22 * scale,
                    }}>
                    {step === 1
                      ? 'A few details help us personalize your RACE experience.'
                      : step === 2
                        ? "We'll use this only when you need help on the road."
                        : 'Save your vehicle once and make future assistance faster.'}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  marginHorizontal: 16 * scale,
                  marginTop: -(cardOverlap - WIZARD_CARD_GAP * scale),
                  padding: 18 * scale,
                  borderRadius: 20 * scale,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#F2EEE6',
                  zIndex: 10,
                  elevation: 8,
                }}>
                  {step === 1 ? (
                    <>
                      <ProfileField
                        scale={scale}
                        label="Full name"
                        required
                        icon="user"
                        value={fullName}
                        placeholder="Your full name"
                        autoCapitalize="words"
                        error={fieldErrors.fullName}
                        onFocus={() => handleInputFocus()}
                        onChangeText={value => {
                          setFullName(value);
                          clearFieldError('fullName');
                        }}
                      />
                      <ProfileField
                        scale={scale}
                        label="Email (optional)"
                        icon="mail"
                        value={email}
                        placeholder="you@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onFocus={() => handleInputFocus()}
                        onChangeText={setEmail}
                      />
                    <InfoNote scale={scale} text="You can add these later in profile settings." />
                    <GoldCta scale={scale} label="Continue" onPress={continueFromAbout} />
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <ProfileField
                      scale={scale}
                      label="Contact name"
                      required
                      icon="user"
                      value={emergencyName}
                      placeholder="Contact person name"
                      autoCapitalize="words"
                      error={fieldErrors.emergencyName}
                      onFocus={() => handleInputFocus()}
                      onChangeText={value => {
                        setEmergencyName(value);
                        clearFieldError('emergencyName');
                      }}
                    />
                    <ProfileMobileField
                      scale={scale}
                      label="Mobile number"
                      required
                      value={emergencyMobile}
                      placeholder="98765 43210"
                      error={fieldErrors.emergencyMobile}
                      onFocus={() => handleInputFocus()}
                      onChangeText={value => {
                        setEmergencyMobile(value.replace(/[^\d\s]/g, ''));
                        clearFieldError('emergencyMobile');
                      }}
                    />
                    <ProfileDropdown
                      scale={scale}
                      label="Relationship (optional)"
                      icon="heart"
                      value={relationship}
                      placeholder="Parent"
                      options={RELATIONSHIPS}
                      onSelect={setRelationship}
                      onOpenChange={setDropdownOpen}
                    />
                    <GoldCta scale={scale} label="Continue" onPress={continueFromEmergency} />
                    <OutlineCta scale={scale} label="Skip for now" onPress={() => showStep(3)} />
                    <PrivacyNote scale={scale} />
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    <ProfileField
                      scale={scale}
                      label="Registration number"
                      required
                      icon="plate"
                      value={registration}
                      placeholder="OD 02 AB 1234"
                      autoCapitalize="characters"
                      error={fieldErrors.registration}
                      onFocus={() => handleInputFocus()}
                      onChangeText={value => {
                        setRegistration(value);
                        clearFieldError('registration');
                      }}
                    />
                    <VehicleTypeChips
                      scale={scale}
                      value={vehicleType}
                      onChange={value => {
                        setVehicleType(value as (typeof VEHICLE_TYPES)[number]);
                        if (value !== 'other') {
                          setCustomVehicleType('');
                          clearFieldError('customVehicleType');
                        }
                      }}
                    />

                    {vehicleType === 'other' ? (
                      <View style={{ marginBottom: 16 * scale }}>
                        <Text
                          style={{
                            marginBottom: 6 * scale,
                            color: '#24252B',
                            fontSize: 14 * scale,
                            lineHeight: 20 * scale,
                            fontWeight: '600',
                          }}>
                          Custom vehicle type <Text style={{ color: '#E23B3B' }}>*</Text>
                        </Text>
                        <View
                          style={{
                            height: 50 * scale,
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 14 * scale,
                            borderWidth: 1,
                            borderColor: fieldErrors.customVehicleType ? '#E23B3B' : COLORS.orange,
                            borderRadius: 12 * scale,
                            backgroundColor: '#FFFFFF',
                          }}>
                          <IdCard size={18 * scale} color="#8A8B94" strokeWidth={1.9} />
                          <TextInput
                            value={customVehicleType}
                            placeholder="e.g. Auto Rickshaw, Tractor, Bus"
                            placeholderTextColor="#B0B1B8"
                            autoCapitalize="words"
                            autoCorrect={false}
                            onChangeText={val => {
                              setCustomVehicleType(val);
                              clearFieldError('customVehicleType');
                            }}
                            onFocus={() => handleInputFocus()}
                            style={{
                              flex: 1,
                              marginLeft: 10 * scale,
                              fontSize: 15 * scale,
                              color: COLORS.ink,
                              paddingVertical: 0,
                            }}
                          />
                        </View>
                        {fieldErrors.customVehicleType ? (
                          <Text
                            style={{
                              marginTop: 4 * scale,
                              color: '#E23B3B',
                              fontSize: 12 * scale,
                              lineHeight: 16 * scale,
                              fontWeight: '500',
                            }}>
                            {fieldErrors.customVehicleType}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Make Field (top, full width, with in-place custom input if 'Other' selected) */}
                    <View style={{ width: '100%', zIndex: 20 }}>
                      {make === CUSTOM_OPTION ? (
                        <View style={{ marginBottom: 16 * scale }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 6 * scale,
                            }}>
                            <Text
                              style={{
                                color: '#24252B',
                                fontSize: 14 * scale,
                                lineHeight: 20 * scale,
                                fontWeight: '600',
                              }}>
                              Make <Text style={{ color: '#E23B3B' }}>*</Text>
                            </Text>
                            <Pressable
                              hitSlop={8}
                              onPress={() => {
                                setMake('Maruti Suzuki');
                                setModel(MODELS_BY_MAKE['Maruti Suzuki'][0]);
                                setCustomMake('');
                                setCustomModel('');
                                clearFieldError('customMake');
                                clearFieldError('customModel');
                              }}>
                              <Text
                                style={{
                                  color: COLORS.orange,
                                  fontSize: 13 * scale,
                                  fontWeight: '700',
                                }}>
                                Choose from list
                              </Text>
                            </Pressable>
                          </View>
                          <View
                            style={{
                              height: 50 * scale,
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 14 * scale,
                              borderWidth: 1,
                              borderColor: fieldErrors.customMake ? '#E23B3B' : COLORS.orange,
                              borderRadius: 12 * scale,
                              backgroundColor: '#FFFFFF',
                            }}>
                            <IdCard size={18 * scale} color="#8A8B94" strokeWidth={1.9} />
                            <TextInput
                              value={customMake}
                              placeholder="Type vehicle make (brand)"
                              placeholderTextColor="#B0B1B8"
                              autoCapitalize="words"
                              autoCorrect={false}
                              onChangeText={val => {
                                setCustomMake(val);
                                clearFieldError('customMake');
                              }}
                              onFocus={() => handleInputFocus()}
                              style={{
                                flex: 1,
                                marginLeft: 10 * scale,
                                fontSize: 15 * scale,
                                color: COLORS.ink,
                                paddingVertical: 0,
                              }}
                            />
                          </View>
                          {fieldErrors.customMake ? (
                            <Text
                              style={{
                                marginTop: 4 * scale,
                                color: '#E23B3B',
                                fontSize: 12 * scale,
                                lineHeight: 16 * scale,
                                fontWeight: '500',
                              }}>
                              {fieldErrors.customMake}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <ProfileDropdown
                          scale={scale}
                          label="Make"
                          value={make}
                          placeholder="Maruti Suzuki"
                          options={MAKES}
                          onOpenChange={setDropdownOpen}
                          onSelect={value => {
                            setMake(value);
                            if (value === CUSTOM_OPTION) {
                              setCustomMake('');
                              setModel(CUSTOM_OPTION);
                              setCustomModel('');
                            } else {
                              setModel(MODELS_BY_MAKE[value]?.[0] ?? CUSTOM_OPTION);
                              setCustomMake('');
                              setCustomModel('');
                            }
                            clearFieldError('customMake');
                            clearFieldError('customModel');
                          }}
                        />
                      )}
                    </View>

                    {/* Model Field (bottom, full width, with in-place custom input if 'Other' selected) */}
                    <View style={{ width: '100%', zIndex: 10 }}>
                      {make === CUSTOM_OPTION || model === CUSTOM_OPTION ? (
                        <View style={{ marginBottom: 16 * scale }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 6 * scale,
                            }}>
                            <Text
                              style={{
                                color: '#24252B',
                                fontSize: 14 * scale,
                                lineHeight: 20 * scale,
                                fontWeight: '600',
                              }}>
                              Model <Text style={{ color: '#E23B3B' }}>*</Text>
                            </Text>
                            {make !== CUSTOM_OPTION ? (
                              <Pressable
                                hitSlop={8}
                                onPress={() => {
                                  setModel(MODELS_BY_MAKE[make]?.[0] ?? 'Swift');
                                  setCustomModel('');
                                  clearFieldError('customModel');
                                }}>
                                <Text
                                  style={{
                                    color: COLORS.orange,
                                    fontSize: 13 * scale,
                                    fontWeight: '700',
                                  }}>
                                  Choose from list
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>
                          <View
                            style={{
                              height: 50 * scale,
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 14 * scale,
                              borderWidth: 1,
                              borderColor: fieldErrors.customModel ? '#E23B3B' : COLORS.orange,
                              borderRadius: 12 * scale,
                              backgroundColor: '#FFFFFF',
                            }}>
                            <IdCard size={18 * scale} color="#8A8B94" strokeWidth={1.9} />
                            <TextInput
                              value={customModel}
                              placeholder={
                                make === CUSTOM_OPTION ? 'Type vehicle model' : `Type ${make} model`
                              }
                              placeholderTextColor="#B0B1B8"
                              autoCapitalize="words"
                              autoCorrect={false}
                              onChangeText={val => {
                                setCustomModel(val);
                                clearFieldError('customModel');
                              }}
                              onFocus={() => handleInputFocus(50 * scale)}
                              style={{
                                flex: 1,
                                marginLeft: 10 * scale,
                                fontSize: 15 * scale,
                                color: COLORS.ink,
                                paddingVertical: 0,
                              }}
                            />
                          </View>
                          {fieldErrors.customModel ? (
                            <Text
                              style={{
                                marginTop: 4 * scale,
                                color: '#E23B3B',
                                fontSize: 12 * scale,
                                lineHeight: 16 * scale,
                                fontWeight: '500',
                              }}>
                              {fieldErrors.customModel}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <ProfileDropdown
                          scale={scale}
                          label="Model"
                          value={model}
                          placeholder="Swift"
                          options={MODELS_BY_MAKE[make] ?? [CUSTOM_OPTION]}
                          onOpenChange={setDropdownOpen}
                          onSelect={value => {
                            setModel(value);
                            if (value === CUSTOM_OPTION) {
                              setCustomModel('');
                            }
                            clearFieldError('customModel');
                          }}
                        />
                      )}
                    </View>

                    <GoldCta scale={scale} label="Save vehicle" onPress={saveVehicle} />
                    <Text
                      numberOfLines={1}
                      style={{
                        marginTop: 10 * scale,
                        textAlign: 'center',
                        color: '#9A9A92',
                        fontSize: 13 * scale,
                      }}>
                      You can add more vehicles later.
                    </Text>
                  </>
                ) : null}
              </View>
            </Animated.View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function SuccessView({
  scale,
  screenWidth,
  onContinue,
}: {
  scale: number;
  screenWidth: number;
  onContinue: () => void;
}) {
  const chips: Array<{ title: string; caption: string; icon: 'bolt' | 'shield' | 'pin' }> = [
    { title: '24/7', caption: 'Assistance', icon: 'bolt' },
    { title: 'Verified', caption: 'Professionals', icon: 'shield' },
    { title: 'Quick', caption: 'Response', icon: 'pin' },
  ];
  const checkSize = 104 * scale;
  const artWidth = screenWidth;
  const artHeight = artWidth * DONE_ROADSIDE_ASPECT;

  useEffect(() => {
    void Asset.fromModule(DONE_ROADSIDE_ART).downloadAsync().catch(() => undefined);
  }, []);

  return (
    <View style={styles.fill}>
      <View style={{ paddingHorizontal: 24 * scale, paddingTop: 8 * scale }}>
        <View style={{ alignItems: 'center', height: 128 * scale, justifyContent: 'center' }}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {[
              { top: 8, left: 118, w: 7, h: 7, color: '#F3C14A', rot: 18 },
              { top: 22, left: 86, w: 5, h: 5, color: '#1FA971', rot: 0 },
              { top: 4, right: 108, w: 6, h: 6, color: '#E8B84A', rot: 28 },
              { top: 36, right: 78, w: 4, h: 10, color: '#F6D27A', rot: 40 },
              { top: 18, right: 132, w: 8, h: 3, color: '#C9EBD6', rot: -20 },
              { top: 70, left: 92, w: 6, h: 3, color: '#F3C14A', rot: 55 },
              { top: 78, right: 96, w: 5, h: 5, color: '#8ED4A8', rot: 12 },
              { top: 96, left: 128, w: 4, h: 4, color: '#E8B84A', rot: 0 },
            ].map((dot, index) => (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  top: dot.top * scale,
                  left: 'left' in dot ? (dot.left as number) * scale : undefined,
                  right: 'right' in dot ? (dot.right as number) * scale : undefined,
                  width: dot.w * scale,
                  height: dot.h * scale,
                  borderRadius: 99,
                  backgroundColor: dot.color,
                  transform: [{ rotate: `${dot.rot}deg` }],
                  opacity: 0.85,
                }}
              />
            ))}
          </View>
          <View
            style={{
              width: checkSize,
              height: checkSize,
              borderRadius: checkSize / 2,
              backgroundColor: '#E8F8EE',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Svg width={48 * scale} height={48 * scale} viewBox="0 0 24 24">
              <Path
                d="M5 12.5 L10 17.2 L19 7.8"
                fill="none"
                stroke="#1FA971"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </View>

        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            marginTop: 18 * scale,
            color: '#111318',
            fontSize: 32 * scale,
            lineHeight: 40 * scale,
            fontWeight: '800',
            textAlign: 'center',
          }}>
          You're all set!
        </Text>
        <Text
          numberOfLines={1}
          style={{
            marginTop: 10 * scale,
            color: COLORS.secondary,
            fontSize: 15 * scale,
            lineHeight: 22 * scale,
            textAlign: 'center',
          }}>
          RACE is ready when you need us.
        </Text>

        <View
          style={{
            marginTop: SUCCESS_CHIP_GAP * scale,
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 6 * scale,
          }}>
          {chips.map(item => (
            <View
              key={item.title}
              style={{
                flex: 1,
                paddingVertical: 8 * scale,
                paddingHorizontal: 4 * scale,
                borderRadius: 12 * scale,
                backgroundColor: '#F3EFE4',
                alignItems: 'center',
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: 'rgba(196, 161, 90, 0.22)',
              }}>
              <SuccessChipIcon type={item.icon} size={22 * scale} />
              <Text
                style={{
                  marginTop: 5 * scale,
                  color: '#0B0C10',
                  fontSize: 11 * scale,
                  fontWeight: '800',
                }}>
                {item.title}
              </Text>
              <Text style={{ marginTop: 2 * scale, color: '#8A8678', fontSize: 9.5 * scale }}>
                {item.caption}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Image
        accessibilityLabel="RACE roadside assistance on the highway"
        source={DONE_ROADSIDE_ART}
        resizeMode="cover"
        style={{
          width: artWidth,
          height: artHeight,
          marginTop: 32 * scale,
          marginBottom: 16 * scale,
          alignSelf: 'center',
        }}
        fadeDuration={0}
      />

      <View style={{ paddingHorizontal: 16 * scale, paddingTop: 10 * scale, paddingBottom: 6 * scale }}>
        <GoldCta scale={scale} label="Continue to RACE" onPress={onContinue} />
      </View>

      <View style={{ flex: 1 }} />
    </View>
  );
}

function SuccessChipIcon({ type, size }: { type: 'bolt' | 'shield' | 'pin'; size: number }) {
  const color = '#C4A15A';
  if (type === 'bolt') {
    return <Zap size={size} color={color} fill="none" strokeWidth={2} />;
  }
  if (type === 'shield') {
    return <ShieldCheck size={size} color={color} fill="none" strokeWidth={2} />;
  }
  return <MapPin size={size} color={color} fill="none" strokeWidth={2} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8EE',
  },
  fill: { flex: 1 },
});
