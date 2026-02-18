# TaskFlow

A full-stack task management web application with projects, Kanban boards, and role-based access.

## Features

- **Authentication**: Email/password signup & login
- **User Management**: Profile CRUD
- **Project Management**: Create, read, update, delete projects with metadata (title, description)
- **Task Management**: CRUD tasks, status workflow (To Do, In Progress, Done), assign to users
- **Frontend**: React + Bootstrap dashboard with forms and Kanban board

## Tech Stack

- **Backend**: Node.js, Express, MongoDB, Mongoose, JWT
- **Frontend**: React, Vite, React Bootstrap, React Router

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

**Required .env variables:**
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for signing JWT tokens

**Troubleshooting:** If you see "address already in use" or "Not authorized" when creating projects, stop any existing backend process on port 5000, then restart with `npm run dev`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register with email |
| POST | `/api/auth/login` | Login with email |
| GET | `/api/auth/me` | Current user (requires auth) |
| GET | `/api/users/list` | Users for assignment |
| CRUD | `/api/users` | User management |
| CRUD | `/api/projects` | Projects |
| CRUD | `/api/tasks` | Tasks |
