import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Building2,
  ChevronRight,
  Home,
  Map,
  MapPin,
  Search,
  Trash2,
} from 'lucide-react-native';

import FormField from '../../components/auth/FormField';
import LocationPickerModal, {
  type LocationPickerInitialMode,
} from '../../components/common/LocationPickerModal';
import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import DataSkeleton from '../../components/ui/DataSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { FORM_PLACEHOLDER_COLOR } from '../../constants/profileForm';
import { useAppDialog } from '../../hooks/useAppDialog';
import { getApiErrorMessage } from '../../services/api';
import {
  useCreateLocationMutation,
  useDeleteLocationMutation,
  useSavedLocationsQuery,
  useUpdateLocationMutation,
} from '../../services/profile/useProfileQueries';
import type { SavedLocation, SavedLocationType } from '../../types/profile';
import { formatLocationDisplay } from '../../utils/readableAddress';
import { colors, radius, shadows, typography } from '../../theme';

const ICONS = { home: Home, office: Building2, custom: MapPin } as const;

const TYPE_OPTIONS: Array<{ id: SavedLocationType; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'office', label: 'Office' },
  { id: 'custom', label: 'Other' },
];

export default function SavedLocationsScreen() {
  const px = useProfilePx();
  const { dialog, showDialog } = useAppDialog();
  const { data: locations = [], isLoading, isError, error, refetch } = useSavedLocationsQuery();
  const createLocation = useCreateLocationMutation();
  const updateLocation = useUpdateLocationMutation();
  const deleteLocation = useDeleteLocationMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [type, setType] = useState<SavedLocationType>('home');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pickerInitialMode, setPickerInitialMode] = useState<LocationPickerInitialMode>('map');

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setLabel('');
    setAddress('');
    setLatitude(undefined);
    setLongitude(undefined);
    setType('home');
    setShowLocationPicker(false);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (location: SavedLocation) => {
    setEditingId(location.id);
    setLabel(location.label);
    setAddress(location.address);
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    setType(location.type);
    setShowForm(true);
  };

  const openPicker = (mode: LocationPickerInitialMode) => {
    setPickerInitialMode(mode);
    setShowLocationPicker(true);
  };

  const handleSave = () => {
    if (createLocation.isPending || updateLocation.isPending) return;
    if (!label.trim()) {
      showDialog({
        tone: 'warning',
        title: 'Add a label',
        message: 'Give this place a name, like Home or Office.',
        primaryLabel: 'OK',
      });
      return;
    }
    if (!address.trim() || latitude == null || longitude == null) {
      showDialog({
        tone: 'warning',
        title: 'Pick a location',
        message: 'Use the map or search to pin the exact address.',
        primaryLabel: 'OK',
      });
      return;
    }

    const payload = {
      label: label.trim(),
      address: address.trim(),
      type,
      latitude,
      longitude,
    };

    if (editingId) {
      updateLocation.mutate(
        { id: editingId, payload },
        {
          onSuccess: resetForm,
          onError: err =>
            showDialog({
              tone: 'error',
              title: 'Update failed',
              message: getApiErrorMessage(err),
              primaryLabel: 'OK',
            }),
        },
      );
      return;
    }

    createLocation.mutate(payload, {
      onSuccess: resetForm,
      onError: err =>
        showDialog({
          tone: 'error',
          title: 'Add failed',
          message: getApiErrorMessage(err),
          primaryLabel: 'OK',
        }),
    });
  };

  const handleDelete = (location: SavedLocation) => {
    if (deleteLocation.isPending) return;
    showDialog({
      tone: 'danger',
      title: 'Delete location',
      message: `Remove "${location.label}"?`,
      secondaryLabel: 'Cancel',
      primaryLabel: 'Delete',
      destructive: true,
      onPrimary: () => {
        if (deleteLocation.isPending) return;
        deleteLocation.mutate(location.id, {
          onError: err =>
            showDialog({
              tone: 'error',
              title: 'Delete failed',
              message: getApiErrorMessage(err),
              primaryLabel: 'OK',
            }),
        });
      },
    });
  };

  const isSaving = createLocation.isPending || updateLocation.isPending;
  const hasPinnedLocation = Boolean(address.trim() && latitude != null && longitude != null);
  const isEmpty = locations.length === 0;

  const formCard = showForm ? (
    <View
      style={[
        {
          borderRadius: px(radius.lg),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          padding: px(16),
          marginBottom: px(16),
          gap: px(14),
        },
        shadows.card,
      ]}>
      <Text style={{ fontSize: px(16), fontWeight: typography.weights.bold, color: colors.dark }}>
        {editingId ? 'Edit place' : 'Add a place'}
      </Text>
      <Text style={{ fontSize: px(12), color: colors.grey, lineHeight: px(17), marginTop: px(-6) }}>
        Pin on the map or search, then name it for quick booking.
      </Text>

      <View style={{ gap: px(8) }}>
        <Text
          style={{
            fontSize: px(12),
            fontWeight: typography.weights.bold,
            color: colors.grey,
            letterSpacing: 0.3,
          }}>
          LOCATION
        </Text>
        {hasPinnedLocation ? (
          <Pressable onPress={() => openPicker('map')}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: px(12),
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: px(12),
                backgroundColor: colors.pageBg,
                padding: px(12),
              }}>
              <View
                style={{
                  width: px(40),
                  height: px(40),
                  borderRadius: px(12),
                  backgroundColor: 'rgba(255,195,38,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                <MapPin size={px(20)} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: px(14),
                    fontWeight: typography.weights.bold,
                    color: colors.dark,
                    marginBottom: px(4),
                  }}
                  numberOfLines={2}>
                  {formatLocationDisplay(address)}
                </Text>
                <Text style={{ fontSize: px(12), color: colors.primary, fontWeight: typography.weights.semibold }}>
                  Change on map
                </Text>
              </View>
              <ChevronRight size={px(18)} color={colors.grey} style={{ marginTop: px(4) }} />
            </View>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={() => openPicker('map')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(12),
                borderWidth: 1.5,
                borderColor: colors.primary,
                borderRadius: px(12),
                backgroundColor: pressed ? 'rgba(255,195,38,0.08)' : colors.background,
                paddingHorizontal: px(14),
                minHeight: px(54),
              })}>
              <View
                style={{
                  width: px(40),
                  height: px(40),
                  borderRadius: px(12),
                  backgroundColor: 'rgba(255,195,38,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Map size={px(20)} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.dark }}>
                  Pick on map
                </Text>
                <Text style={{ fontSize: px(11), color: colors.grey, marginTop: px(2) }}>
                  Drag, long-press, or drop the pin
                </Text>
              </View>
              <ChevronRight size={px(18)} color={colors.grey} />
            </Pressable>
            <Pressable
              onPress={() => openPicker('search')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(12),
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: px(12),
                backgroundColor: pressed ? colors.pageBg : colors.background,
                paddingHorizontal: px(14),
                minHeight: px(50),
              })}>
              <View
                style={{
                  width: px(40),
                  height: px(40),
                  borderRadius: px(12),
                  backgroundColor: colors.pageBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Search size={px(18)} color={colors.grey} strokeWidth={2.2} />
              </View>
              <Text style={{ flex: 1, fontSize: px(14), color: colors.grey }}>Search address</Text>
              <ChevronRight size={px(18)} color={colors.grey} />
            </Pressable>
          </>
        )}
      </View>

      <FormField
        variant="outlined"
        compact
        scale={1}
        label="Label"
        required
        Icon={MapPin}
        value={label}
        placeholder="e.g. Home, Office, Gym"
        placeholderTextColor={FORM_PLACEHOLDER_COLOR}
        onChangeText={setLabel}
      />

      <View style={{ gap: px(8) }}>
        <Text style={{ fontSize: px(12), fontWeight: typography.weights.bold, color: colors.grey }}>TYPE</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: px(8) }}>
          {TYPE_OPTIONS.map(option => {
            const selected = type === option.id;
            const ChipIcon = ICONS[option.id];
            return (
              <Pressable
                key={option.id}
                onPress={() => setType(option.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: px(6),
                  paddingHorizontal: px(14),
                  paddingVertical: px(9),
                  borderRadius: px(999),
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? 'rgba(255,195,38,0.12)' : colors.background,
                }}>
                <ChipIcon size={px(14)} color={selected ? colors.primary : colors.grey} strokeWidth={2.2} />
                <Text
                  style={{
                    fontSize: px(12),
                    fontWeight: selected ? typography.weights.bold : typography.weights.regular,
                    color: colors.dark,
                  }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: px(10), marginTop: px(4) }}>
        <Pressable
          onPress={resetForm}
          style={{
            flex: 1,
            paddingVertical: px(13),
            borderRadius: px(radius.md),
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
          }}>
          <Text style={{ fontWeight: typography.weights.bold, color: colors.grey }}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={{
            flex: 1,
            paddingVertical: px(13),
            borderRadius: px(radius.md),
            backgroundColor: isSaving ? colors.grey : colors.primary,
            alignItems: 'center',
          }}>
          <Text style={{ fontWeight: typography.weights.bold, color: colors.dark }}>
            {isSaving ? 'Saving…' : 'Save place'}
          </Text>
        </Pressable>
      </View>
    </View>
  ) : null;

  const addPlaceTrigger = !showForm ? (
    <Pressable
      onPress={openAdd}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: px(12),
          borderRadius: px(radius.lg),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.pageBg : colors.background,
          padding: px(14),
          marginBottom: px(16),
        },
        shadows.card,
      ]}>
      <View
        style={{
          width: px(44),
          height: px(44),
          borderRadius: px(14),
          backgroundColor: 'rgba(255,195,38,0.14)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MapPin size={px(22)} color={colors.primary} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: px(15), fontWeight: typography.weights.bold, color: colors.dark }}>
          Add a place
        </Text>
        <Text style={{ fontSize: px(12), color: colors.grey, marginTop: px(2) }}>
          Map pin or search — save for faster bookings
        </Text>
      </View>
      <ChevronRight size={px(20)} color={colors.grey} />
    </Pressable>
  ) : null;

  return (
    <ProfileSubScreenLayout title="Saved Locations">
      {dialog}
      {isLoading ? (
        <DataSkeleton variant="list" />
      ) : (
        <>
          {isError ? (
            <View
              style={{
                borderRadius: px(14),
                borderWidth: 1,
                borderColor: 'rgba(245,166,35,0.35)',
                backgroundColor: colors.goldLight,
                padding: px(14),
                marginBottom: px(14),
                gap: px(8),
              }}>
              <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.dark }}>
                Couldn&apos;t sync saved places
              </Text>
              <Text style={{ fontSize: px(12), color: colors.grey, lineHeight: px(17) }}>
                {getApiErrorMessage(error, 'Unable to load saved locations')}
              </Text>
              <Pressable onPress={() => void refetch()} style={{ alignSelf: 'flex-start' }}>
                <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.primary }}>
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : null}

          {showForm ? formCard : null}

          {!showForm && isEmpty ? (
            <View style={{ marginTop: px(8), marginBottom: px(8) }}>
              <EmptyState
                icon="location-outline"
                title="No saved places yet"
                subtitle="Save home, office, or frequent stops — use them in one tap when you book."
                fill
              />
              <PrimaryButton label="Add your first place" onPress={openAdd} />
            </View>
          ) : null}

          {!isEmpty ? (
            <>
              {!showForm ? addPlaceTrigger : null}
              {locations.map(location => {
                const Icon = ICONS[location.type] ?? MapPin;
                return (
                  <View
                    key={location.id}
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: px(12),
                        borderRadius: px(14),
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        padding: px(14),
                        marginBottom: px(10),
                      },
                      shadows.card,
                    ]}>
                    <View
                      style={{
                        width: px(40),
                        height: px(40),
                        borderRadius: px(20),
                        backgroundColor: colors.goldLight,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                      <Icon size={px(18)} color={colors.primary} strokeWidth={2.2} />
                    </View>
                    <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => openEdit(location)}>
                      <Text
                        style={{
                          fontSize: px(14),
                          fontWeight: typography.weights.bold,
                          color: colors.dark,
                          marginBottom: px(2),
                        }}>
                        {location.label}
                      </Text>
                      <Text numberOfLines={2} style={{ fontSize: px(11), color: colors.grey, lineHeight: px(15) }}>
                        {formatLocationDisplay(location.address)}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(location)}
                      hitSlop={8}
                      disabled={deleteLocation.isPending}>
                      <Trash2
                        size={px(18)}
                        color={deleteLocation.isPending ? colors.grey : colors.error}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </>
          ) : null}

          <LocationPickerModal
            visible={showLocationPicker}
            title="Pin this place"
            confirmLabel="Use this location"
            initialMode={pickerInitialMode}
            initialLocation={
              latitude != null && longitude != null ? { latitude, longitude, address } : undefined
            }
            onClose={() => setShowLocationPicker(false)}
            onLocationSelected={location => {
              setAddress(location.address);
              setLatitude(location.latitude);
              setLongitude(location.longitude);
              setShowLocationPicker(false);
            }}
          />
        </>
      )}
    </ProfileSubScreenLayout>
  );
}
