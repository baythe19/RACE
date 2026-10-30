import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import QRCode from 'qrcode';
import { Linking, Platform, Share } from 'react-native';

import { getVehicleQrScanUrl } from '../components/vehicles/vehicleUi';
import type { Vehicle } from '../types/vehicle';
import { getAppDialog } from './alertBus';
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
  const vehicleLine = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');
  const chips = [vehicle.vehicleType, vehicle.fuelType, vehicle.color].filter(Boolean) as string[];
  const chipHtml = chips
    .map(chip => `<span class="chip">${escapeHtml(chip)}</span>`)
    .join('');
  const shareText = JSON.stringify(
    `Need help with ${plate}${vehicleLine ? ` (${vehicleLine})` : ''}. Opened from a RACE emergency QR.`,
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#16161E" />
  <title>RACE · Help for ${escapeHtml(plate)}</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #16161E; color: #F9FAFB; padding: 20px 20px 32px; }
    .wrap { max-width: 420px; margin: 0 auto; }
    .brand { display: flex; align-items: baseline; gap: 10px; margin-bottom: 22px; }
    .logo { font-weight: 800; letter-spacing: 0.18em; font-size: 13px; color: #F5A623; }
    .brand-sub { font-size: 12px; color: #9CA3AF; }
    .kicker { margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #E23744; }
    .plate { display: inline-block; background: #F5A623; color: #16161E; font-weight: 800; font-size: 22px; letter-spacing: 0.12em; padding: 10px 16px; border-radius: 8px; margin-bottom: 14px; }
    .vehicle { margin: 0 0 10px; font-size: 22px; font-weight: 800; letter-spacing: -0.03em; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .chip { background: #1F2030; border: 1px solid #2A2B3A; color: #D1D5DB; font-size: 12px; font-weight: 700; padding: 6px 10px; border-radius: 999px; text-transform: capitalize; }
    .lede { margin: 0 0 20px; color: #9CA3AF; line-height: 1.5; font-size: 14px; }
    .actions { display: grid; gap: 10px; }
    .btn { display: block; width: 100%; text-align: center; text-decoration: none; font-weight: 800; font-size: 16px; padding: 16px 18px; border-radius: 14px; border: 0; cursor: pointer; font-family: inherit; }
    .btn-red { background: #E23744; color: #fff; }
    .btn-gold { background: #F5A623; color: #16161E; }
    .btn-ghost { background: #1F2030; color: #F9FAFB; border: 1px solid #2A2B3A; }
    .foot { margin: 22px 0 0; font-size: 11px; color: #6B7280; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <main class="wrap">
    <header class="brand">
      <span class="logo">RACE</span>
      <span class="brand-sub">Roadside help</span>
    </header>
    <p class="kicker">This vehicle needs help</p>
    <div class="plate">${escapeHtml(plate)}</div>
    <h1 class="vehicle">${escapeHtml(vehicleLine || 'Registered vehicle')}</h1>
    ${chipHtml ? `<div class="chips">${chipHtml}</div>` : ''}
    <p class="lede">One tap to reach the owner. If no one answers, call 112.</p>
    <section class="actions">
      <a class="btn btn-red" href="tel:112">Call owner</a>
      <a class="btn btn-gold" href="tel:112">Call 112</a>
      <button class="btn btn-ghost" type="button" id="shareBtn">Share this page</button>
    </section>
    <p class="foot">RACE emergency sticker · numbers stay private until you tap Call</p>
  </main>
  <script>
    (function () {
      var btn = document.getElementById('shareBtn');
      if (!btn) return;
      var payload = { title: 'RACE emergency', text: ${shareText}, url: location.href };
      btn.addEventListener('click', function () {
        if (navigator.share) { navigator.share(payload).catch(function () {}); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payload.text + ' ' + payload.url).then(function () {
            btn.textContent = 'Copied';
            setTimeout(function () { btn.textContent = 'Share this page'; }, 1600);
          });
          return;
        }
        window.location.href = 'sms:?body=' + encodeURIComponent(payload.text);
      });
    })();
  </script>
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
  getAppDialog().showDialog({
    tone: 'info',
    title: 'Emergency page',
    message: 'Preview is available in the browser build of the app.',
    primaryLabel: 'Got it',
  });
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
  if (vehicle.qrCode?.startsWith('data:image')) {
    return vehicle.qrCode;
  }
  const payload = getVehicleEmergencyPageUrl(vehicle.id);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
  });
}

function isShareDismissed(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String((error as { message?: string }).message) : '';
  return /did not share|cancel/i.test(message);
}

async function shareNativeFile(fileUri: string, dialogTitle: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    getAppDialog().showDialog({
      tone: 'error',
      title: 'Sharing unavailable',
      message: 'This device cannot open the share sheet. Try again on a physical phone.',
      primaryLabel: 'OK',
    });
    return;
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'image/png',
    dialogTitle,
    UTI: 'public.png',
  });
}

export async function downloadVehicleQrPng(vehicle: Vehicle): Promise<void> {
  try {
    const dataUrl = await buildQrPngDataUrl(vehicle);
    const fileName = `RACE-Emergency-QR-${sanitizeFilePart(vehicle.vehicleNumber)}.png`;
    const plate = formatVehicleNumber(vehicle.vehicleNumber);

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
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      throw new Error('No cache directory');
    }
    const fileUri = `${cacheDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await shareNativeFile(fileUri, `Save RACE QR · ${plate}`);
  } catch (error) {
    if (isShareDismissed(error)) return;
    getAppDialog().showDialog({
      tone: 'error',
      title: 'Download failed',
      message: 'Could not save the QR image. Try again.',
      primaryLabel: 'OK',
    });
  }
}

export async function shareVehicleQr(vehicle: Vehicle): Promise<void> {
  const scanUrl = getVehicleEmergencyPageUrl(vehicle.id);
  const plate = formatVehicleNumber(vehicle.vehicleNumber);
  const message = isLocalApi(scanUrl)
    ? `RACE emergency QR for ${plate}. Scan opens help for this vehicle.`
    : `RACE emergency QR for ${plate}. Scan for help:\n${scanUrl}`;
  try {
    const result = await Share.share(
      Platform.OS === 'ios' && !isLocalApi(scanUrl)
        ? { message, url: scanUrl }
        : { message },
    );
    if (result.action === Share.dismissedAction) return;
  } catch (error) {
    if (isShareDismissed(error)) return;
    getAppDialog().showDialog({
      tone: 'error',
      title: 'Share failed',
      message: isLocalApi(scanUrl)
        ? 'Could not open the share sheet. Use Download QR to send the image instead.'
        : 'Could not open the share sheet. Try again.',
      primaryLabel: 'OK',
    });
  }
}

export async function openVehicleEmergencyPageInBrowser(vehicle: Vehicle): Promise<void> {
  const pageUrl = getVehicleEmergencyPageUrl(vehicle.id);

  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const live = await fetchLiveEmergencyHtml(vehicle.id);
    openHtmlDocument(live ?? buildVehicleEmergencyPreviewHtml(vehicle));
    return;
  }

  if (isLocalApi(pageUrl)) {
    getAppDialog().showDialog({
      tone: 'info',
      title: 'Emergency page',
      message:
        'This dev build points at a local API, so there is no public web page to open. Share the link or download the QR — in production, scan opens the live help page.',
      primaryLabel: 'OK',
    });
    return;
  }

  try {
    await Linking.openURL(pageUrl);
  } catch {
    getAppDialog().showDialog({
      tone: 'error',
      title: 'Could not open browser',
      message: 'No browser could open the emergency page. Try Share link instead.',
      primaryLabel: 'OK',
    });
  }
}
