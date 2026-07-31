import { useState } from 'react';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (username.trim() === 'admin' && password === 'admin@003955') {
      localStorage.setItem('ck_auth', 'true');
      onLoginSuccess();
    } else {
      setError('Invalid Login ID or Password. Please try again.');
    }
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-cyan-800/40 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-xl font-bold text-white shadow-lg shadow-cyan-500/30">
            CK
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Chitkote Logistics</h2>
          <p className="mt-1 text-sm font-medium text-cyan-400">WhatsApp Business Admin Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-3.5 text-center text-sm font-medium text-rose-300 animate-pulse">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Login ID / Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="admin"
              className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-800/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-800/70 px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-cyan-400 hover:text-cyan-300"
              >
                {showPassword ? 'Hide 👁️' : 'Show 👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-600/30 transition-all hover:from-cyan-500 hover:to-indigo-500 hover:shadow-cyan-500/50 active:scale-[0.99]"
          >
            Sign In to Dashboard 🔒
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800 pt-4 text-center">
          <p className="text-xs text-slate-500">
            Chitkote Logistics India Pvt Ltd • Authorized Access Only
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
