import { useEffect, useState } from 'react';
import { createLoad, deleteLoad, getLoads, updateLoad } from '../services/api';

const emptyForm = {
  from: '',
  to: '',
  material: '',
  weight: '',
  vehicleType: '',
  loadingDate: '',
  freight: '',
  contactPerson: '',
  contactNumber: '',
};

const generatePreview = (data) => {
  return [
    '🚛 Chitkote Logistics',
    '',
    'A new load is available.',
    '',
    `📍 From: ${data.from || 'Hyderabad'}`,
    `📍 To: ${data.to || 'Chennai'}`,
    '',
    `🚚 Vehicle: ${data.vehicleType || '32 FT Open Truck'}`,
    `⚖️ Weight: ${data.weight || '25 Tons'}`,
    `💰 Freight: ${data.freight || '42000'}`,
    '',
    `📞 Contact: ${data.contactNumber || '9390003955'}`,
    '',
    'Reply if you are interested or call the contact number.',
  ].join('\n');
};

const LoadPosting = () => {
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [loads, setLoads] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSavedLoads = async () => {
    const res = await getLoads();
    setLoads(res.data || []);
  };

  useEffect(() => {
    loadSavedLoads();
  }, []);

  useEffect(() => {
    setMessage(generatePreview(form));
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.from.trim() || !form.to.trim() || !form.material.trim() || !form.vehicleType.trim()) {
      showToast('Please fill out required fields: From, To, Material, and Vehicle Type', 'error');
      return;
    }

    try {
      const res = await createLoad(form);
      setMessage(res.data.message);
      setForm(emptyForm);
      setEditingId(null);
      await loadSavedLoads();
      showToast(`Load created successfully with ID: ${res.data.loadId}`);
    } catch (err) {
      showToast(`Failed to create load: ${err.message}`, 'error');
    }
  };

  const handleSaveChanges = async () => {
    if (!editingId) return;

    if (!form.from.trim() || !form.to.trim() || !form.material.trim() || !form.vehicleType.trim()) {
      showToast('Please fill out required fields: From, To, Material, and Vehicle Type', 'error');
      return;
    }

    try {
      await updateLoad(editingId, { ...form, message });
      await loadSavedLoads();
      setEditingId(null);
      setForm(emptyForm);
      showToast('Load updated successfully!');
    } catch (err) {
      showToast(`Failed to update load: ${err.message}`, 'error');
    }
  };

  const handleDeleteLoad = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this load posting?')) return;
    try {
      await deleteLoad(id);
      if (String(editingId) === String(id)) {
        setEditingId(null);
        setForm(emptyForm);
      }
      await loadSavedLoads();
      showToast('Load posting deleted');
    } catch (err) {
      showToast(`Failed to delete load: ${err.message}`, 'error');
    }
  };

  const handleLoadClick = (item) => {
    setForm({
      from: item.from || item.from_city || '',
      to: item.to || item.to_city || '',
      material: item.material || '',
      weight: item.weight || '',
      vehicleType: item.vehicleType || item.vehicle_type || '',
      loadingDate: item.loadingDate || item.loading_date || '',
      freight: item.freight || '',
      contactPerson: item.contactPerson || item.contact_person || '',
      contactNumber: item.contactNumber || item.contact_number || '',
    });
    setMessage(item.message || item.message_body || '');
    setEditingId(item.id || item.loadId || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetEditing = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-semibold text-white">{editingId ? 'Edit Load Posting' : 'Create New Load Posting'}</h2>
            <p className="text-sm text-slate-400">Fill out details to generate a formatted WhatsApp broadcast message.</p>
          </div>
          {editingId && (
            <span className="rounded-full border border-cyan-800 bg-cyan-950 px-3 py-1 text-xs font-semibold text-cyan-300">
              Editing #{editingId}
            </span>
          )}
        </div>

        {toast && (
          <div className={`rounded-lg border p-3.5 text-sm font-medium transition-all ${toast.type === 'error' ? 'border-rose-800 bg-rose-950/80 text-rose-300' : 'border-emerald-800 bg-emerald-950/80 text-emerald-300'}`}>
            {toast.msg}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="From *" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} required />
          <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="To *" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required />
          <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Material *" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} required />
          <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Weight (e.g. 10T)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Vehicle Type *" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} required />
          <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Loading Date" value={form.loadingDate} onChange={(e) => setForm({ ...form, loadingDate: e.target.value })} />
          <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Freight (e.g. 18500 / Fixed)" value={form.freight} onChange={(e) => setForm({ ...form, freight: e.target.value })} />
          <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Contact Person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 md:col-span-2" placeholder="Contact Number" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
        </div>

        <div className="flex gap-2 pt-2">
          {!editingId ? (
            <button className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 shadow-md shadow-cyan-950" type="submit">
              Create Load
            </button>
          ) : (
            <>
              <button type="button" onClick={handleSaveChanges} className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
                Save Changes
              </button>
              <button type="button" onClick={resetEditing} className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700">
                Cancel
              </button>
            </>
          )}
        </div>
      </form>

      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white">Live WhatsApp Message Preview</h3>
        <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300 font-mono leading-relaxed">{message}</pre>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <h4 className="mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Saved Loads ({loads.length})</h4>
          <div className="space-y-2 max-h-72 overflow-auto">
            {loads.length === 0 ? (
              <p className="text-sm text-slate-500">No saved loads created yet.</p>
            ) : (
              loads.map((item) => (
                <div key={item.id || item.loadId} onClick={() => handleLoadClick(item)} className="group flex items-center justify-between cursor-pointer rounded-lg border border-slate-800/80 p-3 text-sm hover:bg-slate-900 hover:border-slate-700 transition-colors">
                  <div>
                    <div className="font-semibold text-cyan-400">{item.loadId || item.id}</div>
                    <div className="text-slate-200">{item.from || item.from_city} → {item.to || item.to_city}</div>
                    <div className="text-slate-400 text-xs">{item.material} · {item.weight} · {item.loadingDate || item.loading_date}</div>
                  </div>
                  <button
                    className="opacity-80 hover:opacity-100 rounded-lg bg-rose-900/40 border border-rose-800/60 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-800"
                    onClick={(e) => handleDeleteLoad(e, item.id || item.loadId)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadPosting;
