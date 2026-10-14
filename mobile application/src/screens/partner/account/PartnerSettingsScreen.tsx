import { PartnerText } from '../../../components/partner/PartnerText';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  User,
  FileText,
  CreditCard,
  Lock,
  Globe,
  Bell,
  MapPin,
  Moon,
  HelpCircle,
  LogOut,
  ChevronRight,
  Info,
} from 'lucide-react-native';

import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import PartnerLogoutDialog from '../../../components/partner/dialogs/PartnerLogoutDialog';
import PartnerLanguageSheet from '../../../components/partner/dialogs/PartnerLanguageSheet';
import PartnerLocationSheet from '../../../components/partner/dialogs/PartnerLocationSheet';
import PartnerNotificationPreferencesModal from '../../../components/partner/dialogs/PartnerNotificationPreferencesModal';
import { useAuthActions } from '../../../hooks/useAuth';
import { usePartnerOnboardingStore } from '../../../store/partnerOnboardingStore';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerSettings'>;

export default function PartnerSettingsScreen({ navigation }: Props) {
  const { logout } = useAuthActions();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [langSheetVisible, setLangSheetVisible] = useState(false);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const [notifPrefsVisible, setNotifPrefsVisible] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');
  const [darkMode, setDarkMode] = useState(false);

  const performLogout = async () => {
    try {
      setLoggingOut(true);
      usePartnerOnboardingStore.getState().clearSelectedRole();
      await logout();
    } catch {
      Alert.alert('Logout failed', 'Please try again.');
    } finally {
      setLoggingOut(false);
      setLogoutVisible(false);
    }
  };

  return (
    <PartnerScreenLayout
      title="Settings"
      onBack={() => navigation.goBack()}>
      {/* Account Section */}
      <View style={styles.sectionBlock}>
        <PartnerText style={styles.sectionHeader}>Account</PartnerText>
        <View style={styles.cardGroup}>
          <Pressable
            style={({ pressed }) => [styles.rowItem, getPressableFeedback(pressed)]}
            onPress={() => navigation.navigate('PartnerEditProfile')}>
            <View style={[styles.iconCircle, { backgroundColor: '#F0F9FF' }]}>
              <User size={18} color="#0284C7" strokeWidth={2.2} />
            </View>
            <View style={styles.textCol}>
              <PartnerText style={styles.rowTitle}>Profile</PartnerText>
              <PartnerText style={styles.rowDesc}>View and edit your profile</PartnerText>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.rowItem, getPressableFeedback(pressed)]}
            onPress={() => navigation.navigate('PartnerDocuments')}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFFBEB' }]}>
              <FileText size={18} color="#D97706" strokeWidth={2.2} />
            </View>
            <View style={styles.textCol}>
              <PartnerText style={styles.rowTitle}>Documents</PartnerText>
              <PartnerText style={styles.rowDesc}>Upload or manage documents</PartnerText>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.rowItem, getPressableFeedback(pressed)]}
            onPress={() => navigation.navigate('PartnerBankDetails')}>
            <View style={[styles.iconCircle, { backgroundColor: '#F5F3FF' }]}>
              <CreditCard size={18} color="#7C3AED" strokeWidth={2.2} />
            </View>
            <View style={styles.textCol}>
              <PartnerText style={styles.rowTitle}>Bank & Payouts</PartnerText>
              <PartnerText style={styles.rowDesc}>Manage bank details and payouts</PartnerText>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.rowItem, getPressableFeedback(pressed)]}
            onPress={() => Alert.alert('Password', 'Account authentication is managed via secure OTP.')}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
              <Lock size={18} color="#DC2626" strokeWidth={2.2} />
            </View>
            <View style={styles.textCol}>
              <PartnerText style={styles.rowTitle}>Change Password</PartnerText>
              <PartnerText style={styles.rowDesc}>Update your account password</PartnerText>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {/* App Settings Section */}
      <View style={styles.sectionBlock}>
        <PartnerText style={styles.sectionHeader}>App Settings</PartnerText>
        <View style={styles.cardGroup}>
          <Pressable
            style={({ pressed }) => [styles.rowItem, getPressableFeedback(pressed)]}
            onPress={() => setLangSheetVisible(true)}>
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Globe size={18} color="#2563EB" strokeWidth={2.2} />
            </View>
            <View style={styles.textCol}>
              <PartnerText style={styles.rowTitle}>Language</PartnerText>
              <PartnerText style={styles.rowDesc}>
                {selectedLang === 'en' ? 'English' : selectedLang === 'hi' ? 'हिंदी' : 'ଓଡ଼ିଆ'}
              </PartnerText>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.rowItem, getPressableFeedback(pressed)]}
            onPress={() => setNotifPrefsVisible(true)}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFF7ED' }]}>
              <Bell size={18} color="#EA580C" strokeWidth={2.2} />
            </View>
            <View style={styles.textCol}>
              <PartnerText style={styles.rowTitle}>App Notifications</PartnerText>
              <PartnerText style={styles.rowDesc}>Manage notification preferences</PartnerText>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.rowItem, getPressableFeedback(pressed)]}
            onPress={() => setLocationSheetVisible(true)}>
            <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
              <MapPin size={18} color="#059669" strokeWidth={2.2} />
            </View>
            <View style={styles.textCol}>
              <PartnerText style={styles.rowTitle}>Location Settings</PartnerText>
              <PartnerText style={styles.rowDesc}>Manage location permissions</PartnerText>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.divider} />

          <View style={styles.rowItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#F3F4F6' }]}>
              <Moon size={18} color="#374151" strokeWidth={2.2} />
            </View>
            <View style={styles.textCol}>
              <PartnerText style={styles.rowTitle}>Theme</PartnerText>
              <PartnerText style={styles.rowDesc}>Dark Mode (System Default)</PartnerText>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E2E4E8', true: driverColors.amber }}
              thumbColor={driverColors.white}
            />
          </View>
        </View>
      </View>

      {/* Support & Legal */}
      <View style={styles.sectionBlock}>
        <PartnerText style={styles.sectionHeader}>Support</PartnerText>
        <View style={styles.cardGroup}>
          <Pressable
            style={({ pressed }) => [styles.rowItem, getPressableFeedback(pressed)]}
            onPress={() => navigation.navigate('PartnerHelpSupport')}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFFBEB' }]}>
              <HelpCircle size={18} color="#D97706" strokeWidth={2.2} />
            </View>
            <View style={styles.textCol}>
              <PartnerText style={styles.rowTitle}>Help & Support</PartnerText>
              <PartnerText style={styles.rowDesc}>FAQs and contact support</PartnerText>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {/* About & Version */}
      <View style={styles.sectionBlock}>
        <PartnerText style={styles.sectionHeader}>About</PartnerText>
        <View style={styles.cardGroup}>
          <View style={styles.rowItem}>
            <View style={[styles.iconCircle, { backgroundColor: driverColors.light }]}>
              <Info size={18} color={driverColors.grey} strokeWidth={2.2} />
            </View>
            <View style={styles.textCol}>
              <PartnerText style={styles.rowTitle}>App Version</PartnerText>
              <PartnerText style={styles.rowDesc}>RACE Partner v1.0.0 (Production Build)</PartnerText>
            </View>
          </View>
        </View>
      </View>

      {/* Logout Row */}
      <View style={[styles.sectionBlock, { marginBottom: 30 }]}>
        <View style={styles.cardGroup}>
          <Pressable
            style={({ pressed }) => [styles.rowItem, getPressableFeedback(pressed)]}
            onPress={() => setLogoutVisible(true)}>
            <View style={[styles.iconCircle, { backgroundColor: driverColors.redPill }]}>
              <LogOut size={18} color={driverColors.red} strokeWidth={2.2} />
            </View>
            <View style={styles.textCol}>
              <PartnerText style={[styles.rowTitle, { color: driverColors.red }]}>Log out</PartnerText>
              <PartnerText style={styles.rowDesc}>Sign out from this device</PartnerText>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {/* Supporting Dialogs */}
      <PartnerLogoutDialog
        visible={logoutVisible}
        isLoading={loggingOut}
        onCancel={() => setLogoutVisible(false)}
        onConfirm={performLogout}
      />

      <PartnerLanguageSheet
        visible={langSheetVisible}
        selectedLanguage={selectedLang}
        onSelect={setSelectedLang}
        onClose={() => setLangSheetVisible(false)}
      />

      <PartnerLocationSheet
        visible={locationSheetVisible}
        onAllow={() => {
          setLocationSheetVisible(false);
          Alert.alert('Location Access', 'Location permissions granted.');
        }}
        onDeny={() => setLocationSheetVisible(false)}
      />

      <PartnerNotificationPreferencesModal
        visible={notifPrefsVisible}
        onClose={() => setNotifPrefsVisible(false)}
      />
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: driverColors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textCol: {
    flex: 1,
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
  divider: {
    height: 1,
    backgroundColor: driverColors.hairline,
    marginLeft: 68,
  },
});
