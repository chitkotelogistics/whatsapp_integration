import { useState, useEffect } from 'react';
import { useParams } from 'react';
import { getPortalDataByToken, uploadPortalDocument } from '../services/api';

const DOC_TYPE_LABELS = {
  rc: 'RC (Registration Certificate)',
  insurance: 'Insurance Policy',
  puc: 'PUC (Pollution Certificate)',
  driver_license: 'Driver License',
  permit: 'Permit Certificate',
  fitness: 'Fitness Certificate',
  pod: 'POD (Proof of Delivery)',
};

export default function MobileDocUpload() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadPortalData();
  }, [token]);

  const loadPortalData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPortalDataByToken(token);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired upload link');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (docType, file) => {
    if (!file) return;
    setUploadingDoc(docType);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      try {
        await uploadPortalDocument({
          token,
          doc_type: docType,
          file_url: base64Data,
        });
        setSuccessMsg(`✓ ${DOC_TYPE_LABELS[docType] || docType} uploaded successfully!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        await loadPortalData();
      } catch (err) {
        alert(err.response?.data?.error || 'Upload failed');
      } finally {
        setUploadingDoc(null);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4 text-slate-300 antialiased">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading document upload portal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4 text-slate-300 antialiased">
        <div className="max-w-md w-full rounded-2xl border border-rose-800/80 bg-rose-950/40 p-6 text-center shadow-xl">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-white mb-2">Upload Link Expired</h2>
          <p className="text-sm text-rose-300">{error || 'This document upload link is no longer valid.'}</p>
          <p className="text-xs text-slate-400 mt-4">Please contact Chitkote Logistics staff for a new upload link.</p>
        </div>
      </div>
    );
  }

  const { load, documents = [] } = data;
  const requiredMap = load.required_documents || {};

  const requiredDocKeys = Object.keys(requiredMap).filter((k) => requiredMap[k] === true);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 p-4 max-w-lg mx-auto antialiased">
      {/* Top Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl mb-4 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 font-bold text-white text-xl shadow-lg shadow-cyan-500/20 mb-2">
          CK
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Chitkote Logistics</h1>
        <p className="text-xs text-cyan-400 font-medium mt-0.5">Secure Document Upload Portal</p>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-left">
            <div className="text-slate-400">Load Reference</div>
            <div className="font-bold font-mono text-cyan-300 text-sm">{load.load_id}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">Route / Vehicle</div>
            <div className="font-semibold text-white">{load.pickup} → {load.delivery}</div>
            <div className="font-mono text-indigo-400 font-bold">{load.vehicle_number}</div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-700 bg-emerald-950/90 p-3 mb-4 text-center text-xs font-semibold text-emerald-300 shadow-md">
          {successMsg}
        </div>
      )}

      {/* Required Documents List */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Required Documents Checklist ({requiredDocKeys.length})
        </h2>

        {requiredDocKeys.map((docKey) => {
          const existingDoc = documents.find((d) => d.doc_type === docKey);
          const status = existingDoc ? existingDoc.verification_status : 'PENDING';
          const isNeedsReupload = status === 'NEEDS_REUPLOAD' || status === 'REJECTED';

          return (
            <div
              key={docKey}
              className={`rounded-2xl border p-4 shadow-lg transition-all ${
                status === 'VERIFIED'
                  ? 'border-emerald-800/80 bg-emerald-950/20'
                  : isNeedsReupload
                  ? 'border-rose-800/90 bg-rose-950/30'
                  : existingDoc
                  ? 'border-cyan-800/80 bg-cyan-950/20'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  📄 {DOC_TYPE_LABELS[docKey] || docKey.toUpperCase()}
                </span>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    status === 'VERIFIED'
                      ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                      : isNeedsReupload
                      ? 'bg-rose-950 border border-rose-700 text-rose-300'
                      : existingDoc
                      ? 'bg-cyan-950 border border-cyan-700 text-cyan-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {status === 'VERIFIED'
                    ? '✓ VERIFIED'
                    : isNeedsReupload
                    ? '⚠️ NEEDS RE-UPLOAD'
                    : existingDoc
                    ? '⏳ UPLOADED / UNDER REVIEW'
                    : 'PENDING UPLOAD'}
                </span>
              </div>

              {/* Rejection Alert Box */}
              {isNeedsReupload && existingDoc?.rejection_reason && (
                <div className="rounded-xl border border-rose-800/80 bg-rose-950/80 p-3 mb-3 text-xs text-rose-200">
                  <div className="font-bold mb-0.5">⚠️ Re-upload Required Reason:</div>
                  <div>"{existingDoc.rejection_reason}"</div>
                </div>
              )}

              {/* Upload Controls */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <label className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-700 bg-cyan-950/80 hover:bg-cyan-900 py-3 text-xs font-semibold text-cyan-200 cursor-pointer shadow-md">
                  📷 Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileUpload(docKey, e.target.files[0])}
                  />
                </label>

                <label className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 py-3 text-xs font-semibold text-slate-200 cursor-pointer shadow-md">
                  📁 Upload File / PDF
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(docKey, e.target.files[0])}
                  />
                </label>
              </div>

              {uploadingDoc === docKey && (
                <div className="mt-2 text-center text-xs text-cyan-400 animate-pulse font-medium">
                  Uploading document... Please wait...
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        Chitkote Logistics India Private Limited · Automated Logistics Platform
      </div>
    </div>
  );
}
