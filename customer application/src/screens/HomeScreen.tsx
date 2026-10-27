import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ArrowRight,
  Bell,
  ChevronDown,
  LayoutGrid,
  MapPin,
  Phone,
  Truck,
  User,
  Wrench,
} from 'lucide-react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../assets';
import LocationSelectorSheet from '../components/location/LocationSelectorSheet';
import NotServiceableScreen from '../components/location/NotServiceableScreen';
import AppScreenLayout from '../components/ui/AppScreenLayout';
import { useAuthStore } from '../store/authStore';
import { useCatalogStore } from '../store/catalogStore';
import { useLocationStore } from '../store/locationStore';
import { useProfileStore } from '../store/profileStore';
import { getProfileFirstName } from '../utils/profileDisplay';
import { brand } from '../theme/brand';
import type { HomeStackParamList, RootTabParamList } from '../types/navigation';
import { openServiceCategory } from '../utils/serviceNavigation';
import { colors, shadows, typography } from '../theme';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const REF_W = 390;

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

const STATIC_OUR_SERVICES = [
  { id: 'towing', title: 'Towing', Icon: Truck },
  { id: 'driver', title: 'Driver', Icon: User },
  { id: 'roadside', title: 'Roadside', Icon: Wrench },
  { id: 'future', title: 'More', Icon: LayoutGrid },
];

const POPULAR_SERVICES = [
  {
    id: 'towing',
    title: 'Send Towing',
    categoryTitle: 'Towing Service',
    price: 'From ₹499',
    priceColor: '#C2410C',
    gradient: ['#FFF9F2', '#FEEDDF'] as const,
    image: images.popularTowing,
    imageWidth: 76,
    imageHeight: 50,
  },
  {
    id: 'roadside',
    title: 'Flat Tire',
    categoryTitle: 'Roadside Assistance',
    price: 'From ₹199',
    priceColor: '#0284C7',
    gradient: ['#F8FAFC', '#EDF2F7'] as const,
    image: images.popularFlatTire,
    imageWidth: 76,
    imageHeight: 50,
  },
  {
    id: 'battery',
    title: 'Battery',
    categoryTitle: 'Roadside Assistance',
    price: 'From ₹199',
    priceColor: '#D97706',
    gradient: ['#FFFBF0', '#FEF3C7'] as const,
    image: images.popularBattery,
    imageWidth: 68,
    imageHeight: 52,
  },
  {
    id: 'fuel',
    title: 'Fuel Delivery',
    categoryTitle: 'Roadside Assistance',
    price: 'From ₹299',
    priceColor: '#EA580C',
    gradient: ['#FFF7ED', '#FFEDD5'] as const,
    image: images.popularFuel,
    imageWidth: 68,
    imageHeight: 52,
  },
];

