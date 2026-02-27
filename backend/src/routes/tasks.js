import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import { optionalAuth } from '../middleware/auth.js';
import { logActivity } from '../utils/logActivity.js';
import { hasProjectAccess, canEditTasks } from '../utils/projectRoles.js';

const router = express.Router();
router.use(optionalAuth);

const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

async function getProjectWithAccess(projectId, userId) {
  const project = await Project.findById(projectId)
    .populate('createdBy')
    .populate('members.user');
  if (!project) return null;
  if (!userId || !hasProjectAccess(project, userId)) return null;
  return project;
}

// Get all tasks for a project (excludes archived)
router.get('/project/:projectId', async (req, res) => {
  try {
    const project = await getProjectWithAccess(req.params.projectId, req.user?._id);
    if (!project) return res.status(404).json({ message: 'Project not found or access denied' });
    let tasks = await Task.find({
      project: req.params.projectId,
      archived: { $ne: true },
      deletedAt: null,
    })
      .populate('assignedTo', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .sort({ order: 1, createdAt: 1 });
    tasks = tasks.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return (a.order ?? 0) - (b.order ?? 0);
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get archived tasks for a project
router.get('/project/:projectId/archive', async (req, res) => {
  try {
    const project = await getProjectWithAccess(req.params.projectId, req.user?._id);
    if (!project) return res.status(404).json({ message: 'Project not found or access denied' });
    let tasks = await Task.find({
      project: req.params.projectId,
      archived: true,
      deletedAt: null,
    })
      .populate('assignedTo', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .sort({ archivedAt: -1 });
    tasks = tasks.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.archivedAt) - new Date(a.archivedAt);
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get trashed (soft-deleted) tasks for a project
router.get('/project/:projectId/trash', async (req, res) => {
  try {
    const project = await getProjectWithAccess(req.params.projectId, req.user?._id);
    if (!project) return res.status(404).json({ message: 'Project not found or access denied' });
    const tasks = await Task.find({
      project: req.params.projectId,
      deletedAt: { $ne: null },
    })
      .populate('assignedTo', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .sort({ deletedAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name avatar email')
      .populate('project', 'title createdBy members')
      .populate('comments.user', 'name avatar');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const project = await getProjectWithAccess(task.project?._id ?? task.project, req.user?._id);
    if (!project) return res.status(404).json({ message: 'Project not found or access denied' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create task
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('project').notEmpty().withMessage('Project is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('status').optional().isIn(['Todo', 'Active', 'Testing', 'Done']),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']),
    body('subtasks').optional().isArray(),
    body('subtasks.*.title').optional().trim().notEmpty(),
    body('subtasks.*.completed').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
      if (!req.user) return res.status(401).json({ message: 'Please log in to create a task' });

      const project = await getProjectWithAccess(req.body.project, req.user._id);
      if (!project) return res.status(404).json({ message: 'Project not found or access denied' });
      if (!canEditTasks(project, req.user._id)) {
        return res.status(403).json({ message: 'Viewers cannot create tasks' });
      }

      const count = await Task.countDocuments({ project: req.body.project });
      const task = await Task.create({
        ...req.body,
        order: count,
      });
      await task.populate('assignedTo', 'name avatar');
      await logActivity({
        project: task.project,
        user: req.user,
        action: 'task.created',
        entityType: 'task',
        entityId: task._id,
        entityTitle: task.title,
        details: 'Task created',
      });
      res.status(201).json(task);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Update task
router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional(),
    body('status').optional().isIn(['Todo', 'Active', 'Testing', 'Done']),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']),
    body('assignedTo').optional(),
    body('order').optional().isNumeric(),
    body('subtasks').optional().isArray(),
    body('subtasks.*.title').optional().trim().notEmpty(),
    body('subtasks.*.completed').optional().isBoolean(),
    body('archived').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const oldTask = await Task.findById(req.params.id).populate('assignedTo', 'name');
      if (!oldTask) return res.status(404).json({ message: 'Task not found' });
      const project = await getProjectWithAccess(oldTask.project, req.user?._id);
      if (!project) return res.status(404).json({ message: 'Project not found or access denied' });
      if (!req.user || !canEditTasks(project, req.user._id)) {
        return res.status(403).json({ message: 'You do not have permission to edit this task' });
      }
      const updates = { ...req.body };
      if ('archived' in req.body) {
        updates.archivedAt = req.body.archived ? new Date() : null;
      }
      const task = await Task.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true }
      ).populate('assignedTo', 'name avatar email');
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const parts = [];
      if (req.body.status && req.body.status !== oldTask?.status) {
        parts.push(`moved to ${req.body.status}`);
      }
      if (req.body.priority && req.body.priority !== oldTask?.priority) {
        parts.push(`priority set to ${req.body.priority}`);
      }
      if ('assignedTo' in req.body) {
        const newId = req.body.assignedTo || null;
        if (String(newId) !== String(oldTask?.assignedTo?._id || '')) {
          if (newId) {
            const u = await User.findById(newId).select('name');
            parts.push(`assigned to ${u?.name || 'someone'}`);
          } else {
            parts.push('unassigned');
          }
        }
      }
      if (req.body.subtasks && Array.isArray(req.body.subtasks)) {
        const completed = req.body.subtasks.filter((s) => s.completed).length;
        parts.push(`subtasks updated (${completed}/${req.body.subtasks.length} done)`);
      }
      if (req.body.title && req.body.title !== oldTask?.title) parts.push('title updated');
      if (req.body.description !== undefined) parts.push('description updated');
      if ('archived' in req.body) {
        parts.push(req.body.archived ? 'archived' : 'restored from archive');
      }

      const details = parts.length ? parts.join(', ') : 'Task updated';
      await logActivity({
        project: task.project,
        user: req.user,
        action: 'task.updated',
        entityType: 'task',
        entityId: task._id,
        entityTitle: task.title,
        details,
      });
      res.json(task);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Add comment to task
router.post(
  '/:id/comments',
  [body('text').trim().notEmpty().withMessage('Comment text is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
      if (!req.user) return res.status(401).json({ message: 'Please log in to add a comment' });

      const task = await Task.findById(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      const project = await getProjectWithAccess(task.project, req.user._id);
      if (!project) return res.status(404).json({ message: 'Project not found or access denied' });
      if (!canEditTasks(project, req.user._id)) {
        return res.status(403).json({ message: 'Viewers cannot add comments' });
      }

      const comment = {
        user: req.user?._id || null,
        text: req.body.text.trim(),
        createdAt: new Date(),
      };
      task.comments.push(comment);
      await task.save();
      await task.populate('comments.user', 'name avatar');
      await task.populate('assignedTo', 'name avatar email');

      await logActivity({
        project: task.project,
        user: req.user,
        action: 'task.commented',
        entityType: 'task',
        entityId: task._id,
        entityTitle: task.title,
        details: 'Added a comment',
      });

      res.status(201).json(task);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Soft delete task (move to trash)
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const project = await getProjectWithAccess(task.project, req.user?._id);
    if (!project) return res.status(404).json({ message: 'Project not found or access denied' });
    if (!req.user || !canEditTasks(project, req.user._id)) {
      return res.status(403).json({ message: 'You do not have permission to delete this task' });
    }
    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
    await logActivity({
      project: updated.project,
      user: req.user,
      action: 'task.deleted',
      entityType: 'task',
      entityId: updated._id,
      entityTitle: updated.title,
      details: 'Task moved to trash',
    });
    res.json({ message: 'Task moved to trash' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Restore task from trash
router.post('/:id/restore', async (req, res) => {
  try {
    const existing = await Task.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Task not found' });
    const project = await getProjectWithAccess(existing.project, req.user?._id);
    if (!project) return res.status(404).json({ message: 'Project not found or access denied' });
    if (!req.user || !canEditTasks(project, req.user._id)) {
      return res.status(403).json({ message: 'You do not have permission to restore this task' });
    }
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: { deletedAt: null } },
      { new: true }
    )
      .populate('assignedTo', 'name avatar email')
      .populate('comments.user', 'name avatar');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await logActivity({
      project: task.project,
      user: req.user,
      action: 'task.restored',
      entityType: 'task',
      entityId: task._id,
      entityTitle: task.title,
      details: 'Restored from trash',
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Permanently delete task
router.delete('/:id/permanent', async (req, res) => {
  try {
    const existing = await Task.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Task not found' });
    const project = await getProjectWithAccess(existing.project, req.user?._id);
    if (!project) return res.status(404).json({ message: 'Project not found or access denied' });
    if (!req.user || !canEditTasks(project, req.user._id)) {
      return res.status(403).json({ message: 'You do not have permission to permanently delete this task' });
    }
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await logActivity({
      project: task.project,
      user: req.user,
      action: 'task.deleted',
      entityType: 'task',
      entityId: task._id,
      entityTitle: task.title,
      details: 'Permanently deleted',
    });
    res.json({ message: 'Task permanently deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
