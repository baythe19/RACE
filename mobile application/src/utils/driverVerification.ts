/**
 * Driver verification (application review) — single source of truth.
 *
 * The attached driver board ("Your account is under verification") and the driver
 * dashboard verification card must never disagree, so both read this module.
 *
 * Every value is derived from `profile.driverProfile`, which the backend maps
 * from the same `driverProfile.status` field it gates driver endpoints on.
 * `profile.isVerified` is NOT used: it is set to true at registration and stays
 * true while the application is still pending.
 *
 * There is no per-step review API, so the tracker is derived honestly:
 *   - step 1 (submitted) is complete as soon as a driver record exists,
 *   - step 2 (under review) is the current step while the review is open,
 *   - step 3 (background check) only completes when the backend says the police
 *     verification passed — otherwise it stays pending,
 *   - step 4 (approved) completes only on a real APPROVED status.
 * A rejected/suspended account shows a red step instead of a completed one.
 */

import type { DriverDocumentStatus, DriverProfileSummary, Profile } from '../types/models';

export type DriverVerificationState =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'unknown';

export type DriverStepState = 'completed' | 'current' | 'pending' | 'rejected';

export interface DriverVerificationStep {
  id: 'submitted' | 'under_review' | 'background_check' | 'approved';
  label: string;
  state: DriverStepState;
}

export interface DriverApplicationDocument {
  type: string;
  label: string;
  status: DriverDocumentStatus;
}

export interface DriverVerificationSummary {
  state: DriverVerificationState;
  /** Only true on an explicit backend approval — safe to gate the online toggle on. */
  isApproved: boolean;
  /** True when the backend actually reported a driver record. */
  known: boolean;
  title: string;
  subtitle: string;
  /** Copy for the cream callout under the tracker. */
  note: string;
  badge: string;
  /** One-line copy for the dashboard verification card. */
  hint: string;
  steps: DriverVerificationStep[];
  submittedAt?: string;
  lastUpdatedAt?: string;
  decisionNote?: string;
  application: {
    driverCode?: string;
    driverType?: string;
    licenseNo?: string;
    city?: string;
    vehicleRegistration?: string;
    fleetSource?: 'vendor' | 'admin';
    backgroundCheck: DriverDocumentStatus;
    documents: DriverApplicationDocument[];
  };
}

const DOCUMENT_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar card',
  aadhar: 'Aadhaar card',
  pan: 'PAN card',
  driving_license: 'Driving licence',
  drivinglicence: 'Driving licence',
  license: 'Driving licence',
  licence: 'Driving licence',
  dl: 'Driving licence',
  rc: 'Vehicle RC',
  vehicle_rc: 'Vehicle RC',
  vehicle_registration: 'Vehicle RC',
  insurance: 'Vehicle insurance',
  vehicle_insurance: 'Vehicle insurance',
  selfie: 'Profile photo',
  profile_photo: 'Profile photo',
  photo: 'Profile photo',
  police_verification: 'Police verification',
  medical_certificate: 'Medical certificate',
  fitness_certificate: 'Fitness certificate',
  puc: 'PUC certificate',
  commercial_permit: 'Transport permit',
};

