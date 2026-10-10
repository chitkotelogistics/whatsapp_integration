import { useEffect, useState } from 'react';
import { createLoad, deleteLoad, getLoads, updateLoad, getParties, getTransporters, getVehicles, getDrivers } from '../services/api';
import MultiLoadBuilder from '../components/MultiLoadBuilder';

const emptyForm = {
  from: '',
  to: '',
  material: '',
  weight: '',
  vehicleType: '',
  loadingDate: '',
  freight: '',
  contactPerson: 'Chitkote Logistics',
  contactNumber: '9390003955 / 9390006942',
  party_id: '',
  party_rate: '',
  transporter_id: '',
  transporter_rate: '',
  vehicle_id: '',
  driver_id: '',
};

const getISTGreeting = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  const hour = ist.getHours();
  if (hour >= 4 && hour < 12) return 'Good Morning,';
  if (hour >= 12 && hour < 17) return 'Good Afternoon,';
  if (hour >= 17 && hour < 22) return 'Good Evening,';
  return 'Hello,';
};

const generatePreview = (data) => {
  const greeting = getISTGreeting();
  const freightVal = String(data.transporter_rate || data.freight || '45000').replace(/[^\d\.]/g, '') || '45000';
  const lines = [
    greeting,
    '',
    '*🚚 Chitkote Logistics Load Available*',
    '',
    `📍 Pickup: ${data.from || 'Hyderabad'}`,
    `📍 Delivery: ${data.to || 'Chennai'}`,
    `🚛 Vehicle Required: ${data.vehicleType || '32 FT Open'}`,
  ];
  if (data.material) lines.push(`📦 Material: ${data.material}`);
  if (data.weight) lines.push(`⚖️ Weight: ${data.weight}`);
  lines.push(`💰 Freight: ₹${freightVal}`);
  lines.push('');
  lines.push(`📞 Contact: ${data.contactNumber || '9390003955 / 9390006942'}`);
  lines.push('');
  lines.push('Please contact us if you are interested in any of the above loads.');
  lines.push('');
  lines.push('Thank you,');
  lines.push('Chitkote Logistics');

  return lines.join('\n');
};

