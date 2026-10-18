import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Clock3, Phone, UserRound, UserRoundPlus, X } from 'lucide-react-native';

import AppScreenLayout from '../../components/ui/AppScreenLayout';
import { PartnerText } from '../../components/partner/PartnerText';
import { useScreenPx } from '../../hooks/useScreenPx';
import {
  useInviteVendorDriverMutation,
  useRevokeVendorDriverMembershipMutation,
  useVendorMembershipsQuery,
} from '../../services/vendor/useVendorMembershipQueries';
import type { VendorMembership } from '../../services/vendor/vendorMembershipApi';

const AMBER = '#F9A602';
const INK = '#191919';
const MUTED = '#6B7280';

function MemberCard({
  member,
  busy,
  onRemove,
}: {
  member: VendorMembership;
  busy: boolean;
  onRemove: () => void;
}) {
  const px = useScreenPx();
  const pending = member.status === 'PENDING';
  return (
    <View style={[styles.card, { borderRadius: px(16), padding: px(14), marginBottom: px(10) }]}>
      <View style={styles.row}>
        <View style={[styles.avatar, { width: px(42), height: px(42), borderRadius: px(14) }]}>
          {pending ? <Clock3 size={px(20)} color={AMBER} /> : <UserRound size={px(20)} color={AMBER} />}
        </View>
        <View style={styles.grow}>
          <PartnerText style={[styles.name, { fontSize: px(15) }]}>
            {pending ? 'Invitation pending' : member.driver?.name ?? 'Driver'}
          </PartnerText>
          <PartnerText style={[styles.sub, { fontSize: px(12) }]}>
            {pending ? 'Waiting for the Driver to accept' : member.driver?.phone ?? 'Connected Driver'}
          </PartnerText>
          {!pending && member.driver?.driverType ? (
            <PartnerText style={[styles.sub, { fontSize: px(11), marginTop: px(3) }]}>
              {member.driver.driverType + (member.driver.city ? ' · ' + member.driver.city : '')}
            </PartnerText>
          ) : null}
        </View>
        <View style={[styles.statusPill, { backgroundColor: pending ? '#FFF4D6' : '#E9F8EF' }]}>
          <PartnerText style={{ color: pending ? '#9A6700' : '#13834C', fontSize: px(11), fontWeight: '700' }}>
            {pending ? 'Pending' : 'Active'}
          </PartnerText>
        </View>
      </View>
      {!pending ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onRemove}
          style={[styles.removeButton, { marginTop: px(12), paddingVertical: px(9), borderRadius: px(10) }]}>
          {busy ? <ActivityIndicator size="small" color="#B42318" /> : <X size={px(15)} color="#B42318" />}
          <PartnerText style={{ color: '#B42318', fontSize: px(12), fontWeight: '700' }}>Remove from fleet</PartnerText>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function VendorDriverMembershipsScreen() {
  const px = useScreenPx();
  const [phone, setPhone] = useState('');
  const { data: members = [], isLoading, isError, refetch, isRefetching } = useVendorMembershipsQuery();
  const invite = useInviteVendorDriverMutation();
  const revoke = useRevokeVendorDriverMembershipMutation();
  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ''), [phone]);

  const sendInvite = async () => {
    if (normalizedPhone.length < 10) {
      Alert.alert('Check the phone number', 'Enter the Driver’s verified mobile number.');
      return;
    }
    try {
      const result = await invite.mutateAsync('+91' + normalizedPhone.slice(-10));
      setPhone('');
      Alert.alert('Invitation sent', result.message);
    } catch (error) {
      Alert.alert('Could not send invitation', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const confirmRemove = (member: VendorMembership) => {
    Alert.alert(
      'Remove Driver?',
      'This ends ' + (member.driver?.name ?? 'this Driver') + '’s fleet connection.',
      [
        { text: 'Keep Driver', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => revoke.mutate(member.id, {
            onError: error => Alert.alert('Could not remove Driver', error instanceof Error ? error.message : 'Please try again.'),
          }),
        },
      ],
    );
  };

  return (
    <AppScreenLayout
      header={
        <View style={[styles.header, { paddingHorizontal: px(18), paddingTop: px(14), paddingBottom: px(12) }]}>
          <PartnerText style={[styles.title, { fontSize: px(22) }]}>Drivers</PartnerText>
          <PartnerText style={[styles.subtitle, { fontSize: px(13) }]}>
            Invite verified Drivers to your towing fleet.
          </PartnerText>
        </View>
      }
      refreshing={isRefetching}
      onRefresh={() => { void refetch(); }}
      contentStyle={{ paddingTop: px(8) }}>
      <View style={[styles.inviteCard, { borderRadius: px(18), padding: px(15), marginBottom: px(18) }]}>
        <View style={styles.row}>
          <View style={[styles.avatar, { width: px(38), height: px(38), borderRadius: px(13), backgroundColor: '#FFF7E5' }]}>
            <UserRoundPlus size={px(19)} color={AMBER} />
          </View>
          <View style={styles.grow}>
            <PartnerText style={{ color: INK, fontWeight: '700', fontSize: px(15) }}>Invite a Driver</PartnerText>
            <PartnerText style={{ color: MUTED, fontSize: px(12), marginTop: px(2) }}>The Driver must accept in their app.</PartnerText>
          </View>
        </View>
        <View style={[styles.phoneInputRow, { marginTop: px(13), borderRadius: px(12), height: px(48) }]}>
          <Phone size={px(17)} color={MUTED} />
          <PartnerText style={{ color: INK, fontSize: px(14), fontWeight: '600' }}>+91</PartnerText>
          <TextInput
            value={phone}
            onChangeText={value => setPhone(value.replace(/[^\d]/g, '').slice(-10))}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="Verified mobile number"
            placeholderTextColor="#9CA3AF"
            style={[styles.input, { fontSize: px(14) }]}
            accessibilityLabel="Driver verified mobile number"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={invite.isPending}
          onPress={() => { void sendInvite(); }}
          style={[styles.primaryButton, { marginTop: px(10), height: px(46), borderRadius: px(13), opacity: invite.isPending ? 0.65 : 1 }]}>
          {invite.isPending ? <ActivityIndicator color="#FFFFFF" /> : <UserRoundPlus size={px(17)} color="#FFFFFF" />}
          <PartnerText style={{ color: '#FFFFFF', fontSize: px(14), fontWeight: '700' }}>
            {invite.isPending ? 'Sending…' : 'Send invitation'}
          </PartnerText>
        </Pressable>
      </View>

      <PartnerText style={[styles.sectionTitle, { fontSize: px(17), marginBottom: px(10) }]}>
        Fleet Drivers · {members.filter(member => member.status === 'ACTIVE').length}
      </PartnerText>
      {isLoading ? (
        <View style={{ paddingVertical: px(25) }}><ActivityIndicator color={AMBER} /></View>
      ) : isError ? (
        <View style={[styles.empty, { padding: px(18), borderRadius: px(15) }]}>
          <PartnerText style={{ color: MUTED, textAlign: 'center', fontSize: px(13) }}>
            Driver list could not load. Pull down to retry.
          </PartnerText>
        </View>
      ) : members.length ? members.map(member => (
        <MemberCard
          key={member.id}
          member={member}
          busy={revoke.isPending}
          onRemove={() => confirmRemove(member)}
        />
      )) : (
        <View style={[styles.empty, { padding: px(20), borderRadius: px(15) }]}>
          <PartnerText style={{ color: INK, fontWeight: '700', fontSize: px(14) }}>
            No Drivers connected yet
          </PartnerText>
          <PartnerText style={{ color: MUTED, fontSize: px(12), textAlign: 'center', marginTop: px(5) }}>
            Send an invitation above. Drivers keep their own account and can accept or decline.
          </PartnerText>
        </View>
      )}
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8E8E8' },
  title: { color: INK, fontWeight: '800' },
  subtitle: { color: MUTED, marginTop: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7E5' },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  name: { color: INK, fontWeight: '700' },
  sub: { color: MUTED, marginTop: 3 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  removeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#F2C6C3', backgroundColor: '#FFF8F7' },
  inviteCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  phoneInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: '#F7F7F7', borderWidth: 1, borderColor: '#E9EAEC' },
  input: { flex: 1, color: INK, paddingVertical: 0 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: AMBER },
  sectionTitle: { color: INK, fontWeight: '800' },
  empty: { alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
});
