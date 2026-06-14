# AI_CONTEXT.md

> Living document. Updated continuously as the project evolves.
> Source of truth for product, architecture, schema, APIs, frontend, deployment, and decisions.

---

## 1. Product Understanding

Splitwise-inspired expense sharing app. Users create groups, add expenses, split them
(equal / unequal / percentage / share-based), track balances, settle debts, and chat
within an expense thread in real time. A CSV import pipeline ingests historical expense
data, validates it, flags anomalies, and produces an import report.

## 2. Product Scope (this build)

In scope:
- Email/password auth (JWT)
- Groups: create, add/remove members, invite, view group expense history
- Expenses: CRUD, four split types (equal, unequal, percentage, share)
- Balances: per-group and per-user net balances
- Settlements: record a payment between two users, mark debts settled
- Expense comments: real-time via Socket.IO
- CSV import: upload, validate, detect anomalies, import valid rows, generate IMPORT_REPORT.md

Out of scope (documented in SCOPE.md / DECISIONS.md):
- Multi-currency conversion (currency stored as-is, no FX conversion)
- Recurring expenses
- Push notifications / email invites (invites are in-app only)
- Group-level roles/permissions beyond member vs. creator

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + TailwindCSS + React Router + Axios |
| Backend | Node.js + Express.js |
| Database | PostgreSQL (Neon) |
| Auth | JWT (access token, stored in localStorage) |
| Realtime | Socket.IO |
| CSV Parsing | csv-parser |
| Frontend deploy | Vercel |
| Backend deploy | Render |

## 4. Database Schema

File: `backend/src/db/migrations/001_init.sql`

Tables: users, groups, group_members, expenses, expense_splits, settlements,
expense_comments, import_logs.

Key design point: `expense_splits.owed_amount` is populated for ALL split types
(equal/unequal/percentage/share) — this lets balance calculation use a single
uniform query (`SUM(paid) - SUM(owed)`) regardless of how the expense was split.
`percentage` and `shares` columns retain the raw input for audit/display only.

Relationships:
```
users 1---* group_members *---1 groups
users 1---* groups (created_by)
groups 1---* expenses; users 1---* expenses (paid_by)
expenses 1---* expense_splits *---1 users
groups 1---* settlements; users 1---* settlements (paid_by/paid_to)
expenses 1---* expense_comments *---1 users
groups 1---* import_logs; users 1---* import_logs (uploaded_by)
```

Indexes: all FKs indexed; `users.email` unique+indexed; `expenses.expense_date`
indexed; `group_members(group_id,user_id)` and `expense_splits(expense_id,user_id)`
unique constraints prevent duplicates and serve as composite indexes.

## 5. API Design

### Auth (`/api/v1/auth`)

| Method | Path | Auth | Body | Response data |
|---|---|---|---|---|
| POST | /register | No | `{name, email, password}` | `{user, token}` |
| POST | /login | No | `{email, password}` | `{user, token}` |
| POST | /logout | Yes | — | `null` |
| GET | /me | Yes | — | `{user}` |

`user` object: `{id, name, email, created_at}` — `password_hash` never included.

### Groups (`/api/v1/groups`) — all require auth

| Method | Path | Authorization | Body/Params | Response data |
|---|---|---|---|---|
| POST | / | any authenticated user | `{name, description?}` | `{group}` |
| GET | / | — | — | `{groups: [...]}` |
| GET | /:groupId | member | — | `{group: {...members}}` |
| POST | /:groupId/members | member | `{email}` | `{user, membership}` |
| DELETE | /:groupId/members/:userId | creator only | — | `null` |

### Expenses (`/api/v1/groups/:groupId/expenses`) — require group membership

| Method | Path | Body/Params | Response data |
|---|---|---|---|
| POST | / | `{description, amount, currency?, split_type, expense_date, notes?, participants?, split_details?}` | `{expense}` (incl. `splits`) |
| GET | /?limit&offset | — | `{expenses: [...]}` |
| GET | /:expenseId | — | `{expense}` (incl. `splits`) |
| PUT | /:expenseId | same as POST | `{expense}` (incl. `splits`) |
| DELETE | /:expenseId | — | `null` |

`split_details` shape depends on `split_type`:
- `equal`: not used; instead provide `participants: [userId, ...]`
- `unequal`: `{ "<userId>": amount, ... }` — must sum to `amount`
- `percentage`: `{ "<userId>": percentage, ... }` — must sum to 100
- `share`: `{ "<userId>": shares, ... }` — any positive numbers, proportional

(Remaining route groups documented as built — see Sections 7+)

## 6. Frontend Structure

