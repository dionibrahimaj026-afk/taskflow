import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { optionalAuth } from '../middleware/auth.js';
import { logActivity } from '../utils/logActivity.js';

const router = express.Router();
router.use(optionalAuth);

// Get all tasks for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignedTo', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .sort({ order: 1, createdAt: 1 });
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
      .populate('project', 'title')
      .populate('comments.user', 'name avatar');
    if (!task) return res.status(404).json({ message: 'Task not found' });
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
  ],
  async (req, res) => {
    try {
      const oldTask = await Task.findById(req.params.id).populate('assignedTo', 'name');
      const task = await Task.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
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

      const task = await Task.findById(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });

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

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await logActivity({
      project: task.project,
      user: req.user,
      action: 'task.deleted',
      entityType: 'task',
      entityId: task._id,
      entityTitle: task.title,
      details: 'Task deleted',
    });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
