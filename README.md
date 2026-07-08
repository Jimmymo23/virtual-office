# Virtual Office

A real-time 2D virtual office with presence, tasks, and room-based communication.

## Stack
- **Frontend**: React + Vite + Zustand + Socket.io client
- **Backend**: Node.js + Express + Socket.io
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + bcrypt

## Project Structure
```
virtual-office/
  client/       # React frontend
  server/       # Node.js backend
```

## Setup

### 1. Database
Create a PostgreSQL database called `virtual_office`:
```sql
CREATE DATABASE virtual_office;
```

### 2. Server environment
```bash
cd server
cp .env.example .env
# Edit .env — set your DATABASE_URL and a strong JWT_SECRET
```

### 3. Run database migrations
```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Install and run everything
```bash
# From root
npm install

# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client
cd client && npm run dev
```

### 5. Open the app
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Health check: http://localhost:4000/health

## What's built (Phase 1)

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me

### 2D Office
- CSS grid tile map with rooms: open desks, meeting room, kitchen, focus room, reception
- Avatar movement with WASD / arrow keys
- Collision detection with walls and furniture
- Room detection — entering a room subscribes you to that room's chat

### Real-time (Socket.io)
- Live presence — see all online users and their positions
- Room-based chat — chat with anyone in the same room
- Clock-in on login, clock-out on logout (auto)
- Active time log auto-stops on disconnect

## Coming next (Phase 2)
- Task system: create, assign, visibility rules, sub-tasks
- Time tracking: start/stop timer per task
- Task board in the right panel
- Admin panel: manage users, view attendance

## Roles
- ADMIN — full access, map editor
- MANAGER — team reports, task management
- STAFF — default role
- GUEST — reception only (can be promoted by host)
# updated