export default function HomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);

  const {
    hasSelectedLocation,
    isServiceable,
    selectedLocation,
    isHydrated: isLocationHydrated,
  } = useLocationStore();

  const [showLocationSheet, setShowLocationSheet] = useState(false);

  const { fetchServices, fetchBrand, brand: apiBrand } = useCatalogStore();
  const profile = useProfileStore(state => state.profile);
  const authUser = useAuthStore(state => state.user);

  useEffect(() => {
    void fetchServices();
    void fetchBrand();
  }, [fetchBrand, fetchServices]);

  useEffect(() => {
    if (isLocationHydrated && !hasSelectedLocation) {
      setShowLocationSheet(true);
    }
  }, [hasSelectedLocation, isLocationHydrated]);

  const firstName =
    getProfileFirstName(profile?.fullName) ||
    getProfileFirstName(authUser?.fullName) ||
    'Welcome';

  const hour = new Date().getHours();
  const greetingPeriod =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const displayLocation = useMemo(() => {
    const raw = selectedLocation?.displayName || selectedLocation?.address;
    if (!raw) {
      return isLocationHydrated ? 'Bhubaneswar, Odisha' : 'Locating...';
    }
    const clean = raw
      .replace(/^Selected location,?\s*/i, '')
      .replace(/^Selected address,?\s*/i, '')
      .trim();
    return clean || 'Bhubaneswar, Odisha';
  }, [selectedLocation?.displayName, selectedLocation?.address, isLocationHydrated]);

  const cityName = useMemo(() => {
    if (!displayLocation || displayLocation === 'Locating...') return 'Bhubaneswar';
    return displayLocation.split(',')[0].trim() || 'Bhubaneswar';
  }, [displayLocation]);

  const cardWidth = Math.max(280, width - px(40));
  const cardHeight = px(196);
  const R = px(22);
  const R_tr = px(24);
  const x1 = Math.round(cardWidth * 0.27);
  const x2 = Math.round(cardWidth * 0.38);
  const dip = px(28);

  const cardPath = useMemo(() => {
    return [
      `M 0 ${R}`,
      `Q 0 0 ${R} 0`,
      `L ${x1} 0`,
      `C ${x1 + (x2 - x1) * 0.45} 0, ${x1 + (x2 - x1) * 0.55} ${dip}, ${x2} ${dip}`,
      `L ${cardWidth - R_tr} ${dip}`,
      `Q ${cardWidth} ${dip} ${cardWidth} ${dip + R_tr}`,
      `L ${cardWidth} ${cardHeight - R}`,
      `Q ${cardWidth} ${cardHeight} ${cardWidth - R} ${cardHeight}`,
      `L ${R} ${cardHeight}`,
      `Q 0 ${cardHeight} 0 ${cardHeight - R}`,
      'Z',
    ].join(' ');
  }, [cardWidth, cardHeight, R, R_tr, x1, x2, dip]);

  const openServicesTab = () => {
    const tabNav = navigation.getParent<BottomTabNavigationProp<RootTabParamList>>();
    (tabNav as any)?.navigate('Services', { screen: 'ServicesMain' });
  };

  const openCategory = (categoryId: string, categoryTitle: string) => {
    openServiceCategory(navigation, categoryId, categoryTitle);
  };

  const openLocationSheet = () => setShowLocationSheet(true);

  const onLocationSelected = () => {
    setShowLocationSheet(false);
  };

  if (isLocationHydrated && hasSelectedLocation && !isServiceable) {
    return (
      <>
        <NotServiceableScreen onChangeLocation={openLocationSheet} />
        <LocationSelectorSheet
          visible={showLocationSheet}
          dismissible
          onRequestClose={() => setShowLocationSheet(false)}
          onLocationSelected={onLocationSelected}
        />
      </>
    );
  }

  return (
    <>
      <AppScreenLayout
        backgroundColor="#FFFFFF"
        contentStyle={{ paddingTop: 0 }}
        header={
          <View style={{ backgroundColor: '#FFFFFF', paddingTop: px(8), paddingBottom: px(8) }}>
            {/* Top Bar: Location on left, Notifications + Avatar on right */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: px(20),
              }}>
              {/* Location Pill Dropdown */}
              <Pressable
                onPress={openLocationSheet}
                style={[
                  shadows.subtle,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: px(6),
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#ECEAE4',
                    borderRadius: px(20),
                    paddingHorizontal: px(12),
                    paddingVertical: px(6),
                    maxWidth: px(220),
                  },
                ]}>
                <MapPin size={px(16)} color="#F59E0B" strokeWidth={2.4} />
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: px(13),
                    fontWeight: typography.weights.bold,
                    color: colors.dark,
                    flexShrink: 1,
                  }}>
                  {displayLocation}
                </Text>
                <ChevronDown size={px(14)} color={colors.dark} strokeWidth={2.4} />
              </Pressable>

              {/* Right: Bell & Avatar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
                <Pressable
                  onPress={() => {
                    const parent = navigation.getParent();
                    (parent as any)?.navigate('Profile', { screen: 'Notifications' });
                  }}
                  style={{
                    width: px(36),
                    height: px(36),
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                  <Bell size={px(20)} color={colors.dark} strokeWidth={2} />
                  <View
                    style={{
                      position: 'absolute',
                      top: px(6),
                      right: px(7),
                      width: px(7),
                      height: px(7),
                      borderRadius: px(4),
                      backgroundColor: colors.error,
                    }}
                  />
                </Pressable>

                <Pressable
                  onPress={() => {
                    const tabNav = navigation.getParent<BottomTabNavigationProp<RootTabParamList>>();
                    tabNav?.navigate('Profile');
                  }}
                  style={{
                    width: px(36),
                    height: px(36),
                    borderRadius: px(18),
                    borderWidth: 2,
                    borderColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.background,
                    overflow: 'hidden',
                  }}>
                  {profile?.profilePhoto ? (
                    <Image
                      source={{ uri: profile.profilePhoto }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <User size={px(18)} color={colors.primary} strokeWidth={2.2} />
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        }>
        {/* Hero Section: Road Scenery Background + Highlighted Greeting + Curved 24/7 Card */}
        <View style={{ marginBottom: px(22), position: 'relative' }}>
          {/* Atmospheric Road & Tow Truck Background Visual extending edge-to-edge under greeting */}
          <View
            style={{
              position: 'absolute',
              top: -px(56),
              left: -px(20),
              width: width,
              height: px(380),
              overflow: 'hidden',
            }}>
            <Image
              source={images.homeHeroRoadTruck}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            {/* Melted Gradient Overlay into White (both top and bottom) */}
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.96)',
                'rgba(255, 255, 255, 0.75)',
                'rgba(255, 255, 255, 0.25)',
                'transparent',
                'transparent',
                'rgba(255, 255, 255, 0.35)',
                'rgba(255, 255, 255, 0.78)',
                'rgba(255, 255, 255, 0.96)',
                '#FFFFFF',
              ]}
              locations={[0, 0.16, 0.34, 0.50, 0.66, 0.78, 0.88, 0.95, 1.0]}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* Highlighted Greeting Typography */}
          <View style={{ paddingTop: px(6), paddingBottom: px(10) }}>
            <Text
              style={{
                fontSize: px(25),
                fontWeight: typography.weights.extrabold,
                color: '#111827',
                lineHeight: px(31),
              }}>
              {greetingPeriod},
            </Text>
            <Text
              style={{
                fontSize: px(32),
                fontWeight: '900',
                color: '#0F172A',
                lineHeight: px(38),
                marginTop: px(2),
                letterSpacing: -0.8,
              }}>
              {firstName}! 👋
            </Text>
            <Text
              style={{
                marginTop: px(4),
                fontSize: px(14.5),
                color: '#475569',
                fontWeight: '600',
                lineHeight: px(20),
              }}>
              Need help on the road?
            </Text>
          </View>

          {/* Overlapping Curved 24/7 Roadside Assistance Card */}
          <View
            style={{
              marginTop: px(58),
              width: cardWidth,
              height: cardHeight,
              position: 'relative',
            }}>
            {/* Native Drop Shadow along the bottom edge */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: px(52),
                borderBottomLeftRadius: R,
                borderBottomRightRadius: R,
                backgroundColor: '#FFFFFF',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.10,
                shadowRadius: 12,
                elevation: 4,
              }}
            />

            <Svg width={cardWidth} height={cardHeight} style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgLinearGradient id="cardBgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                  <Stop offset="30%" stopColor="#FFFFFF" stopOpacity="1" />
                  <Stop offset="46%" stopColor="#FFFFFF" stopOpacity="0.96" />
                  <Stop offset="62%" stopColor="#FFFFFF" stopOpacity="0.86" />
                  <Stop offset="80%" stopColor="#FFFFFF" stopOpacity="0.68" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.45" />
                </SvgLinearGradient>
              </Defs>
              <Path d={cardPath} fill="url(#cardBgGrad)" stroke="none" />
            </Svg>

            {/* Content inside the card */}
            <View
              style={{
                flex: 1,
                paddingHorizontal: px(18),
                paddingTop: px(14),
                paddingBottom: px(14),
                justifyContent: 'space-between',
              }}>
              <View>
                <Text
                  style={{
                    fontSize: px(28),
                    fontWeight: typography.weights.extrabold,
                    color: '#F59E0B',
                    lineHeight: px(32),
                  }}>
                  24/7
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: px(18.5),
                    fontWeight: typography.weights.extrabold,
                    color: '#111827',
                    lineHeight: px(24),
                    marginTop: px(4),
                    letterSpacing: -0.3,
                  }}>
                  Roadside Assistance
                </Text>
                <Text
                  numberOfLines={2}
                  style={{
                    marginTop: px(5),
                    fontSize: px(13),
                    color: '#64748B',
                    lineHeight: px(18.5),
                    maxWidth: '82%',
                  }}>
                  Reliable help, anytime,{'\n'}anywhere in {cityName}.
                </Text>
              </View>

              {/* Highlighted Request Help Button */}
              <Pressable
                onPress={() => openCategory('roadside', 'Roadside Assistance')}
                style={({ pressed }) => [
                  {
                    width: '100%',
                    height: px(46),
                    borderRadius: px(14),
                    overflow: 'hidden',
                    shadowColor: '#F59E0B',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 3,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}>
                <LinearGradient
                  colors={['#FFBA08', '#F59E0B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: px(18),
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
                    <Phone size={px(18)} color="#111827" strokeWidth={2.6} />
                    <Text
                      style={{
                        fontSize: px(15),
                        fontWeight: typography.weights.extrabold,
                        color: '#111827',
                        letterSpacing: -0.2,
                      }}>
                      Request Help
                    </Text>
                  </View>
                  <ArrowRight size={px(18)} color="#111827" strokeWidth={2.6} />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Our Services Section */}
        <View style={{ marginBottom: px(22) }}>
          <Text
            style={{
              fontSize: px(19),
              fontWeight: typography.weights.extrabold,
              color: '#111827',
              marginBottom: px(12),
              letterSpacing: -0.2,
            }}>
            Our Services
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: px(8) }}>
            {STATIC_OUR_SERVICES.map(item => (
              <Pressable
                key={item.id}
                onPress={() => openCategory(item.id, item.title)}
                style={({ pressed }) => [
                  shadows.card,
                  {
                    flex: 1,
                    borderRadius: px(16),
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    paddingVertical: px(12),
                    paddingHorizontal: px(4),
                    borderWidth: 1,
                    borderColor: '#ECEAE4',
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}>
                {/* Highlighted Icon Outline Container */}
                <View
                  style={{
                    width: px(46),
                    height: px(46),
                    borderRadius: px(14),
                    backgroundColor: '#FFFBEB',
                    borderWidth: 1.5,
                    borderColor: '#FCD34D',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: px(8),
                  }}>
                  <item.Icon size={px(22)} color="#F59E0B" strokeWidth={2.2} />
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: px(12.5),
                    fontWeight: typography.weights.bold,
                    color: '#1F2937',
                    textAlign: 'center',
                  }}>
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Popular Services Section (2x2 Grid) */}
        <View style={{ marginBottom: px(24) }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: px(14),
            }}>
            <Text
              style={{
                fontSize: px(19),
                fontWeight: typography.weights.extrabold,
                color: '#111827',
              }}>
              Popular Services
            </Text>
            <Pressable
              onPress={openServicesTab}
              style={{ flexDirection: 'row', alignItems: 'center', gap: px(3) }}>
              <Text
                style={{
                  fontSize: px(13.5),
                  fontWeight: typography.weights.bold,
                  color: colors.primary,
                }}>
                See All
              </Text>
              <ArrowRight size={px(13.5)} color={colors.primary} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* 2-Column Grid */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              rowGap: px(12),
            }}>
            {POPULAR_SERVICES.map(item => (
              <Pressable
                key={item.id}
                onPress={() =>
                  openCategory(
                    item.id === 'fuel' || item.id === 'battery' ? 'roadside' : item.id,
                    item.categoryTitle
                  )
                }
                style={({ pressed }) => [
                  {
                    width: '48.5%',
                    height: px(96),
                    borderRadius: px(18),
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 3,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}>
                <LinearGradient
                  colors={item.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingLeft: px(12),
                    paddingRight: px(4),
                  }}>
                  <View style={{ flex: 1, justifyContent: 'center', paddingRight: px(2) }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: px(13.5),
                        fontWeight: typography.weights.extrabold,
                        color: '#111827',
                        lineHeight: px(16.5),
                      }}>
                      {item.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: px(12.5),
                        fontWeight: typography.weights.extrabold,
                        color: item.priceColor,
                        marginTop: px(3),
                      }}>
                      {item.price}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: px(item.imageWidth),
                      height: px(item.imageHeight),
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Image
                      source={item.image}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>
      </AppScreenLayout>

      <LocationSelectorSheet
        visible={showLocationSheet || (isLocationHydrated && !hasSelectedLocation)}
        dismissible={hasSelectedLocation}
        onRequestClose={() => setShowLocationSheet(false)}
        onLocationSelected={onLocationSelected}
      />
    </>
  );
}
