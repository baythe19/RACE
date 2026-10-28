import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft, Phone, Radio } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import AppScreenLayout from '../../components/ui/AppScreenLayout';
import LiveTripMap from '../../components/booking/LiveTripMap';
import { PartnerText } from '../../components/partner/PartnerText';
import { useScreenPx } from '../../hooks/useScreenPx';
import { useVendorBookingTrackingQuery } from '../../services/vendor/useVendorBookingsQueries';
import type { PartnerJobsStackParamList } from '../../types/partnerNavigation';
import { legForJobStatus, legTitle } from '../../services/driver/tripNavigation';
import { formatReadableAddress } from '../../utils/readableAddress';

type Props = NativeStackScreenProps<PartnerJobsStackParamList, 'PartnerActiveJob'>;
const AMBER = '#F9A602';
const INK = '#191919';
const MUTED = '#6B7280';

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function shortStatus(status: string) {
  if (status === 'DRIVER_EN_ROUTE') return 'En route';
  if (status === 'DRIVER_ARRIVED') return 'At pickup';
  if (status === 'IN_PROGRESS') return 'On trip';
  if (status === 'DRIVER_ASSIGNED') return 'Assigned';
  // P-05: pre-assignment jobs are meaningful states, not lowercase noise.
  if (status === 'CONFIRMED') return 'Awaiting driver';
  if (status === 'PENDING') return 'Awaiting assignment';
  return status.replace(/_/g, ' ').toLowerCase();
}

