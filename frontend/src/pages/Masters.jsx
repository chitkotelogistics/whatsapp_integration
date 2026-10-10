import { useState, useEffect, useMemo } from 'react';
import {
  getParties,
  createParty,
  updateParty,
  deleteParty,
  getTransporters,
  createTransporter,
  updateTransporter,
  deleteTransporter,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
} from '../services/api';

export default function Masters() {
  const [activeTab, setActiveTab] = useState('parties');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Data states
  const [parties, setParties] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // Form states
  const [editingId, setEditingId] = useState(null);

  // Party Form
  const [partyForm, setPartyForm] = useState({
    company_name: '',
    contact_person: '',
    mobile: '',
    email: '',
    gstin: '',
    pan: '',
    billing_address: '',
    payment_terms: '15 Days',
  });

  // Transporter Form
  const [transporterForm, setTransporterForm] = useState({
    company_name: '',
    contact_name: '',
    mobile: '',
    alt_mobile: '',
    gstin: '',
    pan: '',
    address: '',
    bank_name: '',
    bank_account: '',
    ifsc_code: '',
    upi_id: '',
  });

  // Vehicle Form
  const [vehicleForm, setVehicleForm] = useState({
    transporter_id: '',
    vehicle_number: '',
    vehicle_type: '32 FT Open',
    body_type: 'Open Container',
    capacity_mt: '15 MT',
    rc_number: '',
    insurance_number: '',
    puc_number: '',
    permit_number: '',
    fitness_number: '',
    rc_expiry: '',
    insurance_expiry: '',
    verification_status: 'VERIFIED',
  });

  // Driver Form
  const [driverForm, setDriverForm] = useState({
    transporter_id: '',
    vehicle_id: '',
    driver_name: '',
    mobile: '',
    license_number: '',
    license_expiry: '',
  });

  useEffect(() => {
    loadAllMasters();
  }, []);

  const loadAllMasters = async () => {
    setLoading(true);
    try {
      const [resP, resT, resV, resD] = await Promise.all([
        getParties().catch(() => ({ data: [] })),
        getTransporters().catch(() => ({ data: [] })),
        getVehicles().catch(() => ({ data: [] })),
        getDrivers().catch(() => ({ data: [] })),
      ]);
      setParties(resP.data || []);
      setTransporters(resT.data || []);
      setVehicles(resV.data || []);
      setDrivers(resD.data || []);
    } catch (err) {
      console.error('Error loading masters:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  // Reset all forms
  const resetForms = () => {
    setEditingId(null);
    setPartyForm({ company_name: '', contact_person: '', mobile: '', email: '', gstin: '', pan: '', billing_address: '', payment_terms: '15 Days' });
    setTransporterForm({ company_name: '', contact_name: '', mobile: '', alt_mobile: '', gstin: '', pan: '', address: '', bank_name: '', bank_account: '', ifsc_code: '', upi_id: '' });
    setVehicleForm({ transporter_id: '', vehicle_number: '', vehicle_type: '32 FT Open', body_type: 'Open Container', capacity_mt: '15 MT', rc_number: '', insurance_number: '', puc_number: '', permit_number: '', fitness_number: '', rc_expiry: '', insurance_expiry: '', verification_status: 'VERIFIED' });
    setDriverForm({ transporter_id: '', vehicle_id: '', driver_name: '', mobile: '', license_number: '', license_expiry: '' });
  };

  // Submit Handlers
  const handlePartySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateParty(editingId, partyForm);
        showNotification('✓ Party Master updated successfully');
      } else {
        await createParty(partyForm);
        showNotification('✓ New Customer/Party added successfully');
      }
      resetForms();
      loadAllMasters();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save Party');
    }
  };

  const handleTransporterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateTransporter(editingId, transporterForm);
        showNotification('✓ Transporter updated successfully');
      } else {
        await createTransporter(transporterForm);
        showNotification('✓ New Transporter added successfully');
      }
      resetForms();
      loadAllMasters();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save Transporter');
    }
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateVehicle(editingId, vehicleForm);
        showNotification('✓ Vehicle details updated successfully');
      } else {
        await createVehicle(vehicleForm);
        showNotification('✓ New Vehicle added to Master');
      }
      resetForms();
      loadAllMasters();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save Vehicle');
    }
  };

  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDriver(editingId, driverForm);
        showNotification('✓ Driver updated successfully');
      } else {
        await createDriver(driverForm);
        showNotification('✓ New Driver registered');
      }
      resetForms();
      loadAllMasters();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save Driver');
    }
  };

  // Edit Handlers
  const startEditParty = (p) => {
    setEditingId(p.id);
    setPartyForm({
      company_name: p.company_name || '',
      contact_person: p.contact_person || '',
      mobile: p.mobile || '',
      email: p.email || '',
      gstin: p.gstin || '',
      pan: p.pan || '',
      billing_address: p.billing_address || '',
      payment_terms: p.payment_terms || '15 Days',
    });
  };

  const startEditTransporter = (t) => {
    setEditingId(t.id);
    setTransporterForm({
      company_name: t.company_name || '',
      contact_name: t.contact_name || '',
      mobile: t.mobile || '',
      alt_mobile: t.alt_mobile || '',
      gstin: t.gstin || '',
      pan: t.pan || '',
      address: t.address || '',
      bank_name: t.bank_name || '',
      bank_account: t.bank_account || '',
      ifsc_code: t.ifsc_code || '',
      upi_id: t.upi_id || '',
    });
  };

  const startEditVehicle = (v) => {
    setEditingId(v.id);
    setVehicleForm({
      transporter_id: v.transporter_id || '',
      vehicle_number: v.vehicle_number || '',
      vehicle_type: v.vehicle_type || '32 FT Open',
      body_type: v.body_type || 'Open',
      capacity_mt: v.capacity_mt || '15 MT',
      rc_number: v.rc_number || '',
      insurance_number: v.insurance_number || '',
      puc_number: v.puc_number || '',
      permit_number: v.permit_number || '',
      fitness_number: v.fitness_number || '',
      rc_expiry: v.rc_expiry ? String(v.rc_expiry).slice(0, 10) : '',
      insurance_expiry: v.insurance_expiry ? String(v.insurance_expiry).slice(0, 10) : '',
      verification_status: v.verification_status || 'VERIFIED',
    });
  };

  const startEditDriver = (d) => {
    setEditingId(d.id);
    setDriverForm({
      transporter_id: d.transporter_id || '',
      vehicle_id: d.vehicle_id || '',
      driver_name: d.driver_name || '',
      mobile: d.mobile || '',
      license_number: d.license_number || '',
      license_expiry: d.license_expiry ? String(d.license_expiry).slice(0, 10) : '',
    });
  };

  // Delete Handlers
  const handleDeleteParty = async (id) => {
    if (!confirm('Are you sure you want to delete this Party?')) return;
    await deleteParty(id);
    loadAllMasters();
  };

  const handleDeleteTransporter = async (id) => {
    if (!confirm('Are you sure you want to delete this Transporter?')) return;
    await deleteTransporter(id);
    loadAllMasters();
  };

  const handleDeleteVehicle = async (id) => {
    if (!confirm('Are you sure you want to delete this Vehicle?')) return;
    await deleteVehicle(id);
    loadAllMasters();
  };

  const handleDeleteDriver = async (id) => {
    if (!confirm('Are you sure you want to delete this Driver?')) return;
    await deleteDriver(id);
    loadAllMasters();
  };

  // Filtered lists
  const filteredParties = useMemo(() => {
    return parties.filter((p) =>
      `${p.company_name} ${p.contact_person} ${p.mobile} ${p.gstin}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parties, searchTerm]);

  const filteredTransporters = useMemo(() => {
    return transporters.filter((t) =>
      `${t.company_name} ${t.contact_name} ${t.mobile} ${t.gstin}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transporters, searchTerm]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) =>
      `${v.vehicle_number} ${v.vehicle_type} ${v.rc_number}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) =>
      `${d.driver_name} ${d.mobile} ${d.license_number}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [drivers, searchTerm]);

  return (
    <div className="space-y-6 antialiased">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            🗂️ CK Logistics Masters Hub
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage Customers/Parties, Transporters, Vehicles, and Drivers cleanly in one central directory.
          </p>
        </div>

        {statusMsg && (
          <div className="rounded-lg bg-emerald-950/80 border border-emerald-700/60 px-4 py-2 text-sm text-emerald-300 shadow-md animate-pulse">
            {statusMsg}
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => { setActiveTab('parties'); resetForms(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'parties'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          🏢 Parties / Customers ({parties.length})
        </button>
        <button
          onClick={() => { setActiveTab('transporters'); resetForms(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'transporters'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          🚚 Transporters ({transporters.length})
        </button>
        <button
          onClick={() => { setActiveTab('vehicles'); resetForms(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'vehicles'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          🚛 Vehicles ({vehicles.length})
        </button>
        <button
          onClick={() => { setActiveTab('drivers'); resetForms(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'drivers'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          👨‍✈️ Drivers ({drivers.length})
        </button>

        <div className="ml-auto w-full md:w-64">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Master Grid (Form on Left, Table on Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* TAB 1: PARTIES */}
        {activeTab === 'parties' && (
          <>
            {/* Form */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-xl backdrop-blur-sm">
              <h2 className="text-base font-semibold text-white mb-4">
                {editingId ? '✏️ Edit Customer / Party' : '➕ Register New Party'}
              </h2>
              <form onSubmit={handlePartySubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Company / Party Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC Industries Ltd"
                    value={partyForm.company_name}
                    onChange={(e) => setPartyForm({ ...partyForm, company_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Contact Person</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Kumar"
                      value={partyForm.contact_person}
                      onChange={(e) => setPartyForm({ ...partyForm, contact_person: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Mobile Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="9876543210"
                      value={partyForm.mobile}
                      onChange={(e) => setPartyForm({ ...partyForm, mobile: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">GSTIN</label>
                    <input
                      type="text"
                      placeholder="36AAAAA0000A1Z5"
                      value={partyForm.gstin}
                      onChange={(e) => setPartyForm({ ...partyForm, gstin: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">PAN Number</label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      value={partyForm.pan}
                      onChange={(e) => setPartyForm({ ...partyForm, pan: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="billing@abcindustries.com"
                    value={partyForm.email}
                    onChange={(e) => setPartyForm({ ...partyForm, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Billing Address</label>
                  <textarea
                    rows={2}
                    placeholder="Factory / Registered Office address..."
                    value={partyForm.billing_address}
                    onChange={(e) => setPartyForm({ ...partyForm, billing_address: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Payment Terms</label>
                  <select
                    value={partyForm.payment_terms}
                    onChange={(e) => setPartyForm({ ...partyForm, payment_terms: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Immediate">Immediate / Advance</option>
                    <option value="7 Days">7 Days Credit</option>
                    <option value="15 Days">15 Days Credit</option>
                    <option value="30 Days">30 Days Credit</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30 hover:opacity-90"
                  >
                    {editingId ? 'Update Party' : 'Save Party Master'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForms}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-8 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-xl backdrop-blur-sm">
              <h2 className="text-base font-semibold text-white mb-4">
                Active Customer / Party Directory ({filteredParties.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-slate-800 bg-slate-950/60 uppercase text-slate-400">
                    <tr>
                      <th className="p-3">Party Name</th>
                      <th className="p-3">Contact Person</th>
                      <th className="p-3">Mobile / WhatsApp</th>
                      <th className="p-3">GSTIN / PAN</th>
                      <th className="p-3">Payment Terms</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredParties.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="p-3 font-semibold text-white">
                          {p.company_name}
                          {p.email && <div className="text-[10px] text-slate-400">{p.email}</div>}
                        </td>
                        <td className="p-3">{p.contact_person || '-'}</td>
                        <td className="p-3 font-mono text-cyan-400">{p.mobile}</td>
                        <td className="p-3">
                          {p.gstin && <div className="font-mono">{p.gstin}</div>}
                          {p.pan && <div className="text-[10px] text-slate-400">PAN: {p.pan}</div>}
                          {!p.gstin && !p.pan && '-'}
                        </td>
                        <td className="p-3">
                          <span className="rounded bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 text-[10px] text-cyan-300">
                            {p.payment_terms || '15 Days'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => startEditParty(p)}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteParty(p.id)}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!filteredParties.length && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No parties found. Create one using the form on the left.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: TRANSPORTERS */}
        {activeTab === 'transporters' && (
          <>
            <div className="lg:col-span-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-xl backdrop-blur-sm">
              <h2 className="text-base font-semibold text-white mb-4">
                {editingId ? '✏️ Edit Transporter' : '➕ Register New Transporter'}
              </h2>
              <form onSubmit={handleTransporterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Company / Transporter Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sri Balaji Logistics"
                    value={transporterForm.company_name}
                    onChange={(e) => setTransporterForm({ ...transporterForm, company_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Contact Name</label>
                    <input
                      type="text"
                      placeholder="Owner / Operator Name"
                      value={transporterForm.contact_name}
                      onChange={(e) => setTransporterForm({ ...transporterForm, contact_name: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Primary Mobile *</label>
                    <input
                      type="text"
                      required
                      placeholder="9876543210"
                      value={transporterForm.mobile}
                      onChange={(e) => setTransporterForm({ ...transporterForm, mobile: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">GSTIN</label>
                    <input
                      type="text"
                      placeholder="36AAAAA0000A1Z5"
                      value={transporterForm.gstin}
                      onChange={(e) => setTransporterForm({ ...transporterForm, gstin: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">PAN Number</label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      value={transporterForm.pan}
                      onChange={(e) => setTransporterForm({ ...transporterForm, pan: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none uppercase"
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <span className="font-semibold text-slate-300">Bank / Settlement Details</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Bank Name"
                      value={transporterForm.bank_name}
                      onChange={(e) => setTransporterForm({ ...transporterForm, bank_name: e.target.value })}
                      className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={transporterForm.bank_account}
                      onChange={(e) => setTransporterForm({ ...transporterForm, bank_account: e.target.value })}
                      className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="IFSC Code"
                      value={transporterForm.ifsc_code}
                      onChange={(e) => setTransporterForm({ ...transporterForm, ifsc_code: e.target.value })}
                      className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none uppercase"
                    />
                    <input
                      type="text"
                      placeholder="UPI ID (e.g. name@upi)"
                      value={transporterForm.upi_id}
                      onChange={(e) => setTransporterForm({ ...transporterForm, upi_id: e.target.value })}
                      className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30 hover:opacity-90"
                  >
                    {editingId ? 'Update Transporter' : 'Save Transporter'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForms}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-8 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-xl backdrop-blur-sm">
              <h2 className="text-base font-semibold text-white mb-4">
                Transporter / Truck Owner Directory ({filteredTransporters.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-slate-800 bg-slate-950/60 uppercase text-slate-400">
                    <tr>
                      <th className="p-3">Transporter</th>
                      <th className="p-3">Contact Person</th>
                      <th className="p-3">Mobile</th>
                      <th className="p-3">GSTIN / PAN</th>
                      <th className="p-3">Bank Details</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredTransporters.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/30">
                        <td className="p-3 font-semibold text-white">{t.company_name}</td>
                        <td className="p-3">{t.contact_name || '-'}</td>
                        <td className="p-3 font-mono text-cyan-400">{t.mobile}</td>
                        <td className="p-3">
                          {t.gstin && <div className="font-mono">{t.gstin}</div>}
                          {t.pan && <div className="text-[10px] text-slate-400">PAN: {t.pan}</div>}
                          {!t.gstin && !t.pan && '-'}
                        </td>
                        <td className="p-3 text-[11px]">
                          {t.bank_account ? (
                            <div>
                              <div>{t.bank_name} ({t.ifsc_code})</div>
                              <div className="font-mono text-slate-400">A/C: {t.bank_account}</div>
                            </div>
                          ) : (
                            t.upi_id || '-'
                          )}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => startEditTransporter(t)}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTransporter(t.id)}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!filteredTransporters.length && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No transporters found. Register one using the form on the left.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 3: VEHICLES */}
        {activeTab === 'vehicles' && (
          <>
            <div className="lg:col-span-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-xl backdrop-blur-sm">
              <h2 className="text-base font-semibold text-white mb-4">
                {editingId ? '✏️ Edit Vehicle' : '➕ Register Vehicle'}
              </h2>
              <form onSubmit={handleVehicleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Assigned Transporter</label>
                  <select
                    value={vehicleForm.transporter_id}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, transporter_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">-- Select Transporter (Optional) --</option>
                    {transporters.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.company_name} ({t.mobile})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Vehicle Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="TS09AB1234"
                      value={vehicleForm.vehicle_number}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Vehicle Type *</label>
                    <select
                      value={vehicleForm.vehicle_type}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="32 FT Open">32 FT Open</option>
                      <option value="32 FT Multi-Axle">32 FT Multi-Axle</option>
                      <option value="32 FT Container">32 FT Container</option>
                      <option value="20 FT Open">20 FT Open</option>
                      <option value="24 FT Container">24 FT Container</option>
                      <option value="10 Wheeler Open">10 Wheeler Open</option>
                      <option value="12 Wheeler Open">12 Wheeler Open</option>
                      <option value="Trailer / Bed">Trailer / Bed</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">RC Number</label>
                    <input
                      type="text"
                      placeholder="RC Number"
                      value={vehicleForm.rc_number}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, rc_number: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Insurance Policy No</label>
                    <input
                      type="text"
                      placeholder="Insurance Policy"
                      value={vehicleForm.insurance_number}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, insurance_number: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Insurance Expiry Date</label>
                    <input
                      type="date"
                      value={vehicleForm.insurance_expiry}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, insurance_expiry: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Verification Status</label>
                    <select
                      value={vehicleForm.verification_status}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, verification_status: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="NEEDS_REUPLOAD">NEEDS REUPLOAD</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30 hover:opacity-90"
                  >
                    {editingId ? 'Update Vehicle' : 'Save Vehicle'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForms}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-8 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-xl backdrop-blur-sm">
              <h2 className="text-base font-semibold text-white mb-4">
                Vehicle Master Directory ({filteredVehicles.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-slate-800 bg-slate-950/60 uppercase text-slate-400">
                    <tr>
                      <th className="p-3">Vehicle No</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Transporter</th>
                      <th className="p-3">RC / Insurance</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredVehicles.map((v) => {
                      const owner = transporters.find((t) => String(t.id) === String(v.transporter_id));
                      return (
                        <tr key={v.id} className="hover:bg-slate-800/30">
                          <td className="p-3 font-bold font-mono text-cyan-400">{v.vehicle_number}</td>
                          <td className="p-3">{v.vehicle_type}</td>
                          <td className="p-3">{owner ? owner.company_name : '-'}</td>
                          <td className="p-3 text-[11px]">
                            {v.rc_number && <div>RC: {v.rc_number}</div>}
                            {v.insurance_number && <div className="text-slate-400">Ins: {v.insurance_number}</div>}
                            {!v.rc_number && !v.insurance_number && '-'}
                          </td>
                          <td className="p-3">
                            <span className="rounded bg-emerald-950 border border-emerald-700 px-2 py-0.5 text-[10px] text-emerald-300">
                              {v.verification_status || 'VERIFIED'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => startEditVehicle(v)}
                              className="text-cyan-400 hover:text-cyan-300"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteVehicle(v.id)}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!filteredVehicles.length && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No vehicles found. Add one using the form on the left.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 4: DRIVERS */}
        {activeTab === 'drivers' && (
          <>
            <div className="lg:col-span-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-xl backdrop-blur-sm">
              <h2 className="text-base font-semibold text-white mb-4">
                {editingId ? '✏️ Edit Driver' : '➕ Register Driver'}
              </h2>
              <form onSubmit={handleDriverSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ravi Kumar"
                    value={driverForm.driver_name}
                    onChange={(e) => setDriverForm({ ...driverForm, driver_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Mobile Number (WhatsApp) *</label>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={driverForm.mobile}
                    onChange={(e) => setDriverForm({ ...driverForm, mobile: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Assigned Transporter</label>
                  <select
                    value={driverForm.transporter_id}
                    onChange={(e) => setDriverForm({ ...driverForm, transporter_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">-- Select Transporter --</option>
                    {transporters.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.company_name} ({t.mobile})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Assigned Vehicle</label>
                  <select
                    value={driverForm.vehicle_id}
                    onChange={(e) => setDriverForm({ ...driverForm, vehicle_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_number} ({v.vehicle_type})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Driving Licence No</label>
                    <input
                      type="text"
                      placeholder="DL-1420110012345"
                      value={driverForm.license_number}
                      onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">DL Expiry Date</label>
                    <input
                      type="date"
                      value={driverForm.license_expiry}
                      onChange={(e) => setDriverForm({ ...driverForm, license_expiry: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30 hover:opacity-90"
                  >
                    {editingId ? 'Update Driver' : 'Save Driver'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForms}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-8 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-xl backdrop-blur-sm">
              <h2 className="text-base font-semibold text-white mb-4">
                Registered Drivers Directory ({filteredDrivers.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-slate-800 bg-slate-950/60 uppercase text-slate-400">
                    <tr>
                      <th className="p-3">Driver Name</th>
                      <th className="p-3">Mobile (WhatsApp)</th>
                      <th className="p-3">Transporter</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3">Driving Licence</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredDrivers.map((d) => {
                      const owner = transporters.find((t) => String(t.id) === String(d.transporter_id));
                      const veh = vehicles.find((v) => String(v.id) === String(d.vehicle_id));
                      return (
                        <tr key={d.id} className="hover:bg-slate-800/30">
                          <td className="p-3 font-semibold text-white">{d.driver_name}</td>
                          <td className="p-3 font-mono text-cyan-400">{d.mobile}</td>
                          <td className="p-3">{owner ? owner.company_name : '-'}</td>
                          <td className="p-3 font-mono">{veh ? veh.vehicle_number : '-'}</td>
                          <td className="p-3 font-mono text-[11px]">{d.license_number || '-'}</td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => startEditDriver(d)}
                              className="text-cyan-400 hover:text-cyan-300"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDriver(d.id)}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!filteredDrivers.length && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No drivers registered. Add one using the form on the left.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
