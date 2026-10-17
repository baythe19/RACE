import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  OTP_EXPIRY_SECONDS: z.coerce.number().default(300),
  OTP_MAX_RESEND_ATTEMPTS: z.coerce.number().default(3),
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().default(5),
  CORS_ORIGIN: z.string().default('*'),
  GCS_BUCKET_NAME: z.string().optional(),
  GCS_PROJECT_ID: z.string().optional(),
  GCS_KEY_FILE: z.string().optional(),
  APP_BASE_URL: z.string().default('http://localhost:3000'),
  ADMIN_WEB_URL: z.string().default('http://localhost:3001'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@raceservice.com'),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  SOS_EMERGENCY_PHONE: z.string().default('+911080808080'),
  SOS_SUPPORT_PHONE: z.string().default('+911800123456'),
  SOS_AVG_ARRIVAL_MINUTES: z.coerce.number().default(25),
  ADMIN_EMAIL: z.string().email().default('admin@raceservice.com'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin@123'),
  ADMIN_NAME: z.string().default('Admin User'),
  MOCK_DATA_MODE: z.coerce.boolean().default(true),
  MOCK_UNIVERSAL_OTP: z.string().default('123456'),
  // MessageCentral VerifyNow SMS OTP service
  MC_CUSTOMER_ID: z.string().optional(),
  MC_AUTH_TOKEN: z.string().optional(),
  MC_BASE_URL: z.string().default('https://cpaas.messagecentral.com'),
  // HanuOTP SMS OTP service (non-DLT; we generate the OTP and Hanu delivers it)
  HANU_API_KEY: z.string().optional(),
  HANU_BASE_URL: z.string().default('https://api.hanuotp.in'),
  HANU_TEMPLATE_ID: z.string().default('default'),
  /** Comma-separated app roles that use HanuOTP; everything else keeps MessageCentral. */
  HANU_OTP_ROLES: z.string().default('vendor,driver'),
  /** Pepper mixed into the OTP hash stored in the DB (falls back to a project constant). */
  OTP_PEPPER: z.string().optional(),
  // Twilio (legacy / fallback — kept optional)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
