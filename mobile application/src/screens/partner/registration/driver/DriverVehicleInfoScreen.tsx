import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react-native';
import { Car, CreditCard, FileText, Shield } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import FormField from '../../../../components/auth/FormField';
import PartnerRegistrationLayout from '../../../../components/partner/PartnerRegistrationLayout';
import {
  PartnerRegistrationFooter,
  PartnerSectionHeader,
} from '../../../../components/partner/PartnerRegistrationSections';
import {
  DRIVER_REGISTRATION_STEPS,
  INSURANCE_PROVIDER_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
} from '../../../../constants/partnerRegistration';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import { partnerRegistrationGoBack, showSelectOptions } from '../../../../utils/partnerRegistration';
import { colors } from '../../../../theme';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'DriverVehicleInfo'>;

export default function DriverVehicleInfoScreen({ navigation, route }: Props) {
  const driverVehicle = usePartnerRegistrationStore((s) => s.driverVehicle);
  const setDriverVehicle = usePartnerRegistrationStore((s) => s.setDriverVehicle);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handleBack = () =>
    partnerRegistrationGoBack(navigation, 'DriverVehicleInfo', route.params);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!driverVehicle.vehicleType) next.vehicleType = 'Select vehicle type';
    if (!driverVehicle.vehicleNumber.trim()) next.vehicleNumber = 'Vehicle number is required';
    if (!driverVehicle.rcNumber.trim()) next.rcNumber = 'RC number is required';
    if (!driverVehicle.licenseNumber.trim()) next.licenseNumber = 'Driving License number is required';
    if (!driverVehicle.insuranceProvider) next.insuranceProvider = 'Select insurance provider';
    if (!driverVehicle.insurancePolicyNumber.trim()) {
      next.insurancePolicyNumber = 'Policy number is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return (
    <PartnerRegistrationLayout
      title="Driver Registration"
      stepLabel="Step 2 of 4"
      steps={DRIVER_REGISTRATION_STEPS}
      activeStep={2}
      onBack={handleBack}
      footer={
        <PartnerRegistrationFooter
          showBack
          onBack={handleBack}
          onContinue={() => {
            if (!validate()) return;
            navigation.navigate('DriverDocuments', route.params);
          }}
        />
      }>
      <PartnerSectionHeader
        Icon={Car}
        title="Vehicle Information"
        subtitle="Please provide your vehicle details"
      />

      <FormField
        label="Vehicle Type"
        required
        Icon={Car}
        value={driverVehicle.vehicleType}
        placeholder="Select vehicle type"
        editable={false}
        onPress={() =>
          showSelectOptions(
            'Vehicle Type',
            VEHICLE_TYPE_OPTIONS,
            (vehicleType) => setDriverVehicle({ vehicleType }),
            driverVehicle.vehicleType,
          )
        }
        rightElement={<ChevronDown size={18} color={colors.primary} />}
        error={errors.vehicleType}
      />
      <FormField
        label="Vehicle Number"
        required
        Icon={CreditCard}
        autoCapitalize="characters"
        value={driverVehicle.vehicleNumber}
        onChangeText={(vehicleNumber) => setDriverVehicle({ vehicleNumber: vehicleNumber.toUpperCase() })}
        placeholder="Enter vehicle number (e.g. MH12AB1234)"
        error={errors.vehicleNumber}
      />
      <FormField
        label="RC Number"
        required
        Icon={FileText}
        autoCapitalize="characters"
        value={driverVehicle.rcNumber}
        onChangeText={(rcNumber) => setDriverVehicle({ rcNumber: rcNumber.toUpperCase() })}
        placeholder="Enter RC number"
        error={errors.rcNumber}
      />
      <FormField
        label="Driving License Number"
        required
        Icon={CreditCard}
        autoCapitalize="characters"
        value={driverVehicle.licenseNumber}
        onChangeText={(licenseNumber) => setDriverVehicle({ licenseNumber: licenseNumber.toUpperCase() })}
        placeholder="Enter Driving License (DL) number"
        error={errors.licenseNumber}
      />
      <FormField
        label="Insurance Provider"
        required
        Icon={Shield}
        value={driverVehicle.insuranceProvider}
        placeholder="Select insurance provider"
        editable={false}
        onPress={() =>
          showSelectOptions(
            'Insurance Provider',
            INSURANCE_PROVIDER_OPTIONS,
            (insuranceProvider) => setDriverVehicle({ insuranceProvider }),
            driverVehicle.insuranceProvider,
          )
        }
        rightElement={<ChevronDown size={18} color={colors.primary} />}
        error={errors.insuranceProvider}
      />
      <FormField
        label="Insurance Policy Number"
        required
        Icon={FileText}
        value={driverVehicle.insurancePolicyNumber}
        onChangeText={(insurancePolicyNumber) => setDriverVehicle({ insurancePolicyNumber })}
        placeholder="Enter policy number"
        error={errors.insurancePolicyNumber}
      />
      <FormField
        label="Vehicle Model"
        optional
        Icon={Car}
        value={driverVehicle.vehicleModel}
        onChangeText={(vehicleModel) => setDriverVehicle({ vehicleModel })}
        placeholder="Enter vehicle model (optional)"
      />
    </PartnerRegistrationLayout>
  );
}
