import { Types } from 'mongoose';

import {
  NotificationModel,
  type INotification,
  type NotificationType,
} from '../../models/src/notification';

export class NotificationRepository {
  async create(data: {
    userId: Types.ObjectId | string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, string>;
    audience?: 'customer' | 'vendor' | 'driver';
    category?: 'vendor' | 'driver' | 'booking' | 'payment' | 'customer' | 'system' | 'subscription';
  }): Promise<INotification> {
    return NotificationModel.create({
      recipient: {
        audience: data.audience ?? 'customer',
        userId: data.userId,
      },
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata,
      category: data.category ?? 'system',
      isRead: false,
    });
  }

  async findByUserId(userId: string) {
    return NotificationModel.find({ 'recipient.userId': userId }).sort({ createdAt: -1 });
  }

  async markAllRead(userId: string) {
    const result = await NotificationModel.updateMany(
      { 'recipient.userId': userId, isRead: false },
      { isRead: true },
    );
    return result.modifiedCount;
  }

  async markRead(userId: string, notificationId: string) {
    return NotificationModel.findOneAndUpdate(
      { _id: notificationId, 'recipient.userId': userId },
      { isRead: true },
      { new: true },
    );
  }

  async countUnread(userId: string) {
    return NotificationModel.countDocuments({ 'recipient.userId': userId, isRead: false });
  }

  async deleteAllForUser(userId: string) {
    const result = await NotificationModel.deleteMany({ 'recipient.userId': userId });
    return result.deletedCount;
  }

  async deleteOneForUser(userId: string, notificationId: string) {
    const result = await NotificationModel.deleteOne({
      _id: notificationId,
      'recipient.userId': userId,
    });
    return result.deletedCount;
  }
}

export const notificationRepository = new NotificationRepository();
