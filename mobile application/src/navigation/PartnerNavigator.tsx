import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import StackBackButton from '../components/navigation/StackBackButton';
import DriverOfferAlert from '../components/partner/DriverOfferAlert';
import PartnerTabBar from '../components/partner/PartnerTabBar';
import { useAppSelector } from '../redux/hooks';
import PartnerHomeScreen from '../screens/partner/PartnerHomeScreen';
import DriverDashboardScreen from '../screens/partner/driver/DriverDashboardScreen';
import DriverJobsScreen from '../screens/partner/driver/DriverJobsScreen';
import DriverActiveJobScreen from '../screens/partner/driver/DriverActiveJobScreen';
import {
  useDriverVendorInvitationsQuery,
  useDriverVendorMembershipQuery,
} from '../services/vendor/useVendorMembershipQueries';
import { UI_PREVIEW_MODE } from '../constants/preview';
import {
  getDriverVendorPreviewScenario,
  subscribeDriverVendorPreview,
} from '../services/vendor/driverVendorPreview';
import PartnerJobsScreen from '../screens/partner/PartnerJobsScreen';
import VendorBookingTrackingScreen from '../screens/partner/VendorBookingTrackingScreen';
import PartnerAccountScreen from '../screens/partner/PartnerAccountScreen';
import PartnerVerificationStatusScreen from '../screens/partner/PartnerVerificationStatusScreen';
import VendorDriverMembershipsScreen from '../screens/partner/VendorDriverMembershipsScreen';
import VendorVehiclesScreen from '../screens/partner/VendorVehiclesScreen';
import VendorVehicleRegistrationScreen from '../screens/partner/registration/vehicle/VendorVehicleRegistrationScreen';
import VendorAssignJobScreen from '../screens/partner/VendorAssignJobScreen';
import VendorAddDriverScreen from '../screens/partner/VendorAddDriverScreen';
import PartnerEditProfileScreen from '../screens/partner/account/PartnerEditProfileScreen';
import PartnerDocumentsScreen from '../screens/partner/account/PartnerDocumentsScreen';
import PartnerEarningsScreen from '../screens/partner/account/PartnerEarningsScreen';
import PartnerNotificationsScreen from '../screens/partner/account/PartnerNotificationsScreen';
import PartnerSettingsScreen from '../screens/partner/account/PartnerSettingsScreen';
import PartnerHelpSupportScreen from '../screens/partner/account/PartnerHelpSupportScreen';
import PartnerBankDetailsScreen from '../screens/partner/account/PartnerBankDetailsScreen';
import DriverMyVendorScreen from '../screens/partner/driver/DriverMyVendorScreen';
import type {
  PartnerAccountStackParamList,
  PartnerDriversStackParamList,
  PartnerJobsStackParamList,
  PartnerTabParamList,
  PartnerVehiclesStackParamList,
} from '../types/partnerNavigation';
import { colors, typography } from '../theme';

const styles = StyleSheet.create({
  root: { flex: 1 },
});

const Tab = createBottomTabNavigator<PartnerTabParamList>();
const AccountStack = createNativeStackNavigator<PartnerAccountStackParamList>();
const JobsStack = createNativeStackNavigator<PartnerJobsStackParamList>();
const VehiclesStack = createNativeStackNavigator<PartnerVehiclesStackParamList>();
const DriversStack = createNativeStackNavigator<PartnerDriversStackParamList>();

const stackScreenOptions = {
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
  headerBackTitleVisible: false,
  headerBackVisible: false,
  headerLeft: (props: Parameters<typeof StackBackButton>[0]) => <StackBackButton {...props} />,
  contentStyle: { backgroundColor: colors.background },
};

function PartnerJobsStackNavigator() {
  const isDriver = useAppSelector(state => state.auth.user?.role === 'driver');

  return (
    <JobsStack.Navigator initialRouteName="PartnerJobsList" screenOptions={stackScreenOptions}>
      {/* Drivers get the board-01 job list and the 4-step job cycle; vendors keep
          the existing screens. */}
      <JobsStack.Screen
        name="PartnerJobsList"
        component={isDriver ? DriverJobsScreen : PartnerJobsScreen}
        options={{ headerShown: false }}
      />
      <JobsStack.Screen
        name="PartnerActiveJob"
        component={isDriver ? DriverActiveJobScreen : VendorBookingTrackingScreen}
        options={{ headerShown: false }}
      />
      <JobsStack.Screen
        name="VendorVehicles"
        component={VendorVehiclesScreen}
        options={{ headerShown: false }}
      />
      <JobsStack.Screen
        name="VendorVehicleRegistration"
        component={VendorVehicleRegistrationScreen}
        options={{ headerShown: false }}
      />
      <JobsStack.Screen
        name="VendorDrivers"
        component={VendorDriverMembershipsScreen}
        options={{ headerTitle: 'Vendor drivers' }}
      />
      <JobsStack.Screen
        name="VendorAddDriver"
        component={VendorAddDriverScreen}
        options={{ headerShown: false }}
      />
      <JobsStack.Screen
        name="VendorAssignJob"
        component={VendorAssignJobScreen}
        options={{ headerShown: false }}
      />
    </JobsStack.Navigator>
  );
}

