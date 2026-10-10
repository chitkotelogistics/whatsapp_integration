import { useState, useEffect, useMemo, useRef } from 'react';
import { getLoads, getContacts, getGroups, broadcast, getMessageDrafts, saveMessageDraft, deleteMessageDraft } from '../services/api';

// IST Date & Time Helpers
export const getISTDate = (offsetDays = 0) => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5 + offsetDays * 86400000);
  return ist;
};

export const formatDisplayDate = (d) => {
  if (!d) return '';
  const dateObj = typeof d === 'string' && d.includes('-') ? new Date(d) : d;
  return dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const getAutoISTGreeting = (lang = 'en') => {
  const hour = getISTDate().getHours();
  if (lang === 'mr') {
    if (hour >= 4 && hour < 12) return 'शुभ सकाळ';
    if (hour >= 12 && hour < 17) return 'शुभ दुपार';
    if (hour >= 17 && hour < 22) return 'शुभ संध्याकाळ';
    return 'नमस्कार';
  }
  if (lang === 'hi') {
    if (hour >= 4 && hour < 12) return 'Good Morning / Namaste';
    if (hour >= 12 && hour < 17) return 'Good Afternoon / Namaste';
    if (hour >= 17 && hour < 22) return 'Good Evening / Namaste';
    return 'Hello / Namaste';
  }
  if (hour >= 4 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 22) return 'Good Evening';
  return 'Hello';
};

const LANG_CONFIG = {
  en: {
    heading: '🚛 *CHITKOTE LOGISTICS — AVAILABLE LOADS*',
    dateLabel: '📅 Date:',
    loadPrefix: 'LOAD',
    pickup: '📍 Pickup:',
    delivery: '📍 Delivery:',
    material: '📦 Material:',
    vehicle: '🚛 Vehicle Required:',
    weight: '⚖️ Weight:',
    freight: '💰 Freight:',
    contact: '📞 Contact:',
    closing: 'Please contact us if you are interested in any of the above loads.\n\nThank you,\n*Chitkote Logistics*',
  },
  mr: {
    heading: '🚛 *चितकोटे लॉजिस्टिक्स — उपलब्ध लोड्स*',
    dateLabel: '📅 तारीख:',
    loadPrefix: 'लोड',
    pickup: '📍 पिकअप:',
    delivery: '📍 डिलिव्हरी:',
    material: '📦 माल:',
    vehicle: '🚛 आवश्यक गाडी:',
    weight: '⚖️ वजन:',
    freight: '💰 भाडे:',
    contact: '📞 संपर्क:',
    closing: 'वरीलपैकी कोणत्याही लोडसाठी कृपया आमच्याशी संपर्क साधा.\n\nधन्यवाद,\n*चितकोटे लॉजिस्टिक्स*',
  },
  hi: {
    heading: '🚛 *CHITKOTE LOGISTICS — AVAILABLE LOADS*',
    dateLabel: '📅 Date:',
    loadPrefix: 'LOAD',
    pickup: '📍 Pickup:',
    delivery: '📍 Delivery:',
    material: '📦 Material:',
    vehicle: '🚛 Vehicle Required:',
    weight: '⚖️ Weight:',
    freight: '💰 Freight Rate:',
    contact: '📞 Direct Contact:',
    closing: 'Agar aap inme se kisi bhi load me interested hain toh turant call ya reply karein.\n\nDhanyawad,\n*Chitkote Logistics*',
  },
};

const SEPARATORS = {
  heavy: '━━━━━━━━━━━━━━',
  light: '──────────────',
  dash: '-------------------',
  double: '══════════════',
  none: '',
};

export default function MultiLoadBuilder({
  initialSelectedLoads = [],
  allLoads = [],
  onClose,
  onLoadAdded,
}) {
  // Plan & Date States
  const [planType, setPlanType] = useState('today'); // 'today' | 'tomorrow' | 'custom'
  const [customDate, setCustomDate] = useState(() => getISTDate(1).toISOString().slice(0, 10));
  const [language, setLanguage] = useState('en'); // 'en' | 'mr' | 'hi'
  const [greetingOption, setGreetingOption] = useState('auto'); // 'auto' | 'Good Morning' | 'Good Afternoon' | 'Good Evening' | 'Hello' | 'custom'
  const [customGreeting, setCustomGreeting] = useState('');

  // Loads Queue
  const [selectedLoadIds, setSelectedLoadIds] = useState(() =>
    initialSelectedLoads.map((l) => String(l.id || l.loadId || l.load_id))
  );
  const [customLoads, setCustomLoads] = useState([]); // Loads added on the fly

  // Formatting & Visibility Settings
  const [separatorStyle, setSeparatorStyle] = useState('heavy');
  const [showFreight, setShowFreight] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [showMaterial, setShowMaterial] = useState(true);
  const [showWeight, setShowWeight] = useState(true);
  const [showVehicle, setShowVehicle] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showPartyRate, setShowPartyRate] = useState(false); // default OFF (never expose customer rate)
  const [useEmojis, setUseEmojis] = useState(true);

  // Editable Text Overrides
  const [customHeading, setCustomHeading] = useState('');
  const [customClosing, setCustomClosing] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isManualEdit, setIsManualEdit] = useState(false);

  // Add Custom Load Form
  const [showNewLoadForm, setShowNewLoadForm] = useState(false);
  const [newLoadForm, setNewLoadForm] = useState({
    from: '',
    to: '',
    material: '',
    weight: '',
    vehicleType: '',
    freight: '',
    contactNumber: '9390003955 / 9390006942',
  });

  // Drafts & Recipient States
  const [drafts, setDrafts] = useState([]);
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [directRecipients, setDirectRecipients] = useState('');

  // UI Flow & Confirmation Modal
  const [activeTab, setActiveTab] = useState('builder'); // 'builder' | 'recipients' | 'drafts'
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  // 1. Fetch auxiliary data
  useEffect(() => {
    loadDrafts();
    loadContactsList();
    loadGroupsList();
  }, []);

  const loadDrafts = async () => {
    try {
      const res = await getMessageDrafts();
      setDrafts(res.data || []);
    } catch (e) {}
  };

  const loadContactsList = async () => {
    try {
      const res = await getContacts();
      setContacts(res.data || []);
    } catch (e) {}
  };

  const loadGroupsList = async () => {
    try {
      const res = await getGroups();
      setGroups(res.data || []);
    } catch (e) {}
  };

  // 2. Compute Plan Date dynamically
  const planDateString = useMemo(() => {
    if (planType === 'today') return formatDisplayDate(getISTDate(0));
    if (planType === 'tomorrow') return formatDisplayDate(getISTDate(1));
    return formatDisplayDate(customDate);
  }, [planType, customDate]);

  // 3. Compute Greeting
  const activeGreeting = useMemo(() => {
    if (greetingOption === 'auto') return getAutoISTGreeting(language);
    if (greetingOption === 'custom') return customGreeting || getAutoISTGreeting(language);
    return greetingOption;
  }, [greetingOption, customGreeting, language]);

  // 4. Resolve Ordered Selected Loads
  const orderedLoads = useMemo(() => {
    const list = [];
    selectedLoadIds.forEach((id) => {
      // Check in custom loads first
      const customFound = customLoads.find((c) => String(c.id) === String(id));
      if (customFound) {
        list.push(customFound);
        return;
      }
      // Check in allLoads
      const savedFound = allLoads.find((l) => String(l.id || l.loadId || l.load_id) === String(id));
      if (savedFound) {
        list.push(savedFound);
      }
    });
    return list;
  }, [selectedLoadIds, customLoads, allLoads]);

  // 5. Generate Combined Message
  const generateCombinedMessage = () => {
    const lang = LANG_CONFIG[language] || LANG_CONFIG.en;
    const lines = [];

    // Greeting
    lines.push(`${activeGreeting},`);
    lines.push('');

    // Heading
    lines.push(customHeading.trim() || lang.heading);
    lines.push('');

    // Plan Date
    if (showDate && planDateString) {
      lines.push(`${lang.dateLabel} ${planDateString}`);
    }

    const sep = SEPARATORS[separatorStyle];

    if (orderedLoads.length === 0) {
      if (sep) {
        lines.push(sep);
        lines.push('');
      }
      lines.push('*(No loads currently selected. Choose loads from the left panel)*');
    } else {
      orderedLoads.forEach((load, idx) => {
        if (sep) {
          lines.push(sep);
          lines.push('');
        }

        // Load Header: *LOAD 1*
        lines.push(`*${lang.loadPrefix} ${idx + 1}*`);
        lines.push('');

        // Pickup & Delivery
        const fromCity = load.from || load.from_city || 'Hyderabad';
        const toCity = load.to || load.to_city || 'Chennai';
        lines.push(`${lang.pickup} ${fromCity}`);
        lines.push(`${lang.delivery} ${toCity}`);

        // Material
        if (showMaterial && (load.material || '').trim()) {
          lines.push(`${lang.material} ${load.material.trim()}`);
        }

        // Vehicle Required
        if (showVehicle) {
          const veh = load.vehicleType || load.vehicle_type || '32 FT Open Truck';
          lines.push(`${lang.vehicle} ${veh}`);
        }

        // Weight
        if (showWeight && (load.weight || '').trim()) {
          lines.push(`${lang.weight} ${load.weight.trim()}`);
        }

        // Freight Rate (Always prioritize transporter target rate; never expose internal customer rate unless explicit)
        if (showFreight) {
          const publicRate = load.transporter_rate || load.freight || '';
          if (publicRate) {
            const numVal = String(publicRate).replace(/[^\d\.]/g, '');
            const formatted = numVal ? Number(numVal).toLocaleString('en-IN') : publicRate;
            lines.push(`${lang.freight} ₹${formatted}`);
          }
          if (showPartyRate && load.party_rate) {
            lines.push(`🔒 Customer Rate: ₹${Number(load.party_rate).toLocaleString('en-IN')}`);
          }
        }

        // Contact
        if (showContact) {
          const contact =
            load.contactNumber ||
            load.contact_number ||
            '9390003955 / 9390006942';
          lines.push(`${lang.contact} ${contact}`);
        }
      });
    }

    if (sep) {
      lines.push('');
      lines.push(sep);
    }

    lines.push('');
    lines.push(customClosing.trim() || lang.closing);

    return lines.join('\n');
  };

  // Sync auto-generated text when parameters change (unless user manually modified text)
  useEffect(() => {
    if (!isManualEdit) {
      setMessageText(generateCombinedMessage());
    }
  }, [
    orderedLoads,
    activeGreeting,
    planDateString,
    language,
    customHeading,
    customClosing,
    separatorStyle,
    showFreight,
    showContact,
    showMaterial,
    showWeight,
    showVehicle,
    showDate,
    showPartyRate,
    isManualEdit,
  ]);

  // Handlers for Load Selection
  const toggleLoadSelection = (id) => {
    const idStr = String(id);
    setSelectedLoadIds((prev) =>
      prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr]
    );
  };

  const removeLoad = (id) => {
    const idStr = String(id);
    setSelectedLoadIds((prev) => prev.filter((x) => x !== idStr));
  };

  const moveLoad = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= selectedLoadIds.length) return;
    const nextList = [...selectedLoadIds];
    const temp = nextList[index];
    nextList[index] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setSelectedLoadIds(nextList);
  };

  const handleAddCustomLoad = (e) => {
    e.preventDefault();
    if (!newLoadForm.from.trim() || !newLoadForm.to.trim()) {
      showToast('Pickup and Delivery cities are required', 'error');
      return;
    }
    const newId = `custom-${Date.now()}`;
    const customItem = {
      id: newId,
      loadId: `CUSTOM-${Date.now().toString().slice(-4)}`,
      from: newLoadForm.from.trim(),
      to: newLoadForm.to.trim(),
      material: newLoadForm.material.trim(),
      weight: newLoadForm.weight.trim(),
      vehicleType: newLoadForm.vehicleType.trim() || '32 FT Open Truck',
      freight: newLoadForm.freight.trim(),
      transporter_rate: newLoadForm.freight.trim(),
      contactNumber: newLoadForm.contactNumber.trim() || '9390003955 / 9390006942',
      isCustom: true,
    };

    setCustomLoads((prev) => [...prev, customItem]);
    setSelectedLoadIds((prev) => [...prev, newId]);
    setNewLoadForm({
      from: '',
      to: '',
      material: '',
      weight: '',
      vehicleType: '',
      freight: '',
      contactNumber: '9390003955 / 9390006942',
    });
    setShowNewLoadForm(false);
    showToast('✓ Added new load to message queue!');
  };

  // Draft Management Handlers
  const handleSaveDraft = async () => {
    const title = prompt('Enter a name for this draft plan:', `${planType === 'tomorrow' ? "Tomorrow's" : "Today's"} ${orderedLoads.length} Loads (${planDateString})`);
    if (!title) return;

    try {
      const payload = {
        title,
        planType,
        planDate: planDateString,
        greeting: greetingOption,
        language,
        selectedLoads: orderedLoads,
        messageText,
        settings: {
          separatorStyle,
          showFreight,
          showContact,
          showMaterial,
          showWeight,
          showVehicle,
          showDate,
          showPartyRate,
          customHeading,
          customClosing,
        },
      };
      await saveMessageDraft(payload);
      await loadDrafts();
      showToast('💾 Draft saved successfully!');
    } catch (e) {
      showToast('Failed to save draft: ' + e.message, 'error');
    }
  };

  const handleLoadDraft = (draftId) => {
    const found = drafts.find((d) => String(d.id) === String(draftId));
    if (!found) return;

    setPlanType(found.plan_type || 'today');
    setLanguage(found.language || 'en');
    setGreetingOption(found.greeting || 'auto');
    if (found.message_text) {
      setMessageText(found.message_text);
      setIsManualEdit(true);
    }
    if (found.settings) {
      const s = typeof found.settings === 'string' ? JSON.parse(found.settings) : found.settings;
      if (s.separatorStyle) setSeparatorStyle(s.separatorStyle);
      if (s.showFreight !== undefined) setShowFreight(s.showFreight);
      if (s.showContact !== undefined) setShowContact(s.showContact);
      if (s.showMaterial !== undefined) setShowMaterial(s.showMaterial);
      if (s.showWeight !== undefined) setShowWeight(s.showWeight);
      if (s.showVehicle !== undefined) setShowVehicle(s.showVehicle);
      if (s.showDate !== undefined) setShowDate(s.showDate);
      if (s.customHeading) setCustomHeading(s.customHeading);
      if (s.customClosing) setCustomClosing(s.customClosing);
    }

    // Restore loads
    const sLoads = Array.isArray(found.selected_loads) ? found.selected_loads : [];
    if (sLoads.length) {
      setCustomLoads(sLoads.filter((l) => l.isCustom));
      setSelectedLoadIds(sLoads.map((l) => String(l.id || l.loadId || l.load_id)));
    }
    showToast(`📂 Loaded draft: "${found.title}"`);
  };

  const handleDeleteDraft = async (id) => {
    if (!window.confirm('Delete this saved draft?')) return;
    try {
      await deleteMessageDraft(id);
      await loadDrafts();
      showToast('Draft removed');
    } catch (e) {
      showToast('Failed to delete draft', 'error');
    }
  };

  // Recipient Selection Logic
  const filteredContacts = useMemo(() => {
    const q = contactSearch.toLowerCase().trim();
    return contacts.filter((c) => {
      const matchSearch =
        !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.mobile || '').includes(q) ||
        (c.city || '').toLowerCase().includes(q);
      const matchVehicle =
        !filterVehicle ||
        (c.vehicle_type || '').toLowerCase().includes(filterVehicle.toLowerCase());
      const matchCity =
        !filterCity || (c.city || '').toLowerCase().includes(filterCity.toLowerCase());
      return matchSearch && matchVehicle && matchCity;
    });
  }, [contacts, contactSearch, filterVehicle, filterCity]);

  const uniqueCities = useMemo(() => Array.from(new Set(contacts.map((c) => c.city).filter(Boolean))), [contacts]);
  const uniqueVehicles = useMemo(() => Array.from(new Set(contacts.map((c) => c.vehicle_type).filter(Boolean))), [contacts]);

  const toggleSelectRecipient = (id) => {
    const idStr = String(id);
    setSelectedContactIds((prev) =>
      prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr]
    );
  };

  const selectAllFilteredRecipients = () => {
    const ids = filteredContacts.map((c) => String(c.id));
    setSelectedContactIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAllRecipients = () => {
    setSelectedContactIds([]);
  };

  // Broadcast Sending Handler
  const handleConfirmSend = async () => {
    let targets = [...selectedContactIds];
    if (directRecipients.trim()) {
      const parsedDirects = directRecipients
        .split(/[\s,]+/)
        .map((n) => n.trim())
        .filter(Boolean);
      targets = Array.from(new Set([...targets, ...parsedDirects]));
    }

    if (!targets.length) {
      showToast('Please select at least one contact or enter a mobile number', 'error');
      return;
    }

    if (!messageText.trim()) {
      showToast('Message text is empty!', 'error');
      return;
    }

    setShowConfirmModal(false);
    setIsSending(true);
    setSendProgress(20);

    try {
      setSendProgress(50);
      // Send as ONE combined message per recipient via existing API
      const res = await broadcast({
        contactIds: targets,
        message: messageText,
        type: 'text', // Custom formatted text message containing the multi-load plan
      });

      setSendProgress(100);
      const { sentCount = 0, failedCount = 0, failureReasons = [] } = res.data || {};

      if (failedCount > 0 && sentCount === 0) {
        const reasonText = failureReasons.length ? failureReasons.join('; ') : 'Meta WhatsApp API policy';
        showToast(
          `❌ Broadcast delivery failed (0 sent, ${failedCount} failed). Note: Free-form multi-load messages require contacts to be within the 24-hr customer service window. Reason: ${reasonText}`,
          'error'
        );
      } else if (failedCount > 0) {
        showToast(`⚠️ Delivered to ${sentCount} recipients, but ${failedCount} failed. Check Message History.`, 'warning');
      } else {
        showToast(`✅ Successfully dispatched combined message to all ${sentCount || targets.length} recipients!`);
      }
    } catch (err) {
      showToast(`❌ Failed to send broadcast: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setIsSending(false);
      setTimeout(() => setSendProgress(0), 2000);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(messageText);
    showToast('📋 Copied full WhatsApp message to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 max-w-xl flex items-start justify-between gap-3 rounded-xl border p-4 text-sm font-medium shadow-2xl backdrop-blur-md transition-all ${
            toast.type === 'error'
              ? 'border-rose-700/80 bg-rose-950/95 text-rose-200'
              : toast.type === 'warning'
              ? 'border-amber-700/80 bg-amber-950/95 text-amber-200'
              : 'border-emerald-700/80 bg-emerald-950/95 text-emerald-200'
          }`}
        >
          <div className="flex-1 leading-snug">{toast.msg}</div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white text-base leading-none p-1 shrink-0 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Mode Switcher */}
      <div className="rounded-2xl border border-cyan-800/60 bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950/40 p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 font-bold text-white shadow-lg shadow-cyan-500/30 text-xl">
              🚛
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Multi-Load WhatsApp Broadcast Builder
                <span className="rounded-full bg-cyan-950 border border-cyan-700 px-2.5 py-0.5 text-xs text-cyan-300 font-semibold">
                  {orderedLoads.length} Loads in Plan
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Combine multiple available loads into one professional WhatsApp broadcast with dynamic greetings & date plans.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveDraft}
              className="rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-1.5"
            >
              💾 Save Draft
            </button>

            {drafts.length > 0 && (
              <select
                onChange={(e) => e.target.value && handleLoadDraft(e.target.value)}
                defaultValue=""
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="" disabled>📂 Load Saved Draft...</option>
                {drafts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({new Date(d.updated_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setActiveTab('recipients')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'recipients'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                  : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              👥 Select Recipients ({selectedContactIds.length})
            </button>

            <button
              onClick={() => {
                if (selectedContactIds.length === 0 && !directRecipients.trim()) {
                  setActiveTab('recipients');
                  showToast('Please select recipients before broadcasting', 'warning');
                } else {
                  setShowConfirmModal(true);
                }
              }}
              disabled={orderedLoads.length === 0 || isSending}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-950 transition-all flex items-center gap-1.5"
            >
              🚀 Broadcast Message ({selectedContactIds.length})
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg bg-slate-800 border border-slate-700 p-2 text-xs text-slate-400 hover:text-white"
                title="Close Builder"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isSending && (
          <div className="mt-4 w-full rounded-full bg-slate-800 h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full transition-all duration-300 animate-pulse"
              style={{ width: `${sendProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Loads Picker & Queue (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Section: Queue / Ordered Selection */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <h3 className="text-sm font-semibold text-cyan-300 flex items-center gap-1.5">
                📋 Selected Loads in Plan ({orderedLoads.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewLoadForm(!showNewLoadForm)}
                  className="rounded bg-cyan-950 border border-cyan-800 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-900"
                >
                  {showNewLoadForm ? '✕ Cancel' : '+ Add Custom Load'}
                </button>
                {selectedLoadIds.length > 0 && (
                  <button
                    onClick={() => setSelectedLoadIds([])}
                    className="text-[11px] text-slate-400 hover:text-rose-400"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Custom Load Form Drawer */}
            {showNewLoadForm && (
              <form onSubmit={handleAddCustomLoad} className="mb-4 rounded-lg border border-cyan-900/70 bg-slate-950 p-3 space-y-2 text-xs">
                <p className="font-semibold text-cyan-300">Add Load on the Fly (Without DB duplication)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="From City *"
                    className="rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-white"
                    value={newLoadForm.from}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, from: e.target.value })}
                    required
                  />
                  <input
                    placeholder="To City *"
                    className="rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-white"
                    value={newLoadForm.to}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, to: e.target.value })}
                    required
                  />
                  <input
                    placeholder="Vehicle Type (e.g. 32 FT Open)"
                    className="rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-white"
                    value={newLoadForm.vehicleType}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, vehicleType: e.target.value })}
                  />
                  <input
                    placeholder="Weight (e.g. 15 MT)"
                    className="rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-white"
                    value={newLoadForm.weight}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, weight: e.target.value })}
                  />
                  <input
                    placeholder="Material (e.g. General Cargo)"
                    className="rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-white"
                    value={newLoadForm.material}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, material: e.target.value })}
                  />
                  <input
                    placeholder="Freight Rate (₹)"
                    className="rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-white"
                    value={newLoadForm.freight}
                    onChange={(e) => setNewLoadForm({ ...newLoadForm, freight: e.target.value })}
                  />
                </div>
                <input
                  placeholder="Contact Number(s)"
                  className="w-full rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-white"
                  value={newLoadForm.contactNumber}
                  onChange={(e) => setNewLoadForm({ ...newLoadForm, contactNumber: e.target.value })}
                />
                <button
                  type="submit"
                  className="w-full rounded bg-cyan-600 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500"
                >
                  + Add into Message Plan
                </button>
              </form>
            )}

            {/* Queue List with Reordering Controls */}
            {orderedLoads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                No loads in current plan. Select from existing saved loads below or click "+ Add Custom Load".
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {orderedLoads.map((load, idx) => {
                  const idStr = String(load.id || load.loadId || load.load_id);
                  return (
                    <div
                      key={idStr}
                      className="group flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-950 border border-cyan-800 font-bold text-[10px] text-cyan-300">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="font-semibold text-slate-100 truncate">
                            {load.from || load.from_city} → {load.to || load.to_city}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {load.vehicleType || load.vehicle_type || 'Truck'} · ₹{load.transporter_rate || load.freight || 'N/A'}
                            {load.isCustom && <span className="ml-1 text-[10px] text-amber-400 font-mono">[Custom]</span>}
                          </div>
                        </div>
                      </div>

                      {/* Reorder and Delete Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveLoad(idx, -1)}
                          disabled={idx === 0}
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-20"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveLoad(idx, 1)}
                          disabled={idx === orderedLoads.length - 1}
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-20"
                          title="Move Down"
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => removeLoad(idStr)}
                          className="rounded p-1 text-slate-500 hover:bg-rose-950 hover:text-rose-400 ml-1"
                          title="Remove from plan"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Saved Loads Catalog Checkboxes */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                📦 Saved Loads Catalog ({allLoads.length})
              </h4>
              <span className="text-[11px] text-slate-500">Check to add</span>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {allLoads.length === 0 ? (
                <p className="text-xs text-slate-500">No saved loads found.</p>
              ) : (
                allLoads.map((item) => {
                  const idStr = String(item.id || item.loadId || item.load_id);
                  const isChecked = selectedLoadIds.includes(idStr);
                  return (
                    <label
                      key={idStr}
                      className={`flex items-start gap-2.5 rounded-lg border p-2 text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'border-cyan-800/80 bg-cyan-950/30 text-white'
                          : 'border-slate-800/60 bg-slate-950/60 text-slate-300 hover:bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleLoadSelection(idStr)}
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-0"
                      />
                      <div className="flex-1 truncate">
                        <div className="font-medium truncate flex items-center justify-between">
                          <span>{item.from || item.from_city} → {item.to || item.to_city}</span>
                          <span className="text-[10px] font-mono text-cyan-400">#{item.loadId || item.id}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate flex items-center justify-between">
                          <span>{item.vehicleType || item.vehicle_type} · {item.weight || ''}</span>
                          <span className="font-semibold text-emerald-400">₹{item.transporter_rate || item.freight || '38000'}</span>
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Message Settings, Greeting & Language (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2">
              ⚙️ Greeting, Date Plan & Language
            </h3>

            {/* Plan Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                📅 Plan Schedule Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPlanType('today')}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    planType === 'today'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Today's Loads
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType('tomorrow')}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    planType === 'tomorrow'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Tomorrow's Plan
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType('custom')}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    planType === 'custom'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Custom Date
                </button>
              </div>

              {planType === 'custom' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              )}

              <div className="mt-2 flex items-center justify-between text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-900/60 rounded-lg p-2 font-mono">
                <span>Calculated Plan Date:</span>
                <span className="font-bold">{planDateString}</span>
              </div>
            </div>

            {/* Greeting Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  👋 Greeting (Indian Standard Time)
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">
                  IST Auto: "{getAutoISTGreeting(language)}"
                </span>
              </div>

              <select
                value={greetingOption}
                onChange={(e) => setGreetingOption(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="auto">Auto Select by IST (Current: {getAutoISTGreeting(language)})</option>
                <option value="Good Morning">Good Morning</option>
                <option value="Good Afternoon">Good Afternoon</option>
                <option value="Good Evening">Good Evening</option>
                <option value="Hello">Hello</option>
                <option value="custom">Manual / Custom Greeting...</option>
              </select>

              {greetingOption === 'custom' && (
                <input
                  placeholder="Type custom greeting..."
                  value={customGreeting}
                  onChange={(e) => setCustomGreeting(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              )}
            </div>

            {/* Language Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                🌐 Broadcast Message Language
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`rounded-lg py-1.5 text-xs font-medium ${
                    language === 'en'
                      ? 'bg-slate-700 text-white border border-slate-600'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('mr')}
                  className={`rounded-lg py-1.5 text-xs font-medium ${
                    language === 'mr'
                      ? 'bg-slate-700 text-white border border-slate-600'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  मराठी (Marathi)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('hi')}
                  className={`rounded-lg py-1.5 text-xs font-medium ${
                    language === 'hi'
                      ? 'bg-slate-700 text-white border border-slate-600'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  Hinglish
                </button>
              </div>
            </div>

            {/* Field Visibility Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-400">
                👁️ Field Visibility & Formatting Toggles
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFreight}
                    onChange={(e) => setShowFreight(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-0"
                  />
                  <span>Show Freight Rate</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showContact}
                    onChange={(e) => setShowContact(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-0"
                  />
                  <span>Show Contact Phone</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMaterial}
                    onChange={(e) => setShowMaterial(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-0"
                  />
                  <span>Show Material</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWeight}
                    onChange={(e) => setShowWeight(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-0"
                  />
                  <span>Show Weight</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVehicle}
                    onChange={(e) => setShowVehicle(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-0"
                  />
                  <span>Show Vehicle Type</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDate}
                    onChange={(e) => setShowDate(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-0"
                  />
                  <span>Show Plan Date</span>
                </label>
              </div>

              {/* Internal Commercial Rate Protection Warning */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="flex items-start gap-2 text-xs text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPartyRate}
                    onChange={(e) => setShowPartyRate(e.target.checked)}
                    className="mt-0.5 rounded text-amber-500 focus:ring-0"
                  />
                  <span>
                    Show Customer/Party Rate (Internal Commercial)
                    <span className="block text-[10px] text-slate-500">
                      ⚠️ Kept OFF by default to never expose internal margins to truck drivers.
                    </span>
                  </span>
                </label>
              </div>

              {/* Separators */}
              <div className="pt-2">
                <label className="block text-xs text-slate-400 mb-1">Load Separator Style</label>
                <select
                  value={separatorStyle}
                  onChange={(e) => setSeparatorStyle(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 p-1.5 text-xs text-slate-200"
                >
                  <option value="heavy">Heavy Line (━━━━━━━━━━━━━━)</option>
                  <option value="light">Light Line (──────────────)</option>
                  <option value="double">Double Line (══════════════)</option>
                  <option value="dash">Dashes (-------------------)</option>
                  <option value="none">None (Empty Line)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live WhatsApp Message Preview & Direct Manual Editor (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-base">💬</span>
                <h3 className="text-sm font-semibold text-white">Live WhatsApp Message Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="rounded bg-slate-800 border border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white"
                  title="Copy to clipboard"
                >
                  📋 Copy
                </button>
                {isManualEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualEdit(false);
                      showToast('Reverted to dynamic auto-formatting');
                    }}
                    className="rounded bg-indigo-950 border border-indigo-800 px-2 py-1 text-[11px] font-medium text-indigo-300 hover:bg-indigo-900"
                    title="Reset to auto generated"
                  >
                    ↺ Reset Auto
                  </button>
                )}
              </div>
            </div>

            {/* Direct Editable Textarea inside a stylized WhatsApp message card */}
            <div className="rounded-xl border border-emerald-950 bg-gradient-to-b from-[#0d141e] to-[#0a1017] p-3 text-xs font-mono text-slate-200 shadow-inner">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-[10px] text-slate-400">
                <span>Directly editable below:</span>
                <span>
                  {messageText.length} chars · {messageText.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>

              <textarea
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  setIsManualEdit(true);
                }}
                rows={16}
                className="w-full bg-transparent text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none resize-y leading-relaxed"
                placeholder="Message will be generated automatically based on selected loads..."
              />
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('recipients')}
                className="flex-1 rounded-lg bg-cyan-600 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-all flex items-center justify-center gap-1.5"
              >
                👥 Choose Recipients ({selectedContactIds.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedContactIds.length === 0 && !directRecipients.trim()) {
                    setActiveTab('recipients');
                    showToast('Select recipients first', 'warning');
                  } else {
                    setShowConfirmModal(true);
                  }
                }}
                disabled={orderedLoads.length === 0 || isSending}
                className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                🚀 Confirm & Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RECIPIENTS SELECTION DRAWER / MODAL TAB */}
      {activeTab === 'recipients' && (
        <div className="rounded-2xl border border-cyan-800/80 bg-slate-950 p-6 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                👥 Select Broadcast Recipients
                <span className="rounded-full bg-cyan-900 border border-cyan-700 px-3 py-0.5 text-xs text-cyan-200">
                  {selectedContactIds.length} Selected
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Choose contacts from your database (4,640 available), saved groups, or type phone numbers directly.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAllFilteredRecipients}
                className="rounded-lg bg-cyan-950 border border-cyan-800 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900"
              >
                Select All Filtered ({filteredContacts.length})
              </button>
              <button
                onClick={deselectAllRecipients}
                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setActiveTab('builder')}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                ✕ Back to Builder
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid gap-3 md:grid-cols-4">
            <input
              placeholder="Search by name, phone, city..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">-- Filter by Vehicle Type --</option>
              {uniqueVehicles.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">-- Filter by City --</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              placeholder="Direct numbers e.g. 919390003955, 919876543210"
              value={directRecipients}
              onChange={(e) => setDirectRecipients(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Quick Groups Selection */}
          {groups.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-slate-400 font-semibold">📁 Groups:</span>
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={async () => {
                    // add group members
                    try {
                      const res = await getGroupContacts(g.id);
                      const groupIds = (res.data || []).map((c) => String(c.id));
                      setSelectedContactIds((prev) => Array.from(new Set([...prev, ...groupIds])));
                      showToast(`Added members of "${g.name}" to recipients!`);
                    } catch (e) {}
                  }}
                  className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1 text-xs text-cyan-300 hover:bg-slate-800"
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}

          {/* Contacts Table View */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="p-3 w-10">Select</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Mobile</th>
                    <th className="p-3">Vehicle Type</th>
                    <th className="p-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {filteredContacts.slice(0, 100).map((c) => {
                    const isChecked = selectedContactIds.includes(String(c.id));
                    return (
                      <tr
                        key={c.id}
                        onClick={() => toggleSelectRecipient(c.id)}
                        className={`cursor-pointer transition-colors ${
                          isChecked ? 'bg-cyan-950/40 text-white' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectRecipient(c.id)}
                            className="rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-0"
                          />
                        </td>
                        <td className="p-3 font-semibold text-slate-100 font-sans">{c.name}</td>
                        <td className="p-3 text-cyan-400">{c.mobile}</td>
                        <td className="p-3 font-sans">{c.vehicle_type || '—'}</td>
                        <td className="p-3 font-sans text-slate-400">{c.city || c.state || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredContacts.length > 100 && (
              <div className="p-2.5 text-center text-xs text-slate-500 bg-slate-950 border-t border-slate-800">
                Showing first 100 of {filteredContacts.length} contacts matching filters. Use "Select All Filtered" to select all.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION SEND MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-cyan-800/80 bg-slate-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                🚀 Confirm Multi-Load Broadcast
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block">Total Loads in Plan:</span>
                  <span className="text-base font-bold text-cyan-400">{orderedLoads.length} Loads</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Target Recipients:</span>
                  <span className="text-base font-bold text-emerald-400">{selectedContactIds.length} Contacts</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Plan Date:</span>
                  <span className="font-semibold text-slate-200">{planDateString}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Message Delivery:</span>
                  <span className="font-semibold text-purple-300">1 Combined WhatsApp Message / Person</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Message Preview:</span>
                <pre className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
                  {messageText}
                </pre>
              </div>

              <div className="rounded-lg bg-cyan-950/60 border border-cyan-800/60 p-3 text-[11px] text-cyan-200">
                ℹ️ Each selected recipient will receive <strong>ONE single message</strong> containing all {orderedLoads.length} loads listed above. All dispatch events are logged in Message History.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-xl bg-slate-800 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={isSending}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-950"
              >
                {isSending ? 'Sending Broadcast...' : 'Yes, Send Broadcast Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
