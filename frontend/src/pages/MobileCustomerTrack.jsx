import { useState, useEffect } from 'react';
import { useParams } from 'react';
import { getCustomerTrackingByToken } from '../services/api';

const STAGES = [
  { key: 'LOAD_CREATED', label: 'Load Created' },
  { key: 'RATE_CONFIRMED', label: 'Vehicle Confirmed' },
  { key: 'AT_PICKUP', label: 'At Pickup' },
  { key: 'VEHICLE_LOADED', label: 'Loaded' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'AT_DELIVERY', label: 'At Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CLOSED', label: 'Completed' },
];

export default function MobileCustomerTrack() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTrackingData();
  }, [token]);

  const loadTrackingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCustomerTrackingByToken(token);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired tracking link');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4 text-slate-300 antialiased">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading live shipment tracking...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4 text-slate-300 antialiased">
        <div className="max-w-md w-full rounded-2xl border border-rose-800/80 bg-rose-950/40 p-6 text-center shadow-xl">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-white mb-2">Tracking Link Expired</h2>
          <p className="text-sm text-rose-300">{error || 'This shipment tracking link is invalid.'}</p>
        </div>
      </div>
    );
  }

  const { load, timeline = [], podAvailable } = data;
  const currentStatus = load.status || 'LOAD_CREATED';

  const getStageIndex = (st) => STAGES.findIndex((s) => s.key === st);
  const currentStageIdx = Math.max(0, getStageIndex(currentStatus));

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 max-w-md mx-auto antialiased">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl mb-4 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 font-bold text-white text-xl shadow-lg shadow-cyan-500/20 mb-2">
          CK
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Chitkote Logistics</h1>
        <p className="text-xs text-cyan-400 font-medium">Live Shipment Tracking Portal</p>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-left">
          <div>
            <div className="text-slate-400">Load Reference</div>
            <div className="font-bold font-mono text-cyan-300 text-sm">{load.load_id || 'CK-1025'}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">Shipment Route</div>
            <div className="font-bold text-white">{load.from || load.from_city} → {load.to || load.to_city}</div>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-slate-950 p-2.5 text-xs text-slate-300 font-semibold border border-slate-800 flex items-center justify-between">
          <span>Status: <strong className="text-emerald-400">{currentStatus}</strong></span>
          {load.party_rate && (
            <span>Billed Freight: <strong className="text-cyan-400">₹{Number(load.party_rate).toLocaleString('en-IN')}</strong></span>
          )}
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-xl mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Shipment Progress Milestone
        </h2>

        <div className="space-y-3">
          {STAGES.map((st, idx) => {
            const isDone = idx <= currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            return (
              <div key={st.key} className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                <div className="flex-1">
                  <div className={`text-xs font-semibold ${isCurrent ? 'text-cyan-300 text-sm' : isDone ? 'text-slate-200' : 'text-slate-500'}`}>
                    {st.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Document Download Links */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-xl space-y-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Customer Documents & Invoicing
        </h2>

        <a
          href={`http://localhost:5000/api/documents/${load.load_id || 'CK-1025'}/customer-invoice.html`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-cyan-400 font-semibold hover:bg-slate-900"
        >
          <span>📄 Customer Tax Invoice (₹{load.party_rate || 45000})</span>
          <span>View Invoice ↗</span>
        </a>

        {podAvailable && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-xs text-emerald-300 font-semibold">
            <span>✅ Verified Proof of Delivery (POD)</span>
            <span>Verified ✓</span>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        Chitkote Logistics India Private Limited · Customer Support: 9390003955
      </div>
    </div>
  );
}
