import React from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Building2, Check, ChevronRight, Clock3, MapPin, ShieldCheck, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import AppScreenLayout from '../../../components/ui/AppScreenLayout';
import { PartnerText } from '../../../components/partner/PartnerText';
import { useScreenPx } from '../../../hooks/useScreenPx';
import { useDriverJobsQuery } from '../../../services/driver/useDriverQueries';
import {
  useDriverVendorInvitationsQuery,
  useDriverVendorMembershipQuery,
  useRespondToVendorInvitationMutation,
} from '../../../services/vendor/useVendorMembershipQueries';

const AMBER = '#F9A602';
const INK = '#191919';
const MUTED = '#6B7280';

export default function DriverMyVendorScreen() {
  const px = useScreenPx();
  const navigation = useNavigation<any>();
  const membership = useDriverVendorMembershipQuery();
  const invitations = useDriverVendorInvitationsQuery(!membership.data);
  const respond = useRespondToVendorInvitationMutation();
  const vendor = membership.data?.vendor;
  const { data: driverJobs = [] } = useDriverJobsQuery(Boolean(vendor));
  const vendorJobs = driverJobs
    .filter(job => job.vendorId === vendor?.id && !['COMPLETED', 'RATED', 'PAID', 'CANCELLED'].includes(job.status))
    .slice(0, 5);
  const address = [vendor?.address?.line1, vendor?.address?.line2, vendor?.address?.city, vendor?.address?.state]
    .filter(Boolean).join(', ');

  const answer = (id: string, decision: 'accept' | 'decline') => {
    respond.mutate({ id, decision }, {
      onError: error => Alert.alert('Could not update invitation', error instanceof Error ? error.message : 'Please try again.'),
    });
  };

  return (
    <AppScreenLayout
      header={
        <View style={[styles.header, { paddingHorizontal: px(18), paddingTop: px(14), paddingBottom: px(12) }]}>
          <PartnerText style={[styles.title, { fontSize: px(22) }]}>My Vendor</PartnerText>
          <PartnerText style={[styles.subtitle, { fontSize: px(13) }]}>Your fleet connection and invitations.</PartnerText>
        </View>
      }
      refreshing={membership.isRefetching || invitations.isRefetching}
      onRefresh={() => { void membership.refetch(); void invitations.refetch(); }}
      contentStyle={{ paddingTop: px(14) }}>
      {membership.isLoading ? (
        <View style={{ paddingVertical: px(28) }}><ActivityIndicator color={AMBER} /></View>
      ) : vendor ? (
        <View style={[styles.card, { borderRadius: px(18), padding: px(17), marginBottom: px(22) }]}>
          <View style={styles.row}>
            <View style={[styles.icon, { width: px(46), height: px(46), borderRadius: px(15) }]}>
              <Building2 size={px(23)} color={AMBER} />
            </View>
            <View style={{ flex: 1 }}>
              <PartnerText style={{ color: INK, fontWeight: '800', fontSize: px(16) }}>{vendor.name}</PartnerText>
              <View style={[styles.activeBadge, { marginTop: px(5) }]}>
                <Check size={px(12)} color="#13834C" />
                <PartnerText style={{ color: '#13834C', fontWeight: '700', fontSize: px(11) }}>Connected</PartnerText>
              </View>
            </View>
          </View>
          {vendor.ownerName ? (
            <PartnerText style={{ color: MUTED, fontSize: px(13), marginTop: px(13) }}>Contact: {vendor.ownerName}</PartnerText>
          ) : null}
          {address ? (
            <View style={[styles.row, { marginTop: px(9), alignItems: 'flex-start' }]}>
              <MapPin size={px(15)} color={MUTED} />
              <PartnerText style={{ color: MUTED, fontSize: px(12), flex: 1 }}>{address}</PartnerText>
            </View>
          ) : null}
          <View style={[styles.note, { marginTop: px(15), padding: px(12), borderRadius: px(12) }]}>
            <ShieldCheck size={px(17)} color="#2563EB" />
            <PartnerText style={{ color: '#1D4ED8', fontSize: px(12), flex: 1 }}>
              Vendor-assigned work and the towing vehicle for each job are shown below.
            </PartnerText>
          </View>
          <PartnerText style={{ color: INK, fontWeight: '800', fontSize: px(15), marginTop: px(17), marginBottom: px(8) }}>
            Vendor assignments
          </PartnerText>
          {vendorJobs.length ? vendorJobs.map(job => (
            <Pressable
              key={job.id}
              accessibilityRole="button"
              accessibilityLabel={`Open job #${job.bookingNumber}`}
              onPress={() => {
                navigation.navigate('PartnerJobs', {
                  screen: 'PartnerActiveJob',
                  params: { bookingId: job.id, bookingType: job.bookingType },
                });
              }}
              style={({ pressed }) => [
                styles.assignmentCard,
                {
                  borderRadius: px(12),
                  padding: px(12),
                  marginBottom: px(8),
                  opacity: pressed ? 0.85 : 1,
                  borderWidth: 1,
                  borderColor: job.status === 'DRIVER_ASSIGNED' ? '#FDE68A' : '#EEEEEE',
                  backgroundColor: job.status === 'DRIVER_ASSIGNED' ? '#FFFBEB' : '#FAFAFA',
                },
              ]}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
                    <PartnerText style={{ color: INK, fontSize: px(13), fontWeight: '800' }}>
                      #{job.bookingNumber}
                    </PartnerText>
                    {job.status === 'DRIVER_ASSIGNED' ? (
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: px(6), paddingVertical: px(2), borderRadius: px(6) }}>
                        <PartnerText style={{ color: '#B45309', fontSize: px(9.5), fontWeight: '800' }}>ACTION NEEDED</PartnerText>
                      </View>
                    ) : null}
                  </View>
                  <PartnerText style={{ color: MUTED, fontSize: px(11), marginTop: px(3) }}>
                    {job.serviceLabel ?? (job.bookingType === 'towing' ? 'Towing' : 'Driver hire')}
                  </PartnerText>
                  {job.assignedFleetVehicleLabel ? (
                    <PartnerText style={{ color: '#2563EB', fontSize: px(11), fontWeight: '600', marginTop: px(3) }}>
                      Vehicle: {job.assignedFleetVehicleLabel}
                    </PartnerText>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: px(4) }}>
                  <PartnerText style={{ color: job.status === 'DRIVER_ASSIGNED' ? '#B45309' : '#059669', fontSize: px(10), fontWeight: '700' }}>
                    {job.status.replace(/_/g, ' ')}
                  </PartnerText>
                  <ChevronRight size={px(14)} color={MUTED} />
                </View>
              </View>
            </Pressable>
          )) : (
            <PartnerText style={{ color: MUTED, fontSize: px(12) }}>
              No active vendor assignments.
            </PartnerText>
          )}
        </View>
      ) : (
        <View style={[styles.empty, { borderRadius: px(17), padding: px(20), marginBottom: px(22) }]}>
          <Building2 size={px(25)} color={AMBER} />
          <PartnerText style={{ color: INK, fontWeight: '800', fontSize: px(15), marginTop: px(10) }}>
            No active vendor connection
          </PartnerText>
          <PartnerText style={{ color: MUTED, textAlign: 'center', fontSize: px(12), marginTop: px(5) }}>
            A Towing Vendor can invite you using your verified mobile number. You choose whether to join.
          </PartnerText>
        </View>
      )}

      {invitations.isLoading && !vendor ? (
        <View style={{ paddingVertical: px(20) }}><ActivityIndicator color={AMBER} /></View>
      ) : invitations.data?.length ? (
        <>
          <PartnerText style={[styles.sectionTitle, { fontSize: px(17), marginBottom: px(10) }]}>Invitations</PartnerText>
          {invitations.data.map(invitation => (
            <View key={invitation.id} style={[styles.card, { borderRadius: px(16), padding: px(15), marginBottom: px(10) }]}>
              <View style={styles.row}>
                <View style={[styles.icon, { width: px(40), height: px(40), borderRadius: px(13) }]}>
                  <Clock3 size={px(19)} color={AMBER} />
                </View>
                <View style={{ flex: 1 }}>
                  <PartnerText style={{ color: INK, fontWeight: '800', fontSize: px(14) }}>{invitation.vendor.name}</PartnerText>
                  <PartnerText style={{ color: MUTED, fontSize: px(12), marginTop: px(3) }}>
                    {invitation.vendor.ownerName ? 'Contact: ' + invitation.vendor.ownerName : 'Towing Vendor invitation'}
                  </PartnerText>
                </View>
              </View>
              <View style={[styles.row, { marginTop: px(13) }]}>
                <Pressable
                  accessibilityRole="button"
                  disabled={respond.isPending}
                  onPress={() => answer(invitation.id, 'decline')}
                  style={[styles.secondaryButton, { height: px(42), borderRadius: px(11) }]}>
                  <X size={px(16)} color={MUTED} />
                  <PartnerText style={{ color: INK, fontWeight: '700', fontSize: px(13) }}>Decline</PartnerText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={respond.isPending}
                  onPress={() => answer(invitation.id, 'accept')}
                  style={[styles.primaryButton, { height: px(42), borderRadius: px(11) }]}>
                  {respond.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Check size={px(16)} color="#FFFFFF" />}
                  <PartnerText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: px(13) }}>Accept</PartnerText>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : null}
      {invitations.isError || membership.isError ? (
        <PartnerText style={{ color: '#B42318', fontSize: px(12), textAlign: 'center', marginTop: px(10) }}>
          Some vendor information could not load. Pull down to retry.
        </PartnerText>
      ) : null}
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8E8E8' },
  title: { color: INK, fontWeight: '800' },
  subtitle: { color: MUTED, marginTop: 3 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  icon: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7E5' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, backgroundColor: '#E9F8EF', borderRadius: 30, paddingHorizontal: 8, paddingVertical: 4 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF5FF' },
  assignmentCard: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#EEEEEE' },
  empty: { alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  sectionTitle: { color: INK, fontWeight: '800' },
  secondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  primaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: AMBER },
});
