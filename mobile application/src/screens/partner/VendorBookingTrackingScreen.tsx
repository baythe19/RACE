import React from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { MapPin, Phone, Truck, UserRound } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import AppScreenLayout from '../../components/ui/AppScreenLayout';
import LiveTripMap from '../../components/booking/LiveTripMap';
import { PartnerText } from '../../components/partner/PartnerText';
import { useScreenPx } from '../../hooks/useScreenPx';
import { useVendorBookingTrackingQuery } from '../../services/vendor/useVendorBookingsQueries';
import type { PartnerJobsStackParamList } from '../../types/partnerNavigation';
import { formatReadableAddress } from '../../utils/readableAddress';

type Props = NativeStackScreenProps<PartnerJobsStackParamList, 'PartnerActiveJob'>;
const AMBER = '#F9A602';
const INK = '#191919';
const MUTED = '#6B7280';

function labelStatus(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
}

export default function VendorBookingTrackingScreen({ route }: Props) {
  const px = useScreenPx();
  const bookingId = route.params?.bookingId ?? '';
  const bookingType = route.params?.bookingType ?? 'towing';
  const { data, isLoading, isError, refetch } = useVendorBookingTrackingQuery(bookingId, bookingType);
  const driverLocation = data?.isLocationFresh && data.driverLocation
    ? { latitude: data.driverLocation.latitude, longitude: data.driverLocation.longitude, label: 'Driver' }
    : null;
  const pickup = data?.pickup && typeof data.pickup.latitude === 'number' && typeof data.pickup.longitude === 'number'
    ? { latitude: data.pickup.latitude, longitude: data.pickup.longitude, label: 'Pickup' }
    : null;
  const dropoff = data?.dropoff && typeof data.dropoff.latitude === 'number' && typeof data.dropoff.longitude === 'number'
    ? { latitude: data.dropoff.latitude, longitude: data.dropoff.longitude, label: 'Drop-off' }
    : null;
  const atPickup = ['DRIVER_ARRIVED', 'IN_PROGRESS'].includes(data?.status ?? '');
  const destination = atPickup ? dropoff : pickup;

  return (
    <AppScreenLayout
      header={
        <View style={[styles.header, { paddingHorizontal: px(18), paddingTop: px(12), paddingBottom: px(12) }]}>
          <PartnerText style={{ color: INK, fontSize: px(19), fontWeight: '800' }}>Job tracking</PartnerText>
          <PartnerText style={{ color: MUTED, fontSize: px(12), marginTop: px(3) }}>
            {data ? '#' + data.bookingNumber : 'Vendor fleet assignment'}
          </PartnerText>
        </View>
      }
      refreshing={false}
      onRefresh={() => { void refetch(); }}
      contentStyle={{ paddingTop: px(12) }}>
      {isLoading ? (
        <View style={{ paddingVertical: px(34) }}><ActivityIndicator color={AMBER} /></View>
      ) : isError || !data ? (
        <View style={[styles.card, { borderRadius: px(16), padding: px(18) }]}>
          <PartnerText style={{ color: MUTED, textAlign: 'center', fontSize: px(13) }}>
            Tracking could not load. Pull down to retry.
          </PartnerText>
        </View>
      ) : (
        <>
          <View style={[styles.card, { borderRadius: px(17), padding: px(14), marginBottom: px(12) }]}>
            <View style={styles.row}>
              <View style={[styles.icon, { width: px(42), height: px(42), borderRadius: px(13) }]}>
                {bookingType === 'towing' ? <Truck size={px(21)} color={AMBER} /> : <UserRound size={px(21)} color={AMBER} />}
              </View>
              <View style={{ flex: 1 }}>
                <PartnerText style={{ color: INK, fontSize: px(15), fontWeight: '800' }}>{data.serviceLabel}</PartnerText>
                <PartnerText style={{ color: MUTED, fontSize: px(12), marginTop: px(3) }}>{labelStatus(data.status)}</PartnerText>
              </View>
            </View>
            <View style={[styles.placeRow, { marginTop: px(13) }]}>
              <MapPin size={px(15)} color="#2563EB" />
              <PartnerText style={{ color: INK, fontSize: px(12), flex: 1 }}>
                {formatReadableAddress(data.pickup?.address) || 'Pickup location'}
              </PartnerText>
            </View>
            {data.dropoff?.address ? (
              <View style={styles.placeRow}>
                <MapPin size={px(15)} color="#F08A00" />
                <PartnerText style={{ color: INK, fontSize: px(12), flex: 1 }}>
                  {formatReadableAddress(data.dropoff.address)}
                </PartnerText>
              </View>
            ) : null}
            {data.assignedFleetVehicleLabel ? (
              <PartnerText style={{ color: MUTED, fontSize: px(12), marginTop: px(10) }}>
                Fleet vehicle: {data.assignedFleetVehicleLabel}
              </PartnerText>
            ) : null}
            {data.driver ? (
              <View style={[styles.driverRow, { marginTop: px(12), paddingTop: px(11) }]}>
                <View style={{ flex: 1 }}>
                  <PartnerText style={{ color: INK, fontSize: px(13), fontWeight: '700' }}>{data.driver.name}</PartnerText>
                  <PartnerText style={{ color: MUTED, fontSize: px(11), marginTop: px(2) }}>{data.driver.phone}</PartnerText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={'Call ' + data.driver.name}
                  onPress={() => { void Linking.openURL('tel:' + data.driver?.phone); }}
                  style={[styles.callButton, { width: px(38), height: px(38), borderRadius: px(13) }]}>
                  <Phone size={px(17)} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : null}
          </View>

          <View style={[styles.mapWrap, { height: px(280), borderRadius: px(17), marginBottom: px(10) }]}>
            <LiveTripMap
              pickup={pickup}
              dropoff={dropoff}
              driverLocation={driverLocation}
              activeDestination={destination}
              showsUserLocation={false}
              routeApiEnabled={false}
              style={StyleSheet.absoluteFill}
              borderRadius={px(17)}
            />
          </View>
          <PartnerText style={{ color: data.isLocationFresh ? '#13834C' : MUTED, fontSize: px(11), marginBottom: px(15) }}>
            {data.isLocationFresh && data.driverLocation?.updatedAt
              ? 'Driver location updated ' + Math.max(0, Math.round((Date.now() - new Date(data.driverLocation.updatedAt).getTime()) / 1000)) + ' sec ago'
              : 'Waiting for a fresh Driver location. The map hides old locations.'}
          </PartnerText>

          <View style={[styles.card, { borderRadius: px(17), padding: px(14) }]}>
            <PartnerText style={{ color: INK, fontSize: px(15), fontWeight: '800', marginBottom: px(8) }}>Progress</PartnerText>
            {data.statusHistory.slice(-5).reverse().map((entry, index) => (
              <View key={entry.status + entry.timestamp + index} style={styles.timelineRow}>
                <View style={[styles.timelineDot, { backgroundColor: index === 0 ? AMBER : '#D1D5DB' }]} />
                <View style={{ flex: 1 }}>
                  <PartnerText style={{ color: INK, fontSize: px(12), fontWeight: '700' }}>{labelStatus(entry.status)}</PartnerText>
                  {entry.note ? <PartnerText style={{ color: MUTED, fontSize: px(10), marginTop: px(2) }}>{entry.note}</PartnerText> : null}
                </View>
                <PartnerText style={{ color: MUTED, fontSize: px(10) }}>
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </PartnerText>
              </View>
            ))}
          </View>
        </>
      )}
    </AppScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8E8E8' },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5DB' },
  placeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  driverRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  callButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#16A34A' },
  mapWrap: { overflow: 'hidden', backgroundColor: '#E5E7EB' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
});
