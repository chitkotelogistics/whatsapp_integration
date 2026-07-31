import { useEffect, useMemo, useState } from 'react';
import { broadcast, createGroup, getContacts, getGroups, getGroupContacts, getLoads } from '../services/api';

const formatLoadForBroadcast = (l) => {
  if (!l) return '';
  const text = l.message || l.message_body || '';
  if (text.includes('Chitkote Logistics') && text.includes('From:')) {
    return text;
  }
  return [
    '🚛 Chitkote Logistics',
    '',
    'A new load is available.',
    '',
    `📍 From: ${l.from || l.from_city || 'Chennai'}`,
    `📍 To: ${l.to || l.to_city || 'Coimbatore'}`,
    '',
    `🚚 Vehicle: ${l.vehicleType || l.vehicle_type || '32 FT Open Truck'}`,
    `⚖️ Weight: ${l.weight || '25 Tons'}`,
    `💰 Freight: ${l.freight || '42000'}`,
    '',
    `📞 Contact: ${l.contactPerson || ''} ${l.contactNumber || l.contact_number || '9390003955'}`.trim(),
    '',
    l.loadId ? `Load ID: ${l.loadId}` : '',
    '',
    'Reply if you are interested or call the contact number.',
  ].join('\n');
};

const defaultBroadcastMessage = `🚛 Chitkote Logistics

A new load is available.

📍 From: Hyderabad
📍 To: Chennai

🚚 Vehicle: 32 FT Open Truck
⚖️ Weight: 25 Tons
💰 Freight: 42000

📞 Contact: 9390003955

Reply if you are interested or call the contact number.`;