```
src/
├── App.jsx              — Router + AuthProvider + Toaster
├── main.jsx             — React root
├── context/AuthContext  — user state, login/register/logout, /me fetch on mount
├── services/
│   ├── api.js           — axios instance, auth header interceptor, 401 auto-logout
│   └── resources.js     — per-resource service objects (auth, group, expense, etc.)
├── components/
│   ├── common/          — Navbar, ProtectedRoute, Loader
│   ├── expenses/        — ExpenseForm, SplitSelector
│   └── chat/            — ExpenseChat (Socket.IO)
└── pages/
    ├── Login            — form → authService.login → navigate /dashboard
    ├── Register         — form → authService.register → navigate /dashboard
    ├── Dashboard        — group list + overall balance + create group
    ├── GroupPage        — group header + members + expense list + add member + add expense
    ├── ExpensePage      — expense detail + splits breakdown + edit + ExpenseChat
    ├── BalancesPage     — net balances + simplified debts + settle up form
    └── CsvImportPage    — file picker + import + anomaly report table
```

Socket.IO pattern: `ExpenseChat` connects on mount (`io(BACKEND_URL)`), emits `join_expense(id)`, listens for `new_comment` events, disconnects on unmount.

## 7. Implementation Log

### Section 1 — Project Structure
- Created modular monorepo layout: `backend/` (Express, layered: routes → controllers →
  services → models), `frontend/` (Vite + React, component-per-feature folders), `docs/`.
- Decision: raw SQL via `pg` (no ORM) for transparency and to keep schema/migrations
  explicit and interview-defensible.
- Decision: separate `services/` layer holds business logic (split calculation, balance
  calculation, CSV anomaly detection) independent of HTTP layer — keeps controllers thin
  and logic unit-testable.

### Section 2 — Database Schema
- Created `backend/src/db/migrations/001_init.sql` with 8 tables (see Section 4).
- Decision: `expense_splits.owed_amount` stores normalized owed value for every split
  type, unifying balance calculation into one query pattern.
- Decision: settlements are a separate ledger table, not expense rows.
- Decision: invites handled by direct insert into `group_members` (no separate invites
  table) — documented as out-of-scope simplification.
- Decision: `ON DELETE RESTRICT` on user FKs tied to money (paid_by, paid_to) to avoid
  orphaned financial records; `ON DELETE CASCADE` for group/expense-owned child rows.

### Section 3 — Backend Architecture
- Bootstrap flow: `server.js` (HTTP server + Socket.IO + DB sanity check) → `app.js`
  (Express app, global middleware, routes, error handlers).
- Middleware order in `app.js`: cors → express.json/urlencoded → morgan logger →
  `/api/v1` routes → notFoundHandler (404) → errorHandler (must be last).
- Layered request lifecycle: route → (validate middleware) → (authMiddleware if
  protected) → controller → service (business logic) → model (SQL) → apiResponse
  formatter → response. Errors at any layer are thrown as `ApiError` and caught by
  `asyncHandler`, forwarded to centralized `errorHandler`.
- API versioning: all routes mounted under `/api/v1` from a single `routes/index.js`
  aggregator — future v2 routes can be added without touching v1.
- Auth: `authMiddleware` verifies JWT from `Authorization: Bearer <token>`, attaches
  `req.user = { id, email }`.
- Validation: `validate(schema)` middleware using Zod; throws `ApiError(400, ...)`
  with field-level error details on failure.
- DB: single `pg` Pool (`config/db.js`), max 10 connections, SSL enabled in production
  (Neon requires SSL).
- File uploads: `config/multer.js` — disk storage to `backend/uploads/`, CSV-only
  filter, 5MB limit.
- Socket.IO: initialized in `sockets/index.js`, attached to `app` via `app.set('io', io)`
  so controllers can emit events (e.g. new expense comment) without circular imports.
  Namespaces/event handlers for expense chat added in Section 11.
- Migrations: simple custom runner (`db/migrate.js`) — applies `.sql` files in
  `db/migrations/` in order, tracks applied files in `schema_migrations` table.
  Chosen over a migration framework for transparency given only ~1-2 migration files
  expected.
- Logging: `morgan` — `dev` format locally (concise, colored), `combined` format in
  production (Apache-style, suitable for Render log aggregation).

### Section 4 — JWT Authentication
- Endpoints (all under `/api/v1/auth`):
  - `POST /register` — name, email, password → creates user, returns `{ user, token }`.
    Duplicate email → 409 via `ApiError`.
  - `POST /login` — email, password → verifies bcrypt hash, returns `{ user, token }`.
    Wrong email or password both return the same generic 401 message (no user
    enumeration).
  - `POST /logout` — protected; stateless JWT, client discards token. Endpoint kept
    for API symmetry and future token-blacklist support.
  - `GET /me` — protected; returns current user profile from `req.user.id`.
