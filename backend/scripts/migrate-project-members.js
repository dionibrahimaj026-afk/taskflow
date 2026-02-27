/**
 * Migration: Convert project members from legacy format [ObjectId] to new format [{ user, role }]
 * Run: node scripts/migrate-project-members.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

async function migrate() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const projects = db.collection('projects');

  const cursor = projects.find({});
  let count = 0;
  let updated = 0;

  for await (const doc of cursor) {
    count++;
    const members = doc.members;
    if (!Array.isArray(members) || members.length === 0) continue;

    const first = members[0];
    if (first && typeof first === 'object' && 'user' in first) {
      continue;
    }

    const newMembers = members.map((m) => {
      const id = m?._id ?? m;
      return id ? { user: id, role: 'editor' } : null;
    }).filter(Boolean);

    await projects.updateOne(
      { _id: doc._id },
      { $set: { members: newMembers } }
    );
    updated++;
    console.log(`Migrated project ${doc._id} (${doc.title})`);
  }

  console.log(`Done. Checked ${count} projects, migrated ${updated}.`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
