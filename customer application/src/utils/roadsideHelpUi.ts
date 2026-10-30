/**
 * Customer copy for on-site roadside jobs (vendor dispatch → partner accept → en route).
 * Never show a named mechanic until the API returns one.
 */

export type RoadsideHelpPhase =
  | 'sent'
  | 'awaiting_accept'
  | 'en_route'
  | 'at_site'
  | 'completed';

export function roadsideHelpPhase(status: string, _hasPartnerName: boolean): RoadsideHelpPhase {
  const s = status.toUpperCase();
  if (s === 'COMPLETED' || s === 'RATED') return 'completed';
  if (s === 'DRIVER_ARRIVED' || s === 'IN_PROGRESS') return 'at_site';
  if (s === 'DRIVER_EN_ROUTE') return 'en_route';
  if (s === 'DRIVER_ASSIGNED') return 'awaiting_accept';
  if (s === 'PENDING' || s === 'CONFIRMED') return 'sent';
  return 'sent';
}

export function roadsideHelpCopy(phase: RoadsideHelpPhase): {
  title: string;
  subtitle: string;
  chip: string;
} {
  switch (phase) {
    case 'sent':
      return {
        title: 'Request sent',
        subtitle: 'Nearby roadside partners can see your job. The first to accept will be assigned.',
        chip: 'Finding partner',
      };
    case 'awaiting_accept':
      return {
        title: 'Waiting for accept',
        subtitle: 'A roadside partner must accept your job before anyone is sent. No mechanic is assigned yet.',
        chip: 'Awaiting accept',
      };
    case 'en_route':
      return {
        title: 'Partner on the way',
        subtitle: 'Your assigned partner is heading to your breakdown location.',
        chip: 'En route',
      };
    case 'at_site':
      return {
        title: 'Partner at your location',
        subtitle: 'Help is on site. Follow any instructions from your partner.',
        chip: 'At location',
      };
    case 'completed':
      return {
        title: 'Job completed',
        subtitle: 'This request is closed. See details in Bookings.',
        chip: 'Completed',
      };
  }
}

export const ROADSIDE_HELP_STEPS = ['Sent', 'Accepted', 'En route', 'At you'] as const;

export function roadsideHelpStepIndex(phase: RoadsideHelpPhase): number {
  switch (phase) {
    case 'sent':
      return 0;
    case 'awaiting_accept':
      return 1;
    case 'en_route':
      return 2;
    case 'at_site':
    case 'completed':
      return 3;
  }
}
