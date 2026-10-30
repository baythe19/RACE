import { getPhoneDigits } from './phone';

export type ProfileGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface UpdateProfileRequest {
  fullName: string;
  email?: string;
  gender: ProfileGender;
  dateOfBirth: string;
  emergencyContact: {
    name: string;
    mobileNumber: string;
    relationship?: string;
  };
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOB_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PINCODE_REGEX = /^\d{6}$/;

export function mapGender(value: string): ProfileGender {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'female' || normalized === 'other') {
    return normalized;
  }
  if (normalized === 'prefer not to say' || normalized === 'prefer_not_to_say') {
    return 'prefer_not_to_say';
  }
  return 'prefer_not_to_say';
}

/** API/profile date (YYYY-MM-DD) → display format DD/MM/YYYY. */
export function apiDateToDisplay(value: string | null | undefined): string {
  const iso = (value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!iso) return value ?? '';
  return `${iso[3]}/${iso[2]}/${iso[1]}`;
}

/** Normalize user input to API date format YYYY-MM-DD. */
export function normalizeDateOfBirth(value: string): string | null {
  const trimmed = value.trim();

  if (DOB_REGEX.test(trimmed)) {
    return trimmed;
  }

  const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) {
    return isoPrefix[1];
  }

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

export interface ProfileFormInput {
  fullName: string;
  email?: string;
  gender: string;
  dateOfBirth: string;
  emergencyPhone: string;
  emergencyName: string;
  emergencyRelationship: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export function validateProfileForm(input: ProfileFormInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (input.fullName.trim().length < 2) {
    errors.name = 'Please enter your full name';
  }
  const email = input.email?.trim() ?? '';
  if (email && !EMAIL_REGEX.test(email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!normalizeDateOfBirth(input.dateOfBirth)) {
    errors.dob = 'Use date format DD/MM/YYYY (e.g. 15/01/1990)';
  }

  if (input.emergencyName.trim().length < 2) {
    errors.emergencyName = 'Enter contact name (minimum 2 characters)';
  }

  const emergencyDigits = getPhoneDigits(input.emergencyPhone);
  if (emergencyDigits.length !== 10) {
    errors.emergencyPhone = 'Enter a valid 10-digit mobile number';
  }

  if (!input.emergencyRelationship.trim()) {
    errors.emergencyRelationship = 'Select a relationship';
  }

  if (!input.addressLine1.trim()) {
    errors.addressLine1 = 'Enter house / flat number';
  }
  if (!input.addressLine2.trim()) {
    errors.addressLine2 = 'Enter area or locality';
  }
  if (!input.city.trim()) {
    errors.city = 'Enter city';
  }
  if (!input.state.trim()) {
    errors.state = 'Enter state';
  }

  const pincode = input.pincode.trim();
  if (!PINCODE_REGEX.test(pincode)) {
    errors.pincode = 'Enter a valid 6-digit pincode';
  }

  return errors;
}

export function buildUpdateProfilePayload(input: ProfileFormInput): UpdateProfileRequest {
  const dateOfBirth = normalizeDateOfBirth(input.dateOfBirth);
  if (!dateOfBirth) {
    throw new Error('Use date format DD/MM/YYYY (e.g. 15/01/1990)');
  }

  const emergencyDigits = getPhoneDigits(input.emergencyPhone);

  const payload: UpdateProfileRequest = {
    fullName: input.fullName.trim(),
    gender: mapGender(input.gender),
    dateOfBirth,
    emergencyContact: {
      name: input.emergencyName.trim(),
      mobileNumber: emergencyDigits,
      relationship: input.emergencyRelationship.trim().toLowerCase(),
    },
    address: {
      line1: input.addressLine1.trim(),
      line2: input.addressLine2.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      pincode: input.pincode.trim(),
      country: input.country?.trim() || 'India',
    },
  };

  const email = input.email?.trim();
  if (email) {
    payload.email = email;
  }

  return sanitizeUpdateProfileRequest(payload);
}

/** Final gate — ensures PUT body matches backend Zod schema exactly. */
export function sanitizeUpdateProfileRequest(data: UpdateProfileRequest): UpdateProfileRequest {
  const dateOfBirth = normalizeDateOfBirth(data.dateOfBirth);
  if (!dateOfBirth) {
    throw new Error('dateOfBirth must be a valid date (DD/MM/YYYY)');
  }

  const email = data.email?.trim();
  if (email && !EMAIL_REGEX.test(email)) {
    throw new Error('Enter a valid email address');
  }

  const emergencyDigits = getPhoneDigits(data.emergencyContact.mobileNumber);
  if (emergencyDigits.length < 10 || emergencyDigits.length > 15) {
    throw new Error('emergencyContact.mobileNumber must be 10–15 digits');
  }

  const emergencyName = data.emergencyContact.name.trim();
  if (emergencyName.length < 2) {
    throw new Error('emergencyContact.name must be at least 2 characters');
  }

  const pincode = data.address.pincode.trim();
  if (!PINCODE_REGEX.test(pincode)) {
    throw new Error('address.pincode must be a 6-digit pincode');
  }

  return {
    fullName: data.fullName.trim(),
    ...(email ? { email } : {}),
    gender: mapGender(data.gender),
    dateOfBirth,
    emergencyContact: {
      name: emergencyName,
      mobileNumber: emergencyDigits,
      relationship: data.emergencyContact.relationship?.trim() || 'other',
    },
    address: {
      line1: data.address.line1.trim(),
      ...(data.address.line2?.trim() ? { line2: data.address.line2.trim() } : {}),
      city: data.address.city.trim(),
      state: data.address.state.trim(),
      pincode,
      country: data.address.country?.trim() || 'India',
    },
  };
}
