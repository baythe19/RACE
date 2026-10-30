import { Schema, model, type Document, Types } from 'mongoose';

export interface IActivityLog extends Document {
  actorId?: Types.ObjectId | string;
  actorName: string;
  actorType: 'admin' | 'system';
  action: string;
  entityType: string;
  entityId?: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    actorId: { type: Schema.Types.Mixed, index: true },
    actorName: { type: String, required: true },
    actorType: { type: String, enum: ['admin', 'system'], default: 'admin' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    title: { type: String, required: true },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ActivityLogSchema.index({ createdAt: -1 });

// TTL (D-05, audit 2026-10-28): audit trail retention window — 90 days.
// TTL requires an ascending single-field index; the -1 index above stays for list sorting.
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const ActivityLogModel = model<IActivityLog>('ActivityLog', ActivityLogSchema);
