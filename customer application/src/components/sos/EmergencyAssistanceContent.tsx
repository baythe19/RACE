import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import {
  ChevronRight,
  Info,
  MapPin,
  Phone,
  Send,
  Truck,
  User,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import AppScreenLayout from '../ui/AppScreenLayout';
import TabRootHeader from '../ui/TabRootHeader';
import SosPulseButton from './SosPulseButton';
import SosAppDialog, { type SosDialogVariant } from './SosAppDialog';
import { jumpToAuthScreen } from '../../navigation/customerNavigationRef';
import { useSosDetails } from '../../context/SosDetailsContext';
import { useAppSelector } from '../../redux/hooks';
import { isUiPreviewAuthFlow } from '../../config/uiPreviewMode';
import { previewSosAlertMessage, isPreviewSosSession } from '../../services/sos/sosPreview';
import { useAuthStore } from '../../store/authStore';
import { getApiErrorMessage } from '../../services/api';
import {
  useSosAlertMutation,
  useSosConfigQuery,
  useSosContextQuery,
} from '../../services/sos/useSosQueries';
import { useNotificationsQuery } from '../../services/profile/useProfileQueries';
import {
  emergencyContactDigits,
  formatEmergencyPhoneDisplay,
  hasSavedEmergencyContact,
  isPlausiblePersonName,
  telUriForDigits,
} from '../../utils/emergencyContact';
import { isValidIndianMobile } from '../../utils/phone';
import { formatVehicleNumber, isValidIndianVehicleRegistration } from '../../utils/vehicleFormat';
import { colors, typography } from '../../theme';
import type { RootTabParamList } from '../../types/navigation';

const REF_W = 390;

type SosDialogState = {
  variant: SosDialogVariant;
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

/**
 * SOS screen — calm urgency.
 * One red pulse + one Call Emergency strip. Quick actions are only the
 * three non-call helpers (towing / share location / notify). No duplicate
 * Call Emergency tile in the grid.
 */
export default function EmergencyAssistanceContent({
  onConfigure,
}: {
  /** Opens Profile > SOS Details for updating owner/vehicle/contacts. */
  onConfigure?: () => void;
}) {
  const tabNav = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { width } = useWindowDimensions();
  const px = (n: number) => Math.round(n * (width / REF_W));

  const { details } = useSosDetails();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const accessToken = useAppSelector(state => state.auth.accessToken);
  const previewSos =
    isUiPreviewAuthFlow() || isPreviewSosSession(accessToken);
  const { data: config, isError: configError } = useSosConfigQuery();
  const { data: context, isLoading: contextLoading } = useSosContextQuery(undefined, isAuthenticated);
  const { data: notificationsData } = useNotificationsQuery();
  const unreadCount = notificationsData?.unreadCount ?? 0;
  const sosAlert = useSosAlertMutation();
  const [dialog, setDialog] = useState<SosDialogState | null>(null);

  const openDialog = useCallback((next: SosDialogState) => setDialog(next), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  const emergencyPhone = (config?.emergencyPhone ?? '112').replace(/\s/g, '');
  const emergencyPhoneLabel = formatEmergencyPhoneDisplay(emergencyPhone);
  const emergencyTelUri = telUriForDigits(emergencyPhone);
  const supportPhone = config?.supportPhone ?? '';

  const rawVehicleNumber = context?.vehicle?.number ?? '';
  const rawVehicleLabel = context?.vehicle?.label ?? '';
  const vehicleNumberValid = isValidIndianVehicleRegistration(rawVehicleNumber);
  const vehicleLabel = vehicleNumberValid ? rawVehicleLabel.trim() : '';
  const vehicleNumber = vehicleNumberValid ? formatVehicleNumber(rawVehicleNumber) : '';

  const rawOwnerName = context?.owner?.name ?? '';
  const ownerPhoneRaw = (context?.owner?.phone ?? '').replace(/\D/g, '').slice(-10);
  const ownerReady = isPlausiblePersonName(rawOwnerName) && isValidIndianMobile(ownerPhoneRaw);
  const ownerName = ownerReady ? rawOwnerName.trim() : '';
  const ownerTelUri = ownerReady ? telUriForDigits(ownerPhoneRaw) : '';
  const savedContact = context?.emergencyContact ?? null;
  const hasContact = hasSavedEmergencyContact(savedContact);
  const contactName = hasContact ? savedContact!.name.trim() : '';
  const contactPhone = hasContact ? emergencyContactDigits(savedContact) : '';
  const contactRelation = hasContact ? savedContact!.relationship?.trim() ?? '' : '';
  const vehicleId = context?.vehicle?.id;

  const detailsIncomplete =
    !isAuthenticated || !vehicleNumberValid || !hasContact || !ownerReady;

  const resolveLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { address: details.location };
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        address: details.location,
      };
    } catch {
      return { address: details.location };
    }
  }, [details.location]);

  const showSosInfo = () => {
    openDialog({
      variant: 'info',
      title: 'SOS alert',
      message:
        'One tap sends an alert with your live location to your emergency contact. For ambulance, police, or fire, use Call Emergency.',
      primaryLabel: 'Got it',
    });
  };

  const openSosDetails = useCallback(() => {
    closeDialog();
    if (onConfigure) onConfigure();
    else tabNav.navigate('Profile', { screen: 'SosDetails' });
  }, [closeDialog, onConfigure, tabNav]);

  const showDetailsRequiredDialog = useCallback(() => {
    openDialog({
      variant: 'info',
      title: 'Complete SOS details',
      message:
        'Add your vehicle, owner on record, and emergency contact in Profile or SOS Details before sending alerts or using More help actions.',
      primaryLabel: 'Update SOS Details',
      onPrimary: openSosDetails,
      secondaryLabel: 'Not now',
    });
  }, [openDialog, openSosDetails]);

  const triggerAlert = useCallback(
    async (
      action: 'sos' | 'towing' | 'ambulance' | 'share_location' | 'notify_contacts',
      successTitle: string,
    ) => {
      if (!isAuthenticated) {
        openDialog({
          variant: 'signIn',
          title: 'Sign in required',
          message: 'Log in to send SOS alerts and notify your emergency contact with live location.',
          primaryLabel: 'Log in',
          onPrimary: () => jumpToAuthScreen('MobileNumber'),
          secondaryLabel: 'Cancel',
        });
        return;
      }
      if (detailsIncomplete) {
        showDetailsRequiredDialog();
        return;
      }
      if (sosAlert.isPending) return;

      if (previewSos) {
        openDialog({
          variant: 'success',
          title: successTitle,
          message: previewSosAlertMessage(action, { contactName, vehicleLabel }),
          primaryLabel: 'Done',
        });
        return;
      }

      const location = await resolveLocation();
      sosAlert.mutate(
        { action, vehicleId, ...location },
        {
          onSuccess: result =>
            openDialog({
              variant: 'success',
              title: successTitle,
              message: result.message,
              primaryLabel: 'Done',
            }),
          onError: error =>
            openDialog({
              variant: 'error',
              title: 'Request failed',
              message: getApiErrorMessage(error),
              primaryLabel: 'OK',
            }),
        },
      );
    },
    [
      contactName,
      detailsIncomplete,
      isAuthenticated,
      openDialog,
      previewSos,
      resolveLocation,
      showDetailsRequiredDialog,
      sosAlert,
      vehicleId,
      vehicleLabel,
    ],
  );

  const handleGridAction = (id: string) => {
    switch (id) {
      case 'towing':
        if (isAuthenticated) {
          if (detailsIncomplete) {
            showDetailsRequiredDialog();
            return;
          }
          void triggerAlert('towing', 'Towing Requested');
        } else {
          tabNav.navigate('Services', { screen: 'TowingService' });
        }
        break;
      case 'location':
        if (isAuthenticated) {
          if (detailsIncomplete) {
            showDetailsRequiredDialog();
            return;
          }
          void triggerAlert('share_location', 'Location Shared');
        } else {
          void Share.share({ message: `Vehicle ${vehicleNumber} — ${details.location}` });
        }
        break;
      case 'contacts':
        if (isAuthenticated) {
          if (detailsIncomplete) {
            showDetailsRequiredDialog();
            return;
          }
          void triggerAlert('notify_contacts', 'Contact Notified');
        } else {
          openDialog({
            variant: 'info',
            title: 'Emergency contact',
            message: `${contactName} (${contactRelation})\n${contactPhone}`,
            primaryLabel: 'OK',
          });
        }
        break;
      default:
        break;
    }
  };

  const sendAlert = () => {
    void triggerAlert('sos', 'Emergency Alert Sent');
  };

  // One grouped list. Each row is a full-width tap with the action named on the right.
  const gridActions = [
    {
      id: 'towing',
      label: 'Request towing',
      sub: 'RACE dispatch (not a phone call)',
      action: 'Request',
      icon: <Truck size={px(20)} color={colors.primaryDark} strokeWidth={2.2} />,
      tint: colors.goldLight,
    },
    {
      id: 'location',
      label: 'Share location',
      sub: 'Send your live GPS',
      action: 'Share',
      icon: <MapPin size={px(20)} color={colors.secondary} strokeWidth={2.2} />,
      tint: '#E8F4FC',
    },
    {
      id: 'contacts',
      label: 'Notify contact',
      sub: contactName ? `${contactName}${contactRelation ? ` · ${contactRelation}` : ''}` : 'Emergency contact',
      action: 'Notify',
      icon: <Send size={px(18)} color="#7C3AED" strokeWidth={2.2} />,
      tint: '#F3EFFF',
    },
  ];

  return (
    <AppScreenLayout
      scrollable={false}
      backgroundColor={colors.pageBg}
      header={
        <TabRootHeader
          title="Emergency SOS"
          notificationCount={unreadCount}
          onInfoPress={showSosInfo}
          onBellPress={() => {
            tabNav.navigate('Profile', { screen: 'Notifications' });
          }}
          onAvatarPress={() => tabNav.navigate('Profile')}
        />
      }>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: px(28) }}>
          <View style={styles.pulseWrap}>
            <SosPulseButton px={px} onPress={sendAlert} />
            {sosAlert.isPending ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: px(8) }} />
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call emergency number ${emergencyPhoneLabel}`}
            disabled={!emergencyTelUri}
            onPress={() => {
              if (emergencyTelUri) void Linking.openURL(emergencyTelUri);
            }}
            style={({ pressed }) => [
              styles.bigCall,
              {
                minHeight: px(72),
                borderRadius: px(16),
                paddingHorizontal: px(14),
                paddingVertical: px(12),
                marginBottom: px(20),
                opacity: pressed ? 0.9 : 1,
              },
            ]}>
            <View style={[styles.bigCallIcon, { width: px(44), height: px(44), borderRadius: px(22) }]}>
              <Phone size={px(20)} color="#FFFFFF" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: px(12), fontWeight: typography.weights.semibold }}>
                Call Emergency
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: '#FFFFFF',
                  fontSize: px(18),
                  fontWeight: typography.weights.bold,
                  marginTop: px(2),
                }}>
                {emergencyPhoneLabel}
              </Text>
            </View>
            <ChevronRight size={px(20)} color="rgba(255,255,255,0.9)" strokeWidth={2.5} />
          </Pressable>

          <Text style={[styles.sectionTitle, { fontSize: px(15), marginBottom: px(10) }]}>
            More help
          </Text>
          <View style={[styles.actionGroup, { borderRadius: px(16), marginBottom: px(18) }]}>
            {gridActions.map((action, index) => (
              <Pressable
                key={action.id}
                accessibilityRole="button"
                accessibilityLabel={`${action.action}. ${action.label}. ${action.sub}`}
                onPress={() => handleGridAction(action.id)}
                style={({ pressed }) => [
                  styles.actionRow,
                  {
                    minHeight: px(68),
                    paddingVertical: px(12),
                    paddingHorizontal: px(12),
                    backgroundColor: pressed ? '#F7F7F8' : colors.cardBg,
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}>
                <View
                  style={[
                    styles.gridIcon,
                    {
                      width: px(40),
                      height: px(40),
                      borderRadius: px(12),
                      backgroundColor: action.tint,
                    },
                  ]}>
                  {action.icon}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.dark,
                      fontSize: px(15),
                      fontWeight: typography.weights.bold,
                    }}>
                    {action.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.grey, fontSize: px(12), marginTop: px(2) }}>
                    {action.sub}
                  </Text>
                </View>
                <View style={[styles.actionPill, { borderRadius: px(10), paddingHorizontal: px(10), paddingVertical: px(7) }]}>
                  <Text style={{ color: colors.dark, fontSize: px(12), fontWeight: typography.weights.bold }}>
                    {action.action}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View
            style={[
              styles.card,
              { borderRadius: px(14), padding: px(14), marginBottom: px(12) },
            ]}>
            <View style={styles.row}>
              <View style={[styles.avatar, { width: px(42), height: px(42), borderRadius: px(12) }]}>
                <Truck size={px(18)} color={colors.primaryDark} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: colors.grey, fontSize: px(10.5) }}>
                  Your vehicle
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.dark,
                    fontSize: px(14),
                    fontWeight: typography.weights.bold,
                  }}>
                  {vehicleLabel || 'Add your vehicle'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ color: colors.grey, fontSize: px(12), marginTop: px(2) }}>
                  {vehicleNumber || 'Add registration in Profile → My Vehicles'}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.row,
                {
                  marginTop: px(12),
                  paddingTop: px(12),
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                },
              ]}>
              <View style={[styles.avatar, { width: px(42), height: px(42), borderRadius: px(12) }]}>
                <User size={px(18)} color={colors.primaryDark} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: colors.grey, fontSize: px(10.5) }}>
                  Owner on record
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.dark,
                    fontSize: px(14),
                    fontWeight: typography.weights.bold,
                  }}>
                  {ownerName || 'Add owner details'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ color: colors.grey, fontSize: px(12), marginTop: px(2) }}>
                  {ownerPhoneRaw && !ownerReady
                    ? 'Update name & phone in Profile'
                    : ownerPhoneRaw
                      ? formatEmergencyPhoneDisplay(ownerPhoneRaw)
                      : 'Sign in and complete your profile'}
                </Text>
              </View>
              {ownerTelUri ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Call owner"
                  onPress={() => void Linking.openURL(ownerTelUri)}
                  style={[
                    styles.callBtn,
                    {
                      width: px(40),
                      height: px(40),
                      borderRadius: px(20),
                      paddingHorizontal: 0,
                      paddingVertical: 0,
                      justifyContent: 'center',
                    },
                  ]}>
                  <Phone size={px(18)} color="#FFFFFF" strokeWidth={2.4} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View
            style={[
              styles.card,
              { borderRadius: px(14), padding: px(14), marginBottom: px(12) },
            ]}>
            <Text
              style={{
                color: colors.dark,
                fontSize: px(14),
                fontWeight: typography.weights.bold,
                marginBottom: px(10),
              }}>
              Emergency contact
            </Text>
            <View style={styles.row}>
              <View
                style={[
                  styles.avatar,
                  {
                    width: px(40),
                    height: px(40),
                    borderRadius: px(12),
                    backgroundColor: '#E8F4FC',
                  },
                ]}>
                <User size={px(17)} color={colors.secondary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                {hasContact ? (
                  <>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.dark,
                        fontSize: px(13.5),
                        fontWeight: typography.weights.bold,
                      }}>
                      {contactName}
                      {contactRelation ? ` (${contactRelation})` : ''}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ color: colors.grey, fontSize: px(12), marginTop: px(2) }}>
                      {formatEmergencyPhoneDisplay(contactPhone)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        color: colors.dark,
                        fontSize: px(13.5),
                        fontWeight: typography.weights.bold,
                      }}>
                      Please add emergency contact
                    </Text>
                    <Text style={{ color: colors.grey, fontSize: px(12), marginTop: px(2), lineHeight: px(17) }}>
                      Save a trusted contact in Profile → Personal Information or SOS Details.
                    </Text>
                  </>
                )}
              </View>
              {hasContact && contactPhone ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${contactName}`}
                  onPress={() => {
                    const uri = telUriForDigits(contactPhone);
                    if (uri) void Linking.openURL(uri);
                  }}
                  style={[
                    styles.callBtn,
                    {
                      backgroundColor: colors.secondary,
                      width: px(40),
                      height: px(40),
                      borderRadius: px(20),
                      paddingHorizontal: 0,
                      paddingVertical: 0,
                      justifyContent: 'center',
                    },
                  ]}>
                  <Phone size={px(18)} color="#FFFFFF" strokeWidth={2.4} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View
            style={[
              styles.card,
              { borderRadius: px(14), padding: px(14), marginBottom: px(12) },
            ]}>
            <View style={styles.row}>
              <MapPin size={px(18)} color={colors.primaryDark} strokeWidth={2.2} />
              <View style={{ flex: 1, marginLeft: px(8) }}>
                <Text style={{ color: colors.grey, fontSize: px(10.5) }}>Current location</Text>
                <Text
                  numberOfLines={2}
                  style={{
                    color: colors.dark,
                    fontSize: px(13),
                    fontWeight: typography.weights.semibold,
                    marginTop: px(2),
                  }}>
                  {details.location}
                </Text>
              </View>
            </View>
          </View>

          {detailsIncomplete ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => (onConfigure ? onConfigure() : tabNav.navigate('Profile'))}
              style={{
                borderRadius: px(12),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: '#FFF8E7',
                padding: px(12),
                marginBottom: px(12),
              }}>
              <Text style={{ color: colors.textDark, fontSize: px(11.5), lineHeight: px(16) }}>
                Complete vehicle, owner, and emergency contact in Profile so SOS shows accurate details.{' '}
                <Text style={{ fontWeight: typography.weights.bold, color: colors.primaryDark }}>
                  Update SOS Details
                </Text>
              </Text>
            </Pressable>
          ) : null}
          {configError ? (
            <Text
              style={{
                color: colors.grey,
                fontSize: px(10.5),
                textAlign: 'center',
                marginBottom: px(8),
              }}>
              Emergency numbers shown are defaults — they refresh once the service is reachable.
            </Text>
          ) : null}
          {contextLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: px(4) }} />
          ) : null}

          <Text
            style={{
              color: colors.grey,
              fontSize: px(11),
              textAlign: 'center',
              marginTop: px(4),
            }}>
            {supportPhone ? `Support ${supportPhone} · ` : ''}Powered by RACE Service
          </Text>
      </ScrollView>
      <SosAppDialog
        visible={dialog != null}
        variant={dialog?.variant}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        primaryLabel={dialog?.primaryLabel}
        onPrimary={dialog?.onPrimary}
        secondaryLabel={dialog?.secondaryLabel}
        onSecondary={dialog?.onSecondary}
        onClose={closeDialog}
      />
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  pulseWrap: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 8,
  },
  bigCall: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bigCallIcon: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.dark,
    fontWeight: typography.weights.bold,
  },
  actionGroup: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopColor: colors.border,
  },
  actionPill: {
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  gridIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
});
