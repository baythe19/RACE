import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../../utils/src/errors';
import { logger } from '../../utils/src/logger';
import { sendError } from '../../utils/src/apiResponse';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  if (error instanceof AppError) {
    return sendError(res, error.message, error.statusCode);
  }

  if (error instanceof ZodError) {
    const message = error.errors.map((e) => e.message).join(', ');
    return sendError(res, message, 400);
  }

  // Malformed Mongo ObjectId (e.g. corrupt deep link / stale cache) — a client
  // input problem, not a server fault.
  if (error.name === 'CastError') {
    return sendError(res, 'Invalid identifier', 400);
  }

  if (isMongoDuplicateKeyError(error)) {
    const fields = Object.keys(error.keyPattern ?? {}).join(' and ') || 'field';
    return sendError(res, `A record with this ${fields} already exists`, 409);
  }

  if (error.name === 'ValidationError') {
    const message = Object.values((error as { errors?: Record<string, { message?: string }> }).errors ?? {})
      .map((entry) => entry.message)
      .filter(Boolean)
      .join(', ');
    return sendError(res, message || 'Validation failed', 400);
  }

  logger.error('Unhandled error', { error: error.message, stack: error.stack });
  return sendError(res, 'Internal server error', 500);
}

function isMongoDuplicateKeyError(
  error: Error,
): error is Error & { code: number; keyPattern?: Record<string, number> } {
  return 'code' in error && (error as { code: number }).code === 11000;
}

export function notFoundHandler(_req: Request, res: Response): Response {
  return sendError(res, 'Route not found', 404);
}
