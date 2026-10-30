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

/** Public emergency page URL encoded inside the QR. */
export function getVehicleEmergencyPageUrl(vehicleId: string): string {
  return getVehicleQrScanUrl(vehicleId);
}

function isLocalApi(url: string): boolean {
  return /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(url);
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

/** Saves a 512×512 PNG (API data URL or generated from scan URL). */
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

/** Opens the same URL encoded in the QR — served by the backend HTML page. */
export async function openVehicleEmergencyPageInBrowser(vehicle: Vehicle): Promise<void> {
  const pageUrl = getVehicleEmergencyPageUrl(vehicle.id);

  if (isLocalApi(pageUrl)) {
    getAppDialog().showDialog({
      tone: 'info',
      title: 'Emergency page',
      message:
        'This dev build uses a local API. Share the link or download the QR — production scans open the live help page.',
      primaryLabel: 'OK',
    });
    return;
  }

  try {
    const supported = await Linking.canOpenURL(pageUrl);
    if (!supported) {
      throw new Error('unsupported');
    }
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
