import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import Project from '../models/Project.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

async function getTaskProjectFilter(userId) {
  if (!userId) return { project: { $in: [] } };
  const projects = await Project.find({
    deletedAt: null,
    archived: { $ne: true },
    $or: [{ createdBy: userId }, { 'members.user': userId }],
  }).select('_id');
  return { project: { $in: projects.map((p) => p._id) } };
}

router.get('/me/productivity', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const projectFilter = await getTaskProjectFilter(userId);

    const [assignedAgg, tasksCreated, commentsAdded] = await Promise.all([
      Task.aggregate([
        {
          $match: {
            ...projectFilter,
            assignedTo: userId,
            archived: { $ne: true },
            deletedAt: null,
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Activity.countDocuments({
        user: userId,
        action: 'task.created',
      }),
      Activity.countDocuments({
        user: userId,
        action: 'task.commented',
      }),
    ]);

    const byStatus = { Todo: 0, Active: 0, Testing: 0, Done: 0 };
    let tasksAssigned = 0;
    for (const row of assignedAgg) {
      byStatus[row._id] = row.count;
      tasksAssigned += row.count;
    }
    const tasksDone = byStatus.Done || 0;
    const completionRate = tasksAssigned > 0 ? Math.round((tasksDone / tasksAssigned) * 100) : 0;

    res.json({
      tasksAssigned,
      tasksDone,
      tasksByStatus: byStatus,
      completionRate,
      tasksCreated,
      commentsAdded,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/me/ping', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { lastSeenAt: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    const users = await User.find().select('name avatar email lastSeenAt').sort({ name: 1 });
    const now = Date.now();
    const withStatus = users.map((u) => ({
      ...u.toObject(),
      isOnline: u.lastSeenAt && now - new Date(u.lastSeenAt).getTime() < ONLINE_THRESHOLD_MS,
    }));
    res.json(withStatus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put(
  '/:id',
  protect,
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('password').optional().isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      if (req.user._id.toString() !== req.params.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const { name, email, password } = req.body;
      if (name) user.name = name;
      if (email) user.email = email;
      if (password) user.password = password;

      await user.save();
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

  router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
