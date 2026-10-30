import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Car, MapPin, Phone, Siren, User } from 'lucide-react-native';

import FormField from '../../components/auth/FormField';
import GoldButton from '../../components/auth/GoldButton';
import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import { useAppDialog } from '../../hooks/useAppDialog';
import { useSosDetails } from '../../context/SosDetailsContext';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';
import { colors, shadows, typography } from '../../theme';

function digitsOnly(value: string, maxLen = 10): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}

function SectionTitle({ label, px }: { label: string; px: (n: number) => number }) {
  return (
    <Text
      style={{
        fontSize: px(14),
        fontWeight: typography.weights.bold,
        color: colors.dark,
        marginBottom: px(10),
        marginTop: px(4),
      }}>
      {label}
    </Text>
  );
}

export default function SosDetailsScreen() {
  const px = useProfilePx();
  const navigation = useNavigation();
  const { dialog, showDialog } = useAppDialog();
  const { details, setDetails } = useSosDetails();

  const [ownerName, setOwnerName] = useState(details.ownerName);
  const [ownerPhone, setOwnerPhone] = useState(details.ownerPhone);
  const [vehicleBrand, setVehicleBrand] = useState(details.vehicleBrand);
  const [vehicleModel, setVehicleModel] = useState(details.vehicleModel);
  const [vehicleNumber, setVehicleNumber] = useState(details.vehicleNumber);
  const [contactName, setContactName] = useState(details.contactName);
  const [contactRelation, setContactRelation] = useState(details.contactRelation);
  const [contactPhone, setContactPhone] = useState(details.contactPhone);
  const [location, setLocation] = useState(details.location);

  useFocusEffect(
    useCallback(() => {
      setOwnerName(details.ownerName);
      setOwnerPhone(details.ownerPhone);
      setVehicleBrand(details.vehicleBrand);
      setVehicleModel(details.vehicleModel);
      setVehicleNumber(details.vehicleNumber);
      setContactName(details.contactName);
      setContactRelation(details.contactRelation);
      setContactPhone(details.contactPhone);
      setLocation(details.location);
    }, [details]),
  );

  const handleSave = () => {
    if (!ownerName.trim() || !ownerPhone.trim()) {
      showDialog({
        tone: 'warning',
        title: 'Required',
        message: 'Please enter vehicle owner name and phone.',
        primaryLabel: 'OK',
      });
      return;
    }
    if (!contactName.trim() || !contactPhone.trim()) {
      showDialog({
        tone: 'warning',
        title: 'Required',
        message: 'Please enter emergency contact details.',
        primaryLabel: 'OK',
      });
      return;
    }
    if (!vehicleNumber.trim()) {
      showDialog({
        tone: 'warning',
        title: 'Required',
        message: 'Please enter your vehicle number.',
        primaryLabel: 'OK',
      });
      return;
    }

    setDetails({
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      vehicleBrand: vehicleBrand.trim(),
      vehicleModel: vehicleModel.trim(),
      vehicleNumber: vehicleNumber.trim(),
      contactName: contactName.trim(),
      contactRelation: contactRelation.trim(),
      contactPhone: contactPhone.trim(),
      location: location.trim(),
    });
    showDialog({
      tone: 'success',
      title: 'Saved',
      message: 'Your SOS details have been updated.',
      primaryLabel: 'OK',
      onPrimary: () => goBackWithinStack(navigation),
    });
  };

  return (
    <ProfileSubScreenLayout
      title="SOS Details"
      subtitle="Shown on your emergency assistance screen">
      {dialog}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: px(10),
          borderRadius: px(14),
          backgroundColor: colors.goldLight,
          padding: px(14),
          marginBottom: px(18),
        }}>
        <View
          style={{
            width: px(40),
            height: px(40),
            borderRadius: px(20),
            backgroundColor: colors.error,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Siren size={px(20)} color={colors.background} strokeWidth={2.2} />
        </View>
        <Text style={{ flex: 1, fontSize: px(12), color: colors.dark, lineHeight: px(18) }}>
          These details appear when someone scans your QR code or opens your SOS screen.
        </Text>
      </View>

      <SectionTitle label="Vehicle Owner" px={px} />
      <View style={{ gap: px(12), marginBottom: px(16) }}>
        <FormField
          label="Owner Name"
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder="Full name"
          Icon={User}
          variant="outlined"
          compact
          required
        />
        <FormField
          label="Owner Phone"
          value={ownerPhone}
          onChangeText={value => setOwnerPhone(digitsOnly(value))}
          placeholder="10-digit mobile"
          Icon={Phone}
          variant="outlined"
          compact
          keyboardType="phone-pad"
          maxLength={10}
          required
        />
      </View>

      <SectionTitle label="Vehicle Details" px={px} />
      <View style={{ gap: px(12), marginBottom: px(16) }}>
        <FormField
          label="Brand"
          value={vehicleBrand}
          onChangeText={setVehicleBrand}
          placeholder="e.g. Toyota"
          Icon={Car}
          variant="outlined"
          compact
        />
        <FormField
          label="Model"
          value={vehicleModel}
          onChangeText={setVehicleModel}
          placeholder="e.g. Innova Crysta"
          Icon={Car}
          variant="outlined"
          compact
        />
        <FormField
          label="Vehicle Number"
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          placeholder="MH 12 AB 1234"
          Icon={Car}
          variant="outlined"
          compact
          required
        />
      </View>

      <SectionTitle label="Emergency Contact" px={px} />
      <View style={{ gap: px(12), marginBottom: px(16) }}>
        <FormField
          label="Contact Name"
          value={contactName}
          onChangeText={setContactName}
          placeholder="Contact name"
          Icon={User}
          variant="outlined"
          compact
          required
        />
        <FormField
          label="Relation"
          value={contactRelation}
          onChangeText={setContactRelation}
          placeholder="e.g. Wife, Father"
          Icon={User}
          variant="outlined"
          compact
        />
        <FormField
          label="Contact Phone"
          value={contactPhone}
          onChangeText={value => setContactPhone(digitsOnly(value))}
          placeholder="10-digit mobile"
          Icon={Phone}
          variant="outlined"
          compact
          keyboardType="phone-pad"
          maxLength={10}
          iconColor={colors.error}
          required
        />
      </View>

      <SectionTitle label="Default Location" px={px} />
      <View style={{ gap: px(12), marginBottom: px(20) }}>
        <FormField
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="Area, City, State"
          Icon={MapPin}
          variant="outlined"
          compact
        />
      </View>

      <GoldButton label="Save SOS Details" onPress={handleSave} style={shadows.card} />
    </ProfileSubScreenLayout>
  );
}
