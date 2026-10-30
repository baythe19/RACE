import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bike,
  Bus,
  Camera,
  Car,
  Check,
  CircleEllipsis,
  CreditCard,
  Fuel,
  Leaf,
  Palette,
  Shield,
  Truck,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import FormField from '../../components/auth/FormField';
import GoldButton from '../../components/auth/GoldButton';
import ProfileSubScreenLayout from '../../components/profile/ProfileSubScreenLayout';
import { FUEL_TYPES, VEHICLE_COLORS, VEHICLE_TYPES } from '../../constants/auth';
import { useAppDialog } from '../../hooks/useAppDialog';
import type { ProfileStackParamList } from '../../types/navigation';
import { colors, shadows, typography } from '../../theme';
import { goBackWithinStack } from '../../navigation/goBackWithinStack';

const REF_W = 390;

type Props = NativeStackScreenProps<ProfileStackParamList, 'AddVehicle'>;

const TYPE_ICONS: Record<string, LucideIcon> = { Car, Bike, Truck, Bus };

const FUEL_ICONS: Record<string, LucideIcon> = {
  Petrol: Fuel,
  Diesel: Fuel,
  CNG: Fuel,
  Electric: Zap,
  Hybrid: Leaf,
  Other: CircleEllipsis,
};

export default function AddVehicleScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);
  const { dialog, showDialog } = useAppDialog();

  const [selectedType, setSelectedType] = useState('car');
  const [number, setNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [selectedColor, setSelectedColor] = useState('#EF4444');
  const [selectedFuel, setSelectedFuel] = useState('Petrol');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const typeCardW = px(62);

  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSave = () => {
    const nextErrors: Record<string, string> = {};
    if (!number.trim()) nextErrors.number = 'Please enter vehicle number';
    if (!brand.trim()) nextErrors.brand = 'Please enter brand';
    if (!model.trim()) nextErrors.model = 'Please enter model';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      showDialog({
        tone: 'success',
        title: 'Vehicle Saved',
        message: 'Your vehicle has been added successfully.',
        primaryLabel: 'OK',
        onPrimary: () => goBackWithinStack(navigation),
      });
    }
  };

  const sectionLabel = (text: string, required = true) => (
    <Text
      style={{
        fontSize: px(13),
        fontWeight: typography.weights.medium,
        color: colors.grey,
        marginBottom: px(10),
      }}>
      {text}
      {required ? <Text style={{ color: colors.error }}> *</Text> : null}
    </Text>
  );

  return (
    <ProfileSubScreenLayout
      title="Add Vehicle"
      keyboardAvoiding
      onBack={() => goBackWithinStack(navigation)}
      footer={
        <View
          style={{
            paddingHorizontal: px(20),
            paddingTop: px(12),
            paddingBottom: Math.max(insets.bottom, px(16)),
            backgroundColor: colors.background,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          }}>
          <GoldButton
            label="Save Vehicle"
            onPress={handleSave}
            style={[styles.fullBtn, shadows.card]}
            height={px(54)}
            labelSize={px(17)}
            borderRadius={px(14)}
          />
        </View>
      }>
          {sectionLabel('Vehicle Type')}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: px(20),
            }}>
            {VEHICLE_TYPES.map(type => {
              const Icon = TYPE_ICONS[type.icon] ?? Car;
              const selected = selectedType === type.id;
              return (
                <Pressable
                  key={type.id}
                  style={{
                    width: typeCardW,
                    height: px(72),
                    borderRadius: px(12),
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.goldLight : colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: px(6),
                  }}
                  onPress={() => setSelectedType(type.id)}>
                  <Icon size={px(22)} color={selected ? colors.primary : colors.dark} />
                  <Text
                    style={{
                      fontSize: px(11),
                      fontWeight: typography.weights.semibold,
                      color: selected ? colors.primary : colors.dark,
                    }}>
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FormField
            variant="outlined"
            compact
            scale={s}
            label="Vehicle Number"
            required
            Icon={CreditCard}
            value={number}
            onChangeText={text => {
              setNumber(text);
              clearError('number');
            }}
            placeholder="OD 05 AB 1234"
            autoCapitalize="characters"
            style={{ letterSpacing: 1 }}
            error={errors.number}
          />

          <FormField
            variant="outlined"
            compact
            scale={s}
            label="Vehicle Brand"
            required
            Icon={Shield}
            value={brand}
            onChangeText={text => {
              setBrand(text);
              clearError('brand');
            }}
            placeholder="Honda"
            error={errors.brand}
          />

          <FormField
            variant="outlined"
            compact
            scale={s}
            label="Vehicle Model"
            required
            Icon={Car}
            value={model}
            onChangeText={text => {
              setModel(text);
              clearError('model');
            }}
            placeholder="City ZX"
            error={errors.model}
          />

          {sectionLabel('Vehicle Color')}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: px(10),
              marginBottom: px(20),
            }}>
            {VEHICLE_COLORS.map(color => {
              const selected = selectedColor === color;
              return (
                <Pressable
                  key={color}
                  style={{
                    width: px(32),
                    height: px(32),
                    borderRadius: px(16),
                    backgroundColor: color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: color === '#FFFFFF' ? 1 : selected ? 2 : 0,
                    borderColor: selected ? colors.primary : colors.border,
                  }}
                  onPress={() => setSelectedColor(color)}>
                  {selected ? (
                    <Check
                      size={px(14)}
                      color={color === '#000000' ? colors.background : colors.dark}
                      strokeWidth={3}
                    />
                  ) : null}
                </Pressable>
              );
            })}
            <View
              style={{
                width: px(32),
                height: px(32),
                borderRadius: px(16),
                backgroundColor: colors.lightGrey,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Palette size={px(16)} color={colors.grey} />
            </View>
          </View>

          {sectionLabel('Fuel Type')}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: px(8),
              marginBottom: px(20),
            }}>
            {FUEL_TYPES.map(fuel => {
              const selected = selectedFuel === fuel;
              const FuelIcon = FUEL_ICONS[fuel] ?? Fuel;
              const label = fuel === 'Electric' ? 'EV' : fuel;
              return (
                <Pressable
                  key={fuel}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: px(6),
                    height: px(38),
                    paddingHorizontal: px(14),
                    borderRadius: px(20),
                    borderWidth: 1.5,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.goldLight : colors.background,
                  }}
                  onPress={() => setSelectedFuel(fuel)}>
                  <FuelIcon size={px(14)} color={selected ? colors.primary : colors.grey} />
                  <Text
                    style={{
                      fontSize: px(13),
                      fontWeight: selected ? typography.weights.bold : typography.weights.semibold,
                      color: colors.dark,
                    }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {sectionLabel('Add Vehicle Photo (Optional)', false)}
          <Pressable
            style={{
              borderWidth: 1.5,
              borderColor: colors.primary,
              borderStyle: 'dashed',
              borderRadius: px(12),
              paddingVertical: px(28),
              alignItems: 'center',
              marginBottom: px(8),
            }}
            onPress={() =>
              showDialog({
                tone: 'info',
                title: 'Photo',
                message: 'Camera coming soon',
                primaryLabel: 'Got it',
              })
            }>
            <Camera size={px(28)} color={colors.primary} />
            <Text
              style={{
                marginTop: px(8),
                fontSize: px(14),
                fontWeight: typography.weights.bold,
                color: colors.dark,
              }}>
              Add Vehicle Photo (Optional)
            </Text>
          </Pressable>
      {dialog}
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  fullBtn: { width: '100%' },
});
