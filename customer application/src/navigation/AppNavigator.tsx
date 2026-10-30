import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CustomerDropoffPrompt from '../components/booking/CustomerDropoffPrompt';
import { CustomerUiQaNavigator } from '../components/dev/CustomerUiQaNavigator';
import { customerNavigationRef } from './customerNavigationRef';import CustomTabBar from '../components/navigation/CustomTabBar';
import StackBackButton from '../components/navigation/StackBackButton';
import { DriverBookingProvider } from '../context/DriverBookingContext';
import { RoadsideBookingProvider } from '../context/RoadsideBookingContext';
import { TowingBookingProvider } from '../context/TowingBookingContext';
import { useAuth } from '../hooks/useAuth';
import { useAppSelector } from '../redux/hooks';
import { getCustomerOnboardingRouteFromStep } from '../store/customerOnboardingRoute';
import { useAuthStore } from '../store/authStore';
import CreateAccountScreen from '../screens/auth/CreateAccountScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import SplashScreen from '../screens/auth/SplashScreen';
import WrongAppRoleScreen from '../screens/auth/WrongAppRoleScreen';
import TowingServiceScreen from '../screens/TowingServiceScreen';
import TowingChooseVehicleScreen from '../screens/booking/towing/TowingChooseVehicleScreen';
import TowingConfirmedScreen from '../screens/booking/towing/TowingConfirmedScreen';
import TowingCompletedScreen from '../screens/booking/towing/TowingCompletedScreen';
import TowingDriverOnWayScreen from '../screens/booking/towing/TowingDriverOnWayScreen';
import TowingPickupDropScreen from '../screens/booking/towing/TowingPickupDropScreen';
import TowingRateScreen from '../screens/booking/towing/TowingRateScreen';
import TowingReviewScreen from '../screens/booking/towing/TowingReviewScreen';
import TowingAdvancePaymentScreen from '../screens/booking/towing/TowingAdvancePaymentScreen';
import TowingTrackScreen from '../screens/booking/towing/TowingTrackScreen';
import DriverServiceScreen from '../screens/DriverServiceScreen';
import DriverBookingVehicleScreen from '../screens/booking/driver/DriverBookingVehicleScreen';
import DriverBookingLocationScreen from '../screens/booking/driver/DriverBookingLocationScreen';
import DriverBookingDateTimeScreen from '../screens/booking/driver/DriverBookingDateTimeScreen';
import DriverBookingReviewScreen from '../screens/booking/driver/DriverBookingReviewScreen';
import DriverBookingPaymentScreen from '../screens/booking/driver/DriverBookingPaymentScreen';
import DriverBookingConfirmedScreen from '../screens/booking/driver/DriverBookingConfirmedScreen';
import DriverEnquiryScreen from '../screens/booking/driver/DriverEnquiryScreen';
import DriverAssignedScreen from '../screens/booking/driver/DriverAssignedScreen';
import DriverOnWayScreen from '../screens/booking/driver/DriverOnWayScreen';
import DriverTrackScreen from '../screens/booking/driver/DriverTrackScreen';
import DriverDateTimeScreen from '../screens/booking/driver/DriverDateTimeScreen';
import DriverPickupScreen from '../screens/booking/driver/DriverPickupScreen';
import DriverChooseVehicleTypeScreen from '../screens/booking/driver/DriverChooseVehicleTypeScreen';
import DriverReviewScreen from '../screens/booking/driver/DriverReviewScreen';
import DriverSelectTypeScreen from '../screens/booking/driver/DriverSelectTypeScreen';
import RoadsideAssistanceScreen from '../screens/RoadsideAssistanceScreen';
import RoadsideHelpOnWayScreen from '../screens/booking/roadside/RoadsideHelpOnWayScreen';
import RoadsideLocationScreen from '../screens/booking/roadside/RoadsideLocationScreen';
import RoadsideReviewScreen from '../screens/booking/roadside/RoadsideReviewScreen';
import RoadsideSelectServiceScreen from '../screens/booking/roadside/RoadsideSelectServiceScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import QRCodeScreen from '../screens/onboarding/QRCodeScreen';
import VehicleRegistrationScreen from '../screens/onboarding/VehicleRegistrationScreen';
import HomeScreen from '../screens/HomeScreen';
import SelectLocationScreen from '../screens/home/SelectLocationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PersonalInformationScreen from '../screens/profile/PersonalInformationScreen';
import MyVehiclesScreen from '../screens/vehicles/VehicleListScreen';
import AddVehicleScreen from '../screens/vehicles/AddVehicleScreen';
import VehicleDetailScreen from '../screens/vehicles/VehicleDetailScreen';
import SosDetailsScreen from '../screens/profile/SosDetailsScreen';
import SavedLocationsScreen from '../screens/profile/SavedLocationsScreen';
import PaymentMethodsScreen from '../screens/profile/PaymentMethodsScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import HelpSupportScreen from '../screens/profile/HelpSupportScreen';
import ChoosePlanScreen from '../screens/profile/ChoosePlanScreen';
import SubscriptionPlansScreen from '../screens/profile/SubscriptionPlansScreen';
import ChangeMobileNumberScreen from '../screens/profile/ChangeMobileNumberScreen';
import BookingsScreen from '../screens/BookingsScreen';
import BookingDetailScreen from '../screens/bookings/BookingDetailScreen';
import BookingPaymentScreen from '../screens/booking/BookingPaymentScreen';
import CallScreen from '../screens/CallScreen';
import QRScanScreen from '../screens/call/QRScanScreen';
import SOSEmergencyScreen from '../screens/call/SOSEmergencyScreen';
import VehicleQrEmergencyScreen from '../screens/vehicles/VehicleQrEmergencyScreen';
import ServiceComingSoonScreen from '../screens/ServiceComingSoonScreen';
import SelectServiceScreen from '../screens/SelectServiceScreen';
import ServiceListScreen from '../screens/ServiceListScreen';
import ServicesScreen from '../screens/ServicesScreen';
import MoreServicesScreen from '../screens/MoreServicesScreen';
import type {
  AuthStackParamList,
  BookingsStackParamList,
  CallStackParamList,
  DriverBookingParamList,
  HomeStackParamList,
  RoadsideBookingParamList,
  RootStackParamList,
  RootTabParamList,
  ServicesStackParamList,
  ProfileStackParamList,
  TowingBookingParamList,
} from '../types/navigation';
import { colors, typography } from '../theme';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ServicesStack = createNativeStackNavigator<ServicesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const BookingsStack = createNativeStackNavigator<BookingsStackParamList>();
const CallStack = createNativeStackNavigator<CallStackParamList>();

