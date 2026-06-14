# AI_USAGE.md

## AI Tool Used
**Claude (claude-sonnet-4-6)** by Anthropic, via claude.ai chat interface.

---

## How It Was Used

Claude acted as a senior engineering collaborator. I provided the architecture context and requirements section by section. Claude generated production-style code, explained every major decision, and maintained AI_CONTEXT.md as a living document throughout the build.

---

## Key Prompts Used

### Initial system prompt
```
You are a senior full-stack engineer helping me complete a Splitwise-inspired app.
Build feature-by-feature in this order: [feature list].
After each section: give minimal summary, update docs, provide commit message, move to next.
Tech stack: React, TailwindCSS, Node.js, Express, PostgreSQL, JWT, Socket.IO, csv-parser.
```

### Architecture prompt
```
Generate backend architecture. Requirements:
- production-style Express, modular routes/controllers/services
- JWT auth middleware, centralized error handling
- PostgreSQL connection pooling
- multer for CSV uploads, Socket.IO bootstrap
- async error wrapper utilities, API response formatter
- health check endpoint, API versioning
```

### Split calculation prompt
```
Build split calculation service for 4 types (equal/unequal/percentage/share).
Prevent floating-point precision issues. Use integer-cents arithmetic.
Keep balance calculation future-compatible.
```

### CSV import prompt
```
Build CSV anomaly detection. Rules:
negative amounts, invalid dates, missing users, duplicate entries,
invalid split percentages, invalid currencies, malformed rows,
missing columns, empty values, invalid split_type, inconsistent totals.
Generate IMPORT_REPORT.md with: row number, issue, severity, action taken.
```

---

## AI Mistakes and How They Were Fixed

### 1. Middleware order issue (caught during review)
**Problem**: Initial draft had `errorHandler` registered before some routes, meaning errors from those routes bypassed centralized handling.
**Fix**: Explicitly placed `errorHandler` and `notFoundHandler` after all `router.use(...)` calls in `app.js`. Added a comment noting this ordering is critical.

### 2. Socket.IO CORS in production
**Problem**: First socket.io config used `origin: '*'` unconditionally.
**Fix**: Pulled origin from `CORS_ORIGIN` env variable (same as Express CORS config) so both use the same setting.

### 3. Floating-point rounding in split calculation
**Problem**: Initial draft of `calculateEqualSplit` did `amount / count` directly, which for 100/3 gives 33.333333333... and three such values sum to 99.999... not 100.
**Fix**: Introduced integer-cents arithmetic (`toCents` / `fromCents`) and explicit `distributeCentsEvenly` remainder handling. SUM invariant now guaranteed.

### 4. `mergeParams` on nested routers
**Problem**: `:groupId` wasn't available in `expense.routes.js` because the child router didn't have `mergeParams: true`.
**Fix**: Added `{ mergeParams: true }` to `express.Router()` calls for expense, settlement, and CSV routers.

### 5. CSV import — settlement rows
**Problem**: The sample CSV (expenses_export.csv) contained a row (row 14) where `paid_by = Rohan`, `split_with = Aisha`, and notes said "this is a settlement". The anomaly detector was treating this as a normal expense split.
**Fix**: Added settlement-detection heuristic: if `split_with` is a single name (not semicolon-delimited) and `notes` contains "settlement", the row is skipped with a warning directing the user to the Settlements UI.

---

## Debugging Process

1. **Reviewed every generated file** for correctness before marking a section complete.
2. **Traced the request lifecycle** (route → middleware → controller → service → model) for each new route group.
3. **Manually tested the balance formula** with a sample 3-person group to verify the CTE query returns correct signs.
4. **Cross-checked CSV anomaly rules** against the uploaded `expenses_export.csv` screenshot to ensure all visible anomalies would be caught.

---

## Overall Assessment of AI Assistance
- Excellent for boilerplate: routes/controllers/models/validation schemas
- Good for algorithmic logic (split calculation, simplified debt, anomaly detection) when given clear requirements
- Required human review for: middleware ordering, CORS edge cases, SQL correctness
- The `AI_CONTEXT.md` file as a living document was the key to maintaining consistency across 15+ sessions/sections
