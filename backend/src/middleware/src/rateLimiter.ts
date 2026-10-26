import rateLimit from 'express-rate-limit';

import { env } from '../../config/env';

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 200 : 20000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 20 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts' },
});

export const adminAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 5 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many admin login attempts. Please try again later.' },
});

export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 10 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'OTP rate limit exceeded' },
});

/** BUG-18: /fare calls the billed Google Distance Matrix — tight per-IP cap. */
export const fareRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 30 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Fare estimate limit reached. Please try again later.' },
});

/**
 * BUG-19: the QR/emergency endpoints are intentionally public (a stranger
 * scanning a windshield sticker must reach the owner), but they expose owner
 * PII — so enumerate-scanning is throttled hard per IP.
 */
export const qrRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 20 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many QR lookups. Please try again later.' },
});
