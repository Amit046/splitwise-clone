const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../config/db');
const userModel = require('../models/user.model');
const groupModel = require('../models/group.model');
const expenseService = require('./expense.service');

const VALID_SPLIT_TYPES = ['equal', 'unequal', 'percentage', 'share', ''];
const VALID_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

const REQUIRED_COLUMNS = ['date', 'description', 'paid_by', 'amount', 'currency', 'split_type', 'split_with'];

/**
 * Parses a date string in multiple common formats:
 * YYYY-MM-DD, DD/MM/YYYY, "Mar 14" (assumes current year), etc.
 * Returns an ISO date string or null if unparseable.
 */
function normalizeDate(raw) {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // "Mar 14" -> assume year 2026 (no year given - flagged separately as anomaly)
  const monthDay = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2})$/);
  if (monthDay) {
    const parsed = Date.parse(`${monthDay[1]} ${monthDay[2]}, 2026`);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }

  // Fallback: try native Date parse
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return null;
}

/**
 * Parses split_with (";"-separated names) and split_details
 * (e.g. "Rohan 700; Priya 400; Aisha 30%") into a map of name -> value.
 */
function parseSplitDetails(raw) {
  if (!raw || !raw.trim()) return null;
  const map = {};
  raw.split(';').forEach((part) => {
    const m = part.trim().match(/^(.+?)\s+([\d.]+)\s*%?$/);
    if (m) {
      map[m[1].trim()] = Number(m[2]);
    }
  });
  return Object.keys(map).length > 0 ? map : null;
}

/**
 * Reads CSV file, validates each row, builds a list of valid rows
 * (ready to insert) and a list of anomalies.
 *
 * Each anomaly: { row, issue, severity, action }
 * severity: 'error' (row skipped) | 'warning' (row imported with caveat)
 */
