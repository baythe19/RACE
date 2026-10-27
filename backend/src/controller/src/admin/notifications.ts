import type { Request, Response } from 'express';

import { asyncHandler } from '../../../utils/src/asyncHandler';
import { sendSuccess } from '../../../utils/src/apiResponse';
import { adminNotificationsService } from '../../../services/src/admin/adminNotifications';
import { routeParam } from '../../../services/src/admin/routeParam';

export const adminNotificationsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await adminNotificationsService.list(req.query as never));
  }),

  getUnreadCount: asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, { count: await adminNotificationsService.getUnreadCount() });
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    await adminNotificationsService.markRead(routeParam(req.params.id));
    sendSuccess(res, { message: 'Marked read' });
  }),

  markAllRead: asyncHandler(async (_req: Request, res: Response) => {
    await adminNotificationsService.markAllRead();
    sendSuccess(res, { message: 'All marked read' });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await adminNotificationsService.delete(routeParam(req.params.id));
    sendSuccess(res, { message: 'Notification deleted' });
  }),
};
