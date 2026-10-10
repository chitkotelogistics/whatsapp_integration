import { useState, useEffect, useRef } from 'react';
import { getInboxThreads, sendDirectReply, getLoadNegotiations, acceptTransporterOffer } from '../services/api';

export default function WhatsappInbox() {
  const [threads, setThreads] = useState([]);
  const [selectedMobile, setSelectedMobile] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [negotiations, setNegotiations] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 10000); // Polling inbox every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await getInboxThreads();
      const data = res.data || [];
      setThreads(data);

      if (!selectedMobile && data.length > 0) {
        setSelectedMobile(data[0].mobile);
      }
    } catch (err) {
      console.error('Failed to load inbox threads:', err);
    }
  };

  const currentThread = threads.find((t) => t.mobile === selectedMobile) || null;

  useEffect(() => {
    if (currentThread && currentThread.load_id) {
      fetchNegotiations(currentThread.load_id);
    } else {
      setNegotiations([]);
    }
    scrollToBottom();
  }, [selectedMobile, threads]);

  const fetchNegotiations = async (loadId) => {
    try {
      const res = await getLoadNegotiations(loadId);
      setNegotiations(res.data || []);
    } catch (err) {
      setNegotiations([]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMobile) return;

    setSending(true);
    try {
      await sendDirectReply({
        mobile: selectedMobile,
        message: replyText,
        loadId: currentThread?.load_id,
      });
      setReplyText('');
      showNotification('✓ Reply sent via WhatsApp');
      await fetchThreads();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send WhatsApp reply');
    } finally {
      setSending(false);
    }
  };

  const handleAcceptQuote = async (neg) => {
    if (!confirm(`Accept rate quote of ₹${neg.offered_rate} from ${neg.transporter_name}?`)) return;
    try {
      await acceptTransporterOffer(neg.load_id, {
        negotiationId: neg.id,
        transporter_id: neg.transporter_id,
        final_rate: neg.offered_rate,
      });
      showNotification(`✓ Rate of ₹${neg.offered_rate} accepted for ${neg.load_id}`);
      fetchThreads();
      if (currentThread?.load_id) fetchNegotiations(currentThread.load_id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept offer');
    }
  };

  const showNotification = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  return (
    <div className="space-y-4 antialiased">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            💬 2-Way WhatsApp Live Inbox
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time load conversations, transporter rate quotes, and direct messaging.
          </p>
        </div>

        {statusMsg && (
          <div className="rounded-lg bg-emerald-950/90 border border-emerald-700/60 px-4 py-2 text-sm text-emerald-300 shadow-md animate-pulse">
            {statusMsg}
          </div>
        )}
      </div>

      {/* Main Inbox Container */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 h-[calc(100vh-210px)] min-h-[550px]">
        {/* Left Sidebar: Threads List */}
        <div className="lg:col-span-4 flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/40 shadow-xl backdrop-blur-sm overflow-hidden">
          <div className="border-b border-slate-800 p-3.5 bg-slate-950/60 flex items-center justify-between">
            <span className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
              Conversations ({threads.length})
            </span>
            <button
              onClick={fetchThreads}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              🔄 Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
            {threads.map((t) => {
              const isSelected = t.mobile === selectedMobile;
              return (
                <div
                  key={t.mobile}
                  onClick={() => setSelectedMobile(t.mobile)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/60 border-l-4 border-cyan-500'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-white truncate max-w-[170px]">
                      {t.contact_name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {t.last_message_time ? new Date(t.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-cyan-400 font-medium">{t.mobile}</span>
                    {t.load_id && (
                      <span className="rounded bg-indigo-950/80 border border-indigo-700 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                        {t.load_id}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 truncate leading-snug">
                    {t.last_direction === 'OUTBOUND' ? ' You: ' : ''}
                    {t.last_message}
                  </div>
                </div>
              );
            })}

            {!threads.length && (
              <div className="p-8 text-center text-slate-500 text-sm">
                No active WhatsApp messages yet. Incoming messages will appear here automatically.
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Chat Thread & Quotes */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/40 shadow-xl backdrop-blur-sm overflow-hidden">
          {currentThread ? (
            <>
              {/* Chat Thread Header */}
              <div className="border-b border-slate-800 p-3.5 bg-slate-950/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">{currentThread.contact_name}</h3>
                    <span className="font-mono text-xs text-cyan-400">({currentThread.mobile})</span>
                  </div>
                  {currentThread.load_id && (
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>Linked Load:</span>
                      <span className="font-semibold text-indigo-400">{currentThread.load_id}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs">
                  <span className="rounded-full bg-emerald-950 border border-emerald-700 px-3 py-1 font-medium text-emerald-300">
                    🟢 Live WhatsApp Thread
                  </span>
                </div>
              </div>

              {/* Quotes Banner if any */}
              {negotiations.length > 0 && (
                <div className="border-b border-slate-800 bg-slate-950/90 p-3 space-y-2">
                  <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <span>💰 Transporter Quotes for Load {currentThread.load_id}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {negotiations.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 text-xs ${
                          n.status === 'ACCEPTED'
                            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                            : 'bg-slate-900 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white">₹{n.offered_rate?.toLocaleString('en-IN')}</div>
                          <div className="text-[10px] text-slate-400">{n.transporter_name}</div>
                        </div>
                        {n.status === 'ACCEPTED' ? (
                          <span className="rounded bg-emerald-800 px-2 py-0.5 text-[10px] font-bold text-white">
                            ✓ CONFIRMED
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAcceptQuote(n)}
                            className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm"
                          >
                            Accept Quote
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message History List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0e17]/50">
                {currentThread.messages
                  .slice()
                  .reverse()
                  .map((msg, index) => {
                    const isInbound = msg.direction === 'INBOUND';
                    return (
                      <div
                        key={msg.id || index}
                        className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                            isInbound
                              ? 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'
                              : 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-br-none shadow-cyan-600/20'
                          }`}
                        >
                          <div className="whitespace-pre-wrap leading-relaxed">{msg.message}</div>
                          <div className={`mt-1 text-[9px] text-right ${isInbound ? 'text-slate-400' : 'text-cyan-100/70'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="border-t border-slate-800 p-3 bg-slate-950/80 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type WhatsApp reply message..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30 hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send WhatsApp 🚀'}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-sm">
              Select a conversation thread from the list on the left to view messages and reply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
