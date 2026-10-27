import { PartnerText, PartnerTextInput } from '../../../components/partner/PartnerText';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  User,
  CreditCard,
  Building,
  AlertCircle,
  Hash,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react-native';

import { useAppSelector } from '../../../redux/hooks';
import { colors } from '../../../theme';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import { usePartnerDialog } from '../../../hooks/usePartnerDialog';
import DriverDataSkeleton from '../../../components/partner/DriverDataSkeleton';
import PartnerSuccessDialog from '../../../components/partner/dialogs/PartnerSuccessDialog';
import { useAppDispatch } from '../../../redux/hooks';
import { updateUser } from '../../../redux/auth/authSlice';
import { usePartnerPayoutStore } from '../../../store/partnerPayoutStore';
import {
  usePayoutAccountQuery,
  useSavePayoutAccountMutation,
} from '../../../services/vendor/useVendorMutations';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerBankDetails'>;

const POPULAR_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Punjab National Bank',
  'Axis Bank',
  'Canara Bank',
];

const POPULAR_UPI_SUFFIXES = [
  '@okhdfcbank',
  '@okicici',
  '@paytm',
  '@ybl',
  '@ibl',
];

export default function PartnerBankDetailsScreen({ navigation }: Props) {
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const query = usePayoutAccountQuery(true);
  const saveMutation = useSavePayoutAccountMutation();
  const savedAccount = query.data ?? null;

  // Local Zustand store kept for the Earnings screen header display, but the
  // source of truth is now the backend payout-account record.
  const setPayoutMethodStore = usePartnerPayoutStore(state => state.setPayoutMethod);
  const updateBankDetails = usePartnerPayoutStore(state => state.updateBankDetails);
  const updateUpiDetails = usePartnerPayoutStore(state => state.updateUpiDetails);

  const [activeTab, setActiveTab] = useState<'bank' | 'upi'>(savedAccount?.payoutMethod ?? 'bank');
  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiHolderName, setUpiHolderName] = useState('');
  const [touched, setTouched] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');

  // Seed empty fields from the backend record (masked) and the auth profile.
  useEffect(() => {
    if (touched) return;
    if (savedAccount) {
      setActiveTab(savedAccount.payoutMethod);
      setHolderName(savedAccount.accountHolderName);
      if (savedAccount.payoutMethod === 'bank') {
        setBankName(savedAccount.bankName ?? '');
        setIfsc(savedAccount.ifsc ?? '');
      } else if (savedAccount.upiId) {
        setUpiId(savedAccount.upiId);
        setUpiHolderName(savedAccount.accountHolderName);
      }
      return;
    }
    // Fresh state — prefill holder name from the logged-in profile only.
    if (user?.fullName && !holderName) setHolderName(user.fullName);
    if (user?.fullName && !upiHolderName) setUpiHolderName(user.fullName);
  }, [savedAccount, touched, user?.fullName]);

  const saving = saveMutation.isPending;

  const handleSave = () => {
    setTouched(true);
    if (activeTab === 'bank') {
      if (!holderName.trim()) {
        setErrorMsg('Account holder name is required');
        return;
      }
      const hasSavedBankNumber =
        savedAccount?.payoutMethod === 'bank' && Boolean(savedAccount.accountNumberMasked);
      if (!accountNumber.trim() && !hasSavedBankNumber) {
        setErrorMsg('Bank account number is required');
        return;
      }
      if (accountNumber.trim() && !/^\d{9,18}$/.test(accountNumber.trim())) {
        setErrorMsg('Account number must be 9-18 digits');
        return;
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase())) {
        setErrorMsg('Invalid IFSC — should look like SBIN0001234');
        return;
      }
      if (!bankName.trim()) {
        setErrorMsg('Bank name is required');
        return;
      }

      setErrorMsg(null);
      saveMutation.mutate(
        {
          payoutMethod: 'bank',
          accountHolderName: holderName.trim(),
          bank: {
            ...(accountNumber.trim() ? { accountNumber: accountNumber.trim() } : {}),
            ifsc: ifsc.trim().toUpperCase(),
            bankName: bankName.trim(),
          },
        },
        {
          onSuccess: account => {
            updateBankDetails({ holderName: account.accountHolderName });
            setPayoutMethodStore('bank');
            setSuccessTitle('Bank account saved');
            setSuccessVisible(true);
          },
          onError: error => {
            setErrorMsg(error instanceof Error ? error.message : 'Could not save bank details');
          },
        },
      );
    } else {
      const id = upiId.trim().toLowerCase();
      if (!/^[\w.\-]{2,64}@[a-zA-Z]{2,32}$/.test(id)) {
        setErrorMsg('Invalid UPI ID — should look like name@okhdfcbank');
        return;
      }
      if (!upiHolderName.trim()) {
        setErrorMsg('Name registered on your UPI app is required');
        return;
      }

      setErrorMsg(null);
      saveMutation.mutate(
        {
          payoutMethod: 'upi',
          accountHolderName: upiHolderName.trim(),
          upi: { upiId: id },
        },
        {
          onSuccess: account => {
            updateUpiDetails({
              upiId: account.upiId ?? id,
              holderName: account.accountHolderName,
            });
            setPayoutMethodStore('upi');
            setSuccessTitle('UPI ID saved');
            setSuccessVisible(true);
          },
          onError: error => {
            setErrorMsg(error instanceof Error ? error.message : 'Could not save UPI ID');
          },
        },
      );
    }
  };

  /* Loading / error states for the initial fetch */
  if (query.isLoading) {
    return (
      <PartnerScreenLayout title="Bank & Payouts" onBack={() => navigation.goBack()}>
        <DriverDataSkeleton variant="bank" />
      </PartnerScreenLayout>
    );
  }

  if (query.isError && !savedAccount) {
    return (
      <PartnerScreenLayout
        title="Bank & Payouts"
        onBack={() => navigation.goBack()}
        footer={
          <Pressable style={styles.saveButton} onPress={() => void query.refetch()}>
            <PartnerText style={styles.saveButtonText}>Retry</PartnerText>
          </Pressable>
        }>
        <View style={styles.errorBox}>
          <AlertCircle size={16} color="#DC2626" strokeWidth={2.2} />
          <PartnerText style={styles.errorText}>
            Could not load your payout account. Check your connection and retry.
          </PartnerText>
        </View>
      </PartnerScreenLayout>
    );
  }

  const isVerified = Boolean(savedAccount?.isVerified);
  const updatedAt = savedAccount?.updatedAt ? new Date(savedAccount.updatedAt) : null;

  return (
    <View style={{ flex: 1 }}>
    <PartnerScreenLayout
      title="Bank & Payouts"
      onBack={() => navigation.goBack()}
      footer={
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            getPressableFeedback(pressed),
            saving && styles.disabledButton,
          ]}
          disabled={saving}
          onPress={handleSave}>
          {saving ? (
            <ActivityIndicator size="small" color={driverColors.white} />
          ) : (
            <PartnerText style={styles.saveButtonText}>
              {activeTab === 'bank' ? 'Save bank account' : 'Save UPI ID'}
            </PartnerText>
          )}
        </Pressable>
      }>
      {/* Payout Method Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'bank' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('bank');
            setErrorMsg(null);
          }}>
          <Building size={16} color={activeTab === 'bank' ? '#0F172A' : '#64748B'} strokeWidth={2.4} />
          <PartnerText style={[styles.tabBtnText, activeTab === 'bank' && styles.tabBtnTextActive]}>
            Bank Account
          </PartnerText>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, activeTab === 'upi' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('upi');
            setErrorMsg(null);
          }}>
          <Zap size={16} color={activeTab === 'upi' ? '#D97706' : '#64748B'} strokeWidth={2.4} />
          <PartnerText style={[styles.tabBtnText, activeTab === 'upi' && styles.tabBtnTextActive]}>
            Instant UPI
          </PartnerText>
        </Pressable>
      </View>

      {/* Honest channel status — no fake KYC claims. */}
      <View
        style={[
          styles.kycBanner,
          isVerified && { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
        ]}>
        <View style={styles.kycIconWrap}>
          {isVerified ? (
            <CheckCircle size={20} color="#059669" strokeWidth={2.4} />
          ) : (
            <Clock size={20} color={colors.primaryDark} strokeWidth={2.2} />
          )}
        </View>
        <View style={styles.kycTextCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <PartnerText style={[styles.kycTitle, !isVerified && { color: colors.primaryDark }]}>
              {isVerified ? 'Payout account verified' : 'Payout account pending verification'}
            </PartnerText>
            <View
              style={[
                styles.verifiedTag,
                !isVerified && { backgroundColor: '#FEF3C7' },
              ]}>
              {isVerified ? (
                <CheckCircle size={10} color="#059669" strokeWidth={2.6} />
              ) : (
                <Clock size={10} color={colors.primaryDark} strokeWidth={2.6} />
              )}
              <PartnerText
                style={[styles.verifiedTagText, !isVerified && { color: colors.primaryDark }]}>
                {isVerified ? 'Verified' : 'Pending'}
              </PartnerText>
            </View>
          </View>
          <PartnerText style={[styles.kycSubtitle, !isVerified && { color: colors.grey }]}>
            {isVerified
              ? 'Your bank or UPI destination has passed verification.'
              : 'Details are saved once you submit. Our team must verify them before payouts can be enabled.'}
            {updatedAt ? ` Last updated ${updatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}.` : ''}
          </PartnerText>
        </View>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <AlertCircle size={16} color="#DC2626" strokeWidth={2.2} />
          <PartnerText style={styles.errorText}>{errorMsg}</PartnerText>
        </View>
      ) : null}

      {/* Form Card: Bank or UPI */}
      {activeTab === 'bank' ? (
        <View style={styles.formCard}>
          {/* Holder Name */}
          <View style={styles.inputGroup}>
            <PartnerText style={styles.label}>Account Holder Name</PartnerText>
            <View style={styles.inputWithIcon}>
              <User size={18} color="#0284C7" strokeWidth={2.2} />
              <PartnerTextInput
                style={styles.inputIconText}
                value={holderName}
                onChangeText={text => {
                  setHolderName(text);
                  setTouched(true);
                }}
                placeholder="Full name as in bank account"
                placeholderTextColor={driverColors.greySoft}
              />
            </View>
          </View>

          {/* Account Number */}
          <View style={styles.inputGroup}>
            <PartnerText style={styles.label}>Bank Account Number</PartnerText>
            <View style={styles.inputWithIcon}>
              <CreditCard size={18} color="#7C3AED" strokeWidth={2.2} />
              <PartnerTextInput
                style={styles.inputIconText}
                value={accountNumber}
                onChangeText={text => {
                  setAccountNumber(text.replace(/\D/g, '').slice(0, 18));
                  setTouched(true);
                }}
                placeholder="Enter account number"
                placeholderTextColor={driverColors.greySoft}
                keyboardType="number-pad"
              />
            </View>
            {savedAccount?.payoutMethod === 'bank' && savedAccount.accountNumberMasked ? (
              <PartnerText style={{ marginTop: 6, fontSize: 12, color: '#64748B' }}>
                Saved account {savedAccount.accountNumberMasked}. Leave blank to keep it, or enter a new number to replace it.
              </PartnerText>
            ) : null}
          </View>

          {/* IFSC Code with Find IFSC link */}
          <View style={styles.inputGroup}>
            <PartnerText style={styles.label}>IFSC Code</PartnerText>
            <View style={styles.inputWithIcon}>
              <Hash size={18} color="#D97706" strokeWidth={2.2} />
              <PartnerTextInput
                style={styles.inputIconText}
                value={ifsc}
                onChangeText={text => {
                  setIfsc(text.toUpperCase().slice(0, 11));
                  setTouched(true);
                }}
                placeholder="e.g. SBIN0001234"
                placeholderTextColor={driverColors.greySoft}
                autoCapitalize="characters"
              />
              <Pressable
                hitSlop={8}
                onPress={() =>
                  showAlert({
                    tone: 'info',
                    title: 'Find IFSC',
                    message: 'Check your cheque book or bank passbook for the 11-character IFSC code printed near the branch address.',
                  })
                }>
                <PartnerText style={styles.findIfscText}>Find IFSC</PartnerText>
              </Pressable>
            </View>
          </View>

          {/* Bank Name */}
          <View style={styles.inputGroup}>
            <PartnerText style={styles.label}>Bank Name</PartnerText>
            <View style={styles.inputWithIcon}>
              <Building size={18} color="#059669" strokeWidth={2.2} />
              <PartnerTextInput
                style={styles.inputIconText}
                value={bankName}
                onChangeText={text => {
                  setBankName(text);
                  setTouched(true);
                }}
                placeholder="Select or enter bank name"
                placeholderTextColor={driverColors.greySoft}
              />
            </View>

            {/* Popular Bank Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {POPULAR_BANKS.map(bank => (
                <Pressable
                  key={bank}
                  style={[styles.bankChip, bankName === bank && styles.bankChipSelected]}
                  onPress={() => {
                    setBankName(bank);
                    setTouched(true);
                  }}>
                  <PartnerText style={[styles.bankChipText, bankName === bank && styles.bankChipTextSelected]}>
                    {bank}
                  </PartnerText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : (
        <View style={styles.formCard}>
          {/* UPI ID */}
          <View style={styles.inputGroup}>
            <PartnerText style={styles.label}>UPI ID / VPA</PartnerText>
            <View style={styles.inputWithIcon}>
              <Zap size={18} color="#D97706" strokeWidth={2.2} />
              <PartnerTextInput
                style={styles.inputIconText}
                value={upiId}
                onChangeText={text => {
                  setUpiId(text);
                  setTouched(true);
                }}
                placeholder="e.g. mobile@upi or name@okaxis"
                placeholderTextColor={driverColors.greySoft}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Quick Suffix Chips */}
            <View style={styles.suffixChipsRow}>
              {POPULAR_UPI_SUFFIXES.map(suffix => (
                <Pressable
                  key={suffix}
                  style={styles.suffixChip}
                  onPress={() => {
                    const prefix = upiId.includes('@') ? upiId.split('@')[0] : upiId;
                    setUpiId(`${prefix}${suffix}`);
                    setTouched(true);
                  }}>
                  <PartnerText style={styles.suffixChipText}>{suffix}</PartnerText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* UPI Registered Name */}
          <View style={styles.inputGroup}>
            <PartnerText style={styles.label}>Name as per UPI App</PartnerText>
            <View style={styles.inputWithIcon}>
              <User size={18} color="#0284C7" strokeWidth={2.2} />
              <PartnerTextInput
                style={styles.inputIconText}
                value={upiHolderName}
                onChangeText={text => {
                  setUpiHolderName(text);
                  setTouched(true);
                }}
                placeholder="Full name registered on GPay/PhonePe"
                placeholderTextColor={driverColors.greySoft}
              />
            </View>
          </View>
        </View>
      )}

      <PartnerSuccessDialog
        visible={successVisible}
        title={successTitle || 'Saved'}
        message={
          isVerified
            ? 'Your payout details have passed verification.'
            : 'Details submitted. Our team will verify them before payouts begin.'
        }
        onDismiss={() => {
          setSuccessVisible(false);
          navigation.goBack();
        }}
      />
    </PartnerScreenLayout>
    {partnerDialog}
    </View>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: driverColors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    fontWeight: '800',
    color: driverColors.ink,
  },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 16,
  },
  kycIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycTextCol: {
    flex: 1,
  },
  kycTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  verifiedTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
  kycSubtitle: {
    fontSize: 11.5,
    color: '#166534',
    marginTop: 3,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#DC2626',
  },
  formCard: {
    backgroundColor: driverColors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.ink,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIconText: {
    flex: 1,
    fontSize: 14,
    color: driverColors.ink,
    fontWeight: '600',
    padding: 0,
  },
  findIfscText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    paddingLeft: 4,
  },
  chipsScroll: {
    marginTop: 6,
  },
  bankChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bankChipSelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  bankChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  bankChipTextSelected: {
    color: '#92400E',
    fontWeight: '700',
  },
  suffixChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  suffixChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suffixChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  saveButton: {
    backgroundColor: driverColors.amber,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: driverColors.white,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
