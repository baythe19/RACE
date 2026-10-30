import { getPhoneDigits } from './phone';

export type EmergencyContactLike = {
  name?: string;
  mobileNumber?: string;
  relationship?: string;
};

export function emergencyContactDigits(contact?: EmergencyContactLike | null): string {
  return getPhoneDigits(contact?.mobileNumber ?? '');
}

/** True when profile/API has a real 10-digit Indian emergency contact. */
export function hasSavedEmergencyContact(contact?: EmergencyContactLike | null): boolean {
  const name = contact?.name?.trim() ?? '';
  return name.length >= 2 && emergencyContactDigits(contact).length === 10;
}

export function formatEmergencyPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length > 0 && !raw.trim().startsWith('+')) {
    return `+${digits}`;
  }
  return raw.trim();
}

export function telUriForDigits(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length === 10) return `tel:+91${d}`;
  if (d.length === 12 && d.startsWith('91')) return `tel:+${d}`;
  if (d.length > 0) return `tel:${d}`;
  return '';
}
