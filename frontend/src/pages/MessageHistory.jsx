import { useEffect, useMemo, useState } from 'react';
import { getLogs, getWebhookEvents, retryFailed } from '../services/api';

const getStatusBadge = (status = '') => {
  const s = String(status).toLowerCase();
  if (s.includes('read')) return <span className="rounded-full border border-amber-800 bg-amber-950/80 px-2.5 py-0.5 text-xs text-amber-300 font-medium">Read</span>;
  if (s.includes('deliver')) return <span className="rounded-full border border-emerald-800 bg-emerald-950/80 px-2.5 py-0.5 text-xs text-emerald-300 font-medium">Delivered</span>;
  if (s.includes('fail')) return <span className="rounded-full border border-rose-800 bg-rose-950/80 px-2.5 py-0.5 text-xs text-rose-300 font-medium">Failed</span>;
  if (s.includes('sent')) return <span className="rounded-full border border-cyan-800 bg-cyan-950/80 px-2.5 py-0.5 text-xs text-cyan-300 font-medium">Sent</span>;
  return <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">{status}</span>;
};

const extractFailureReason = (log) => {
  if (!log.response_data) return null;
  try {
    const parsed = typeof log.response_data === 'string' ? JSON.parse(log.response_data) : log.response_data;
    if (parsed.message) return parsed.message;
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.responseData?.error?.message) return parsed.responseData.error.message;
  } catch (e) {
    // ignore parse error
  }
  return null;
};

