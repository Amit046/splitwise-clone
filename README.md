# SplitEasy — Splitwise-inspired Expense Sharing App

A full-stack expense splitting application built as an internship assignment, using AI as a development collaborator.

## Live Demo
- **Frontend**: [[Deployed on Render]](https://splitwise-frontend-a4gq.onrender.com)
- **Backend API**: [[[Deployed on Render]](https://splitwise-frontend-a4gq.onrender.com)](https://splitwise-clone-orlg.onrender.com/api/v1/health)

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React (Vite) + TailwindCSS + React Router + Axios |
| Backend | Node.js + Express.js |
| Database | PostgreSQL (Neon) |
| Auth | JWT (Bearer token) |
| Realtime | Socket.IO |
| CSV Parsing | csv-parser |


## Features
- **Auth**: Register, Login, JWT-protected routes
- **Groups**: Create, view members, add/remove members
- **Expenses**: Full CRUD with 4 split types (equal, unequal, percentage, share)
- **Balances**: Per-group net balances + simplified debt settlement suggestions
- **Settlements**: Record payments, track who paid whom
- **Real-time Chat**: Socket.IO comments inside each expense
- **CSV Import**: Upload expenses, anomaly detection, import report

## Local Setup

### Prerequisites
- Node.js >= 18
- PostgreSQL (or a free Neon account)

### 1. Clone the repo
```bash
git clone https://github.com/Amit046/splitwise-clone.git
cd splitwise-clone
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env        # Fill in DATABASE_URL and JWT_SECRET
npm install
npm run migrate             # Runs SQL migrations against your DB
npm run dev                 # Starts on http://localhost:5000
```

### 3. Frontend setup
```bash
cd frontend
cp .env.example .env        # Set VITE_API_URL=http://localhost:5000/api/v1
npm install
npm run dev                 # Starts on http://localhost:5173
```

### 4. Environment variables

**Backend `.env`**
```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

**Frontend `.env`**
```
VITE_API_URL=http://localhost:5000/api/v1
```

## Deployment

### Backend → Render
1. Create a new **Web Service** on Render
2. Set root directory to `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all environment variables from `.env.example`
6. After first deploy, run migrations via Render shell: `npm run migrate`

### Frontend → Vercel
1. Import GitHub repo on Vercel
2. Set root directory to `frontend`
3. Framework preset: `Vite`
4. Add environment variable: `VITE_API_URL=https://your-render-app.onrender.com/api/v1`

### Database → Neon
1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string into `DATABASE_URL`

## API Overview
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me

GET    /api/v1/groups
POST   /api/v1/groups
GET    /api/v1/groups/:groupId
POST   /api/v1/groups/:groupId/members
DELETE /api/v1/groups/:groupId/members/:userId
GET    /api/v1/groups/:groupId/balances

GET    /api/v1/groups/:groupId/expenses
POST   /api/v1/groups/:groupId/expenses
GET    /api/v1/groups/:groupId/expenses/:expenseId
PUT    /api/v1/groups/:groupId/expenses/:expenseId
DELETE /api/v1/groups/:groupId/expenses/:expenseId
GET    /api/v1/groups/:groupId/expenses/:expenseId/comments
POST   /api/v1/groups/:groupId/expenses/:expenseId/comments

POST   /api/v1/groups/:groupId/settlements
GET    /api/v1/groups/:groupId/settlements

POST   /api/v1/groups/:groupId/csv/import
GET    /api/v1/balances/me
```

## Project Structure
```
splitwise-app/
├── backend/
│   ├── src/
│   │   ├── config/         (db, env, multer)
│   │   ├── controllers/    (auth, group, expense, balance, settlement, csv, comment)
│   │   ├── middleware/     (authMiddleware, validate, groupAuth, errorHandler)
│   │   ├── models/         (user, group, expense, balance, settlement, comment)
│   │   ├── routes/         (per-resource Express routers)
│   │   ├── services/       (auth, group, expense, split, balance, settlement, csvImport, comment)
│   │   ├── sockets/        (Socket.IO expense chat)
│   │   ├── utils/          (ApiError, asyncHandler, apiResponse, jwt, importReport)
│   │   └── db/migrations/  (001_init.sql)
│   └── uploads/
├── frontend/
│   └── src/
│       ├── components/     (common, expenses, chat, csv)
│       ├── pages/          (Login, Register, Dashboard, GroupPage, ExpensePage, BalancesPage, CsvImportPage)
│       ├── context/        (AuthContext)
│       └── services/       (api.js, resources.js)
└── docs/
    ├── AI_CONTEXT.md
    ├── BUILD_PLAN.md
    ├── DECISIONS.md
    ├── SCOPE.md
    └── AI_USAGE.md
```

## Development Notes

AI tools were used for brainstorming, debugging, and improving development speed during implementation.
