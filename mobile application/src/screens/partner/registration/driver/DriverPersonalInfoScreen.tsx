import React, { useState } from 'react';
import { Mail, MapPin, Phone, User } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DateOfBirthField from '../../../../components/auth/DateOfBirthField';
import FormField from '../../../../components/auth/FormField';
import PartnerRegistrationLayout from '../../../../components/partner/PartnerRegistrationLayout';
import {
  PartnerRegistrationFooter,
  PartnerSectionHeader,
  PartnerSecurityNote,
} from '../../../../components/partner/PartnerRegistrationSections';
import { DRIVER_REGISTRATION_STEPS } from '../../../../constants/partnerRegistration';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import { isValidEmail, partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'DriverPersonalInfo'>;

export default function DriverPersonalInfoScreen({ navigation, route }: Props) {
  const driverPersonal = usePartnerRegistrationStore((s) => s.driverPersonal);
  const setDriverPersonal = usePartnerRegistrationStore((s) => s.setDriverPersonal);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handleBack = () =>
    partnerRegistrationGoBack(navigation, 'DriverPersonalInfo', route.params);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!driverPersonal.fullName.trim()) next.fullName = 'Full name is required';
    if (!/^[6-9]\d{9}$/.test(driverPersonal.mobileNumber)) {
      next.mobileNumber = 'Enter a valid 10-digit mobile number';
    }
    if (driverPersonal.email.trim() && !isValidEmail(driverPersonal.email)) {
      next.email = 'Enter a valid email address';
    }
    if (!driverPersonal.dateOfBirth.trim()) next.dateOfBirth = 'Date of birth is required';
    if (!driverPersonal.address.trim()) next.address = 'Address is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    navigation.navigate('DriverVehicleInfo', route.params);
  };

  return (
    <PartnerRegistrationLayout
      title="Driver Registration"
      stepLabel="Step 1 of 4"
      steps={DRIVER_REGISTRATION_STEPS}
      activeStep={1}
      onBack={handleBack}
      footer={
        <PartnerRegistrationFooter
          showBack
          onBack={handleBack}
          onContinue={handleContinue}
        />
      }>
      <PartnerSectionHeader
        Icon={User}
        title="Personal Information"
        subtitle="Please provide your personal details to create your account"
      />

      <FormField
        label="Full Name"
        required
        Icon={User}
        value={driverPersonal.fullName}
        onChangeText={(fullName) => setDriverPersonal({ fullName })}
        placeholder="Enter your full name"
        error={errors.fullName}
      />
      <FormField
        label="Mobile Number"
        required
        Icon={Phone}
        keyboardType="number-pad"
        maxLength={10}
        value={driverPersonal.mobileNumber}
        onChangeText={(mobileNumber) =>
          setDriverPersonal({ mobileNumber: mobileNumber.replace(/\D/g, '').slice(0, 10) })
        }
        placeholder="Enter mobile number"
        error={errors.mobileNumber}
      />
      <FormField
        label="Email Address"
        optional
        Icon={Mail}
        keyboardType="email-address"
        autoCapitalize="none"
        value={driverPersonal.email}
        onChangeText={(email) => setDriverPersonal({ email })}
        placeholder="Enter email address (optional)"
        error={errors.email}
      />
      <DateOfBirthField
        variant="filled"
        value={driverPersonal.dateOfBirth}
        onChange={(dateOfBirth) => setDriverPersonal({ dateOfBirth })}
        error={errors.dateOfBirth}
        required
      />
      <FormField
        label="Address"
        required
        Icon={MapPin}
        value={driverPersonal.address}
        onChangeText={(address) => setDriverPersonal({ address })}
        placeholder="Enter your address"
        error={errors.address}
      />
      <FormField
        label="City"
        required
        Icon={MapPin}
        value={driverPersonal.city ?? 'Bhubaneswar'}
        onChangeText={(city) => setDriverPersonal({ city })}
        placeholder="Enter city (e.g. Bhubaneswar)"
        error={errors.city}
      />
      <FormField
        label="Emergency Contact Name"
        optional
        Icon={User}
        value={driverPersonal.emergencyContactName ?? ''}
        onChangeText={(emergencyContactName) => setDriverPersonal({ emergencyContactName })}
        placeholder="Emergency contact person name"
      />
      <FormField
        label="Emergency Contact Number"
        optional
        Icon={Phone}
        keyboardType="number-pad"
        maxLength={10}
        value={driverPersonal.emergencyContactNumber ?? ''}
        onChangeText={(emergencyContactNumber) =>
          setDriverPersonal({ emergencyContactNumber: emergencyContactNumber.replace(/\D/g, '').slice(0, 10) })
        }
        placeholder="10-digit emergency contact number"
        error={errors.emergencyContactNumber}
      />
      <FormField
        label="Driving Experience (Years)"
        optional
        Icon={User}
        keyboardType="number-pad"
        maxLength={2}
        value={driverPersonal.yearsOfExperience ?? ''}
        onChangeText={(yearsOfExperience) => setDriverPersonal({ yearsOfExperience })}
        placeholder="e.g. 5"
      />
      <FormField
        label="Languages Known"
        optional
        Icon={User}
        value={driverPersonal.languages ?? ''}
        onChangeText={(languages) => setDriverPersonal({ languages })}
        placeholder="e.g. Odia, Hindi, English"
      />

      <PartnerSecurityNote text="Your information is safe with us. We never share your data with anyone." />
    </PartnerRegistrationLayout>
  );
}
