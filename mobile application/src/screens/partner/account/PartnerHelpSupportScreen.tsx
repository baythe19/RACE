import { PartnerText, PartnerTextInput } from '../../../components/partner/PartnerText';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Search,
  Phone,
  MessageCircle,
  HelpCircle,
  FileText,
  DollarSign,
  Briefcase,
  AlertOctagon,
  ChevronRight,
  Headphones,
  ShieldCheck,
} from 'lucide-react-native';

import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import { usePartnerDialog } from '../../../hooks/usePartnerDialog';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerHelpSupport'>;

const TOPICS = [
  { id: '1', title: 'Getting started', subtitle: 'Learn how to use the app', icon: HelpCircle, color: '#0284C7', bg: '#F0F9FF' },
  { id: '2', title: 'Documents & Verification', subtitle: 'Document upload and approval', icon: FileText, color: '#D97706', bg: '#FFFBEB' },
  { id: '3', title: 'Earnings & Payouts', subtitle: 'Payment and bank related', icon: DollarSign, color: '#7C3AED', bg: '#F5F3FF' },
  { id: '4', title: 'Jobs & Trips', subtitle: 'Accepting and completing jobs', icon: Briefcase, color: '#DC2626', bg: '#FEF2F2' },
  { id: '5', title: 'App Issues', subtitle: 'Troubleshooting and support', icon: AlertOctagon, color: '#059669', bg: '#ECFDF5' },
];

export default function PartnerHelpSupportScreen({ navigation }: Props) {
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const [searchQuery, setSearchQuery] = useState('');

  const handleCall = () => {
    Linking.openURL('tel:+917205012345').catch(() => {
      showAlert({ tone: 'info', title: 'Customer Care', message: 'Toll-free partner support: +91 72050 12345' });
    });
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/917205012345').catch(() => {
      showAlert({ tone: 'info', title: 'WhatsApp Support', message: 'Partner help desk on WhatsApp: +91 72050 12345' });
    });
  };

  const filteredTopics = TOPICS.filter(
    t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subtitle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <View style={{ flex: 1 }}>
    <PartnerScreenLayout
      title="Help & Support"
      onBack={() => navigation.goBack()}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Search size={18} color={driverColors.grey} strokeWidth={2} />
        <PartnerTextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search for help..."
          placeholderTextColor={driverColors.greySoft}
        />
      </View>

      {/* Quick Contact Action Tiles */}
      <View style={styles.quickGrid}>
        <Pressable
          style={({ pressed }) => [
            styles.quickCard,
            getPressableFeedback(pressed),
          ]}
          onPress={handleCall}>
          <View style={[styles.quickIconCircle, { backgroundColor: '#FFFBEB' }]}>
            <Phone size={22} color={driverColors.amber} strokeWidth={2.4} />
          </View>
          <PartnerText style={styles.quickTitle}>Call Support</PartnerText>
          <PartnerText style={styles.quickSubtitle}>24x7 assistance</PartnerText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.quickCard,
            getPressableFeedback(pressed),
          ]}
          onPress={handleWhatsApp}>
          <View style={[styles.quickIconCircle, { backgroundColor: '#ECFDF5' }]}>
            <MessageCircle size={22} color={driverColors.green} strokeWidth={2.4} />
          </View>
          <PartnerText style={styles.quickTitle}>WhatsApp</PartnerText>
          <PartnerText style={styles.quickSubtitle}>Chat with us</PartnerText>
        </Pressable>
      </View>

      {/* Common Topics */}
      <PartnerText style={styles.sectionTitle}>Common Topics</PartnerText>
      <View style={styles.topicsCard}>
        {filteredTopics.map((topic, index) => {
          const IconComp = topic.icon;
          return (
            <React.Fragment key={topic.id}>
              <Pressable
                style={({ pressed }) => [
                  styles.topicRow,
                  getPressableFeedback(pressed),
                ]}
                onPress={() =>
                  showAlert({
                    tone: 'info',
                    title: topic.title,
                    message: `For ${topic.title.toLowerCase()} inquiries, our team is available 24/7 at +91 72050 12345.`,
                  })
                }>
                <View style={[styles.topicIconCircle, { backgroundColor: topic.bg }]}>
                  <IconComp size={18} color={topic.color} strokeWidth={2.2} />
                </View>

                <View style={styles.textCol}>
                  <PartnerText style={styles.topicTitle}>{topic.title}</PartnerText>
                  <PartnerText style={styles.topicSubtitle}>{topic.subtitle}</PartnerText>
                </View>

                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>
              {index < filteredTopics.length - 1 ? <View style={styles.divider} /> : null}
            </React.Fragment>
          );
        })}
      </View>

      {/* Bottom Help Banner */}
      <View style={styles.contactBanner}>
        <View style={styles.bannerIconCircle}>
          <Headphones size={24} color={driverColors.amber} strokeWidth={2.2} />
        </View>
        <PartnerText style={styles.bannerTitle}>Still need help?</PartnerText>
        <PartnerText style={styles.bannerSubtitle}>Contact our specialized partner support team</PartnerText>

        <Pressable
          style={({ pressed }) => [
            styles.contactButton,
            getPressableFeedback(pressed),
          ]}
          onPress={handleCall}>
          <PartnerText style={styles.contactButtonText}>Contact Us</PartnerText>
        </Pressable>
      </View>

      {/* Legal — Terms & Privacy Policy */}
      <Pressable
        onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}
        style={({ pressed }) => [styles.legalRow, pressed && { opacity: 0.7 }]}
        accessibilityRole="link"
        accessibilityLabel="Read Terms and Privacy Policy">
        <ShieldCheck size={16} color={driverColors.grey} strokeWidth={2.2} />
        <PartnerText style={styles.legalText}>Terms & Privacy Policy</PartnerText>
        <ChevronRight size={16} color={driverColors.greySoft} strokeWidth={2.2} />
      </Pressable>
    </PartnerScreenLayout>
    {partnerDialog}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.innerCard,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: driverColors.ink,
    padding: 0,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickCard: {
    flex: 1,
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  quickIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: driverColors.ink,
  },
  quickSubtitle: {
    fontSize: 12,
    color: driverColors.grey,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: driverColors.ink,
    marginBottom: 10,
    marginLeft: 4,
  },
  topicsCard: {
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    marginBottom: 20,
    overflow: 'hidden',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topicIconCircle: {
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
  topicTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.ink,
  },
  topicSubtitle: {
    fontSize: 12,
    color: driverColors.grey,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: driverColors.hairline,
    marginLeft: 68,
  },
  contactBanner: {
    backgroundColor: '#FFFDF5',
    borderRadius: driverRadius.card,
    borderWidth: 1,
    borderColor: '#FEEFC8',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  legalText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.ink,
  },
  bannerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: driverColors.amberTileSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: driverColors.ink,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: driverColors.grey,
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  contactButton: {
    width: '100%',
    height: 46,
    borderRadius: driverRadius.button,
    backgroundColor: driverColors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.white,
  },
});