const stackScreenOptions = ({
  navigation,
}: {
  navigation: { getState: () => { index: number } };
}) => ({
  headerStyle: {
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTintColor: colors.dark,
  headerTitleStyle: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: colors.dark,
  },
  headerTitleAlign: 'center' as const,
  headerShadowVisible: false,
  headerBackVisible: false,
  headerBackTitle: '',
  headerBackTitleVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerLeft: (props: Parameters<typeof StackBackButton>[0]) => <StackBackButton {...props} />,
  contentStyle: { backgroundColor: colors.background },
  animation: 'slide_from_right' as const,
  animationDuration: 280,
  gestureDirection: 'horizontal' as const,
  animationTypeForReplace: 'push' as const,
  gestureEnabled: navigation.getState().index > 0,
});

const towingBookingScreenOptions = { headerShown: false as const };

/** Wizard steps: stepper + Continue stay fixed; only body updates (no stack slide). */
const bookingWizardScreenOptions = {
  headerShown: false as const,
  animation: 'none' as const,
  animationDuration: 0,
};

const towingBookingScreens = (
  Stack: ReturnType<typeof createNativeStackNavigator<HomeStackParamList>>,
) => (
  <>
    <Stack.Screen
      name="TowingService"
      component={TowingServiceScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="TowingChooseVehicle"
      component={TowingChooseVehicleScreen}
      options={bookingWizardScreenOptions}
    />
    <Stack.Screen
      name="TowingPickupDrop"
      component={TowingPickupDropScreen}
      options={bookingWizardScreenOptions}
    />
    <Stack.Screen
      name="TowingReview"
      component={TowingReviewScreen}
      options={bookingWizardScreenOptions}
    />
    <Stack.Screen
      name="TowingAdvancePayment"
      component={TowingAdvancePaymentScreen}
      options={bookingWizardScreenOptions}
    />
    <Stack.Screen
      name="TowingConfirmed"
      component={TowingConfirmedScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="TowingTrack"
      component={TowingTrackScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="TowingDriverOnWay"
      component={TowingDriverOnWayScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="TowingCompleted"
      component={TowingCompletedScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="TowingRate"
      component={TowingRateScreen}
      options={towingBookingScreenOptions}
    />
  </>
);

const driverBookingScreens = (
  Stack: ReturnType<
    typeof createNativeStackNavigator<HomeStackParamList & DriverBookingParamList>
  >,
) => (
  <>
    <Stack.Screen
      name="DriverService"
      component={DriverServiceScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="DriverBookingVehicle"
      component={DriverBookingVehicleScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="DriverBookingLocation"
      component={DriverBookingLocationScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="DriverBookingDateTime"
      component={DriverBookingDateTimeScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="DriverBookingReview"
      component={DriverBookingReviewScreen}
      options={bookingWizardScreenOptions}
    />
    <Stack.Screen
      name="DriverBookingPayment"
      component={DriverBookingPaymentScreen}
      options={bookingWizardScreenOptions}
    />
    <Stack.Screen
      name="DriverBookingConfirmed"
      component={DriverBookingConfirmedScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="DriverEnquiry"
      component={DriverEnquiryScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="DriverSelectType"
      component={DriverSelectTypeScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="DriverDateTime"
      component={DriverDateTimeScreen}
      options={bookingWizardScreenOptions}
    />
    <Stack.Screen
      name="DriverPickup"
      component={DriverPickupScreen}
      options={bookingWizardScreenOptions}
    />
    <Stack.Screen
      name="DriverChooseVehicleType"
      component={DriverChooseVehicleTypeScreen}
      options={bookingWizardScreenOptions}
    />
    <Stack.Screen
      name="DriverReview"
      component={DriverReviewScreen}
      options={bookingWizardScreenOptions}
    />
    <Stack.Screen
      name="DriverAssigned"
      component={DriverAssignedScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="DriverTrack"
      component={DriverTrackScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="DriverOnWay"
      component={DriverOnWayScreen}
      options={towingBookingScreenOptions}
    />
  </>
);

const roadsideBookingScreens = (
  Stack: ReturnType<
    typeof createNativeStackNavigator<HomeStackParamList & RoadsideBookingParamList>
  >,
) => (
  <>
    <Stack.Screen
      name="RoadsideAssistance"
      component={RoadsideAssistanceScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="RoadsideSelectService"
      component={RoadsideSelectServiceScreen}
      options={towingBookingScreenOptions}
    />
    <Stack.Screen
      name="RoadsideLocation"
      component={RoadsideLocationScreen}
      options={bookingWizardScreenOptions}
    />
    <Stack.Screen
      name="RoadsideReview"
      component={RoadsideReviewScreen}
      options={bookingWizardScreenOptions}
    />
    <Stack.Screen
      name="RoadsideHelpOnWay"
      component={RoadsideHelpOnWayScreen}
      options={towingBookingScreenOptions}
    />
  </>
);

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false, title: 'Home' }}
      />
      <HomeStack.Screen
        name="SelectLocation"
        component={SelectLocationScreen}
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
      <HomeStack.Screen
        name="ServiceList"
        component={ServiceListScreen}
        options={({ route }) => ({
          headerTitle: route.params.categoryTitle || 'Services',
        })}
      />
      <HomeStack.Screen
        name="SelectService"
        component={SelectServiceScreen}
        options={{ headerTitle: 'Book Service' }}
      />
      {towingBookingScreens(HomeStack)}
      {driverBookingScreens(HomeStack)}
      {roadsideBookingScreens(HomeStack)}
      <HomeStack.Screen
        name="BookingPayment"
        component={BookingPaymentScreen}
        options={towingBookingScreenOptions}
      />
      <HomeStack.Screen
        name="MoreServices"
        component={MoreServicesScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="ServiceComingSoon"
        component={ServiceComingSoonScreen}
        options={({ route }) => ({
          headerTitle: route.params.serviceId === 'vehicle_recovery'
            ? 'Vehicle Recovery'
            : 'Emergency Repair',
        })}
      />
    </HomeStack.Navigator>
  );
}

function ServicesStackNavigator() {
  return (
    <ServicesStack.Navigator screenOptions={stackScreenOptions}>
      <ServicesStack.Screen
        name="ServicesMain"
        component={ServicesScreen}
        options={{ headerShown: false, title: 'Services' }}
      />
      <ServicesStack.Screen
        name="ServiceList"
        component={ServiceListScreen}
        options={({ route }) => ({
          headerTitle: route.params.categoryTitle || 'Services',
        })}
      />
      <ServicesStack.Screen
        name="SelectService"
        component={SelectServiceScreen}
        options={{ headerTitle: 'Book Service' }}
      />
      {towingBookingScreens(
        ServicesStack as unknown as ReturnType<
          typeof createNativeStackNavigator<HomeStackParamList & TowingBookingParamList>
        >,
      )}
      {driverBookingScreens(
        ServicesStack as unknown as ReturnType<
          typeof createNativeStackNavigator<HomeStackParamList & DriverBookingParamList>
        >,
      )}
      {roadsideBookingScreens(
        ServicesStack as unknown as ReturnType<
          typeof createNativeStackNavigator<HomeStackParamList & RoadsideBookingParamList>
        >,
      )}
      <ServicesStack.Screen
        name="BookingPayment"
        component={BookingPaymentScreen}
        options={towingBookingScreenOptions}
      />
      <ServicesStack.Screen
        name="MoreServices"
        component={MoreServicesScreen}
        options={{ headerShown: false }}
      />
      <ServicesStack.Screen
        name="ServiceComingSoon"
        component={ServiceComingSoonScreen}
        options={({ route }) => ({
          headerTitle: route.params.serviceId === 'vehicle_recovery'
            ? 'Vehicle Recovery'
            : 'Emergency Repair',
        })}
      />
    </ServicesStack.Navigator>
  );
}

function BookingsStackNavigator() {
  return (
    <BookingsStack.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: false,
        animation: 'slide_from_right' as const,
        animationDuration: 280,
        gestureDirection: 'horizontal' as const,
        gestureEnabled: navigation.getState().index > 0,
      })}>
      <BookingsStack.Screen name="BookingsMain" component={BookingsScreen} />
      <BookingsStack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <BookingsStack.Screen name="TowingTrack" component={TowingTrackScreen} />
      <BookingsStack.Screen name="DriverTrack" component={DriverTrackScreen} />
      <BookingsStack.Screen name="TowingRate" component={TowingRateScreen} />
    </BookingsStack.Navigator>
  );
}

function CallStackNavigator() {
  return (
    <CallStack.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
        animation: 'slide_from_right' as const,
        animationDuration: 280,
        gestureDirection: 'horizontal' as const,
        gestureEnabled: navigation.getState().index > 0,
      })}>
      <CallStack.Screen name="CallMain" component={CallScreen} />
      <CallStack.Screen name="QRScan" component={QRScanScreen} />
      <CallStack.Screen name="SOSEmergency" component={SOSEmergencyScreen} />
      <CallStack.Screen name="VehicleQrEmergency" component={VehicleQrEmergencyScreen} />
    </CallStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: false,
        animation: 'slide_from_right' as const,
        animationDuration: 280,
        gestureDirection: 'horizontal' as const,
        contentStyle: { backgroundColor: colors.background },
        animationTypeForReplace: 'push' as const,
        gestureEnabled: navigation.getState().index > 0,
      })}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
      <ProfileStack.Screen name="MyVehicles" component={MyVehiclesScreen} />
      <ProfileStack.Screen name="AddVehicle" component={AddVehicleScreen} />
      <ProfileStack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
      <ProfileStack.Screen name="EditVehicle" component={AddVehicleScreen} />
      <ProfileStack.Screen name="SosDetails" component={SosDetailsScreen} />
      <ProfileStack.Screen name="SavedLocations" component={SavedLocationsScreen} />
      <ProfileStack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <ProfileStack.Screen name="Notifications" component={NotificationsScreen} />
      <ProfileStack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <ProfileStack.Screen name="ChoosePlan" component={ChoosePlanScreen} />
      <ProfileStack.Screen name="SubscriptionPlans" component={SubscriptionPlansScreen} />
      <ProfileStack.Screen name="ChangeMobileNumber" component={ChangeMobileNumberScreen} />
    </ProfileStack.Navigator>
  );
}

export function MainTabNavigator() {
  return (
    <TowingBookingProvider>
      <DriverBookingProvider>
        <RoadsideBookingProvider>
        <Tab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        backBehavior="none"
        screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Home" component={HomeStackNavigator} />
        <Tab.Screen name="Bookings" component={BookingsStackNavigator} />
        <Tab.Screen name="Call" component={CallStackNavigator} />
        <Tab.Screen name="Services" component={ServicesStackNavigator} />
        <Tab.Screen name="Profile" component={ProfileStackNavigator} />
      </Tab.Navigator>
        </RoadsideBookingProvider>
      </DriverBookingProvider>
    </TowingBookingProvider>
  );
}

function AuthStackNavigator() {
  const customerOnboardingStep = useAuthStore(state => state.customerOnboardingStep);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const onboardingRoute = isAuthenticated
    ? getCustomerOnboardingRouteFromStep(customerOnboardingStep)
    : 'Splash';

  return (
    <AuthStack.Navigator
      key={isAuthenticated ? `onboarding-${customerOnboardingStep}` : 'logged-out'}
      initialRouteName={onboardingRoute}
      screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <AuthStack.Screen name="OTP" component={OTPScreen} />
      <AuthStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <AuthStack.Screen
        name="VehicleRegistration"
        component={VehicleRegistrationScreen}
      />
      <AuthStack.Screen name="QRCode" component={QRCodeScreen} />
    </AuthStack.Navigator>
  );
}

const navigationTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.cardBg,
    text: colors.dark,
    border: colors.border,
    notification: colors.error,
  },
};

export default function AppNavigator() {
  const { isAuthenticated, customerOnboardingStep, isLoading } = useAuth();
  const user = useAppSelector(state => state.auth.user);
  const isPartnerRole = user?.role === 'vendor' || user?.role === 'driver';
  const showWrongApp = isAuthenticated && isPartnerRole;
  const showMainApp = isAuthenticated && customerOnboardingStep === 'done' && !isPartnerRole;
  const nextRootRoute: 'Auth' | 'Main' | 'WrongApp' = showWrongApp
    ? 'WrongApp'
    : showMainApp
      ? 'Main'
      : 'Auth';
  const lastRootRoute = useRef<'Auth' | 'Main' | 'WrongApp' | null>(null);
  const lastAuthenticated = useRef<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!customerNavigationRef.isReady()) {
      return;
    }

    if (lastRootRoute.current === null) {
      lastRootRoute.current = nextRootRoute;
      lastAuthenticated.current = isAuthenticated;
      return;
    }

    const loggedOut = lastAuthenticated.current === true && !isAuthenticated;
    lastAuthenticated.current = isAuthenticated;

    if (lastRootRoute.current === nextRootRoute && !loggedOut) {
      return;
    }

    lastRootRoute.current = nextRootRoute;
    customerNavigationRef.reset({
      index: 0,
      routes: [{ name: nextRootRoute }],
    });
  }, [isLoading, showMainApp, showWrongApp, isAuthenticated, nextRootRoute]);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={customerNavigationRef}
        theme={navigationTheme}
        onReady={() => {
          lastRootRoute.current = nextRootRoute;
          lastAuthenticated.current = isAuthenticated;
        }}>
        {/* Inside NavigationContainer like partner UiTestNavigator — keeps FAB in the same RN tree. */}
        <CustomerUiQaNavigator />
        <RootStack.Navigator
          initialRouteName={nextRootRoute}
          screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Auth" component={AuthStackNavigator} />
          <RootStack.Screen name="Main" component={MainTabNavigator} />
          <RootStack.Screen name="WrongApp" component={WrongAppRoleScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
      {showMainApp ? <CustomerDropoffPrompt /> : null}
    </View>
  );
}
