import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, CreditCard, Plus, Trash2, Wallet } from 'lucide-react-native';

import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import DataSkeleton from '../../components/ui/DataSkeleton';
import { getApiErrorMessage } from '../../services/api';
import {
  useCreatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
  usePaymentMethodsQuery,
  useWalletQuery,
} from '../../services/profile/useProfileQueries';
import type { PaymentMethod } from '../../types/profile';
import { colors, shadows, typography } from '../../theme';

function formatWallet(amount: number, currency: string): string {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }
  return `${currency} ${amount.toFixed(2)}`;
}

export default function PaymentMethodsScreen() {
  const px = useProfilePx();
  const { data: wallet, isLoading: walletLoading, isError: walletError, refetch: refetchWallet } = useWalletQuery();
  const {
    data: methods = [],
    isLoading: methodsLoading,
    isError: methodsError,
    refetch: refetchMethods,
  } = usePaymentMethodsQuery();
  const createMethod = useCreatePaymentMethodMutation();
  const deleteMethod = useDeletePaymentMethodMutation();

  const [showAddForm, setShowAddForm] = useState(false);
  const [upiId, setUpiId] = useState('');

  const handleAddUpi = () => {
    if (createMethod.isPending) return;
    if (!upiId.trim()) {
      Alert.alert('Missing UPI ID', 'Enter a valid UPI ID.');
      return;
    }
    createMethod.mutate(
      { type: 'upi', label: 'UPI', details: upiId.trim() },
      {
        onSuccess: () => {
          setUpiId('');
          setShowAddForm(false);
        },
        onError: err => Alert.alert('Add failed', getApiErrorMessage(err)),
      },
    );
  };

  const handleDelete = (method: PaymentMethod) => {
    if (deleteMethod.isPending) return;
    Alert.alert('Remove method', `Remove ${method.label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (deleteMethod.isPending) return;
          deleteMethod.mutate(method.id, {
            onError: err => Alert.alert('Remove failed', getApiErrorMessage(err)),
          });
        },
      },
    ]);
  };

  const isLoading = walletLoading || methodsLoading;

  return (
    <ProfileSubScreenLayout title="Payment Methods">
      <LinearGradient
        colors={['#FFB800', '#FF9500']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: px(16), padding: px(16), marginBottom: px(18) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: px(14) }}>
          <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.background }}>
            RACE Wallet
          </Text>
          <Wallet size={px(22)} color={colors.background} strokeWidth={2} />
        </View>
        {walletLoading ? (
          <ActivityIndicator color={colors.background} />
        ) : walletError ? (
          <View>
            <Text style={{ fontSize: px(12), color: colors.background, marginBottom: px(8) }}>
              Unable to load wallet
            </Text>
            <Pressable onPress={() => void refetchWallet()}>
              <Text style={{ fontSize: px(12), fontWeight: typography.weights.bold, color: colors.background }}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text
              style={{
                fontSize: px(28),
                fontWeight: typography.weights.extrabold,
                color: colors.background,
                marginBottom: px(2),
              }}>
              {formatWallet(wallet?.balance ?? 0, wallet?.currency ?? 'INR')}
            </Text>
            <Text style={{ fontSize: px(11), color: 'rgba(255,255,255,0.85)' }}>Available Balance</Text>
          </>
        )}
      </LinearGradient>

      <Text
        style={{
          fontSize: px(15),
          fontWeight: typography.weights.bold,
          color: colors.dark,
          marginBottom: px(10),
        }}>
        Saved Methods
      </Text>

      {isLoading ? (
        <DataSkeleton variant="wallet" />
      ) : methodsError ? (
        <View style={{ marginBottom: px(16) }}>
          <Text style={{ fontSize: px(13), color: colors.grey }}>Unable to load payment methods</Text>
          <Pressable onPress={() => void refetchMethods()}>
            <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.primary, marginTop: px(8) }}>
              Try again
            </Text>
          </Pressable>
        </View>
      ) : methods.length === 0 ? (
        <Text style={{ fontSize: px(13), color: colors.grey, marginBottom: px(16) }}>
          No saved payment methods
        </Text>
      ) : (
        <View style={{ gap: px(10), marginBottom: px(16) }}>
          {methods.map(method => (
            <View
              key={method.id}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: px(12),
                  borderRadius: px(12),
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: px(14),
                },
                shadows.card,
              ]}>
              <CreditCard size={px(20)} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.dark }}>
                  {method.label}
                </Text>
                <Text style={{ fontSize: px(11), color: colors.grey, marginTop: px(2) }}>{method.details}</Text>
              </View>
              {method.isDefault ? <Check size={px(16)} color={colors.success} /> : null}
              <Pressable
                onPress={() => handleDelete(method)}
                hitSlop={8}
                disabled={deleteMethod.isPending}
                accessibilityState={{ disabled: deleteMethod.isPending }}>
                <Trash2
                  size={px(18)}
                  color={deleteMethod.isPending ? colors.grey : colors.error}
                />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {showAddForm ? (
        <View
          style={{
            borderRadius: px(12),
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: colors.goldLight,
            padding: px(14),
            marginBottom: px(14),
            gap: px(10),
          }}>
          <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.dark }}>
            Add UPI ID
          </Text>
          <TextInput
            value={upiId}
            onChangeText={setUpiId}
            placeholder="yourname@upi"
            placeholderTextColor={colors.grey}
            autoCapitalize="none"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: px(10),
              padding: px(12),
              backgroundColor: colors.background,
              color: colors.dark,
            }}
          />
          <View style={{ flexDirection: 'row', gap: px(10) }}>
            <Pressable
              onPress={() => setShowAddForm(false)}
              style={{
                flex: 1,
                paddingVertical: px(12),
                borderRadius: px(10),
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
              }}>
              <Text style={{ fontWeight: typography.weights.bold, color: colors.grey }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleAddUpi}
              disabled={createMethod.isPending}
              style={{
                flex: 1,
                paddingVertical: px(12),
                borderRadius: px(10),
                backgroundColor: createMethod.isPending ? colors.grey : colors.primary,
                alignItems: 'center',
              }}>
              <Text style={{ fontWeight: typography.weights.bold, color: colors.dark }}>
                {createMethod.isPending ? 'Adding...' : 'Add'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setShowAddForm(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: px(8),
            borderRadius: px(12),
            borderWidth: 1.5,
            borderColor: colors.primary,
            borderStyle: 'dashed',
            paddingVertical: px(16),
          }}>
          <Plus size={px(20)} color={colors.primary} />
          <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.primary }}>
            Add UPI ID
          </Text>
        </Pressable>
      )}
    </ProfileSubScreenLayout>
  );
}
