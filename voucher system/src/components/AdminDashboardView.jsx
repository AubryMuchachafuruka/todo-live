import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Users,
  Ticket,
  ShieldAlert,
  DollarSign,
  Plus,
  Send,
  Smartphone,
  Laptop,
  Tablet,
  WifiOff,
  RefreshCw,
  Gift,
  Copy,
  Check,
  Settings,
  ClipboardList,
  Sparkles,
  Download,
  Trash2,
  BellRing,
  Activity,
  UserMinus,
  Printer,
  Layers,
  QrCode,
  X,
} from 'lucide-react';

function formatMb(mb) {
  const n = Number(mb || 0);
  if (n >= 1024) return `${(n / 1024).toFixed(2)} GB`;
  return `${Math.round(n)} MB`;
}

function formatDurationSec(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  if (s === 0) return '0m';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

function DeviceIcon({ type }) {
  if (type === 'Laptop') return <Laptop className="w-4 h-4 text-sky-400" />;
  if (type === 'Tablet') return <Tablet className="w-4 h-4 text-purple-400" />;
  return <Smartphone className="w-4 h-4 text-indigo-400" />;
}

export default function AdminDashboardView({ onTestTokenInPortal }) {
  const [data, setData] = useState(null);
  const [subTab, setSubTab] = useState('devices'); // 'devices' | 'vouchers' | 'plans' | 'audit' | 'settings'
  const [copiedCode, setCopiedCode] = useState('');
  const [msgModalSession, setMsgModalSession] = useState(null);
  const [customMsgText, setCustomMsgText] = useState('');
  const [statusFeedback, setStatusFeedback] = useState('');

  // Voucher creation state (including Max Devices per Token, e.g. 1, 2, 3, 5!)
  const [genMode, setGenMode] = useState('preset'); // 'preset' | 'custom'
  const [selectedPlanId, setSelectedPlanId] = useState('plan-heavy-2d');
  const [genQty, setGenQty] = useState(3);
  const [genPrefix, setGenPrefix] = useState('MT');
  const [genMaxDevicesOverride, setGenMaxDevicesOverride] = useState(''); // optional override on preset
  const [customPrice, setCustomPrice] = useState(2);
  const [customBaseGb, setCustomBaseGb] = useState(5);
  const [customBonusGb, setCustomBonusGb] = useState(1);
  const [customHours, setCustomHours] = useState(48);
  const [customMaxDevices, setCustomMaxDevices] = useState(3);
  const [genNotes, setGenNotes] = useState('');
  const [newlyCreated, setNewlyCreated] = useState([]);
  const [lastBatchId, setLastBatchId] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');

  // QR Code Modal & Cache State (1 QR code generated per voucher!)
  const [qrModalVoucher, setQrModalVoucher] = useState(null);
  const [qrDataUrlMap, setQrDataUrlMap] = useState({});

  // New Luring Plan state
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState(2);
  const [newPlanBaseGb, setNewPlanBaseGb] = useState(3);
  const [newPlanBonusGb, setNewPlanBonusGb] = useState(1);
  const [newPlanHours, setNewPlanHours] = useState(48);
  const [newPlanMaxDevices, setNewPlanMaxDevices] = useState(3);
  const [newPlanBadge, setNewPlanBadge] = useState('LURE DEAL • 3 DEVICES!');

  // Settings form
  const [companyNameInput, setCompanyNameInput] = useState('Manageable Tech');
  const [ssidInput, setSsidInput] = useState('');
  const [bannerTitleInput, setBannerTitleInput] = useState('');
  const [vpnPolicyInput, setVpnPolicyInput] = useState('throttle');
  const [throttleKbpsInput, setThrottleKbpsInput] = useState(64);
  const [lowAlertMbInput, setLowAlertMbInput] = useState(100);
  const [simEnabled, setSimEnabled] = useState(true);

  const loadOverview = async (syncSettings = false) => {
    try {
      const res = await fetch('/api/admin/overview');
      const json = await res.json();
      setData(json);
      if (syncSettings && json.routerConfig) {
        setCompanyNameInput(json.routerConfig.companyName || 'Manageable Tech');
        setSsidInput(json.routerConfig.ssidName);
        setBannerTitleInput(json.routerConfig.portalBannerTitle);
        setVpnPolicyInput(json.routerConfig.vpnPolicy);
        setThrottleKbpsInput(json.routerConfig.throttleSpeedKbps);
        setLowAlertMbInput(json.routerConfig.lowDataAlertMb);
        setSimEnabled(Boolean(json.routerConfig.backgroundTrafficSim));
      }
    } catch {
      // ignore transient
    }
  };

  useEffect(() => {
    loadOverview(true);
    const interval = setInterval(() => loadOverview(false), 2500);
    return () => clearInterval(interval);
  }, []);

  const flashFeedback = (txt) => {
    setStatusFeedback(txt);
    setTimeout(() => setStatusFeedback(''), 3800);
  };

  const handleGenerateVouchers = async (e) => {
    e.preventDefault();
    const payload =
      genMode === 'preset'
        ? {
            planId: selectedPlanId,
            quantity: genQty,
            prefix: genPrefix,
            maxDevices: genMaxDevicesOverride ? Number(genMaxDevicesOverride) : undefined,
            notes: genNotes,
          }
        : {
            quantity: genQty,
            prefix: genPrefix,
            priceUsd: Number(customPrice),
            baseMb: Math.round(Number(customBaseGb) * 1024),
            bonusMb: Math.round(Number(customBonusGb) * 1024),
            durationHours: Number(customHours),
            maxDevices: Number(customMaxDevices),
            notes: genNotes,
          };

    const res = await fetch('/api/admin/vouchers/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.created) {
      setNewlyCreated(json.created);
      if (json.batchId) setLastBatchId(json.batchId);
      flashFeedback(
        `Bulk Generated ${json.created.length} voucher(s) [${json.batchId || 'Batch'}] • Max ${json.created[0]?.maxDevices || 1} Device(s) per token!`
      );
      loadOverview(false);
    }
  };

  // Build instant auto-login URL encoded inside each voucher's QR Code
  const getPortalQrUrl = (code) =>
    `${window.location.origin}/?view=portal&token=${encodeURIComponent(code)}`;

  // Generate QR Data URLs in background for visible vouchers so thumbnails & modals render instantaneously
  useEffect(() => {
    if (!data?.vouchers?.length) return;
    let cancelled = false;
    const generateMissing = async () => {
      const updates = {};
      const slice = data.vouchers.slice(0, 60);
      for (const v of slice) {
        if (!qrDataUrlMap[v.code]) {
          try {
            updates[v.code] = await QRCode.toDataURL(getPortalQrUrl(v.code), {
              width: 240,
              margin: 1,
              color: { dark: '#0f172a', light: '#ffffff' },
            });
          } catch {
            // ignore
          }
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setQrDataUrlMap((prev) => ({ ...prev, ...updates }));
      }
    };
    generateMissing();
    return () => {
      cancelled = true;
    };
  }, [data?.vouchers]);

  // Open clean printable A4/Thermal Voucher Slips Sheet WITH Manageable Tech Branding & Individual QR Codes!
  const handlePrintVoucherSlips = async (voucherList, title = 'Manageable Tech — WiFi QR Voucher Slips') => {
    if (!voucherList || voucherList.length === 0) return;
    const company = data?.routerConfig?.companyName || 'Manageable Tech';
    const ssid = data?.routerConfig?.ssidName || 'MANAGEABLE_TECH_FREE_BONUS_WIFI';
    const win = window.open('', '_blank', 'width=960,height=760');
    if (!win) {
      flashFeedback('Please allow pop-ups in your browser to open Printable QR Voucher Slips.');
      return;
    }

    // Generate crisp QR Data URLs for every voucher in the print batch (even 500 vouchers!)
    const slipsWithQr = await Promise.all(
      voucherList.map(async (v) => {
        const qrImg =
          qrDataUrlMap[v.code] ||
          (await QRCode.toDataURL(getPortalQrUrl(v.code), {
            width: 220,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
          }));
        return { ...v, qrImg };
      })
    );

    const cardsHtml = slipsWithQr
      .map((v) => {
        const hrs = Math.round(v.durationSeconds / 3600);
        const dur = hrs >= 24 && hrs % 24 === 0 ? `${hrs / 24} Days` : `${hrs} Hours`;
        const totalGb = (v.totalMb / 1024).toFixed(2).replace(/\.00$/, '');
        return `<div class="slip">
          <div class="brand-bar">
            <span class="company">${company}</span>
            <span class="price">$${v.priceUsd}</span>
          </div>
          <div class="body-row">
            <img class="qr" src="${v.qrImg}" alt="QR ${v.code}" />
            <div class="info">
              <div class="ssid">WiFi: ${ssid}</div>
              <div class="plan">${v.planName}</div>
              <div class="code">${v.code}</div>
              <div class="meta"><b>${totalGb} GB</b> &bull; <b>${dur}</b> &bull; Max <b>${v.maxDevices || 1} Dev</b></div>
            </div>
          </div>
          <div class="foot">Scan QR with phone camera to auto-connect &bull; Strict Quota &bull; No VPN</div>
        </div>`;
      })
      .join('');

    win.document.write(`<!doctype html><html><head><title>${company} - ${title}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 16px; color: #0f172a; }
        .top { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        .grid { display:grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .slip { border: 1.5px dashed #334155; border-radius: 12px; padding: 10px 12px; page-break-inside: avoid; background: #fff; }
        .brand-bar { display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px; }
        .company { font-size: 13px; font-weight: 900; color: #312e81; letter-spacing: 0.4px; text-transform: uppercase; }
        .price { font-size: 14px; font-weight: 900; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 999px; }
        .body-row { display:flex; align-items:center; gap: 10px; }
        .qr { width: 86px; height: 86px; border: 1px solid #cbd5e1; border-radius: 8px; flex-shrink: 0; }
        .info { flex: 1; min-width: 0; }
        .ssid { font-size: 10px; font-weight: 700; color: #4f46e5; }
        .plan { font-size: 11px; font-weight: 600; margin-top: 2px; color: #1e293b; }
        .code { font-family: monospace; font-size: 16px; font-weight: 900; letter-spacing: 1.2px; margin: 5px 0; padding: 4px 6px; background: #f1f5f9; border-radius: 6px; text-align: center; }
        .meta { font-size: 10px; color: #334155; }
        .foot { font-size: 9px; color: #64748b; margin-top: 6px; text-align: center; border-top: 1px dotted #e2e8f0; padding-top: 4px; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <div class="top no-print">
        <div><b style="font-size:16px;">${company}</b> — ${title} (${voucherList.length} QR Vouchers)</div>
        <button onclick="window.print()" style="padding:8px 16px;background:#4f46e5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Print QR Slips / Save PDF</button>
      </div>
      <div class="grid">${cardsHtml}</div>
      </body></html>`);
    win.document.close();
  };

  const handleBulkRevokeBatch = async (batchId) => {
    if (!batchId || batchId === 'all') return;
    const res = await fetch(`/api/admin/vouchers/batch/${batchId}/revoke`, { method: 'POST' });
    if (res.ok) {
      const json = await res.json();
      flashFeedback(`Bulk revoked ${json.revokedCount} voucher(s) in ${batchId}.`);
      loadOverview(false);
    }
  };

  const handleUpdateVoucherMaxDevices = async (voucherId, newMax) => {
    if (newMax < 1) return;
    await fetch(`/api/admin/vouchers/${voucherId}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxDevices: newMax }),
    });
    flashFeedback(`Updated per-token device connection limit to ${newMax} device(s)!`);
    loadOverview(false);
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    const res = await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newPlanName.trim(),
        priceUsd: Number(newPlanPrice),
        baseGb: Number(newPlanBaseGb),
        bonusGb: Number(newPlanBonusGb),
        durationHours: Number(newPlanHours),
        maxDevices: Number(newPlanMaxDevices),
        badge: newPlanBadge,
      }),
    });
    if (res.ok) {
      setNewPlanName('');
      flashFeedback('Added new package (with strict per-token device limit) to Sign-In Portal!');
      loadOverview(false);
    }
  };

  const handleDeviceAction = async (sessionId, action) => {
    const res = await fetch(`/api/admin/sessions/${sessionId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json();
      flashFeedback(err.error || 'Action failed');
    } else {
      flashFeedback(`Applied "${action}" on connected device.`);
    }
    loadOverview(false);
  };

  const handleSendUsageMessage = async (sessionId, customText = null) => {
    await fetch(`/api/admin/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customText }),
    });
    setMsgModalSession(null);
    setCustomMsgText('');
    flashFeedback('Live remaining GB & Hours message pushed to device via Free SSE + Web Push + ntfy.sh!');
    loadOverview(false);
  };

  const handleRevokeVoucher = async (id) => {
    await fetch(`/api/admin/vouchers/${id}/revoke`, { method: 'POST' });
    flashFeedback('Voucher revoked & all bound devices disconnected.');
    loadOverview(false);
  };

  const handleSaveRouterConfig = async (e) => {
    e.preventDefault();
    await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: companyNameInput.trim() || 'Manageable Tech',
        ssidName: ssidInput,
        portalBannerTitle: bannerTitleInput,
        vpnPolicy: vpnPolicyInput,
        throttleSpeedKbps: Number(throttleKbpsInput),
        lowDataAlertMb: Number(lowAlertMbInput),
        backgroundTrafficSim: simEnabled,
      }),
    });
    flashFeedback('Saved Company Branding, Router SSID, Strict Quota & Anti-VPN settings!');
    loadOverview(true);
  };

  const copyToken = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 1500);
  };

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        Loading Router Controller & Live Device Telemetry...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20">
      {/* Android / Web Remote Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>REMOTE WEB + ANDROID PWA ADMIN CONSOLE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Router Token, Multi-Device Limits, Quota & Audit Control
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSendUsageMessage('broadcast-all')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold transition"
          >
            <BellRing className="w-4 h-4" />
            Push Remaining GB/Hrs to All Phones
          </button>
          <button
            onClick={async () => {
              await fetch('/api/admin/reset-demo', { method: 'POST' });
              loadOverview(true);
              flashFeedback('Reset demo devices & multi-device tokens.');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Demo Data
          </button>
        </div>
      </div>

      {statusFeedback && (
        <div className="mb-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-xs sm:text-sm text-emerald-200 font-medium">
          {statusFeedback}
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Connected Devices</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">
            {data.stats.activeDevices}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Strict Per-Token Device Cap Active
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ready Unused Tokens</span>
            <Ticket className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">
            {data.stats.unusedVouchers}{' '}
            <span className="text-sm font-normal text-slate-500">/ {data.stats.totalVouchers}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">1, 2, 3+ Device Limits Supported</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Anti-VPN Triggers</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-300 mt-1">
            {data.stats.vpnFlaggedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Policy: {data.routerConfig.vpnPolicy === 'disconnect' ? 'Kick Device' : 'Slow to 64Kbps'}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Voucher Revenue / Data</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">
            ${data.stats.totalRevenueUsd}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {data.stats.totalDataUsedGb} GB accounted on LAN
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 mb-6 border-b border-slate-800">
        {[
          { id: 'devices', label: `Connected Phones (${data.sessions.length})`, icon: Smartphone },
          { id: 'vouchers', label: `Vouchers & Device Limits (${data.vouchers.length})`, icon: Ticket },
          { id: 'plans', label: 'Mixed & Luring Packages', icon: Gift },
          { id: 'audit', label: 'Phone Audit & Security Logs', icon: ClipboardList },
          { id: 'settings', label: 'Router SSID & Anti-VPN Rules', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CONNECTED DEVICES, MULTI-DEVICE SLOT USAGE, REMAINING TIME/GB & FREE PUSH */}
      {subTab === 'devices' && (
        <div className="space-y-4">
          {data.sessions.map((s) => {
            const pctLeft = Math.max(0, Math.min(100, (s.remainingMb / s.totalMb) * 100));
            return (
              <div
                key={s.id}
                className={`rounded-2xl border p-5 transition ${
                  s.vpnDetected
                    ? 'border-amber-500/50 bg-amber-950/10'
                    : s.status === 'online'
                    ? 'border-slate-800 bg-slate-900/90'
                    : 'border-rose-500/30 bg-slate-900/50 opacity-85'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <DeviceIcon type={s.deviceAudit?.deviceType} />
                      <span className="font-bold text-white text-base">
                        {s.deviceAudit?.brand} {s.deviceAudit?.model}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {s.deviceAudit?.os} • {s.deviceAudit?.browser}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                        Token Slots: {s.boundDevicesCount}/{s.maxDevices} Devices
                      </span>
                      {s.status === 'online' && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          ONLINE ({s.liveRateKbps} Kbps)
                        </span>
                      )}
                      {s.status === 'throttled_vpn' && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-200">
                          VPN DETECTED ({s.vpnProtocol}) • SLOWED 64 KBPS
                        </span>
                      )}
                      {s.status.startsWith('disconnected') && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/25 text-rose-300 uppercase">
                          {s.status.replace('_', ': ')}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Token: <strong className="font-mono text-indigo-300">{s.voucherCode}</strong> ({s.planName})
                      </span>
                      <span>
                        MAC: <code className="text-slate-300">{s.mac}</code>
                      </span>
                      <span>
                        This Device Used: <strong className="text-slate-200">{formatMb(s.deviceUsedMb)}</strong>
                      </span>
                      <span>
                        Connected:{' '}
                        <strong className="text-slate-200">
                          {new Date(s.connectedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Strict Time & Shared Pool GB Remaining Meters */}
                  <div className="grid grid-cols-2 gap-3 min-w-[270px] sm:min-w-[320px]">
                    <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        Shared Pool Left
                      </div>
                      <div
                        className={`text-base font-extrabold mt-0.5 ${
                          s.remainingMb <= 100 ? 'text-rose-400' : 'text-white'
                        }`}
                      >
                        {formatMb(s.remainingMb)}{' '}
                        <span className="text-[11px] font-normal text-slate-500">
                          / {formatMb(s.totalMb)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full ${
                            s.remainingMb <= 100 ? 'bg-rose-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${pctLeft}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        Time Remaining
                      </div>
                      <div className="text-base font-extrabold text-emerald-300 font-mono mt-0.5">
                        {formatDurationSec(s.remainingSeconds)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        push: <code>{s.ntfyTopic}</code>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Actions Bar per Device */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 truncate max-w-lg">
                    Latest Msg:{' '}
                    <span className="text-slate-300 italic">
                      "{s.messages?.[0]?.text || 'No alerts sent yet'}"
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSendUsageMessage(s.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 text-xs font-semibold"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Remaining Hrs/GB Msg
                    </button>

                    <button
                      onClick={() => {
                        const connStr = new Date(s.connectedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        setMsgModalSession(s);
                        setCustomMsgText(
                          `Note: Connected at ${connStr} | Remaining Data: ${formatMb(
                            s.remainingMb
                          )} | Remaining Time: ${formatDurationSec(
                            s.remainingSeconds
                          )}. Thank you, please come again!`
                        );
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                    >
                      Custom Msg
                    </button>

                    <button
                      onClick={() => handleDeviceAction(s.id, 'gift_500mb')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      +500MB Bonus
                    </button>

                    <button
                      onClick={() => handleDeviceAction(s.id, 'release_slot')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-medium"
                      title="Disconnects this phone AND frees its slot on the voucher so another phone can join"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      Free Device Slot
                    </button>

                    {s.status === 'online' || s.status === 'throttled_vpn' ? (
                      <button
                        onClick={() => handleDeviceAction(s.id, 'disconnect')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold"
                      >
                        <WifiOff className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeviceAction(s.id, 'reconnect')}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                      >
                        Restore Access
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: VOUCHER GENERATOR (WITH MAX DEVICES PER TOKEN) & TOKEN INVENTORY */}
      {subTab === 'vouchers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 h-fit">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-indigo-400" />
              Generate Vouchers (With Device Limit per Token)
            </h3>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setGenMode('preset')}
                className={`py-2 rounded-lg transition ${
                  genMode === 'preset' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                From Package Plan
              </button>
              <button
                type="button"
                onClick={() => setGenMode('custom')}
                className={`py-2 rounded-lg transition ${
                  genMode === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Custom GB / Days / Devices
              </button>
            </div>

            <form onSubmit={handleGenerateVouchers} className="space-y-4 text-xs">
              {genMode === 'preset' ? (
                <>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">
                      Select Mixed or Luring Package
                    </label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white text-sm"
                    >
                      {data.plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.tagline}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sky-300 font-semibold mb-1">
                      Override Max Devices per Token (Optional — e.g. 3 Devices)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="25"
                      value={genMaxDevicesOverride}
                      onChange={(e) => setGenMaxDevicesOverride(e.target.value)}
                      placeholder="Leave blank to use package default (or enter e.g. 3)"
                      className="w-full rounded-xl bg-slate-950 border border-sky-500/40 px-3 py-2 text-white"
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Price ($ USD)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Strict Hours (e.g. 48 = 2d)</label>
                    <input
                      type="number"
                      min="1"
                      value={customHours}
                      onChange={(e) => setCustomHours(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Base Data (GB)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={customBaseGb}
                      onChange={(e) => setCustomBaseGb(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-400 font-semibold mb-1">
                      + Free Lure Bonus (GB)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={customBonusGb}
                      onChange={(e) => setCustomBonusGb(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-emerald-600/50 px-3 py-2 text-emerald-300"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sky-300 font-bold mb-1">
                      Max Devices Allowed on 1 Token (e.g. 1, 2, 3, 5)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="25"
                      value={customMaxDevices}
                      onChange={(e) => setCustomMaxDevices(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-sky-500/60 px-3 py-2 text-sky-200 font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">
                    Bulk Quantity (1 – 500 Vouchers at Once)
                  </label>
                  <div className="flex items-center gap-1">
                    {[10, 25, 50, 100, 250].map((presetQty) => (
                      <button
                        key={presetQty}
                        type="button"
                        onClick={() => setGenQty(presetQty)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition ${
                          Number(genQty) === presetQty
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {presetQty}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={genQty}
                      onChange={(e) => setGenQty(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-bold"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      maxLength={4}
                      value={genPrefix}
                      onChange={(e) => setGenPrefix(e.target.value.toUpperCase())}
                      placeholder="Prefix (NP)"
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white uppercase font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Batch / Cashier Label (Optional)</label>
                <input
                  type="text"
                  value={genNotes}
                  onChange={(e) => setGenNotes(e.target.value)}
                  placeholder="e.g. Shop Kiosk Batch #1 / Weekend Reseller"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4" />
                <span>
                  Bulk Generate {genQty} Voucher Token{Number(genQty) > 1 ? 's' : ''}
                </span>
              </button>
            </form>

            {newlyCreated.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="text-xs font-bold text-emerald-400">
                    Batch Ready ({newlyCreated.length} Tokens{lastBatchId ? ` • ${lastBatchId}` : ''})
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(newlyCreated.map((v) => v.code).join('\n'));
                        flashFeedback(`Copied all ${newlyCreated.length} token codes to clipboard!`);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 font-semibold"
                    >
                      <Copy className="w-3 h-3" />
                      Copy All
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handlePrintVoucherSlips(
                          newlyCreated,
                          `Voucher Batch ${lastBatchId || ''}`
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] text-white font-bold"
                    >
                      <Printer className="w-3 h-3" />
                      Print Slips
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {newlyCreated.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-xl bg-slate-950 border border-emerald-500/30 px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-white">{v.code}</span>
                        <span className="ml-2 text-[10px] text-sky-300">
                          (Max {v.maxDevices} Dev)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQrModalVoucher(v)}
                          className="text-amber-300 hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          QR
                        </button>
                        <button
                          onClick={() => copyToken(v.code)}
                          className="text-slate-300 hover:text-white"
                        >
                          {copiedCode === v.code ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          onClick={() => onTestTokenInPortal(v.code)}
                          className="text-indigo-400 hover:underline font-semibold"
                        >
                          Use on Portal →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 7 cols: Full Voucher Table (Batch Filter + Print Slips + CSV + Live +/- Device Cap!) */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/90 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">All Router Vouchers & Bulk Batches</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value="all">All Vouchers ({data.vouchers.length})</option>
                    {Array.from(
                      new Set(data.vouchers.map((v) => v.batchId).filter(Boolean))
                    ).map((bId) => (
                      <option key={bId} value={bId}>
                        {bId} ({data.vouchers.filter((v) => v.batchId === bId).length} tokens)
                      </option>
                    ))}
                  </select>

                  {batchFilter !== 'all' && (
                    <button
                      onClick={() => handleBulkRevokeBatch(batchFilter)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-300"
                    >
                      Revoke Entire Batch
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const list =
                      batchFilter === 'all'
                        ? data.vouchers.filter((v) => v.status === 'unused')
                        : data.vouchers.filter((v) => v.batchId === batchFilter);
                    handlePrintVoucherSlips(
                      list,
                      batchFilter === 'all' ? 'Unused WiFi Vouchers' : `Batch ${batchFilter}`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/40 text-xs font-semibold text-indigo-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Slips
                </button>

                <button
                  onClick={() => {
                    const list =
                      batchFilter === 'all'
                        ? data.vouchers
                        : data.vouchers.filter((v) => v.batchId === batchFilter);
                    const csv = [
                      'BatchID,Code,Plan,PriceUSD,TotalMB,UsedMB,DurationHours,MaxDevices,BoundDevices,Status',
                      ...list.map(
                        (v) =>
                          `${v.batchId || 'INITIAL'},${v.code},"${v.planName}",${v.priceUsd},${
                            v.totalMb
                          },${v.usedMb},${(v.durationSeconds / 3600).toFixed(1)},${
                            v.maxDevices || 1
                          },"${(v.boundMacs || []).join(';')}",${v.status}`
                      ),
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `netpulse-vouchers-${batchFilter}.csv`;
                    a.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {(batchFilter === 'all'
                ? data.vouchers
                : data.vouchers.filter((v) => v.batchId === batchFilter)
              ).map((v) => {
                const boundCount = (v.boundMacs || []).length;
                const maxDev = v.maxDevices || 1;
                return (
                  <div
                    key={v.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      {/* Clickable Mini QR Code Thumbnail per Voucher! */}
                      <button
                        type="button"
                        onClick={() => setQrModalVoucher(v)}
                        className="shrink-0 w-14 h-14 rounded-xl bg-white p-1 border border-indigo-500/40 hover:scale-105 transition shadow flex items-center justify-center"
                        title={`View / Scan ${data.routerConfig?.companyName || 'Manageable Tech'} QR Code for ${v.code}`}
                      >
                        {qrDataUrlMap[v.code] ? (
                          <img
                            src={qrDataUrlMap[v.code]}
                            alt={`QR ${v.code}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <QrCode className="w-7 h-7 text-slate-900" />
                        )}
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                            {data.routerConfig?.companyName || 'Manageable Tech'}
                          </span>
                          <span className="font-mono text-sm font-extrabold text-indigo-300">
                            {v.code}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              v.status === 'unused'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : v.status === 'active'
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {v.status}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-200">
                            Devices: {boundCount} / {maxDev} Max
                          </span>
                          <span className="font-bold text-white">${v.priceUsd}</span>
                        </div>
                        <div className="text-slate-300 mt-1">{v.planName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Shared Pool: {formatMb(v.usedMb)} / {formatMb(v.totalMb)}{' '}
                          {v.bonusMb > 0 && (
                            <span className="text-emerald-400">
                              (+{formatMb(v.bonusMb)} Free!)
                            </span>
                          )}{' '}
                          • {Math.round(v.durationSeconds / 3600)}h
                          {boundCount > 0 ? ` • MACs: ${v.boundMacs.join(', ')}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setQrModalVoucher(v)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold"
                        title="Open Scannable QR Card"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR</span>
                      </button>

                      {/* Quick live -/+ Max Devices adjuster per token */}
                      <div className="inline-flex items-center rounded-xl bg-slate-900 border border-slate-700 px-1.5 py-1 gap-1.5 mr-1">
                        <button
                          onClick={() => handleUpdateVoucherMaxDevices(v.id, Math.max(1, maxDev - 1))}
                          className="px-1.5 text-slate-300 hover:text-white font-bold"
                          title="Decrease max devices on this token"
                        >
                          -
                        </button>
                        <span className="text-[11px] text-sky-300 font-semibold">
                          {maxDev} Dev
                        </span>
                        <button
                          onClick={() => handleUpdateVoucherMaxDevices(v.id, maxDev + 1)}
                          className="px-1.5 text-slate-300 hover:text-white font-bold"
                          title="Increase max devices on this token"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => copyToken(v.code)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                        title="Copy Token"
                      >
                        {copiedCode === v.code ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      {(v.status === 'unused' || boundCount < maxDev) && (
                        <button
                          onClick={() => onTestTokenInPortal(v.code)}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-200 font-semibold"
                        >
                          Connect
                        </button>
                      )}
                      {v.status !== 'revoked' && (
                        <button
                          onClick={() => handleRevokeVoucher(v.id)}
                          className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300"
                          title="Revoke Voucher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MIXED & LURING PLANS BUILDER (WITH MAX DEVICES PER TOKEN) */}
      {subTab === 'plans' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 h-fit">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Create New Lure / Multi-Device Package
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Set Price, Hours, Base GB, Free Lure Bonus GB, and Max Devices Allowed per Token (e.g. 3 Devices).
            </p>
            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Package Title</label>
                <input
                  type="text"
                  required
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="e.g. Family 3-Device Bundle 5GB + 1GB Free"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    value={newPlanHours}
                    onChange={(e) => setNewPlanHours(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Base Data (GB)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newPlanBaseGb}
                    onChange={(e) => setNewPlanBaseGb(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-emerald-400 font-bold mb-1">+ Free Bonus (GB)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newPlanBonusGb}
                    onChange={(e) => setNewPlanBonusGb(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-emerald-500/50 px-3 py-2 text-emerald-300"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sky-300 font-bold mb-1">
                    Max Connected Devices per Token (e.g. 3 Devices)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    value={newPlanMaxDevices}
                    onChange={(e) => setNewPlanMaxDevices(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-sky-500/50 px-3 py-2 text-sky-200 font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Luring Promo Badge</label>
                <input
                  type="text"
                  value={newPlanBadge}
                  onChange={(e) => setNewPlanBadge(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-amber-300"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2.5"
              >
                Publish Package to Sign-In Portal
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
            {data.plans.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                      {p.badge}
                    </span>
                    <span className="text-xl font-black text-white">${p.priceUsd}</span>
                  </div>
                  <h4 className="font-bold text-white">{p.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{p.tagline}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                  <span>Pool: {formatMb(p.baseMb + p.bonusMb)}</span>
                  <span className="text-sky-300 font-semibold">
                    Max {p.maxDevices || 1} Device{(p.maxDevices || 1) > 1 ? 's' : ''}
                  </span>
                  <span>{p.durationHours}h</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PHONE TYPE & SECURITY AUDIT TRAIL */}
      {subTab === 'audit' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6">
          <h3 className="text-lg font-bold text-white mb-1">
            Comprehensive Device Fingerprint, Multi-Device Slot & Enforcement Audit Log
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Logs every phone's Brand, Model, OS, MAC, Token Slot (`1/3`, `2/3`, `3/3`), blocked extra devices (`MAX_DEVICES_LIMIT_BLOCKED`), Anti-VPN hits & Strict Cutoffs.
          </p>
          <div className="space-y-2 max-h-[560px] overflow-y-auto">
            {data.auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold ${
                        log.event.includes('BLOCKED') || log.event.includes('VPN')
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {log.event}
                    </span>
                    <strong className="text-white">{log.deviceSummary}</strong>
                    {log.mac !== 'N/A' && (
                      <span className="font-mono text-slate-400">MAC: {log.mac}</span>
                    )}
                    {log.voucherCode !== 'N/A' && (
                      <span className="font-mono text-amber-300">Token: {log.voucherCode}</span>
                    )}
                  </div>
                  <p className="text-slate-300 mt-1">{log.detail}</p>
                </div>
                <div className="text-[11px] text-slate-500 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ROUTER SSID SELF-ADVERTISING & ANTI-VPN POLICY CONFIG */}
      {subTab === 'settings' && (
        <form
          onSubmit={handleSaveRouterConfig}
          className="max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 text-xs sm:text-sm"
        >
          <h3 className="text-lg font-bold text-white">
            Company Branding, Self-Advertising SSID, Anti-VPN & Free Push Settings
          </h3>

          <div>
            <label className="block text-amber-300 font-bold mb-1">
              Company / Hotspot Brand Name (Printed on Every QR Voucher & Sign-In Portal)
            </label>
            <input
              type="text"
              value={companyNameInput}
              onChange={(e) => setCompanyNameInput(e.target.value)}
              placeholder="Manageable Tech"
              className="w-full rounded-xl bg-slate-950 border border-amber-500/50 px-3.5 py-2.5 text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Open Advertising WiFi SSID Name
            </label>
            <input
              type="text"
              value={ssidInput}
              onChange={(e) => setSsidInput(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Captive Sign-In Portal Headline
            </label>
            <input
              type="text"
              value={bannerTitleInput}
              onChange={(e) => setBannerTitleInput(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Anti-VPN Enforcement Action
              </label>
              <select
                value={vpnPolicyInput}
                onChange={(e) => setVpnPolicyInput(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white"
              >
                <option value="throttle">Slow Connection to Crawl (e.g. 64 Kbps)</option>
                <option value="disconnect">Strictly Disconnect Device Immediately</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                VPN Throttle Speed (Kbps)
              </label>
              <input
                type="number"
                min="16"
                max="512"
                value={throttleKbpsInput}
                onChange={(e) => setThrottleKbpsInput(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Auto Low-Data Notification Threshold (MB)
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={lowAlertMbInput}
                onChange={(e) => setLowAlertMbInput(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                id="sim-toggle"
                type="checkbox"
                checked={simEnabled}
                onChange={(e) => setSimEnabled(e.target.checked)}
                className="w-4 h-4 accent-indigo-500"
              />
              <label htmlFor="sim-toggle" className="text-slate-300">
                Live Demo Traffic Tick (Simulates MB usage every 2s)
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 transition"
          >
            Save & Apply to Router Engine
          </button>
        </form>
      )}

      {/* Individual Branded Manageable Tech QR Code Voucher Card Modal */}
      {qrModalVoucher && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-indigo-500/40 bg-slate-900 p-6 shadow-2xl relative">
            <button
              onClick={() => setQrModalVoucher(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                {data.routerConfig?.companyName || 'Manageable Tech'}
              </div>
              <h4 className="text-lg font-extrabold text-white mt-2">
                Instant Scan-to-Connect WiFi QR
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                SSID: <code className="text-emerald-300">{data.routerConfig?.ssidName}</code>
              </p>

              {/* High-Contrast Scannable QR Card */}
              <div className="my-4 mx-auto w-56 h-56 rounded-2xl bg-white p-3 shadow-xl flex items-center justify-center">
                {qrDataUrlMap[qrModalVoucher.code] ? (
                  <img
                    src={qrDataUrlMap[qrModalVoucher.code]}
                    alt={`QR ${qrModalVoucher.code}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode className="w-24 h-24 text-slate-900" />
                )}
              </div>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
                <div className="font-mono text-xl font-black tracking-widest text-indigo-300">
                  {qrModalVoucher.code}
                </div>
                <div className="text-xs text-slate-300 mt-1">{qrModalVoucher.planName}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Data: <strong className="text-white">{formatMb(qrModalVoucher.totalMb)}</strong> • Validity:{' '}
                  <strong className="text-white">
                    {Math.round(qrModalVoucher.durationSeconds / 3600)}h
                  </strong>{' '}
                  • Max{' '}
                  <strong className="text-sky-300">{qrModalVoucher.maxDevices || 1} Dev</strong>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const imgUrl =
                      qrDataUrlMap[qrModalVoucher.code] ||
                      (await QRCode.toDataURL(getPortalQrUrl(qrModalVoucher.code), {
                        width: 400,
                        margin: 2,
                      }));
                    const a = document.createElement('a');
                    a.href = imgUrl;
                    a.download = `ManageableTech-QR-${qrModalVoucher.code}.png`;
                    a.click();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handlePrintVoucherSlips(
                      [qrModalVoucher],
                      `${data.routerConfig?.companyName || 'Manageable Tech'} Voucher ${qrModalVoucher.code}`
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Notification Modal */}
      {msgModalSession && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h4 className="text-lg font-bold text-white mb-1">
              Push Live Notification to {msgModalSession.deviceAudit?.brand}{' '}
              {msgModalSession.deviceAudit?.model}
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Delivered instantly via Free Local LAN SSE + Browser Push API + free{' '}
              <code>ntfy.sh/{msgModalSession.ntfyTopic}</code>
            </p>
            <textarea
              rows={4}
              value={customMsgText}
              onChange={(e) => setCustomMsgText(e.target.value)}
              className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-3 text-sm text-white"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setMsgModalSession(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendUsageMessage(msgModalSession.id, customMsgText)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Send Push Message Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
