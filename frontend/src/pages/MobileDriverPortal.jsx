import { useState, useEffect } from 'react';
import { useParams } from 'react';
import { getDriverDataByToken, handleDriverActionByToken, uploadPortalDocument } from '../services/api';

export default function MobileDriverPortal() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDriverData();
  }, [token]);

  const loadDriverData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDriverDataByToken(token);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired driver link');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionName, label) => {
    try {
      const res = await handleDriverActionByToken({
        token,
        action: actionName,
      });
      setActionMsg(`✓ Status updated: ${label}`);
      setTimeout(() => setActionMsg(''), 4000);
      await loadDriverData();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    }
  };

  const handlePodUpload = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await uploadPortalDocument({
          token,
          doc_type: 'pod',
          file_url: reader.result,
        });
        await handleDriverActionByToken({ token, action: 'DELIVERED' });
        setActionMsg('✓ POD Uploaded & Trip Marked Delivered!');
        setTimeout(() => setActionMsg(''), 4000);
        await loadDriverData();
      } catch (err) {
        alert(err.response?.data?.error || 'POD Upload failed');
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4 text-slate-300 antialiased">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading driver trip portal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4 text-slate-300 antialiased">
        <div className="max-w-md w-full rounded-2xl border border-rose-800/80 bg-rose-950/40 p-6 text-center shadow-xl">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-white mb-2">Driver Link Expired</h2>
          <p className="text-sm text-rose-300">{error || 'This driver trip link is no longer active.'}</p>
        </div>
      </div>
    );
  }

  const { load } = data;

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 max-w-lg mx-auto antialiased">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl mb-4 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 font-bold text-white text-xl shadow-lg shadow-cyan-500/20 mb-2">
          CK
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Chitkote Logistics</h1>
        <p className="text-xs text-cyan-400 font-medium">Driver Trip Assistant</p>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-left">
          <div>
            <div className="text-slate-400">Trip / Load ID</div>
            <div className="font-bold font-mono text-cyan-300 text-sm">{load.load_id}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">Vehicle / Driver</div>
            <div className="font-mono text-indigo-400 font-bold">{load.vehicle_number}</div>
            <div className="text-slate-200">{load.driver_name}</div>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-slate-950 p-2.5 text-xs text-slate-300 font-semibold border border-slate-800">
          📍 Route: {load.pickup} → {load.delivery}
        </div>
      </div>

      {actionMsg && (
        <div className="rounded-xl border border-emerald-700 bg-emerald-950/90 p-3 mb-4 text-center text-xs font-semibold text-emerald-300 shadow-md animate-bounce">
          {actionMsg}
        </div>
      )}

      {/* Driver Touch Action Buttons */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Trip Status Actions (Tap to update)
        </h2>

        <button
          onClick={() => handleAction('REACHED_PICKUP', 'Reached Pickup Location')}
          className="w-full rounded-2xl border border-cyan-800/80 bg-gradient-to-r from-cyan-950 to-slate-900 hover:from-cyan-900 hover:to-slate-800 p-4 text-left shadow-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏭</span>
            <div>
              <div className="font-bold text-white text-base">Reached Pickup</div>
              <div className="text-xs text-cyan-400">Vehicle arrived at loading plant</div>
            </div>
          </div>
          <span className="text-cyan-400 text-lg">➔</span>
        </button>

        <button
          onClick={() => handleAction('LOADED', 'Vehicle Loaded')}
          className="w-full rounded-2xl border border-indigo-800/80 bg-gradient-to-r from-indigo-950 to-slate-900 hover:from-indigo-900 hover:to-slate-800 p-4 text-left shadow-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <div className="font-bold text-white text-base">Vehicle Loaded</div>
              <div className="text-xs text-indigo-400">Shipment loaded & verified</div>
            </div>
          </div>
          <span className="text-indigo-400 text-lg">➔</span>
        </button>

        <button
          onClick={() => handleAction('START_TRIP', 'In Transit')}
          className="w-full rounded-2xl border border-blue-800/80 bg-gradient-to-r from-blue-950 to-slate-900 hover:from-blue-900 hover:to-slate-800 p-4 text-left shadow-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚛</span>
            <div>
              <div className="font-bold text-white text-base">Start Trip (Dispatched)</div>
              <div className="text-xs text-blue-400">On highway towards destination</div>
            </div>
          </div>
          <span className="text-blue-400 text-lg">➔</span>
        </button>

        <button
          onClick={() => handleAction('REACHED_DELIVERY', 'Reached Delivery Point')}
          className="w-full rounded-2xl border border-amber-800/80 bg-gradient-to-r from-amber-950 to-slate-900 hover:from-amber-900 hover:to-slate-800 p-4 text-left shadow-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <div className="font-bold text-white text-base">Reached Delivery</div>
              <div className="text-xs text-amber-400">Arrived at unloading location</div>
            </div>
          </div>
          <span className="text-amber-400 text-lg">➔</span>
        </button>

        {/* Upload POD Button */}
        <label className="w-full rounded-2xl border border-emerald-700 bg-gradient-to-r from-emerald-950 to-slate-900 hover:from-emerald-900 hover:to-slate-800 p-4 text-left shadow-lg flex items-center justify-between cursor-pointer block">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📷</span>
            <div>
              <div className="font-bold text-white text-base">Upload Signed POD</div>
              <div className="text-xs text-emerald-400">Take photo of signed Delivery Receipt</div>
            </div>
          </div>
          <span className="text-emerald-400 text-lg">➔</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => handlePodUpload(e.target.files[0])}
          />
        </label>
      </div>

      <div className="mt-8 text-center text-xs text-slate-500">
        Chitkote Logistics India Private Limited · Driver Mobile Assistant
      </div>
    </div>
  );
}
