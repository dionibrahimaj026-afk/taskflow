import Task from '../models/Task.js';
import Project from '../models/Project.js';

const TRASH_RETENTION_DAYS = 30;

export async function cleanupOldTrash() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TRASH_RETENTION_DAYS);

  const taskResult = await Task.deleteMany({
    deletedAt: { $ne: null, $lt: cutoff },
  });

  const oldProjects = await Project.find({
    deletedAt: { $ne: null, $lt: cutoff },
  }).select('_id');

  const projectIds = oldProjects.map((p) => p._id);
  const projectResult = await Project.deleteMany({
    deletedAt: { $ne: null, $lt: cutoff },
  });

  if (projectResult.deletedCount > 0) {
    await Task.deleteMany({ project: { $in: projectIds } });
    console.log(`[Cleanup] Permanently deleted ${projectResult.deletedCount} project(s) and their tasks from trash`);
  }

  if (taskResult.deletedCount > 0) {
    console.log(`[Cleanup] Permanently deleted ${taskResult.deletedCount} task(s) from trash`);
  }
}
