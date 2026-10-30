import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { env } from '../../config/env';
import { gcsConfig } from '../../config/gcs';
import { AppError } from '../../utils/src/errors';
import { logger } from '../../utils/src/logger';

export type VendorStorageCategory =
  | 'towing-companies'
  | 'tow-drivers'
  | 'full-time-drivers'
  | 'part-time-drivers'
  | 'mechanics';

const VENDOR_TYPE_FOLDER: Record<string, VendorStorageCategory> = {
  towing_company: 'towing-companies',
  tow_truck_driver: 'tow-drivers',
  full_time_driver: 'full-time-drivers',
  part_time_driver: 'part-time-drivers',
  mechanic: 'mechanics',
};

const DOCUMENT_FOLDER: Record<string, string> = {
  aadhaar: 'documents/aadhaar',
  pan: 'documents/pan',
  gst: 'documents/gst',
  shop_license: 'documents/shop-license',
  msme: 'documents/msme',
  cancelled_cheque: 'documents/cheque',
  commercial_licence: 'documents/licenses',
  driving_license: 'documents/licenses',
  police_verification: 'documents/verification',
  medical_certificate: 'documents/verification',
  vehicle_insurance: 'documents/insurance',
  vehicle_rc: 'documents/vehicle',
  fitness_certificate: 'documents/permits',
  puc: 'documents/permits',
  commercial_permit: 'documents/permits',
  selfie: 'verification/selfies',
  vehicle_photo: 'documents/vehicle',
  voter_id: 'documents/voter-id',
  other: 'documents/other',
};

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
]);

const MAX_BYTES = 10 * 1024 * 1024;

export interface UploadFileInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  vendorType: string;
  documentType: string;
}

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  storagePath: string;
}

function resolveFolder(vendorType: string, documentType: string): string {
  const vendorFolder = VENDOR_TYPE_FOLDER[vendorType] ?? 'vendors';
  const docFolder = DOCUMENT_FOLDER[documentType] ?? 'documents/other';
  return `vendors/${vendorFolder}/${docFolder}`;
}

function resolveDriverFolder(driverId: string, documentType: string): string {
  const docFolder = DOCUMENT_FOLDER[documentType] ?? 'documents/other';
  return `drivers/${driverId}/${docFolder}`;
}

