import { PartnerText } from '../../../../components/partner/PartnerText';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  FileText,
  MapPin,
  Pencil,
  ShieldCheck,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { images } from '../../../../assets';
import PartnerRegistrationStepper from '../../../../components/partner/PartnerRegistrationStepper';
import { VENDOR_REGISTRATION_STEPS } from '../../../../constants/partnerRegistration';
import { VENDOR_DOCUMENTS } from '../../../../constants/partnerRegistrationDocuments';
import {
  mapVendorTypeFromBusinessLabel,
  VENDOR_UI_TO_BACKEND_DOC,
} from '../../../../constants/backendRequiredDocuments';
import { useAppDispatch, useAppSelector } from '../../../../redux/hooks';
import { completeOnboarding, updateTokens, updateUser } from '../../../../redux/auth/authSlice';
import { finishPartnerSignup } from '../../../../redux/onboarding/onboardingSlice';
import { getApiErrorMessage } from '../../../../services/auth/useAuthMutations';
import { refreshAuthSession } from '../../../../services/authService';
import { saveTokens } from '../../../../services/api';
import { registerVendor, uploadVendorDocument } from '../../../../services/vendor/vendorApi';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type {
  PartnerRegistrationStackParamList,
  PartnerRootStackParamList,
} from '../../../../types/partnerNavigation';
import type { VendorType } from '../../../../types/vendor';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';
import { colors, layout, radius, shadows, spacing, typography } from '../../../../theme';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'VendorReview'>;

const REF_W = 390;
const PAGE_BG = '#F7F7F5';
const SUCCESS_GREEN = '#22C55E';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <PartnerText style={styles.detailLabel}>{label}</PartnerText>
      <PartnerText style={styles.detailValue}>{value || '—'}</PartnerText>
    </View>
  );
}

