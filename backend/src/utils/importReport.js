const fs = require('fs');
const path = require('path');

/**
 * Generates IMPORT_REPORT.md summarizing a CSV import run.
 * Written to backend/IMPORT_REPORT.md (overwritten each import).
 */
function generateImportReport({ fileName, totalRows, importedRows, skippedRows, anomalies }) {
  const errorCount = anomalies.filter((a) => a.severity === 'error').length;
  const warningCount = anomalies.filter((a) => a.severity === 'warning').length;

  let md = `# Import Report\n\n`;
  md += `**File:** \`${fileName}\`\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Count |\n|---|---|\n`;
  md += `| Total rows | ${totalRows} |\n`;
  md += `| Imported | ${importedRows} |\n`;
  md += `| Skipped | ${skippedRows} |\n`;
  md += `| Errors | ${errorCount} |\n`;
  md += `| Warnings | ${warningCount} |\n\n`;

  if (anomalies.length === 0) {
    md += `No anomalies detected. All rows imported cleanly.\n`;
  } else {
    md += `## Anomalies\n\n`;
    md += `| Row | Issue | Severity | Action Taken |\n|---|---|---|---|\n`;
    anomalies
      .sort((a, b) => a.row - b.row)
      .forEach((a) => {
        md += `| ${a.row} | ${a.issue.replace(/\|/g, '\\|')} | ${a.severity} | ${a.action.replace(/\|/g, '\\|')} |\n`;
      });
  }

  const outPath = path.join(__dirname, '..', '..', 'IMPORT_REPORT.md');
  fs.writeFileSync(outPath, md);
  return outPath;
}

module.exports = { generateImportReport };
