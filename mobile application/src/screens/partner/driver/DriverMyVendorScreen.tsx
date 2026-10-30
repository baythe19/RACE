import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bell,
  Building2,
  Car,
  Check,
  ChevronRight,
  Clock3,
  Inbox,
  Info,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import AppScreenLayout from '../../../components/ui/AppScreenLayout';
import { usePartnerDialog } from '../../../hooks/usePartnerDialog';
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
import { UI_PREVIEW_MODE } from '../../../constants/preview';
import {
  getDriverVendorPreviewScenario,
  setDriverVendorPreviewScenario,
  subscribeDriverVendorPreview,
  type DriverVendorPreviewScenario,
} from '../../../services/vendor/driverVendorPreview';
import {
  driverColors as C,
  driverRadius as R,
  driverShadow,
  getPressableFeedback,
} from '../../../theme/driverUi';

function formatDay(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PREVIEW_SCENARIOS: { id: DriverVendorPreviewScenario; label: string }[] = [
  { id: 'request', label: 'Request' },
  { id: 'connected', label: 'Connected' },
  { id: 'assignment', label: 'New job' },
  { id: 'none', label: 'No vendor' },
];

export default function DriverMyVendorScreen() {
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();
  const px = useScreenPx();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [previewScenario, setPreviewScenario] = useState(getDriverVendorPreviewScenario());

  useEffect(() => subscribeDriverVendorPreview(() => {
    setPreviewScenario(getDriverVendorPreviewScenario());
  }), []);

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

  const vendorHistory = driverJobs
    .filter(
      job =>
        job.vendorId === vendor?.id &&
        ['COMPLETED', 'RATED', 'PAID'].includes(job.status),
    )
    .slice(0, 6);

  const address = [
    vendor?.address?.line1,
    vendor?.address?.line2,
    vendor?.address?.city,
    vendor?.address?.state,
  ]
    .filter(Boolean)
    .join(', ');

  const refreshVendorPreview = () => {
    void queryClient.invalidateQueries({ queryKey: ['driver'] });
  };

  const applyPreviewScenario = (next: DriverVendorPreviewScenario) => {
    if (next === 'none') {
      navigation.navigate('PartnerHome');
      setTimeout(() => {
        setDriverVendorPreviewScenario('none');
        refreshVendorPreview();
      }, 80);
      return;
    }
    setDriverVendorPreviewScenario(next);
    refreshVendorPreview();
  };

  const answer = (id: string, decision: 'accept' | 'decline') => {
    const pendingCount = invitations.data?.length ?? 0;
    respond.mutate(
      { id, decision },
      {
        onSuccess: () => {
          if (decision === 'decline' && pendingCount <= 1) {
            navigation.navigate('PartnerHome');
          }
        },
        onError: error =>
          showAlert({
            tone: 'error',
            title: 'Could not update invitation',
            message: error instanceof Error ? error.message : 'Please try again.',
          }),
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
    <View style={{ flex: 1 }}>
    <AppScreenLayout
      header={
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: px(12),
              paddingTop: px(10),
              paddingBottom: px(10),
            },
          ]}>
          <PartnerText style={[styles.headerTitle, { fontSize: px(20) }]}>
            My Vendor
          </PartnerText>
          <View style={styles.headerActions}>
            {vendor ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fleet connection rules"
                onPress={() => setRulesOpen(true)}
                style={({ pressed }) => [
                  styles.bellButton,
                  {
                    width: px(34),
                    height: px(34),
                    borderRadius: px(17),
                    marginRight: px(8),
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}>
                <Info size={px(17)} color={C.ink} />
              </Pressable>
            ) : null}

            {/* Notification Bell */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => openPartnerNotifications()}
              style={({ pressed }) => [
                styles.bellButton,
                {
                  width: px(34),
                  height: px(34),
                  borderRadius: px(17),
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <Bell size={px(17)} color={C.ink} />
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
      {UI_PREVIEW_MODE ? (
        <View style={{ marginBottom: px(12), gap: px(6) }}>
          <PartnerText
            style={{
              fontSize: px(10),
              fontWeight: '800',
              letterSpacing: 0.6,
              color: '#B45309',
            }}>
            UI TEST · SCENARIOS
          </PartnerText>
          <View style={[styles.previewRow, { gap: px(6) }]}>
            {PREVIEW_SCENARIOS.map(item => {
              const selected = previewScenario === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => applyPreviewScenario(item.id)}
                  style={[
                    styles.previewChip,
                    selected && styles.previewChipOn,
                    { paddingHorizontal: px(8), paddingVertical: px(5), borderRadius: px(8) },
                  ]}>
                  <PartnerText style={[styles.previewChipText, selected && styles.previewChipTextOn, { fontSize: px(11) }]}>
                    {item.label}
                  </PartnerText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {membership.isLoading ? (
        <View style={{ paddingVertical: px(36), alignItems: 'center' }}>
          <ActivityIndicator color={C.amber} size="large" />
          <PartnerText style={{ color: C.grey, fontSize: px(13), marginTop: px(10) }}>
            Loading vendor connection...
          </PartnerText>
        </View>
      ) : vendor ? (
        <>
          {/* Connected vendor identity — header stays consistent across tabs */}
          <View
            style={[
              styles.card,
              {
                borderRadius: px(14),
                padding: px(14),
                marginBottom: px(14),
              },
            ]}>
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
              style={[styles.vendorCardTitle, { fontSize: px(16), marginTop: px(6) }]}>
              {vendor.name}
            </PartnerText>
            <PartnerText
              numberOfLines={1}
              style={[styles.headerSubtitle, { fontSize: px(12.5) }]}>
              {vendor.ownerName
                ? `Managed by ${vendor.ownerName}`
                : 'Authorized Towing Partner'}
            </PartnerText>
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

          <View style={{ marginBottom: px(20) }}>
            <PartnerText style={[styles.sectionTitle, { fontSize: px(15), marginBottom: px(8) }]}>
              History
            </PartnerText>
            <View style={[styles.card, { borderRadius: px(R.innerCard), paddingHorizontal: px(12) }]}>
              {membership.data?.acceptedAt ? (
                <View style={[styles.historyRow, { paddingVertical: px(10) }]}>
                  <ShieldCheck size={px(15)} color={C.green} />
                  <View style={{ flex: 1 }}>
                    <PartnerText style={[styles.historyTitle, { fontSize: px(13) }]}>Joined this fleet</PartnerText>
                    <PartnerText style={[styles.historyMeta, { fontSize: px(11.5) }]}>
                      {formatDay(membership.data.acceptedAt)}
                    </PartnerText>
                  </View>
                </View>
              ) : null}
              {vendorHistory.length ? (
                vendorHistory.map(job => (
                  <View key={job.id} style={[styles.historyRow, { paddingVertical: px(10) }]}>
                    <Check size={px(15)} color={C.grey} />
                    <View style={{ flex: 1 }}>
                      <PartnerText style={[styles.historyTitle, { fontSize: px(13) }]}>
                        #{job.bookingNumber} · {job.serviceLabel ?? 'Towing'}
                      </PartnerText>
                      <PartnerText style={[styles.historyMeta, { fontSize: px(11.5) }]}>
                        Completed{job.createdAt ? ` · ${formatDay(job.createdAt)}` : ''}
                        {job.estimatedFare ? ` · ₹${job.estimatedFare}` : ''}
                      </PartnerText>
                    </View>
                  </View>
                ))
              ) : (
                <PartnerText style={[styles.historyMeta, { fontSize: px(12), paddingVertical: px(12) }]}>
                  Completed jobs from this vendor will show here.
                </PartnerText>
              )}
            </View>
          </View>
        </>
      ) : (
        /* Not Connected State */
        <>
          {invitations.data?.length ? null : (
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
              consumer driver bookings in customer vehicles, or be onboarded to a Towing Vendor fleet.
            </PartnerText>
          </View>
          )}

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
                Join this fleet
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
                          ? `Managed by ${invitation.vendor.ownerName}`
                          : 'Towing vendor'}
                        {invitation.invitedAt ? ` · ${formatDay(invitation.invitedAt)}` : ''}
                      </PartnerText>
                      <PartnerText style={[styles.historyMeta, { fontSize: px(11.5), marginTop: px(4) }]}>
                        Accept to take this vendor's tow jobs. One fleet at a time.
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
                No pending invitations. When onboarded into a towing fleet by a vendor,
                your connected depot, tow trucks, and assignments will appear here.
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

      <Modal visible={rulesOpen} transparent animationType="fade" onRequestClose={() => setRulesOpen(false)}>
        <Pressable style={styles.rulesBackdrop} onPress={() => setRulesOpen(false)}>
          <Pressable style={[styles.rulesSheet, { borderRadius: px(16), padding: px(16), shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 }]} onPress={event => event.stopPropagation()}>
            <View style={[styles.rulesHeader, { paddingBottom: px(10), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hairline }]}>
              <PartnerText style={[styles.policyHeading, { fontSize: px(16) }]}>Fleet rules</PartnerText>
              <Pressable hitSlop={10} onPress={() => setRulesOpen(false)}>
                <X size={px(18)} color={C.ink} />
              </Pressable>
            </View>
            {vendor?.ownerName ? (
              <PartnerText style={[styles.historyMeta, { fontSize: px(12.5), marginTop: px(8) }]}>
                Managed by {vendor.ownerName}
              </PartnerText>
            ) : null}
            {address ? (
              <PartnerText style={[styles.historyMeta, { fontSize: px(12.5), marginTop: px(4) }]}>
                {address}
              </PartnerText>
            ) : null}
            <View style={[styles.policyRow, { marginTop: px(14) }]}>
              <ShieldCheck size={px(16)} color={C.green} />
              <View style={{ flex: 1 }}>
                <PartnerText style={[styles.policyTitle, { fontSize: px(13) }]}>One fleet at a time</PartnerText>
                <PartnerText style={[styles.policyDesc, { fontSize: px(12) }]}>
                  While you are connected, other vendors cannot send you a fleet request.
                </PartnerText>
              </View>
            </View>
            <View style={[styles.policyRow, { marginTop: px(12) }]}>
              <AlertCircle size={px(16)} color={C.amberText} />
              <View style={{ flex: 1 }}>
                <PartnerText style={[styles.policyTitle, { fontSize: px(13) }]}>Vendor controls the connection</PartnerText>
                <PartnerText style={[styles.policyDesc, { fontSize: px(12) }]}>
                  Only this towing vendor can remove you from the fleet. Tow jobs they assign show up here.
                </PartnerText>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRulesOpen(false)}
              style={({ pressed }) => ({
                marginTop: px(16),
                height: px(44),
                borderRadius: px(12),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? '#E8EAEE' : '#F2F4F7',
              })}>
              <PartnerText style={{ color: C.ink, fontSize: px(14), fontWeight: '700' }}>OK</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreenLayout>
    {partnerDialog}
    </View>
  );
}

const styles = StyleSheet.create({
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewChip: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  previewChipOn: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  previewChipText: {
    color: C.grey,
    fontWeight: '600',
  },
  previewChipTextOn: {
    color: '#92400E',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.hairline,
  },
  historyTitle: {
    color: C.ink,
    fontWeight: '600',
  },
  historyMeta: {
    color: C.grey,
    marginTop: 2,
  },
  rulesBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  rulesSheet: {
    backgroundColor: C.white,
    width: '100%',
    maxWidth: 320,
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    backgroundColor: C.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.hairline,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerTitle: {
    color: C.ink,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  vendorCardTitle: {
    color: C.ink,
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '700',
  },
  actionNeededBadge: {
    backgroundColor: '#FEF3C7',
  },
  actionNeededText: {
    color: '#B45309',
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '700',
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