const Broadcast = () => {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loads, setLoads] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [selectedLoadId, setSelectedLoadId] = useState('');
  const [message, setMessage] = useState(defaultBroadcastMessage);
  const [scheduledAt, setScheduledAt] = useState('');
  const [progress, setProgress] = useState(0);
  const [groupName, setGroupName] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadContacts = async () => {
    const res = await getContacts();
    const loaded = (res.data || []).map((item) => ({
      id: item.id,
      name: item.name,
      mobile: item.mobile || 'N/A',
      city: item.city || 'N/A',
      state: item.state || 'N/A',
      vehicleType: item.vehicle_type || 'N/A',
    }));
    setContacts(loaded);
    setSelected(loaded.map((c) => c.id));
  };

  const loadGroups = async () => {
    const res = await getGroups();
    setGroups(res.data || []);
  };

  const loadLoads = async () => {
    const res = await getLoads();
    const loadedLoads = res.data || [];
    setLoads(loadedLoads);
    if (loadedLoads.length > 0) {
      setSelectedLoadId(loadedLoads[0].loadId || loadedLoads[0].id);
      setMessage(formatLoadForBroadcast(loadedLoads[0]));
    }
  };

  useEffect(() => {
    loadContacts();
    loadGroups();
    loadLoads();
  }, []);

  const filtered = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          contact.name.toLowerCase().includes(search.toLowerCase()) ||
          contact.mobile.includes(search) ||
          contact.city.toLowerCase().includes(search.toLowerCase())
      ),
    [contacts, search]
  );

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const selectAll = () => {
    setSelected(filtered.map((item) => item.id));
  };

  const clearSelection = () => {
    setSelected([]);
  };

  const processBroadcastResponse = (data) => {
    if (data.scheduled) {
      showToast(`🗓️ ${data.scheduled} messages scheduled for ${new Date(data.scheduledAt).toLocaleString()}`);
      return;
    }

    const { sentCount = 0, failedCount = 0, failureReasons = [] } = data;
    if (failedCount > 0 && sentCount === 0) {
      const reasonText = failureReasons.length ? failureReasons.join('; ') : 'Unknown Meta API error';
      showToast(`❌ Message Delivery Failed! (0 sent, ${failedCount} failed). Reason: ${reasonText}`, 'error');
    } else if (failedCount > 0 && sentCount > 0) {
      const reasonText = failureReasons.length ? failureReasons.join('; ') : 'Some recipients failed';
      showToast(`⚠️ Partial Broadcast Delivery (${sentCount} sent, ${failedCount} failed). Reason: ${reasonText}`, 'warning');
    } else {
      showToast(`✅ Broadcast Delivered Successfully! All ${sentCount || data.total || selected.length} messages sent to WhatsApp.`);
    }
  };

  const [directInput, setDirectInput] = useState('');

  const handleSend = async () => {
    let targets = [...selected];
    if (directInput.trim()) {
      const parsedDirects = directInput.split(/[\s,]+/).map((n) => n.trim()).filter(Boolean);
      targets = Array.from(new Set([...targets, ...parsedDirects]));
    }

    if (!targets.length) {
      showToast('Please select a contact or enter a mobile number for broadcast', 'error');
      return;
    }

    setProgress(30);
    try {
      const res = await broadcast({ contactIds: targets, message, scheduledAt: scheduledAt || undefined });
      setProgress(100);
      processBroadcastResponse(res.data);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      showToast(`❌ Broadcast Failed: ${errMsg}`, 'error');
    } finally {
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showToast('Please enter a valid group name', 'error');
      return;
    }
    if (!selected.length) {
      showToast('Select contacts to add to this group', 'error');
      return;
    }

    await createGroup({ name: groupName, contactIds: selected });
    setGroupName('');
    await loadGroups();
    showToast(`Broadcast group "${groupName}" saved!`);
  };

  const handleLoadGroup = async (groupId) => {
    const res = await getGroupContacts(groupId);
    setSelected(res.data.contactIds || []);
    showToast(`Loaded group contacts`);
  };

  return (
    <div className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Broadcast Loads & Bulk Messaging</h2>
          <p className="text-sm text-slate-400">Select recipients, pick saved loads, or schedule bulk dispatch via WhatsApp Cloud API.</p>
        </div>
        <div className="rounded-lg border border-cyan-800/60 bg-cyan-950/40 px-3.5 py-2 text-xs text-cyan-300">
          Total Contacts: <strong>{contacts.length}</strong> | Selected: <strong>{selected.length}</strong>
        </div>
      </div>

      {toast && (
        <div className={`rounded-lg border p-3.5 text-sm font-medium transition-all ${toast.type === 'error' ? 'border-rose-800 bg-rose-950/80 text-rose-300' : 'border-emerald-800 bg-emerald-950/80 text-emerald-300'}`}>
          {toast.msg}
        </div>
      )}

      <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/20 p-4 space-y-2">
        <label className="block text-xs font-semibold text-cyan-300">
          📱 Direct Send to Phone Number(s) — Send without saving in Contacts first
        </label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm font-mono text-cyan-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            placeholder="Type single or multiple mobile numbers separated by commas (e.g. 9390006942, 9441510824)..."
            value={directInput}
            onChange={(e) => setDirectInput(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          placeholder="Filter saved contacts by name, city, or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="rounded-lg bg-cyan-900/50 border border-cyan-700 px-4 py-2.5 text-sm font-medium text-cyan-200 hover:bg-cyan-800/60" onClick={selectAll}>
          Select All ({filtered.length})
        </button>
        <button className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700" onClick={clearSelection}>
          Clear Selection
        </button>
        <button className="rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-cyan-500 hover:to-indigo-500 shadow-md shadow-cyan-950" onClick={handleSend}>
          Send Broadcast ({selected.length + (directInput.trim() ? directInput.split(/[\s,]+/).filter(Boolean).length : 0)})
        </button>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-2">
          <label className="block text-xs font-semibold text-slate-300">WhatsApp Message Content</label>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Attach Saved Load Posting</label>
            <select
              value={selectedLoadId}
              onChange={(e) => {
                setSelectedLoadId(e.target.value);
                const picked = loads.find((x) => String(x.id) === String(e.target.value) || String(x.loadId) === String(e.target.value));
                if (picked) setMessage(formatLoadForBroadcast(picked));
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Select a load to attach...</option>
              {loads.map((l) => (
                <option key={l.id || l.loadId} value={l.id || l.loadId}>
                  {l.loadId || l.id} — {l.from || l.from_city} → {l.to || l.to_city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Schedule Delivery (Optional)</label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm focus:border-cyan-500 focus:outline-none"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="mb-2.5 text-xs font-semibold text-slate-300">Save selected contacts as a named group</p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. South Region Container Drivers"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <button className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500" onClick={handleCreateGroup}>
              Save Group
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="mb-2.5 text-xs font-semibold text-slate-300">Saved Broadcast Groups ({groups.length})</p>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-auto">
            {groups.length === 0 ? (
              <span className="text-xs text-slate-500">No saved groups created yet.</span>
            ) : (
              groups.map((group) => (
                <button
                  key={group.id}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-500 hover:text-cyan-400"
                  onClick={() => handleLoadGroup(group.id)}
                >
                  📁 {group.name}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {progress > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3 text-xs font-semibold text-slate-400">
          Recipient Selection List ({filtered.length})
        </div>
        <div className="max-h-80 overflow-auto divide-y divide-slate-800/60">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400 space-y-2">
              <p>No saved contacts found in your database.</p>
              <p className="text-xs text-slate-500">
                You can type mobile numbers directly in the <strong className="text-cyan-300">Direct Send</strong> box above, or go to the <strong className="text-cyan-300">Contacts</strong> tab to add/import contacts.
              </p>
            </div>
          ) : (
            filtered.map((contact) => (
              <label key={contact.id} className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-900/60 transition-colors">
                <div>
                  <span className="font-medium text-slate-200">{contact.name}</span>
                  <span className="ml-2 text-xs text-slate-400">{contact.mobile} · {contact.city} ({contact.vehicleType})</span>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                  checked={selected.includes(contact.id)}
                  onChange={() => toggle(contact.id)}
                />
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Broadcast;
