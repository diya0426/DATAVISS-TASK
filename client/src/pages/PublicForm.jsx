import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublishedForm, submitPublicForm } from '../api';
import { evaluateVisibleFields } from '../utils/formRules';
import { validateField } from '../utils/validation';

export default function PublicForm() {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getPublishedForm(slug).then(setForm).catch(() => setForm(null)).finally(() => setLoading(false));
  }, [slug]);

  const visibleKeys = form ? evaluateVisibleFields(form, data) : new Set();

  const handleChange = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const runValidation = () => {
    const next = {};
    (form?.fields || []).forEach((f) => {
      if (!visibleKeys.has(f.key)) return;
      const err = validateField(f, data[f.key]);
      if (err) next[f.key] = err;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!runValidation()) return;
    setSubmitting(true);
    try {
      await submitPublicForm(slug, data);
      setSubmitted(true);
    } catch (err) {
      const detail = err.detail || {};
      if (detail?.errors?.length) {
        const byField = {};
        detail.errors.forEach((e) => (byField[e.field] = e.message));
        setErrors(byField);
        return;
      }
      setErrors({ _form: err.message || 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading form...</div>;
  if (!form) return <div className="min-h-screen flex items-center justify-center text-slate-600">Form not found.</div>;
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-green-700 mb-2">Thank you</h1>
          <p className="text-slate-600">Your submission has been received.</p>
        </div>
      </div>
    );
  }

  const fields = (form.fields || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">{form.title}</h1>
        {errors._form && <div className="mb-4 text-red-600 text-sm">{errors._form}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map((f) => {
            if (!visibleKeys.has(f.key)) return null;
            const value = data[f.key];
            const err = errors[f.key];
            const id = `field-${f.key}`;
            return (
              <div key={f.key}>
                <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                {f.type === 'text' && (
                  <input
                    id={id}
                    type="text"
                    value={value ?? ''}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 ${err ? 'border-red-500' : 'border-slate-300'}`}
                  />
                )}
                {f.type === 'number' && (
                  <input
                    id={id}
                    type="number"
                    value={value ?? ''}
                    onChange={(e) => handleChange(f.key, e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-full border rounded-lg px-3 py-2 ${err ? 'border-red-500' : 'border-slate-300'}`}
                  />
                )}
                {f.type === 'date' && (
                  <input
                    id={id}
                    type="date"
                    value={value ?? ''}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 ${err ? 'border-red-500' : 'border-slate-300'}`}
                  />
                )}
                {f.type === 'boolean' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={value === true || value === 'true'}
                      onChange={(e) => handleChange(f.key, e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-slate-600">Yes</span>
                  </label>
                )}
                {f.type === 'select' && (
                  <select
                    id={id}
                    value={value ?? ''}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 ${err ? 'border-red-500' : 'border-slate-300'}`}
                  >
                    <option value="">Select...</option>
                    {(f.options || []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                )}
                {f.type === 'multiselect' && (
                  <div className="space-y-2">
                    {(f.options || []).map((o) => (
                      <label key={o} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(value || []).includes(o)}
                          onChange={(e) => {
                            const arr = value || [];
                            if (e.target.checked) handleChange(f.key, [...arr, o]);
                            else handleChange(f.key, arr.filter((x) => x !== o));
                          }}
                          className="rounded border-slate-300"
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                )}
                {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
              </div>
            );
          })}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
