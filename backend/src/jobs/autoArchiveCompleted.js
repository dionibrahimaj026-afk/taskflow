import Task from '../models/Task.js';
import Project from '../models/Project.js';

const IDLE_DAYS = parseInt(process.env.AUTO_ARCHIVE_IDLE_DAYS || '5', 10) || 5;

/**
 * Auto-archive projects when all tasks are completed and no new tasks
 * have been added for IDLE_DAYS days (owner forgot to archive).
 */
export async function autoArchiveCompletedProjects() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - IDLE_DAYS);

  const candidates = await Project.find({
    archived: { $ne: true },
    deletedAt: null,
  }).select('_id title');

  let archived = 0;
  for (const project of candidates) {
    const tasks = await Task.find({
      project: project._id,
      deletedAt: null,
    }).select('status archived createdAt');

    if (tasks.length === 0) continue;

    const allCompleted = tasks.every(
      (t) => t.status === 'Done' || t.archived === true
    );
    const lastTaskCreated = new Date(
      Math.max(...tasks.map((t) => new Date(t.createdAt).getTime()))
    );

    if (allCompleted && lastTaskCreated < cutoff) {
      await Project.findByIdAndUpdate(project._id, {
        $set: { archived: true, archivedAt: new Date() },
      });
      archived++;
      console.log(`[AutoArchive] Archived project "${project.title}" (all tasks done, idle ${IDLE_DAYS}+ days)`);
    }
  }

  if (archived > 0) {
    console.log(`[AutoArchive] Archived ${archived} project(s)`);
  }
}
