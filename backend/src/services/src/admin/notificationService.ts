import type { Types } from 'mongoose';

import {
  NotificationModel,
  type NotificationAudience,
  type NotificationCategory,
  type NotificationSeverity,
} from '../../../models/src/notification';
import { emitToUser } from '../socket';

export type { NotificationCategory };

export interface CreateNotificationInput {
  title: string;
  message?: string;
  type?: NotificationSeverity;
  category: NotificationCategory;
  audience?: NotificationAudience;
  userId?: Types.ObjectId | string;
  entityType?: string;
  entityId?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const notification = await NotificationModel.create({
    recipient: {
      audience: input.audience ?? 'admin',
      userId: input.userId,
    },
    title: input.title,
    message: input.message ?? '',
    type: input.type ?? 'info',
    category: input.category,
    entityType: input.entityType,
    entityId: input.entityId,
    isRead: false,
  });
  const recipientId = input.userId?.toString();
  if (recipientId) {
    emitToUser(recipientId, 'notification:new', {
      notificationId: notification.id,
      createdAt: notification.createdAt.toISOString(),
    });
  }
}