function PartnerVehiclesStackNavigator() {
  return (
    <VehiclesStack.Navigator initialRouteName="VendorVehiclesList" screenOptions={stackScreenOptions}>
      <VehiclesStack.Screen
        name="VendorVehiclesList"
        component={VendorVehiclesScreen}
        options={{ headerShown: false }}
      />
      <VehiclesStack.Screen
        name="VendorVehicleRegistration"
        component={VendorVehicleRegistrationScreen}
        options={{ headerShown: false }}
      />
    </VehiclesStack.Navigator>
  );
}

function PartnerDriversStackNavigator() {
  return (
    <DriversStack.Navigator initialRouteName="VendorDriversList" screenOptions={stackScreenOptions}>
      <DriversStack.Screen
        name="VendorDriversList"
        component={VendorDriverMembershipsScreen}
        options={{ headerShown: false }}
      />
      <DriversStack.Screen
        name="VendorAddDriver"
        component={VendorAddDriverScreen}
        options={{ headerShown: false }}
      />
      <DriversStack.Screen
        name="VendorAssignJob"
        component={VendorAssignJobScreen}
        options={{ headerShown: false }}
      />
      <DriversStack.Screen
        name="VendorVehicles"
        component={VendorVehiclesScreen}
        options={{ headerShown: false }}
      />
      <DriversStack.Screen
        name="VendorVehicleRegistration"
        component={VendorVehicleRegistrationScreen}
        options={{ headerShown: false }}
      />
    </DriversStack.Navigator>
  );
}

function PartnerAccountStackNavigator() {
  return (
    <AccountStack.Navigator initialRouteName="PartnerAccountMain" screenOptions={stackScreenOptions}>
      <AccountStack.Screen
        name="PartnerAccountMain"
        component={PartnerAccountScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="PartnerEditProfile"
        component={PartnerEditProfileScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="PartnerDocuments"
        component={PartnerDocumentsScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="PartnerEarnings"
        component={PartnerEarningsScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="PartnerNotifications"
        component={PartnerNotificationsScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="PartnerSettings"
        component={PartnerSettingsScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="PartnerHelpSupport"
        component={PartnerHelpSupportScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="PartnerBankDetails"
        component={PartnerBankDetailsScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="VendorDrivers"
        component={VendorDriverMembershipsScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="VendorAddDriver"
        component={VendorAddDriverScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="VendorAssignJob"
        component={VendorAssignJobScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="VendorVehicles"
        component={VendorVehiclesScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="VendorVehicleRegistration"
        component={VendorVehicleRegistrationScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="VendorVerificationStatus"
        component={PartnerVerificationStatusScreen}
        options={{ headerShown: false }}
      />
    </AccountStack.Navigator>
  );
}

export default function PartnerNavigator() {
  const user = useAppSelector(state => state.auth.user);
  const isPartner = user?.role === 'driver' || user?.role === 'vendor';
  const isDriver = user?.role === 'driver';

  const { data: driverMembership } = useDriverVendorMembershipQuery(isDriver);
  const { data: driverInvitations = [] } = useDriverVendorInvitationsQuery(isDriver && !driverMembership);
  const [previewScenario, setPreviewScenario] = useState(getDriverVendorPreviewScenario);
  useEffect(() => subscribeDriverVendorPreview(() => {
    setPreviewScenario(getDriverVendorPreviewScenario());
  }), []);
  const previewKeepsVendorTab = UI_PREVIEW_MODE && isDriver && previewScenario !== 'none';
  const showVendorTab =
    previewKeepsVendorTab || (isDriver && Boolean(driverMembership || driverInvitations.length > 0));

  return (
    /* The incoming-request alert wraps the navigator so it can pop over any tab
       without being re-mounted per screen. */
    <View style={styles.root}>
    <Tab.Navigator
      tabBar={props => <PartnerTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      {/* Drivers get the dedicated board-01 dashboard; vendors keep the vendor home. */}
      <Tab.Screen
        name="PartnerHome"
        component={isDriver ? DriverDashboardScreen : PartnerHomeScreen}
        options={{ title: 'Home' }}
      />
      {isPartner ? (
        <Tab.Screen
          name="PartnerJobs"
          component={PartnerJobsStackNavigator}
          options={{ title: 'Jobs' }}
        />
      ) : null}
      {/* Tab order: Home → Jobs → Vehicles → Drivers → (My Vendor) → Account */}
      {!isDriver ? (
        <Tab.Screen
          name="PartnerVehicles"
          component={PartnerVehiclesStackNavigator}
          options={{ title: 'Vehicles' }}
        />
      ) : null}
      {!isDriver ? (
        <Tab.Screen
          name="PartnerDrivers"
          component={PartnerDriversStackNavigator}
          options={{ title: 'Drivers' }}
        />
      ) : null}
      {showVendorTab ? (
        <Tab.Screen
          name="PartnerVendor"
          component={DriverMyVendorScreen}
          options={{ title: 'My Vendor' }}
        />
      ) : null}
      <Tab.Screen
        name="PartnerAccount"
        component={PartnerAccountStackNavigator}
        options={{ title: 'Account' }}
      />
    </Tab.Navigator>
    <DriverOfferAlert />
    </View>
  );
}
