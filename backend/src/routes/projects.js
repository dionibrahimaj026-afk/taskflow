import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

const router = express.Router();

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
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

      const project = await Project.create(req.body);
      await project.populate('createdBy', 'name avatar');
      res.status(201).json(project);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Update project
router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional(),
    body('members').optional().isArray(),
  ],
  async (req, res) => {
    try {
      const project = await Project.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      )
        .populate('createdBy', 'name avatar')
        .populate('members', 'name avatar');
      if (!project) return res.status(404).json({ message: 'Project not found' });
      res.json(project);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await Task.deleteMany({ project: req.params.id });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
