import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../services/api';

const Settings = () => {
  const [form, setForm] = useState({
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    webhookVerifyToken: '',
  });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    getSettings()
      .then((res) => {
        setForm({
          phoneNumberId: res.data.phone_number_id || '',
          businessAccountId: res.data.business_account_id || '',
          accessToken: res.data.access_token || '',
          webhookVerifyToken: res.data.webhook_verify_token || '',
        });
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveSettings({
        phoneNumberId: form.phoneNumberId,
        businessAccountId: form.businessAccountId,
        accessToken: form.accessToken,
        webhookVerifyToken: form.webhookVerifyToken,
      });
      showToast('WhatsApp Cloud API configuration settings saved successfully!');
    } catch (error) {
      showToast(`Error saving settings: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = form.phoneNumberId && form.accessToken;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Meta WhatsApp Cloud API Settings</h2>
            <p className="text-sm text-slate-400">Configure your official Meta App credentials and Webhook tokens.</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${isConfigured ? 'border-emerald-800 bg-emerald-950/80 text-emerald-300' : 'border-amber-800 bg-amber-950/80 text-amber-300'}`}>
            {isConfigured ? '● Configured' : '○ Action Required'}
          </span>
        </div>

        {toast && (
          <div className={`mt-4 rounded-lg border p-3.5 text-sm font-medium transition-all ${toast.type === 'error' ? 'border-rose-800 bg-rose-950/80 text-rose-300' : 'border-emerald-800 bg-emerald-950/80 text-emerald-300'}`}>
            {toast.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">WhatsApp Phone Number ID *</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="e.g. 593847291048291"
              value={form.phoneNumberId}
              onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Business Account ID</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="e.g. 102938475610293"
              value={form.businessAccountId}
              onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Permanent Access Token *</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="EAAG..."
              value={form.accessToken}
              onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Webhook Verify Token</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="e.g. chitkote_webhook_secret_123"
              value={form.webhookVerifyToken}
              onChange={(e) => setForm({ ...form, webhookVerifyToken: e.target.value })}
            />
          </div>

          <div className="pt-2">
            <button
              disabled={loading}
              className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-cyan-500 disabled:opacity-50"
              type="submit"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
