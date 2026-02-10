import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { forms as formsApi } from '../../api';

const FIELD_TYPES = ['text', 'number', 'select', 'multiselect', 'date', 'boolean'];
const RULE_OPERATORS = ['equals', 'in', 'notEquals'];

export default function FormDesigner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [fields, setFields] = useState([]);
  const [rules, setRules] = useState([]);

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      setForm({});
      return;
    }
    formsApi.get(id).then((f) => {
      setForm(f);
      setTitle(f.title);
      setSlug(f.slug);
      setFields(f.fields || []);
      setRules(f.rules || []);
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id, isNew]);

  const addField = () => {
    const key = `field_${Date.now()}`;
    setFields((prev) => [...prev, { key, label: 'New field', type: 'text', required: false, order: prev.length, options: [], validations: null }]);
  };

  const updateField = (index, updates) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const removeField = (index) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
    setRules((prev) => prev.filter((r) => r.targetFieldKey !== fields[index]?.key));
  };

  const moveField = (index, dir) => {
    if (dir === -1 && index === 0) return;
    if (dir === 1 && index === fields.length - 1) return;
    const next = [...fields];
    const j = index + dir;
    [next[index], next[j]] = [next[j], next[index]];
    next.forEach((f, i) => (f.order = i));
    setFields(next);
  };

  const addRule = () => {
    const first = fields[0]?.key;
    setRules((prev) => [...prev, { targetFieldKey: first || '', sourceFieldKey: first || '', operator: 'equals', value: '' }]);
  };

  const updateRule = (index, updates) => {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const removeRule = (index) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      if (isNew) {
        if (!title.trim() || !slug.trim()) {
          setError('Title and slug required');
          return;
        }
        const created = await formsApi.create({ title: title.trim(), slug: slug.trim() });
        await formsApi.update(created.id, { fields, rules });
        navigate(`/admin/forms/${created.id}`, { replace: true });
        return;
      }
      const payload = { title: title.trim(), slug: slug.trim(), fields, rules };
      await formsApi.update(id, payload);
      setForm((f) => ({ ...f, ...payload }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const publish = async (publish) => {
    if (isNew) return;
    setError('');
    try {
      await formsApi.publish(id, publish);
      setForm((f) => ({ ...f, status: publish ? 'published' : 'draft', publishedAt: publish ? new Date().toISOString() : null }));
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className="text-slate-600">Loading...</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'New form' : 'Edit form'}</h1>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          {!isNew && form?.status === 'draft' && (
            <button onClick={() => publish(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Publish</button>
          )}
          {!isNew && form?.status === 'published' && (
            <button onClick={() => publish(false)} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700">Unpublish</button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded">{error}</div>}

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Form details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Form title" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL)</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono" placeholder="my-form" disabled={form?.status === 'published'} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-800">Fields</h2>
            <button onClick={addField} className="text-indigo-600 hover:underline">+ Add field</button>
          </div>
          <div className="space-y-4">
            {fields.map((f, i) => (
              <div key={f.key} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} className="flex-1 font-medium border border-slate-300 rounded px-2 py-1" placeholder="Label" />
                  <select value={f.type} onChange={(e) => updateField(i, { type: e.target.value })} className="border border-slate-300 rounded px-2 py-1">
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                    <span className="text-sm">Required</span>
                  </label>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveField(i, -1)} className="text-slate-500 hover:text-slate-700">↑</button>
                    <button type="button" onClick={() => moveField(i, 1)} className="text-slate-500 hover:text-slate-700">↓</button>
                    <button type="button" onClick={() => removeField(i)} className="text-red-600 hover:underline">Remove</button>
                  </div>
                </div>
                <div className="flex gap-2 items-center text-sm">
                  <span className="text-slate-500">Key:</span>
                  <input value={f.key} onChange={(e) => updateField(i, { key: e.target.value })} className="flex-1 max-w-xs font-mono text-sm border border-slate-300 rounded px-2 py-1" />
                </div>
                {(f.type === 'select' || f.type === 'multiselect') && (
                  <div className="mt-2">
                    <label className="block text-sm text-slate-600 mb-1">Options (one per line)</label>
                    <textarea
                      value={(f.options || []).join('\n')}
                      onChange={(e) => updateField(i, { options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      rows={3}
                    />
                  </div>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <label className="flex items-center gap-1">
                    Min: <input type="number" value={f.validations?.min ?? ''} onChange={(e) => updateField(i, { validations: { ...f.validations, min: e.target.value === '' ? undefined : Number(e.target.value) } })} className="w-20 border rounded px-1" />
                  </label>
                  <label className="flex items-center gap-1">
                    Max: <input type="number" value={f.validations?.max ?? ''} onChange={(e) => updateField(i, { validations: { ...f.validations, max: e.target.value === '' ? undefined : Number(e.target.value) } })} className="w-20 border rounded px-1" />
                  </label>
                  <label className="flex items-center gap-1">
                    Min length: <input type="number" value={f.validations?.minLength ?? ''} onChange={(e) => updateField(i, { validations: { ...f.validations, minLength: e.target.value === '' ? undefined : parseInt(e.target.value, 10) } })} className="w-20 border rounded px-1" />
                  </label>
                  <label className="flex items-center gap-1">
                    Max length: <input type="number" value={f.validations?.maxLength ?? ''} onChange={(e) => updateField(i, { validations: { ...f.validations, maxLength: e.target.value === '' ? undefined : parseInt(e.target.value, 10) } })} className="w-20 border rounded px-1" />
                  </label>
                  <label className="col-span-2 flex items-center gap-1">
                    Regex: <input value={f.validations?.pattern ?? ''} onChange={(e) => updateField(i, { validations: { ...f.validations, pattern: e.target.value || undefined } })} className="flex-1 font-mono border rounded px-1" placeholder="e.g. ^[A-Z]+$" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-800">Show / hide rules</h2>
            <button onClick={addRule} className="text-indigo-600 hover:underline">+ Add rule</button>
          </div>
          <p className="text-sm text-slate-600 mb-4">Show target field when source field matches condition.</p>
          <div className="space-y-3">
            {rules.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 border border-slate-200 rounded p-3 bg-slate-50">
                <span className="text-slate-600">Show</span>
                <select value={r.targetFieldKey} onChange={(e) => updateRule(i, { targetFieldKey: e.target.value })} className="border rounded px-2 py-1">
                  {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                <span className="text-slate-600">when</span>
                <select value={r.sourceFieldKey} onChange={(e) => updateRule(i, { sourceFieldKey: e.target.value })} className="border rounded px-2 py-1">
                  {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                <select value={r.operator} onChange={(e) => updateRule(i, { operator: e.target.value })} className="border rounded px-2 py-1">
                  {RULE_OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {r.operator === 'in' ? (
                  <input value={Array.isArray(r.value) ? r.value.join(', ') : r.value} onChange={(e) => updateRule(i, { value: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="border rounded px-2 py-1 w-40" placeholder="a, b, c" />
                ) : (
                  <input value={r.value ?? ''} onChange={(e) => updateRule(i, { value: e.target.value })} className="border rounded px-2 py-1 w-32" placeholder="Value" />
                )}
                <button type="button" onClick={() => removeRule(i)} className="text-red-600 hover:underline text-sm">Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
