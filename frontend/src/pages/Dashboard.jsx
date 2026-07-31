import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { getContacts, getLoads, getLogs } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const getStatusBadgeClass = (status = '') => {
  const s = String(status).toLowerCase();
  if (s.includes('read')) return 'bg-amber-900/60 text-amber-300 border-amber-800';
  if (s.includes('deliver')) return 'bg-emerald-900/60 text-emerald-300 border-emerald-800';
  if (s.includes('fail')) return 'bg-rose-900/60 text-rose-300 border-rose-800';
  if (s.includes('sent')) return 'bg-cyan-900/60 text-cyan-300 border-cyan-800';
  return 'bg-slate-800 text-slate-300 border-slate-700';
};

const Dashboard = () => {
  const [stats, setStats] = useState({ today: 0, month: 0, deliveryRate: 0, readRate: 0, failed: 0, totalContacts: 0, activeLoads: 0 });
  const [logs, setLogs] = useState([]);

  const fetchData = async () => {
    try {
      const [logsRes, contactsRes, loadsRes] = await Promise.all([getLogs(), getContacts(), getLoads()]);
      const list = logsRes.data || [];
      const contactsList = contactsRes.data || [];
      const loadsList = loadsRes.data || [];
      setLogs(list);

      const now = new Date();
      const today = list.filter((item) => item.created_at && new Date(item.created_at).toDateString() === now.toDateString()).length;
      const month = list.filter((item) => {
        if (!item.created_at) return false;
        const d = new Date(item.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      const deliveredCount = list.filter((item) => {
        const s = String(item.status || '').toLowerCase();
        return s.includes('deliver') || s.includes('read');
      }).length;

      const readCount = list.filter((item) => {
        const s = String(item.status || '').toLowerCase();
        return s.includes('read');
      }).length;

      const failedCount = list.filter((item) => {
        const s = String(item.status || '').toLowerCase();
        return s.includes('fail');
      }).length;

      const totalOutbound = list.length || 1;
      const deliveryRate = list.length ? Math.round((deliveredCount / totalOutbound) * 100) : 0;
      const readRate = list.length ? Math.round((readCount / totalOutbound) * 100) : 0;

      setStats({
        today,
        month,
        deliveryRate: Math.min(100, deliveryRate),
        readRate: Math.min(100, readRate),
        failed: failedCount,
        totalContacts: contactsList.length,
        activeLoads: loadsList.length,
      });
    } catch (error) {
      // ignore transient fetch errors
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const chartData = {
    labels: ['Today', 'This Month', 'Delivery %', 'Read %', 'Failed'],
    datasets: [
      {
        label: 'Metrics',
        data: [stats.today, stats.month, stats.deliveryRate, stats.readRate, stats.failed],
        backgroundColor: ['#06b6d4', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'],
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
      x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Dashboard Overview</h2>
          <p className="text-sm text-slate-400">Live WhatsApp Cloud API performance & broadcast analytics</p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-300">
            Contacts: <strong className="text-cyan-400">{stats.totalContacts}</strong>
          </span>
          <span className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-slate-300">
            Saved Loads: <strong className="text-cyan-400">{stats.activeLoads}</strong>
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          ['Today\'s Messages', stats.today, 'text-cyan-400'],
          ['This Month', stats.month, 'text-purple-400'],
          ['Delivery Rate', `${stats.deliveryRate}%`, 'text-emerald-400'],
          ['Read Rate', `${stats.readRate}%`, 'text-amber-400'],
          ['Failed', stats.failed, 'text-rose-400'],
        ].map(([label, value, colorClass]) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-slate-700">
            <p className="text-sm text-slate-400">{label}</p>
            <p className={`mt-2 text-2xl font-semibold ${colorClass}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-4 text-base font-semibold text-slate-200">Message Volume & Delivery Performance</h3>
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Broadcast Activity</h2>
          <span className="text-xs text-slate-400">Auto-refreshing every 10s</span>
        </div>
        <div className="space-y-3 max-h-80 overflow-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-slate-400">No message activity logged yet.</p>
          ) : (
            logs.slice(0, 8).map((log) => (
              <div key={log.id || log.created_at} className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 text-sm">
                <div className="space-y-1">
                  <div className="font-medium text-slate-200">{log.mobile || 'Recipient'}</div>
                  <div className="text-xs text-slate-400 line-clamp-1 max-w-md">{log.message}</div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">{log.created_at ? new Date(log.created_at).toLocaleTimeString() : '—'}</span>
                  <span className={`rounded-full border px-2.5 py-0.5 font-medium ${getStatusBadgeClass(log.status)}`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
