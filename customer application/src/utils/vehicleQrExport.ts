import * as FileSystem from 'expo-file-system/legacy';
import QRCode from 'qrcode';
import { Alert, Platform, Share } from 'react-native';

import { getVehicleQrScanUrl } from '../components/vehicles/vehicleUi';
import type { Vehicle } from '../types/vehicle';
import { formatVehicleNumber } from './vehicleFormat';

function sanitizeFilePart(value: string): string {
  return value.replace(/[^\w-]+/g, '-').replace(/-+/g, '-').slice(0, 48);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Public emergency page URL encoded inside the QR. Not shown on screen. */
export function getVehicleEmergencyPageUrl(vehicleId: string): string {
  return getVehicleQrScanUrl(vehicleId);
}

function isLocalApi(url: string): boolean {
  return /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(url);
}

/** Same layout as the public scan page, built from the vehicle already on this phone. */
export function buildVehicleEmergencyPreviewHtml(vehicle: Vehicle): string {
  const plate = formatVehicleNumber(vehicle.vehicleNumber);
  const rows = [
    ['Registration', plate],
    ['Vehicle', `${vehicle.brand} ${vehicle.model}`],
    ['Type', vehicle.vehicleSubtype ? `${vehicle.vehicleType} · ${vehicle.vehicleSubtype}` : vehicle.vehicleType],
    ['Fuel', vehicle.fuelType],
    ...(vehicle.color ? [['Colour', vehicle.color] as const] : []),
  ]
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(String(value))}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RACE Emergency — ${escapeHtml(plate)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; font-family: system-ui, sans-serif; background: #0B0B0B; color: #fff; padding: 20px; }
    .wrap { max-width: 440px; margin: 0 auto; }
    .badge { display: inline-block; background: #E53935; font-weight: 800; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px 12px; border-radius: 999px; margin-bottom: 14px; }
    .card { background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 22px 18px; margin-bottom: 16px; }
    h1 { margin: 0 0 6px; font-size: 26px; color: #FFC107; }
    p { margin: 0 0 16px; color: #B0B0B0; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 15px; text-align: left; }
    th { color: #B0B0B0; width: 42%; font-weight: 500; }
    td { font-weight: 700; text-transform: uppercase; }
    .btn { display: block; width: 100%; text-align: center; text-decoration: none; font-weight: 800; font-size: 16px; padding: 16px 18px; border-radius: 20px; margin-top: 12px; }
    .btn-primary { background: #E53935; color: #fff; }
    .btn-secondary { background: #FFC107; color: #0B0B0B; }
    .note { margin-top: 16px; font-size: 12px; color: #707070; text-align: center; line-height: 1.45; }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="badge">Emergency QR</div>
    <section class="card">
      <h1>${escapeHtml(plate)}</h1>
      <p>Anyone who scans this sticker sees this vehicle and can call the owner or request towing. Phone numbers stay masked until the live RACE server confirms the vehicle.</p>
      <table>${rows}</table>
    </section>
    <a class="btn btn-primary" href="tel:112">Contact owner</a>
    <a class="btn btn-secondary" href="tel:112">Request towing</a>
    <p class="note">The QR stores only this vehicle’s private id, not the number plate. A scan opens the RACE emergency page for that id.</p>
  </main>
</body>
</html>`;
}

function openHtmlDocument(html: string): void {
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.assign(url);
    }
    return;
  }
  Alert.alert('Emergency page', 'Preview is available in the browser build of the app.');
}

async function fetchLiveEmergencyHtml(vehicleId: string): Promise<string | null> {
  const url = getVehicleEmergencyPageUrl(vehicleId);
  if (isLocalApi(url)) return null;
  try {
    const response = await fetch(url, {
      headers: { Accept: 'text/html' },
    });
    const html = await response.text();
    if (!html.includes('RACE') || html.includes('Application loading')) return null;
    return html;
  } catch {
    return null;
  }
}

async function buildQrPngDataUrl(vehicle: Vehicle): Promise<string> {
  const payload = getVehicleEmergencyPageUrl(vehicle.id);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
  });
}

export async function downloadVehicleQrPng(vehicle: Vehicle): Promise<void> {
  try {
    const dataUrl = await buildQrPngDataUrl(vehicle);
    const fileName = `RACE-Emergency-QR-${sanitizeFilePart(vehicle.vehicleNumber)}.png`;

    if (typeof document !== 'undefined') {
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return;
    }

    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const fileUri = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Share.share({
      title: fileName,
      url: Platform.OS === 'ios' ? fileUri : undefined,
      message: Platform.OS === 'android' ? fileUri : `RACE emergency QR for ${formatVehicleNumber(vehicle.vehicleNumber)}`,
    });
  } catch {
    Alert.alert('Download failed', 'Could not save the QR image. Try again.');
  }
}

export async function shareVehicleQr(vehicle: Vehicle): Promise<void> {
  const scanUrl = getVehicleEmergencyPageUrl(vehicle.id);
  const plate = formatVehicleNumber(vehicle.vehicleNumber);
  const message = isLocalApi(scanUrl)
    ? `RACE emergency QR for ${plate}. Scan opens help for this vehicle.`
    : `RACE emergency QR for ${plate}. Scan for help: ${scanUrl}`;
  try {
    await Share.share({ message, url: isLocalApi(scanUrl) ? undefined : scanUrl });
  } catch {
    // User dismissed the share sheet.
  }
}

export async function openVehicleEmergencyPageInBrowser(vehicle: Vehicle): Promise<void> {
  const live = await fetchLiveEmergencyHtml(vehicle.id);
  openHtmlDocument(live ?? buildVehicleEmergencyPreviewHtml(vehicle));
}
