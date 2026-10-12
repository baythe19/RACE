import React from 'react';
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
import PartnerJobsScreen from '../screens/partner/PartnerJobsScreen';
import PartnerActiveJobScreen from '../screens/partner/PartnerActiveJobScreen';
import PartnerAccountScreen from '../screens/partner/PartnerAccountScreen';
import PartnerVerificationStatusScreen from '../screens/partner/PartnerVerificationStatusScreen';
import VendorDriversScreen from '../screens/partner/VendorDriversScreen';
import VendorVehiclesScreen from '../screens/partner/VendorVehiclesScreen';
import VendorAssignJobScreen from '../screens/partner/VendorAssignJobScreen';
import type {
  PartnerAccountStackParamList,
  PartnerJobsStackParamList,
  PartnerTabParamList,
} from '../types/partnerNavigation';
import { colors, typography } from '../theme';

const styles = StyleSheet.create({
  root: { flex: 1 },
});

const Tab = createBottomTabNavigator<PartnerTabParamList>();
const AccountStack = createNativeStackNavigator<PartnerAccountStackParamList>();
const JobsStack = createNativeStackNavigator<PartnerJobsStackParamList>();

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
    <JobsStack.Navigator screenOptions={stackScreenOptions}>
      {/* Drivers get the board-01 job list and the 4-step job cycle; vendors keep
          the existing screens. */}
      <JobsStack.Screen
        name="PartnerJobsList"
        component={isDriver ? DriverJobsScreen : PartnerJobsScreen}
        options={{ headerShown: false }}
      />
      <JobsStack.Screen
        name="PartnerActiveJob"
        component={isDriver ? DriverActiveJobScreen : PartnerActiveJobScreen}
        options={isDriver ? { headerShown: false } : { headerTitle: 'Active job' }}
      />
      <JobsStack.Screen
        name="VendorVehicles"
        component={VendorVehiclesScreen}
        options={{ headerTitle: 'Vendor vehicles' }}
      />
      <JobsStack.Screen
        name="VendorAssignJob"
        component={VendorAssignJobScreen}
        options={{ headerTitle: 'Assign job' }}
      />
    </JobsStack.Navigator>
  );
}

function PartnerAccountStackNavigator() {
  return (
    <AccountStack.Navigator screenOptions={stackScreenOptions}>
      <AccountStack.Screen
        name="PartnerAccountMain"
        component={PartnerAccountScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="VendorDrivers"
        component={VendorDriversScreen}
        options={{ headerTitle: 'Vendor drivers' }}
      />
      <AccountStack.Screen
        name="VendorVehicles"
        component={VendorVehiclesScreen}
        options={{ headerTitle: 'Vendor vehicles' }}
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
