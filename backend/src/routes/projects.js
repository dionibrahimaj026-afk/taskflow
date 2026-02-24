import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { optionalAuth } from '../middleware/auth.js';
import { logActivity } from '../utils/logActivity.js';

const router = express.Router();
router.use(optionalAuth);

// Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('createdBy', 'name avatar')
      .sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name avatar email')
      .populate('members', 'name avatar email');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create project
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional(),
    body('dueDate').optional().isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
      if (!req.user) return res.status(401).json({ message: 'Please log in to create a project' });

      const payload = { ...req.body, createdBy: req.user._id };
      if (payload.dueDate) {
        const d = new Date(payload.dueDate);
        payload.dueDate = Number.isNaN(d.getTime()) ? null : d;
      }
      const project = await Project.create(payload);
      await project.populate('createdBy', 'name avatar');
      await logActivity({
        project: project._id,
        user: req.user,
        action: 'project.created',
        entityType: 'project',
        entityId: project._id,
        entityTitle: project.title,
        details: 'Project created',
      });
      res.status(201).json(project);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Update project - only creator can edit
router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional(),
    body('members').optional().isArray(),
    body('dueDate').optional(),
  ],
  async (req, res) => {
    try {
      const existing = await Project.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Project not found' });
      if (existing.createdBy && (!req.user || String(req.user._id) !== String(existing.createdBy))) {
        return res.status(403).json({ message: 'Only the project creator can edit this project' });
      }

      const updates = { ...req.body };
      if (req.body.dueDate === '' || req.body.dueDate === null) {
        updates.dueDate = null;
      } else if (req.body.dueDate) {
        const d = new Date(req.body.dueDate);
        updates.dueDate = Number.isNaN(d.getTime()) ? null : d;
      }

      const project = await Project.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true }
      )
        .populate('createdBy', 'name avatar')
        .populate('members', 'name avatar');
      if (!project) return res.status(404).json({ message: 'Project not found' });
      await logActivity({
        project: project._id,
        user: req.user,
        action: 'project.updated',
        entityType: 'project',
        entityId: project._id,
        entityTitle: project.title,
        details: 'Project updated',
      });
      res.json(project);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Delete project - only creator can delete
router.delete('/:id', async (req, res) => {
  try {
    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Project not found' });
    if (existing.createdBy && (!req.user || String(req.user._id) !== String(existing.createdBy))) {
      return res.status(403).json({ message: 'Only the project creator can delete this project' });
    }

    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await logActivity({
      project: project._id,
      user: req.user,
      action: 'project.deleted',
      entityType: 'project',
      entityId: project._id,
      entityTitle: project.title,
      details: 'Project deleted',
    });
    await Task.deleteMany({ project: req.params.id });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
