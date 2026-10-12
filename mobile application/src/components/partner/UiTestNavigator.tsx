import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  ChevronRight,
  Compass,
  Layers,
  Sparkles,
  Truck,
  Users,
  X,
  Zap,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  UI_PREVIEW_MODE,
  isUiTestPermissiveMode,
  setUiTestPermissiveMode,
  subscribeUiTestPermissiveMode,
} from '../../constants/preview';
import {
  loginAsMockDriver,
  loginAsMockVendor,
} from '../../config/uiPreviewMode';
import {
  jumpToDriverVerificationGate,
  jumpToPartnerAccountScreen,
  jumpToPartnerAuth,
  jumpToPartnerMainTab,
  jumpToPartnerRegistration,
  openDriverActiveJob,
  partnerNavigationRef,
} from '../../navigation/partnerNavigationRef';
import { driverColors, driverRadius } from '../../theme/driverUi';

export default function UiTestNavigator() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const isDriver = user?.role === 'driver';
  const isVendor = user?.role === 'vendor';

  const [modalVisible, setModalVisible] = useState(false);
  const [permissiveMode, setPermissiveMode] = useState(isUiTestPermissiveMode());

  useEffect(() => {
    return subscribeUiTestPermissiveMode(enabled => {
      setPermissiveMode(enabled);
    });
  }, []);

  if (!UI_PREVIEW_MODE) return null;

  const togglePermissive = (val: boolean) => {
    setPermissiveMode(val);
    setUiTestPermissiveMode(val);
  };

  const ensureDriverAndNavigate = async (action: () => void) => {
    setModalVisible(false);
    if (!isDriver) {
      await loginAsMockDriver(dispatch);
    }
    setTimeout(() => {
      action();
    }, 120);
  };

  const ensureVendorAndNavigate = async (action: () => void) => {
    setModalVisible(false);
    if (!isVendor) {
      await loginAsMockVendor(dispatch);
    }
    setTimeout(() => {
      action();
    }, 120);
  };

  return (
    <>
      {/* Floating QA Pill */}
      <View
        pointerEvents="box-none"
        style={[
          styles.floatingWrapper,
          { bottom: Math.max(20, insets.bottom + 65) },
        ]}>
        <Pressable
          style={styles.floatingButton}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open UI QA Navigator">
          <Zap size={14} color="#000000" strokeWidth={3} />
          <Text style={styles.floatingText}>UI QA</Text>
        </Pressable>
      </View>

      {/* Screen Navigator Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: Math.max(24, insets.bottom + 12) },
            ]}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleGroup}>
                <Sparkles size={18} color={driverColors.amber} strokeWidth={2.4} />
                <Text style={styles.sheetTitle}>UI QA Screen Navigator</Text>
              </View>
              <Pressable
                hitSlop={12}
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}>
                <X size={20} color={driverColors.ink} strokeWidth={2.4} />
              </Pressable>
            </View>

            {/* Permissive Mode Toggle Banner */}
            <View style={styles.toggleBanner}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>Permissive Testing Mode</Text>
                <Text style={styles.toggleSubtitle}>
                  {permissiveMode
                    ? 'Bypasses required forms, pre-fills defaults on Next/Submit.'
                    : 'Strict validation enabled.'}
                </Text>
              </View>
              <Switch
                value={permissiveMode}
                onValueChange={togglePermissive}
                trackColor={{ false: '#D1D5DB', true: driverColors.amber }}
                thumbColor="#FFFFFF"
              />
            </View>

            <ScrollView
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}>
              {/* Role Fast Switchers */}
              <Text style={styles.groupHeading}>1-Tap Role Switcher</Text>
              <View style={styles.chipsRow}>
                <Pressable
                  style={[styles.roleChip, isDriver && styles.roleChipActive]}
                  onPress={async () => {
                    await loginAsMockDriver(dispatch);
                    jumpToPartnerMainTab('PartnerHome');
                    setModalVisible(false);
                  }}>
                  <Truck size={14} color={isDriver ? '#000000' : driverColors.grey} />
                  <Text style={[styles.roleChipText, isDriver && styles.roleChipTextActive]}>
                    Driver Mode
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.roleChip, isVendor && styles.roleChipActive]}
                  onPress={async () => {
                    await loginAsMockVendor(dispatch);
                    jumpToPartnerMainTab('PartnerHome');
                    setModalVisible(false);
                  }}>
                  <Users size={14} color={isVendor ? '#000000' : driverColors.grey} />
                  <Text style={[styles.roleChipText, isVendor && styles.roleChipTextActive]}>
                    Vendor Mode
                  </Text>
                </Pressable>
              </View>

              {/* Driver Screens */}
              <Text style={styles.groupHeading}>Driver Flow (1-Tap Jump)</Text>
              <View style={styles.menuGroup}>
                <JumpRow
                  label="1. Welcome Screen"
                  sub="Role selector entry point"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerAuth('PartnerWelcome');
                  }}
                />
                <JumpRow
                  label="2. Driver Registration: Personal Info"
                  sub="Step 1: Name, DOB, City, Address"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerRegistration('driver', 'DriverPersonalInfo');
                  }}
                />
                <JumpRow
                  label="3. Driver Registration: Vehicle Info"
                  sub="Step 2: Vehicle Type, Registration, Model"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerRegistration('driver', 'DriverVehicleInfo');
                  }}
                />
                <JumpRow
                  label="4. Driver Registration: Documents"
                  sub="Step 3: DL, Aadhaar, RC, Permit"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerRegistration('driver', 'DriverDocuments');
                  }}
                />
                <JumpRow
                  label="5. Driver Registration: Review & Submit"
                  sub="Step 4: Summary card & final submission"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerRegistration('driver', 'DriverReview');
                  }}
                />
                <JumpRow
                  label="6. Driver Verification Gate"
                  sub="Under-review status with step tracker"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToDriverVerificationGate();
                  }}
                />
                <JumpRow
                  label="7. Driver Dashboard"
                  sub="Live status, availability toggle & KPIs"
                  onPress={() =>
                    ensureDriverAndNavigate(() => jumpToPartnerMainTab('PartnerHome'))
                  }
                />
                <JumpRow
                  label="8. Driver Jobs List"
                  sub="Filters (All, Available, Active, Done)"
                  onPress={() =>
                    ensureDriverAndNavigate(() => jumpToPartnerMainTab('PartnerJobs'))
                  }
                />
                <JumpRow
                  label="9. Driver Active Job"
                  sub="4-step trip execution & OTP verification"
                  onPress={() =>
                    ensureDriverAndNavigate(() => openDriverActiveJob('mock-job-01', 'towing'))
                  }
                />
              </View>

              {/* Vendor Screens */}
              <Text style={styles.groupHeading}>Vendor Flow (1-Tap Jump)</Text>
              <View style={styles.menuGroup}>
                <JumpRow
                  label="1. Vendor Registration: Business Info"
                  sub="Step 1: Business name, owner, type"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerRegistration('vendor', 'VendorBusinessInfo');
                  }}
                />
                <JumpRow
                  label="2. Vendor Registration: Address"
                  sub="Step 2: Operating address & PIN code"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerRegistration('vendor', 'VendorBusinessAddress');
                  }}
                />
                <JumpRow
                  label="3. Vendor Registration: Documents"
                  sub="Step 3: GST, PAN, Trade license"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerRegistration('vendor', 'VendorDocuments');
                  }}
                />
                <JumpRow
                  label="4. Vendor Registration: Review & Submit"
                  sub="Step 4: Agreement & business summary"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerRegistration('vendor', 'VendorReview');
                  }}
                />
                <JumpRow
                  label="5. Vendor Home"
                  sub="Incoming leads card, fleet KPIs & actions"
                  onPress={() =>
                    ensureVendorAndNavigate(() => jumpToPartnerMainTab('PartnerHome'))
                  }
                />
                <JumpRow
                  label="6. Vendor Leads & Jobs"
                  sub="Triage incoming booking requests"
                  onPress={() =>
                    ensureVendorAndNavigate(() => jumpToPartnerMainTab('PartnerJobs'))
                  }
                />
                <JumpRow
                  label="7. Vendor Assign Job"
                  sub="Select vehicle & dispatch to driver"
                  onPress={() =>
                    ensureVendorAndNavigate(() =>
                      jumpToPartnerAccountScreen('VendorAssignJob', {
                        bookingId: 'lead-101',
                        bookingType: 'towing',
                        bookingNumber: 'TOW-10048',
                        serviceLabel: 'Flatbed Towing',
                        pickupAddress: 'Patia Square, Bhubaneswar',
                        estimatedFare: 1650,
                      }),
                    )
                  }
                />
                <JumpRow
                  label="8. Manage Drivers"
                  sub="Fleet driver roster & credentials"
                  onPress={() =>
                    ensureVendorAndNavigate(() =>
                      jumpToPartnerAccountScreen('VendorDrivers'),
                    )
                  }
                />
                <JumpRow
                  label="9. Manage Vehicles"
                  sub="Tow truck fleet & maintenance status"
                  onPress={() =>
                    ensureVendorAndNavigate(() =>
                      jumpToPartnerAccountScreen('VendorVehicles'),
                    )
                  }
                />
                <JumpRow
                  label="10. Verification Status"
                  sub="Document review stages & badge"
                  onPress={() =>
                    ensureVendorAndNavigate(() =>
                      jumpToPartnerAccountScreen('VendorVerificationStatus'),
                    )
                  }
                />
              </View>

              {/* Shared Account Subsystem */}
              <Text style={styles.groupHeading}>Account & Profile Subsystem</Text>
              <View style={styles.menuGroup}>
                <JumpRow
                  label="Account Hub"
                  sub="Profile metrics & quick navigation"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerMainTab('PartnerAccount');
                  }}
                />
                <JumpRow
                  label="Edit Profile"
                  sub="Avatar upload, personal details"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerAccountScreen('PartnerEditProfile');
                  }}
                />
                <JumpRow
                  label="Vehicle Info"
                  sub="Vehicle artwork, plate & RC"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerAccountScreen('PartnerVehicleInfo');
                  }}
                />
                <JumpRow
                  label="Documents Hub"
                  sub="Required vs Optional documents"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerAccountScreen('PartnerDocuments');
                  }}
                />
                <JumpRow
                  label="Earnings & Payouts"
                  sub="Weekly chart, trips & payouts"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerAccountScreen('PartnerEarnings');
                  }}
                />
                <JumpRow
                  label="Notifications"
                  sub="Canonical inbox with category filters"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerAccountScreen('PartnerNotifications');
                  }}
                />
                <JumpRow
                  label="Settings"
                  sub="Language, preferences & legal"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerAccountScreen('PartnerSettings');
                  }}
                />
                <JumpRow
                  label="Help & Support"
                  sub="FAQs, 24x7 call & WhatsApp"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerAccountScreen('PartnerHelpSupport');
                  }}
                />
                <JumpRow
                  label="Bank Details"
                  sub="Masked account & automated payouts"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerAccountScreen('PartnerBankDetails');
                  }}
                />
                <JumpRow
                  label="Trip History"
                  sub="All, completed & cancelled trips"
                  onPress={() => {
                    setModalVisible(false);
                    jumpToPartnerAccountScreen('PartnerTripHistory');
                  }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function JumpRow({
  label,
  sub,
  onPress,
}: {
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.jumpRow, pressed && styles.jumpRowPressed]}
      onPress={onPress}>
      <View style={styles.jumpRowCopy}>
        <Text style={styles.jumpRowLabel}>{label}</Text>
        <Text style={styles.jumpRowSub}>{sub}</Text>
      </View>
      <ChevronRight size={16} color="#9CA3AF" strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    right: 14,
    zIndex: 99999,
    elevation: 99999,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: driverColors.amber,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 6,
  },
  floatingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: driverColors.ink,
  },
  closeBtn: {
    padding: 4,
  },
  toggleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFDF5',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  toggleCopy: {
    flex: 1,
    marginRight: 10,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: driverColors.ink,
  },
  toggleSubtitle: {
    fontSize: 11,
    color: driverColors.grey,
    marginTop: 2,
    lineHeight: 14,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  groupHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: driverColors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  roleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  roleChipActive: {
    backgroundColor: '#FEF3C7',
    borderColor: driverColors.amber,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.grey,
  },
  roleChipTextActive: {
    color: '#000000',
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  jumpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  jumpRowPressed: {
    backgroundColor: '#F9FAFB',
  },
  jumpRowCopy: {
    flex: 1,
    marginRight: 10,
  },
  jumpRowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.ink,
  },
  jumpRowSub: {
    fontSize: 11,
    color: driverColors.grey,
    marginTop: 2,
  },
});
