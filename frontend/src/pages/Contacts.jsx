import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { createContact, deleteContact, deleteContactsBulk, getContacts, getInboundMessages, importContacts, saveInboundAsContact, sendTestMessage, updateContact, validateContacts } from '../services/api';

const emptyForm = { name: '', mobile: '', company: '', city: '', state: '', vehicleType: '' };

const HEADER_ALIASES = {
  name: ['name', 'contactname', 'full_name', 'contact_name', 'fullname', 'customer_name'],
  mobile: ['mobile', 'phone', 'phone_number', 'contact_number', 'contactmobile', 'whatsapp', 'wa_number'],
  company: ['company', 'organisation', 'organization', 'firm'],
  city: ['city', 'town', 'location'],
  state: ['state', 'province', 'region'],
  vehicleType: ['vehicle_type', 'vehicletype', 'vehicle', 'truck_type'],
};

const normalizeHeader = (value = '') => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');

const normalizePhone = (value = '') => {
  const cleaned = String(value).replace(/\D/g, '');
  if (!cleaned) {
    return '';
  }

  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }

  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `91${cleaned.slice(1)}`;
  }

  return cleaned;
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

  return {
    name: getFieldValue(normalizedRecord, HEADER_ALIASES.name) || '',
    mobile: normalizePhone(getFieldValue(normalizedRecord, HEADER_ALIASES.mobile) || ''),
    company: getFieldValue(normalizedRecord, HEADER_ALIASES.company) || '',
    city: getFieldValue(normalizedRecord, HEADER_ALIASES.city) || '',
    state: getFieldValue(normalizedRecord, HEADER_ALIASES.state) || '',
    vehicleType: getFieldValue(normalizedRecord, HEADER_ALIASES.vehicleType) || '',
  };
};

