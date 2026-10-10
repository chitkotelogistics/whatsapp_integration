import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Broadcast from './pages/Broadcast';
import LoadPosting from './pages/LoadPosting';
import MessageHistory from './pages/MessageHistory';
import Contacts from './pages/Contacts';
import Masters from './pages/Masters';
import WhatsappInbox from './pages/WhatsappInbox';
import MobileDocUpload from './pages/MobileDocUpload';
import MobileDriverPortal from './pages/MobileDriverPortal';
import MobileCustomerTrack from './pages/MobileCustomerTrack';
import Login from './pages/Login';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const auth = localStorage.getItem('ck_auth');
    if (auth === null || auth === undefined) {
      localStorage.setItem('ck_auth', 'true');
      return true;
    }
    return auth === 'true';
  });

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('ck_auth');
    setIsAuthenticated(false);
  };

  const getNavClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium transition-all rounded-lg ${
      isActive
        ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm shadow-cyan-950'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    }`;

  // Public unauthenticated routes for drivers & transporters via WhatsApp links
  return (
    <Routes>
      <Route path="/portal/upload/:token" element={<MobileDocUpload />} />
      <Route path="/portal/driver/:token" element={<MobileDriverPortal />} />
      <Route path="/portal/track/:token" element={<MobileCustomerTrack />} />

      <Route
        path="*"
        element={

          !isAuthenticated ? (
            <div className="min-h-screen bg-[#0b0f17] text-slate-100 antialiased">
              <Login onLoginSuccess={handleLoginSuccess} />
            </div>
          ) : (
            <div className="min-h-screen bg-[#0b0f17] text-slate-100 antialiased">
              <nav className="sticky top-0 z-50 glass-nav">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 font-bold text-white shadow-lg shadow-cyan-500/20">
                      CK
                    </div>
                    <div>
                      <h1 className="text-lg font-bold leading-none tracking-tight text-white">Chitkote Logistics</h1>
                      <p className="mt-1 text-xs font-medium text-cyan-400/90">WhatsApp Business Cloud API v25.0</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <NavLink to="/" className={getNavClass} end>Dashboard</NavLink>
                    <NavLink to="/inbox" className={getNavClass}>WhatsApp Inbox 💬</NavLink>
                    <NavLink to="/loads" className={getNavClass}>Load Posting</NavLink>
                    <NavLink to="/multi-load" className={getNavClass}>Multi-Load Plan ✨</NavLink>
                    <NavLink to="/broadcast" className={getNavClass}>Broadcast Loads</NavLink>
                    <NavLink to="/masters" className={getNavClass}>Masters Hub</NavLink>
                    <NavLink to="/contacts" className={getNavClass}>Contacts</NavLink>
                    <NavLink to="/history" className={getNavClass}>Message History</NavLink>
                    <NavLink to="/settings" className={getNavClass}>Settings</NavLink>
                    <button
                      onClick={handleLogout}
                      className="ml-3 rounded-lg border border-rose-800/50 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 hover:text-white"
                    >
                      Logout 🚪
                    </button>
                  </div>
                </div>
              </nav>

              <main className="mx-auto max-w-7xl px-6 py-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/inbox" element={<WhatsappInbox />} />
                  <Route path="/loads" element={<LoadPosting />} />
                  <Route path="/multi-load" element={<LoadPosting defaultMultiLoad={true} />} />
                  <Route path="/broadcast" element={<Broadcast />} />
                  <Route path="/masters" element={<Masters />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/history" element={<MessageHistory />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
            </div>
          )
        }
      />
    </Routes>
  );
};

export default App;



