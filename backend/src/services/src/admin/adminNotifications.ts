import { NotificationModel } from '../../../models/src/notification';
import { paginate } from './pagination';

export const adminNotificationsService = {
  async list(filters: { page?: number; pageSize?: number; unreadOnly?: boolean }) {
    const query: Record<string, unknown> = { 'recipient.audience': 'admin' };
    if (filters.unreadOnly) query.isRead = false;
    return paginate(NotificationModel, query, filters, (doc) => ({
      id: doc._id.toString(),
      title: doc.title,
      message: doc.message,
      type: doc.type,
      category: doc.category,
      isRead: doc.isRead,
      createdAt: doc.createdAt.toISOString(),
    }));
  },

  async getUnreadCount() {
    return NotificationModel.countDocuments({ 'recipient.audience': 'admin', isRead: false });
  },

  async markRead(id: string) {
    await NotificationModel.findByIdAndUpdate(id, { isRead: true });
  },

  async markAllRead() {
    await NotificationModel.updateMany(
      { 'recipient.audience': 'admin', isRead: false },
      { isRead: true },
    );
  },

  async delete(id: string) {
    await NotificationModel.findOneAndDelete({
      _id: id,
      'recipient.audience': 'admin',
    });
  },
};
