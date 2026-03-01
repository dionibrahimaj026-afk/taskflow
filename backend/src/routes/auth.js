import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (userId) =>
  jwt.sign(
    { id: userId?.toString?.() ?? userId },
    process.env.JWT_SECRET || 'dev-secret-change-in-production',
    { expiresIn: '7d' }
  );


router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }
      const { email, password, name } = req.body;
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ message: 'Email already registered' });
      const isFirstUser = (await User.countDocuments()) === 0;
      const user = await User.create({
        email,
        password,
        name,
        role: isFirstUser ? 'admin' : 'user',
      });
      const token = generateToken(user._id);
      res.status(201).json({
        token,
        user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role, avatar: user.avatar },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid credentials' });
      const user = await User.findOne({ email: req.body.email }).select('+password');
      if (!user || !user.password) return res.status(401).json({ message: 'Invalid credentials' });
      const match = await user.comparePassword(req.body.password);
      if (!match) return res.status(401).json({ message: 'Invalid credentials' });
      const token = generateToken(user._id);
      await User.findByIdAndUpdate(user._id, { lastSeenAt: new Date() });
      res.json({
        token,
        user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role, avatar: user.avatar },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.get('/me', protect, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { lastSeenAt: new Date() });
  res.json({
    user: {
      id: req.user._id.toString(),
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      avatar: req.user.avatar,
    },
  });
});

export default router;
