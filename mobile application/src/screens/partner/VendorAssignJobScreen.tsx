import { PartnerText } from '../../components/partner/PartnerText';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Check, Plus, Truck, MapPin, DollarSign, Info } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PartnerScreenLayout from '../../components/partner/PartnerScreenLayout';
import VehicleTypeArtwork from '../../components/partner/VehicleTypeArtwork';
import { getApiErrorMessage } from '../../services/auth/useAuthMutations';
import {
  useApproveVendorBookingMutation,
  useVendorBookingOffersQuery,
  useVendorFleetDriversQuery,
  useVendorFleetVehiclesQuery,
} from '../../services/vendor/useVendorBookingsQueries';
import { formatReadableAddress } from '../../utils/readableAddress';
import type { PartnerJobsStackParamList } from '../../types/partnerNavigation';
import { driverColors, driverRadius, getPressableFeedback } from '../../theme/driverUi';

type Props = NativeStackScreenProps<PartnerJobsStackParamList, 'VendorAssignJob'>;

function artworkKindFor(type: string): 'flatbed' | 'wheel_lift' | 'heavy_tow' | 'car' {
  const lower = type.toLowerCase();
  if (lower.includes('flat')) return 'flatbed';
  if (lower.includes('wheel') || lower.includes('lift')) return 'wheel_lift';
  if (lower.includes('truck') || lower.includes('recovery') || lower.includes('heavy')) {
    return 'heavy_tow';
  }
  return 'car';
}

export default function VendorAssignJobScreen({ navigation, route }: Props) {
  const { bookingId, bookingType, bookingNumber, serviceLabel, pickupAddress, estimatedFare } =
    route.params;

  const {
    data: vehicles = [],
    isLoading: vehiclesLoading,
    refetch: refetchVehicles,
  } = useVendorFleetVehiclesQuery(true);
  const { data: drivers = [] } = useVendorFleetDriversQuery(true);
  const { refetch: refetchOffers } = useVendorBookingOffersQuery(true);
  const approveMutation = useApproveVendorBookingMutation();

  // Driver↔vehicle association lives on the driver profile (vehicleRegistration).
  const driverByReg = new Map<string, { name: string; status: string }>();
  for (const driver of drivers) {
    const key = (driver.vehicleRegistration ?? '').replace(/\s+/g, '').toUpperCase();
    if (key) driverByReg.set(key, { name: driver.name, status: driver.status });
  }

  const [vehicleId, setVehicleId] = useState<string | null>(null);

  const onApprove = async () => {
    if (!vehicleId) {
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
      title="Assign Job"
      subtitle={`#${bookingNumber} • ${serviceLabel}`}
      onBack={() => navigation.goBack()}
      footer={
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            getPressableFeedback(pressed),
            (approveMutation.isPending || !vehicleId) && styles.disabledButton,
          ]}
          onPress={() => void onApprove()}
          disabled={approveMutation.isPending || !vehicleId}>
          {approveMutation.isPending ? (
            <ActivityIndicator size="small" color={driverColors.white} />
          ) : (
            <PartnerText style={styles.primaryButtonText}>Approve & Assign Vehicle</PartnerText>
          )}
        </Pressable>
      }>
      {/* Job Overview Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.mapIconCircle}>
            <MapPin size={18} color={driverColors.amber} strokeWidth={2.4} />
          </View>
          <View style={styles.summaryCopy}>
            <PartnerText style={styles.summaryLabel}>Pickup Location</PartnerText>
            <PartnerText style={styles.summaryAddress}>
              {formatReadableAddress(pickupAddress) || 'Pickup location'}
            </PartnerText>
          </View>
        </View>

        {typeof estimatedFare === 'number' ? (
          <View style={styles.fareStrip}>
            <PartnerText style={styles.fareLabel}>Estimated Fare</PartnerText>
            <PartnerText style={styles.fareValue}>₹{Math.round(estimatedFare)}</PartnerText>
          </View>
        ) : null}
      </View>

      {/* Info notice */}
      <View style={styles.infoBanner}>
        <Info size={16} color="#0284C7" strokeWidth={2.2} />
        <PartnerText style={styles.infoText}>
          Assigning a vehicle broadcasts this request to your fleet drivers. Once assigned, your active drivers can accept and start the trip.
        </PartnerText>
      </View>

      {/* Vehicle Selection Header */}
      <View style={styles.sectionHeader}>
        <PartnerText style={styles.sectionTitle}>Select Fleet Vehicle</PartnerText>
        <Pressable
          onPress={() => navigation.navigate('VendorVehicles')}
          style={styles.addLink}
          hitSlop={8}>
          <Plus size={15} color={driverColors.amberText} strokeWidth={2.5} />
          <PartnerText style={styles.addLinkText}>Add vehicle</PartnerText>
        </Pressable>
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
            const linkedDriver = driverByReg.get(
              vehicle.registrationNo.replace(/\s+/g, '').toUpperCase(),
            );
            return (
              <Pressable
                key={vehicle.id}
                onPress={() => setVehicleId(vehicle.id)}
                style={({ pressed }) => [
                  styles.optionCard,
                  selected && styles.optionCardSelected,
                  getPressableFeedback(pressed),
                ]}>
                <View style={styles.artworkCircle}>
                  <VehicleTypeArtwork
                    type={artworkKindFor(vehicle.type)}
                    size={40}
                    selected={selected}
                  />
                </View>

                <View style={styles.optionCopy}>
                  <PartnerText style={styles.optionPlate}>{vehicle.registrationNo}</PartnerText>
                  <PartnerText style={styles.optionMeta}>
                    {vehicle.type} • {vehicle.model}
                  </PartnerText>
                  <PartnerText style={styles.optionDriver} numberOfLines={1}>
                    {linkedDriver
                      ? `${linkedDriver.status === 'APPROVED' ? '' : 'Pending · '}${linkedDriver.name}`
                      : 'No linked driver — drivers can accept via Jobs'}
                  </PartnerText>
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
    padding: 16,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  mapIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: driverColors.creamRow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: driverColors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryAddress: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.ink,
    marginTop: 2,
    lineHeight: 18,
  },
  fareStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
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
    marginBottom: 18,
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
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.amberText,
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
    padding: 14,
    borderWidth: 1.5,
    borderColor: driverColors.hairline,
  },
  optionCardSelected: {
    borderColor: driverColors.amber,
    backgroundColor: '#FFFDF5',
  },
  artworkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: driverColors.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionCopy: {
    flex: 1,
  },
  optionPlate: {
    fontSize: 15,
    fontWeight: '800',
    color: driverColors.ink,
  },
  optionMeta: {
    fontSize: 12,
    color: driverColors.grey,
    marginTop: 2,
  },
  optionDriver: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
    marginTop: 3,
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
    height: 50,
    borderRadius: driverRadius.button,
    backgroundColor: driverColors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: driverColors.white,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
