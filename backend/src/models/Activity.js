import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'project.created',
        'project.updated',
        'project.deleted',
        'task.created',
        'task.updated',
        'task.deleted',
        'task.commented',
        'task.archived',
        'task.restored',
      ],
    },
    entityType: {
      type: String,
      enum: ['project', 'task'],
      default: 'task',
    },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityTitle: { type: String },
    details: { type: String },
  },
  { timestamps: true }
);

activitySchema.index({ project: 1, createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
