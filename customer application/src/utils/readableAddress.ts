/**
 * Uniform short address for booking UI (pickup / drop / history / payment).
 * Prefers area + city over plot/block codes from Google formatted_address.
 */

const NOISE_PARTS = new Set([
  'india',
  'odisha',
  'orissa',
  'maharashtra',
  'karnataka',
  'delhi',
  'west bengal',
]);

function isNoisePart(part: string): boolean {
  const lower = part.toLowerCase();
  if (NOISE_PARTS.has(lower)) return true;
  if (/^\d{6}$/.test(part)) return true;
  if (/^[a-z\s]+ \d{6}$/i.test(part)) return true;
  return false;
}

/** House/plot codes — not useful as the main readable label. */
function isPlotOrBlockPart(part: string): boolean {
  const trimmed = part.trim();
  if (!trimmed) return true;
  if (/^block\s+[a-z0-9]+$/i.test(trimmed)) return true;
  if (/^[a-z]?\d+\/\d+$/i.test(trimmed)) return true;
  if (/^\d+\/\d+$/.test(trimmed)) return true;
  if (/^plot\s*(no\.?|number)?\s*\d+/i.test(trimmed)) return true;
  if (/^house\s*(no\.?|number)?\s*\d+/i.test(trimmed)) return true;
  if (/^flat\s*(no\.?|number)?\s*\d+/i.test(trimmed)) return true;
  if (/^door\s*(no\.?|number)?\s*\d+/i.test(trimmed)) return true;
  if (/^n\d+\/\d+/i.test(trimmed)) return true;
  return false;
}

function isReadableAreaPart(part: string): boolean {
  if (isNoisePart(part) || isPlotOrBlockPart(part)) return false;
  if (/^selected location$/i.test(part.trim())) return false;
  if (/^\d+$/.test(part)) return false;
  return part.length >= 2;
}

