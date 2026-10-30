export const SOS_COLORS = {
  bg: '#000000',
  card: '#141414',
  cardBorder: '#2A2A2A',
  red: '#E53935',
  redDark: '#C62828',
  gold: '#FFB800',
  goldMuted: '#B8860B',
  white: '#FFFFFF',
  grey: '#9E9E9E',
  blue: '#1565C0',
  orange: '#E65100',
  towingBg: 'rgba(184,134,11,0.12)',
  ambulanceBg: 'rgba(198,40,40,0.12)',
  locationBg: 'rgba(21,101,192,0.12)',
  contactsBg: 'rgba(230,81,0,0.12)',
};

/** Quick helpers only — Call Emergency is the big red strip, not a grid tile. */
export const SOS_GRID_ACTIONS = [
  {
    id: 'towing',
    label: 'Request Towing',
    icon: 'Truck' as const,
    borderColor: SOS_COLORS.goldMuted,
    backgroundColor: SOS_COLORS.towingBg,
  },
  {
    id: 'location',
    label: 'Share Location',
    icon: 'MapPin' as const,
    borderColor: SOS_COLORS.blue,
    backgroundColor: SOS_COLORS.locationBg,
  },
  {
    id: 'contacts',
    label: 'Notify Contacts',
    icon: 'SOS' as const,
    borderColor: SOS_COLORS.orange,
    backgroundColor: SOS_COLORS.contactsBg,
  },
];
