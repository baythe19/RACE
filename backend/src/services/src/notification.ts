import { notificationRepository } from './notificationRepository';
import { NotificationPrefsModel, type INotificationPrefs } from '../../models/src/notificationPrefs';
import type { INotification } from '../../models/src/notification';
import type {
  NotificationPrefsDto,
  NotificationResponseDto,
  UpdateNotificationPrefsDto,
} from './notificationValidator';
import type { NotificationCategory, NotificationType } from '../../models/src/notification';
import { emitToUser } from './socket';

function mapNotification(n: INotification): NotificationResponseDto {
  return {
    id: n.id,
    type: (n.type as NotificationType) ?? 'PROMOTION',
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    metadata: n.metadata as Record<string, string> | undefined,
    createdAt: n.createdAt.toISOString(),
  };
}

function mapPrefs(prefs: INotificationPrefs): NotificationPrefsDto {
  return {
    pushEnabled: prefs.pushEnabled,
    smsEnabled: prefs.smsEnabled,
    emailEnabled: prefs.emailEnabled,
    bookingUpdates: prefs.bookingUpdates,
    promotions: prefs.promotions,
    serviceLaunches: prefs.serviceLaunches,
  };
}

const DEFAULT_PREFS = {
  pushEnabled: true,
  smsEnabled: true,
  emailEnabled: false,
  bookingUpdates: true,
  promotions: true,
  serviceLaunches: true,
};

export class NotificationService {
  async createForUser(
    userId: string,
    data: {
      type: NotificationType;
      title: string;
      message: string;
      metadata?: Record<string, string>;
    },
    options?: {
      audience?: 'customer' | 'vendor' | 'driver';
      category?: NotificationCategory;
    },
  ): Promise<NotificationResponseDto> {
    const notification = await notificationRepository.create({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata,
      audience: options?.audience ?? 'customer',
      category: options?.category ?? 'booking',
    });
    emitToUser(userId, 'notification:new', {
      notificationId: notification.id,
      createdAt: notification.createdAt.toISOString(),
    });
    return mapNotification(notification);
  }

  async listForUser(userId: string): Promise<NotificationResponseDto[]> {
    const notifications = await notificationRepository.findByUserId(userId);
    return notifications.map(mapNotification);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const updated = await notificationRepository.markAllRead(userId);
    return { updated };
  }

  async markRead(userId: string, notificationId: string): Promise<{ updated: boolean }> {
    const updated = await notificationRepository.markRead(userId, notificationId);
    return { updated: Boolean(updated) };
  }

  async deleteAllForUser(userId: string): Promise<{ deleted: number }> {
    const deleted = await notificationRepository.deleteAllForUser(userId);
    return { deleted };
  }

  async deleteOneForUser(userId: string, notificationId: string): Promise<{ deleted: boolean }> {
    const deleted = await notificationRepository.deleteOneForUser(userId, notificationId);
    return { deleted: Boolean(deleted) };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return notificationRepository.countUnread(userId);
  }

  async getPrefs(userId: string): Promise<NotificationPrefsDto> {
    let prefs = await NotificationPrefsModel.findOne({ userId });
    if (!prefs) {
      prefs = await NotificationPrefsModel.create({ userId, ...DEFAULT_PREFS });
    }
    return mapPrefs(prefs);
  }

  async updatePrefs(
    userId: string,
    dto: UpdateNotificationPrefsDto,
  ): Promise<NotificationPrefsDto> {
    const prefs = await NotificationPrefsModel.findOneAndUpdate(
      { userId },
      { $set: dto, $setOnInsert: { userId, ...DEFAULT_PREFS } },
      { new: true, upsert: true },
    );
    return mapPrefs(prefs!);
  }

}

export const notificationService = new NotificationService();
