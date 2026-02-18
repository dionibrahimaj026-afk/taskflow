import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';

const router = express.Router();

// Get all tasks for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignedTo', 'name avatar email')
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
      .populate('project', 'title');
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
    body('description').optional(),
    body('status').optional().isIn(['To Do', 'In Progress', 'Done']),
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
    body('status').optional().isIn(['To Do', 'In Progress', 'Done']),
    body('assignedTo').optional(),
    body('order').optional().isNumeric(),
  ],
  async (req, res) => {
    try {
      const task = await Task.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      ).populate('assignedTo', 'name avatar email');
      if (!task) return res.status(404).json({ message: 'Task not found' });
      res.json(task);
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
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