export default function VendorBookingTrackingScreen({ route, navigation }: Props) {
  const px = useScreenPx();
  const now = useNow();
  const bookingId = route.params?.bookingId ?? '';
  const bookingType = route.params?.bookingType ?? 'towing';
  const { data, isLoading, isError, refetch } = useVendorBookingTrackingQuery(bookingId, bookingType);

  const driverLocation =
    data?.isLocationFresh && data.driverLocation
      ? {
          latitude: data.driverLocation.latitude,
          longitude: data.driverLocation.longitude,
          label: 'Driver',
        }
      : null;
  const pickup =
    data?.pickup && typeof data.pickup.latitude === 'number' && typeof data.pickup.longitude === 'number'
      ? { latitude: data.pickup.latitude, longitude: data.pickup.longitude, label: 'Pickup' }
      : null;
  const dropoff =
    data?.dropoff && typeof data.dropoff.latitude === 'number' && typeof data.dropoff.longitude === 'number'
      ? { latitude: data.dropoff.latitude, longitude: data.dropoff.longitude, label: 'Drop-off' }
      : null;
  const leg = data ? legForJobStatus(data.status) : 'idle';
  const destination = leg === 'to_drop' ? dropoff : leg === 'to_pickup' ? pickup : dropoff ?? pickup;

  const locationAgeSec =
    data?.driverLocation?.updatedAt
      ? Math.max(0, Math.round((now - new Date(data.driverLocation.updatedAt).getTime()) / 1000))
      : null;
  const locationStale = locationAgeSec != null && locationAgeSec > 45;

  const latestHistory = data?.statusHistory?.length
    ? data.statusHistory[data.statusHistory.length - 1]
    : null;

  return (
    <AppScreenLayout
      header={
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: px(16),
              paddingTop: px(12),
              paddingBottom: px(10),
              flexDirection: 'row',
              alignItems: 'center',
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={{ marginRight: px(10), padding: px(4) }}>
            <ArrowLeft size={px(22)} color={INK} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <PartnerText style={{ color: INK, fontSize: px(17), fontWeight: '800' }}>Live map</PartnerText>
            <PartnerText style={{ color: MUTED, fontSize: px(11.5), marginTop: px(1) }}>
              {data ? `#${data.bookingNumber} · view only` : 'Fleet job'}
            </PartnerText>
          </View>
        </View>
      }
      refreshing={false}
      onRefresh={() => {
        void refetch();
      }}
      contentStyle={{ paddingTop: px(8), paddingHorizontal: px(14) }}>
      {isLoading ? (
        <View style={{ paddingVertical: px(40) }}>
          <ActivityIndicator color={AMBER} />
        </View>
      ) : isError || !data ? (
        <View style={[styles.card, { borderRadius: px(14), padding: px(18) }]}>
          <PartnerText style={{ color: MUTED, textAlign: 'center', fontSize: px(13) }}>
            Tracking could not load. Pull down to retry.
          </PartnerText>
        </View>
      ) : (
        <>
          <View style={[styles.mapShell, { height: px(360), borderRadius: px(18), marginBottom: px(12) }]}>
            <LiveTripMap
              pickup={pickup}
              dropoff={dropoff}
              driverLocation={driverLocation}
              activeDestination={destination}
              showsUserLocation={false}
              routeApiEnabled
              straightFallback
              style={StyleSheet.absoluteFill}
              borderRadius={px(18)}
            />
            <View style={[styles.mapOverlay, { top: px(10), left: px(10), right: px(10) }]}>
              <View style={[styles.livePill, { paddingHorizontal: px(10), paddingVertical: px(6), borderRadius: px(20) }]}>
                <Radio size={px(12)} color="#DC2626" strokeWidth={2.8} />
                <PartnerText style={{ color: INK, fontSize: px(11.5), fontWeight: '700', marginLeft: px(5) }}>
                  {shortStatus(data.status)}
                  {leg !== 'idle' ? ` · ${legTitle(leg)}` : ''}
                </PartnerText>
              </View>
            </View>
            <View style={[styles.mapOverlay, { bottom: px(10), left: px(10), right: px(10) }]}>
              <PartnerText
                style={{
                  color: data.isLocationFresh && !locationStale ? '#166534' : '#92400E',
                  fontSize: px(11),
                  fontWeight: '600',
                  backgroundColor: 'rgba(255,255,255,0.92)',
                  paddingHorizontal: px(10),
                  paddingVertical: px(6),
                  borderRadius: px(10),
                  alignSelf: 'flex-start',
                }}>
                {data.isLocationFresh && locationAgeSec != null
                  ? locationStale
                    ? `Location ${locationAgeSec}s old — refreshing…`
                    : `Updated ${locationAgeSec}s ago`
                  : 'Waiting for driver GPS…'}
              </PartnerText>
            </View>
          </View>

          {data.driver ? (
            <View style={[styles.card, styles.driverBar, { borderRadius: px(14), padding: px(12), marginBottom: px(10) }]}>
              <View style={[styles.driverAvatar, { width: px(40), height: px(40), borderRadius: px(12) }]}>
                <PartnerText style={{ color: INK, fontWeight: '800', fontSize: px(16) }}>
                  {data.driver.name.charAt(0)}
                </PartnerText>
              </View>
              <View style={{ flex: 1, marginLeft: px(10) }}>
                <PartnerText style={{ color: INK, fontSize: px(14), fontWeight: '700' }}>{data.driver.name}</PartnerText>
                <PartnerText style={{ color: MUTED, fontSize: px(11), marginTop: px(2) }}>{data.serviceLabel}</PartnerText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Call ${data.driver.name}`}
                onPress={() => {
                  void Linking.openURL(`tel:${data.driver?.phone ?? ''}`);
                }}
                style={[styles.callButton, { width: px(40), height: px(40), borderRadius: px(12) }]}>
                <Phone size={px(18)} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.card, { borderRadius: px(14), padding: px(12), marginBottom: px(10) }]}>
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: '#2563EB' }]} />
              <View style={{ flex: 1 }}>
                <PartnerText style={{ color: MUTED, fontSize: px(10), fontWeight: '600' }}>PICKUP</PartnerText>
                <PartnerText style={{ color: INK, fontSize: px(12.5), marginTop: px(2) }} numberOfLines={2}>
                  {formatReadableAddress(data.pickup?.address) || '—'}
                </PartnerText>
              </View>
            </View>
            <View style={[styles.routeLine, { marginLeft: px(5) }]} />
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: '#F08A00' }]} />
              <View style={{ flex: 1 }}>
                <PartnerText style={{ color: MUTED, fontSize: px(10), fontWeight: '600' }}>DROP-OFF</PartnerText>
                <PartnerText style={{ color: INK, fontSize: px(12.5), marginTop: px(2) }} numberOfLines={2}>
                  {formatReadableAddress(data.dropoff?.address) || '—'}
                </PartnerText>
              </View>
            </View>
            {data.assignedFleetVehicleLabel ? (
              <PartnerText style={{ color: MUTED, fontSize: px(11), marginTop: px(10) }} numberOfLines={1}>
                {data.assignedFleetVehicleLabel}
              </PartnerText>
            ) : null}
          </View>

          {latestHistory ? (
            <View style={[styles.card, { borderRadius: px(14), padding: px(12) }]}>
              <PartnerText style={{ color: MUTED, fontSize: px(10), fontWeight: '600' }}>LATEST UPDATE</PartnerText>
              <PartnerText style={{ color: INK, fontSize: px(13), fontWeight: '700', marginTop: px(4) }}>
                {latestHistory.note ?? shortStatus(latestHistory.status)}
              </PartnerText>
              <PartnerText style={{ color: MUTED, fontSize: px(10.5), marginTop: px(3) }}>
                {new Date(latestHistory.timestamp).toLocaleString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  month: 'short',
                  day: 'numeric',
                })}
              </PartnerText>
            </View>
          ) : null}
        </>
      )}
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  mapShell: { overflow: 'hidden', backgroundColor: '#E5E7EB', position: 'relative' },
  mapOverlay: { position: 'absolute' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignSelf: 'flex-start',
  },
  driverBar: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: {
    backgroundColor: '#FFF5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#16A34A' },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeLine: {
    width: 2,
    height: 14,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
});
