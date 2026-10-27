import type { NextFunction, Request, Response } from 'express';

import { ForbiddenError } from '../../utils/src/errors';
import { hasUserCapability } from '../../auth/src/roles';
import { getAuthUser } from '../../utils/src/request';
import { userRepository } from '../../services/src/userRepository';

export function requireRole(...roles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokenUser = getAuthUser(req);
      // Resolve against persisted capabilities on every protected request. The JWT role
      // selects the active app surface; it never grants a capability by itself.
      const dbUser = await userRepository.findById(tokenUser.id);
      if (!dbUser || dbUser.accountStatus === 'SUSPENDED' || dbUser.accountStatus === 'INACTIVE') {
        next(new ForbiddenError('Insufficient permissions'));
        return;
      }

      const activeRole =
        roles.find((role) => role === tokenUser.role && hasUserCapability(dbUser, role)) ??
        roles.find((role) => hasUserCapability(dbUser, role));
      if (!activeRole) {
        next(new ForbiddenError('Insufficient permissions'));
        return;
      }

      req.user = {
        id: tokenUser.id,
        role: activeRole,
        mobileNumber: dbUser.mobileNumber,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
