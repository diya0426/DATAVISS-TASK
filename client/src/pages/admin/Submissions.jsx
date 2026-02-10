import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { submissions as subApi, forms as formsApi } from '../../api';

export default function Submissions() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    formsApi.get(formId).then(setForm).catch(() => setForm(null));
  }, [formId]);

  useEffect(() => {
    setLoading(true);
    let filterObj = null;
    try {
      if (filter.trim()) filterObj = JSON.parse(filter);
    } catch (_) {}
    subApi.list(formId, page, 20, filterObj).then(setData).catch(() => setData({ items: [], total: 0, page: 1, pageSize: 20 })).finally(() => setLoading(false));
  }, [formId, page, filter]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await subApi.exportCsv(formId);
    } catch (e) {
      alert(e.message);
    } finally {
      setExporting(false);
    }
  };

  const keys = form?.fields?.map((f) => f.key) || [];
  const totalPages = Math.ceil(data.total / data.pageSize) || 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/admin/forms" className="text-slate-600 hover:underline text-sm mb-2 inline-block">← Forms</Link>
          <h1 className="text-2xl font-bold text-slate-800">{form?.title || 'Submissions'}</h1>
        </div>
        <button onClick={handleExport} disabled={exporting} className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50">
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-slate-600 mb-1">Filter (JSON, e.g. {"{\"status\":\"active\"}"})</label>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full max-w-xl border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm" placeholder='{"fieldKey": "value"}' />
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-slate-500">Loading...</div>
        ) : (
          <>
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-700">Submitted</th>
                  {keys.map((k) => (
                    <th key={k} className="text-left p-3 font-medium text-slate-700">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr><td colSpan={keys.length + 1} className="p-6 text-slate-500">No submissions.</td></tr>
                ) : (
                  data.items.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-600">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</td>
                      {keys.map((k) => (
                        <td key={k} className="p-3 text-sm">
                          {Array.isArray(row.data?.[k]) ? row.data[k].join(', ') : row.data?.[k] != null ? String(row.data[k]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="flex justify-between items-center p-3 border-t border-slate-200 text-sm text-slate-600">
              <span>Total: {data.total}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-2 py-1 border rounded disabled:opacity-50">Previous</button>
                <span>Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 py-1 border rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