const MessageHistory = () => {
  const [logs, setLogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('outbound'); // 'outbound' | 'incoming'
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [retryingId, setRetryingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    try {
      const [logsRes, eventsRes] = await Promise.all([getLogs(), getWebhookEvents()]);
      setLogs(logsRes.data || []);
      setEvents(eventsRes.data || []);
    } catch (e) {
      // ignore transient error
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRetrySingle = async (id) => {
    setRetryingId(id);
    try {
      const res = await retryFailed({ id });
      if (res.data.results && res.data.results[0]?.error) {
        showToast(`❌ Retry Failed: ${res.data.results[0].message}`, 'error');
      } else {
        showToast('✅ Message retried successfully!');
      }
    } catch (error) {
      showToast(`Retry failed: ${error.message}`, 'error');
    } finally {
      setRetryingId(null);
      await loadData();
    }
  };

  const handleRetryAllFailed = async () => {
    try {
      const res = await retryFailed({});
      if (res.data.count === 0) {
        showToast('No failed messages found to retry');
      } else {
        showToast(`🔄 ${res.data.count || 0} failed messages queued for retry!`);
      }
      await loadData();
    } catch (error) {
      showToast(`Bulk retry failed: ${error.message}`, 'error');
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const mobileMatch = (log.mobile || '').includes(search);
      const messageMatch = (log.message || '').toLowerCase().includes(search.toLowerCase());
      const idMatch = (log.message_id || '').toLowerCase().includes(search.toLowerCase());
      const matchesSearch = mobileMatch || messageMatch || idMatch;

      if (!matchesSearch) return false;
      if (filterStatus === 'all') return true;

      const s = String(log.status || '').toLowerCase();
      if (filterStatus === 'sent') return s.includes('sent');
      if (filterStatus === 'delivered') return s.includes('deliver');
      if (filterStatus === 'read') return s.includes('read');
      if (filterStatus === 'failed') return s.includes('fail');
      return true;
    });
  }, [logs, search, filterStatus]);

  const incomingEvents = useMemo(() => {
    return events.filter((e) => {
      const isIncoming = e.event_type === 'incoming_message' || String(e.message || '').toLowerCase().includes('incoming');
      const mobileMatch = (e.identifier || '').includes(search);
      const msgMatch = (e.message || '').toLowerCase().includes(search.toLowerCase());
      return isIncoming && (mobileMatch || msgMatch);
    });
  }, [events, search]);

  const failedCount = useMemo(() => logs.filter((l) => String(l.status || '').toLowerCase().includes('fail')).length, [logs]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 space-y-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">WhatsApp Message History & Delivery Diagnostics</h2>
          <p className="text-sm text-slate-400">Real-time status tracking, Meta failure diagnostics, and customer incoming messages.</p>
        </div>
        {failedCount > 0 && (
          <button className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 shadow-md shadow-rose-950" onClick={handleRetryAllFailed}>
            Retry All Failed ({failedCount})
          </button>
        )}
      </div>

      {toast && (
        <div className={`rounded-lg border p-3.5 text-sm font-medium transition-all ${toast.type === 'error' ? 'border-rose-800 bg-rose-950/80 text-rose-300' : 'border-emerald-800 bg-emerald-950/80 text-emerald-300'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex border-b border-slate-800 gap-6 text-sm font-medium">
        <button
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'outbound' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveTab('outbound')}
        >
          Outbound Broadcast Messages ({logs.length})
        </button>
        <button
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'incoming' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          onClick={() => setActiveTab('incoming')}
        >
          Incoming Customer Replies ({incomingEvents.length})
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none"
          placeholder="Search by phone number, message text, or Meta wamid..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {activeTab === 'outbound' && (
          <select
            className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm focus:border-cyan-500 focus:outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Delivery Statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </select>
        )}
      </div>

      {activeTab === 'outbound' ? (
        <div className="overflow-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-slate-400">
                <th className="p-3.5">Recipient</th>
                <th className="p-3.5">Message Body</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Status & Failure Details</th>
                <th className="p-3.5">Meta Message ID</th>
                <th className="p-3.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-500">No outbound message logs match your search filter.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const failureReason = extractFailureReason(log);
                  const isFailed = String(log.status || '').toLowerCase().includes('fail');

                  return (
                    <tr key={log.id || log.created_at} className="border-t border-slate-800/80 hover:bg-slate-900/60 transition-colors">
                      <td className="p-3.5 font-medium text-slate-200">{log.mobile}</td>
                      <td className="p-3.5 text-slate-300 max-w-xs truncate">{log.message}</td>
                      <td className="p-3.5 text-slate-400 text-xs">{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                      <td className="p-3.5">
                        {getStatusBadge(log.status)}
                        {isFailed && failureReason && (
                          <div className="mt-1 text-xs text-rose-400 font-sans max-w-xs leading-tight" title={failureReason}>
                            ⚠️ {failureReason}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-slate-400 font-mono">{log.message_id || '—'}</td>
                      <td className="p-3.5">
                        {isFailed ? (
                          <button
                            disabled={retryingId === log.id}
                            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                            onClick={() => handleRetrySingle(log.id)}
                          >
                            {retryingId === log.id ? 'Retrying...' : 'Retry'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-slate-400">
                <th className="p-3.5">Customer Phone</th>
                <th className="p-3.5">Incoming Message</th>
                <th className="p-3.5">Received At</th>
                <th className="p-3.5">Event Type</th>
              </tr>
            </thead>
            <tbody>
              {incomingEvents.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-slate-500">No incoming customer replies received yet.</td>
                </tr>
              ) : (
                incomingEvents.map((evt) => (
                  <tr key={evt.id || evt.created_at} className="border-t border-slate-800/80 hover:bg-slate-900/60 transition-colors">
                    <td className="p-3.5 font-medium text-slate-200">{evt.identifier}</td>
                    <td className="p-3.5 text-slate-300">{evt.message}</td>
                    <td className="p-3.5 text-slate-400 text-xs">{evt.created_at ? new Date(evt.created_at).toLocaleString() : '—'}</td>
                    <td className="p-3.5">
                      <span className="rounded-full border border-purple-800 bg-purple-950/80 px-2.5 py-0.5 text-xs font-medium text-purple-300">
                        {evt.event_type}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MessageHistory;
