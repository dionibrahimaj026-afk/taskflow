/**
 * One-time migration: Update old task statuses to new values (Todo, Active, Testing, Done)
 * Run with: node src/scripts/migrate-task-statuses.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Task from '../models/Task.js';

async function migrate() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/taskflow';
  await mongoose.connect(uri);

  let count = 0;
  const r1 = await Task.updateMany({ status: 'To Do' }, { $set: { status: 'Todo' } });
  const r2 = await Task.updateMany({ status: 'In Progress' }, { $set: { status: 'Active' } });
  count += r1.modifiedCount + r2.modifiedCount;

  console.log('Migration complete:', count, 'tasks updated');
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
