/** Format Indian vehicle number for display, e.g. OD02AB1234 → OD 02 AB 1234 */
export function formatVehicleNumber(value: string): string {
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  const match = cleaned.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  }
  return cleaned;
}

export function normalizeVehicleNumberInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/** Indian registration plate (e.g. OD02AB1234). Used on SOS to avoid showing junk test strings. */
export function isValidIndianVehicleRegistration(value: string): boolean {
  const cleaned = normalizeVehicleNumberInput(value);
  if (cleaned.length < 6 || cleaned.length > 12) return false;
  return /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/.test(cleaned);
}
