import jwt, { type SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import { env } from '../../config/env';
import { getCache } from '../../config/cache';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  mobileNumber: string;
  /** BUG-14: distinguishes user tokens from admin tokens (same JWT secret). */
  tokenType: 'user';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  /** Selected app surface; optional for backwards compatibility with v5 tokens. */
  role?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

const REFRESH_PREFIX = 'refresh:';

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload, tokenType: 'user' }, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(userId: string, role?: string): { token: string; jti: string } {
  const jti = uuidv4();
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] };
  const token = jwt.sign({ sub: userId, jti, role } satisfies RefreshTokenPayload, env.JWT_REFRESH_SECRET, options);
  return { token, jti };
}

export async function storeRefreshToken(userId: string, jti: string): Promise<void> {
  const cache = getCache();
  const ttlSeconds = parseRefreshTtlSeconds(env.JWT_REFRESH_EXPIRES_IN);
  await cache.set(`${REFRESH_PREFIX}${userId}:${jti}`, '1', 'EX', ttlSeconds);
}

export async function revokeRefreshToken(userId: string, jti: string): Promise<void> {
  const cache = getCache();
  await cache.del(`${REFRESH_PREFIX}${userId}:${jti}`);
}

export async function isRefreshTokenValid(userId: string, jti: string): Promise<boolean> {
  const cache = getCache();
  const value = await cache.get(`${REFRESH_PREFIX}${userId}:${jti}`);
  return value === '1';
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  // BUG-14: an admin-issued token (tokenType 'admin', same secret) must never
  // authenticate as a platform user — reject the confusion explicitly.
  if ((payload as { tokenType?: string }).tokenType === 'admin') {
    throw new jwt.JsonWebTokenError('admin token used on user endpoint');
  }
  return payload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export async function generateTokenPair(
  userId: string,
  role: string,
  mobileNumber: string,
): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: userId, role, mobileNumber, tokenType: 'user' });
  const { token: refreshToken, jti } = signRefreshToken(userId, role);
  await storeRefreshToken(userId, jti);

  return {
    accessToken,
    refreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  };
}

function parseRefreshTtlSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 7 * 24 * 60 * 60;
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      return 7 * 24 * 60 * 60;
  }
}

export interface DriverOnboardingProofPayload {
  purpose: 'VENDOR_DRIVER_ONBOARDING';
  mobileNumber: string;
  vendorUserId: string;
}

export function signDriverOnboardingProof(mobileNumber: string, vendorUserId: string): string {
  return jwt.sign(
    { purpose: 'VENDOR_DRIVER_ONBOARDING', mobileNumber, vendorUserId } satisfies DriverOnboardingProofPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

export function verifyDriverOnboardingProof(token: string): DriverOnboardingProofPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as DriverOnboardingProofPayload;
  if (!payload || payload.purpose !== 'VENDOR_DRIVER_ONBOARDING') {
    throw new Error('Invalid onboarding proof token purpose');
  }
  return payload;
}

