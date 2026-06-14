# DECISIONS.md

Technical decisions, options considered, and why each was chosen.

---

## D1: ORM vs. raw SQL
**Options considered:** Prisma/Sequelize (ORM) vs. raw SQL with `pg`.
**Chosen:** Raw SQL via `pg`.
**Why:** Full visibility into every query for interview defensibility; avoids ORM
migration tooling overhead for a 2-day build; schema is small enough (8 tables) that
raw SQL stays manageable.

---

## D2: Normalizing split storage across all split types
**Options considered:**
1. Separate tables per split type (equal_splits, percentage_splits, share_splits).
2. Single `expense_splits` table storing only raw input (percentage/shares), computing
   owed amounts on the fly every time balances are queried.
3. Single `expense_splits` table storing a normalized `owed_amount` for every split
   type, plus optional raw `percentage`/`shares` for display.

**Chosen:** Option 3.
**Why:** Option 1 fragments balance queries across multiple tables (4x joins/unions).
Option 2 recomputes owed amounts on every balance read — wasteful and error-prone if
the calculation logic changes. Option 3 computes once at expense-creation time
(in the split service) and stores the result, so balance queries are a single
`SUM(owed_amount)` aggregation regardless of split type. Raw percentage/shares are
kept only for showing "this was a 30% split" in the UI.

---

## D3: Settlements as a separate ledger vs. as expense rows
**Options considered:** Model a settlement as a special "expense" with split_type =
'settlement', vs. a dedicated `settlements` table.
**Chosen:** Dedicated `settlements` table.
**Why:** Settlements have a fundamentally different shape (one payer → one payee,
no splitting). Forcing them into the expenses table would require nullable/unused
columns and special-case logic in every expense query. A separate table keeps
"what is owed" (expenses/splits) cleanly separable from "what has been paid back"
(settlements), and balance calculation is simply:
`balance(user) = SUM(paid on expenses) - SUM(owed via splits) + SUM(settlements received) - SUM(settlements paid)`

---

## D4: Group invites via direct membership insert
**Options considered:** Full invite system (pending invites table, accept/reject flow,
email notifications) vs. direct add to `group_members`.
**Chosen:** Direct add (creator/admin adds a user by email directly to `group_members`).
**Why:** Out of scope per assignment time budget; email notifications require an
external service. Documented in SCOPE.md as a known simplification. Schema can support
a future `invites` table without breaking changes.

---

## D5: Foreign key delete behavior
**Options considered:** CASCADE everywhere vs. mixed RESTRICT/CASCADE.
**Chosen:** Mixed — RESTRICT on `expenses.paid_by`, `settlements.paid_by/paid_to`
(prevents deleting users with financial history); CASCADE on group/expense-owned
child rows (group_members, expense_splits, expense_comments, expenses on group delete).
**Why:** Prevents silent loss/corruption of financial records while still allowing
natural cleanup of dependent rows when a parent group/expense is deleted.

---

## D6: JWT storage location
**Options considered:** httpOnly cookie vs. localStorage.
**Chosen:** localStorage (for this build).
**Why:** Simpler to implement within 2-day scope with Vercel/Render split-domain
deployment (avoids cross-site cookie config). Documented as a known limitation —
httpOnly cookies would be preferred for production due to XSS exposure.

---

## D7: Migration tooling
**Options considered:** node-pg-migrate / Knex migrations vs. a small custom runner.
**Chosen:** Custom runner (`db/migrate.js`) that applies `.sql` files in order and
tracks them in a `schema_migrations` table.
**Why:** Project has 1-2 migration files total. A framework adds dependency weight and
CLI conventions with no real benefit at this scale, while a ~30-line script is fully
transparent and easy to explain in an interview.

---

## D8: Error handling strategy
**Options considered:** Per-route try/catch vs. centralized error middleware with a
custom `ApiError` class and `asyncHandler` wrapper.
**Chosen:** Centralized middleware + `ApiError` + `asyncHandler`.
**Why:** Avoids repetitive try/catch in every controller. `ApiError` distinguishes
"expected" errors (validation, auth, not found — safe to show message to client) from
unexpected exceptions (logged fully, generic 500 returned). Keeps controllers focused
on business logic.

---

## D9: API versioning
**Options considered:** No versioning vs. URL-prefixed versioning (`/api/v1`).
**Chosen:** `/api/v1` prefix via a single routes aggregator.
**Why:** Negligible cost to add now; signals production-style thinking and leaves room
for a `/api/v2` without breaking existing frontend calls if requirements change later.

---

## D10: File upload storage for CSV import
**Options considered:** In-memory (multer memoryStorage, process buffer directly) vs.
disk storage in `backend/uploads/`.
**Chosen:** Disk storage with timestamped filenames.
**Why:** csv-parser streams more naturally from a file path; disk storage also allows
the file to be re-read if needed during anomaly detection without holding the whole
buffer in memory. Files are short-lived (processed immediately, not served back),
so Render's ephemeral filesystem is acceptable.