function resolveVehicleFolder(vendorType: string, vendorId: string, vehicleId: string, documentType: string): string {
  const vendorFolder = VENDOR_TYPE_FOLDER[vendorType] ?? 'vendors';
  const docFolder = (DOCUMENT_FOLDER[documentType] ?? 'documents/other').replace(/^documents\//, '');
  return `vendors/${vendorFolder}/${vendorId}/vehicles/${vehicleId}/${docFolder}`;
}

function getLocalUploadsRoot(): string {
  // Local dev / Render without a disk: <cwd>/uploads (ephemeral).
  // With UPLOADS_DIR set (Render persistent disk mounted), files survive
  // deploys. Switching to GCS later is env-only: fill GCS_* vars and uploads
  // flip to the bucket wholesale — no code change, no broken image URLs in
  // the admin panel (the /admin/documents proxy handles both backends).
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function buildFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || '.bin';
  return `${Date.now()}-${uuidv4()}${ext}`;
}

async function uploadToGcs(input: UploadFileInput, storagePath: string, fileName: string): Promise<UploadResult> {
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage({
    projectId: gcsConfig.projectId,
    keyFilename: gcsConfig.keyFile || undefined,
  });
  const bucket = storage.bucket(gcsConfig.bucketName);
  const objectPath = `${storagePath}/${fileName}`;
  const file = bucket.file(objectPath);

  await file.save(input.buffer, {
    contentType: input.mimeType,
    resumable: false,
    metadata: { cacheControl: 'private, max-age=3600' },
  });

  const fileUrl = `https://storage.googleapis.com/${gcsConfig.bucketName}/${objectPath}`;
  return { fileUrl, fileName: input.originalName, storagePath: objectPath };
}

function uploadToLocal(input: UploadFileInput, storagePath: string, fileName: string): UploadResult {
  const absoluteDir = path.join(getLocalUploadsRoot(), storagePath);
  ensureDir(absoluteDir);
  const absolutePath = path.join(absoluteDir, fileName);
  writeFileSync(absolutePath, input.buffer);
  const fileUrl = `${env.APP_BASE_URL}/uploads/${storagePath}/${fileName}`.replace(/\\/g, '/');
  return { fileUrl, fileName: input.originalName, storagePath: `${storagePath}/${fileName}` };
}

export class StorageService {
  validateFile(buffer: Buffer, mimeType: string): void {
    if (buffer.length > MAX_BYTES) {
      throw new AppError('File exceeds 10MB limit', 400);
    }
    if (!ALLOWED_MIME.has(mimeType.toLowerCase())) {
      throw new AppError('Only JPG, PNG, and PDF files are allowed', 400);
    }
  }

  async uploadVendorDocument(input: UploadFileInput): Promise<UploadResult> {
    this.validateFile(input.buffer, input.mimeType);
    const storagePath = resolveFolder(input.vendorType, input.documentType);
    const fileName = buildFileName(input.originalName);

    if (gcsConfig.isConfigured) {
      try {
        return await uploadToGcs(input, storagePath, fileName);
      } catch (error) {
        logger.warn('GCS upload failed, falling back to local storage', { error });
      }
    }

    return uploadToLocal(input, storagePath, fileName);
  }

  async uploadDriverDocument(input: Omit<UploadFileInput, 'vendorType'> & { driverId: string }): Promise<UploadResult> {
    this.validateFile(input.buffer, input.mimeType);
    const storagePath = resolveDriverFolder(input.driverId, input.documentType);
    const fileName = buildFileName(input.originalName);

    if (gcsConfig.isConfigured) {
      try {
        return await uploadToGcs(
          {
            buffer: input.buffer,
            mimeType: input.mimeType,
            originalName: input.originalName,
            // Unused by uploadToGcs; present to satisfy UploadFileInput shape.
            vendorType: 'driver',
            documentType: input.documentType,
          },
          storagePath,
          fileName,
        );
      } catch (error) {
        logger.warn('GCS upload failed, falling back to local storage', { error });
      }
    }

    return uploadToLocal(
      {
        buffer: input.buffer,
        mimeType: input.mimeType,
        originalName: input.originalName,
        vendorType: 'driver',
        documentType: input.documentType,
      },
      storagePath,
      fileName,
    );
  }

  async uploadCustomerVehiclePhoto(
    input: UploadFileInput & { customerId: string; vehicleId: string },
  ): Promise<UploadResult> {
    this.validateFile(input.buffer, input.mimeType);
    if (!input.mimeType.toLowerCase().startsWith('image/')) {
      throw new AppError('Vehicle photo must be a JPG or PNG image', 400);
    }
    const storagePath = `customers/${input.customerId}/vehicles/${input.vehicleId}/photos`;
    const fileName = buildFileName(input.originalName);

    if (gcsConfig.isConfigured) {
      try {
        return await uploadToGcs(input, storagePath, fileName);
      } catch (error) {
        logger.warn('GCS customer vehicle photo upload failed, falling back to local storage', { error });
      }
    }
    return uploadToLocal(input, storagePath, fileName);
  }

  async uploadVendorVehicleDocument(
    input: UploadFileInput & { vendorId: string; vehicleId: string },
  ): Promise<UploadResult> {
    this.validateFile(input.buffer, input.mimeType);
    const storagePath = resolveVehicleFolder(
      input.vendorType,
      input.vendorId,
      input.vehicleId,
      input.documentType,
    );
    const fileName = buildFileName(input.originalName);

    if (gcsConfig.isConfigured) {
      try {
        return await uploadToGcs(input, storagePath, fileName);
      } catch (error) {
        logger.warn('GCS vehicle document upload failed, falling back to local storage', { error });
      }
    }

    return uploadToLocal(input, storagePath, fileName);
  }

  async readUploadedFile(fileUrl: string): Promise<Buffer> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(fileUrl);
    } catch {
      throw new AppError('Stored document URL is invalid', 404);
    }

    if (parsedUrl.hostname === 'storage.googleapis.com') {
      const [bucketName, ...objectSegments] = decodeURIComponent(parsedUrl.pathname)
        .split('/')
        .filter(Boolean);
      if (!bucketName || bucketName !== gcsConfig.bucketName || !objectSegments.length) {
        throw new AppError('Stored document was not found', 404);
      }
      try {
        const { Storage } = await import('@google-cloud/storage');
        const storage = new Storage({
          projectId: gcsConfig.projectId,
          keyFilename: gcsConfig.keyFile || undefined,
        });
        const [buffer] = await storage
          .bucket(bucketName)
          .file(objectSegments.join('/'))
          .download();
        return buffer;
      } catch (error) {
        logger.warn('Could not read uploaded GCS document', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw new AppError('Stored document could not be read', 503);
      }
    }

    const marker = '/uploads/';
    const markerIndex = parsedUrl.pathname.indexOf(marker);
    if (markerIndex < 0) throw new AppError('Stored document source is unsupported', 404);
    const relativePath = decodeURIComponent(parsedUrl.pathname.slice(markerIndex + marker.length));
    const uploadsRoot = path.resolve(getLocalUploadsRoot());
    const absolutePath = path.resolve(uploadsRoot, relativePath);
    if (!absolutePath.startsWith(uploadsRoot + path.sep) || !existsSync(absolutePath)) {
      throw new AppError('Stored document was not found', 404);
    }
    return readFileSync(absolutePath);
  }

  getLocalFileStream(relativePath: string) {
    const uploadsRoot = path.resolve(getLocalUploadsRoot());
    const absolutePath = path.resolve(uploadsRoot, relativePath);
    if (!absolutePath.startsWith(uploadsRoot + path.sep) || !existsSync(absolutePath)) {
      throw new AppError('File not found', 404);
    }
    return createReadStream(absolutePath);
  }
}

export const storageService = new StorageService();
