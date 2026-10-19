import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  Check,
  Clock3,
  Phone,
  Search,
  ShieldCheck,
  Star,
  UserCheck,
  UserRound,
  UserRoundPlus,
  X,
} from 'lucide-react-native';

import AppScreenLayout from '../../components/ui/AppScreenLayout';
import { PartnerText } from '../../components/partner/PartnerText';
import { useScreenPx } from '../../hooks/useScreenPx';
import {
  useInviteVendorDriverMutation,
  useRevokeVendorDriverMembershipMutation,
  useSearchVendorDriversQuery,
  useVendorMembershipsQuery,
} from '../../services/vendor/useVendorMembershipQueries';
import type { DriverSearchResult, VendorMembership } from '../../services/vendor/vendorMembershipApi';

const AMBER = '#F9A602';
const INK = '#191919';
const MUTED = '#6B7280';

function DriverSearchResultCard({
  driver,
  onInvite,
  inviting,
}: {
  driver: DriverSearchResult;
  onInvite: () => void;
  inviting: boolean;
}) {
  const px = useScreenPx();
  const isAvailableForInvite = driver.membershipStatus === 'AVAILABLE_FOR_INVITE';
  const isPending = driver.membershipStatus === 'INVITED_PENDING';
  const isAlreadyInFleet = driver.membershipStatus === 'ALREADY_IN_FLEET';

  return (
    <View style={[styles.card, { borderRadius: px(14), padding: px(13), marginBottom: px(10) }]}>
      <View style={styles.row}>
        <View style={[styles.avatar, { width: px(40), height: px(40), borderRadius: px(13) }]}>
          <UserRound size={px(20)} color={AMBER} />
        </View>

        <View style={styles.grow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
            <PartnerText style={[styles.name, { fontSize: px(14) }]}>{driver.name}</PartnerText>
            {driver.driverCode ? (
              <View style={[styles.codeBadge, { paddingHorizontal: px(6), paddingVertical: px(2), borderRadius: px(6) }]}>
                <PartnerText style={{ color: '#2563EB', fontSize: px(10), fontWeight: '700' }}>
                  {driver.driverCode}
                </PartnerText>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6), marginTop: px(2) }}>
            <PartnerText style={[styles.sub, { fontSize: px(11.5) }]}>{driver.maskedPhone || driver.phone}</PartnerText>
            {driver.rating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(2) }}>
                <Star size={px(11)} color="#F59E0B" fill="#F59E0B" />
                <PartnerText style={{ color: '#92400E', fontSize: px(11), fontWeight: '700' }}>
                  {driver.rating.toFixed(1)}
                </PartnerText>
              </View>
            ) : null}
          </View>

          <PartnerText style={[styles.sub, { fontSize: px(11), marginTop: px(3) }]}>
            {driver.driverType}
            {driver.city ? ` · ${driver.city}` : ''}
            {typeof driver.experienceYears === 'number' ? ` · ${driver.experienceYears}y exp` : ''}
          </PartnerText>
        </View>

        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
          {isAvailableForInvite ? (
            <Pressable
              accessibilityRole="button"
              disabled={inviting}
              onPress={onInvite}
              style={[
                styles.inviteActionBtn,
                {
                  paddingHorizontal: px(12),
                  paddingVertical: px(7),
                  borderRadius: px(10),
                  opacity: inviting ? 0.6 : 1,
                },
              ]}>
              {inviting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <UserRoundPlus size={px(14)} color="#FFFFFF" />
                  <PartnerText style={{ color: '#FFFFFF', fontSize: px(12), fontWeight: '700', marginLeft: px(4) }}>
                    Invite
                  </PartnerText>
                </>
              )}
            </Pressable>
          ) : isPending ? (
            <View style={[styles.statusPill, { backgroundColor: '#FFF4D6', paddingHorizontal: px(8), paddingVertical: px(4), borderRadius: px(8) }]}>
              <PartnerText style={{ color: '#9A6700', fontSize: px(11), fontWeight: '700' }}>Pending</PartnerText>
            </View>
          ) : isAlreadyInFleet ? (
            <View style={[styles.statusPill, { backgroundColor: '#E9F8EF', paddingHorizontal: px(8), paddingVertical: px(4), borderRadius: px(8) }]}>
              <PartnerText style={{ color: '#13834C', fontSize: px(11), fontWeight: '700' }}>In Fleet</PartnerText>
            </View>
          ) : (
            <View style={[styles.statusPill, { backgroundColor: '#F3F4F6', paddingHorizontal: px(8), paddingVertical: px(4), borderRadius: px(8) }]}>
              <PartnerText style={{ color: '#6B7280', fontSize: px(11), fontWeight: '600' }}>Other Fleet</PartnerText>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

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
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onRemove}
        style={[styles.removeButton, { marginTop: px(12), paddingVertical: px(9), borderRadius: px(10) }]}>
        {busy ? <ActivityIndicator size="small" color="#B42318" /> : <X size={px(15)} color="#B42318" />}
        <PartnerText style={{ color: '#B42318', fontSize: px(12), fontWeight: '700' }}>
          {pending ? 'Cancel invitation' : 'Remove from fleet'}
        </PartnerText>
      </Pressable>
    </View>
  );
}

