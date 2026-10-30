import { PartnerText, PartnerTextInput } from '../../components/partner/PartnerText';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, ChevronDown, Info, MapPin, Search, Truck, UserRound, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PartnerScreenLayout from '../../components/partner/PartnerScreenLayout';
import { usePartnerDialog } from '../../hooks/usePartnerDialog';
import DriverDataSkeleton from '../../components/partner/DriverDataSkeleton';
import { images } from '../../assets';
import { getApiErrorMessage } from '../../services/auth/useAuthMutations';
import {
  useApproveVendorBookingMutation,
  useVendorBookingOffersQuery,
  useVendorBookingsQuery,
  useVendorFleetVehiclesQuery,
} from '../../services/vendor/useVendorBookingsQueries';
import { useVendorMembershipsQuery } from '../../services/vendor/useVendorMembershipQueries';
import { formatReadableAddress } from '../../utils/readableAddress';
import type {
  PartnerAccountStackParamList,
  PartnerDriversStackParamList,
  PartnerJobsStackParamList,
} from '../../types/partnerNavigation';
import { partnerAccountParams } from '../../navigation/partnerNavigationRef';
import { driverColors, driverRadius, getPressableFeedback } from '../../theme/driverUi';
import { spacing } from '../../theme';

type AssignJobStacks =
  | PartnerJobsStackParamList
  | PartnerDriversStackParamList
  | PartnerAccountStackParamList;

type Props = NativeStackScreenProps<AssignJobStacks, 'VendorAssignJob'>;

/** Above this many vehicles/drivers the screen switches to a searchable picker modal. */
const LIST_COMPACT_LIMIT = 6;