export function documentLabel(type: string): string {
  const key = type.trim().toLowerCase().replace(/\s+/g, '_');
  if (DOCUMENT_LABELS[key]) return DOCUMENT_LABELS[key];
  return key
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function documentStatusLabel(status: DriverDocumentStatus): string {
  if (status === 'VERIFIED') return 'Verified';
  if (status === 'REJECTED') return 'Rejected';
  return 'Pending';
}

function stepStateFor(status: DriverDocumentStatus): DriverStepState {
  if (status === 'VERIFIED') return 'completed';
  if (status === 'REJECTED') return 'rejected';
  return 'pending';
}

function buildSteps(profile: DriverProfileSummary | undefined, state: DriverVerificationState) {
  const background = isRejectedDriverState(state)
    ? 'rejected'
    : stepStateFor(profile?.policeVerificationStatus ?? 'PENDING');

  const ids = [
    { id: 'submitted' as const, label: 'Details submitted' },
    { id: 'under_review' as const, label: 'Under review' },
    { id: 'background_check' as const, label: 'Background check' },
    { id: 'approved' as const, label: 'Approved' },
  ];

  const states: DriverStepState[] = (() => {
    switch (state) {
      case 'approved':
        return ['completed', 'completed', 'completed', 'completed'];
      case 'rejected':
      case 'suspended':
        return ['completed', 'rejected', 'pending', 'pending'];
      case 'unknown':
        return ['pending', 'current', 'pending', 'pending'];
      default:
        return ['completed', 'current', background, 'pending'];
    }
  })();

  return ids.map((step, index) => ({ ...step, state: states[index] }));
}

function isRejectedDriverState(state: DriverVerificationState) {
  return state === 'rejected' || state === 'suspended';
}

function resolveState(profile?: DriverProfileSummary | null): DriverVerificationState {
  if (!profile) return 'unknown';
  switch (profile.status) {
    case 'APPROVED':
      return 'approved';
    case 'REJECTED':
      return 'rejected';
    case 'SUSPENDED':
      return 'suspended';
    case 'PENDING':
      return 'pending';
    default:
      return 'unknown';
  }
}

function stateCopy(state: DriverVerificationState) {
  switch (state) {
    case 'approved':
      return {
        title: 'Your account is approved',
        subtitle:
          'Your documents are verified. You can go online and start accepting jobs.',
        note: 'We keep your documents on file and will ask again when one expires.',
        badge: 'Approved',
        hint: 'Your partner account is active.',
      };
    case 'rejected':
      return {
        title: 'Your verification needs attention',
        subtitle:
          'Some details in your application were not approved. Update them and resubmit to go online.',
        note: 'Update the flagged details, then submit your application again for review.',
        badge: 'Action needed',
        hint: 'Update your details to get approved.',
      };
    case 'suspended':
      return {
        title: 'Your account is suspended',
        subtitle: 'Your account is on hold, so you cannot accept jobs right now.',
        note: 'Contact RACE support to resolve this and get your account back online.',
        badge: 'On hold',
        hint: 'Your account is on hold.',
      };
    case 'unknown':
      return {
        title: 'Checking your verification status',
        subtitle: "We couldn't read your application status just now.",
        note: 'Pull down to retry — your status is read from the RACE server.',
        badge: 'Unknown',
        hint: 'Verification status unavailable.',
      };
    default:
      return {
        title: 'Your account is under verification',
        subtitle:
          "We're reviewing your documents. You'll be notified once approved. You can still complete or update your details below.",
        note: 'This usually takes 24–48 hours. We\'ll notify you in the app.',
        badge: 'In review',
        hint: "We're reviewing your documents.",
      };
  }
}

export function buildDriverVerification(
  profile?: Profile | null,
): DriverVerificationSummary {
  const driver = profile?.driverProfile;
  const state = resolveState(driver);
  const copy = stateCopy(state);
  const statusHistory = driver?.statusHistory ?? [];
  const latest = statusHistory.length ? statusHistory[statusHistory.length - 1] : undefined;
  const decisionEntry = [...statusHistory]
    .reverse()
    .find(entry => entry.note && entry.note.trim().length > 0);

  return {
    state,
    isApproved: state === 'approved',
    known: Boolean(driver),
    ...copy,
    steps: buildSteps(driver, state),
    submittedAt: driver?.submittedAt ?? statusHistory[0]?.changedAt,
    lastUpdatedAt: latest?.changedAt,
    decisionNote:
      isRejectedDriverState(state) && decisionEntry?.note ? decisionEntry.note : undefined,
    application: {
      driverCode: driver?.driverCode,
      driverType: driver?.driverType,
      licenseNo: driver?.licenseNo,
      city: driver?.city,
      vehicleRegistration: driver?.vehicleRegistration,
      fleetSource: driver?.fleetSource,
      backgroundCheck: driver?.policeVerificationStatus ?? 'PENDING',
      documents: (driver?.documents ?? []).map(doc => ({
        type: doc.type,
        label: documentLabel(doc.type),
        status: doc.status,
      })),
    },
  };
}
