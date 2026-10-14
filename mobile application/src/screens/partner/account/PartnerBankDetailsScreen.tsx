import { PartnerText, PartnerTextInput } from '../../../components/partner/PartnerText';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  User,
  CreditCard,
  Building,
  AlertCircle,
  Hash,
  CheckCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';

import { useAppSelector } from '../../../redux/hooks';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import PartnerSuccessDialog from '../../../components/partner/dialogs/PartnerSuccessDialog';
import { usePartnerPayoutStore } from '../../../store/partnerPayoutStore';

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
  const user = useAppSelector(state => state.auth.user);
  const payoutMethod = usePartnerPayoutStore(state => state.payoutMethod);
  const setPayoutMethod = usePartnerPayoutStore(state => state.setPayoutMethod);
  const bankDetails = usePartnerPayoutStore(state => state.bankDetails);
  const updateBankDetails = usePartnerPayoutStore(state => state.updateBankDetails);
  const upiDetails = usePartnerPayoutStore(state => state.upiDetails);
  const updateUpiDetails = usePartnerPayoutStore(state => state.updateUpiDetails);

  const [activeTab, setActiveTab] = useState<'bank' | 'upi'>(payoutMethod);
  const [holderName, setHolderName] = useState(bankDetails.holderName || user?.fullName || 'Om Singh');
  const [accountNumber, setAccountNumber] = useState(bankDetails.accountNumber || '91881234567890');
  const [ifsc, setIfsc] = useState(bankDetails.ifsc || 'SBIN0001234');
  const [bankName, setBankName] = useState(bankDetails.bankName || 'State Bank of India');

  const [upiId, setUpiId] = useState(upiDetails.upiId || 'omsingh.race@okhdfcbank');
  const [upiHolderName, setUpiHolderName] = useState(upiDetails.holderName || user?.fullName || 'Om Singh');

  const [saving, setSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (activeTab === 'bank') {
      if (!holderName.trim()) {
        setErrorMsg('Account holder name is required');
        return;
      }
      if (!accountNumber.trim() || accountNumber.length < 8) {
        setErrorMsg('Please enter a valid bank account number (min 8 digits)');
        return;
      }
      if (!ifsc.trim() || ifsc.length < 6) {
        setErrorMsg('Please enter a valid IFSC code (11 characters)');
        return;
      }

      setErrorMsg(null);
      setSaving(true);
      setTimeout(() => {
        setPayoutMethod('bank');
        updateBankDetails({
          holderName: holderName.trim(),
          accountNumber: accountNumber.trim(),
          ifsc: ifsc.trim().toUpperCase(),
          bankName: bankName.trim() || 'Verified Bank',
        });
        setSaving(false);
        setSuccessVisible(true);
      }, 500);
    } else {
      if (!upiId.trim() || !upiId.includes('@')) {
        setErrorMsg('Please enter a valid UPI ID (e.g. mobile@upi or name@bank)');
        return;
      }

      setErrorMsg(null);
      setSaving(true);
      setTimeout(() => {
        setPayoutMethod('upi');
        updateUpiDetails({
          upiId: upiId.trim().toLowerCase(),
          holderName: upiHolderName.trim() || 'Partner',
        });
        setSaving(false);
        setSuccessVisible(true);
      }, 500);
    }
  };

  return (
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
              {activeTab === 'bank' ? 'Save & Verify Bank Account' : 'Save & Link UPI ID'}
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

      {/* KYC & Verification Badge */}
      <View style={styles.kycBanner}>
        <View style={styles.kycIconWrap}>
          <ShieldCheck size={20} color="#059669" strokeWidth={2.4} />
        </View>
        <View style={styles.kycTextCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <PartnerText style={styles.kycTitle}>KYC Verified Payout Channel</PartnerText>
            <View style={styles.verifiedTag}>
              <CheckCircle size={10} color="#059669" strokeWidth={2.6} />
              <PartnerText style={styles.verifiedTagText}>Active</PartnerText>
            </View>
          </View>
          <PartnerText style={styles.kycSubtitle}>
            Direct NEFT/IMPS and UPI transfers occur automatically every Monday morning at 6:00 AM with zero deduction.
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
                onChangeText={setHolderName}
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
                onChangeText={setAccountNumber}
                placeholder="Enter account number"
                placeholderTextColor={driverColors.greySoft}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* IFSC Code with Find IFSC link */}
          <View style={styles.inputGroup}>
            <PartnerText style={styles.label}>IFSC Code</PartnerText>
            <View style={styles.inputWithIcon}>
              <Hash size={18} color="#D97706" strokeWidth={2.2} />
              <PartnerTextInput
                style={styles.inputIconText}
                value={ifsc}
                onChangeText={t => setIfsc(t.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                placeholderTextColor={driverColors.greySoft}
                autoCapitalize="characters"
              />
              <Pressable
                hitSlop={8}
                onPress={() =>
                  Alert.alert(
                    'Find IFSC',
                    'Check your cheque book or bank passbook for the 11-character IFSC code printed near the branch address.',
                  )
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
                onChangeText={setBankName}
                placeholder="Select or enter bank name"
                placeholderTextColor={driverColors.greySoft}
              />
            </View>

            {/* Popular Bank Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {POPULAR_BANKS.map(b => (
                <Pressable
                  key={b}
                  style={[styles.bankChip, bankName === b && styles.bankChipSelected]}
                  onPress={() => setBankName(b)}>
                  <PartnerText style={[styles.bankChipText, bankName === b && styles.bankChipTextSelected]}>
                    {b}
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
                onChangeText={setUpiId}
                placeholder="e.g. mobile@upi or name@okaxis"
                placeholderTextColor={driverColors.greySoft}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Quick Suffix Chips */}
            <View style={styles.suffixChipsRow}>
              {POPULAR_UPI_SUFFIXES.map(s => (
                <Pressable
                  key={s}
                  style={styles.suffixChip}
                  onPress={() => {
                    const prefix = upiId.includes('@') ? upiId.split('@')[0] : upiId;
                    setUpiId(`${prefix}${s}`);
                  }}>
                  <PartnerText style={styles.suffixChipText}>{s}</PartnerText>
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
                onChangeText={setUpiHolderName}
                placeholder="Full name registered on GPay/PhonePe"
                placeholderTextColor={driverColors.greySoft}
              />
            </View>
          </View>
        </View>
      )}

      <PartnerSuccessDialog
        visible={successVisible}
        title={activeTab === 'bank' ? 'Bank Details Saved!' : 'UPI ID Linked!'}
        message={
          activeTab === 'bank'
            ? 'Your bank account has been verified and set as your primary payout method.'
            : 'Your UPI ID has been verified for instant weekly earnings settlement.'
        }
        onDismiss={() => {
          setSuccessVisible(false);
          navigation.goBack();
        }}
      />
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    padding: 14,
    marginBottom: 16,
  },
  kycIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 0.5,
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
