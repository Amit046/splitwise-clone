import { useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/common/Navbar';
import { csvService } from '../services/resources';

const SEVERITY_COLORS = {
  error: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function CsvImportPage() {
  const { groupId } = useParams();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Select a CSV file first'); return; }
    setLoading(true);
    try {
      const res = await csvService.import(groupId, file);
      setResult(res.data.data);
      toast.success(`Imported ${res.data.data.imported_rows} of ${res.data.data.total_rows} rows`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Import Expenses from CSV</h1>
        <p className="text-sm text-gray-500 mb-6">
          Upload a CSV with columns: <code className="bg-gray-100 px-1 rounded">date, description, paid_by, amount, currency, split_type, split_with, split_details, notes</code>
        </p>

        <form onSubmit={handleImport} className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => { setFile(e.target.files[0]); setResult(null); }}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              {file ? (
                <p className="text-sm font-medium text-primary-600">{file.name}</p>
              ) : (
                <>
                  <p className="text-gray-500 text-sm">Click to select CSV file</p>
                  <p className="text-gray-400 text-xs mt-1">Max 5MB</p>
                </>
              )}
            </label>
          </div>
          <button
            type="submit"
            disabled={!file || loading}
            className="mt-4 w-full bg-primary-600 hover:bg-primary-700 text-white text-sm py-2.5 rounded-md font-medium transition disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Import CSV'}
          </button>
        </form>

        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">{result.total_rows}</div>
                <div className="text-xs text-gray-500 mt-1">Total Rows</div>
              </div>
              <div className="bg-white rounded-lg border border-green-200 p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{result.imported_rows}</div>
                <div className="text-xs text-gray-500 mt-1">Imported</div>
              </div>
              <div className="bg-white rounded-lg border border-red-200 p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{result.skipped_rows}</div>
                <div className="text-xs text-gray-500 mt-1">Skipped</div>
              </div>
            </div>

            {/* Anomaly table */}
            {result.anomalies.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Anomaly Report ({result.anomalies.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2 pr-3">Row</th>
                        <th className="pb-2 pr-3">Issue</th>
                        <th className="pb-2 pr-3">Severity</th>
                        <th className="pb-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.anomalies
                        .sort((a, b) => a.row - b.row)
                        .map((a, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-mono">{a.row}</td>
                            <td className="py-2 pr-3 text-gray-700">{a.issue}</td>
                            <td className="py-2 pr-3">
                              <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${SEVERITY_COLORS[a.severity] || ''}`}>
                                {a.severity}
                              </span>
                            </td>
                            <td className="py-2 text-gray-500">{a.action}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
