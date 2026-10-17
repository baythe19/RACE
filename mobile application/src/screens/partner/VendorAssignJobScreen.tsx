import { PartnerText } from '../../components/partner/PartnerText';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { Check, Info, MapPin, Truck } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PartnerScreenLayout from '../../components/partner/PartnerScreenLayout';
import { images } from '../../assets';
import { getApiErrorMessage } from '../../services/auth/useAuthMutations';
import {
  useApproveVendorBookingMutation,
  useVendorBookingOffersQuery,
  useVendorBookingsQuery,
  useVendorFleetDriversQuery,
  useVendorFleetVehiclesQuery,
} from '../../services/vendor/useVendorBookingsQueries';
import { formatReadableAddress } from '../../utils/readableAddress';
import type { PartnerJobsStackParamList } from '../../types/partnerNavigation';
import { driverColors, driverRadius, getPressableFeedback } from '../../theme/driverUi';

type Props = NativeStackScreenProps<PartnerJobsStackParamList, 'VendorAssignJob'>;

const normalizeVehicleReference = (value?: string) =>
  (value ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();

export default function VendorAssignJobScreen({ navigation, route }: Props) {
  const {
    bookingId,
    bookingType,
    bookingNumber,
    serviceLabel,
    pickupAddress,
    dropoffAddress,
    estimatedFare,
  } = route.params;

  const {
    data: vehicles = [],
    isLoading: vehiclesLoading,
    refetch: refetchVehicles,
  } = useVendorFleetVehiclesQuery(true);
  const { data: drivers = [] } = useVendorFleetDriversQuery(true);
  const { refetch: refetchOffers } = useVendorBookingOffersQuery(true);
  const { data: activeBookings = [] } = useVendorBookingsQuery(true);
  const approveMutation = useApproveVendorBookingMutation();
  const reservedVehicleIds = new Set(
    activeBookings
      .filter(booking =>
        booking.id !== bookingId &&
        ['CONFIRMED', 'DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(
          booking.status,
        ),
      )
      .flatMap(booking => vehicles
        .filter(vehicle =>
          booking.assignedFleetVehicleId === vehicle.id ||
          (Boolean(vehicle.registrationNo) && normalizeVehicleReference(booking.assignedFleetVehicleLabel)
            .includes(normalizeVehicleReference(vehicle.registrationNo))),
        )
        .map(vehicle => vehicle.id)),
  );

  // Driver↔vehicle association lives on the driver profile (vehicleRegistration).
  const driverByReg = new Map<string, { name: string; status: string }>();
  for (const driver of drivers) {
    const key = (driver.vehicleRegistration ?? '').replace(/\s+/g, '').toUpperCase();
    if (key) driverByReg.set(key, { name: driver.name, status: driver.status });
  }

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const selectedVehicleIsAvailable =
    Boolean(vehicleId) &&
    vehicles.some(vehicle => vehicle.id === vehicleId) &&
    !reservedVehicleIds.has(vehicleId ?? '');

  const onApprove = async () => {
    if (!vehicleId || !selectedVehicleIsAvailable || approveMutation.isPending) {
      Alert.alert('Select a vehicle', 'Choose a fleet vehicle for this job.');
      return;
    }
    try {
      const result = await approveMutation.mutateAsync({
        bookingId,
        bookingType,
        vehicleId,
      });
      Alert.alert(
        'Job Approved & Assigned',
        result.message ||
          `Vehicle assigned successfully. Your drivers can now accept #${bookingNumber} from their jobs list.`,
        [{ text: 'OK', onPress: () => navigation.navigate('PartnerJobsList') }],
      );
    } catch (error) {
      Alert.alert('Approval failed', getApiErrorMessage(error, 'Could not approve job'));
      // The lead may already be gone (taken/expired) — refresh to show reality.
      void refetchOffers();
      void refetchVehicles();
    }
  };

  return (
    <PartnerScreenLayout
      title="Assign vehicle"
      onBack={() => navigation.goBack()}
      footer={
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            getPressableFeedback(pressed),
            (approveMutation.isPending || !selectedVehicleIsAvailable) && styles.disabledButton,
          ]}
          onPress={() => void onApprove()}
          testID="vendorConfirmAssignment"
          disabled={approveMutation.isPending || !selectedVehicleIsAvailable}>
          {approveMutation.isPending ? (
            <ActivityIndicator size="small" color={driverColors.white} />
          ) : (
            <PartnerText style={styles.primaryButtonText}>Confirm assignment</PartnerText>
          )}
        </Pressable>
      }>
      {/* Booking summary */}
      <View style={styles.summaryCard}>
        <View style={styles.bookingBanner}>
          <View style={styles.bookingArtworkWrap}>
            <Image source={images.icons.truck} style={styles.bookingArtwork} resizeMode="contain" />
          </View>
          <View style={styles.summaryCopy}>
            <PartnerText style={styles.bookingNumber}>#{bookingNumber}</PartnerText>
            <PartnerText style={styles.bookingService}>{serviceLabel}</PartnerText>
          </View>
        </View>

        <View style={styles.locationRow}>
          <MapPin size={18} color="#2563EB" fill="#2563EB" />
          <PartnerText style={styles.locationText} numberOfLines={2}>
            {formatReadableAddress(pickupAddress) || 'Pickup location'}
          </PartnerText>
        </View>
        {dropoffAddress ? (
          <View style={styles.locationRow}>
            <MapPin size={18} color={driverColors.amberText} fill={driverColors.amberText} />
            <PartnerText style={styles.locationText} numberOfLines={2}>
              {formatReadableAddress(dropoffAddress)}
            </PartnerText>
          </View>
        ) : null}

        {typeof estimatedFare === 'number' ? (
          <View style={styles.fareStrip}>
            <PartnerText style={styles.fareLabel}>₹　Estimated Fare</PartnerText>
            <PartnerText style={styles.fareValue}>₹{Math.round(estimatedFare)}</PartnerText>
          </View>
        ) : null}
      </View>

      {/* Info notice */}
      <View style={styles.infoBanner}>
        <Info size={16} color="#0284C7" strokeWidth={2.2} />
        <PartnerText style={styles.infoText}>
          Confirming assigns this lead to the selected fleet vehicle. You can change the assignment before confirming.
        </PartnerText>
      </View>

      {/* Vehicle Selection Header */}
      <View style={styles.sectionHeader}>
        <PartnerText style={styles.sectionTitle}>Available fleet vehicles</PartnerText>
      </View>

      {/* Vehicle List */}
      {vehiclesLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color={driverColors.amber} />
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.emptyCard}>
          <Truck size={32} color={driverColors.greySoft} strokeWidth={1.8} />
          <PartnerText style={styles.emptyTitle}>No active fleet vehicles</PartnerText>
          <PartnerText style={styles.emptySub}>
            You must add and activate at least one vehicle before assigning jobs.
          </PartnerText>
          <Pressable
            style={styles.addVehicleBtn}
            onPress={() => navigation.navigate('VendorVehicles')}>
            <PartnerText style={styles.addVehicleBtnText}>Add Vehicle to Fleet</PartnerText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.vehiclesList}>
          {vehicles.map(vehicle => {
            const selected = vehicleId === vehicle.id;
            const isAvailable = !reservedVehicleIds.has(vehicle.id);
            const linkedDriver = driverByReg.get(
              vehicle.registrationNo.replace(/\s+/g, '').toUpperCase(),
            );
            return (
              <Pressable
                key={vehicle.id}
                testID={`vendorFleetVehicle-${vehicle.id}`}
                accessibilityRole="radio"
                accessibilityLabel={`${vehicle.registrationNo}, ${isAvailable ? 'Available' : 'In service'}`}
                accessibilityState={{ selected, disabled: !isAvailable }}
                onPress={() => isAvailable && setVehicleId(vehicle.id)}
                disabled={!isAvailable}
                style={({ pressed }) => [
                  styles.optionCard,
                  selected && styles.optionCardSelected,
                  !isAvailable && styles.optionCardUnavailable,
                  getPressableFeedback(pressed),
                ]}>
                <View style={styles.artworkCircle}>
                  <Image source={images.icons.truck} style={styles.vehicleArtwork} resizeMode="contain" />
                </View>

                <View style={styles.optionCopy}>
                  <PartnerText style={styles.optionPlate}>{vehicle.registrationNo}</PartnerText>
                  <PartnerText style={styles.vehicleTypePill} numberOfLines={1}>
                    {vehicle.type}
                  </PartnerText>
                  <PartnerText style={styles.optionMeta} numberOfLines={1}>
                    {vehicle.model}
                  </PartnerText>
                  <PartnerText style={styles.optionDriver} numberOfLines={1}>
                    {linkedDriver
                      ? `Assigned driver: ${linkedDriver.name}`
                      : 'No driver linked yet'}
                  </PartnerText>
                  <View style={styles.availabilityRow}>
                    <View
                      style={[styles.availableDot, !isAvailable && styles.unavailableDot]}
                    />
                    <PartnerText
                      style={[styles.availableLabel, !isAvailable && styles.unavailableLabel]}>
                      {isAvailable ? 'Available' : 'In service'}
                    </PartnerText>
                  </View>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    selected && styles.radioOuterSelected,
                  ]}>
                  {selected ? <Check size={14} color={driverColors.white} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 12,
    borderWidth: 0,
    marginBottom: 14,
  },
  bookingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7E8',
    borderRadius: 16,
    padding: 10,
    marginBottom: 8,
  },
  bookingArtworkWrap: {
    width: 68,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#FFF1CE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bookingArtwork: {
    width: 62,
    height: 48,
  },
  summaryCopy: {
    flex: 1,
  },
  bookingNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: driverColors.ink,
  },
  bookingService: {
    fontSize: 13,
    color: driverColors.ink,
    marginTop: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: driverColors.ink,
  },
  fareStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: driverColors.hairline,
  },
  fareLabel: {
    fontSize: 13,
    color: driverColors.grey,
    fontWeight: '600',
  },
  fareValue: {
    fontSize: 18,
    fontWeight: '800',
    color: driverColors.ink,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: driverRadius.innerCard,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: '#0369A1',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: driverColors.ink,
  },
  loaderWrap: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: driverColors.hairline,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: driverColors.ink,
    marginTop: 6,
  },
  emptySub: {
    fontSize: 12,
    color: driverColors.grey,
    textAlign: 'center',
    lineHeight: 16,
  },
  addVehicleBtn: {
    marginTop: 10,
    backgroundColor: driverColors.amber,
    borderRadius: driverRadius.button,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addVehicleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.white,
  },
  vehiclesList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 11,
    borderWidth: 1.5,
    borderColor: driverColors.hairline,
    minHeight: 114,
  },
  optionCardSelected: {
    borderColor: driverColors.amber,
    backgroundColor: '#FFFDF5',
  },
  optionCardUnavailable: {
    opacity: 0.58,
  },
  artworkCircle: {
    width: 64,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#FFF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionCopy: {
    flex: 1,
  },
  optionPlate: {
    fontSize: 14,
    fontWeight: '800',
    color: driverColors.ink,
  },
  optionMeta: {
    fontSize: 11,
    color: driverColors.grey,
    marginTop: 2,
  },
  vehicleTypePill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    overflow: 'hidden',
    color: '#9A4E00',
    backgroundColor: '#FFF0D6',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
  },
  vehicleArtwork: {
    width: 60,
    height: 54,
  },
  optionDriver: {
    fontSize: 10,
    fontWeight: '500',
    color: driverColors.grey,
    marginTop: 4,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  availableLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  unavailableDot: {
    backgroundColor: '#9CA3AF',
  },
  unavailableLabel: {
    color: driverColors.grey,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D0D4DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: driverColors.amber,
    backgroundColor: driverColors.amber,
  },
  primaryButton: {
    height: 52,
    borderRadius: driverRadius.button,
    backgroundColor: '#FF9900',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
