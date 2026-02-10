import { useState, useEffect } from 'react';
import { charts as chartsApi } from '../../api';
import ChartPreview from '../../components/ChartPreview';

export default function Dashboard() {
  const [charts, setCharts] = useState([]);
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chartsApi.list().then((list) => {
      setCharts(list);
      return Promise.all(list.map((c) => chartsApi.getData(c.id).then((d) => ({ id: c.id, data: d }))));
    }).then((results) => {
      const map = {};
      results.forEach(({ id, data }) => (map[id] = data));
      setChartData(map);
    }).catch(() => setCharts([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-600">Loading dashboard...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.length === 0 ? (
          <p className="text-slate-500 col-span-2">No charts saved. Create one in Charts.</p>
        ) : (
          charts.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-slate-800 mb-4">{chartData[c.id]?.title || c.title || 'Untitled'}</h2>
              <ChartPreview data={chartData[c.id]} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
