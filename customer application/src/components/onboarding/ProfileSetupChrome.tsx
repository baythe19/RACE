import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Bike,
  Car,
  ChevronDown,
  CircleEllipsis,
  Heart,
  IdCard,
  Lock,
  Mail,
  Phone,
  Truck,
  User,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

import { AUTH_COLORS as COLORS } from '../auth/authDesign';
import {
  registerProfileDropdownCloser,
  unregisterProfileDropdownCloser,
} from './profileDropdownDismiss';

const ICON_MUTED = '#8A8B94';

export function ProfileStepper({ scale, step }: { scale: number; step: 1 | 2 | 3 }) {
  const size = 28 * scale;
  const items: Array<1 | 2 | 3> = [1, 2, 3];
  return (
    <View
      style={{
        height: 44 * scale,
        marginHorizontal: 56 * scale,
        marginBottom: 14 * scale,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      {items.map((item, index) => {
        const active = item <= step;
        const current = item === step;
        return (
          <React.Fragment key={item}>
            {index > 0 ? (
              <View
                style={{
                  flex: 1,
                  height: 3 * scale,
                  marginHorizontal: 8 * scale,
                  borderRadius: 99,
                  backgroundColor: item <= step ? '#F3A200' : '#E8E4D8',
                }}
              />
            ) : null}
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? '#F3A200' : '#FFFFFF',
                borderWidth: current || active ? 0 : 1.5,
                borderColor: '#E2DED4',
              }}>
              <Text
                style={{
                  color: active ? '#FFFFFF' : '#A7A49A',
                  fontSize: 13 * scale,
                  fontWeight: '800',
                  includeFontPadding: true,
                }}>
                {item}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

function FieldIconUser({ size }: { size: number }) {
  return <User size={size} color={ICON_MUTED} strokeWidth={1.9} />;
}

function FieldIconMail({ size }: { size: number }) {
  return <Mail size={size} color={ICON_MUTED} strokeWidth={1.9} />;
}

function FieldIconPhone({ size }: { size: number }) {
  return <Phone size={size} color={ICON_MUTED} strokeWidth={1.9} />;
}

function FieldIconHeart({ size }: { size: number }) {
  return <Heart size={size} color={ICON_MUTED} strokeWidth={1.9} />;
}

function FieldIconPlate({ size }: { size: number }) {
  return <IdCard size={size} color={ICON_MUTED} strokeWidth={1.9} />;
}

function FieldIconLock({ size }: { size: number }) {
  return <Lock size={size} color="#B0AFA6" strokeWidth={1.9} />;
}

function ChevronIcon({ size, open }: { size: number; open: boolean }) {
  return (
    <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
      <ChevronDown size={size} color="#8A8B94" strokeWidth={2.1} />
    </View>
  );
}

const ICONS = {
  user: FieldIconUser,
  mail: FieldIconMail,
  phone: FieldIconPhone,
  heart: FieldIconHeart,
  plate: FieldIconPlate,
};

export function ProfileField({
  scale,
  label,
  required,
  icon,
  value,
  placeholder,
  onChangeText,
  keyboardType,
  autoCapitalize,
  onFocus,
  error,
}: {
  scale: number;
  label: string;
  required?: boolean;
  icon: keyof typeof ICONS;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'words' | 'characters';
  onFocus?: () => void;
  error?: string;
}) {
  const Icon = ICONS[icon];
  return (
    <View style={{ marginBottom: 16 * scale }}>
      <Text
        style={{
          marginBottom: 6 * scale,
          color: '#24252B',
          fontSize: 14 * scale,
          lineHeight: 20 * scale,
          fontWeight: '600',
        }}>
        {label}
        {required ? <Text style={{ color: '#E23B3B' }}> *</Text> : null}
      </Text>
      <View
        style={{
          height: 50 * scale,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14 * scale,
          borderWidth: 1,
          borderColor: error ? '#E23B3B' : COLORS.border,
          borderRadius: 12 * scale,
          backgroundColor: '#FFFFFF',
        }}>
        <Icon size={18 * scale} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          placeholder={placeholder}
          placeholderTextColor="#B0B1B8"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={{
            flex: 1,
            marginLeft: 10 * scale,
            fontSize: 15 * scale,
            color: COLORS.ink,
            paddingVertical: 0,
          }}
        />
      </View>
      {error ? (
        <Text
          style={{
            marginTop: 4 * scale,
            color: '#E23B3B',
            fontSize: 12 * scale,
            lineHeight: 16 * scale,
            fontWeight: '500',
          }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function ProfileMobileField({
  scale,
  label,
  required,
  value,
  placeholder,
  onChangeText,
  onFocus,
  error,
}: {
  scale: number;
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  error?: string;
}) {
  return (
    <View style={{ marginBottom: 16 * scale }}>
      <Text
        style={{
          marginBottom: 6 * scale,
          color: '#24252B',
          fontSize: 14 * scale,
          lineHeight: 20 * scale,
          fontWeight: '600',
        }}>
        {label}
        {required ? <Text style={{ color: '#E23B3B' }}> *</Text> : null}
      </Text>
      <View
        style={{
          height: 50 * scale,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: error ? '#E23B3B' : COLORS.border,
          borderRadius: 12 * scale,
          backgroundColor: '#FFFFFF',
          paddingLeft: 12 * scale,
          paddingRight: 12 * scale,
        }}>
        <FieldIconPhone size={18 * scale} />
        <Text
          style={{
            marginLeft: 8 * scale,
            fontSize: 15 * scale,
            fontWeight: '700',
            color: '#25262C',
          }}>
          +91
        </Text>
        <ChevronIcon size={14 * scale} open={false} />
        <View style={{ width: 1, height: 22 * scale, marginHorizontal: 10 * scale, backgroundColor: '#E7E7E8' }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          placeholder={placeholder}
          placeholderTextColor="#B0B1B8"
          keyboardType="phone-pad"
          autoCorrect={false}
          style={{
            flex: 1,
            fontSize: 15 * scale,
            color: COLORS.ink,
            paddingVertical: 0,
          }}
        />
      </View>
      {error ? (
        <Text
          style={{
            marginTop: 4 * scale,
            color: '#E23B3B',
            fontSize: 12 * scale,
            lineHeight: 16 * scale,
            fontWeight: '500',
          }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function ProfileDropdown({
  scale,
  label,
  required,
  icon,
  value,
  placeholder,
  options,
  onSelect,
  onOpenChange,
}: {
  scale: number;
  label: string;
  required?: boolean;
  icon?: keyof typeof ICONS;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const fieldRef = useRef<View>(null);
  const Icon = icon ? ICONS[icon] : null;
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    onOpenChange?.(open);
    if (open) {
      registerProfileDropdownCloser(close);
      return () => unregisterProfileDropdownCloser(close);
    }
    unregisterProfileDropdownCloser(close);
    return undefined;
  }, [close, onOpenChange, open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    fieldRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const menuTop = anchor ? anchor.y + anchor.height + 6 : 0;

  return (
    <View style={{ marginBottom: 16 * scale, zIndex: open ? 40 : 1 }}>
      <Text
        style={{
          marginBottom: 6 * scale,
          color: '#24252B',
          fontSize: 14 * scale,
          lineHeight: 20 * scale,
          fontWeight: '600',
        }}>
        {label}
        {required ? <Text style={{ color: '#E23B3B' }}> *</Text> : null}
      </Text>
      <View ref={fieldRef} collapsable={false}>
        <Pressable
          android_ripple={{ color: 'transparent' }}
          onPress={toggle}
          style={{
            height: 50 * scale,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14 * scale,
            borderWidth: 1,
            borderColor: open ? COLORS.orange : COLORS.border,
            borderRadius: 12 * scale,
            backgroundColor: '#FFFFFF',
          }}>
          {Icon ? <Icon size={18 * scale} /> : null}
          <Text
            style={{
              flex: 1,
              marginLeft: Icon ? 10 * scale : 0,
              fontSize: 15 * scale,
              color: value ? COLORS.ink : '#B0B1B8',
            }}>
            {value || placeholder}
          </Text>
          <ChevronIcon size={18 * scale} open={open} />
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
        <Pressable accessibilityLabel="Close menu" style={StyleSheet.absoluteFill} onPress={close} />
        {anchor ? (
          <View
            style={{
              position: 'absolute',
              top: menuTop,
              left: anchor.x,
              width: anchor.width,
              borderRadius: 12 * scale,
              borderWidth: 1,
              borderColor: COLORS.border,
              backgroundColor: '#FFFEFC',
              overflow: 'hidden',
              elevation: 16,
              zIndex: 2,
            }}>
            {options.map((option, index) => (
              <Pressable
                key={option}
                android_ripple={{ color: 'transparent' }}
                onPress={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                style={{
                  minHeight: 44 * scale,
                  paddingHorizontal: 14 * scale,
                  justifyContent: 'center',
                  backgroundColor: option === value ? '#FFF8E8' : '#FFFEFC',
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: COLORS.divider,
                }}>
                <Text style={{ color: COLORS.ink, fontSize: 15 * scale }}>{option}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

export function GoldCta({
  scale,
  label,
  onPress,
  marginHorizontal = 0,
}: {
  scale: number;
  label: string;
  onPress: () => void;
  marginHorizontal?: number;
}) {
  const height = 52 * scale;
  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={{ color: 'transparent' }}
      onPress={onPress}
      style={({ pressed }) => ({
        height,
        marginTop: 6 * scale,
        marginHorizontal: marginHorizontal * scale,
        borderRadius: 14 * scale,
        backgroundColor: pressed ? '#F6BA3A' : '#FFC74C',
        alignItems: 'center',
        justifyContent: 'center',
      })}>
      <Text
        style={{
          color: '#0B0C10',
          fontSize: 17 * scale,
          lineHeight: 26 * scale,
          fontWeight: '800',
        }}>
        {label}
      </Text>
      <View style={{ position: 'absolute', right: 22 * scale }} pointerEvents="none">
        <Svg width={22 * scale} height={22 * scale} viewBox="0 0 24 24">
          <Path d="M4 12 H19 M13 6 L19 12 L13 18" fill="none" stroke="#17191E" strokeWidth="1.8" strokeLinecap="round" />
        </Svg>
      </View>
    </Pressable>
  );
}

export function OutlineCta({
  scale,
  label,
  onPress,
}: {
  scale: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
        android_ripple={{ color: 'transparent' }}
        style={({ pressed }) => ({
        height: 48 * scale,
        marginTop: 10 * scale,
        borderRadius: 14 * scale,
        borderWidth: 1.5,
        borderColor: '#E7E4DC',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? '#F7F6F2' : '#FFFFFF',
      })}>
      <Text style={{ color: '#6F7078', fontSize: 16 * scale, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function PrivacyNote({ scale }: { scale: number }) {
  return (
    <View style={{ marginTop: 14 * scale, flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ marginTop: 1 * scale }}>
        <FieldIconLock size={16 * scale} />
      </View>
      <Text
        style={{
          flex: 1,
          marginLeft: 8 * scale,
          color: '#9A9A92',
          fontSize: 12 * scale,
          lineHeight: 16 * scale,
        }}
        numberOfLines={2}>
        Your contact details stay private and are used only for emergencies.
      </Text>
    </View>
  );
}

export function InfoNote({ scale, text }: { scale: number; text: string }) {
  return (
    <View
      style={{
        marginBottom: 16 * scale,
        padding: 12 * scale,
        borderRadius: 12 * scale,
        backgroundColor: '#FBF7EC',
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}>
      <Text style={{ color: COLORS.orange, fontSize: 14 * scale, fontWeight: '800' }}>i</Text>
      <Text
        style={{
          flex: 1,
          marginLeft: 8 * scale,
          color: '#8A8678',
          fontSize: 13 * scale,
          lineHeight: 18 * scale,
        }}
        numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const VEHICLE_TYPE_CHIPS: Array<{
  id: string;
  label: string;
  Icon: typeof Car;
}> = [
  { id: 'car', label: 'Car', Icon: Car },
  { id: 'bike', label: 'Bike', Icon: Bike },
  { id: 'truck', label: 'Truck', Icon: Truck },
  { id: 'other', label: 'Other', Icon: CircleEllipsis },
];

export function VehicleTypeChips({
  scale,
  value,
  onChange,
}: {
  scale: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ marginBottom: 16 * scale }}>
      <Text
        style={{
          marginBottom: 8 * scale,
          color: '#24252B',
          fontSize: 14 * scale,
          fontWeight: '600',
        }}>
        Vehicle type
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'nowrap' }}>
        {VEHICLE_TYPE_CHIPS.map((type, index) => {
          const active = value === type.id;
          const color = active ? '#0B0C10' : '#6F7078';
          const Icon = type.Icon;
          return (
            <Pressable
              key={type.id}
              android_ripple={{ color: 'transparent' }}
              onPress={() => onChange(type.id)}
              style={({ pressed }) => ({
                flex: 1,
                marginLeft: index === 0 ? 0 : 6 * scale,
                minWidth: 0,
                height: 40 * scale,
                paddingHorizontal: 2 * scale,
                borderRadius: 12 * scale,
                borderWidth: 1.4,
                borderColor: active ? '#F3A200' : COLORS.border,
                backgroundColor: pressed
                  ? active
                    ? '#FFE8B8'
                    : '#F5F4F0'
                  : active
                    ? '#FFF6DD'
                    : '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                elevation: 0,
                shadowOpacity: 0,
              })}>
              <Icon size={14 * scale} color={color} strokeWidth={2.1} />
              <Text
                numberOfLines={1}
                style={{
                  marginLeft: 3 * scale,
                  color,
                  fontSize: 11 * scale,
                  fontWeight: active ? '800' : '600',
                }}>
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
