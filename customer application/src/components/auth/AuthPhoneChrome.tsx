import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { AUTH_COLORS as COLORS, AUTH_COUNTRY_CODES } from './authDesign';

export const noFontPadding = { includeFontPadding: false as const };

function BackIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M19 12 H5 M11 6 L5 12 L11 18"
        fill="none"
        stroke={COLORS.ink}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrowIcon({ size, color = '#17191E' }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 12 H19 M13 6 L19 12 L13 18"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DownIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        d="M4 6 L8 10 L12 6"
        fill="none"
        stroke="#34383D"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path
        d="M7 4 L13 10 L7 16"
        fill="none"
        stroke="#9597A0"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PhoneIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M7.1 3.5 C6.6 2.9 5.7 2.8 5.1 3.2 L3.5 4.4 C2.7 5 2.4 6 2.6 7 C3.8 13.7 10.3 20.2 17 21.4 C18 21.6 19 21.3 19.6 20.5 L20.8 18.9 C21.2 18.3 21.1 17.4 20.5 16.9 L17.5 14.4 C17 14 16.3 14 15.8 14.3 L13.8 15.5 C11.5 14.5 9.5 12.5 8.5 10.2 L9.7 8.2 C10 7.7 10 7 9.6 6.5 Z"
        fill="none"
        stroke="#777B85"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HeadsetIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4.4 12 V10.6 C4.4 6.2 7.7 3 12 3 C16.3 3 19.6 6.2 19.6 10.6 V15.1"
        fill="none"
        stroke={COLORS.orange}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <Rect x="3.4" y="11" width="3.5" height="6.4" rx="1.7" fill="#FFB31B" />
      <Rect x="17.1" y="11" width="3.5" height="6.4" rx="1.7" fill="#FFB31B" />
      <Path
        d="M19.2 16.7 C18.9 19 17.2 20.2 14 20.2 H12.9"
        fill="none"
        stroke={COLORS.orange}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <Rect x="10.7" y="18.8" width="3.2" height="2.1" rx="1" fill="#FFB31B" />
    </Svg>
  );
}

