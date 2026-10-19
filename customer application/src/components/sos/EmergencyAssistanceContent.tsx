import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  Ambulance,
  ChevronRight,
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
import { useSosDetails } from '../../context/SosDetailsContext';
import { useAuthStore } from '../../store/authStore';
import { getApiErrorMessage } from '../../services/api';
import {
  useSosAlertMutation,
  useSosConfigQuery,
  useSosContextQuery,
} from '../../services/sos/useSosQueries';
import { colors, typography } from '../../theme';
import type { RootTabParamList } from '../../types/navigation';

const REF_W = 390;

/**
 * Redesigned SOS screen (v6 audit).
 *
 * The old version was a standalone black screen that clashed with the rest of
 * the app, hid the tab bar, and its only exit was an invisible corner icon.
 * This version uses the same light design language as Home/Services:
 * TabRootHeader, white cards on the standard page background, and app colors.
 * Emergency-UX choices:
 *  - One dominant red SOS pulse — the single most important action.
 *  - Primary "Call 112 / ambulance" surface directly under it.
 *  - 2x2 action grid with clear labels and sub-labels.
 *  - Owner + emergency contact cards with direct call buttons.
 *  - Demo-data honesty: if profile data still has placeholder values, the
 *    cards link to SOS Details instead of pretending they are real.
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
  const { data: config, isError: configError } = useSosConfigQuery();
  // Query only fires when signed in — unauthenticated 401s never happen.
  const { data: context, isLoading: contextLoading } = useSosContextQuery(undefined, isAuthenticated);
  const sosAlert = useSosAlertMutation();
  const [alertTick, setAlertTick] = useState(0);

  // A gentle once-per-second tick keeps the pulse ring honest when idle.
  useEffect(() => {
    const timer = setInterval(() => setAlertTick(t => (t + 1) % 2), 1500);
    return () => clearInterval(timer);
  }, []);

  const emergencyPhone = (config?.emergencyPhone ?? '112').replace(/\s/g, '');
  const supportPhone = config?.supportPhone ?? '';

  const vehicleLabel = context?.vehicle
    ? context.vehicle.label
    : `${details.vehicleBrand} ${details.vehicleModel}`.trim();
  const vehicleNumber = context?.vehicle?.number ?? details.vehicleNumber;
  const ownerName = context?.owner?.name ?? details.ownerName;
  const ownerPhoneRaw = (context?.owner?.phone ?? details.ownerPhone).replace(/\s/g, '');
  const contactName = context?.emergencyContact?.name ?? details.contactName;
  const contactPhone = (context?.emergencyContact?.mobileNumber ?? details.contactPhone).replace(/\s/g, '');
  const contactRelation = context?.emergencyContact?.relationship ?? details.contactRelation;
  const vehicleId = context?.vehicle?.id;

  // Demo-data honesty: these placeholder values come from SosDetailsContext
  // defaults. Surfacing them silently as "your vehicle" misleads a driver in
  // an emergency, so the cards point at SOS Details when they are unset.
  const detailsIncomplete =
    !isAuthenticated ||
    !vehicleNumber ||
    vehicleNumber.replace(/\s/g, '').toUpperCase().startsWith('MH12') ||
    !ownerPhoneRaw;

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

  const triggerAlert = useCallback(
    async (
      action: 'sos' | 'towing' | 'ambulance' | 'share_location' | 'notify_contacts',
      successTitle: string,
    ) => {
      if (!isAuthenticated) {
        Alert.alert('Sign in required', 'Please log in to use emergency alerts.');
        return;
      }

      const location = await resolveLocation();
      sosAlert.mutate(
        { action, vehicleId, ...location },
        {
          onSuccess: result => Alert.alert(successTitle, result.message),
          onError: error => Alert.alert('Request failed', getApiErrorMessage(error)),
        },
      );
    },
    [isAuthenticated, resolveLocation, sosAlert, vehicleId],
  );

  const handleGridAction = (id: string) => {
    switch (id) {
      case 'towing':
        if (isAuthenticated) {
          void triggerAlert('towing', 'Towing Requested');
        } else {
          tabNav.navigate('Services', { screen: 'TowingService' });
        }
        break;
      case 'ambulance':
        void Linking.openURL(`tel:${emergencyPhone}`);
        break;
      case 'location':
        if (isAuthenticated) {
          void triggerAlert('share_location', 'Location Shared');
        } else {
          void Share.share({ message: `Vehicle ${vehicleNumber} — ${details.location}` });
        }
        break;
      case 'contacts':
        if (isAuthenticated) {
          void triggerAlert('notify_contacts', 'Contact Notified');
        } else {
          Alert.alert('Emergency Contacts', `${contactName} (${contactRelation})\n${contactPhone}`);
        }
        break;
      default:
        break;
    }
  };

  const sendAlert = () => {
    void triggerAlert('sos', 'Emergency Alert Sent');
  };

  const gridActions = [
    {
      id: 'towing',
      label: 'Request Towing',
      sub: 'Nearest tow partner',
      icon: <Truck size={px(24)} color={colors.primaryDark} strokeWidth={2.2} />,
    },
    {
      id: 'ambulance',
      label: 'Call Emergency',
      sub: emergencyPhone,
      icon: <Ambulance size={px(24)} color={colors.error} strokeWidth={2.2} />,
    },
    {
      id: 'location',
      label: 'Share Location',
      sub: 'Live GPS with responders',
      icon: <MapPin size={px(24)} color={colors.secondary} strokeWidth={2.2} />,
    },
    {
      id: 'contacts',
      label: 'Notify Contacts',
      sub: `${contactName} (${contactRelation})`,
      icon: <Send size={px(22)} color="#7C3AED" strokeWidth={2.2} />,
    },
  ];

  return (
    <AppScreenLayout
      backgroundColor={colors.pageBg}
      header={
        <TabRootHeader
          title="Emergency SOS"
          subtitle="Immediate help, one tap away"
          onBellPress={() => tabNav.navigate('Profile')}
          onAvatarPress={() => tabNav.navigate('Profile')}
        />
      }>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: px(28) }}>
        {/* Primary emergency action */}
        <View style={styles.pulseWrap}>
          <SosPulseButton px={px} onPress={sendAlert} />
          {sosAlert.isPending ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: px(8) }} />
          ) : null}
          <Text style={{ color: colors.grey, fontSize: px(12), marginTop: px(8) }}>
            Press once — alert + live location go to your emergency contact.
          </Text>
        </View>

        {/* Direct emergency call */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Call emergency number ${emergencyPhone}`}
          onPress={() => void Linking.openURL(`tel:${emergencyPhone}`)}
          style={[styles.bigCall, { borderRadius: px(18), padding: px(16), marginBottom: px(18) }]}>
          <View style={[styles.bigCallIcon, { width: px(46), height: px(46), borderRadius: px(23) }]}>
            <Phone size={px(22)} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: px(15), fontWeight: typography.weights.bold }}>
              Call Emergency {emergencyPhone}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: px(11.5), marginTop: px(2) }}>
              Ambulance · Police · Fire — free from any phone
            </Text>
          </View>
          <ChevronRight size={px(20)} color="rgba(255,255,255,0.9)" strokeWidth={2.5} />
        </Pressable>

        {/* Quick actions grid */}
        <Text style={[styles.sectionTitle, { fontSize: px(16), marginBottom: px(12) }]}>
          Quick Actions
        </Text>
        <View style={styles.grid}>
          {gridActions.map(action => (
            <Pressable
              key={action.id}
              accessibilityRole="button"
              onPress={() => handleGridAction(action.id)}
              style={[styles.gridCard, { borderRadius: px(16), padding: px(14), gap: px(10) }]}>
              {action.icon}
              <Text numberOfLines={1} style={{ color: colors.dark, fontSize: px(13), fontWeight: typography.weights.bold }}>
                {action.label}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.grey, fontSize: px(10.5), marginTop: -px(6) }}>
                {action.sub}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Vehicle + owner */}
        <View style={[styles.card, { borderRadius: px(16), padding: px(14), marginTop: px(4), marginBottom: px(14) }]}>
          <View style={styles.row}>
            <View style={[styles.avatar, { width: px(44), height: px(44), borderRadius: px(22) }]}>
              <Truck size={px(20)} color={colors.primaryDark} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: colors.grey, fontSize: px(10.5) }}>
                Your vehicle
              </Text>
              <Text numberOfLines={1} style={{ color: colors.dark, fontSize: px(14), fontWeight: typography.weights.bold }}>
                {vehicleLabel}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.grey, fontSize: px(12), marginTop: px(2) }}>
                {vehicleNumber || 'Add your vehicle number'}
              </Text>
            </View>
          </View>
          <View style={[styles.row, { marginTop: px(12), paddingTop: px(12), borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={[styles.avatar, { width: px(44), height: px(44), borderRadius: px(22) }]}>
              <User size={px(20)} color={colors.primaryDark} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: colors.grey, fontSize: px(10.5) }}>
                Owner on record
              </Text>
              <Text numberOfLines={1} style={{ color: colors.dark, fontSize: px(14), fontWeight: typography.weights.bold }}>
                {ownerName || 'Add owner details'}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.grey, fontSize: px(12), marginTop: px(2) }}>
                {context?.owner?.phone ?? details.ownerPhone}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void Linking.openURL(`tel:${ownerPhoneRaw}`)}
              style={[styles.callBtn, { paddingHorizontal: px(13), paddingVertical: px(10), borderRadius: px(11) }]}>
              <Phone size={px(14)} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={{ color: '#FFFFFF', fontSize: px(11.5), fontWeight: typography.weights.bold }}>Call</Text>
            </Pressable>
          </View>
        </View>

        {/* Emergency contact */}
        <View style={[styles.card, { borderRadius: px(16), padding: px(14), marginBottom: px(14) }]}>
          <Text style={{ color: colors.dark, fontSize: px(15), fontWeight: typography.weights.bold, marginBottom: px(10) }}>
            Emergency contact
          </Text>
          <View style={styles.row}>
            <View style={[styles.avatar, { width: px(40), height: px(40), borderRadius: px(20) }]}>
              <User size={px(18)} color={colors.secondary} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: colors.dark, fontSize: px(13.5), fontWeight: typography.weights.bold }}>
                {contactName} ({contactRelation})
              </Text>
              <Text numberOfLines={1} style={{ color: colors.grey, fontSize: px(12), marginTop: px(2) }}>
                {context?.emergencyContact?.mobileNumber ?? details.contactPhone}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={sendAlert}
              style={[styles.callBtn, { backgroundColor: colors.primary, paddingHorizontal: px(13), paddingVertical: px(10), borderRadius: px(11) }]}>
              <Send size={px(13)} color={colors.dark} strokeWidth={2.4} />
              <Text style={{ color: colors.dark, fontSize: px(11.5), fontWeight: typography.weights.bold }}>Alert</Text>
            </Pressable>
          </View>
        </View>

        {/* Current location card */}
        <Pressable
          onPress={() => Alert.alert('Location', details.location)}
          style={[styles.card, { borderRadius: px(16), padding: px(14), marginBottom: px(14) }]}>
          <View style={styles.row}>
            <MapPin size={px(20)} color={colors.primaryDark} strokeWidth={2.2} />
            <View style={{ flex: 1, marginLeft: px(10) }}>
              <Text style={{ color: colors.grey, fontSize: px(10.5) }}>Current location</Text>
              <Text numberOfLines={2} style={{ color: colors.dark, fontSize: px(13), fontWeight: typography.weights.semibold, marginTop: px(2) }}>
                {details.location}
              </Text>
            </View>
            <ChevronRight size={px(18)} color={colors.grey} strokeWidth={2.4} />
          </View>
        </Pressable>

        {/* Demo honesty + config status */}
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
              Showing sample emergency details.{' '}
              <Text style={{ fontWeight: typography.weights.bold, color: colors.primaryDark }}>
                Update SOS Details
              </Text>{' '}
              so responders see the right vehicle and contacts.
            </Text>
          </Pressable>
        ) : null}
        {configError ? (
          <Text style={{ color: colors.grey, fontSize: px(10.5), textAlign: 'center', marginBottom: px(8) }}>
            Emergency numbers shown are defaults — they refresh once the service is reachable.
          </Text>
        ) : null}
        {contextLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: px(4) }} />
        ) : null}

        <Text style={{ color: colors.grey, fontSize: px(11), textAlign: 'center', marginTop: px(6) }}>
          {supportPhone ? `Support ${supportPhone} · ` : ''}Powered by RACE Service
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: px(9.5), textAlign: 'center', marginTop: px(4) }}>
          pulse check #{alertTick % 2 === 0 ? 'steady' : 'ready'} · SOS stays visible on every tab
        </Text>
      </ScrollView>
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  pulseWrap: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  gridCard: {
    width: '47.5%',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
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