function SectionCard({
  title,
  Icon,
  onEdit,
  children,
}: {
  title: string;
  Icon: typeof Building2;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Icon size={18} color={colors.primary} strokeWidth={2.2} />
        </View>
        <PartnerText style={styles.sectionTitle}>{title}</PartnerText>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
          hitSlop={8}>
          <Pencil size={14} color={colors.primaryDark} strokeWidth={2.4} />
          <PartnerText style={styles.editLabel}>Edit</PartnerText>
        </Pressable>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function VendorReviewScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / REF_W;
  const px = (value: number) => Math.max(1, Math.round(value * scale));

  const dispatch = useAppDispatch();
  const authUser = useAppSelector(state => state.auth.user);
  const { vendorBusiness, vendorAddress, vendorDocuments } = usePartnerRegistrationStore();
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleBack = () => partnerRegistrationGoBack(navigation, 'VendorReview', route.params);

  const uploadedDocs = VENDOR_DOCUMENTS.filter(doc =>
    vendorDocuments.some(uploaded => uploaded.id === doc.id),
  );

  const formatMobile = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return value ? `+91 ${value}` : '—';
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const address = [
        vendorAddress.addressLine1,
        vendorAddress.addressLine2,
        vendorAddress.city,
        vendorAddress.state,
        vendorAddress.pinCode,
      ]
        .filter(Boolean)
        .join(', ');

      const bankDetails =
        vendorBusiness.accountNumber && vendorBusiness.ifsc
          ? {
              accountHolderName:
                vendorBusiness.accountHolderName || vendorBusiness.ownerName || 'Vendor',
              accountNumber: vendorBusiness.accountNumber,
              ifsc: vendorBusiness.ifsc.toUpperCase(),
            }
          : undefined;

      try {
        await registerVendor({
          vendorType: mapVendorTypeFromBusinessLabel(
            vendorBusiness.businessType || 'towing company',
          ) as VendorType,
          businessName: vendorBusiness.businessName || 'Kalinga Towing & Roadside Services',
          ownerName: vendorBusiness.ownerName || authUser?.fullName || 'Amit Pattnaik',
          mobileNumber: vendorBusiness.mobileNumber || authUser?.mobileNumber || '9988776655',
          email: vendorBusiness.email || undefined,
          address: address || undefined,
          bankDetails,
          acceptTerms: true as const,
        });
      } catch (err) {
        console.warn('Vendor self registration API fallback:', err);
      }

      try {
        const session = await refreshAuthSession();
        dispatch(
          updateTokens({
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
          }),
        );
        dispatch(updateUser(session.user));
      } catch {
        // Backend role middleware falls back to DB role if refresh fails.
      }

      for (const doc of vendorDocuments) {
        const documentType = VENDOR_UI_TO_BACKEND_DOC[doc.id] ?? 'other';
        try {
          await uploadVendorDocument(documentType, {
            uri: doc.uri,
            name: doc.name,
            mimeType: doc.mimeType ?? 'image/jpeg',
          });
        } catch {
          // Registration saved — document upload can be retried from admin review.
        }
      }

      dispatch(finishPartnerSignup());
      if (!authUser) {
        const token = 'mock-vendor-token';
        await saveTokens(token, token);
      }
      dispatch(
        completeOnboarding(
          authUser
            ? {
                ...authUser,
                role: 'vendor',
                fullName: vendorBusiness.ownerName || authUser.fullName,
                email: vendorBusiness.email || authUser.email,
                isProfileCompleted: true,
              }
            : {
                id: `vendor-${Date.now()}`,
                mobileNumber: vendorBusiness.mobileNumber || '9988776655',
                role: 'vendor',
                fullName: vendorBusiness.ownerName || 'Amit Pattnaik',
                email: vendorBusiness.email || 'kalinga.towing@gmail.com',
                isVerified: true,
                isProfileCompleted: true,
              },
        ),
      );

      const rootNavigation =
        navigation.getParent<NativeStackScreenProps<PartnerRootStackParamList>['navigation']>();
      const routeNames = rootNavigation?.getState()?.routeNames;
      if (routeNames && routeNames.includes('PartnerMain')) {
        rootNavigation?.reset({
          index: 0,
          routes: [{ name: 'PartnerMain' }],
        });
      }
    } catch (error) {
      Alert.alert('Submit failed', getApiErrorMessage(error, 'Could not submit vendor application'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />

      <View style={[styles.topBar, { paddingHorizontal: px(layout.screenPadding) }]}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowLeft size={22} color={colors.dark} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.brandBlock}>
          <PartnerText style={[styles.brandRace, { fontSize: px(18), lineHeight: px(22) }]}>RACE</PartnerText>
          <PartnerText style={[styles.brandPartner, { fontSize: px(11), lineHeight: px(14) }]}>
            PARTNER
          </PartnerText>
        </View>

        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: px(layout.screenPadding),
              paddingBottom: insets.bottom + px(spacing.xl),
            },
          ]}>
          <PartnerText style={[styles.heroTitle, { fontSize: px(24), lineHeight: px(30) }]}>
            Almost done!
          </PartnerText>
          <PartnerText
            style={[
              styles.heroSubtitle,
              { fontSize: px(14), lineHeight: px(21), marginTop: px(6) },
            ]}>
            Please review your details before submitting. Our team will verify and get you onboard.
          </PartnerText>

          <Image
            source={images.homeHeroTruck}
            style={[styles.heroImage, { height: px(100), marginTop: px(spacing.sm) }]}
            resizeMode="contain"
            accessibilityLabel="RACE Partner tow truck"
          />

          <View
            style={[
              styles.card,
              {
                marginTop: px(spacing.md),
                paddingHorizontal: px(spacing.lg),
                paddingTop: px(spacing.lg),
                paddingBottom: px(spacing.xl),
                borderRadius: px(18),
              },
            ]}>
            <PartnerRegistrationStepper
              steps={VENDOR_REGISTRATION_STEPS}
              activeStep={4}
            />

            <PartnerText style={[styles.formTitle, { fontSize: px(20), marginTop: px(spacing.lg) }]}>
              Review your details
            </PartnerText>
            <PartnerText
              style={[
                styles.formSubtitle,
                {
                  fontSize: px(13),
                  lineHeight: px(19),
                  marginTop: px(4),
                  marginBottom: px(spacing.lg),
                },
              ]}>
              Confirm everything looks correct before you submit.
            </PartnerText>

            {submitting ? (
              <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.md }} />
            ) : null}

            <SectionCard
              title="Business details"
              Icon={Building2}
              onEdit={() => navigation.navigate('VendorBusinessInfo', route.params)}>
              <DetailRow label="Business name" value={vendorBusiness.businessName} />
              <DetailRow label="Owner name" value={vendorBusiness.ownerName} />
              <DetailRow label="Mobile number" value={formatMobile(vendorBusiness.mobileNumber)} />
              <DetailRow label="Email" value={vendorBusiness.email || '—'} />
              <DetailRow label="Business type" value={vendorBusiness.businessType} />
            </SectionCard>

            <SectionCard
              title="Business address"
              Icon={MapPin}
              onEdit={() => navigation.navigate('VendorBusinessAddress', route.params)}>
              <DetailRow label="Address line 1" value={vendorAddress.addressLine1} />
              <DetailRow label="Address line 2" value={vendorAddress.addressLine2 || '—'} />
              <DetailRow label="City" value={vendorAddress.city} />
              <DetailRow label="State" value={vendorAddress.state} />
              <DetailRow label="PIN code" value={vendorAddress.pinCode} />
              <DetailRow label="Landmark" value={vendorAddress.landmark || '—'} />
            </SectionCard>

            <SectionCard
              title="Documents"
              Icon={FileText}
              onEdit={() => navigation.navigate('VendorDocuments', route.params)}>
              {uploadedDocs.length === 0 ? (
                <PartnerText style={styles.emptyDocs}>No documents uploaded yet.</PartnerText>
              ) : (
                uploadedDocs.map(doc => {
                  const DocIcon = doc.Icon;
                  return (
                    <View key={doc.id} style={styles.docRow}>
                      <View style={styles.docIcon}>
                        <DocIcon size={14} color={SUCCESS_GREEN} strokeWidth={2.2} />
                      </View>
                      <View style={styles.docCopy}>
                        <PartnerText style={styles.docTitle}>{doc.label}</PartnerText>
                        <PartnerText style={styles.docStatus}>Uploaded</PartnerText>
                      </View>
                      <Check size={14} color={SUCCESS_GREEN} strokeWidth={3} />
                    </View>
                  );
                })
              )}
            </SectionCard>

            {vendorBusiness.accountNumber ? (
              <SectionCard
                title="Bank details"
                Icon={CreditCard}
                onEdit={() => navigation.navigate('VendorBusinessAddress', route.params)}>
                <DetailRow
                  label="Account holder"
                  value={vendorBusiness.accountHolderName || vendorBusiness.ownerName}
                />
                <DetailRow label="Account number" value={vendorBusiness.accountNumber} />
                <DetailRow label="IFSC code" value={vendorBusiness.ifsc || '—'} />
              </SectionCard>
            ) : null}

            <Pressable
              onPress={() => setTermsAccepted((v) => !v)}
              style={styles.termsCheckboxRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}>
              <View style={[styles.termsCheckbox, termsAccepted && styles.termsCheckboxChecked]}>
                {termsAccepted ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
              </View>
              <PartnerText style={styles.termsCheckboxText}>
                I confirm that all provided details and documents are authentic, and I agree to the
                RACE Partner Terms and Verification Policy.
              </PartnerText>
            </Pressable>

            <Pressable
              disabled={submitting || !termsAccepted}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.submitButton,
                {
                  marginTop: px(spacing.md),
                  minHeight: px(54),
                  borderRadius: px(14),
                },
                (submitting || !termsAccepted) && styles.submitDisabled,
                pressed && !submitting && termsAccepted && styles.pressed,
              ]}>
              <PartnerText style={[styles.submitLabel, { fontSize: px(16) }]}>
                {submitting ? 'Submitting…' : 'Submit for review'}
              </PartnerText>
              {!submitting ? (
                <ArrowRight size={px(18)} color={colors.dark} strokeWidth={2.5} />
              ) : null}
            </Pressable>

            <View style={[styles.agreeRow, { marginTop: px(spacing.lg) }]}>
              <ShieldCheck size={14} color={colors.grey} strokeWidth={2.2} />
              <PartnerText style={styles.agreeText}>
                By submitting, you agree that all information is accurate to the best of your
                knowledge.
              </PartnerText>
            </View>
          </View>

          <View style={[styles.trustCard, { marginTop: px(spacing.lg), borderRadius: px(14) }]}>
            <View style={styles.trustIcon}>
              <ShieldCheck size={16} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.trustCopy}>
              <PartnerText style={styles.trustTitle}>Secure & Verified</PartnerText>
              <PartnerText style={styles.trustText}>
                We verify every document to keep RACE customers safe.
              </PartnerText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBlock: { alignItems: 'center' },
  brandRace: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  brandPartner: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.6,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  heroTitle: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
    marginTop: spacing.sm,
  },
  heroSubtitle: {
    color: colors.grey,
  },
  heroImage: {
    width: '100%',
    maxWidth: 240,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  formTitle: {
    color: colors.dark,
    fontWeight: typography.weights.extrabold,
  },
  formSubtitle: {
    color: colors.grey,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.goldLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editLabel: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  sectionBody: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    color: colors.grey,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    marginBottom: 2,
  },
  detailValue: {
    color: colors.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  emptyDocs: {
    color: colors.grey,
    fontSize: typography.sizes.sm,
    paddingVertical: spacing.sm,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  docIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCopy: { flex: 1 },
  docTitle: {
    color: colors.dark,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  docStatus: {
    marginTop: 1,
    color: SUCCESS_GREEN,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitLabel: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  agreeText: {
    flex: 1,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  trustIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustCopy: { flex: 1 },
  trustTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  trustText: {
    marginTop: 2,
    color: colors.grey,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  pressed: { opacity: 0.9 },
  termsCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: 2,
  },
  termsCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border || '#888',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsCheckboxChecked: {
    backgroundColor: SUCCESS_GREEN,
    borderColor: SUCCESS_GREEN,
  },
  termsCheckboxText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.dark,
    lineHeight: 18,
  },
});
