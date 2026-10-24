import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationFlowScreen from '../screens/partner/registration/driver/DriverRegistrationFlowScreen';
import DriverVerificationPendingScreen from '../screens/partner/registration/DriverVerificationPendingScreen';
import VendorBusinessAddressScreen from '../screens/partner/registration/vendor/VendorBusinessAddressScreen';
import VendorBusinessInfoScreen from '../screens/partner/registration/vendor/VendorBusinessInfoScreen';
import VendorDocumentsScreen from '../screens/partner/registration/vendor/VendorDocumentsScreen';
import VendorReviewScreen from '../screens/partner/registration/vendor/VendorReviewScreen';
import { usePartnerRegistrationStore } from '../store/partnerRegistrationStore';
import type {
  PartnerRegistrationStackParamList,
  PartnerRootStackParamList,
} from '../types/partnerNavigation';
import { colors } from '../theme';

function DriverPersonalInfoFlowScreen(props: any) {
  return (
    <DriverRegistrationFlowScreen
      {...props}
      route={{ ...props.route, params: { ...props.route?.params, initialStep: 1 } }}
    />
  );
}

function DriverVehicleInfoFlowScreen(props: any) {
  return (
    <DriverRegistrationFlowScreen
      {...props}
      route={{ ...props.route, params: { ...props.route?.params, initialStep: 1 } }}
    />
  );
}

function DriverDocumentsFlowScreen(props: any) {
  return (
    <DriverRegistrationFlowScreen
      {...props}
      route={{ ...props.route, params: { ...props.route?.params, initialStep: 2 } }}
    />
  );
}

function DriverReviewFlowScreen(props: any) {
  return (
    <DriverRegistrationFlowScreen
      {...props}
      route={{ ...props.route, params: { ...props.route?.params, initialStep: 3 } }}
    />
  );
}

const Stack = createNativeStackNavigator<PartnerRegistrationStackParamList>();

type Props = NativeStackScreenProps<PartnerRootStackParamList, 'PartnerRegistration'>;

export default function PartnerRegistrationNavigator({ route }: Props) {
  const { role, mobileNumber } = route.params;
  const setRole = usePartnerRegistrationStore((s) => s.setRole);
  const setDriverPersonal = usePartnerRegistrationStore((s) => s.setDriverPersonal);
  const setVendorBusiness = usePartnerRegistrationStore((s) => s.setVendorBusiness);

  useEffect(() => {
    setRole(role);
    if (mobileNumber) {
      setDriverPersonal({ mobileNumber });
      setVendorBusiness({ mobileNumber });
    }
  }, [mobileNumber, role, setDriverPersonal, setRole, setVendorBusiness]);

  const screenParams = { role, mobileNumber };
  const initialRoute = role === 'driver' ? 'DriverPersonalInfo' : 'VendorBusinessInfo';

  return (
    <Stack.Navigator
      key={role}
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8F9FA' },
        // Registration keeps one shell (header, stepper, footer) per step —
        // a slide transition would move the fixed chrome with the content.
        animation: 'fade',
        animationDuration: 160,
        gestureEnabled: false,
      }}>
      <Stack.Screen
        name="DriverPersonalInfo"
        component={DriverPersonalInfoFlowScreen}
        initialParams={screenParams}
      />
      <Stack.Screen
        name="DriverVehicleInfo"
        component={DriverVehicleInfoFlowScreen}
        initialParams={screenParams}
      />
      <Stack.Screen
        name="DriverDocuments"
        component={DriverDocumentsFlowScreen}
        initialParams={screenParams}
      />
      <Stack.Screen
        name="DriverReview"
        component={DriverReviewFlowScreen}
        initialParams={screenParams}
      />
      <Stack.Screen
        name="DriverVerificationPending"
        component={DriverVerificationPendingScreen}
        initialParams={screenParams}
      />
      <Stack.Screen
        name="VendorBusinessInfo"
        component={VendorBusinessInfoScreen}
        initialParams={screenParams}
      />
      <Stack.Screen
        name="VendorBusinessAddress"
        component={VendorBusinessAddressScreen}
        initialParams={screenParams}
      />
      <Stack.Screen
        name="VendorDocuments"
        component={VendorDocumentsScreen}
        initialParams={screenParams}
      />
      <Stack.Screen
        name="VendorReview"
        component={VendorReviewScreen}
        initialParams={screenParams}
      />
    </Stack.Navigator>
  );
}
