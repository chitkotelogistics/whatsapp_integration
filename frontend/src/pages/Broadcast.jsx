import { useEffect, useMemo, useState } from 'react';
import { broadcast, broadcastVoiceCalls, createGroup, deleteGroup, clearAllGroups, getContacts, importContacts, getGroups, getGroupContacts, getLoads, makeVoiceCall } from '../services/api';
import * as XLSX from 'xlsx';
import MultiLoadBuilder from '../components/MultiLoadBuilder';

const HEADER_ALIASES = {
  name: ['name', 'contactname', 'full_name', 'contact_name', 'fullname', 'customer_name', 'first_name'],
  mobile: ['mobile', 'phone', 'phone_number', 'contact_number', 'contactmobile', 'whatsapp', 'wa_number', 'phone_1_value', 'phone_2_value'],
  company: ['company', 'organisation', 'organization', 'firm', 'organization_name'],
  city: ['city', 'town', 'location', 'address_1_city'],
  state: ['state', 'province', 'region', 'address_1_region'],
  vehicleType: ['vehicle_type', 'vehicletype', 'vehicle', 'truck_type'],
};

const normalizeHeader = (value = '') => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');

const normalizePhone = (value = '') => {
  let cleaned = String(value).replace(/\D/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('9191') && cleaned.length > 12) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return `91${cleaned}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('0') && /^[6-9]/.test(cleaned.slice(1))) {
    return `91${cleaned.slice(1)}`;
  }
  if (cleaned.length >= 10) {
    const last10 = cleaned.slice(-10);
    if (/^[6-9]/.test(last10)) {
      return `91${last10}`;
    }
  }
  return cleaned;
};

const detectVehicleType = (text = '') => {
  if (!text) return 'Truck / Transport';
  const lower = text.toLowerCase();
  if (lower.includes('32') && (lower.includes('sxl') || lower.includes('mtxl') || lower.includes('xl') || lower.includes('multi'))) return '32 FT Multi Axle';
  if (lower.includes('32') && (lower.includes('cont') || lower.includes('cnt'))) return '32 FT Container';
  if (lower.includes('32')) return '32 FT Open Truck';
  if (lower.includes('24') && (lower.includes('cont') || lower.includes('cnt'))) return '24 FT Container';
  if (lower.includes('24')) return '24 FT Open Truck';
  if (lower.includes('22') && (lower.includes('cont') || lower.includes('cnt'))) return '22 FT Container';
  if (lower.includes('22')) return '22 FT Open Truck';
  if (lower.includes('20') && (lower.includes('cont') || lower.includes('cnt'))) return '20 FT Container';
  if (lower.includes('20')) return '20 FT Open Truck';
  if (lower.includes('19') && (lower.includes('cont') || lower.includes('cnt'))) return '19 FT Container';
  if (lower.includes('19')) return '19 FT Open Truck';
  if (lower.includes('16') || lower.includes('14') || lower.includes('12') || lower.includes('10')) {
    if (lower.includes('wheel') || lower.includes('weel') || lower.includes('veel')) {
      const match = lower.match(/(\d+)\s*(?:wheel|weel|veel)/);
      return match ? `${match[1]} Wheeler Truck` : '10-14 Wheeler Truck';
    }
    if (lower.includes('feet') || lower.includes('ft')) {
      const match = lower.match(/(\d+)\s*(?:feet|ft)/);
      return match ? `${match[1]} FT Truck` : '14 FT Truck';
    }
    if (lower.includes('t') || lower.includes('ton')) return '12-16 Ton Truck';
  }
  if (lower.includes('trailer') || lower.includes('trailor')) return 'Trailer';
  if (lower.includes('container') || lower.includes('cont')) return '20/32 FT Container';
  if (lower.includes('dcm') || lower.includes('eicher') || lower.includes('eacher')) return 'Eicher / DCM';
  return 'Truck / Transport';
};

const getFieldValue = (record = {}, aliases = []) => {
  const key = aliases.find((alias) => record[alias] !== undefined && record[alias] !== null && String(record[alias]).trim() !== '');
  return key ? String(record[key]).trim() : '';
};

const mapRecord = (record = {}) => {
  const normalizedRecord = {};
  Object.keys(record).forEach((key) => {
    normalizedRecord[normalizeHeader(key)] = record[key];
  });

  const firstName = normalizedRecord.first_name || '';
  const middleName = normalizedRecord.middle_name || '';
  const lastName = normalizedRecord.last_name || '';
  const combinedName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();

  // Collect all phones (Phone 1, Phone 2, Phone 3, mobile, phone)
  const rawPhones = [
    normalizedRecord.phone_1_value,
    normalizedRecord.phone_2_value,
    normalizedRecord.phone_3_value,
    getFieldValue(normalizedRecord, HEADER_ALIASES.mobile),
  ].filter(Boolean);

  const phoneNumbers = [];
  rawPhones.forEach((pStr) => {
    String(pStr)
      .split(/:::|,|\//)
      .forEach((sub) => {
        const norm = normalizePhone(sub);
        if (norm && norm.length >= 10) {
          phoneNumbers.push(norm);
        }
      });
  });

  const explicitName = combinedName || getFieldValue(normalizedRecord, HEADER_ALIASES.name);
  const company = getFieldValue(normalizedRecord, HEADER_ALIASES.company) || '';
  const explicitVehicle = getFieldValue(normalizedRecord, HEADER_ALIASES.vehicleType);
  const city = getFieldValue(normalizedRecord, HEADER_ALIASES.city) || '';
  const state = getFieldValue(normalizedRecord, HEADER_ALIASES.state) || '';

  if (!phoneNumbers.length) {
    return [];
  }

  return phoneNumbers.map((mobile) => {
    const name = explicitName || company || `Driver ${mobile.slice(-4)}`;
    const vehicleType = explicitVehicle || detectVehicleType(`${name} ${normalizedRecord.notes || ''}`);
    return {
      name,
      mobile,
      company,
      city,
      state,
      vehicleType,
    };
  });
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

const formatLoadForBroadcast = (l) => {
  if (!l) return '';
  const greeting = getISTGreeting();
  let contactNum = l.contactNumber || l.contact_number || '9390003955 / 9390006942';
  const fromCity = l.from || l.from_city || 'Hyderabad';
  const toCity = l.to || l.to_city || 'Chennai';
  const vehicle = l.vehicleType || l.vehicle_type || '32 FT Open';
  const weight = l.weight || '15 MT';
  const freightVal = String(l.freight || l.transporter_rate || '45000').replace(/[^\d\.]/g, '') || '45000';

  const lines = [
    greeting,
    '',
    '*🚚 Chitkote Logistics Load Available*',
    '',
    `📍 Pickup: ${fromCity}`,
    `📍 Delivery: ${toCity}`,
    `🚛 Vehicle Required: ${vehicle}`,
  ];
  if (l.material) lines.push(`📦 Material: ${l.material}`);
  if (weight) lines.push(`⚖️ Weight: ${weight}`);
  lines.push(`💰 Freight: ₹${freightVal}`);
  lines.push('');
  lines.push(`📞 Contact: ${contactNum}`);
  lines.push('');
  lines.push('Please contact us if you are interested in any of the above loads.');
  lines.push('');
  lines.push('Thank you,');
  lines.push('Chitkote Logistics');

  return lines.join('\n');
};

const getDefaultBroadcastMessage = () => {
  const greeting = getISTGreeting();
  return [
    greeting,
    '',
    '*🚚 Chitkote Logistics Load Available*',
    '',
    '📍 Pickup: Hyderabad',
    '📍 Delivery: Chennai',
    '🚛 Vehicle Required: 32 FT Open',
    '⚖️ Weight: 15 MT',
    '💰 Freight: ₹45000',
    '',
    '📞 Contact: 9390003955 / 9390006942',
    '',
    'Please contact us if you are interested in any of the above loads.',
    '',
    'Thank you,',
    'Chitkote Logistics',
  ].join('\n');
};

const Broadcast = () => {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loads, setLoads] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [selectedLoadId, setSelectedLoadId] = useState('');
  const [message, setMessage] = useState(getDefaultBroadcastMessage());
  const [scheduledAt, setScheduledAt] = useState('');
  const [progress, setProgress] = useState(0);
  const [groupName, setGroupName] = useState('');
  const [toast, setToast] = useState(null);
  const [directInput, setDirectInput] = useState('');
  const [rawContacts, setRawContacts] = useState([]);
  const [quickLoad, setQuickLoad] = useState({ from: '', to: '', vehicleType: '', weight: '', freight: '' });
  const [broadcastTab, setBroadcastTab] = useState('single');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast(`⏳ Reading and importing "${file.name}"... please wait`, 'info');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const mappedRows = data.flatMap(mapRecord).filter((c) => c.mobile && c.mobile.length >= 10);
        if (!mappedRows.length) {
          showToast('❌ No valid contacts found in the uploaded file.', 'error');
          return;
        }

        const res = await importContacts({ contacts: mappedRows });
        await loadContacts();
        showToast(`✅ Successfully imported ${res.data.imported || mappedRows.length} contacts for broadcast!`);
      } catch (err) {
        showToast(`❌ Failed to import file: ${err.response?.data?.error || err.message}`, 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const updateQuickLoad = (field, value) => {
    const newQl = { ...quickLoad, [field]: value };
    setQuickLoad(newQl);
    const greeting = getISTGreeting();
    const lines = [
      greeting,
      '',
      '*🚚 Chitkote Logistics Load Available*',
      '',
      `📍 Pickup: ${newQl.from || 'Hyderabad'}`,
      `📍 Delivery: ${newQl.to || 'Chennai'}`,
      `🚛 Vehicle Required: ${newQl.vehicleType || '32 FT Open'}`,
    ];
    if (newQl.weight) lines.push(`⚖️ Weight: ${newQl.weight || '15 MT'}`);
    lines.push(`💰 Freight: ₹${String(newQl.freight || '45000').replace(/[^\d\.]/g, '') || '45000'}`);
    lines.push('');
    lines.push(`📞 Contact: 9390003955 / 9390006942`);
    lines.push('');
    lines.push('Please contact us if you are interested in any of the above loads.');
    lines.push('');
    lines.push('Thank you,');
    lines.push('Chitkote Logistics');
    setMessage(lines.join('\n'));
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
    setSelected([]);
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q) || c.city.toLowerCase().includes(q) || c.vehicleType.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.some((item) => String(item) === String(id))
        ? prev.filter((item) => String(item) !== String(id))
        : [...prev, id]
    );
    setActiveGroupId(null);
  };

  const selectAll = () => {
    setSelected(filtered.map((item) => item.id));
    setActiveGroupId(null);
  };

  const clearSelection = () => {
    setSelected([]);
    setActiveGroupId(null);
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

  const handleSend = async () => {
    let targets = [...selected];
    if (directInput.trim()) {
      const parsedDirects = directInput.split(/[\s,]+/).map((n) => n.trim()).filter(Boolean);
      targets = Array.from(new Set([...targets, ...parsedDirects]));
    }

    if (!targets.length && !rawContacts.length) {
      showToast('Please select a contact, enter a mobile number, or upload an Excel sheet for broadcast', 'error');
      return;
    }

    setProgress(30);
    try {
      const res = await broadcast({ 
        contactIds: targets, 
        rawContacts: rawContacts.map(c => ({ name: c.name, mobile: c.mobile })), 
        message, 
        scheduledAt: scheduledAt || undefined,
        type: 'text' // Dispatches custom formatted load message directly
      });
      setProgress(100);
      processBroadcastResponse(res.data);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      showToast(`❌ Broadcast Failed: ${errMsg}`, 'error');
    } finally {
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const activeLoadObj = useMemo(() => {
    return loads.find((x) => String(x.id) === String(selectedLoadId) || String(x.loadId) === String(selectedLoadId));
  }, [loads, selectedLoadId]);

  const activeLoadSummary = useMemo(() => {
    if (!activeLoadObj) return 'General Load Dispatch';
    const fromCity = activeLoadObj.from || activeLoadObj.from_city || 'Hyderabad';
    const toCity = activeLoadObj.to || activeLoadObj.to_city || 'Chennai';
    const vehicle = activeLoadObj.vehicleType || activeLoadObj.vehicle_type || 'Truck';
    const freight = activeLoadObj.freight ? `₹${activeLoadObj.freight}` : '';
    return `${fromCity} → ${toCity} (${vehicle} ${freight})`.trim();
  }, [activeLoadObj]);

  const handleVoiceCall = async (contactMobile, contactName = '') => {
    try {
      showToast(`📞 Initiating Exotel voice call to ${contactName || contactMobile} for load [${activeLoadSummary}]...`);
      const res = await makeVoiceCall({ mobile: contactMobile, loadId: selectedLoadId, loadDetails: activeLoadSummary });
      showToast(`✅ Call Placed to ${contactName || contactMobile}! Shared Load: [${activeLoadSummary}] (Call SID: ${res.data?.callSid})`);
    } catch (err) {
      showToast(`❌ Voice Call Failed: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const handleVoiceBroadcast = async () => {
    let targets = [...selected];
    if (directInput.trim()) {
      const parsedDirects = directInput.split(/[\s,]+/).map((n) => n.trim()).filter(Boolean);
      targets = Array.from(new Set([...targets, ...parsedDirects]));
    }

    if (!targets.length) {
      showToast('Please select a contact or enter a mobile number for voice call broadcast', 'error');
      return;
    }

    setProgress(30);
    try {
      showToast(`📞 Placing Exotel Voice Calls to ${targets.length} recipient(s) for load [${activeLoadSummary}]...`);
      const res = await broadcastVoiceCalls({ contactIds: targets, loadId: selectedLoadId, loadDetails: activeLoadSummary });
      setProgress(100);
      showToast(`✅ Voice Broadcast Dispatched! ${res.data?.successfulCalls || targets.length} calls placed for load [${activeLoadSummary}].`);
    } catch (err) {
      showToast(`❌ Voice Call Broadcast Failed: ${err.response?.data?.error || err.message}`, 'error');
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

    const createdRes = await createGroup({ name: groupName, contactIds: selected });
    const newGroupId = createdRes.data?.id;
    setGroupName('');
    await loadGroups();
    if (newGroupId) setActiveGroupId(newGroupId);
    showToast(`📁 Broadcast group "${groupName}" saved with ${selected.length} contact(s)!`);
  };

  const handleLoadGroup = async (groupId) => {
    const res = await getGroupContacts(groupId);
    const contactIds = res.data.contactIds || [];
    setSelected(contactIds);
    setActiveGroupId(groupId);

    const grp = groups.find((g) => String(g.id) === String(groupId));
    const memberNames = contacts
      .filter((c) => contactIds.some((id) => String(id) === String(c.id)))
      .map((c) => c.name)
      .join(', ');

    showToast(`📁 Group "${grp?.name || 'Selected'}" Loaded: [${memberNames || `${contactIds.length} contacts`}]`);
  };

  const activeGroupObj = useMemo(() => groups.find((g) => String(g.id) === String(activeGroupId)), [groups, activeGroupId]);

  const activeGroupContacts = useMemo(() => {
    if (!activeGroupId) return [];
    return contacts.filter((c) => selected.some((sId) => String(sId) === String(c.id)));
  }, [contacts, selected, activeGroupId]);

  const handleDeleteGroup = async (e, groupId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this broadcast group?')) return;
    await deleteGroup(groupId);
    if (String(activeGroupId) === String(groupId)) {
      setActiveGroupId(null);
    }
    await loadGroups();
    showToast('Broadcast group deleted');
  };

  const handleClearAllGroups = async () => {
    if (!window.confirm('Are you sure you want to delete ALL broadcast groups?')) return;
    await clearAllGroups();
    setActiveGroupId(null);
    await loadGroups();
    showToast('All broadcast groups deleted');
  };

  return (
    <div className="space-y-6">
      {/* Broadcast Mode Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3 shadow-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBroadcastTab('single')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              broadcastTab === 'single'
                ? 'border border-cyan-800/80 bg-cyan-950/80 text-cyan-300 shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            📦 Single Load Broadcast
          </button>
          <button
            onClick={() => setBroadcastTab('multi')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              broadcastTab === 'multi'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-950'
                : 'text-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300'
            }`}
          >
            ✨ Multi-Load Combined Plan
          </button>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400">
          Mode: <strong className="text-white">{broadcastTab === 'multi' ? 'Combined Multi-Load WhatsApp Broadcast' : 'Single Load Quick Broadcast'}</strong>
        </div>
      </div>

      {broadcastTab === 'multi' ? (
        <MultiLoadBuilder allLoads={loads} />
      ) : (
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

      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/20 p-4 space-y-2">
          <label className="block text-xs font-semibold text-cyan-300">
            📱 Direct Send to Phone Number(s)
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

        <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-4 space-y-2">
          <label className="block text-xs font-semibold text-indigo-300">
            📊 Upload Excel / CSV (Name, Phone)
          </label>
          <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-900 file:text-indigo-200 hover:file:bg-indigo-800" />
          {rawContacts.length > 0 && (
            <div className="mt-1 text-xs text-emerald-400 font-medium">
              ✅ {rawContacts.length} contacts extracted and ready for broadcast.
            </div>
          )}
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
        <button className="rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-cyan-500 hover:to-indigo-500 shadow-md shadow-cyan-950" onClick={handleSend}>
          💬 Send WhatsApp ({selected.length + (directInput.trim() ? directInput.split(/[\s,]+/).filter(Boolean).length : 0)})
        </button>
        <button className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-950 flex items-center gap-1.5" onClick={handleVoiceBroadcast}>
          📞 Voice Call Broadcast ({selected.length + (directInput.trim() ? directInput.split(/[\s,]+/).filter(Boolean).length : 0)})
        </button>
      </div>

      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center justify-between">
        <div>
          📌 <strong>Attached Load for Call / Message:</strong> <span className="font-mono text-emerald-200">{activeLoadSummary}</span>
        </div>
        <span className="text-[11px] text-emerald-400 font-medium">Exotel Voice + Meta WhatsApp Connected</span>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 mt-4">
        <h3 className="text-sm font-semibold text-white mb-2">⚡ Quick Load Generator</h3>
        <div className="grid gap-3 md:grid-cols-5 mb-2">
          <input className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="From (e.g. Mumbai)" value={quickLoad.from} onChange={e => updateQuickLoad('from', e.target.value)} />
          <input className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="To (e.g. Delhi)" value={quickLoad.to} onChange={e => updateQuickLoad('to', e.target.value)} />
          <input className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="Vehicle (e.g. 32 FT)" value={quickLoad.vehicleType} onChange={e => updateQuickLoad('vehicleType', e.target.value)} />
          <input className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="Weight (e.g. 15 Tons)" value={quickLoad.weight} onChange={e => updateQuickLoad('weight', e.target.value)} />
          <input className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" placeholder="Freight (e.g. ₹20000)" value={quickLoad.freight} onChange={e => updateQuickLoad('freight', e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-3 mt-4">
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
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-slate-300">Saved Broadcast Groups ({groups.length})</p>
            {groups.length > 0 && (
              <button onClick={handleClearAllGroups} className="text-[11px] text-rose-400 hover:text-rose-300 font-medium">
                Clear All Groups 🗑️
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-auto">
            {groups.length === 0 ? (
              <span className="text-xs text-slate-500">No saved groups created yet. Create a group above!</span>
            ) : (
              groups.map((group) => {
                const isActive = String(activeGroupId) === String(group.id);
                return (
                  <div
                    key={group.id}
                    className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'border-cyan-400 bg-cyan-950 text-cyan-200 ring-2 ring-cyan-500/50 shadow-md shadow-cyan-950'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                    }`}
                    onClick={() => handleLoadGroup(group.id)}
                  >
                    <span>📁 {group.name}</span>
                    {isActive && <span className="ml-1.5 text-cyan-400 font-bold">✓ Selected</span>}
                    <button
                      className="ml-2 text-slate-500 hover:text-rose-400 font-bold"
                      onClick={(e) => handleDeleteGroup(e, group.id)}
                      title="Delete Group"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {activeGroupObj && (
        <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/40 p-3.5 text-xs text-cyan-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            📁 <strong>Active Group: "{activeGroupObj.name}"</strong> — Members: {activeGroupContacts.length > 0 ? activeGroupContacts.map((c) => c.name).join(', ') : 'None'}
          </div>
          <button onClick={() => setActiveGroupId(null)} className="text-[11px] text-slate-400 hover:text-white">✕ Dismiss Info</button>
        </div>
      )}

      {progress > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3 text-xs font-semibold text-slate-400 flex justify-between items-center">
          <span>Recipient Selection List ({filtered.length})</span>
          {selected.length > 0 && <span className="text-cyan-400 font-mono">{selected.length} Checked</span>}
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
            filtered.map((contact) => {
              const isChecked = selected.some((sId) => String(sId) === String(contact.id));
              const isMemberOfActiveGroup = activeGroupId && isChecked;

              return (
                <div key={contact.id} className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm transition-colors ${isChecked ? 'bg-cyan-950/30' : 'hover:bg-slate-900/60'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                      checked={isChecked}
                      onChange={() => toggle(contact.id)}
                    />
                    <span className="font-medium text-slate-200" onClick={() => toggle(contact.id)}>{contact.name}</span>
                    <span className="text-xs text-slate-400">{contact.mobile} · {contact.city} ({contact.vehicleType})</span>
                    {isMemberOfActiveGroup && (
                      <span className="rounded bg-cyan-900/80 border border-cyan-700/60 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
                        📁 {activeGroupObj?.name || 'Group'} Member
                      </span>
                    )}
                  </div>
                  <button
                    className="rounded bg-emerald-950 border border-emerald-800/60 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-900 flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVoiceCall(contact.mobile, contact.name);
                    }}
                    title={`Auto-Call ${contact.name} via Exotel for load: ${activeLoadSummary}`}
                  >
                    📞 Voice Call
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
      )}
    </div>
  );
};

export default Broadcast;
