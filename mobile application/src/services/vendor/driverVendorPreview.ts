/**
 * Preview-only My Vendor states. Real API data is unchanged.
 * none: independent driver, tab hidden
 * request: first fleet invitation, accept or decline
 * connected: joined, assignments may be empty, history visible
 * assignment: joined, plus a new vendor job that needs a response
 */
export type DriverVendorPreviewScenario = 'none' | 'request' | 'connected' | 'assignment';

let scenario: DriverVendorPreviewScenario = 'connected';
const listeners = new Set<() => void>();

export function getDriverVendorPreviewScenario(): DriverVendorPreviewScenario {
  return scenario;
}

export function setDriverVendorPreviewScenario(next: DriverVendorPreviewScenario): void {
  scenario = next;
  listeners.forEach(listener => listener());
}

export function subscribeDriverVendorPreview(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
