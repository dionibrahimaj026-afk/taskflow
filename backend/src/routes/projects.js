import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import { logActivity } from '../utils/logActivity.js';
import { getProjectRole, canEditProject, canManageMembers, canDeleteProject, canPermanentDeleteProject } from '../utils/projectRoles.js';

const router = express.Router();
router.use(optionalAuth);

const projectAccessFilter = (userId) => {
  if (!userId) return {};
  return {
    $or: [
      { createdBy: userId },
      { 'members.user': userId },
    ],
  };
};

router.get('/', async (req, res) => {
  try {
    const filter = { deletedAt: null, archived: { $ne: true }, ...projectAccessFilter(req.user?._id) };
    const projects = await Project.find(filter)
      .populate('createdBy', 'name avatar')
      .populate('members.user', 'name avatar')
      .sort({ updatedAt: -1 });
    const favIds = req.user?.favoriteProjects?.map((id) => String(id)) || [];
    const withFav = projects.map((p) => ({
      ...p.toObject(),
      isFavorite: favIds.includes(String(p._id)),
    }));
    res.json(withFav);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/archive', async (req, res) => {
  try {
    const filter = { archived: true, deletedAt: null, ...projectAccessFilter(req.user?._id) };
    const projects = await Project.find(filter)
      .populate('createdBy', 'name avatar')
      .populate('members.user', 'name avatar')
      .sort({ archivedAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/trash', async (req, res) => {
  try {
    const filter = { deletedAt: { $ne: null }, ...projectAccessFilter(req.user?._id) };
    const projects = await Project.find(filter)
      .populate('createdBy', 'name avatar')
      .populate('members.user', 'name avatar')
      .sort({ deletedAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const favs = user.favoriteProjects || [];
    const pid = project._id;
    const idx = favs.findIndex((f) => String(f) === String(pid));
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push(pid);
    }
    user.favoriteProjects = favs;
    await user.save();
    res.json({ isFavorite: idx < 0, favoriteProjects: user.favoriteProjects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name avatar email')
      .populate('members.user', 'name avatar email');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const role = req.user ? getProjectRole(project, req.user._id) : null;
    const favIds = req.user?.favoriteProjects?.map((id) => String(id)) || [];
    const isFavorite = favIds.includes(String(project._id));
    res.json({ ...project.toObject(), userRole: role, isFavorite });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional(),
    body('dueDate').optional().isISO8601(),
    body('members').optional().isArray(),
    body('members.*.user').optional().isMongoId(),
    body('members.*.role').optional().isIn(['editor', 'viewer']),
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
      if (payload.members) {
        payload.members = payload.members
          .filter((m) => m?.user)
          .map((m) => ({ user: m.user, role: m.role || 'editor' }));
      } else {
        payload.members = [];
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

router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional(),
    body('members').optional().isArray(),
    body('members.*.user').optional().isMongoId(),
    body('members.*.role').optional().isIn(['editor', 'viewer']),
    body('dueDate').optional(),
    body('archived').optional().isBoolean(),
    body('finishRating').optional().isInt({ min: 1, max: 5 }),
  ],
  async (req, res) => {
    try {
      const existing = await Project.findById(req.params.id)
        .populate('createdBy')
        .populate('members.user');
      if (!existing) return res.status(404).json({ message: 'Project not found' });
      if (!req.user) return res.status(401).json({ message: 'Please log in to edit this project' });

      const canEdit = canEditProject(existing, req.user._id);
      const canManage = canManageMembers(existing, req.user._id);

      if ('members' in req.body && !canManage) {
        return res.status(403).json({ message: 'Only the project owner can manage members' });
      }
      if (!canEdit) {
        return res.status(403).json({ message: 'You do not have permission to edit this project' });
      }

      const updates = { ...req.body };
      if (updates.members) {
        updates.members = updates.members
          .filter((m) => m?.user)
          .map((m) => ({ user: m.user, role: m.role || 'editor' }));
      }
      if (req.body.dueDate === '' || req.body.dueDate === null) {
        updates.dueDate = null;
      } else if (req.body.dueDate) {
        const d = new Date(req.body.dueDate);
        updates.dueDate = Number.isNaN(d.getTime()) ? null : d;
      }
      if ('archived' in req.body) {
        updates.archivedAt = req.body.archived ? new Date() : null;
      }
      if ('finishRating' in req.body) {
        const r = req.body.finishRating;
        updates.finishRating = (r >= 1 && r <= 5) ? r : null;
      }

      const project = await Project.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true }
      )
        .populate('createdBy', 'name avatar')
        .populate('members.user', 'name avatar');
      if (!project) return res.status(404).json({ message: 'Project not found' });
      const details =
        'archived' in req.body
          ? req.body.archived
            ? 'Project archived'
            : 'Restored from archive'
          : 'Project updated';
      await logActivity({
        project: project._id,
        user: req.user,
        action: 'project.updated',
        entityType: 'project',
        entityId: project._id,
        entityTitle: project.title,
        details,
      });
      res.json(project);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const existing = await Project.findById(req.params.id)
      .populate('createdBy')
      .populate('members.user');
    if (!existing) return res.status(404).json({ message: 'Project not found' });
    if (!req.user) return res.status(401).json({ message: 'Please log in to delete a project' });
    if (!canDeleteProject(existing, req.user._id)) {
      return res.status(403).json({ message: 'Only the project owner or editors can delete this project' });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await logActivity({
      project: project._id,
      user: req.user,
      action: 'project.deleted',
      entityType: 'project',
      entityId: project._id,
      entityTitle: project.title,
      details: 'Project moved to trash',
    });
    res.json({ message: 'Project moved to trash' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/restore', async (req, res) => {
  try {
    const existing = await Project.findById(req.params.id)
      .populate('createdBy')
      .populate('members.user');
    if (!existing) return res.status(404).json({ message: 'Project not found' });
    if (!req.user) return res.status(401).json({ message: 'Please log in to restore a project' });
    if (!canDeleteProject(existing, req.user._id)) {
      return res.status(403).json({ message: 'Only the project owner or editors can restore this project' });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: { deletedAt: null } },
      { new: true }
    )
      .populate('createdBy', 'name avatar')
      .populate('members.user', 'name avatar');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await logActivity({
      project: project._id,
      user: req.user,
      action: 'project.updated',
      entityType: 'project',
      entityId: project._id,
      entityTitle: project.title,
      details: 'Restored from trash',
    });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/permanent', async (req, res) => {
  try {
    const existing = await Project.findById(req.params.id)
      .populate('createdBy')
      .populate('members.user');
    if (!existing) return res.status(404).json({ message: 'Project not found' });
    if (!req.user) return res.status(401).json({ message: 'Please log in to permanently delete a project' });
    if (!canPermanentDeleteProject(existing, req.user._id)) {
      return res.status(403).json({ message: 'Only the project owner can permanently delete this project' });
    }

    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await Task.deleteMany({ project: req.params.id });
    await logActivity({
      project: project._id,
      user: req.user,
      action: 'project.deleted',
      entityType: 'project',
      entityId: project._id,
      entityTitle: project.title,
      details: 'Permanently deleted',
    });
    res.json({ message: 'Project permanently deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
