import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get users for assignment
router.get('/list', async (req, res) => {
  try {
    const users = await User.find().select('name avatar email').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user profile
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

// Update profile
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

// Delete user (self only)
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