- Password hashing: bcryptjs, 10 salt rounds, in `auth.service.js`. `password_hash`
  never returned in any API response (stripped in service layer / excluded from
  SELECT in `user.model.js` where not needed).
- JWT: `utils/jwt.js` — `signToken({id, email})`, expiry from `JWT_EXPIRES_IN` (default
  7d). Verified in `authMiddleware`.
- Validation: `middleware/validators/auth.validator.js` — Zod schemas for register
  (name min 2, email format, password min 6) and login (email format, password
  required). Email normalized to lowercase + trimmed before hitting DB, so
  "User@Example.com" and "user@example.com" are treated as the same account.
- `user.model.js` also includes `searchByEmail` (ILIKE partial match) — added now
  since it's needed for the group invite-by-email flow in Section 5, keeping all
  user queries co-located.

### Section 5 — Group Management
- Endpoints (all under `/api/v1/groups`, all require auth):
  - `POST /` — create group; creator auto-added as `group_members` row with
    `role = 'creator'`.
  - `GET /` — list groups the current user belongs to (creator or member), with
    `member_count`.
  - `GET /:groupId` — group details + member list. Requires membership.
  - `POST /:groupId/members` — add member by email. Requires membership (any
    member can add, not just creator — see D14).
  - `DELETE /:groupId/members/:userId` — remove member. Requires creator role
    (`requireGroupCreator`). Cannot remove the creator themselves (400).
- New reusable middleware `middleware/groupAuth.js`:
  - `requireGroupMembership` — loads group by `:groupId` (404 if missing), checks
    `req.user` is a member (403 if not), attaches `req.group` and
    `req.membershipRole`. This middleware will be reused by expenses, settlements,
    comments, and CSV import routes in later sections, since all of those are
    group-scoped resources.
  - `requireGroupCreator` — checks `req.membershipRole === 'creator'`, must run
    after `requireGroupMembership`.
- Duplicate member prevention: `group_members` has a `UNIQUE(group_id, user_id)`
  constraint (from Section 2); service layer also checks `isMember` first to return
  a clean 409 rather than relying on a DB constraint error.
- Group expense history: `GET /:groupId` is the entry point for group context: the
  frontend group page calls this plus `GET /api/v1/groups/:groupId/expenses` (added
  in Section 6) for the expense list.

### Section 6 — Expense Management
- Endpoints (all nested under `/api/v1/groups/:groupId/expenses`, require group
  membership via `requireGroupMembership`):
  - `POST /` — create expense + auto-generate `expense_splits` in one transaction.
  - `GET /` — group expense history, paginated (`?limit`, `?offset`; default 50/0),
    newest first by `expense_date` then `id`.
  - `GET /:expenseId` — single expense + its splits.
  - `PUT /:expenseId` — update expense; deletes old splits and recalculates new ones
    in the same transaction.
  - `DELETE /:expenseId` — delete expense; `expense_splits`/`expense_comments` cascade
    via FK (Section 2).
- New `services/split.service.js` — pure calculation module, no DB access. Routes
  `split_type` to one of four calculators:
  - **equal**: divides total evenly among `participants[]`.
  - **unequal**: `split_details: {userId: amount}`, validates sum equals total
    (±1 cent tolerance for rounding).
  - **percentage**: `split_details: {userId: percentage}`, validates percentages sum
    to 100 (±0.01 tolerance).
  - **share**: `split_details: {userId: shares}`, owed = total × (userShares /
    totalShares).
- **Rounding strategy**: all amounts converted to integer cents via `Math.round(amount
  * 100)` before division, avoiding floating-point drift (e.g. 0.1 + 0.2 !== 0.3
  issues). After dividing, any leftover cents from rounding (the "drift") are assigned
  entirely to the first participant in the list, guaranteeing
  `SUM(expense_splits.owed_amount) === expenses.amount` exactly, every time. This
  invariant is critical because Section 7 (balance calculation) sums `owed_amount`
  directly.
- **Transaction handling**: `expense.service.js` uses `pool.connect()` +
  `BEGIN`/`COMMIT`/`ROLLBACK` for create/update/delete. Splits are calculated
  BEFORE `BEGIN` — if validation fails (bad percentages, mismatched unequal totals),
  nothing touches the DB. Inside the transaction, update = `UPDATE expenses` +
  `DELETE FROM expense_splits` + re-`INSERT` splits, all-or-nothing.
- **Group membership validation for participants**: before computing splits,
  `assertAllUsersAreGroupMembers` checks every `user_id` in `participants`/
  `split_details` is actually in `group_members` for this group — prevents splitting
  an expense with users outside the group.