---

## D11: Login error messages and user enumeration
**Options considered:** Distinct messages ("email not found" vs "wrong password") vs.
a single generic "Invalid email or password" for both cases.
**Chosen:** Single generic message, same 401 status, for both cases.
**Why:** Prevents attackers from using the login endpoint to enumerate which emails
have registered accounts.

---

## D12: Logout endpoint with stateless JWT
**Options considered:** No logout endpoint (purely client-side token removal) vs. a
`/logout` endpoint that's a no-op server-side.
**Chosen:** `/logout` endpoint exists (protected, no-op).
**Why:** Keeps the API surface consistent/RESTful and gives a future hook for a token
blacklist (e.g. Redis-based) without changing the frontend contract. Currently logout
is fully handled client-side by discarding the stored token.

---

## D13: Email normalization
**Options considered:** Store email as provided vs. normalize (trim + lowercase)
before storage and lookup.
**Chosen:** Normalize via Zod `.trim().toLowerCase()` in both register and login
schemas.
**Why:** Prevents duplicate accounts differing only by case ("User@x.com" vs
"user@x.com") and ensures the unique constraint on `users.email` behaves as users
expect.

---

## D14: Invite flow — existing users only
**Options considered:**
1. Full invite system: invite by email even if the person hasn't registered, send
   email, pending-invite state, accept/decline.
2. Add-by-email, but only if the target user already has an account; otherwise 404
   with a clear message ("they must register first").

**Chosen:** Option 2.
**Why:** Option 1 requires an email service (SendGrid/SES) and a pending-invites
table/state machine — significant scope for a 2-day build. Option 2 still satisfies
"invite users, add users, remove users" functionally for a closed group of people who
all register first (realistic for the assignment's demo scenario). Documented in
SCOPE.md as an out-of-scope simplification; schema supports adding a real invites
table later without breaking changes.

---

## D15: Who can add members to a group
**Options considered:** Only the creator can add members vs. any existing member can
add members.
**Chosen:** Any existing member can add members; only the creator can remove members.
**Why:** Matches typical Splitwise behavior (any member can add people to a shared
group expense), while removal is restricted to avoid members removing each other in
disputes. Keeps the permission model to two simple states (creator/member) rather
than introducing a third "admin" role.

---

## D16: Reusable group membership middleware
**Options considered:** Repeat membership-check logic in every controller (group,
expense, settlement, comment, csv) vs. a single shared middleware.
**Chosen:** Shared `requireGroupMembership` / `requireGroupCreator` middleware in
`middleware/groupAuth.js`, applied via route-level middleware chains.
**Why:** Every group-scoped resource needs the identical check ("does req.user belong
to the group in :groupId?"). Centralizing it avoids duplicated SQL calls and ensures
consistent 403/404 behavior across all future route groups (Sections 6, 8, 9, 11).

---

## D17: Integer-cents arithmetic for split calculations
**Options considered:** Plain JS floating-point math on decimal amounts vs. convert
to integer cents (× 100) for all arithmetic, converting back at the end.
**Chosen:** Integer cents.
**Why:** Floating-point arithmetic on decimals (e.g. `100 / 3`) produces values like
`33.333333333333336` and repeated operations compound rounding error, risking
`SUM(expense_splits.owed_amount) !== expenses.amount`. Since balance calculation
(Section 7) depends on splits summing exactly to the expense total, this invariant
must hold. Integer cent math with `Math.round` and explicit remainder distribution
guarantees exactness.

---

## D18: Remainder/drift assignment in splits
**Options considered:** Distribute remainder cents round-robin across all
participants vs. assign the entire remainder to the first participant.
**Chosen:** Assign entire remainder to the first participant (in `participants[]`
order for equal splits, or object key order for the others).
**Why:** Simpler and fully deterministic — same input always produces the same
output, which matters for editing an expense (re-running the calculation should not
shuffle who absorbs the odd cent). The amounts involved (≤ a few cents) are
immaterial; documented as a known simplification in SCOPE.md.

---

## D19: Splits calculated before transaction begins
**Options considered:** Calculate splits inside the `BEGIN...COMMIT` block vs. before
opening a transaction/connection at all.
**Chosen:** Calculate before `pool.connect()`/`BEGIN`.
**Why:** `calculateSplits` is pure (no DB access) and can throw `ApiError` for bad
input (percentages != 100, unequal amounts not matching total). Doing this before
acquiring a connection means invalid requests never hold a DB connection or open a
transaction — connections are only used for guaranteed-valid writes.

---

## D20: Validating participants are group members
**Options considered:** Trust the frontend to only send valid group member IDs vs.
server-side re-validation against `group_members`.
**Chosen:** Server-side re-validation (`assertAllUsersAreGroupMembers`) on every
create/update.
**Why:** Prevents a manipulated request from creating splits owed by/to users outside
the group, which would corrupt balance calculations and could leak the existence of
arbitrary user IDs into a group's financial records.
