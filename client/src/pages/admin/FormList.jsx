import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { forms } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function FormList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();

  useEffect(() => {
    forms.list().then(setList).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-600">Loading forms...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Forms</h1>
        {isAdmin && (
          <Link
            to="/admin/forms/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            New form
          </Link>
        )}
      </div>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 font-medium text-slate-700">Title</th>
              <th className="text-left p-3 font-medium text-slate-700">Slug</th>
              <th className="text-left p-3 font-medium text-slate-700">Status</th>
              <th className="text-left p-3 font-medium text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-slate-500">No forms yet.</td></tr>
            ) : (
              list.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">{f.title}</td>
                  <td className="p-3 font-mono text-sm">{f.slug}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-sm ${f.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    {isAdmin && (
                      <Link to={`/admin/forms/${f.id}`} className="text-indigo-600 hover:underline">Edit</Link>
                    )}
                    <Link to={`/admin/submissions/${f.id}`} className="text-slate-600 hover:underline">Submissions</Link>
                    {f.status === 'published' && (
                      <a href={`/form/${f.slug}`} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline">View public</a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
