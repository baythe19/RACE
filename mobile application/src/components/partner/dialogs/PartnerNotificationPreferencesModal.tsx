import { PartnerText } from '../PartnerText';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Bell, Briefcase, UserCheck, DollarSign, Tag } from 'lucide-react-native';
import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '../../../services/useNotificationQueries';

interface PartnerNotificationPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PartnerNotificationPreferencesModal({
  visible,
  onClose,
}: PartnerNotificationPreferencesModalProps) {
  const { data: serverPrefs } = useNotificationPreferencesQuery(visible);
  const updateMutation = useUpdateNotificationPreferencesMutation();

  const [jobRequests, setJobRequests] = useState(true);
  const [jobUpdates, setJobUpdates] = useState(true);
  const [accountUpdates, setAccountUpdates] = useState(true);
  const [earningsAlerts, setEarningsAlerts] = useState(true);
  const [promotions, setPromotions] = useState(false);

  useEffect(() => {
    if (serverPrefs) {
      setJobRequests(serverPrefs.pushEnabled ?? true);
      setJobUpdates(serverPrefs.bookingUpdates ?? true);
      setAccountUpdates(serverPrefs.serviceLaunches ?? true);
      setEarningsAlerts(serverPrefs.smsEnabled ?? true);
      setPromotions(serverPrefs.promotions ?? false);
    }
  }, [serverPrefs]);

  const handleToggle = (
    key: 'jobRequests' | 'jobUpdates' | 'accountUpdates' | 'earningsAlerts' | 'promotions',
    val: boolean,
  ) => {
    if (key === 'jobRequests') {
      setJobRequests(val);
      updateMutation.mutate({ pushEnabled: val });
    } else if (key === 'jobUpdates') {
      setJobUpdates(val);
      updateMutation.mutate({ bookingUpdates: val });
    } else if (key === 'accountUpdates') {
      setAccountUpdates(val);
      updateMutation.mutate({ serviceLaunches: val });
    } else if (key === 'earningsAlerts') {
      setEarningsAlerts(val);
      updateMutation.mutate({ smsEnabled: val });
    } else if (key === 'promotions') {
      setPromotions(val);
      updateMutation.mutate({ promotions: val });
    }
  };

  const ITEMS = [
    {
      key: 'jobRequests' as const,
      title: 'Job Requests',
      desc: 'Get notified about new jobs',
      icon: Briefcase,
      iconColor: '#0284C7',
      iconBg: '#F0F9FF',
      value: jobRequests,
    },
    {
      key: 'jobUpdates' as const,
      title: 'Job Updates',
      desc: 'Trip status and updates',
      icon: Bell,
      iconColor: '#D97706',
      iconBg: '#FFFBEB',
      value: jobUpdates,
    },
    {
      key: 'accountUpdates' as const,
      title: 'Account Updates',
      desc: 'Verification and profile updates',
      icon: UserCheck,
      iconColor: '#059669',
      iconBg: '#ECFDF5',
      value: accountUpdates,
    },
    {
      key: 'earningsAlerts' as const,
      title: 'Earnings & Payouts',
      desc: 'Payment and earnings alerts',
      icon: DollarSign,
      iconColor: '#7C3AED',
      iconBg: '#F5F3FF',
      value: earningsAlerts,
    },
    {
      key: 'promotions' as const,
      title: 'Promotions',
      desc: 'Offers and important info',
      icon: Tag,
      iconColor: '#DC2626',
      iconBg: '#FEF2F2',
      value: promotions,
    },
  ];

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.handleBar} />
          
          <PartnerText style={styles.title}>Notifications</PartnerText>
          <PartnerText style={styles.subtitle}>Manage notification types</PartnerText>

          <View style={styles.list}>
            {ITEMS.map(item => {
              const IconComp = item.icon;
              return (
                <View key={item.key} style={styles.row}>
                  <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
                    <IconComp size={18} color={item.iconColor} strokeWidth={2.2} />
                  </View>

                  <View style={styles.textCol}>
                    <PartnerText style={styles.rowTitle}>{item.title}</PartnerText>
                    <PartnerText style={styles.rowDesc}>{item.desc}</PartnerText>
                  </View>

                  <Switch
                    value={item.value}
                    onValueChange={val => handleToggle(item.key, val)}
                    trackColor={{ false: '#E2E4E8', true: driverColors.green }}
                    thumbColor={driverColors.white}
                  />
                </View>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.doneButton,
              getPressableFeedback(pressed),
            ]}
            onPress={onClose}>
            <PartnerText style={styles.doneButtonText}>Done</PartnerText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: driverColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E4E8',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: driverColors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: driverColors.grey,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 20,
  },
  list: {
    gap: 12,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: driverRadius.innerCard,
    backgroundColor: driverColors.card,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: {
    flex: 1,
    marginRight: 10,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.ink,
  },
  rowDesc: {
    fontSize: 12,
    color: driverColors.grey,
    marginTop: 2,
  },
  doneButton: {
    height: 48,
    borderRadius: driverRadius.button,
    backgroundColor: driverColors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: driverColors.white,
  },
});
