import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { connectDB } from './config/db.js';
import { cleanupOldTrash } from './jobs/cleanupTrash.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import activityRoutes from './routes/activities.js';

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activities', activityRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Run trash cleanup on startup (after a short delay for DB) and every hour
  setTimeout(() => cleanupOldTrash().catch(console.error), 5000);
  setInterval(() => cleanupOldTrash().catch(console.error), 60 * 60 * 1000);
});
