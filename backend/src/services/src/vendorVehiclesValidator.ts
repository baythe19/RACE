import { z } from 'zod';

/** RACE policy: vehicles older than 15 years are not allowed on the platform. */
const OLDEST_VEHICLE_YEAR = new Date().getFullYear() - 15;

const optionalDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, 'Use YYYY-MM-DD date')
  .optional();

export const createVendorVehicleSchema = z.object({
  registrationNo: z.string().min(4).max(20),
  type: z.string().min(2).max(80),
  model: z.string().min(1).max(80),
  year: z.coerce
    .number()
    .int()
    .min(OLDEST_VEHICLE_YEAR, `Vehicle must be ${OLDEST_VEHICLE_YEAR} or newer (15-year limit)`)
    .max(new Date().getFullYear(), `Year cannot be in the future`)
    .optional(),
  status: z.enum(['ACTIVE', 'UNDER_MAINTENANCE', 'INACTIVE']).optional(),
  insuranceExpiry: optionalDateString,
  insuranceProvider: z.string().min(2).max(80).optional(),
  insurancePolicyNumber: z.string().min(2).max(80).optional(),
  rcNumber: z.string().min(2).max(40).optional(),
});

export const updateVendorVehicleSchema = z.object({
  type: z.string().min(2).max(80).optional(),
  model: z.string().min(1).max(80).optional(),
  year: z.coerce
    .number()
    .int()
    .min(OLDEST_VEHICLE_YEAR, `Vehicle must be ${OLDEST_VEHICLE_YEAR} or newer (15-year limit)`)
    .max(new Date().getFullYear(), `Year cannot be in the future`)
    .nullable()
    .optional(),
  status: z.enum(['ACTIVE', 'UNDER_MAINTENANCE', 'INACTIVE']).optional(),
  insuranceExpiry: optionalDateString.nullable(),
  maintenanceNote: z.string().max(500).optional(),
});

export const uploadVendorVehicleDocumentSchema = z.object({
  documentType: z.enum([
    'vehicle_rc',
    'vehicle_insurance',
    'fitness_certificate',
    'puc',
    'commercial_permit',
    'vehicle_photo',
  ]),
});

export type CreateVendorVehicleDto = z.infer<typeof createVendorVehicleSchema>;
export type UpdateVendorVehicleDto = z.infer<typeof updateVendorVehicleSchema>;
export type UploadVendorVehicleDocumentDto = z.infer<typeof uploadVendorVehicleDocumentSchema>;
