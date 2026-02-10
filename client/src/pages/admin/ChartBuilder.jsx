import { useState, useEffect } from 'react';
import { forms as formsApi, charts as chartsApi } from '../../api';
import ChartPreview from '../../components/ChartPreview';

export default function ChartBuilder() {
  const [forms, setForms] = useState([]);
  const [formId, setFormId] = useState('');
  const [form, setForm] = useState(null);
  const [chartType, setChartType] = useState('bar');
  const [dimension, setDimension] = useState('');
  const [measure, setMeasure] = useState('_count');
  const [aggregation, setAggregation] = useState('count');
  const [title, setTitle] = useState('');
  const [timeBucket, setTimeBucket] = useState('');
  const [timeFieldKey, setTimeFieldKey] = useState('');
  const [savedCharts, setSavedCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    formsApi.list().then(setForms);
    chartsApi.list().then(setSavedCharts).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!formId) {
      setForm(null);
      setDimension('');
      setMeasure('_count');
      setTimeFieldKey('');
      return;
    }
    formsApi.get(formId).then((f) => {
      setForm(f);
      const keys = (f.fields || []).map((x) => x.key);
      setDimension(keys[0] || '');
      setMeasure(keys[0] || '_count');
      const dateField = (f.fields || []).find((x) => x.type === 'date');
      setTimeFieldKey(dateField?.key || '');
    });
  }, [formId]);

  const numericFields = (form?.fields || []).filter((f) => f.type === 'number').map((f) => f.key);
  const allKeys = (form?.fields || []).map((f) => f.key);
  const dateFields = (form?.fields || []).filter((f) => f.type === 'date').map((f) => f.key);

  const preview = async () => {
    if (!formId || !dimension) return;
    try {
      const chart = await chartsApi.create({
        formId,
        chartType,
        dimension,
        measure,
        aggregation,
        filters: [],
        timeBucket: timeBucket || undefined,
        timeFieldKey: timeFieldKey || undefined,
        title: title || 'Preview',
      });
      const data = await chartsApi.getData(chart.id);
      setPreviewData(data);
      await chartsApi.delete(chart.id);
    } catch (e) {
      alert(e.message);
    }
  };

  const saveChart = async () => {
    if (!formId || !dimension) {
      alert('Select form and dimension');
      return;
    }
    setSaving(true);
    try {
      await chartsApi.create({
        formId,
        chartType,
        dimension,
        measure,
        aggregation,
        filters: [],
        timeBucket: timeBucket || undefined,
        timeFieldKey: timeFieldKey || undefined,
        title: title || 'Untitled chart',
      });
      setSavedCharts(await chartsApi.list());
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-600">Loading...</div>;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Chart builder</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Configuration</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Form (data source)</label>
            <select value={formId} onChange={(e) => setFormId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              <option value="">Select form</option>
              {forms.filter((f) => f.status === 'published').map((f) => (
                <option key={f.id} value={f.id}>{f.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Chart type</label>
            <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="pie">Pie</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dimension (group by)</label>
            <select value={dimension} onChange={(e) => setDimension(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              {allKeys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Measure</label>
            <select value={measure} onChange={(e) => setMeasure(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              <option value="_count">Count</option>
              {numericFields.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Aggregation</label>
            <select value={aggregation} onChange={(e) => setAggregation(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              <option value="count">Count</option>
              <option value="sum">Sum</option>
              <option value="avg">Avg</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Time bucket (optional)</label>
            <select value={timeBucket} onChange={(e) => setTimeBucket(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              <option value="">None</option>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
          {timeBucket && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date field for time</label>
              <select value={timeFieldKey} onChange={(e) => setTimeFieldKey(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                {dateFields.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Chart title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Title" />
          </div>
          <div className="flex gap-2">
            <button onClick={preview} className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700">Preview</button>
            <button onClick={saveChart} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save chart'}</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Preview</h2>
          {previewData ? <ChartPreview data={previewData} /> : <p className="text-slate-500">Click Preview to see chart.</p>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-semibold text-slate-800 mb-4">Saved charts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedCharts.map((c) => (
            <div key={c.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <p className="font-medium text-slate-800">{c.title || 'Untitled'}</p>
              <p className="text-sm text-slate-600">{c.chartType} · {c.dimension} · {c.aggregation}</p>
              <a href={`/admin/dashboard?highlight=${c.id}`} className="text-indigo-600 text-sm hover:underline">View on dashboard</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