async function analyzeCsv(filePath, groupId) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', () => resolve(rows))
      .on('error', reject);
  }).then(async (rawRows) => {
    const anomalies = [];
    const validRows = [];
    const seen = new Set(); // duplicate detection: date|description|paid_by|amount

    // Build group member name lookup (case-insensitive)
    const members = await groupModel.getMembers(groupId);
    const nameToUser = new Map();
    members.forEach((m) => {
      nameToUser.set(m.name.trim().toLowerCase(), m);
      nameToUser.set(m.email.trim().toLowerCase(), m);
    });

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2; // +1 for 0-index, +1 for header row
      const issues = [];
      let severity = null; // highest severity seen for this row

      // --- Missing columns / empty values ---
      const missing = REQUIRED_COLUMNS.filter((c) => row[c] === undefined);
      if (missing.length > 0) {
        anomalies.push({ row: rowNum, issue: `Missing columns: ${missing.join(', ')}`, severity: 'error', action: 'Row skipped' });
        return;
      }

      const description = (row.description || '').trim();
      const paidByRaw = (row.paid_by || '').trim();
      const amountRaw = (row.amount || '').trim();
      const currencyRaw = (row.currency || '').trim().toUpperCase();
      const splitTypeRaw = (row.split_type || '').trim().toLowerCase() || 'equal';
      const splitWithRaw = (row.split_with || '').trim();
      const dateRaw = (row.date || '').trim();
      const splitDetailsRaw = (row.split_details || '').trim();

      if (!description) {
        anomalies.push({ row: rowNum, issue: 'Empty description', severity: 'error', action: 'Row skipped' });
        return;
      }

      // --- Date validation ---
      const normalizedDate = normalizeDate(dateRaw);
      if (!normalizedDate) {
        anomalies.push({ row: rowNum, issue: `Invalid or unparseable date: "${dateRaw}"`, severity: 'error', action: 'Row skipped' });
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw) && /^[A-Za-z]{3,9}\s+\d{1,2}$/.test(dateRaw)) {
        issues.push(`Date "${dateRaw}" missing year, assumed 2026`);
        severity = 'warning';
      }

      // --- Amount validation ---
      const amount = Number(amountRaw);
      if (amountRaw === '' || isNaN(amount)) {
        anomalies.push({ row: rowNum, issue: `Malformed amount: "${amountRaw}"`, severity: 'error', action: 'Row skipped' });
        return;
      }
      if (amount < 0) {
        anomalies.push({ row: rowNum, issue: `Negative amount: ${amount}`, severity: 'error', action: 'Row skipped' });
        return;
      }
      if (amount === 0) {
        anomalies.push({ row: rowNum, issue: 'Amount is zero', severity: 'warning', action: 'Row imported as zero-amount expense' });
        severity = severity || 'warning';
        issues.push('Amount is zero');
      }

      // --- Currency validation ---
      let currency = currencyRaw;
      if (!currency) {
        anomalies.push({ row: rowNum, issue: 'Missing currency, defaulted to INR', severity: 'warning', action: 'Defaulted to INR' });
        currency = 'INR';
        severity = severity || 'warning';
      } else if (!VALID_CURRENCIES.includes(currency)) {
        anomalies.push({ row: rowNum, issue: `Unrecognized currency "${currencyRaw}", defaulted to INR`, severity: 'warning', action: 'Defaulted to INR' });
        currency = 'INR';
        severity = severity || 'warning';
      }

      // --- Split type validation ---
      let splitType = splitTypeRaw;
      if (!VALID_SPLIT_TYPES.includes(splitType)) {
        anomalies.push({ row: rowNum, issue: `Invalid split_type "${splitTypeRaw}", defaulted to "equal"`, severity: 'warning', action: 'Defaulted to equal split' });
        splitType = 'equal';
        severity = severity || 'warning';
      }
      if (!splitType) splitType = 'equal';

      // Settlement rows (no split_type, split_with = single payee) - treat as note-only, skip
      if (!row.split_type && !splitWithRaw.includes(';') && (row.notes || '').toLowerCase().includes('settlement')) {
        anomalies.push({ row: rowNum, issue: 'Row appears to be a settlement record, not an expense', severity: 'warning', action: 'Row skipped (settlements must be recorded via Settlements UI)' });
        return;
      }

      // --- paid_by validation ---
      const paidByUser = nameToUser.get(paidByRaw.toLowerCase());
      if (!paidByUser) {
        anomalies.push({ row: rowNum, issue: `paid_by "${paidByRaw}" not found among group members`, severity: 'error', action: 'Row skipped' });
        return;
      }
      if (paidByRaw !== paidByUser.name) {
        issues.push(`paid_by "${paidByRaw}" matched to "${paidByUser.name}" (case/typo correction)`);
        severity = severity || 'warning';
      }

      // --- split_with / participants validation ---
      if (!splitWithRaw) {
        anomalies.push({ row: rowNum, issue: 'Missing split_with (no participants)', severity: 'error', action: 'Row skipped' });
        return;
      }

      const splitWithNames = splitWithRaw.split(';').map((s) => s.trim()).filter(Boolean);
      const participantIds = [];
      const unmatchedNames = [];
      splitWithNames.forEach((name) => {
        const u = nameToUser.get(name.toLowerCase());
        if (u) {
          if (!participantIds.includes(u.id)) participantIds.push(u.id);
        } else {
          unmatchedNames.push(name);
        }
      });

      if (unmatchedNames.length > 0) {
        anomalies.push({ row: rowNum, issue: `Unrecognized user(s) in split_with: ${unmatchedNames.join(', ')}`, severity: 'warning', action: `Excluded from split: ${unmatchedNames.join(', ')}` });
        severity = severity || 'warning';
      }

      if (participantIds.length === 0) {
        anomalies.push({ row: rowNum, issue: 'No valid participants found in split_with', severity: 'error', action: 'Row skipped' });
        return;
      }

      // Ensure payer is included in participants (common expectation)
      if (!participantIds.includes(paidByUser.id)) {
        participantIds.push(paidByUser.id);
      }

      // --- split_details validation (for percentage/share/unequal) ---
      let splitDetails = null;
      if (splitType !== 'equal') {
        const parsedDetails = parseSplitDetails(splitDetailsRaw);
        if (!parsedDetails) {
          anomalies.push({ row: rowNum, issue: `Missing/unparseable split_details for split_type "${splitType}"`, severity: 'warning', action: 'Fell back to equal split' });
          splitType = 'equal';
          severity = severity || 'warning';
        } else {
          // Map names -> user ids
          splitDetails = {};
          let ok = true;
          for (const [name, val] of Object.entries(parsedDetails)) {
            const u = nameToUser.get(name.toLowerCase());
            if (!u) {
              ok = false;
              break;
            }
            splitDetails[u.id] = val;
          }
          if (!ok) {
            anomalies.push({ row: rowNum, issue: `split_details references unknown user, falling back to equal split`, severity: 'warning', action: 'Fell back to equal split' });
            splitType = 'equal';
            splitDetails = null;
            severity = severity || 'warning';
          } else if (splitType === 'percentage') {
            const sum = Object.values(splitDetails).reduce((a, b) => a + b, 0);
            if (Math.abs(sum - 100) > 0.01) {
              anomalies.push({ row: rowNum, issue: `Percentage split totals ${sum}, not 100`, severity: 'error', action: 'Row skipped' });
              return;
            }
          }
        }
      }

      // --- Duplicate detection ---
      const dupKey = `${normalizedDate}|${description.toLowerCase()}|${paidByUser.id}|${amount}|${currency}`;
      if (seen.has(dupKey)) {
        anomalies.push({ row: rowNum, issue: 'Duplicate of a previous row (same date, description, payer, amount)', severity: 'warning', action: 'Row imported anyway (possible legitimate repeat)' });
        severity = severity || 'warning';
      }
      seen.add(dupKey);

      if (issues.length > 0 && severity) {
        anomalies.push({ row: rowNum, issue: issues.join('; '), severity, action: 'Row imported with corrections noted' });
      }

      validRows.push({
        rowNum,
        description,
        amount,
        currency,
        split_type: splitType,
        expense_date: normalizedDate,
        notes: (row.notes || '').trim() || null,
        paid_by: paidByUser.id,
        participants: splitType === 'equal' ? participantIds : undefined,
        split_details: splitType !== 'equal' ? splitDetails : undefined,
      });
    });

    return { validRows, anomalies, totalRows: rawRows.length };
  });
}

