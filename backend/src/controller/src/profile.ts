import type { Request, Response } from 'express';

import { asyncHandler } from '../../utils/src/asyncHandler';
import { sendSuccess } from '../../utils/src/apiResponse';
import { getAuthUser } from '../../utils/src/request';
import { profileService } from '../../services/src/profile';
import { profileCredentialsService } from '../../services/src/profileCredentials';

export class ProfileController {
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const profile = await profileService.getProfile(user.id);
    return sendSuccess(res, profile);
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const profile = await profileService.updateProfile(user.id, req.body);
    return sendSuccess(res, profile);
  });

  completeProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const profile = await profileService.completeProfile(user.id, req.body);
    return sendSuccess(res, profile);
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    await profileCredentialsService.changePassword(user.id, req.body);
    return sendSuccess(res, { message: 'Password updated successfully' });
  });

  requestMobileChange = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await profileCredentialsService.requestMobileChange(user.id, req.body);
    return sendSuccess(res, result);
  });

  confirmMobileChange = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    await profileCredentialsService.confirmMobileChange(user.id, req.body);
    return sendSuccess(res, { message: 'Mobile number updated successfully' });
  });

  setPin = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    await profileCredentialsService.setPin(user.id, req.body);
    return sendSuccess(res, { message: 'PIN updated successfully' });
  });

  verifyPin = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    await profileCredentialsService.verifyPin(user.id, String(req.body?.pin ?? ''));
    return sendSuccess(res, { ok: true });
  });
}

export const profileController = new ProfileController();
