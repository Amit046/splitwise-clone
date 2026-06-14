# SCOPE.md

## In Scope (Built)
- Email/password auth with JWT
- Groups: create, list, get details (with members), add member by email, remove member
- Expenses: CRUD, 4 split types, per-group history (paginated)
- Balances: per-group net balances + greedy simplified debt calculation, user overall balance
- Settlements: record payment, list settlements per group
- Expense comments: REST + Socket.IO real-time updates
- CSV import: multi-format date parsing, anomaly detection (12+ rules), IMPORT_REPORT.md generation

## Out of Scope (Documented Simplifications)
- Multi-currency conversion (currency stored per-expense; no FX rates)
- Email-based group invites (user must be pre-registered)
- Push/email notifications
- Recurring expenses
- Expense categories/tags
- Group admin/moderator roles beyond creator/member
- Soft-delete / expense audit trail
- Profile pictures / avatars
- Mobile-native app (web responsive only)

## CSV Anomaly Detection Rules Implemented
| Rule | Severity | Action |
|---|---|---|
| Missing required columns | error | Row skipped |
| Empty description | error | Row skipped |
| Invalid/unparseable date | error | Row skipped |
| Date missing year | warning | Assumed 2026, imported |
| Negative amount | error | Row skipped |
| Zero amount | warning | Imported with note |
| Missing currency | warning | Defaulted to INR |
| Unrecognized currency | warning | Defaulted to INR |
| Invalid split_type | warning | Defaulted to equal |
| paid_by not in group | error | Row skipped |
| paid_by name typo (case mismatch) | warning | Corrected, imported |
| split_with unknown user(s) | warning | Excluded from split |
| No valid participants | error | Row skipped |
| Unparseable split_details for non-equal | warning | Fell back to equal split |
| Percentage totals != 100 | error | Row skipped |
| Duplicate row (date+desc+payer+amount) | warning | Imported anyway |
| Settlement-like row | warning | Row skipped (use Settlements UI) |

## Schema Decisions
- `expense_splits.owed_amount` stores normalized amount for ALL split types — unifies balance calculation
- `percentage` and `shares` stored as nullable audit columns on `expense_splits`
- `settlements` is a separate table (not a special expense type)
- `import_logs.anomalies` stored as JSONB — flexible for variable anomaly shapes
