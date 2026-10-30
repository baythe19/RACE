/** Header ℹ copy for service detail landing screens (customer app). */

export const TOWING_SERVICE_HEADER_INFO =
  'Every towing booking uses your registered vehicle (Profile → Vehicles), pickup & drop locations, tow truck type (flatbed / wheel-lift / heavy), then review & confirm.\n\nOnly the tier you pick below changes dispatch priority and pricing.';

export const TOWING_TIER_INFO: Record<'instant' | 'scheduled' | 'emergency', string> = {
  instant:
    'Dispatched from the standard partner queue as soon as you confirm.\n\n• Vehicle from your Profile\n• Choose tow truck type on step 1\n• Typical arrival in ~30 minutes',
  scheduled:
    'Pick a date within the next 7 days before pickup & drop.\n\n• Same booking steps as instant\n• Lower base fare\n• Partner assigned ahead of your slot',
  emergency:
    'Highest priority dispatch for accidents, breakdowns, or unsafe locations.\n\n• Priority partner queue\n• Same vehicle & tow-type steps\n• Use when you need help urgently',
};

export const ROADSIDE_SERVICE_HEADER_INFO =
  'On-spot help at your breakdown location. Choose a service, set where you are, pick your vehicle from Profile, then confirm. Flat fare for most on-site fixes; partner comes to you when available in your city.';

export const ROADSIDE_TIER_INFO: Record<
  'flat_tyre' | 'battery_jumpstart' | 'fuel_delivery' | 'minor_repair',
  string
> = {
  flat_tyre:
    'Technician helps with a flat tyre at your location. Have your spare ready if you have one; otherwise discuss options with the partner on arrival.',
  battery_jumpstart:
    'Jump-start for a dead battery. Vehicle must be accessible; partner brings equipment to your pin location.',
  fuel_delivery:
    'Emergency fuel brought to you (quantity limits apply). You pay product cost plus service fee as shown at booking.',
  minor_repair:
    'Light on-site fixes where safe (e.g. loose connections, minor adjustments). Not a full workshop repair — partner will advise if tow is needed.',
};

export const MORE_SERVICES_HEADER_INFO =
  'These offerings are coming soon to RACE. Towing, driver hire, and roadside assistance are live today — use those categories to book now.';
