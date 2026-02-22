import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Please log in' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    const decoded = jwt.verify(token, secret);
    const userId = decoded?.id ?? decoded?.userId ?? decoded?.sub;
    if (!userId) return res.status(401).json({ message: 'Invalid token' });
    req.user = await User.findById(userId);
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Session expired - please log in again' });
  }
};

/** Optionally attach req.user when valid token present; never blocks */
export const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }
  if (!token) return next();
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    const decoded = jwt.verify(token, secret);
    const userId = decoded?.id ?? decoded?.userId ?? decoded?.sub;
    if (userId) req.user = await User.findById(userId);
  } catch {
    // ignore invalid token
  }
  next();
};
