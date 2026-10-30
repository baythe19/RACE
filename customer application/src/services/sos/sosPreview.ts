import type { SosAction } from './sosApi';

/** UI QA / preview tokens never hit the API — show the same success copy locally. */
export function previewSosAlertMessage(
  action: SosAction,
  ctx: { contactName?: string; vehicleLabel?: string },
): string {
  const vehicle = ctx.vehicleLabel ? ` for ${ctx.vehicleLabel}` : '';
  const contact = ctx.contactName || 'your emergency contact';
  const messages: Record<SosAction, string> = {
    sos: `Emergency SOS alert sent${vehicle}. In production, our team is notified with your live GPS.`,
    towing: `Towing request recorded${vehicle}. Opens the towing flow when you are not signed in.`,
    ambulance: 'Ambulance assistance request registered.',
    share_location: 'Location shared with responders (preview — no SMS/push sent).',
    notify_contacts: `Alert sent to ${contact} (preview — notification logged locally).`,
  };
  return messages[action];
}

export function isPreviewSosSession(accessToken: string | null | undefined): boolean {
  return accessToken === 'ui-preview-access' || accessToken === 'ui-preview-refresh';
}
