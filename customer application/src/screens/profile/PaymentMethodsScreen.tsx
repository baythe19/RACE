import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CircleHelp, Trash2 } from 'lucide-react-native';

import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import DataSkeleton from '../../components/ui/DataSkeleton';
import { useAppDialog } from '../../hooks/useAppDialog';
import { getApiErrorMessage } from '../../services/api';
import {
  useCreatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
  usePaymentMethodsQuery,
  useWalletQuery,
} from '../../services/profile/useProfileQueries';
import type { PaymentMethod } from '../../types/profile';
import { colors, shadows, typography } from '../../theme';

/** Small logo tile shown before wallet / UPI app names. */
function BrandTile({
  px,
  label,
  bg = '#F3F4F6',
  textColor = colors.dark,
  border,
}: {
  px: (n: number) => number;
  label: string;
  bg?: string;
  textColor?: string;
  border?: string;
}) {
  const short = label.slice(0, 2).toUpperCase();
  return (
    <View
      style={{
        width: px(28),
        height: px(28),
        borderRadius: px(6),
        backgroundColor: bg,
        borderWidth: border ? 1 : 0,
        borderColor: border,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
      <Text style={{ fontSize: px(9), fontWeight: typography.weights.extrabold, color: textColor, letterSpacing: 0.2 }}>
        {short}
      </Text>
    </View>
  );
}

function SectionTitle({ px, children }: { px: (n: number) => number; children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: px(15),
        fontWeight: typography.weights.extrabold,
        color: '#111827',
        marginBottom: px(10),
        marginTop: px(4),
      }}>
      {children}
    </Text>
  );
}

function RowDivider({ px }: { px: (n: number) => number }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: px(14) }} />;
}

const UPI_APPS = ['Navi', 'PhonePe', 'Google Pay', 'Paytm'] as const;

