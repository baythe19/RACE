import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  User,
  CreditCard,
  Building,
  AlertCircle,
  Hash,
  ChevronDown,
} from 'lucide-react-native';

import { useAppSelector } from '../../../redux/hooks';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import PartnerSuccessDialog from '../../../components/partner/dialogs/PartnerSuccessDialog';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerBankDetails'>;

export default function PartnerBankDetailsScreen({ navigation }: Props) {
  const user = useAppSelector(state => state.auth.user);
  const [holderName, setHolderName] = useState(user?.fullName || 'Partner');
  const [accountNumber, setAccountNumber] = useState('91881234567890');
  const [ifsc, setIfsc] = useState('SBIN0001234');
  const [bankName, setBankName] = useState('State Bank of India');

  const [saving, setSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!holderName.trim()) {
      setErrorMsg('Account holder name is required');
      return;
    }
    if (!accountNumber.trim() || accountNumber.length < 8) {
      setErrorMsg('Please enter a valid bank account number');
      return;
    }
    if (!ifsc.trim() || ifsc.length < 6) {
      setErrorMsg('Please enter a valid IFSC code');
      return;
    }

    setErrorMsg(null);
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccessVisible(true);
    }, 600);
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
            <Text style={styles.saveButtonText}>Save Bank Details</Text>
          )}
        </Pressable>
      }>
      {/* Notice Banner */}
      <View style={styles.noticeBanner}>
        <AlertCircle size={20} color="#D97706" strokeWidth={2.4} />
        <View style={styles.noticeTextCol}>
          <Text style={styles.noticeTitle}>Add your bank details to receive earnings</Text>
          <Text style={styles.noticeSubtitle}>
            Your account will be verified for secure and timely automated payouts.
          </Text>
        </View>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Form Card */}
      <View style={styles.formCard}>
        {/* Holder Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Account Holder Name</Text>
          <View style={styles.inputWithIcon}>
            <User size={18} color={driverColors.grey} strokeWidth={2} />
            <TextInput
              style={styles.inputIconText}
              value={holderName}
              onChangeText={setHolderName}
              placeholder="Full name as in passbook"
              placeholderTextColor={driverColors.greySoft}
            />
          </View>
        </View>

        {/* Account Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bank Account Number</Text>
          <View style={styles.inputWithIcon}>
            <CreditCard size={18} color={driverColors.grey} strokeWidth={2} />
            <TextInput
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
          <Text style={styles.label}>IFSC Code</Text>
          <View style={styles.inputWithIcon}>
            <Hash size={18} color={driverColors.grey} strokeWidth={2} />
            <TextInput
              style={styles.inputIconText}
              value={ifsc}
              onChangeText={t => setIfsc(t.toUpperCase())}
              placeholder="Enter IFSC code"
              placeholderTextColor={driverColors.greySoft}
              autoCapitalize="characters"
            />
            <Pressable
              hitSlop={8}
              onPress={() => Alert.alert('Find IFSC', 'Check your cheque book or bank passbook for the 11-character IFSC.')}>
              <Text style={styles.findIfscText}>Find IFSC</Text>
            </Pressable>
          </View>
        </View>

        {/* Bank Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bank Name</Text>
          <View style={styles.inputWithIcon}>
            <Building size={18} color={driverColors.grey} strokeWidth={2} />
            <TextInput
              style={styles.inputIconText}
              value={bankName}
              onChangeText={setBankName}
              placeholder="Select or enter bank name"
              placeholderTextColor={driverColors.greySoft}
            />
            <ChevronDown size={18} color={driverColors.grey} />
          </View>
        </View>
      </View>

      <PartnerSuccessDialog
        visible={successVisible}
        title="Bank Details Saved!"
        message="Your payout account is verified and ready for automatic transfers."
        onDismiss={() => {
          setSuccessVisible(false);
          navigation.goBack();
        }}
      />
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: driverRadius.card,
    borderWidth: 1,
    borderColor: '#FEEFC8',
    padding: 16,
    marginBottom: 20,
  },
  noticeTextCol: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  noticeSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: driverColors.redPill,
    padding: 12,
    borderRadius: driverRadius.innerCard,
    marginBottom: 16,
  },
  errorText: {
    color: driverColors.red,
    fontSize: 13,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    gap: 16,
    marginBottom: 24,
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
    gap: 10,
    backgroundColor: driverColors.light,
    borderRadius: driverRadius.innerCard,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  inputIconText: {
    flex: 1,
    fontSize: 14,
    color: driverColors.ink,
    padding: 0,
  },
  findIfscText: {
    fontSize: 12,
    fontWeight: '700',
    color: driverColors.amberText,
  },
  saveButton: {
    height: 50,
    borderRadius: driverRadius.button,
    backgroundColor: driverColors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: driverColors.white,
  },
  disabledButton: {
    opacity: 0.7,
  },
});