const dedupeContacts = (rows = [], existingContacts = []) => {
  const existingMobiles = new Set(existingContacts.map((contact) => normalizePhone(contact.mobile)).filter(Boolean));
  const uniqueRows = [];
  const duplicatesSkipped = [];

  rows.forEach((row) => {
    const normalizedMobile = normalizePhone(row.mobile);
    if (!normalizedMobile) {
      return;
    }

    if (existingMobiles.has(normalizedMobile)) {
      duplicatesSkipped.push(row);
      return;
    }

    existingMobiles.add(normalizedMobile);
    uniqueRows.push({ ...row, mobile: normalizedMobile });
  });

  return { uniqueRows, duplicatesSkipped };
};

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [inboundList, setInboundList] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [messageText, setMessageText] = useState('What can I help you today?');
  const [csvText, setCsvText] = useState('name,mobile,company,city,state,vehicleType\nAmit,9730361798,Chitkote,Chennai,TN,Truck');
  const [selectedFileName, setSelectedFileName] = useState('No file selected');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');

  const loadContacts = async () => {
    const res = await getContacts();
    setContacts(res.data || []);
  };

  const loadInbound = async () => {
    try {
      const res = await getInboundMessages();
      setInboundList(res.data || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadContacts();
    loadInbound();
    const interval = setInterval(() => {
      loadContacts();
      loadInbound();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const nameMatch = (contact.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const mobileMatch = (contact.mobile || '').includes(searchQuery);
      const companyMatch = (contact.company || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = nameMatch || mobileMatch || companyMatch;

      const matchesCity = filterCity ? (contact.city || '').toLowerCase() === filterCity.toLowerCase() : true;
      const matchesVehicle = filterVehicle ? (contact.vehicle_type || '').toLowerCase() === filterVehicle.toLowerCase() : true;

      return matchesSearch && matchesCity && matchesVehicle;
    });
  }, [contacts, searchQuery, filterCity, filterVehicle]);

  const uniqueCities = useMemo(() => Array.from(new Set(contacts.map((c) => c.city).filter(Boolean))), [contacts]);
  const uniqueVehicles = useMemo(() => Array.from(new Set(contacts.map((c) => c.vehicle_type).filter(Boolean))), [contacts]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name,
      mobile: normalizePhone(form.mobile),
      company: form.company,
      city: form.city,
      state: form.state,
      vehicleType: form.vehicleType,
    };

    if (editingId) {
      await updateContact(editingId, payload);
    } else {
      await createContact(payload);
    }

    resetForm();
    await loadContacts();
  };

  const handleEdit = (contact) => {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      mobile: contact.mobile,
      company: contact.company || '',
      city: contact.city || '',
      state: contact.state || '',
      vehicleType: contact.vehicle_type || '',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    await deleteContact(id);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    await loadContacts();
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected contact(s)?`)) return;
    await deleteContactsBulk(selectedIds);
    setSelectedIds([]);
    await loadContacts();
  };

  const handleExport = (filename = 'contacts_export.xlsx') => {
    const targetContacts = selectedIds.length
      ? contacts.filter((c) => selectedIds.includes(c.id))
      : filteredContacts;

    if (!targetContacts.length) {
      alert('No contacts available to export');
      return;
    }

    const exportRows = targetContacts.map((c) => ({
      Name: c.name,
      Mobile: c.mobile,
      Company: c.company || '',
      City: c.city || '',
      State: c.state || '',
      VehicleType: c.vehicle_type || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
    XLSX.writeFile(workbook, filename);
  };

  const handleValidate = async () => {
    const res = await validateContacts({ contacts: contacts.map((contact) => contact.mobile) });
    alert(JSON.stringify(res.data.validation, null, 2));
  };

  const handleTestSend = async () => {
    const ids = selectedIds.length ? selectedIds : contacts.map((contact) => contact.id);
    const numbers = contacts.filter((contact) => ids.includes(contact.id)).map((contact) => contact.mobile);

    if (!numbers.length) {
      alert('Please select at least one contact');
      return;
    }

    const res = await sendTestMessage({ contactIds: ids, contacts: numbers, message: messageText });
    alert(`Test send completed for ${res.data.results.length} contacts`);
  };

  const handleImportRows = async (rows = []) => {
    const mappedRows = rows.map((row) => mapRecord(row)).filter((row) => row.name || row.mobile);
    const { uniqueRows, duplicatesSkipped } = dedupeContacts(mappedRows, contacts);

    if (!uniqueRows.length) {
      alert(`No new contacts were imported. ${duplicatesSkipped.length} duplicate rows were skipped.`);
      return;
    }

    const res = await importContacts({ contacts: uniqueRows });
    await loadContacts();
    alert(`Imported ${res.data.imported} contacts. Skipped ${duplicatesSkipped.length} duplicates.`);
  };

  const handleCsvImport = async () => {
    try {
      const workbook = XLSX.read(csvText, { type: 'string' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rows.length) {
        alert('Please provide a valid spreadsheet with headers and rows.');
        return;
      }

      await handleImportRows(rows);
    } catch (error) {
      alert('Unable to parse the CSV content. Please check the delimiter and column headers.');
    }
  };

  const handleFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedFileName(file.name);

    try {
      if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const textPreview = XLSX.utils.sheet_to_csv(sheet);
        setCsvText(textPreview);
        await handleImportRows(rows);
      } else {
        const text = await file.text();
        setCsvText(text);
        const workbook = XLSX.read(text, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        await handleImportRows(rows);
      }
    } catch (error) {
      alert('Unable to read the uploaded spreadsheet. Please try a CSV or Excel file.');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredContacts.length && filteredContacts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContacts.map((c) => c.id));
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Contacts</h2>
          <p className="text-sm text-slate-400">Total: {contacts.length} | Filtered: {filteredContacts.length} | Selected: {selectedIds.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <button className="rounded bg-rose-600 px-4 py-2 text-sm font-medium" onClick={handleBulkDelete}>
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium" onClick={() => handleExport('contacts.xlsx')}>
            Export Excel
          </button>
          <button className="rounded bg-teal-600 px-4 py-2 text-sm font-medium" onClick={() => handleExport('contacts.csv')}>
            Export CSV
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        <input className="rounded border border-slate-700 bg-slate-950 p-3" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="rounded border border-slate-700 bg-slate-950 p-3" placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
        <input className="rounded border border-slate-700 bg-slate-950 p-3" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input className="rounded border border-slate-700 bg-slate-950 p-3" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className="rounded border border-slate-700 bg-slate-950 p-3" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        <input className="rounded border border-slate-700 bg-slate-950 p-3" placeholder="Vehicle Type" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} />
        <div className="flex gap-3 md:col-span-2">
          <button className="rounded bg-cyan-600 px-4 py-2" type="submit">{editingId ? 'Update Contact' : 'Add Contact'}</button>
          {editingId ? <button className="rounded bg-slate-700 px-4 py-2" type="button" onClick={resetForm}>Cancel</button> : null}
        </div>
      </form>

      {inboundList.length > 0 && (
        <div className="mt-6 rounded-xl border border-indigo-900/60 bg-indigo-950/40 p-4">
          <div className="flex items-center justify-between border-b border-indigo-800/40 pb-2 mb-3">
            <h3 className="text-sm font-semibold text-indigo-300">📬 Driver Inquiries & Incoming WhatsApp Messages ({inboundList.length})</h3>
            <span className="text-xs text-indigo-400">Review & Save as Verified Contacts</span>
          </div>
          <div className="grid gap-2 max-h-48 overflow-auto">
            {inboundList.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs">
                <div>
                  <span className="font-semibold text-white">{item.sender_name || item.mobile}</span>
                  <span className="ml-2 font-mono text-cyan-400">{item.mobile}</span>
                  <p className="mt-0.5 text-slate-400">"{item.message}" · <span className="text-slate-500">{new Date(item.created_at).toLocaleTimeString()}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  {item.is_saved ? (
                    <span className="rounded bg-emerald-950 border border-emerald-800 px-2 py-1 text-emerald-300">✓ Saved Contact</span>
                  ) : (
                    <button
                      className="rounded bg-indigo-600 hover:bg-indigo-500 px-3 py-1 font-semibold text-white"
                      onClick={async () => {
                        await saveInboundAsContact({ id: item.id, mobile: item.mobile, name: item.sender_name || `Driver ${item.mobile.slice(-4)}` });
                        await loadContacts();
                        await loadInbound();
                      }}
                    >
                      + Save to Contacts
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <input
          className="rounded border border-slate-700 bg-slate-950 p-3 text-sm"
          placeholder="Search by name, phone, company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="rounded border border-slate-700 bg-slate-950 p-3 text-sm"
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
        >
          <option value="">All Cities</option>
          {uniqueCities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
        <select
          className="rounded border border-slate-700 bg-slate-950 p-3 text-sm"
          value={filterVehicle}
          onChange={(e) => setFilterVehicle(e.target.value)}
        >
          <option value="">All Vehicle Types</option>
          {uniqueVehicles.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button className="rounded bg-slate-700 px-4 py-2" onClick={handleValidate}>Validate Contacts</button>
        <button className="rounded bg-cyan-600 px-4 py-2" onClick={handleTestSend}>Send to Selected</button>
        <textarea className="min-w-[280px] rounded border border-slate-700 bg-slate-950 p-3" rows="3" value={messageText} onChange={(e) => setMessageText(e.target.value)} />
      </div>

      <div className="mt-4 rounded border border-slate-800 bg-slate-950 p-4">
        <p className="mb-2 text-sm font-semibold">Bulk import via CSV or Excel</p>
        <textarea className="min-h-[150px] w-full rounded border border-slate-700 bg-slate-950 p-3" value={csvText} onChange={(e) => setCsvText(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-3">
          <button className="rounded bg-cyan-600 px-4 py-2" onClick={handleCsvImport}>Import Spreadsheet Contacts</button>
          <label className="cursor-pointer rounded bg-slate-700 px-4 py-2">
            Upload CSV / XLSX File
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileImport} />
          </label>
          <span className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300">{selectedFileName}</span>
        </div>
      </div>

      <div className="mt-6 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="p-2">
                <input
                  type="checkbox"
                  checked={filteredContacts.length > 0 && selectedIds.length === filteredContacts.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-2">Name</th>
              <th className="p-2">Mobile</th>
              <th className="p-2">Company</th>
              <th className="p-2">City</th>
              <th className="p-2">State</th>
              <th className="p-2">Vehicle</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map((contact) => (
              <tr key={contact.id} className="border-t border-slate-800">
                <td className="p-2"><input type="checkbox" checked={selectedIds.includes(contact.id)} onChange={() => toggleSelect(contact.id)} /></td>
                <td className="p-2">{contact.name}</td>
                <td className="p-2">{contact.mobile}</td>
                <td className="p-2">{contact.company || '—'}</td>
                <td className="p-2">{contact.city}</td>
                <td className="p-2">{contact.state}</td>
                <td className="p-2">{contact.vehicle_type}</td>
                <td className="p-2 flex gap-2">
                  <button className="rounded bg-slate-700 px-3 py-1 text-xs" onClick={() => handleEdit(contact)}>Edit</button>
                  <button className="rounded bg-rose-700 px-3 py-1 text-xs" onClick={() => handleDelete(contact.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Contacts;