/**
 * Imports valid rows as expenses (each via expense.service.createExpense,
 * which handles split calculation + its own transaction per row).
 * One bad row does not roll back previously imported rows — each expense
 * is its own transaction (documented tradeoff).
 */
async function importValidRows(groupId, validRows) {
  let imported = 0;
  let skipped = 0;
  const importErrors = [];

  for (const row of validRows) {
    try {
      await expenseService.createExpense(groupId, row.paid_by, {
        description: row.description,
        amount: row.amount,
        currency: row.currency,
        split_type: row.split_type,
        expense_date: row.expense_date,
        notes: row.notes,
        participants: row.participants,
        split_details: row.split_details,
      });
      imported++;
    } catch (err) {
      skipped++;
      importErrors.push({ row: row.rowNum, issue: err.message, severity: 'error', action: 'Row skipped during import' });
    }
  }

  return { imported, skipped, importErrors };
}

async function logImport({ groupId, uploadedBy, fileName, totalRows, importedRows, skippedRows, anomalies }) {
  const { rows } = await pool.query(
    `INSERT INTO import_logs (group_id, uploaded_by, file_name, total_rows, imported_rows, skipped_rows, anomalies)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, group_id, uploaded_by, file_name, total_rows, imported_rows, skipped_rows, anomalies, created_at`,
    [groupId, uploadedBy, fileName, totalRows, importedRows, skippedRows, JSON.stringify(anomalies)]
  );
  return rows[0];
}

module.exports = { analyzeCsv, importValidRows, logImport };
