import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  AlertCircle,
  Bell,
  Building2,
  Car,
  Check,
  ChevronRight,
  Clock3,
  HelpCircle,
  Inbox,
  Info,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Truck,
  User,
  X,
} from 'lucide-react-native';
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
import { useNotificationsQuery } from '../../../services/useNotificationQueries';
import { openPartnerNotifications } from '../../../navigation/partnerNavigationRef';
import {
  driverColors as C,
  driverRadius as R,
  driverShadow,
  getPressableFeedback,
} from '../../../theme/driverUi';

export default function DriverMyVendorScreen() {
  const px = useScreenPx();
  const navigation = useNavigation<any>();

  const membership = useDriverVendorMembershipQuery();
  const vendor = membership.data?.vendor;

  // Invariant: Drivers with an active fleet connection never load or view invitations.
  const invitations = useDriverVendorInvitationsQuery(!vendor && !membership.data);
  const respond = useRespondToVendorInvitationMutation();

  const { data: driverJobs = [] } = useDriverJobsQuery(Boolean(vendor));
  const { data: notifData } = useNotificationsQuery();
  const unreadNotifs = notifData?.unreadCount ?? 0;

  const vendorJobs = driverJobs
    .filter(
      job =>
        job.vendorId === vendor?.id &&
        !['COMPLETED', 'RATED', 'PAID', 'CANCELLED'].includes(job.status),
    )
    .slice(0, 5);

  const address = [
    vendor?.address?.line1,
    vendor?.address?.line2,
    vendor?.address?.city,
    vendor?.address?.state,
  ]
    .filter(Boolean)
    .join(', ');

  const answer = (id: string, decision: 'accept' | 'decline') => {
    respond.mutate(
      { id, decision },
      {
        onError: error =>
          Alert.alert(
            'Could not update invitation',
            error instanceof Error ? error.message : 'Please try again.',
          ),
      },
    );
  };

  const handleOpenJob = (jobId: string, bookingType?: 'towing' | 'driver') => {
    navigation.navigate('PartnerJobs', {
      screen: 'PartnerActiveJob',
      params: { bookingId: jobId, bookingType: bookingType ?? 'towing' },
    });
  };

  return (
    <AppScreenLayout
      header={
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: px(16),
              paddingTop: px(12),
              paddingBottom: px(12),
            },
          ]}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextCol}>
              {vendor ? (
                <>
                  <View style={styles.fleetBadgeRow}>
                    <View style={styles.fleetTag}>
                      <ShieldCheck size={px(11)} color={C.green} />
                      <PartnerText style={styles.fleetTagText}>
                        CONNECTED FLEET
                      </PartnerText>
                    </View>
                  </View>
                  <PartnerText
                    numberOfLines={1}
                    style={[styles.headerTitle, { fontSize: px(18) }]}>
                    {vendor.name}
                  </PartnerText>
                  <PartnerText
                    numberOfLines={1}
                    style={[styles.headerSubtitle, { fontSize: px(12) }]}>
                    {vendor.ownerName
                      ? `Managed by ${vendor.ownerName}`
                      : 'Authorized Towing Partner'}
                  </PartnerText>
                </>
              ) : (
                <>
                  <PartnerText style={[styles.headerTitle, { fontSize: px(20) }]}>
                    My Vendor
                  </PartnerText>
                  <PartnerText style={[styles.headerSubtitle, { fontSize: px(12.5) }]}>
                    Fleet connection and invitations
                  </PartnerText>
                </>
              )}
            </View>

            {/* Notification Bell */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => openPartnerNotifications()}
              style={({ pressed }) => [
                styles.bellButton,
                {
                  width: px(38),
                  height: px(38),
                  borderRadius: px(19),
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <Bell size={px(18)} color={C.ink} />
              {unreadNotifs > 0 ? (
                <View
                  style={[
                    styles.notifBadge,
                    {
                      minWidth: px(16),
                      height: px(16),
                      borderRadius: px(8),
                      top: px(2),
                      right: px(2),
                    },
                  ]}>
                  <PartnerText style={[styles.notifBadgeText, { fontSize: px(9) }]}>
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </PartnerText>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
      }
      refreshing={membership.isRefetching || invitations.isRefetching}
      onRefresh={() => {
        void membership.refetch();
        if (!vendor) {
          void invitations.refetch();
        }
      }}
      contentStyle={{ paddingTop: px(12), paddingBottom: px(40) }}>
      {membership.isLoading ? (
        <View style={{ paddingVertical: px(36), alignItems: 'center' }}>
          <ActivityIndicator color={C.amber} size="large" />
          <PartnerText style={{ color: C.grey, fontSize: px(13), marginTop: px(10) }}>
            Loading vendor connection...
          </PartnerText>
        </View>
      ) : vendor ? (
        <>
          {/* Connected Vendor Card */}
          <View
            style={[
              styles.card,
              driverShadow,
              { borderRadius: px(R.card), padding: px(16), marginBottom: px(14) },
            ]}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.vendorIconCircle,
                  { width: px(48), height: px(48), borderRadius: px(14) },
                ]}>
                <Building2 size={px(24)} color={C.amberText} />
              </View>
              <View style={{ flex: 1 }}>
                <PartnerText style={[styles.vendorName, { fontSize: px(16) }]}>
                  {vendor.name}
                </PartnerText>
                <View style={styles.verifiedRow}>
                  <ShieldCheck size={px(13)} color={C.green} />
                  <PartnerText style={styles.verifiedText}>
                    Verified Towing Fleet
                  </PartnerText>
                </View>
              </View>
            </View>

            {vendor.ownerName ? (
              <View style={[styles.infoRow, { marginTop: px(12) }]}>
                <User size={px(14)} color={C.greySoft} />
                <PartnerText style={[styles.infoText, { fontSize: px(12.5) }]}>
                  Fleet Manager: {vendor.ownerName}
                </PartnerText>
              </View>
            ) : null}

            {address ? (
              <View style={[styles.infoRow, { marginTop: px(6) }]}>
                <MapPin size={px(14)} color={C.greySoft} />
                <PartnerText
                  numberOfLines={2}
                  style={[styles.infoText, { fontSize: px(12.5) }]}>
                  {address}
                </PartnerText>
              </View>
            ) : null}

            {/* Info Notice */}
            <View
              style={[
                styles.noticeBox,
                { marginTop: px(14), padding: px(12), borderRadius: px(R.innerCard) },
              ]}>
              <Info size={px(16)} color={C.blue} />
              <PartnerText style={[styles.noticeText, { fontSize: px(12) }]}>
                Assigned towing vehicles and emergency dispatch jobs come directly
                from this fleet partner.
              </PartnerText>
            </View>
          </View>

          {/* Vendor Assignments Section */}
          <View style={{ marginBottom: px(14) }}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Truck size={px(17)} color={C.amberText} />
                <PartnerText style={[styles.sectionTitle, { fontSize: px(15) }]}>
                  Vendor Assignments
                </PartnerText>
              </View>
              {vendorJobs.length > 0 ? (
                <View style={[styles.counterBadge, { borderRadius: px(R.pill) }]}>
                  <PartnerText style={[styles.counterText, { fontSize: px(11) }]}>
                    {vendorJobs.length} active
                  </PartnerText>
                </View>
              ) : null}
            </View>

            {vendorJobs.length ? (
              vendorJobs.map(job => {
                const isActionNeeded = job.status === 'DRIVER_ASSIGNED';
                return (
                  <Pressable
                    key={job.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open job #${job.bookingNumber}`}
                    onPress={() => handleOpenJob(job.id, job.bookingType)}
                    style={({ pressed }) => [
                      styles.assignmentCard,
                      driverShadow,
                      getPressableFeedback(pressed),
                      {
                        borderRadius: px(R.innerCard),
                        padding: px(13),
                        marginBottom: px(8),
                        borderColor: isActionNeeded ? '#FDE68A' : C.hairline,
                        backgroundColor: isActionNeeded ? '#FFFDF5' : C.card,
                      },
                    ]}>
                    <View style={styles.assignmentTopRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
                          <PartnerText
                            style={[
                              styles.assignmentNumber,
                              { fontSize: px(13.5) },
                            ]}>
                            #{job.bookingNumber}
                          </PartnerText>
                          {isActionNeeded ? (
                            <View
                              style={[
                                styles.actionNeededBadge,
                                {
                                  paddingHorizontal: px(6),
                                  paddingVertical: px(2),
                                  borderRadius: px(6),
                                },
                              ]}>
                              <PartnerText
                                style={[
                                  styles.actionNeededText,
                                  { fontSize: px(9.5) },
                                ]}>
                                ACTION NEEDED
                              </PartnerText>
                            </View>
                          ) : null}
                        </View>
                        <PartnerText
                          style={[styles.serviceLabel, { fontSize: px(11.5), marginTop: px(3) }]}>
                          {job.serviceLabel ??
                            (job.bookingType === 'towing' ? 'Towing service' : 'Driver hire')}
                        </PartnerText>
                        {job.assignedFleetVehicleLabel ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: px(4),
                              marginTop: px(4),
                            }}>
                            <Car size={px(12)} color={C.blue} />
                            <PartnerText
                              style={{
                                color: C.blue,
                                fontSize: px(11),
                                fontWeight: '700',
                              }}>
                              Vehicle: {job.assignedFleetVehicleLabel}
                            </PartnerText>
                          </View>
                        ) : null}
                      </View>

                      <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: px(4) }}>
                        <PartnerText
                          style={{
                            color: isActionNeeded ? '#B45309' : C.green,
                            fontSize: px(10.5),
                            fontWeight: '700',
                          }}>
                          {job.status.replace(/_/g, ' ')}
                        </PartnerText>
                        <ChevronRight size={px(15)} color={C.greySoft} />
                      </View>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View
                style={[
                  styles.emptyAssignmentsCard,
                  { borderRadius: px(R.innerCard), padding: px(16) },
                ]}>
                <Inbox size={px(28)} color={C.greySoft} />
                <PartnerText
                  style={[
                    styles.emptyTitle,
                    { fontSize: px(13.5), marginTop: px(8) },
                  ]}>
                  No active vendor assignments
                </PartnerText>
                <PartnerText
                  style={[
                    styles.emptyDesc,
                    { fontSize: px(11.5), marginTop: px(3) },
                  ]}>
                  When {vendor.name} assigns you a towing vehicle or job, it will
                  appear right here.
                </PartnerText>
              </View>
            )}
          </View>

          {/* Fleet Invariants & Rules Card */}
          <View
            style={[
              styles.card,
              driverShadow,
              { borderRadius: px(R.card), padding: px(15), marginBottom: px(20) },
            ]}>
            <PartnerText
              style={[
                styles.policyHeading,
                { fontSize: px(13.5), marginBottom: px(10) },
              ]}>
              Fleet Connection Rules
            </PartnerText>

            <View style={styles.policyRow}>
              <View style={[styles.policyIconCircle, { backgroundColor: C.greenTile }]}>
                <ShieldCheck size={px(16)} color={C.green} />
              </View>
              <View style={{ flex: 1 }}>
                <PartnerText style={[styles.policyTitle, { fontSize: px(12.5) }]}>
                  Single Fleet Exclusivity
                </PartnerText>
                <PartnerText style={[styles.policyDesc, { fontSize: px(11) }]}>
                  You are permanently connected to this fleet. Other vendors cannot
                  send you invitations while you are active.
                </PartnerText>
              </View>
            </View>

            <View style={[styles.policyDivider, { marginVertical: px(10) }]} />

            <View style={styles.policyRow}>
              <View style={[styles.policyIconCircle, { backgroundColor: '#FFF7ED' }]}>
                <AlertCircle size={px(16)} color={C.amberText} />
              </View>
              <View style={{ flex: 1 }}>
                <PartnerText style={[styles.policyTitle, { fontSize: px(12.5) }]}>
                  Fleet Removal Policy
                </PartnerText>
                <PartnerText style={[styles.policyDesc, { fontSize: px(11) }]}>
                  Driver connections are managed by the Towing Vendor. Only your
                  vendor can remove or release you from the fleet.
                </PartnerText>
              </View>
            </View>
          </View>
        </>
      ) : (
        /* Not Connected State */
        <>
          <View
            style={[
              styles.card,
              driverShadow,
              {
                borderRadius: px(R.card),
                padding: px(18),
                marginBottom: px(18),
                alignItems: 'center',
              },
            ]}>
            <View
              style={[
                styles.emptyIconCircle,
                {
                  width: px(54),
                  height: px(54),
                  borderRadius: px(27),
                  marginBottom: px(10),
                },
              ]}>
              <Building2 size={px(28)} color={C.amberText} />
            </View>
            <PartnerText style={[styles.noVendorTitle, { fontSize: px(16) }]}>
              Independent Driver
            </PartnerText>
            <PartnerText
              style={[
                styles.noVendorDesc,
                { fontSize: px(12.5), marginTop: px(4) },
              ]}>
              You are currently operating independently. You can take direct
              consumer driver bookings, or join a Towing Vendor fleet when invited.
            </PartnerText>
          </View>

          {/* Invitations Section (Only shown when driver is NOT in a fleet) */}
          {invitations.isLoading ? (
            <View style={{ paddingVertical: px(20), alignItems: 'center' }}>
              <ActivityIndicator color={C.amber} />
            </View>
          ) : invitations.data?.length ? (
            <View style={{ marginBottom: px(20) }}>
              <PartnerText
                style={[
                  styles.sectionTitle,
                  { fontSize: px(16), marginBottom: px(10) },
                ]}>
                Invitations ({invitations.data.length})
              </PartnerText>

              {invitations.data.map(invitation => (
                <View
                  key={invitation.id}
                  style={[
                    styles.card,
                    driverShadow,
                    {
                      borderRadius: px(R.card),
                      padding: px(15),
                      marginBottom: px(10),
                      borderWidth: 1.5,
                      borderColor: C.amberBorder,
                    },
                  ]}>
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.vendorIconCircle,
                        { width: px(44), height: px(44), borderRadius: px(13) },
                      ]}>
                      <Clock3 size={px(20)} color={C.amberText} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PartnerText
                        style={[styles.vendorName, { fontSize: px(15) }]}>
                        {invitation.vendor.name}
                      </PartnerText>
                      <PartnerText
                        style={[styles.infoText, { fontSize: px(12), marginTop: px(2) }]}>
                        {invitation.vendor.ownerName
                          ? `Contact: ${invitation.vendor.ownerName}`
                          : 'Towing Vendor fleet invitation'}
                      </PartnerText>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      gap: px(10),
                      marginTop: px(14),
                    }}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={respond.isPending}
                      onPress={() => answer(invitation.id, 'decline')}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        {
                          height: px(42),
                          borderRadius: px(R.button),
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}>
                      <X size={px(16)} color={C.grey} />
                      <PartnerText
                        style={[styles.buttonTextSecondary, { fontSize: px(13) }]}>
                        Decline
                      </PartnerText>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      disabled={respond.isPending}
                      onPress={() => answer(invitation.id, 'accept')}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        {
                          height: px(42),
                          borderRadius: px(R.button),
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}>
                      {respond.isPending ? (
                        <ActivityIndicator color={C.white} size="small" />
                      ) : (
                        <Check size={px(16)} color={C.white} />
                      )}
                      <PartnerText
                        style={[styles.buttonTextPrimary, { fontSize: px(13) }]}>
                        Accept & Join
                      </PartnerText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.emptyAssignmentsCard,
                { borderRadius: px(R.innerCard), padding: px(16) },
              ]}>
              <PartnerText
                style={[
                  styles.emptyDesc,
                  { fontSize: px(12), textAlign: 'center' },
                ]}>
                No pending vendor invitations. Towing vendors can send invitations
                using your verified mobile number.
              </PartnerText>
            </View>
          )}
        </>
      )}

      {invitations.isError || membership.isError ? (
        <PartnerText
          style={{
            color: C.red,
            fontSize: px(12),
            textAlign: 'center',
            marginTop: px(12),
          }}>
          Could not sync vendor fleet data. Pull down to retry.
        </PartnerText>
      ) : null}
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.hairline,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  fleetBadgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  fleetTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.greenPill,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: R.pill,
  },
  fleetTagText: {
    color: C.green,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerTitle: {
    color: C.ink,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: C.grey,
    marginTop: 2,
  },
  bellButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.light,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  notifBadge: {
    position: 'absolute',
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: C.white,
    fontWeight: '800',
  },
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vendorIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.amberTileSoft,
  },
  vendorName: {
    color: C.ink,
    fontWeight: '800',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  verifiedText: {
    color: C.green,
    fontWeight: '700',
    fontSize: 11.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: C.grey,
    flex: 1,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  noticeText: {
    color: '#1D4ED8',
    flex: 1,
    lineHeight: 17,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: C.ink,
    fontWeight: '800',
  },
  counterBadge: {
    backgroundColor: C.light,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  counterText: {
    color: C.grey,
    fontWeight: '700',
  },
  assignmentCard: {
    borderWidth: 1,
  },
  assignmentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignmentNumber: {
    color: C.ink,
    fontWeight: '800',
  },
  actionNeededBadge: {
    backgroundColor: '#FEF3C7',
  },
  actionNeededText: {
    color: '#B45309',
    fontWeight: '800',
  },
  serviceLabel: {
    color: C.grey,
  },
  emptyAssignmentsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.light,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  emptyTitle: {
    color: C.ink,
    fontWeight: '700',
  },
  emptyDesc: {
    color: C.grey,
    textAlign: 'center',
    lineHeight: 16,
  },
  policyHeading: {
    color: C.ink,
    fontWeight: '800',
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  policyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyTitle: {
    color: C.ink,
    fontWeight: '700',
  },
  policyDesc: {
    color: C.grey,
    marginTop: 2,
    lineHeight: 16,
  },
  policyDivider: {
    height: 1,
    backgroundColor: C.hairline,
  },
  emptyIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.amberTileSoft,
  },
  noVendorTitle: {
    color: C.ink,
    fontWeight: '800',
  },
  noVendorDesc: {
    color: C.grey,
    textAlign: 'center',
    lineHeight: 18,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.amber,
  },
  buttonTextSecondary: {
    color: C.ink,
    fontWeight: '700',
  },
  buttonTextPrimary: {
    color: C.white,
    fontWeight: '700',
  },
});
