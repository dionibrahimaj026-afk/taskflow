import express from 'express';
import Activity from '../models/Activity.js';

const router = express.Router();

router.get('/project/:projectId', async (req, res) => {
  try {
    const activities = await Activity.find({ project: req.params.projectId })
      .populate('user', 'name avatar email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