export default function VendorDriverMembershipsScreen() {
  const px = useScreenPx();
  const [searchQuery, setSearchQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [showManualPhone, setShowManualPhone] = useState(false);

  const { data: members = [], isLoading, isError, refetch, isRefetching } = useVendorMembershipsQuery();
  const { data: searchResults = [], isLoading: searchLoading } = useSearchVendorDriversQuery(searchQuery);
  const invite = useInviteVendorDriverMutation();
  const revoke = useRevokeVendorDriverMembershipMutation();

  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ''), [phone]);

  const sendDirectInvite = async (targetPhone: string) => {
    const raw = targetPhone.replace(/\D/g, '');
    if (raw.length < 10) {
      Alert.alert('Check the phone number', 'Enter the Driver’s verified 10-digit mobile number.');
      return;
    }
    try {
      const result = await invite.mutateAsync('+91' + raw.slice(-10));
      setPhone('');
      Alert.alert('Invitation sent', result.message);
    } catch (error) {
      Alert.alert('Could not send invitation', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const confirmRemove = (member: VendorMembership) => {
    const isPending = member.status === 'PENDING';
    Alert.alert(
      isPending ? 'Cancel Invitation?' : 'Remove Driver?',
      isPending
        ? 'Withdraw the pending fleet invitation sent to this Driver?'
        : 'This ends ' + (member.driver?.name ?? 'this Driver') + '’s fleet connection.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: isPending ? 'Cancel Invite' : 'Remove',
          style: 'destructive',
          onPress: () =>
            revoke.mutate(member.id, {
              onError: error =>
                Alert.alert(
                  isPending ? 'Could not cancel invitation' : 'Could not remove Driver',
                  error instanceof Error ? error.message : 'Please try again.',
                ),
            }),
        },
      ],
    );
  };

  const activeMembers = members.filter(m => m.status === 'ACTIVE');
  const pendingMembers = members.filter(m => m.status === 'PENDING');

  return (
    <AppScreenLayout
      header={
        <View style={[styles.header, { paddingHorizontal: px(18), paddingTop: px(14), paddingBottom: px(12) }]}>
          <PartnerText style={[styles.title, { fontSize: px(22) }]}>Drivers</PartnerText>
          <PartnerText style={[styles.subtitle, { fontSize: px(13) }]}>
            Search & invite verified Full-Time drivers to your fleet.
          </PartnerText>
        </View>
      }
      refreshing={isRefetching}
      onRefresh={() => {
        void refetch();
      }}
      contentStyle={{ paddingTop: px(8) }}>
      {/* Search Full-Time Drivers */}
      <View style={[styles.searchCard, { borderRadius: px(18), padding: px(15), marginBottom: px(16) }]}>
        <View style={styles.row}>
          <View style={[styles.avatar, { width: px(38), height: px(38), borderRadius: px(13), backgroundColor: '#EFF6FF' }]}>
            <Search size={px(19)} color="#2563EB" />
          </View>
          <View style={styles.grow}>
            <PartnerText style={{ color: INK, fontWeight: '700', fontSize: px(15) }}>Search Full-Time Drivers</PartnerText>
            <PartnerText style={{ color: MUTED, fontSize: px(11.5), marginTop: px(2) }}>
              Search registered drivers by name, phone, or code.
            </PartnerText>
          </View>
        </View>

        <View style={[styles.searchInputRow, { marginTop: px(12), borderRadius: px(12), height: px(46) }]}>
          <Search size={px(17)} color={MUTED} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by Name, Mobile, or Code (e.g. RC-DR-1042)"
            placeholderTextColor="#9CA3AF"
            style={[styles.input, { fontSize: px(13.5) }]}
            accessibilityLabel="Search full time drivers"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={px(16)} color={MUTED} />
            </Pressable>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(8), gap: px(5) }}>
          <ShieldCheck size={px(13)} color="#059669" />
          <PartnerText style={{ color: '#059669', fontSize: px(11), fontWeight: '600' }}>
            Only verified Full-Time drivers can join vendor fleets
          </PartnerText>
        </View>

        {/* Live Search Results */}
        {searchQuery.trim().length >= 2 ? (
          <View style={{ marginTop: px(12), borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: px(10) }}>
            <PartnerText style={{ color: MUTED, fontSize: px(12), fontWeight: '700', marginBottom: px(8) }}>
              Search Results
            </PartnerText>
            {searchLoading ? (
              <View style={{ paddingVertical: px(14) }}>
                <ActivityIndicator color={AMBER} />
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map(result => (
                <DriverSearchResultCard
                  key={result.id}
                  driver={result}
                  inviting={invite.isPending}
                  onInvite={() => void sendDirectInvite(result.rawPhone)}
                />
              ))
            ) : (
              <View style={[styles.emptySearch, { padding: px(14), borderRadius: px(12) }]}>
                <PartnerText style={{ color: INK, fontSize: px(13), fontWeight: '700', textAlign: 'center' }}>
                  No Full-Time drivers found
                </PartnerText>
                <PartnerText style={{ color: MUTED, fontSize: px(11.5), textAlign: 'center', marginTop: px(3) }}>
                  Make sure the driver has registered with role "Full-Time" and completed verification.
                </PartnerText>
              </View>
            )}
          </View>
        ) : null}
      </View>

      {/* Manual Invite by Phone Collapsible */}
      <View style={[styles.inviteCard, { borderRadius: px(16), padding: px(14), marginBottom: px(18) }]}>
        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          onPress={() => setShowManualPhone(prev => !prev)}>
          <View style={styles.row}>
            <View style={[styles.avatar, { width: px(34), height: px(34), borderRadius: px(11), backgroundColor: '#FFF7E5' }]}>
              <UserRoundPlus size={px(17)} color={AMBER} />
            </View>
            <View>
              <PartnerText style={{ color: INK, fontWeight: '700', fontSize: px(13.5) }}>
                Invite by Verified Phone Number
              </PartnerText>
              <PartnerText style={{ color: MUTED, fontSize: px(11.5) }}>
                Directly enter the driver's registered 10-digit number
              </PartnerText>
            </View>
          </View>
          <PartnerText style={{ color: '#2563EB', fontSize: px(12), fontWeight: '700' }}>
            {showManualPhone ? 'Hide' : 'Enter phone'}
          </PartnerText>
        </Pressable>

        {showManualPhone ? (
          <View style={{ marginTop: px(12) }}>
            <View style={[styles.phoneInputRow, { borderRadius: px(12), height: px(46) }]}>
              <Phone size={px(16)} color={MUTED} />
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
              disabled={invite.isPending || normalizedPhone.length < 10}
              onPress={() => {
                void sendDirectInvite(phone);
              }}
              style={[
                styles.primaryButton,
                {
                  marginTop: px(10),
                  height: px(44),
                  borderRadius: px(12),
                  opacity: invite.isPending || normalizedPhone.length < 10 ? 0.6 : 1,
                },
              ]}>
              {invite.isPending ? <ActivityIndicator color="#FFFFFF" /> : <UserRoundPlus size={px(16)} color="#FFFFFF" />}
              <PartnerText style={{ color: '#FFFFFF', fontSize: px(13.5), fontWeight: '700', marginLeft: px(6) }}>
                {invite.isPending ? 'Sending…' : 'Send invitation'}
              </PartnerText>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Pending Invitations Section */}
      {pendingMembers.length > 0 ? (
        <View style={{ marginBottom: px(16) }}>
          <PartnerText style={[styles.sectionTitle, { fontSize: px(16), marginBottom: px(8) }]}>
            Pending Invitations · {pendingMembers.length}
          </PartnerText>
          {pendingMembers.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              busy={revoke.isPending}
              onRemove={() => confirmRemove(member)}
            />
          ))}
        </View>
      ) : null}

      {/* Active Fleet Drivers Section */}
      <PartnerText style={[styles.sectionTitle, { fontSize: px(16), marginBottom: px(10) }]}>
        Connected Fleet Drivers · {activeMembers.length}
      </PartnerText>
      {isLoading ? (
        <View style={{ paddingVertical: px(25) }}>
          <ActivityIndicator color={AMBER} />
        </View>
      ) : isError ? (
        <View style={[styles.empty, { padding: px(18), borderRadius: px(15) }]}>
          <PartnerText style={{ color: MUTED, textAlign: 'center', fontSize: px(13) }}>
            Driver list could not load. Pull down to retry.
          </PartnerText>
        </View>
      ) : activeMembers.length ? (
        activeMembers.map(member => (
          <MemberCard
            key={member.id}
            member={member}
            busy={revoke.isPending}
            onRemove={() => confirmRemove(member)}
          />
        ))
      ) : (
        <View style={[styles.empty, { padding: px(20), borderRadius: px(15) }]}>
          <PartnerText style={{ color: INK, fontWeight: '700', fontSize: px(14) }}>
            No Drivers connected yet
          </PartnerText>
          <PartnerText style={{ color: MUTED, fontSize: px(12), textAlign: 'center', marginTop: px(5) }}>
            Search for your registered full-time drivers above or enter their phone number to invite them to your fleet.
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
  sub: { color: MUTED, marginTop: 1 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  codeBadge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  inviteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#F2C6C3',
    backgroundColor: '#FFF8F7',
  },
  searchCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inviteCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E9EAEC',
  },
  input: { flex: 1, color: INK, paddingVertical: 0 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AMBER,
  },
  sectionTitle: { color: INK, fontWeight: '800' },
  empty: { alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  emptySearch: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
});
