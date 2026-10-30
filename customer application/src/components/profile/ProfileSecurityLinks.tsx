import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight, Smartphone } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useProfilePx } from './ProfileSubScreenLayout';
import type { ProfileStackParamList } from '../../types/navigation';
import { colors, shadows, typography } from '../../theme';

export default function ProfileSecurityLinks() {
  const px = useProfilePx();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  return (
    <View style={{ marginTop: px(18), marginBottom: px(8) }}>
      <Text
        style={{
          fontSize: px(10),
          fontWeight: typography.weights.bold,
          color: colors.grey,
          letterSpacing: 0.6,
          marginBottom: px(8),
        }}>
        ACCOUNT
      </Text>
      <View
        style={[
          {
            borderRadius: px(14),
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            overflow: 'hidden',
          },
          shadows.card,
        ]}>
        <Pressable
          onPress={() => navigation.navigate('ChangeMobileNumber')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(12),
            paddingHorizontal: px(14),
            paddingVertical: px(12),
            backgroundColor: pressed ? colors.pageBg : colors.background,
          })}>
          <View
            style={{
              width: px(34),
              height: px(34),
              borderRadius: px(17),
              backgroundColor: colors.goldLight,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
            <Smartphone size={px(16)} color={colors.primary} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.dark }}>
              Change mobile number
            </Text>
            <Text style={{ fontSize: px(10), color: colors.grey, marginTop: px(2) }} numberOfLines={2}>
              OTP verification on your new number
            </Text>
          </View>
          <ChevronRight size={px(16)} color={colors.grey} />
        </Pressable>
      </View>
    </View>
  );
}
