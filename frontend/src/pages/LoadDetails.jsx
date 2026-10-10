import { useState, useEffect } from 'react';
import {
  getTripWorkspace,
  updateDocumentVerificationStatus,
  acceptTransporterOffer,
  generateDocumentUploadLink,
  generateDriverActionLink,
  notifyParticipants,
} from '../services/api';

const STAGES = [
  'LOAD_CREATED',
  'RATE_CONFIRMED',
  'AT_PICKUP',
  'VEHICLE_LOADED',
  'IN_TRANSIT',
  'AT_DELIVERY',
  'DELIVERED',
  'CLOSED',
];

export default function LoadDetails({ loadId = 'CK-1025', onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('CK_OPERATIONS');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [generatedLinks, setGeneratedLinks] = useState({});

  useEffect(() => {
    fetchWorkspace();
  }, [loadId, role]);

  const fetchWorkspace = async () => {
    setLoading(true);
    try {
      const res = await getTripWorkspace(loadId, role);
      setData(res.data);
    } catch (err) {
      console.error('Error fetching trip workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleVerifyDoc = async (docId, status) => {
    try {
      await updateDocumentVerificationStatus(docId, {
        status,
        rejection_reason: status === 'NEEDS_REUPLOAD' ? rejectionReason : null,
        reviewer: 'CK Operations Staff',
      });
      setSelectedDocId(null);
      setRejectionReason('');
      showNotification(`✓ Document status updated to ${status}`);
      await fetchWorkspace();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update document status');
    }
  };

  const handleGenerateLinks = async () => {
    try {
      const [resDoc, resDriver] = await Promise.all([
        generateDocumentUploadLink(loadId),
        generateDriverActionLink(loadId),
      ]);
      setGeneratedLinks({
        docLink: resDoc.data.link,
        driverLink: resDriver.data.link,
        trackLink: `http://localhost:3000/portal/track/track_${loadId}`,
      });
      showNotification('✓ Mobile Portal links generated');
    } catch (err) {
      alert('Failed to generate links');
    }
  };

  const handleNotify = async (eventType) => {
    try {
      const res = await notifyParticipants({
        loadId,
        eventType,
        customNotes: `Update triggered for event: ${eventType}`,
      });
      showNotification(`✓ WhatsApp updates dispatched to ${res.data.count} participants`);
    } catch (err) {
      alert('Failed to dispatch notifications');
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 text-center text-slate-300">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Loading workspace for Load {loadId}...</p>
      </div>
    );
  }

  if (!data) return null;

  const { load = {}, documents = [], timeline = [] } = data;
  const currentStatus = load.status || 'LOAD_CREATED';
  const currentStageIdx = Math.max(0, STAGES.indexOf(currentStatus));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl space-y-6 antialiased">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">Load Workspace #{load.load_id || loadId}</h2>
            <span className="rounded-full bg-cyan-950 border border-cyan-700 px-3 py-1 text-xs font-bold text-cyan-300">
              {currentStatus}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Route: <strong className="text-white">{load.from_city || load.from} → {load.to_city || load.to}</strong> · Vehicle: <strong className="text-cyan-400">{load.vehicle_type}</strong> ({load.weight})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Role switcher preview */}
          <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span>View Role:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-transparent font-bold text-cyan-400 focus:outline-none"
            >
              <option value="CK_OPERATIONS">CK Operations (Full)</option>
              <option value="PARTY">Customer / Party View</option>
              <option value="TRANSPORTER">Truck Owner View</option>
              <option value="DRIVER">Driver View</option>
            </select>
          </div>

          {onClose && (
            <button onClick={onClose} className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white">
              ✕
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-emerald-700 bg-emerald-950/90 p-3 text-xs font-semibold text-emerald-300 text-center shadow-md animate-pulse">
          {statusMsg}
        </div>
      )}

      {/* Stage Progress Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Load Lifecycle Stage Progress
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {STAGES.map((st, idx) => {
            const isDone = idx <= currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            return (
              <div
                key={st}
                className={`rounded-lg p-2 text-center text-[10px] font-bold transition-all ${
                  isCurrent
                    ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400'
                    : isDone
                    ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                    : 'bg-slate-900 border border-slate-800 text-slate-600'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </div>
            );
          })}
        </div>
      </div>

      {/* Commercial Rates Widget (Protected by Role Privacy) */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          💰 Commercial Rates & Financial Privacy Summary
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          {load.party_rate !== undefined ? (
            <div className="rounded-xl border border-cyan-900/80 bg-cyan-950/40 p-3">
              <div className="text-[11px] text-cyan-400 font-medium">Billed Customer Rate (Party Rate)</div>
              <div className="text-xl font-bold text-white mt-1">₹{Number(load.party_rate).toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Billed to Customer / Invoice</div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-slate-500 text-xs italic">
              Customer Rate: Protected / Hidden for this Role
            </div>
          )}

          {load.transporter_rate !== undefined ? (
            <div className="rounded-xl border border-indigo-900/80 bg-indigo-950/40 p-3">
              <div className="text-[11px] text-indigo-400 font-medium">Agreed Transporter Rate</div>
              <div className="text-xl font-bold text-white mt-1">₹{Number(load.transporter_rate).toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Payable to Truck Owner</div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-slate-500 text-xs italic">
              Transporter Rate: Protected / Hidden for this Role
            </div>
          )}

          {load.ck_margin !== undefined ? (
            <div className="rounded-xl border border-emerald-900/80 bg-emerald-950/40 p-3">
              <div className="text-[11px] text-emerald-400 font-medium">CK Logistics Gross Margin</div>
              <div className="text-xl font-bold text-emerald-300 mt-1">₹{Number(load.ck_margin).toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">CK Commission / Profit Margin</div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-slate-500 text-xs italic">
              CK Margin: Internal Only
            </div>
          )}
        </div>
      </div>

      {/* PDF Document Generators & Mobile Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PDF Documents */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            📄 Automatic PDF Document Generators
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <a
              href={`http://localhost:5000/api/documents/${load.load_id || loadId}/loading-slip.html`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-cyan-800 bg-cyan-950/80 p-2.5 text-center font-semibold text-cyan-300 hover:bg-cyan-900"
            >
              📄 Loading Slip ↗
            </a>
            <a
              href={`http://localhost:5000/api/documents/${load.load_id || loadId}/customer-invoice.html`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-teal-800 bg-teal-950/80 p-2.5 text-center font-semibold text-teal-300 hover:bg-teal-900"
            >
              📄 Customer Invoice ↗
            </a>
            <a
              href={`http://localhost:5000/api/documents/${load.load_id || loadId}/transporter-settlement.html`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-indigo-800 bg-indigo-950/80 p-2.5 text-center font-semibold text-indigo-300 hover:bg-indigo-900"
            >
              📄 Transporter Settlement ↗
            </a>
            <a
              href={`http://localhost:5000/api/documents/${load.load_id || loadId}/commission-bill.html`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-purple-800 bg-purple-950/80 p-2.5 text-center font-semibold text-purple-300 hover:bg-purple-900"
            >
              📄 Margin Statement ↗
            </a>
          </div>
        </div>

        {/* Mobile Portal Links & WhatsApp Notifier */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-xs">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            📱 WhatsApp Mobile Portal Links & Notifier
          </h4>
          <button
            onClick={handleGenerateLinks}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 py-2 font-semibold text-white shadow-md"
          >
            Generate Mobile Upload & Driver Links 🚀
          </button>

          {generatedLinks.docLink && (
            <div className="space-y-1 bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono text-[11px] break-all">
              <div className="text-cyan-400 font-bold font-sans">Mobile Upload Link:</div>
              <a href={generatedLinks.docLink} target="_blank" rel="noreferrer" className="text-slate-300 underline">
                {generatedLinks.docLink}
              </a>
              <div className="text-cyan-400 font-bold font-sans mt-1">Driver Portal Link:</div>
              <a href={generatedLinks.driverLink} target="_blank" rel="noreferrer" className="text-slate-300 underline">
                {generatedLinks.driverLink}
              </a>
            </div>
          )}

          <div className="pt-1 flex gap-2">
            <button
              onClick={() => handleNotify(currentStatus)}
              className="flex-1 rounded-lg bg-emerald-950 border border-emerald-700 py-1.5 text-emerald-300 font-semibold hover:bg-emerald-900"
            >
              Broadcast WhatsApp Milestone Updates
            </button>
          </div>
        </div>
      </div>

      {/* Document Verification & Audit Section */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          📄 Document Verification Checklist ({documents.length})
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 uppercase text-slate-400 text-[10px]">
              <tr>
                <th className="p-2">Document</th>
                <th className="p-2">Uploaded By</th>
                <th className="p-2">Status</th>
                <th className="p-2">Rejection Reason</th>
                <th className="p-2 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {documents.map((d) => (
                <tr key={d.id}>
                  <td className="p-2 font-semibold text-white uppercase">{d.doc_type}</td>
                  <td className="p-2">{d.uploaded_by}</td>
                  <td className="p-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        d.verification_status === 'VERIFIED'
                          ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                          : d.verification_status === 'NEEDS_REUPLOAD'
                          ? 'bg-rose-950 border border-rose-700 text-rose-300'
                          : 'bg-cyan-950 border border-cyan-700 text-cyan-300'
                      }`}
                    >
                      {d.verification_status}
                    </span>
                  </td>
                  <td className="p-2 text-slate-400">{d.rejection_reason || '-'}</td>
                  <td className="p-2 text-right space-x-2">
                    <button
                      onClick={() => handleVerifyDoc(d.id, 'VERIFIED')}
                      className="rounded bg-emerald-900/60 border border-emerald-700 px-2 py-1 text-emerald-300 hover:bg-emerald-800"
                    >
                      ✓ Verify
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDocId(d.id);
                        const reason = prompt('Enter rejection / re-upload reason for WhatsApp alert:');
                        if (reason) {
                          setRejectionReason(reason);
                          handleVerifyDoc(d.id, 'NEEDS_REUPLOAD');
                        }
                      }}
                      className="rounded bg-rose-900/60 border border-rose-700 px-2 py-1 text-rose-300 hover:bg-rose-800"
                    >
                      ⚠️ Request Re-upload
                    </button>
                  </td>
                </tr>
              ))}
              {!documents.length && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">
                    No document uploads recorded for this load yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Activity Timeline Log */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          📜 Immutable Load Activity Timeline ({timeline.length})
        </h4>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 text-xs">
          {timeline.map((t, idx) => (
            <div key={t.id || idx} className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
              <div>
                <span className="font-semibold text-cyan-300">{t.action}</span>
                <span className="text-slate-400 ml-2">by {t.performed_by} ({t.user_role})</span>
                {t.details && <span className="text-slate-500 text-[11px] block">{t.details}</span>}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(t.created_at).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
          {!timeline.length && (
            <div className="text-slate-500 text-center p-2">Activity log initiated.</div>
          )}
        </div>
      </div>
    </div>
  );
}
