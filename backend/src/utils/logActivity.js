import Activity from '../models/Activity.js';

export async function logActivity({
  project,
  user = null,
  action,
  entityType = 'task',
  entityId = null,
  entityTitle = null,
  details = null,
}) {
  try {
    await Activity.create({
      project,
      user: user?._id || user || null,
      action,
      entityType,
      entityId,
      entityTitle,
      details,
    });
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
}
