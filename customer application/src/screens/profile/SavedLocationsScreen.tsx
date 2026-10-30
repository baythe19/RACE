import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Building2, ChevronRight, Home, MapPin, Plus, Trash2 } from 'lucide-react-native';

import LocationPickerModal from '../../components/common/LocationPickerModal';
import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import DataSkeleton from '../../components/ui/DataSkeleton';
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
import { colors, shadows, typography } from '../../theme';

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

  const handleSave = () => {
    if (createLocation.isPending || updateLocation.isPending) return;
    if (!label.trim() || !address.trim()) {
      showDialog({
        tone: 'warning',
        title: 'Missing fields',
        message: 'Please enter a label and address.',
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

  return (
    <ProfileSubScreenLayout title="Saved Locations" subtitle="Your frequently used locations">
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
          ) : (
            <>
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

          {locations.length === 0 && !showForm ? (
            <Text style={{ fontSize: px(13), color: colors.grey, textAlign: 'center', marginBottom: px(16) }}>
              No saved locations yet
            </Text>
          ) : null}
            </>
          )}

      {showForm ? (
        <View
          style={{
            borderRadius: px(14),
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: colors.goldLight,
            padding: px(14),
            marginBottom: px(14),
            gap: px(10),
          }}>
          <Text style={{ fontSize: px(14), fontWeight: typography.weights.bold, color: colors.dark }}>
            {editingId ? 'Edit Location' : 'Add Location'}
          </Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Label (e.g. Home)"
            placeholderTextColor={colors.grey}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: px(10),
              padding: px(12),
              backgroundColor: colors.background,
              color: colors.dark,
            }}
          />
          <Pressable onPress={() => setShowLocationPicker(true)}>
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: px(10),
                padding: px(12),
                backgroundColor: colors.background,
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(10),
              }}>
              <MapPin size={px(18)} color={colors.primary} />
              <Text
                style={{
                  flex: 1,
                  fontSize: px(14),
                  color: address ? colors.dark : colors.grey,
                }}
                numberOfLines={3}>
                {address || 'Search address'}
              </Text>
              <ChevronRight size={px(18)} color={colors.grey} />
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: px(8) }}>
            {TYPE_OPTIONS.map(option => (
              <Pressable
                key={option.id}
                onPress={() => setType(option.id)}
                style={{
                  paddingHorizontal: px(12),
                  paddingVertical: px(8),
                  borderRadius: px(20),
                  borderWidth: 1,
                  borderColor: type === option.id ? colors.primary : colors.border,
                  backgroundColor: type === option.id ? colors.background : 'transparent',
                }}>
                <Text style={{ fontSize: px(12), color: colors.dark }}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: px(10) }}>
            <Pressable
              onPress={resetForm}
              style={{
                flex: 1,
                paddingVertical: px(12),
                borderRadius: px(10),
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
                paddingVertical: px(12),
                borderRadius: px(10),
                backgroundColor: isSaving ? colors.grey : colors.primary,
                alignItems: 'center',
              }}>
              <Text style={{ fontWeight: typography.weights.bold, color: colors.dark }}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={openAdd}
          style={{
            borderRadius: px(14),
            borderWidth: 1.5,
            borderColor: colors.primary,
            borderStyle: 'dashed',
            paddingVertical: px(22),
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: px(14),
          }}>
          <Plus size={px(26)} color={colors.primary} strokeWidth={2} />
          <Text
            style={{
              marginTop: px(6),
              fontSize: px(14),
              fontWeight: typography.weights.bold,
              color: colors.primary,
            }}>
            Add Location
          </Text>
        </Pressable>
      )}

      <LocationPickerModal
        visible={showLocationPicker}
        title="Confirm address"
        confirmLabel="Confirm address"
        initialLocation={
          latitude && longitude ? { latitude, longitude, address } : undefined
        }
        onClose={() => setShowLocationPicker(false)}
        onLocationSelected={location => {
          setAddress(location.address);
          setLatitude(location.latitude);
          setLongitude(location.longitude);
        }}
      />
        </>
      )}
    </ProfileSubScreenLayout>
  );
}