function splitAddressParts(address: string): string[] {
  return address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

export function formatReadableAddress(
  address: string | undefined | null,
  maxLen = 48,
): string {
  if (!address?.trim()) return '—';

  const parts = splitAddressParts(address);
  const cleaned = parts.filter(part => !isNoisePart(part));
  const areaParts = cleaned.filter(isReadableAreaPart);

  let result = '';

  if (areaParts.length >= 2) {
    // Google order is usually specific → broad; keep the last two (area + city).
    result = areaParts.slice(-2).join(', ');
  } else if (areaParts.length === 1) {
    result = areaParts[0];
  } else if (cleaned.length >= 2) {
    result = cleaned.slice(-2).join(', ');
  } else {
    result = cleaned[0] ?? parts[0] ?? address.trim();
  }

  if (/^selected location$/i.test(result.trim())) {
    return 'Pinned on map';
  }

  if (result.length > maxLen) {
    return `${result.slice(0, maxLen - 1).trim()}…`;
  }

  return result;
}

/**
 * Full address line for pickup/drop fields (keeps street/plot; drops country + pin only).
 */
export function formatBookingStopAddress(
  address: string | undefined | null,
  maxLen = 160,
): string {
  if (!address?.trim()) return '';

  const trimmed = address.trim();
  if (/^selected location$/i.test(trimmed)) return 'Pinned on map';

  const parts = splitAddressParts(trimmed).filter(part => {
    const lower = part.toLowerCase();
    if (lower === 'india') return false;
    if (/^\d{6}$/.test(part.trim())) return false;
    return true;
  });

  const result = parts.join(', ') || trimmed;
  if (result.length > maxLen) {
    return `${result.slice(0, maxLen - 1).trim()}…`;
  }
  return result;
}

export type BookingStopFieldInput = {
  address: string;
  placeholder: string;
  label?: string | null;
  hasCoordinates: boolean;
};

/** Label + filled flag for pickup/drop rows on location boards. */
export function resolveBookingStopField(input: BookingStopFieldInput): {
  filled: boolean;
  value: string;
} {
  const { address, placeholder, label, hasCoordinates } = input;

  const fromAddress = formatBookingStopAddress(address);
  if (fromAddress) {
    return { filled: true, value: fromAddress };
  }

  const labelTrim = label?.trim();
  if (labelTrim) {
    const fromLabel = formatBookingStopAddress(labelTrim) || labelTrim;
    return { filled: true, value: fromLabel };
  }

  const raw = address.trim();
  if (raw && raw !== placeholder) {
    return { filled: true, value: raw };
  }

  if (hasCoordinates) {
    return { filled: true, value: 'Pinned on map' };
  }

  return { filled: false, value: '' };
}

interface AddressComponentLike {
  long_name: string;
  types: string[];
}

function getComponent(components: AddressComponentLike[], type: string): string {
  return components.find(component => component.types.includes(type))?.long_name ?? '';
}

/** Build a human-friendly label from Google address components. */
export function buildReadableAddressLabel(
  formattedAddress: string,
  addressComponents: AddressComponentLike[] = [],
): string {
  const establishment =
    getComponent(addressComponents, 'establishment') ||
    getComponent(addressComponents, 'point_of_interest') ||
    getComponent(addressComponents, 'premise');

  const sublocality =
    getComponent(addressComponents, 'sublocality_level_1') ||
    getComponent(addressComponents, 'sublocality_level_2') ||
    getComponent(addressComponents, 'sublocality') ||
    getComponent(addressComponents, 'neighborhood');

  const locality =
    getComponent(addressComponents, 'locality') ||
    getComponent(addressComponents, 'administrative_area_level_2');

  const route = getComponent(addressComponents, 'route');

  if (establishment) {
    if (sublocality && sublocality !== establishment) {
      return formatReadableAddress(`${establishment}, ${sublocality}, ${locality}`);
    }
    if (locality && locality !== establishment) {
      return formatReadableAddress(`${establishment}, ${locality}`);
    }
    return formatReadableAddress(establishment);
  }

  if (sublocality && locality && sublocality !== locality) {
    return formatReadableAddress(`${sublocality}, ${locality}`);
  }

  if (route && sublocality) {
    return formatReadableAddress(`${route}, ${sublocality}`);
  }

  if (locality) {
    return formatReadableAddress(locality);
  }

  return formatReadableAddress(formattedAddress);
}

export function formatReadableLocation(
  address: string | undefined | null,
  displayLabel?: string | null,
  maxLen = 48,
): string {
  const label = displayLabel?.trim();
  if (label) {
    const cleaned = label
      .replace(/^Selected location,?\s*/i, '')
      .replace(/^Selected address,?\s*/i, '')
      .trim();
    const use = cleaned || label;
    if (use.length > maxLen) {
      return `${use.slice(0, maxLen - 1).trim()}…`;
    }
    return use;
  }
  return formatReadableAddress(address, maxLen);
}

export type LocationDisplayInput = {
  address?: string | null;
  label?: string | null;
  displayLabel?: string | null;
};

/** Single entry point for any location text shown in the app UI. */
export function formatLocationDisplay(
  input?: string | LocationDisplayInput | null,
  maxLen = 48,
): string {
  if (input == null) return '—';
  if (typeof input === 'string') {
    return formatReadableAddress(input, maxLen);
  }

  const displayLabel = input.displayLabel?.trim();
  const address = input.address?.trim();
  const label = input.label?.trim();

  if (displayLabel) {
    return formatReadableLocation(address || label, displayLabel, maxLen);
  }
  if (address) {
    return formatReadableAddress(address, maxLen);
  }
  if (label) {
    return formatReadableAddress(label, maxLen);
  }
  return '—';
}

export function getShortLocation(address: string, displayLabel?: string): string {
  return formatReadableLocation(address, displayLabel);
}

/** Two-line card: bold primary (place name) + grey secondary (area/city). */
export function formatLocationCard(
  loc?: { address?: string | null; label?: string | null } | null,
): { primary: string; secondary?: string } {
  if (!loc?.address?.trim() && !loc?.label?.trim()) {
    return { primary: '—' };
  }
  const fromAddress = loc.address?.trim() ? formatBookingStopAddress(loc.address) : '';
  const full =
    fromAddress ||
    formatReadableLocation(loc.address, loc.label, 140) ||
    loc.label?.trim() ||
    '—';
  if (/^pinned on map$/i.test(full) || /^on-site help$/i.test(full)) {
    const retry = loc.address?.trim();
    if (retry && retry.length > 4 && !/^selected location$/i.test(retry)) {
      return { primary: formatBookingStopAddress(retry) || retry };
    }
    return { primary: full };
  }
  const parts = full
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { primary: parts[0], secondary: parts.slice(1).join(', ') };
  }
  return { primary: full };
}