export default function PaymentMethodsScreen() {
  const px = useProfilePx();
  const { dialog, showDialog } = useAppDialog();
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

  const savedUpi = useMemo(() => methods.filter(m => m.type === 'upi'), [methods]);
  const linkedApps = useMemo(() => {
    // Apps that already have a saved UPI method are treated as linked.
    const linked = new Set(savedUpi.map(m => m.details.toLowerCase()));
    return UPI_APPS.filter(app => linked.has(app.toLowerCase()));
  }, [savedUpi]);

  const formatWallet = (amount: number, currency: string): string => {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    return `${currency} ${amount.toFixed(2)}`;
  };

  const handleAddUpi = (raw?: string) => {
    const value = (raw ?? upiId).trim();
    if (createMethod.isPending) return;
    if (!value) {
      showDialog({
        tone: 'warning',
        title: 'Missing UPI ID',
        message: 'Enter a valid UPI ID.',
        primaryLabel: 'OK',
      });
      return;
    }
    createMethod.mutate(
      { type: 'upi', label: 'UPI', details: value },
      {
        onSuccess: () => {
          setUpiId('');
          setShowAddForm(false);
        },
        onError: err =>
          showDialog({
            tone: 'error',
            title: 'Add failed',
            message: getApiErrorMessage(err),
            primaryLabel: 'OK',
          }),
      },
    );
  };

  const handleDelete = (method: PaymentMethod) => {
    if (deleteMethod.isPending) return;
    showDialog({
      tone: 'danger',
      title: 'Remove method',
      message: `Remove ${method.label}?`,
      secondaryLabel: 'Cancel',
      primaryLabel: 'Remove',
      destructive: true,
      onPrimary: () => {
        if (deleteMethod.isPending) return;
        deleteMethod.mutate(method.id, {
          onError: err =>
            showDialog({
              tone: 'error',
              title: 'Remove failed',
              message: getApiErrorMessage(err),
              primaryLabel: 'OK',
            }),
        });
      },
    });
  };

  const lowBalance = (wallet?.balance ?? 0) < 50;

  return (
    <ProfileSubScreenLayout
      title="Payments"
      headerRight={
        <Pressable
          onPress={() =>
            showDialog({
              tone: 'info',
              title: 'Payments',
              message:
                'Add money to your RACE Wallet or link a UPI app. UPI apps linked here can be selected while paying for a booking.',
              primaryLabel: 'OK',
            })
          }
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Payments help"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(6),
            borderWidth: 1,
            borderColor: '#BFDBFE',
            backgroundColor: '#EFF6FF',
            borderRadius: px(20),
            paddingHorizontal: px(12),
            paddingVertical: px(7),
          }}>
          <CircleHelp size={px(16)} color="#2563EB" strokeWidth={2.2} />
          <Text style={{ fontSize: px(13), color: '#2563EB', fontWeight: typography.weights.semibold }}>Help</Text>
        </Pressable>
      }>
      {dialog}

      {walletLoading || methodsLoading ? (
        <DataSkeleton variant="wallet" />
      ) : (
        <>
          {/* ── Wallets ── */}
          <SectionTitle px={px}>Wallets</SectionTitle>
          <View
            style={[
              {
                borderRadius: px(14),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                marginBottom: px(18),
              },
              shadows.card,
            ]}>
            {/* RACE Wallet row */}
            <View style={{ padding: px(14) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
                <BrandTile px={px} label="RW" bg="#FFF7E6" textColor={colors.primary} border="#F1E4C0" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.dark }}>
                    RACE Wallet
                  </Text>
                  {walletError ? (
                    <Text style={{ fontSize: px(11.5), color: colors.error, marginTop: px(1) }}>
                      Couldn't load balance
                    </Text>
                  ) : lowBalance ? (
                    <Text style={{ fontSize: px(11.5), color: colors.error, marginTop: px(1) }}>
                      Low Balance: {formatWallet(wallet?.balance ?? 0, wallet?.currency ?? 'INR')}
                    </Text>
                  ) : (
                    <Text style={{ fontSize: px(11.5), color: colors.grey, marginTop: px(1) }}>
                      Balance: {formatWallet(wallet?.balance ?? 0, wallet?.currency ?? 'INR')}
                    </Text>
                  )}
                </View>
                {walletError ? (
                  <Pressable onPress={() => void refetchWallet()} hitSlop={8}>
                    <Text style={{ fontSize: px(12), fontWeight: typography.weights.bold, color: colors.primary }}>
                      Retry
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                onPress={() =>
                  showDialog({
                    tone: 'info',
                    title: 'Add Money',
                    message: 'Wallet top-up opens with your next booking payment — pay the advance via UPI and the amount lands in your RACE Wallet.',
                    primaryLabel: 'OK',
                  })
                }
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: px(5),
                    alignSelf: 'flex-start',
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: px(18),
                    paddingHorizontal: px(14),
                    paddingVertical: px(7),
                    marginTop: px(10),
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <Text style={{ fontSize: px(13), color: colors.dark, fontWeight: typography.weights.semibold }}>+</Text>
                <Text style={{ fontSize: px(13), color: colors.dark, fontWeight: typography.weights.semibold }}>
                  Add Money
                </Text>
              </Pressable>
            </View>

            {methodsError ? null : methods.length === 0 ? null : <RowDivider px={px} />}

            {/* Saved UPI methods (linked wallets section) */}
            {savedUpi.length > 0
              ? savedUpi.map((method, index) => (
                  <View key={method.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10), padding: px(14) }}>
                      <BrandTile px={px} label={method.details} bg="#EFF6FF" textColor="#2563EB" border="#DBEAFE" />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.dark }} numberOfLines={1}>
                          {method.details}
                        </Text>
                        <Text style={{ fontSize: px(11.5), color: colors.grey, marginTop: px(1) }}>UPI · Linked</Text>
                      </View>
                      <Text style={{ fontSize: px(12), fontWeight: typography.weights.bold, color: colors.primary }}>
                        LINKED
                      </Text>
                      <Pressable onPress={() => handleDelete(method)} hitSlop={8} disabled={deleteMethod.isPending}>
                        <Trash2 size={px(16)} color={deleteMethod.isPending ? colors.grey : colors.error} />
                      </Pressable>
                    </View>
                    {index < savedUpi.length - 1 ? <RowDivider px={px} /> : null}
                  </View>
                ))
              : null}
          </View>

          {/* ── Pay by any UPI app ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6), marginBottom: px(10) }}>
            <BrandTile px={px} label="UPI" bg="#FFFFFF" textColor="#097E52" border={colors.border} />
            <Text style={{ fontSize: px(15), fontWeight: typography.weights.extrabold, color: '#111827' }}>
              Pay by any UPI app
            </Text>
          </View>
          <View
            style={[
              {
                borderRadius: px(14),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                marginBottom: px(18),
              },
              shadows.card,
            ]}>
            {UPI_APPS.map((app, index) => {
              const isLinked = linkedApps.includes(app);
              return (
                <View key={app}>
                  <Pressable
                    onPress={() => {
                      if (isLinked) return;
                      setShowAddForm(true);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: px(10),
                      padding: px(14),
                      opacity: isLinked ? 1 : pressed ? 0.85 : 1,
                    })}>
                    <BrandTile px={px} label={app} />
                    <Text style={{ flex: 1, fontSize: px(14), fontWeight: typography.weights.semibold, color: colors.dark }}>
                      {app}
                    </Text>
                    {isLinked ? (
                      <Text style={{ fontSize: px(12), fontWeight: typography.weights.bold, color: colors.success }}>
                        LINKED
                      </Text>
                    ) : (
                      <Text style={{ fontSize: px(12), fontWeight: typography.weights.bold, color: '#2563EB' }}>
                        LINK
                      </Text>
                    )}
                  </Pressable>
                  {index < UPI_APPS.length - 1 ? <RowDivider px={px} /> : null}
                </View>
              );
            })}
          </View>

          {/* ── Pay Later ── */}
          <SectionTitle px={px}>Pay Later</SectionTitle>
          <View
            style={[
              {
                borderRadius: px(14),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                padding: px(14),
                marginBottom: px(18),
              },
              shadows.card,
            ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
              <BrandTile px={px} label="QR" bg="#F0FDF4" textColor="#16A34A" border="#DCFCE7" />
              <Text style={{ flex: 1, fontSize: px(14), fontWeight: typography.weights.semibold, color: colors.dark }}>
                Pay at drop
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(6),
                backgroundColor: '#F9FAFB',
                borderRadius: px(8),
                paddingHorizontal: px(10),
                paddingVertical: px(8),
                marginTop: px(10),
              }}>
              <View
                style={{
                  width: px(14),
                  height: px(14),
                  borderRadius: px(3),
                  backgroundColor: colors.primary,
                  transform: [{ rotate: '45deg' }],
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: px(4),
                }}>
                <View style={{ width: px(5), height: px(5), borderRadius: px(1), backgroundColor: colors.background }} />
              </View>
              <Text style={{ flex: 1, fontSize: px(11.5), color: colors.grey }} numberOfLines={1}>
                Go cashless, pay by scanning QR after the ride
              </Text>
            </View>
          </View>

          {/* ── Others ── */}
          <SectionTitle px={px}>Others</SectionTitle>
          <View
            style={[
              {
                borderRadius: px(14),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: '#F3F4F6',
                padding: px(14),
                marginBottom: px(16),
              },
            ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
              <BrandTile px={px} label="Ca" bg="#FFFFFF" textColor={colors.dark} border={colors.border} />
              <Text style={{ flex: 1, fontSize: px(14), fontWeight: typography.weights.semibold, color: colors.dark }}>
                Cash
              </Text>
            </View>
          </View>

          {/* ── Show passbook / saved methods entry ── */}
          {methodsError ? (
            <View>
              <Text style={{ fontSize: px(13), color: colors.grey }}>Unable to load payment methods</Text>
              <Pressable onPress={() => void refetchMethods()}>
                <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.primary, marginTop: px(8) }}>
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : methods.length === 0 ? null : (
            <Pressable
              onPress={() =>
                showDialog({
                  tone: 'info',
                  title: 'Passbook',
                  message:
                    'Your wallet top-ups and booking payments appear in the Bookings tab on each trip. A full passbook view is coming soon.',
                  primaryLabel: 'OK',
                })
              }
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: px(10),
                  borderRadius: px(14),
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  padding: px(14),
                  marginBottom: px(12),
                },
                shadows.card,
              ]}>
              <BrandTile px={px} label="Pa" bg="#EEF2FF" textColor="#4F46E5" border="#E0E7FF" />
              <Text style={{ flex: 1, fontSize: px(14), fontWeight: typography.weights.semibold, color: colors.dark }}>
                Show Passbook
              </Text>
              <Text style={{ fontSize: px(17), color: colors.grey }}>›</Text>
            </Pressable>
          )}

          {/* ── Add UPI form / trigger ── */}
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
                Link a UPI ID
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
                  onPress={() => handleAddUpi()}
                  disabled={createMethod.isPending}
                  style={{
                    flex: 1,
                    paddingVertical: px(12),
                    borderRadius: px(10),
                    backgroundColor: createMethod.isPending ? colors.grey : colors.primary,
                    alignItems: 'center',
                  }}>
                  <Text style={{ fontWeight: typography.weights.bold, color: colors.dark }}>
                    {createMethod.isPending ? 'Adding…' : 'Add'}
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
                paddingVertical: px(15),
              }}>
              <Text style={{ fontSize: px(16), color: colors.primary, fontWeight: typography.weights.bold }}>+</Text>
              <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.primary }}>
                Add UPI ID
              </Text>
            </Pressable>
          )}
        </>
      )}
    </ProfileSubScreenLayout>
  );
}
