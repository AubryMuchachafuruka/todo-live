import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  Gift,
  ShieldAlert,
  Clock,
  HardDrive,
  Smartphone,
  Bell,
  Sparkles,
  CheckCircle2,
  Zap,
  Lock,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Copy,
  ExternalLink,
  LogOut,
  Users,
  UserPlus,
} from 'lucide-react';

function formatMbOrGb(mb) {
  const num = Number(mb || 0);
  if (num <= 0) return '0 MB';
  if (num >= 1024) return `${(num / 1024).toFixed(2)} GB`;
  return `${Math.round(num)} MB`;
}

function formatCountdown(totalSec) {
  const s = Math.max(0, Math.floor(totalSec || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${sec}s`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

const SAMPLE_PHONE_MODELS = [
  'Samsung Galaxy S24',
  'iPhone 15',
  'Xiaomi Redmi Note 13',
  'TECNO Camon 30',
  'Infinix Note 40',
  'Windows 11 Laptop',
];

export default function CaptivePortalView({ onSwitchToAdmin }) {
  const [portalInfo, setPortalInfo] = useState(null);
  const [tokenInput, setTokenInput] = useState('');
  const [modelHint, setModelHint] = useState('');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [multiDevFeedback, setMultiDevFeedback] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [browserNotifGranted, setBrowserNotifGranted] = useState(
    typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false
  );
  const [copiedTopic, setCopiedTopic] = useState(false);
  const sseRef = useRef(null);

  const fetchPortalInfo = async () => {
    try {
      const res = await fetch('/api/portal/info');
      const data = await res.json();
      setPortalInfo(data);
    } catch {
      // ignore transient error
    }
  };

  useEffect(() => {
    fetchPortalInfo();
    const params = new URLSearchParams(window.location.search);
    const qrToken = params.get('token');
    if (qrToken) {
      setTokenInput(qrToken.toUpperCase());
      handleConnect(null, qrToken.toUpperCase());
      // Clean ?token= from URL so reload doesn't re-submit repeatedly
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const savedSessionId = localStorage.getItem('netpulse_active_session_id');
    if (savedSessionId) {
      fetch(`/api/portal/session/${savedSessionId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.session) setSession(data.session);
        })
        .catch(() => {});
    }
  }, []);

  // Poll + SSE live updates when a device session is active
  useEffect(() => {
    if (!session?.id) return;

    const refreshSession = async () => {
      try {
        const res = await fetch(`/api/portal/session/${session.id}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
        }
      } catch {
        // ignore
      }
    };

    const interval = setInterval(refreshSession, 2000);

    const es = new EventSource(`/api/events?role=client&sessionId=${session.id}`);
    sseRef.current = es;

    es.addEventListener('device_message', (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload?.message) {
          setToastMsg(payload.message);
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('WiFi Usage & Quota Alert', {
              body: payload.message.text,
            });
          }
          refreshSession();
        }
      } catch {
        // ignore
      }
    });

    return () => {
      clearInterval(interval);
      es.close();
    };
  }, [session?.id]);

  const requestFreePushPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setBrowserNotifGranted(perm === 'granted');
  };

  const handleConnect = async (e, overrideCode) => {
    if (e) e.preventDefault();
    const codeToUse = (overrideCode ?? tokenInput).trim();
    if (!codeToUse) {
      setError('Please enter your WiFi voucher token.');
      return;
    }
    setError('');
    setMultiDevFeedback(null);
    setLoading(true);
    try {
      await requestFreePushPermission().catch(() => {});
      const res = await fetch('/api/portal/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: codeToUse,
          customModelHint: modelHint.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to authenticate voucher');
      } else {
        localStorage.setItem('netpulse_active_session_id', data.session.id);
        setSession(data.session);
        if (data.session.messages?.[0]) {
          setToastMsg(data.session.messages[0]);
        }
        fetchPortalInfo();
      }
    } catch {
      setError('Network error reaching router controller.');
    } finally {
      setLoading(false);
    }
  };

  // Simulate another phone trying to join the exact same token (tests e.g. 2/3, 3/3 allowed, 4th strictly blocked!)
  const handleSimulateAnotherPhoneOnSameToken = async () => {
    if (!session?.voucherCode) return;
    setMultiDevFeedback(null);
    const randomPhone =
      SAMPLE_PHONE_MODELS[Math.floor(Math.random() * SAMPLE_PHONE_MODELS.length)];
    const res = await fetch('/api/portal/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: session.voucherCode,
        simulateNewDevice: true,
        customModelHint: randomPhone,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMultiDevFeedback({
        ok: false,
        text: data.error,
      });
    } else {
      setMultiDevFeedback({
        ok: true,
        text: `Connected extra device "${randomPhone}" (MAC ${data.session.mac})! Slots now used: ${data.session.boundDevicesCount} / ${data.session.maxDevices}.`,
      });
      // Refresh current session view so sibling devices list updates immediately
      const sRes = await fetch(`/api/portal/session/${session.id}`);
      if (sRes.ok) {
        const sData = await sRes.json();
        setSession(sData.session);
      }
    }
  };

  const runSimulation = async (action) => {
    if (!session?.id) return;
    const res = await fetch(`/api/portal/session/${session.id}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const data = await res.json();
      setSession(data.session);
    }
  };

  const leaveSessionView = () => {
    localStorage.removeItem('netpulse_active_session_id');
    setSession(null);
    setToastMsg(null);
    setMultiDevFeedback(null);
    fetchPortalInfo();
  };

  const companyName = portalInfo?.routerConfig?.companyName || 'Manageable Tech';
  const ssid = portalInfo?.routerConfig?.ssidName || 'MANAGEABLE_TECH_FREE_BONUS_WIFI';
  const bannerTitle =
    portalInfo?.routerConfig?.portalBannerTitle ||
    `${companyName} • FREE BONUS WiFi Hotspot`;
  const bannerSub =
    portalInfo?.routerConfig?.portalLureSubtext ||
    `Powered by ${companyName}: Get FREE bonus data & multi-device vouchers (up to 3 devices on 1 token). Scan your Voucher QR Code or enter token below.`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
      {/* Live Push Notification Toast Popup */}
      {toastMsg && (
        <div className="mb-6 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-indigo-500/15 to-slate-900 p-4 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200">
                    Live Router Push Message
                  </span>
                  <span className="text-xs text-slate-400">{toastMsg.channel}</span>
                </div>
                <p className="mt-1.5 text-sm sm:text-base font-medium text-white leading-snug">
                  {toastMsg.text}
                </p>
              </div>
            </div>
            <button
              onClick={() => setToastMsg(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800/70"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Router SSID Self-Advertising Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
            <Wifi className="w-4 h-4 animate-pulse" />
            <span>Broadcasting Open SSID: {ssid}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-400/30 text-rose-300 text-xs font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>
              Strict Anti-VPN Active (
              {portalInfo?.routerConfig?.vpnPolicy === 'disconnect'
                ? 'Instant Disconnect'
                : `Slows to ${portalInfo?.routerConfig?.throttleSpeedKbps || 64} Kbps`}
              )
            </span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <span>{bannerTitle}</span>
        </h1>
        <p className="mt-2 text-slate-300 text-sm sm:text-base max-w-2xl">{bannerSub}</p>

        {portalInfo?.detectedAudit && (
          <div className="mt-5 inline-flex flex-wrap items-center gap-2 text-xs text-slate-300 bg-slate-900/80 border border-slate-700/80 rounded-xl px-3.5 py-2">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span>Audited Device Detected:</span>
            <strong className="text-white">
              {portalInfo.detectedAudit.brand} {portalInfo.detectedAudit.model} (
              {portalInfo.detectedAudit.os} • {portalInfo.detectedAudit.browser})
            </strong>
            <span className="text-slate-500">• Per-Token Device Limit Enforced</span>
          </div>
        )}
      </div>

      {/* IF CONNECTED -> LIVE PHONE STATUS, MULTI-DEVICE SLOTS & QUOTA METER WIDGET */}
      {session ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {session.status === 'online' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      CONNECTED TO INTERNET
                    </span>
                  )}
                  {session.status === 'throttled_vpn' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      VPN DETECTED • SLOWED TO 64 KBPS
                    </span>
                  )}
                  {session.status.startsWith('disconnected') && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <Lock className="w-3.5 h-3.5" />
                      STRICT CUTOFF ({session.status.replace('disconnected_', '').toUpperCase()})
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                    <Users className="w-3.5 h-3.5" />
                    Devices Connected: {session.boundDevicesCount || 1} / {session.maxDevices || 1} Max
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-2">{session.planName}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Token: <strong className="font-mono text-indigo-300">{session.voucherCode}</strong> • This Device MAC:{' '}
                  <span className="font-mono text-slate-300">{session.mac}</span> • IP:{' '}
                  <span className="font-mono text-slate-300">{session.ip}</span>
                </p>
              </div>
              <button
                onClick={leaveSessionView}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Switch / Test Another Token
              </button>
            </div>

            {/* Strict GB & Time Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <HardDrive className="w-4 h-4 text-indigo-400" />
                    SHARED POOL DATA REMAINING
                  </span>
                  <span>Total: {formatMbOrGb(session.totalMb)}</span>
                </div>
                <div className="text-2xl font-extrabold text-white mt-1">
                  {formatMbOrGb(session.remainingMb)}
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full transition-all duration-500 ${
                      session.remainingMb <= 100
                        ? 'bg-rose-500'
                        : session.remainingMb <= 500
                        ? 'bg-amber-400'
                        : 'bg-indigo-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, (session.remainingMb / session.totalMb) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>Pool Used: {formatMbOrGb(session.usedMb)}</span>
                  <span>This Phone: {formatMbOrGb(session.deviceUsedMb)}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    STRICT TIME REMAINING
                  </span>
                  <span>Speed: {session.effectiveSpeedMbps} Mbps</span>
                </div>
                <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                  {formatCountdown(session.remainingSeconds)}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Live Throughput:{' '}
                    <strong className="text-emerald-300">{session.liveRateKbps} Kbps</strong>
                  </span>
                  <span className="text-slate-500">Exact Second Cutoff</span>
                </div>
              </div>
            </div>

            {/* Multi-Device Slot Monitor + Live Test Button (Verify e.g. 1 token -> 3 devices allowed, 4th blocked!) */}
            <div className="rounded-2xl border border-sky-500/30 bg-sky-950/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Per-Token Device Limit ({session.boundDevicesCount || 1} of{' '}
                    {session.maxDevices || 1} Device Slots Used)
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Up to <strong>{session.maxDevices || 1}</strong> distinct MAC addresses can share this token's GB & time pool. Any device beyond {session.maxDevices || 1} is strictly rejected!
                  </p>
                </div>

                <button
                  onClick={handleSimulateAnotherPhoneOnSameToken}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-bold transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Simulate Another Phone Joining This Token
                </button>
              </div>

              {multiDevFeedback && (
                <div
                  className={`mb-3 rounded-xl p-2.5 text-xs font-medium border ${
                    multiDevFeedback.ok
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {multiDevFeedback.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Array.from({ length: session.maxDevices || 1 }).map((_, idx) => {
                  const dev = session.siblingDevices?.[idx];
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl p-2.5 border text-xs ${
                        dev
                          ? 'bg-slate-950/90 border-slate-700 text-slate-200'
                          : 'bg-slate-950/40 border-dashed border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="font-bold text-[11px] text-indigo-300">
                        Slot {idx + 1} of {session.maxDevices || 1}
                      </div>
                      {dev ? (
                        <>
                          <div className="font-semibold text-white truncate mt-0.5">{dev.model}</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {dev.mac} • {formatMbOrGb(dev.deviceUsedMb)}
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] mt-1">Open Slot (Ready to Connect)</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Hardware Test Controls */}
            <div className="rounded-2xl border border-indigo-500/25 bg-indigo-950/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-2.5 flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Live Enforcement Simulator (Strict Cutoffs, 100MB Msg & Anti-VPN)
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => runSimulation('consume_500mb')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white border border-slate-700"
                >
                  +500 MB Data Used
                </button>
                <button
                  onClick={() => runSimulation('drop_to_95mb')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-xs font-medium text-amber-200 border border-amber-500/40"
                >
                  Jump to 95 MB Left (Trigger Auto Msg!)
                </button>
                <button
                  onClick={() => runSimulation('toggle_vpn')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                    session.vpnDetected
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-200 border-rose-500/40'
                  }`}
                >
                  {session.vpnDetected ? 'Turn VPN OFF (Restore Speed)' : 'Simulate Turning VPN ON'}
                </button>
                <button
                  onClick={() => runSimulation('exhaust_data')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-xs font-medium text-rose-300 border border-slate-700"
                >
                  Test 0 MB Strict Cutoff
                </button>
                <button
                  onClick={() => runSimulation('expire_time')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-xs font-medium text-rose-300 border border-slate-700"
                >
                  Test 0s Time Cutoff
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Free Push Notifications Inbox */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                Device Messages
              </h3>
              <button
                onClick={requestFreePushPermission}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                  browserNotifGranted
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                }`}
              >
                {browserNotifGranted ? 'Web Push Active' : 'Enable Push Alerts'}
              </button>
            </div>

            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 mb-4 text-xs">
              <div className="text-slate-400 mb-1">
                Free Background Phone Push Topic (<code className="text-indigo-300">ntfy.sh</code>):
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="text-emerald-300 font-mono truncate">{session.ntfyTopic}</code>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(session.ntfyTopic);
                      setCopiedTopic(true);
                      setTimeout(() => setCopiedTopic(false), 1500);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={`https://ntfy.sh/${session.ntfyTopic}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              {copiedTopic && (
                <div className="text-[11px] text-emerald-400 mt-1">Copied topic to clipboard!</div>
              )}
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-80 pr-1 flex-1">
              {(session.messages || []).map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-indigo-300 uppercase">{m.type}</span>
                    <span>
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* SIGN-IN PORTAL + LURING PACKAGES SHOWCASE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 rounded-3xl border border-indigo-500/30 bg-slate-900/95 p-6 sm:p-7 shadow-2xl h-fit">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
              <Lock className="w-3.5 h-3.5" />
              Captive Portal Sign-In
            </div>
            <h2 className="text-2xl font-bold text-white">Enter Voucher Token</h2>
            <p className="text-sm text-slate-400 mt-1">
              Enter your token code below. Multi-device tokens let you connect up to the allowed device limit (e.g. 3 phones/laptops on 1 token)!
            </p>

            <form onSubmit={handleConnect} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Voucher Token Code
                </label>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  placeholder="e.g. NP-3DEV-5GBX"
                  className="w-full rounded-2xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 px-4 py-3.5 text-lg font-mono tracking-widest text-white placeholder:text-slate-600 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Optional Phone Model Override (for testing Device Audit log)
                </label>
                <input
                  type="text"
                  value={modelHint}
                  onChange={(e) => setModelHint(e.target.value)}
                  placeholder="Auto-detected from your phone User-Agent"
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full animate-pulse-glow rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 px-5 flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Unlock Internet Now</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Quick 1-Click Ready Demo Tokens (Shows 1-Device, 2-Device & 3-Device Tokens!) */}
            {portalInfo?.sampleUnusedTokens?.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-800">
                <div className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center justify-between">
                  <span>Ready-to-Test Tokens (Includes 3-Device Token!):</span>
                  <button
                    type="button"
                    onClick={onSwitchToAdmin}
                    className="text-indigo-400 hover:underline"
                  >
                    Create More in Admin →
                  </button>
                </div>
                <div className="space-y-2">
                  {portalInfo.sampleUnusedTokens.map((t) => (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => {
                        setTokenInput(t.code);
                        handleConnect(null, t.code);
                      }}
                      className="w-full text-left rounded-xl border border-slate-800 hover:border-indigo-500/60 bg-slate-950/80 hover:bg-slate-900 p-2.5 transition flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-indigo-300">{t.code}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                            {t.boundCount}/{t.maxDevices} Devices Used
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">{t.planName}</div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-200 shrink-0">
                        Try Token
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 7 cols: Mixed & Luring WiFi Packages Board */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-400" />
                  WiFi Token Packages, Lure Bonuses & Multi-Device Limits
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Each token strictly enforces GB, Time, AND Maximum Connected Devices (1, 2, or 3+ devices)!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(portalInfo?.plans || []).map((plan) => {
                const baseGb = (plan.baseMb / 1024).toFixed(plan.baseMb % 1024 === 0 ? 0 : 1);
                const bonusGb =
                  plan.bonusMb >= 1024
                    ? `${(plan.bonusMb / 1024).toFixed(plan.bonusMb % 1024 === 0 ? 0 : 1)}GB`
                    : `${plan.bonusMb}MB`;
                const totalGb = ((plan.baseMb + plan.bonusMb) / 1024).toFixed(2).replace(/\.00$/, '');
                const durationLabel =
                  plan.durationHours >= 24 && plan.durationHours % 24 === 0
                    ? `${plan.durationHours / 24} Day${plan.durationHours / 24 > 1 ? 's' : ''}`
                    : `${plan.durationHours} Hours`;
                const maxDev = plan.maxDevices || 1;

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl p-5 border transition ${
                      plan.highlight
                        ? 'border-amber-400/50 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 shadow-lg shadow-amber-500/5'
                        : 'border-slate-800 bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          plan.highlight
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {plan.badge}
                      </span>
                      <span className="text-2xl font-black text-white">${plan.priceUsd}</span>
                    </div>

                    <h4 className="text-base font-bold text-white">{plan.name}</h4>

                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-indigo-300">{baseGb}GB</span>
                      {plan.bonusMb > 0 && (
                        <span className="inline-flex items-center gap-1 text-sm font-extrabold text-emerald-400">
                          <Sparkles className="w-3.5 h-3.5" />+ {bonusGb} FREE!
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <strong>{durationLabel}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-sky-300 font-semibold">
                        <Users className="w-3.5 h-3.5" />
                        Up to {maxDev} Device{maxDev > 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <strong>{totalGb} GB</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