### Section 7 — Balance Calculation
- `models/balance.model.js`: `getGroupBalances` (per-user net = paid - owed +
  settled_in - settled_out via CTEs), `getSimplifiedDebts` (greedy creditor/debtor
  matching for "who pays whom"), `getUserOverallBalance` (cross-group net).
- `GET /api/v1/groups/:groupId/balances` → `{balances, simplified_debts}`.
- `GET /api/v1/balances/me` → current user's overall net balance.

### Section 8 — Settlements
- `POST /api/v1/groups/:groupId/settlements` — records payment; validates `paid_to`
  is a group member and != paidBy (400 otherwise).
- `GET /api/v1/groups/:groupId/settlements` — list, newest first.
- Settlements feed directly into balance calc (Section 7).

### Section 9 — CSV Import + Anomaly Detection
- `POST /api/v1/groups/:groupId/csv/import` (multipart, field `file`).
- `services/csvImport.service.js`: streams CSV via csv-parser, validates each row:
  missing columns/empty values → error (row skipped); invalid/negative/zero amount;
  unparseable or year-less dates (assumed 2026); unknown currency → defaults INR
  (warning); invalid split_type → defaults equal (warning); paid_by/split_with names
  matched case-insensitively against group members (typo correction = warning,
  unmatched = error or excluded); percentage totals != 100 → error; duplicate rows
  (same date+description+payer+amount) → warning, imported anyway.
- Valid rows imported one-by-one via existing `expense.service.createExpense` (each
  its own transaction — a bad row doesn't roll back prior imports).
- Each anomaly: `{row, issue, severity, action}`.

### Section 10 — IMPORT_REPORT.md
- `utils/importReport.js` writes `backend/IMPORT_REPORT.md` (markdown table of
  summary + anomalies) after every import; also stored as JSONB in `import_logs`.

### Section 11 — Socket.IO Expense Comments
- `expense_comments` table (Section 2) + `comment.model/service/controller`.
- `POST /api/v1/groups/:groupId/expenses/:expenseId/comments` persists comment, then
  `io.to('expense:<id>').emit('new_comment', comment)`.
- `GET .../comments` lists history.
- Socket events: client emits `join_expense`/`leave_expense` with expenseId to
  join/leave the room; receives `new_comment` events while in the room.

## 8. Tradeoffs / Known Limitations
- No ORM — more boilerplate in models, but full control over SQL and easier to explain
  every query during evaluation.
- JWT stored in localStorage (not httpOnly cookie) — simpler for a 2-day build; XSS risk
  noted as a known limitation.
- No multi-currency conversion; balances assume single currency per group in practice.
- No soft-delete columns — edits/deletes are hard deletes.
- Custom migration runner instead of a framework (e.g. node-pg-migrate) — fine for
  1-2 migration files, would not scale to a larger team/project.
- File uploads stored on local disk (`backend/uploads/`) — fine for Render's ephemeral
  filesystem during a single import operation, but files don't persist across deploys
  (acceptable since CSVs are processed immediately and not retained).
- Group invite requires the invitee to already have an account (no email-based
  invite-to-register flow) — see D14.
- Any group member (not just creator) can add new members — simplifies the UI (no
  separate "admin" concept) but means members can't be prevented from inviting others.
- `findGroupsForUser` query does a self-join to compute member_count; fine at small
  group sizes but would be better as a materialized count or separate query at scale.
- Expense update/delete checks `existing.group_id !== groupId` to ensure an expense
  ID can't be accessed via a different group's URL — but this is an extra query per
  request; acceptable at this scale, could be folded into a single JOIN query later.
- `getGroupExpenseHistory` pagination uses `LIMIT/OFFSET` — simple but has the
  well-known performance degradation for very deep pages on large tables; fine for
  typical group sizes (hundreds of expenses).

## 9. Suggested Commits So Far
- `chore: scaffold monorepo structure (backend, frontend, docs)`
- `feat: add initial postgres schema (users, groups, expenses, splits, settlements, comments, import_logs)`
- `feat: set up express app architecture with middleware, error handling, and socket.io bootstrap`
- `feat: implement jwt authentication (register, login, logout, me)`
- `feat: implement group management apis (create, list, members, membership middleware)`
- `feat: implement expense management with equal/unequal/percentage/share split calculation and transactional create/update/delete`
- `feat: add balance calculation service (group balances, simplified debts, user overall balance)`
- `feat: implement settlement recording and listing`
- `feat: implement csv import with anomaly detection`
- `feat: generate IMPORT_REPORT.md after csv import`
- `feat: add real-time expense comments via socket.io`
- `feat: build react frontend (login, register, dashboard, group, expense, balances, csv pages)`
- `feat: integrate socket.io chat in expense detail page`
- `docs: finalize README, BUILD_PLAN, AI_CONTEXT, DECISIONS, SCOPE, AI_USAGE`
