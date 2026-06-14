# Import Report

**File:** `expenses_export.csv`
**Generated:** 2026-06-14T04:30:33.354Z

## Summary

| Metric | Count |
|---|---|
| Total rows | 42 |
| Imported | 35 |
| Skipped | 6 |
| Errors | 6 |
| Warnings | 28 |

## Anomalies

| Row | Issue | Severity | Action Taken |
|---|---|---|---|
| 2 | paid_by "Aisha" matched to "aisha" (case/typo correction) | warning | Row imported with corrections noted |
| 3 | paid_by "Priya" matched to "priya" (case/typo correction) | warning | Row imported with corrections noted |
| 4 | paid_by "Rohan" matched to "rohan" (case/typo correction) | warning | Row imported with corrections noted |
| 7 | Malformed amount: "1,200" | error | Row skipped |
| 10 | paid_by "Rohan" matched to "rohan" (case/typo correction) | warning | Row imported with corrections noted |
| 11 | paid_by "Priya S" not found among group members | error | Row skipped |
| 12 | paid_by "Rohan" matched to "rohan" (case/typo correction) | warning | Row imported with corrections noted |
| 13 | paid_by "" not found among group members | error | Row skipped |
| 14 | Row appears to be a settlement record, not an expense | warning | Row skipped (settlements must be recorded via Settlements UI) |
| 15 | Percentage split totals 110, not 100 | error | Row skipped |
| 16 | paid_by "Aisha" matched to "aisha" (case/typo correction) | warning | Row imported with corrections noted |
| 18 | paid_by "Rohan" matched to "rohan" (case/typo correction) | warning | Row imported with corrections noted |
| 19 | paid_by "Aisha" matched to "aisha" (case/typo correction) | warning | Row imported with corrections noted |
| 21 | paid_by "Rohan" matched to "rohan" (case/typo correction) | warning | Row imported with corrections noted |
| 22 | paid_by "Priya" matched to "priya" (case/typo correction) | warning | Row imported with corrections noted |
| 23 | Unrecognized user(s) in split_with: Dev's friend Kabir | warning | Excluded from split: Dev's friend Kabir |
| 24 | paid_by "Aisha" matched to "aisha" (case/typo correction) | warning | Row imported with corrections noted |
| 25 | paid_by "Rohan" matched to "rohan" (case/typo correction) | warning | Row imported with corrections noted |
| 26 | Negative amount: -30 | error | Row skipped |
| 27 | Date "Mar 14" missing year, assumed 2026 | warning | Row imported with corrections noted |
| 28 | Missing currency, defaulted to INR | warning | Defaulted to INR |
| 28 | paid_by "Priya" matched to "priya" (case/typo correction) | warning | Row imported with corrections noted |
| 29 | paid_by "Aisha" matched to "aisha" (case/typo correction) | warning | Row imported with corrections noted |
| 31 | Amount is zero | warning | Row imported as zero-amount expense |
| 31 | Amount is zero; paid_by "Priya" matched to "priya" (case/typo correction) | warning | Row imported with corrections noted |
| 32 | Percentage split totals 110, not 100 | error | Row skipped |
| 33 | paid_by "Aisha" matched to "aisha" (case/typo correction) | warning | Row imported with corrections noted |
| 34 | paid_by "Rohan" matched to "rohan" (case/typo correction) | warning | Row imported with corrections noted |
| 35 | paid_by "Aisha" matched to "aisha" (case/typo correction) | warning | Row imported with corrections noted |
| 36 | paid_by "Priya" matched to "priya" (case/typo correction) | warning | Row imported with corrections noted |
| 37 | paid_by "Rohan" matched to "rohan" (case/typo correction) | warning | Row imported with corrections noted |
| 40 | paid_by "Aisha" matched to "aisha" (case/typo correction) | warning | Row imported with corrections noted |
| 42 | paid_by "Aisha" matched to "aisha" (case/typo correction) | warning | Row imported with corrections noted |
| 43 | paid_by "Priya" matched to "priya" (case/typo correction) | warning | Row imported with corrections noted |
