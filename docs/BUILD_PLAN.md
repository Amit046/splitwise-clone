# BUILD_PLAN.md

## 1. Product Research — Splitwise Analysis

**How I studied Splitwise:**
- Used the app as an end user across web and mobile
- Identified core workflows: creating groups, adding expenses, splitting in different ways, seeing balances, settling up
- Mapped the data model by reverse-engineering what information needs to be stored to support each feature
- Identified the "simplified debts" feature (Splitwise calls it "Simplify Debts") as a key algorithmic piece

**What I learned:**
- The core insight is that Splitwise is fundamentally a ledger system. Every expense creates "paid" credits and "owed" debits per user. Net balance = SUM(paid) - SUM(owed) adjusted for settlements.
- Split types (equal, exact, percentage, shares) are just different UX for arriving at the same thing: a per-user owed_amount.
- Real-time chat on expenses is a secondary but impactful feature for group coordination.
- CSV import for historical data migration is a power-user feature.

**Key workflows identified:**
1. Register → Create group → Add members → Add expense → View balances → Settle
2. Upload CSV of historical expenses → Review anomaly report → Confirm import
3. Open expense → Chat with group members in real time

**Product assumptions made:**
- Single currency per expense (no FX conversion)
- Settlements record-only (no "request payment" flow)
- Members must be registered before being added to a group (no email invite)
- Expense deletion is hard-delete (no audit trail / soft delete)

---

## 2. Architecture

### Tech stack decisions
| Choice | Reason |
|---|---|
| Express + Node | Fast to build REST APIs, familiar ecosystem |
| Raw SQL (`pg`) | Full control, interview-defensible, no ORM magic |
| PostgreSQL / Neon | Relational DB required by assignment; Neon = serverless free tier |
| Vite + React | Fast DX, simple component model |
| TailwindCSS | Utility-first, fast to style without a component library |
| Socket.IO | Simplest real-time solution for Node |
| Zod | Schema validation with TypeScript-like DX in vanilla JS |
| csv-parser | Streaming CSV parser, avoids loading full file in memory |

### Database schema (abbreviated)
```
users → group_members ← groups
groups → expenses → expense_splits
groups → settlements
expenses → expense_comments
groups → import_logs
```
Key invariant: `SUM(expense_splits.owed_amount) == expenses.amount` always, enabled by integer-cents arithmetic in split.service.js.

### API design
RESTful, all routes versioned under `/api/v1`. Group-scoped resources nested under `/groups/:groupId/`. Consistent response shape: `{ success, message, data }`.

### Frontend structure
Page-per-route. Shared `services/resources.js` for all API calls. `AuthContext` for auth state. `react-hot-toast` for notifications. Socket.IO initialized per-expense-page.

### Deployment approach
Backend on Render (free tier, Node.js web service). Frontend on Vercel (auto-deploys from GitHub). Database on Neon (free PostgreSQL, SSL required).

---

## 3. AI Collaboration Process

### How I instructed the AI
Provided a detailed upfront system prompt specifying architecture, tech stack, all features, and constraints. Instructed Claude to generate feature by feature in a documented, production-style manner.

### How the plan evolved
- Split calculation moved to a separate `split.service.js` (pure, no DB access) when it became clear it would be called from both the HTTP layer (expense create/update) and the CSV import service.
- Comment routes ended up nested inside expense routes (`/expenses/:expenseId/comments`) rather than a top-level `/comments` route for cleaner URL semantics.
- Socket.IO room strategy: client emits `join_expense`/`leave_expense` → server routes new comments to `expense:<id>` room. Simpler than namespace-per-expense.

### How AI_CONTEXT.md was maintained
Updated after every major section with implementation decisions, new API endpoints, known tradeoffs, and commit suggestions.

---

## 4. Tradeoffs

| What | Simplified | Would improve with more time |
|---|---|---|
| Invites | Existing users only, direct add | Email invite with pending state |
| Multi-currency | Stored but not converted | FX rate API integration |
| Auth | localStorage JWT | httpOnly cookies |
| Migrations | Custom runner | node-pg-migrate or Prisma |
| CSV upload storage | Local disk (ephemeral) | S3/R2 for persistent storage |
| Soft delete | Hard delete only | `deleted_at` timestamp + restore UI |
| Testing | Manual flow testing | Jest unit tests for split.service.js, balance queries |
| Pagination | LIMIT/OFFSET | Cursor-based pagination |
