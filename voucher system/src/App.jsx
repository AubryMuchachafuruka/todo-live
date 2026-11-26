import React, { useState, useEffect } from 'react';
import { Wifi, Shield, BookOpen, Smartphone } from 'lucide-react';
import CaptivePortalView from './components/CaptivePortalView.jsx';
import AdminDashboardView from './components/AdminDashboardView.jsx';
import RouterInstallGuideView from './components/RouterInstallGuideView.jsx';

export default function App() {
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    if (v === 'admin' || v === 'install' || v === 'portal') return v;
    return 'portal';
  });

  const [installPromptEvent, setInstallPromptEvent] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleTestTokenInPortal = async (code) => {
    // Automatically connect this voucher token and switch to the Captive Portal view
    try {
      const res = await fetch('/api/portal/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code }),
      });
      const data = await res.json();
      if (res.ok && data.session) {
        localStorage.setItem('netpulse_active_session_id', data.session.id);
      }
    } catch {
      // ignore
    }
    setActiveView('portal');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation Switcher (Switch between Customer Captive Portal, Admin App & Router Install Guide) */}
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-white tracking-tight leading-none">
                Manageable <span className="text-indigo-400">Tech</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                QR Voucher Portal • Strict GB/Time • Anti-VPN • Mobile Admin
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveView('portal')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeView === 'portal'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>User WiFi Sign-In</span>
            </button>

            <button
              onClick={() => setActiveView('admin')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeView === 'admin'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin App & Vouchers</span>
            </button>

            <button
              onClick={() => setActiveView('install')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeView === 'install'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Router Install / Uninstall</span>
            </button>
          </nav>

          {installPromptEvent && (
            <button
              onClick={async () => {
                installPromptEvent.prompt();
                await installPromptEvent.userChoice;
                setInstallPromptEvent(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Install Android App
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {activeView === 'portal' && (
          <CaptivePortalView onSwitchToAdmin={() => setActiveView('admin')} />
        )}
        {activeView === 'admin' && (
          <AdminDashboardView onTestTokenInPortal={handleTestTokenInPortal} />
        )}
        {activeView === 'install' && <RouterInstallGuideView />}
      </main>
    </div>
  );
}