export function ShieldIcon({ size, color = '#A2A5B2' }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.6 L20 5.8 V11.2 C20 16.2 16.7 20.2 12 22 C7.3 20.2 4 16.2 4 11.2 V5.8 Z"
        fill="none"
        stroke={color}
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <Path
        d="M8.4 12.1 L10.9 14.6 L15.7 9.8"
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AuthHeader({ scale, onBack }: { scale: number; onBack: () => void }) {
  return (
    <View style={{ height: 52 * scale, justifyContent: 'center' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'center',
          paddingHorizontal: 56 * scale,
        }}>
        <Text
          style={{
            color: COLORS.ink,
            fontSize: 18 * scale,
            lineHeight: 22 * scale,
            fontWeight: '800',
            letterSpacing: 0.4 * scale,
            ...noFontPadding,
          }}>
          RACE
        </Text>
        <Text
          style={{
            marginLeft: 7 * scale,
            color: COLORS.orange,
            fontSize: 13 * scale,
            lineHeight: 16 * scale,
            fontWeight: '800',
            letterSpacing: 1.4 * scale,
            ...noFontPadding,
          }}>
          SERVICE
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        hitSlop={8}
        style={{
          position: 'absolute',
          left: 8 * scale,
          top: 4 * scale,
          width: 44 * scale,
          height: 44 * scale,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <BackIcon size={24 * scale} />
      </Pressable>
    </View>
  );
}

export function MobileNumberField({
  scale,
  country,
  phone,
  inputRef,
  menuOpen,
  onPhoneChange,
  onToggleCountryMenu,
  onSelectCountry,
  onSubmit,
}: {
  scale: number;
  country: string;
  phone: string;
  inputRef: React.RefObject<TextInputType | null>;
  menuOpen: boolean;
  onPhoneChange: (value: string) => void;
  onToggleCountryMenu: () => void;
  onSelectCountry: (code: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={{ marginHorizontal: 24 * scale, zIndex: 20 }}>
      <Text
        style={{
          color: '#24252B',
          fontSize: 14 * scale,
          lineHeight: 20 * scale,
          fontWeight: '500',
        }}>
        Mobile number
      </Text>

      <View
        style={{
          marginTop: 6 * scale,
          height: 50 * scale,
          flexDirection: 'row',
          alignItems: 'center',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: menuOpen ? COLORS.orange : COLORS.border,
          borderRadius: 12 * scale,
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: menuOpen }}
          accessibilityLabel={`Country calling code ${country}`}
          onPress={onToggleCountryMenu}
          style={{
            minWidth: 86 * scale,
            paddingHorizontal: 10 * scale,
            height: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FAFAFA',
          }}>
          <Text
            style={{
              fontSize: 15 * scale,
              lineHeight: 21 * scale,
              fontWeight: '600',
              color: '#25262C',
            }}>
            {country}
          </Text>
          <View style={{ marginLeft: 6 * scale, transform: [{ rotate: menuOpen ? '180deg' : '0deg' }] }}>
            <DownIcon size={13 * scale} />
          </View>
        </Pressable>

        <View style={{ width: 1, height: 22 * scale, backgroundColor: '#E7E7E8' }} />

        <TextInput
          ref={inputRef}
          accessibilityLabel="Mobile number"
          style={{
            flex: 1,
            height: '100%',
            paddingLeft: 14 * scale,
            paddingRight: 10 * scale,
            paddingVertical: 0,
            fontSize: 16 * scale,
            lineHeight: 22 * scale,
            color: COLORS.ink,
            textAlignVertical: 'center',
          }}
          value={phone}
          onChangeText={onPhoneChange}
          placeholder="98765 43210"
          placeholderTextColor="#858592"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoCorrect={false}
          maxLength={12}
          returnKeyType="done"
          selectionColor={COLORS.orange}
          onSubmitEditing={onSubmit}
        />
      </View>

      {menuOpen ? (
        <View
          style={{
            position: 'absolute',
            top: 78 * scale,
            left: 0,
            width: 248 * scale,
            borderRadius: 14 * scale,
            borderWidth: 1,
            borderColor: COLORS.border,
            backgroundColor: '#FFFEFC',
            shadowColor: '#000000',
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 14,
            overflow: 'hidden',
            zIndex: 30,
          }}>
          {AUTH_COUNTRY_CODES.map((item, index) => {
            const selected = item.code === country;
            return (
              <Pressable
                key={item.code}
                disabled={!item.supported}
                onPress={() => onSelectCountry(item.code)}
                style={({ pressed }) => ({
                  minHeight: 48 * scale,
                  paddingHorizontal: 14 * scale,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: selected ? '#FFF8E8' : pressed && item.supported ? '#FAFAF7' : '#FFFEFC',
                  opacity: item.supported ? 1 : 0.55,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: COLORS.divider,
                })}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: '#24252B',
                      fontSize: 15 * scale,
                      lineHeight: 22 * scale,
                      fontWeight: selected ? '700' : '500',
                      includeFontPadding: true,
                    }}>
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      color: item.supported ? COLORS.orange : COLORS.muted,
                      fontSize: 12 * scale,
                      lineHeight: 18 * scale,
                    }}>
                    {item.supported ? item.code : `${item.code}  ·  Soon`}
                  </Text>
                </View>
                {selected ? (
                  <Text style={{ color: COLORS.orange, fontSize: 16 * scale, fontWeight: '700' }}>✓</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function VerificationHint({ scale }: { scale: number }) {
  return (
    <View
      style={{
        marginTop: 12 * scale,
        marginHorizontal: 24 * scale,
        minHeight: 28 * scale,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      <PhoneIcon size={18 * scale} />
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          marginLeft: 8 * scale,
          color: '#82838E',
          fontSize: 13 * scale,
          lineHeight: 22 * scale,
          paddingBottom: 2 * scale,
          includeFontPadding: true,
        }}>
        We'll text you a verification code.
      </Text>
    </View>
  );
}

function CheckMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        d="M3.2 8.2 L6.4 11.2 L12.8 4.6"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TermsAgreeRow({
  scale,
  accepted,
  onToggle,
  onPressTerms,
}: {
  scale: number;
  accepted: boolean;
  onToggle: () => void;
  onPressTerms: () => void;
}) {
  const box = 20 * scale;
  return (
    <View
      style={{
        marginTop: 12 * scale,
        marginHorizontal: 24 * scale,
        minHeight: 32 * scale,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        accessibilityLabel="Agree to Terms and Privacy Policy"
        onPress={onToggle}
        hitSlop={8}
        style={{
          width: box,
          height: box,
          borderRadius: 5 * scale,
          borderWidth: 1.6,
          borderColor: accepted ? COLORS.orange : '#C5C6CE',
          backgroundColor: accepted ? COLORS.orange : '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {accepted ? <CheckMark size={14 * scale} /> : null}
      </Pressable>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          marginLeft: 10 * scale,
          color: '#878590',
          fontSize: 13 * scale,
          lineHeight: 22 * scale,
          paddingBottom: 2 * scale,
          includeFontPadding: true,
        }}>
        I agree to{' '}
        <Text
          onPress={onPressTerms}
          style={{ color: COLORS.orange, fontWeight: '600' }}>
          Terms & Privacy
        </Text>
      </Text>
    </View>
  );
}

export function GoldButton({
  scale,
  isSignup,
  label,
  onPress,
  disabled,
  gradientId = 'buttonGold',
  marginTop,
}: {
  scale: number;
  isSignup: boolean;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  gradientId?: string;
  marginTop?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? (isSignup ? 'Create account' : 'Continue')}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 52 * scale,
        marginTop: (marginTop ?? 22) * scale,
        marginHorizontal: 24 * scale,
        borderRadius: 14 * scale,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed || disabled ? '#F6BA3A' : '#FFC74C',
        opacity: disabled ? 0.55 : 1,
      })}>
      <Text
        style={{
            color: '#0B0C10',
            fontSize: 17 * scale,
            lineHeight: 26 * scale,
            paddingBottom: 2 * scale,
            fontWeight: '800',
            letterSpacing: -0.2 * scale,
            includeFontPadding: true,
          }}>
        {label ?? (isSignup ? 'Create account' : 'Continue')}
      </Text>
      <View style={{ position: 'absolute', right: 25 * scale }}>
        <ArrowIcon size={23 * scale} />
      </View>
    </Pressable>
  );
}

export function ScreenDivider({
  scale,
  isSignup,
  marginTop = 0,
}: {
  scale: number;
  isSignup: boolean;
  marginTop?: number;
}) {
  return (
    <View
      style={{
        height: 1,
        marginTop: marginTop * scale,
        marginHorizontal: 24 * scale,
        backgroundColor: COLORS.divider,
      }}
    />
  );
}

export function SupportCard({ scale, onPress }: { scale: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="24/7 roadside support"
      onPress={onPress}
      style={({ pressed }) => ({
        height: 84 * scale,
        marginTop: 20 * scale,
        marginHorizontal: 16 * scale,
        paddingLeft: 17 * scale,
        paddingRight: 14 * scale,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 17 * scale,
        backgroundColor: '#FFFBF1',
        opacity: pressed ? 0.75 : 1,
      })}>
      <View
        style={{
          width: 40 * scale,
          height: 40 * scale,
          borderRadius: 20 * scale,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFF1D2',
        }}>
        <ShieldIcon size={21 * scale} color="#F2A300" />
      </View>
      <View style={{ flex: 1, marginLeft: 16 * scale }}>
        <Text
          style={{
            color: '#24252B',
            fontSize: 16 * scale,
            lineHeight: 26 * scale,
            fontWeight: '700',
            includeFontPadding: true,
          }}>
          24/7 roadside support
        </Text>
        <Text
          style={{
            marginTop: 1 * scale,
            color: '#92919B',
            fontSize: 13 * scale,
            lineHeight: 22 * scale,
            paddingBottom: 2 * scale,
            includeFontPadding: true,
          }}>
          We're here whenever you need us.
        </Text>
      </View>
      <ChevronRightIcon size={19 * scale} />
    </Pressable>
  );
}
