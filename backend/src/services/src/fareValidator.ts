import { z } from 'zod';

export const towingFareQuerySchema = z.object({
  pickup_lat: z.coerce.number(),
  pickup_lng: z.coerce.number(),
  dropoff_lat: z.coerce.number(),
  dropoff_lng: z.coerce.number(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  towingMode: z.enum(['instant', 'scheduled', 'emergency']).optional(),
});

export const driverFareQuerySchema = z.object({
  packageHours: z.coerce
    .number()
    .pipe(z.union([z.literal(2), z.literal(4), z.literal(8), z.literal(12), z.literal(24)])),
  vehicleType: z.enum(['hatchback', 'sedan', 'suv']).optional(),
  vehicleCategory: z.enum(['hatchback', 'sedan', 'suv']).optional(),
});

export type TowingFareQueryDto = z.infer<typeof towingFareQuerySchema>;
export type DriverFareQueryDto = z.infer<typeof driverFareQuerySchema>;
