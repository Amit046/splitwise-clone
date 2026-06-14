const fs = require('fs');
const csvImportService = require('../services/csvImport.service');
const { generateImportReport } = require('../utils/importReport');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * POST /api/v1/groups/:groupId/csv/import
 * multipart/form-data, field name "file"
 */
const importCsv = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No CSV file uploaded (field name must be "file")');
  }

  const { validRows, anomalies, totalRows } = await csvImportService.analyzeCsv(req.file.path, req.group.id);
  const { imported, skipped: importSkipped, importErrors } = await csvImportService.importValidRows(req.group.id, validRows);

  const allAnomalies = [...anomalies, ...importErrors];
  const errorRowCount = allAnomalies.filter((a) => a.severity === 'error').length;
  const skippedRows = errorRowCount + importSkipped;

  const reportPath = generateImportReport({
    fileName: req.file.originalname,
    totalRows,
    importedRows: imported,
    skippedRows,
    anomalies: allAnomalies,
  });

  const log = await csvImportService.logImport({
    groupId: req.group.id,
    uploadedBy: req.user.id,
    fileName: req.file.originalname,
    totalRows,
    importedRows: imported,
    skippedRows,
    anomalies: allAnomalies,
  });

  // Clean up uploaded file
  fs.unlink(req.file.path, () => {});

  return success(res, 200, {
    total_rows: totalRows,
    imported_rows: imported,
    skipped_rows: skippedRows,
    anomalies: allAnomalies,
    import_log_id: log.id,
    report_path: reportPath,
  }, 'CSV import completed');
});

module.exports = { importCsv };