const normalizeVehicleReference = (value?: string) =>
  (value ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();

/**_softer legible compact card meta */
const COLLAPSED_LIST_LIMIT = 3;

export default function VendorAssignJobScreen({ navigation, route }: Props) {
  const {
    bookingId,
    bookingType,
    bookingNumber,
    serviceLabel,
    pickupAddress,
    dropoffAddress,
    estimatedFare,
    preferredDriverId,
    onSiteAssist = false,
  } = route.params;
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();

  const {
    data: vehicles = [],
    isLoading: vehiclesLoading,
    refetch: refetchVehicles,
  } = useVendorFleetVehiclesQuery(true);
  const { data: memberships = [], isLoading: driversLoading, refetch: refetchDrivers } = useVendorMembershipsQuery(true);
  const { refetch: refetchOffers } = useVendorBookingOffersQuery(true);
  const { data: activeBookings = [] } = useVendorBookingsQuery(true);
  const approveMutation = useApproveVendorBookingMutation();
  const reservedVehicleIds = React.useMemo(() => new Set(
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
  ), [activeBookings, bookingId, vehicles]);

  const eligibleDrivers = React.useMemo(() => memberships.filter(member =>
    member.status === 'ACTIVE' &&
    Boolean(member.driver) &&
    member.driver?.driverStatus !== 'REJECTED' &&
    member.driver?.driverStatus !== 'SUSPENDED' &&
    (bookingType === 'towing'
      ? member.driver?.driverType === 'Tow Driver' || member.driver?.driverType === 'Full-Time'
      : member.driver?.driverType === 'Full-Time'),
  ), [memberships, bookingType]);

  const [driverId, setDriverId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  // Searchable picker handles huge fleets; flat cards stay for small fleets.
  const useVehiclePicker = vehicles.length > LIST_COMPACT_LIMIT;
  const useDriverPicker = eligibleDrivers.length > LIST_COMPACT_LIMIT;
  const vehicleQuery = pickerQuery.trim().toLowerCase();
  const selectedVehicle = vehicles.find(vehicle => vehicle.id === vehicleId) ?? null;
  const selectedDriverMember = eligibleDrivers.find(member => member.driver?.id === driverId) ?? null;

  // Auto-select when only 1 vehicle or 1 driver is available to reduce dispatch friction
  React.useEffect(() => {
    if (onSiteAssist || bookingType !== 'towing' || vehicleId || vehicles.length === 0) return;
    const availableVehicles = vehicles.filter(v => !reservedVehicleIds.has(v.id));
    if (availableVehicles.length === 1) {
      setVehicleId(availableVehicles[0].id);
    }
  }, [bookingType, onSiteAssist, vehicleId, vehicles, reservedVehicleIds]);

  React.useEffect(() => {
    if (!driverId && preferredDriverId) {
      const preferred = eligibleDrivers.find(m => m.driver?.id === preferredDriverId);
      if (preferred?.driver?.id) {
        setDriverId(preferred.driver.id);
        return;
      }
    }
    if (!driverId && eligibleDrivers.length > 0) {
      const availableDrivers = eligibleDrivers.filter(
        m => m.driver?.isAvailable && !m.driver?.isBusy,
      );
      if (availableDrivers.length === 1 && availableDrivers[0].driver?.id) {
        setDriverId(availableDrivers[0].driver.id);
      }
    }
  }, [driverId, eligibleDrivers, preferredDriverId]);
  const selectedVehicleIsAvailable =
    onSiteAssist ||
    bookingType === 'driver' ||
    (Boolean(vehicleId) &&
      vehicles.some(vehicle => vehicle.id === vehicleId) &&
      !reservedVehicleIds.has(vehicleId ?? ''));
  const selectedDriver = eligibleDrivers.find(member => member.driver?.id === driverId)?.driver;
  const selectedDriverIsAvailable = Boolean(selectedDriver?.isAvailable && !selectedDriver.isBusy);
  const canAssign = Boolean(driverId) && selectedDriverIsAvailable && selectedVehicleIsAvailable;

  const onApprove = async () => {
    if (!driverId || !selectedDriverIsAvailable) {
      showAlert({
        tone: 'warning',
        title: 'Select an available Driver',
        message: 'Choose a connected Driver who is currently available.',
      });
      return;
    }
    if (!onSiteAssist && bookingType === 'towing' && (!vehicleId || !selectedVehicleIsAvailable)) {
      showAlert({
        tone: 'warning',
        title: 'Select an available vehicle',
        message: 'Towing work requires an active fleet vehicle.',
      });
      return;
    }
    if (approveMutation.isPending) return;
    try {
      const result = await approveMutation.mutateAsync({
        bookingId,
        bookingType,
        driverId,
        ...(bookingType === 'towing' && vehicleId ? { vehicleId } : {}),
      });
      showAlert({
        tone: 'success',
        title: 'Job assigned',
        message:
          result.message ||
          `Driver assigned to #${bookingNumber}. The trip starts once the driver accepts the job.`,
        primaryAction: { label: 'OK', onPress: () => navigation.goBack() },
      });
    } catch (error) {
      showAlert({
        tone: 'error',
        title: 'Assignment failed',
        message: getApiErrorMessage(error, 'Could not assign this job'),
      });
      void refetchOffers();
      void refetchVehicles();
      void refetchDrivers();
    }
  };

  const activeVehicles = vehicles.filter(vehicle => vehicle.status === 'ACTIVE');

  if (!onSiteAssist && !vehiclesLoading && activeVehicles.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <PartnerScreenLayout
          title="Add a vehicle first"
          onBack={() => navigation.goBack()}
          contentTopSpacing={spacing.sm}
          footer={
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                navigation.getParent()?.navigate('PartnerAccount', partnerAccountParams('VendorVehicles'))
              }>
              <PartnerText style={styles.primaryButtonText}>Add vehicle</PartnerText>
            </Pressable>
          }>
          <View style={styles.emptyCard}>
            <PartnerText style={styles.emptyTitle}>This job is waiting</PartnerText>
            <PartnerText style={styles.emptySub}>
              The request stays on your jobs list. Assignment opens after one towing vehicle is active.
              Roadside on-site jobs only need a connected driver — no truck.
            </PartnerText>
          </View>
        </PartnerScreenLayout>
        {partnerDialog}
      </View>
    );
  }

  if (bookingType !== 'towing') {
    return (
      <View style={{ flex: 1 }}>
        <PartnerScreenLayout
          title="Towing jobs only"
          onBack={() => navigation.goBack()}
          contentTopSpacing={spacing.sm}
          footer={
            <Pressable style={styles.primaryButton} onPress={() => navigation.goBack()}>
              <PartnerText style={styles.primaryButtonText}>Back to jobs</PartnerText>
            </Pressable>
          }>
          <View style={styles.emptyCard}>
            <PartnerText style={styles.emptyTitle}>This is not a towing job</PartnerText>
            <PartnerText style={styles.emptySub}>
              Vendor fleets receive customer towing requests only. Driver-hire jobs go to independent drivers.
            </PartnerText>
          </View>
        </PartnerScreenLayout>
        {partnerDialog}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <PartnerScreenLayout
      title="Assign driver & vehicle"
      onBack={() => navigation.goBack()}
      contentTopSpacing={spacing.sm}
      footer={
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            getPressableFeedback(pressed),
            (!canAssign || approveMutation.isPending) && styles.disabledButton,
          ]}
          onPress={() => void onApprove()}
          testID="vendorConfirmAssignment"
          disabled={approveMutation.isPending || !canAssign}>
          {approveMutation.isPending ? (
            <ActivityIndicator size="small" color={driverColors.white} />
          ) : (
            <PartnerText style={styles.primaryButtonText}>
              {canAssign ? 'Confirm assignment' : 'Select driver' + (bookingType === 'towing' ? ' & vehicle' : '')}
            </PartnerText>
          )}
        </Pressable>
      }>
      {/* Trip summary: booking, pickup → drop, fare */}
      <View style={styles.summaryCard}>
        <View style={styles.bookingBanner}>
          <View style={styles.bookingArtworkWrap}>
            {bookingType === 'towing'
              ? <Image source={images.icons.truck} style={styles.bookingArtwork} resizeMode="contain" />
              : <UserRound size={34} color={driverColors.amberText} /> }
          </View>
          <View style={styles.summaryCopy}>
            <PartnerText style={styles.bookingNumber}>#{bookingNumber}</PartnerText>
            <PartnerText style={styles.bookingService}>{serviceLabel}</PartnerText>
          </View>
        </View>

        {/* Pickup → Drop route block */}
        <View style={styles.routeBlock}>
          <View style={styles.routeLines}>
            <View style={styles.routeDots}>
              <View style={[styles.routeDot, styles.routeDotPickup]} />
              <View style={styles.routeLink} />
              <View style={[styles.routeDot, styles.routeDotDrop]} />
            </View>
            <View style={styles.routeCopy}>
              <View style={styles.routeRow}>
                <PartnerText style={styles.routeTag}>PICKUP</PartnerText>
                <PartnerText style={styles.locationText} numberOfLines={2}>
                  {formatReadableAddress(pickupAddress) || 'Pickup location'}
                </PartnerText>
              </View>
              <View style={styles.routeRow}>
                <PartnerText style={[styles.routeTag, styles.routeTagDrop]}>DROP</PartnerText>
                <PartnerText style={styles.locationText} numberOfLines={2}>
                  {dropoffAddress ? formatReadableAddress(dropoffAddress) : 'Same as pickup / not specified'}
                </PartnerText>
              </View>
            </View>
          </View>

          <View style={styles.fareStrip}>
            <View style={styles.fareLeft}>
              <PartnerText style={styles.fareLabel}>Estimated Fare</PartnerText>
            </View>
            <PartnerText style={styles.fareValue}>
              {typeof estimatedFare === 'number' ? `₹${Math.round(estimatedFare)}` : '—'}
            </PartnerText>
          </View>
        </View>
      </View>

      {bookingType === 'towing' && !onSiteAssist ? (
        <>
          <View style={styles.sectionHeader}>
            <PartnerText style={styles.sectionTitle}>1. Select Fleet Tow Truck</PartnerText>
            <View style={styles.sectionHeaderRight}>
              {useVehiclePicker && selectedVehicle ? (
                <PartnerText style={styles.sectionCount}>{vehicles.length} vehicles</PartnerText>
              ) : null}
              <Pressable
                testID="vendorAssignInfoBtn"
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="How assignment works"
                onPress={() => showAlert({
                  tone: 'info',
                  title: 'How assignment works',
                  message: bookingType === 'towing'
                    ? 'Assign this towing request to an available connected Driver and one active fleet vehicle. The job reaches the driver as soon as you confirm.'
                    : 'Assign this Driver-hire request to an available connected Driver. No fleet vehicle is needed.',
                  primaryAction: { label: 'Got it', onPress: () => undefined },
                })}
                style={({ pressed }) => [styles.infoIconBtn, pressed && styles.pressed]}>
                <Info size={17} color="#0284C7" strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>
          {vehiclesLoading ? (
            <DriverDataSkeleton variant="vehicles" />
          ) : vehicles.length === 0 ? (
            <View style={styles.emptyCard}>
              <Truck size={32} color={driverColors.greySoft} strokeWidth={1.8} />
              <PartnerText style={styles.emptyTitle}>No active fleet vehicles</PartnerText>
              <PartnerText style={styles.emptySub}>
                Add and activate a towing vehicle before assigning this job.
              </PartnerText>
              <Pressable style={styles.addVehicleBtn} onPress={() => navigation.navigate('VendorVehicles')}>
                <PartnerText style={styles.addVehicleBtnText}>Add Vehicle to Fleet</PartnerText>
              </Pressable>
            </View>
          ) : useVehiclePicker ? (
            /* Big fleet: selected summary + searchable picker modal */
            <Pressable
              testID="vendorVehiclePickerTrigger"
              accessibilityRole="button"
              accessibilityLabel="Choose fleet vehicle"
              onPress={() => { setPickerQuery(''); setVehiclePickerOpen(true); }}
              style={({ pressed }) => [styles.pickerTrigger, pressed && styles.pressed, getPressableFeedback(pressed), selectedVehicle ? styles.optionCardSelected : null]}>
              <View style={styles.artworkCircle}>
                <Image source={images.icons.truck} style={styles.vehicleArtwork} resizeMode="contain" />
              </View>
              <View style={styles.optionCopy}>
                <PartnerText style={styles.optionPlate}>{selectedVehicle ? selectedVehicle.registrationNo : 'Choose vehicle'}</PartnerText>
                {selectedVehicle ? (
                  <>
                    <PartnerText style={styles.optionMeta} numberOfLines={1}>{selectedVehicle.model}</PartnerText>
                    <View style={styles.availabilityRow}>
                      <View style={styles.availableDot} />
                      <PartnerText style={styles.availableLabel}>Available</PartnerText>
                    </View>
                  </>
                ) : (
                  <PartnerText style={styles.optionMeta}>Tap to search — {vehicles.length} in fleet</PartnerText>
                )}
              </View>
              <ChevronDown size={20} color={driverColors.grey} strokeWidth={2.2} />
            </Pressable>
          ) : (
            <View style={styles.vehiclesList}>
              {vehicles.slice(0, COLLAPSED_LIST_LIMIT).map(vehicle => {
                const selected = vehicleId === vehicle.id;
                const available = !reservedVehicleIds.has(vehicle.id);
                return (
                  <Pressable
                    key={vehicle.id}
                    testID={'vendorFleetVehicle-' + vehicle.id}
                    accessibilityRole="radio"
                    accessibilityLabel={vehicle.registrationNo + (available ? ', Available' : ', In service')}
                    accessibilityState={{ selected, disabled: !available }}
                    onPress={() => available && setVehicleId(vehicle.id)}
                    disabled={!available}
                    style={({ pressed }) => [
                      styles.optionCard,
                      selected && styles.optionCardSelected,
                      !available && styles.optionCardUnavailable,
                      getPressableFeedback(pressed),
                    ]}>
                    <View style={styles.artworkCircle}>
                      <Image source={images.icons.truck} style={styles.vehicleArtwork} resizeMode="contain" />
                    </View>
                    <View style={styles.optionCopy}>
                      <View style={styles.cardTopRow}>
                        <PartnerText style={styles.optionPlate}>{vehicle.registrationNo}</PartnerText>
                        <View style={styles.availabilityRow}>
                          <View style={[styles.availableDot, !available && styles.unavailableDot]} />
                          <PartnerText style={[styles.availableLabel, !available && styles.unavailableLabel]}>
                            {available ? 'Available' : 'In service'}
                          </PartnerText>
                        </View>
                      </View>
                      <PartnerText style={styles.vehicleTypePill} numberOfLines={1}>{vehicle.type}</PartnerText>
                      <PartnerText style={styles.optionMeta} numberOfLines={1}>{vehicle.model}</PartnerText>
                    </View>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected ? <Check size={14} color={driverColors.white} strokeWidth={3} /> : null}
                    </View>
                  </Pressable>
                );
              })}
              {vehicles.length > COLLAPSED_LIST_LIMIT ? (
                <Pressable style={styles.showAllBtn} onPress={() => { setPickerQuery(''); setVehiclePickerOpen(true); }}>
                  <PartnerText style={styles.showAllText}>Show all {vehicles.length} vehicles</PartnerText>
                  <ChevronDown size={16} color={driverColors.ink} strokeWidth={2.4} />
                </Pressable>
              ) : null}
            </View>
          )}
        </>
      ) : null}

      <View style={[styles.sectionHeader, { marginTop: bookingType === 'towing' ? 20 : 0 }]}>
        <PartnerText style={styles.sectionTitle}>
          {bookingType === 'towing' ? '2. Assign Connected Driver' : 'Select Connected Driver'}
        </PartnerText>
        {useDriverPicker ? <PartnerText style={styles.sectionCount}>{eligibleDrivers.length} drivers</PartnerText> : null}
      </View>
      {driversLoading ? (
        <View style={styles.emptyCard}><ActivityIndicator color={driverColors.amber} /></View>
      ) : eligibleDrivers.length === 0 ? (
        <View style={styles.emptyCard}>
          <UserRound size={30} color={driverColors.greySoft} />
          <PartnerText style={styles.emptyTitle}>No eligible connected Drivers</PartnerText>
          <PartnerText style={styles.emptySub}>
            Register a driver on your fleet first. They sign in with that phone and only receive jobs you assign.
          </PartnerText>
          <Pressable
            style={styles.addVehicleBtn}
            onPress={() => navigation.navigate('VendorAddDriver')}>
            <PartnerText style={styles.addVehicleBtnText}>Add driver</PartnerText>
          </Pressable>
        </View>
      ) : useDriverPicker ? (
        <Pressable
          testID="vendorDriverPickerTrigger"
          accessibilityRole="button"
          onPress={() => { setPickerQuery(''); setDriverPickerOpen(true); }}
          style={({ pressed }) => [styles.pickerTrigger, getPressableFeedback(pressed), selectedDriver ? styles.optionCardSelected : null]}>
          <View style={styles.artworkCircle}>
            <UserRound size={25} color={driverColors.amberText} />
          </View>
          <View style={styles.optionCopy}>
            {selectedDriver ? (
              <>
                <PartnerText style={styles.optionPlate}>{selectedDriver.name}</PartnerText>
                <PartnerText style={styles.optionMeta}>{selectedDriver.phone}</PartnerText>
                <View style={styles.availabilityRow}>
                  <View style={styles.availableDot} />
                  <PartnerText style={styles.availableLabel}>Available</PartnerText>
                </View>
              </>
            ) : (
              <>
                <PartnerText style={styles.optionPlate}>Choose driver</PartnerText>
                <PartnerText style={styles.optionMeta}>Tap to search — {eligibleDrivers.length} connected</PartnerText>
              </>
            )}
          </View>
          <ChevronDown size={20} color={driverColors.grey} strokeWidth={2.2} />
        </Pressable>
      ) : (
        <View style={styles.vehiclesList}>
          {eligibleDrivers.slice(0, COLLAPSED_LIST_LIMIT).map(member => {
            const driver = member.driver!;
            const selected = driverId === driver.id;
            const available = driver.isAvailable && !driver.isBusy;
            return (
              <Pressable
                key={member.id}
                accessibilityRole="radio"
                accessibilityLabel={driver.name + (available ? ', Available' : ', Busy')}
                accessibilityState={{ selected, disabled: !available }}
                onPress={() => available && setDriverId(driver.id)}
                disabled={!available}
                style={({ pressed }) => [
                  styles.optionCard,
                  selected && styles.optionCardSelected,
                  !available && styles.optionCardUnavailable,
                  getPressableFeedback(pressed),
                ]}>
                <View style={styles.artworkCircle}>
                  <UserRound size={25} color={driverColors.amberText} />
                </View>
                <View style={styles.optionCopy}>
                  <View style={styles.cardTopRow}>
                    <PartnerText style={styles.optionPlate}>{driver.name}</PartnerText>
                    <View style={styles.availabilityRow}>
                      <View style={[styles.availableDot, !available && styles.unavailableDot]} />
                      <PartnerText style={[styles.availableLabel, !available && styles.unavailableLabel]}>
                        {available ? 'Available' : driver.isBusy ? 'On a job' : 'Offline'}
                      </PartnerText>
                    </View>
                  </View>
                  <PartnerText style={styles.optionMeta}>{driver.phone}</PartnerText>
                  <PartnerText style={styles.optionMeta}>
                    {driver.driverType + (driver.city ? ' · ' + driver.city : '')}
                  </PartnerText>
                </View>
                <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                  {selected ? <Check size={14} color={driverColors.white} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
          {eligibleDrivers.length > COLLAPSED_LIST_LIMIT ? (
            <Pressable style={styles.showAllBtn} onPress={() => { setPickerQuery(''); setDriverPickerOpen(true); }}>
              <PartnerText style={styles.showAllText}>Show all {eligibleDrivers.length} drivers</PartnerText>
              <ChevronDown size={16} color={driverColors.ink} strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </View>
      )}
    </PartnerScreenLayout>

    {/* Vehicle picker modal (search + availability filter) */}
    <Modal visible={vehiclePickerOpen} transparent animationType="slide" onRequestClose={() => setVehiclePickerOpen(false)}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setVehiclePickerOpen(false)} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeaderRow}>
            <PartnerText style={styles.pickerTitle}>Select fleet tow truck</PartnerText>
            <Pressable hitSlop={8} onPress={() => setVehiclePickerOpen(false)} style={styles.pickerClose}>
              <X size={18} color={driverColors.grey} strokeWidth={2.3} />
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <Search size={16} color={driverColors.grey} strokeWidth={2.2} />
            <PartnerTextInput
              value={pickerQuery}
              onChangeText={setPickerQuery}
              placeholder="Search plate, model, type…"
              style={styles.searchInput}
              placeholderTextColor={driverColors.grey}
            />
          </View>
          <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pickerListContent}>
            {vehicles
              .filter(vehicle => {
                if (!vehicleQuery) return true;
                return [vehicle.registrationNo, vehicle.model, vehicle.type]
                  .join(' ').toLowerCase().includes(vehicleQuery);
              })
              .map(vehicle => {
                const selected = vehicleId === vehicle.id;
                const available = !reservedVehicleIds.has(vehicle.id);
                return (
                  <Pressable
                    key={vehicle.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, disabled: !available }}
                    onPress={() => { if (available) { setVehicleId(vehicle.id); setVehiclePickerOpen(false); } }}
                    disabled={!available}
                    style={({ pressed }) => [
                      styles.pickerRow,
                      selected && styles.pickerRowSelected,
                      !available && styles.optionCardUnavailable,
                      getPressableFeedback(pressed),
                    ]}>
                    <View style={styles.pickerArtwork}>
                      <Image source={images.icons.truck} style={styles.vehicleArtworkSmall} resizeMode="contain" />
                    </View>
                    <View style={styles.optionCopy}>
                      <PartnerText style={styles.optionPlate}>{vehicle.registrationNo}</PartnerText>
                      <PartnerText style={styles.optionMeta} numberOfLines={1}>
                        {vehicle.model} · {vehicle.type}
                      </PartnerText>
                      <View style={styles.availabilityRow}>
                        <View style={[styles.availableDot, !available && styles.unavailableDot]} />
                        <PartnerText style={[styles.availableLabel, !available && styles.unavailableLabel]}>
                          {available ? 'Available' : 'In service'}
                        </PartnerText>
                      </View>
                    </View>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected ? <Check size={14} color={driverColors.white} strokeWidth={3} /> : null}
                    </View>
                  </Pressable>
                );
              })}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Driver picker modal (search + availability) */}
    <Modal visible={driverPickerOpen} transparent animationType="slide" onRequestClose={() => setDriverPickerOpen(false)}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setDriverPickerOpen(false)} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeaderRow}>
            <PartnerText style={styles.pickerTitle}>Select connected driver</PartnerText>
            <Pressable hitSlop={8} onPress={() => setDriverPickerOpen(false)} style={styles.pickerClose}>
              <X size={18} color={driverColors.grey} strokeWidth={2.3} />
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <Search size={16} color={driverColors.grey} strokeWidth={2.2} />
            <PartnerTextInput
              value={pickerQuery}
              onChangeText={setPickerQuery}
              placeholder="Search name or phone…"
              style={styles.searchInput}
              placeholderTextColor={driverColors.grey}
            />
          </View>
          <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pickerListContent}>
            {eligibleDrivers
              .filter(member => {
                if (!pickerQuery.trim()) return true;
                const driver = member.driver!;
                return [driver.name, driver.phone, driver.driverType, driver.city]
                  .join(' ').toLowerCase().includes(pickerQuery.trim().toLowerCase());
              })
              .map(member => {
                const driver = member.driver!;
                const selected = driverId === driver.id;
                const available = driver.isAvailable && !driver.isBusy;
                return (
                  <Pressable
                    key={member.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, disabled: !available }}
                    onPress={() => { if (available) { setDriverId(driver.id); setDriverPickerOpen(false); } }}
                    disabled={!available}
                    style={({ pressed }) => [
                      styles.pickerRow,
                      selected && styles.pickerRowSelected,
                      !available && styles.optionCardUnavailable,
                      getPressableFeedback(pressed),
                    ]}>
                    <View style={styles.pickerArtwork}>
                      <UserRound size={22} color={driverColors.amberText} />
                    </View>
                    <View style={styles.optionCopy}>
                      <PartnerText style={styles.optionPlate}>{driver.name}</PartnerText>
                      <PartnerText style={styles.optionMeta}>
                        {driver.phone} · {driver.driverType}
                      </PartnerText>
                      <View style={styles.availabilityRow}>
                        <View style={[styles.availableDot, !available && styles.unavailableDot]} />
                        <PartnerText style={[styles.availableLabel, !available && styles.unavailableLabel]}>
                          {available ? 'Available' : driver.isBusy ? 'On a job' : 'Offline'}
                        </PartnerText>
                      </View>
                    </View>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected ? <Check size={14} color={driverColors.white} strokeWidth={3} /> : null}
                    </View>
                  </Pressable>
                );
              })}
          </ScrollView>
        </View>
      </View>
    </Modal>
    {partnerDialog}
    </View>
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
    marginBottom: 10,
  },
  bookingArtworkWrap: {
    width: 78,
    height: 66,
    borderRadius: 14,
    backgroundColor: '#FFF1CE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bookingArtwork: {
    width: 72,
    height: 58,
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
  routeBlock: {
    backgroundColor: '#FAFBFC',
    borderRadius: 14,
    padding: 12,
  },
  routeLines: {
    flexDirection: 'row',
    gap: 10,
  },
  routeDots: {
    alignItems: 'center',
    paddingTop: 4,
    gap: 6,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeDotPickup: {
    backgroundColor: '#2563EB',
  },
  routeDotDrop: {
    backgroundColor: driverColors.amber,
  },
  routeLink: {
    width: 2,
    flex: 1,
    minHeight: 18,
    backgroundColor: '#D8DEE7',
  },
  routeCopy: {
    flex: 1,
    gap: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  routeTag: {
    width: 52,
    marginTop: 1,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#2563EB',
  },
  routeTagDrop: {
    color: '#B45309',
  },
  locationText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    color: driverColors.ink,
  },
  fareStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: driverColors.hairline,
  },
  fareLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
  sectionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: driverColors.grey,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
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
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 11,
    borderWidth: 1.5,
    borderColor: driverColors.hairline,
    minHeight: 92,
  },
  showAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    backgroundColor: driverColors.white,
  },
  showAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: driverColors.ink,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,12,18,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: driverColors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '82%',
    paddingBottom: 18,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: driverColors.ink,
  },
  pickerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F3F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    backgroundColor: '#FAFBFC',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: driverColors.ink,
    paddingVertical: 0,
  },
  pickerList: {
    flexGrow: 0,
  },
  pickerListContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: driverColors.hairline,
    borderRadius: 14,
    padding: 10,
    backgroundColor: driverColors.white,
  },
  pickerRowSelected: {
    borderColor: driverColors.amber,
    backgroundColor: '#FFFBEB',
  },
  pickerArtwork: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#FFF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vehicleArtworkSmall: {
    width: 42,
    height: 38,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 11,
    borderWidth: 1.5,
    borderColor: driverColors.hairline,
    minHeight: 96,
  },
  optionCardSelected: {
    borderColor: driverColors.amber,
    backgroundColor: driverColors.white,
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
    width: 66,
    height: 60,
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
  pressedFab: {
    opacity: 0.9,
  },
  pressed: {
    opacity: 0.85,
  },
});
