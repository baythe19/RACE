import type { Request, Response } from 'express';

import { asyncHandler } from '../../utils/src/asyncHandler';
import { sendSuccess } from '../../utils/src/apiResponse';
import { getAuthUser } from '../../utils/src/request';
import { notificationService } from '../../services/src/notification';

export class NotificationController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const notifications = await notificationService.listForUser(user.id);
    const unreadCount = await notificationService.getUnreadCount(user.id);
    return sendSuccess(res, { notifications, unreadCount });
  });

  markAllRead = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await notificationService.markAllRead(user.id);
    return sendSuccess(res, result);
  });

  markRead = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const id = String(req.params.id);
    const result = await notificationService.markRead(user.id, id);
    return sendSuccess(res, result);
  });

  deleteAll = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const result = await notificationService.deleteAllForUser(user.id);
    return sendSuccess(res, result);
  });

  deleteOne = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const id = String(req.params.id);
    const result = await notificationService.deleteOneForUser(user.id, id);
    return sendSuccess(res, result);
  });

  getPrefs = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const prefs = await notificationService.getPrefs(user.id);
    return sendSuccess(res, prefs);
  });

  updatePrefs = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const prefs = await notificationService.updatePrefs(user.id, req.body);
    return sendSuccess(res, prefs);
  });
}

export const notificationController = new NotificationController();