const LoadPosting = ({ defaultMultiLoad = false }) => {
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [loads, setLoads] = useState([]);
  const [parties, setParties] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showMultiBuilder, setShowMultiBuilder] = useState(defaultMultiLoad);
  const [selectedForBuilder, setSelectedForBuilder] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAllData = async () => {
    try {
      const [resLoads, resP, resT, resV, resD] = await Promise.all([
        getLoads().catch(() => ({ data: [] })),
        getParties().catch(() => ({ data: [] })),
        getTransporters().catch(() => ({ data: [] })),
        getVehicles().catch(() => ({ data: [] })),
        getDrivers().catch(() => ({ data: [] })),
      ]);
      setLoads(resLoads.data || []);
      setParties(resP.data || []);
      setTransporters(resT.data || []);
      setVehicles(resV.data || []);
      setDrivers(resD.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    setMessage(generatePreview(form));
  }, [form]);

  // Handle party selection auto-fill
  const handlePartySelect = (partyId) => {
    const p = parties.find((item) => String(item.id) === String(partyId));
    if (p) {
      setForm((prev) => ({
        ...prev,
        party_id: p.id,
        contactPerson: p.contact_person || p.company_name,
        contactNumber: p.mobile || prev.contactNumber,
      }));
    } else {
      setForm((prev) => ({ ...prev, party_id: '' }));
    }
  };

  // Handle transporter selection auto-fill
  const handleTransporterSelect = (transporterId) => {
    const t = transporters.find((item) => String(item.id) === String(transporterId));
    if (t) {
      setForm((prev) => ({
        ...prev,
        transporter_id: t.id,
      }));
    } else {
      setForm((prev) => ({ ...prev, transporter_id: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.from.trim() || !form.to.trim() || !form.material.trim() || !form.vehicleType.trim()) {
      showToast('Please fill out required fields: From, To, Material, and Vehicle Type', 'error');
      return;
    }

    try {
      const payload = {
        ...form,
        freight: form.party_rate ? `₹${form.party_rate}` : form.freight,
      };
      const res = await createLoad(payload);
      setMessage(res.data.message);
      setForm(emptyForm);
      setEditingId(null);
      await loadAllData();
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
      await loadAllData();
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
      await loadAllData();
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
      party_id: item.party_id || '',
      party_rate: item.party_rate || '',
      transporter_id: item.transporter_id || '',
      transporter_rate: item.transporter_rate || '',
      vehicle_id: item.vehicle_id || '',
      driver_id: item.driver_id || '',
    });
    setMessage(item.message || item.message_body || '');
    setEditingId(item.id || item.loadId || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetEditing = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const toggleSelectForBuilder = (e, id) => {
    e.stopPropagation();
    const idStr = String(id);
    setSelectedForBuilder((prev) =>
      prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-800/40 bg-slate-900/60 p-4 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Load Management
            <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-xs text-slate-300 font-semibold">
              {loads.length} Saved Loads
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create individual load postings or combine multiple loads into one formatted WhatsApp broadcast.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedForBuilder.length > 0 && (
            <button
              type="button"
              onClick={() => setShowMultiBuilder(true)}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-950 flex items-center gap-1.5"
            >
              🚀 Combine & Broadcast Selected ({selectedForBuilder.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowMultiBuilder(!showMultiBuilder)}
            className="rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-950 hover:brightness-110 flex items-center gap-1.5 transition-all"
          >
            <span>{showMultiBuilder ? '📋 Single Load Posting View' : '✨ Multi-Load Message Builder'}</span>
            {selectedForBuilder.length > 0 && (
              <span className="rounded-full bg-white text-slate-900 px-2 py-0.5 text-[10px] font-black">
                {selectedForBuilder.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {showMultiBuilder ? (
        <MultiLoadBuilder
          allLoads={loads}
          initialSelectedLoads={loads.filter((l) =>
            selectedForBuilder.includes(String(l.id || l.loadId || l.load_id))
          )}
          onClose={() => setShowMultiBuilder(false)}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-semibold text-white">{editingId ? 'Edit Load Posting' : 'Create New Load Posting'}</h2>
                <p className="text-sm text-slate-400">Fill out load details and assign customer/party & transporter rates.</p>
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

            {/* Master Selection Row */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2 text-xs">
              <span className="font-semibold text-cyan-400 uppercase tracking-wider">🏢 Customer / Party & Commercial Rates</span>
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <label className="block text-slate-400 mb-1">Select Customer / Party</label>
                  <select
                    value={form.party_id}
                    onChange={(e) => handlePartySelect(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">-- Manual / Direct Party --</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.company_name} ({p.mobile})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Customer Rate (Party Rate ₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 45000"
                    value={form.party_rate}
                    onChange={(e) => setForm({ ...form, party_rate: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Transporter Target Rate (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 38000"
                    value={form.transporter_rate}
                    onChange={(e) => setForm({ ...form, transporter_rate: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="From (Pickup City) *" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} required />
              <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="To (Delivery City) *" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required />
              <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Material *" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} required />
              <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Weight (e.g. 15 MT)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Vehicle Type *" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} required />
              <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Loading Date" value={form.loadingDate} onChange={(e) => setForm({ ...form, loadingDate: e.target.value })} />
              <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Contact Person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              <input className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Contact Phone Number(s) (e.g. 9390003955 / 9390006942)" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
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
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Saved Loads ({loads.length})
                </h4>
                {selectedForBuilder.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMultiBuilder(true)}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    Combine ({selectedForBuilder.length}) →
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-72 overflow-auto">
                {loads.length === 0 ? (
                  <p className="text-sm text-slate-500">No saved loads created yet.</p>
                ) : (
                  loads.map((item) => {
                    const idStr = String(item.id || item.loadId);
                    const isSelected = selectedForBuilder.includes(idStr);
                    return (
                      <div
                        key={idStr}
                        onClick={() => handleLoadClick(item)}
                        className={`group flex items-center justify-between cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                          isSelected
                            ? 'border-cyan-700 bg-cyan-950/30'
                            : 'border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectForBuilder(e, idStr)}
                            className="mt-1 rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-0 shrink-0 cursor-pointer"
                            title="Select for Multi-Load message"
                          />
                          <div className="truncate">
                            <div className="font-semibold text-cyan-400">{item.loadId || item.id}</div>
                            <div className="text-slate-200">{item.from || item.from_city} → {item.to || item.to_city}</div>
                            <div className="text-slate-400 text-xs">
                              {item.material} · {item.weight} · ₹{item.transporter_rate || item.freight || '38000'}
                            </div>
                          </div>
                        </div>
                        <button
                          className="opacity-80 hover:opacity-100 rounded-lg bg-rose-900/40 border border-rose-800/60 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-800 shrink-0 ml-2"
                          onClick={(e) => handleDeleteLoad(e, item.id || item.loadId)}
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadPosting;
