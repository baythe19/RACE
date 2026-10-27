import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { PartnerText } from './PartnerText';

interface PartnerRegistrationStepCardProps {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  children: ReactNode;
}

export default function PartnerRegistrationStepCard({
  title,
  subtitle,
  Icon,
  children,
}: PartnerRegistrationStepCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Icon size={18} color="#F59E0B" strokeWidth={2.2} />
        </View>
        <View style={styles.headerCopy}>
          <PartnerText style={styles.title}>{title}</PartnerText>
          <PartnerText style={styles.subtitle}>{subtitle}</PartnerText>
        </View>
      </View>
      <View style={styles.divider} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    elevation: 0,
    shadowOpacity: 0,
  },
  header: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 1,
    color: '#6B7280',
    fontSize: 11,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
});
