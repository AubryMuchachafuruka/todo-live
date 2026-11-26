import React, { useState } from 'react';
import {
  Terminal,
  Router,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  Cpu,
  Globe,
} from 'lucide-react';

const OPENWRT_INSTALL_CMD = `# 1. Copy installer to ANY OpenWrt / Linux Router (TP-Link, GL.iNet, Asus, NanoPi, x86)
scp router-scripts/install-openwrt.sh root@192.168.1.1:/tmp/

# 2. SSH into router & install (Replace 192.168.1.2:3001 with your NetPulse Server IP/Cloud URL)
ssh root@192.168.1.1 "sh /tmp/install-openwrt.sh http://192.168.1.2:3001 FREE_WIFI_GET_1GB_BONUS br-lan throttle"`;

const OPENWRT_UNINSTALL_CMD = `# Clean 1-Command Uninstall (Restores original WiFi SSID, DHCP, Firewall & removes QoS)
scp router-scripts/uninstall-openwrt.sh root@192.168.1.1:/tmp/
ssh root@192.168.1.1 "sh /tmp/uninstall-openwrt.sh br-lan"`;

const STOCK_ROUTER_BRIDGE_CMD = `# Works with ANY locked ISP/Stock Router (Huawei, TP-Link, D-Link, ZTE, Starlink):
# 1. Disable DHCP on stock WiFi AP & plug its LAN port into a Raspberry Pi / Mini-PC / Cloud-bridged Linux box
# 2. Run the NetPulse controller:
npm install && npm run build && npm start`;

export default function RouterInstallGuideView() {
  const [copiedId, setCopiedId] = useState('');

  const copy = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 1800);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 pb-20">
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
          <Router className="w-4 h-4" />
          Universal Router Architecture
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          How Installation, Strict Enforcement & Clean Uninstallation Work on Any Router
        </h1>
        <p className="text-sm text-slate-300 mt-2 leading-relaxed">
          NetPulse splits the <strong>Lightweight Router Firewall Agent</strong> (tiny shell/nftables/RouterOS rules inside the router) from the <strong>React + Node Controller</strong>. Because of this design, it installs on <strong>any router</strong>—even routers with only 8 MB flash—and uninstalls cleanly in 5 seconds with automatic config backup restoration.
        </p>
      </div>

      {/* How It Works Step-by-Step */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            icon: Globe,
            title: '1. Self-Advertising Open WiFi + Auto Popup (RFC 8910)',
            body: 'The router broadcasts an open luring SSID (e.g. "FREE_WIFI_GET_1GB_BONUS") and serves DHCP Option 114 + DNS interception. As soon as an Android, iPhone, or Laptop taps the WiFi, the OS Captive Network Assistant automatically pops open the Token Sign-In Portal.',
          },
          {
            icon: ShieldCheck,
            title: '2. Strict Byte & Second Enforcement (Zero Overage)',
            body: 'Unauthenticated MACs are dropped in nftables (@authorized_macs). Once a valid token is entered, the MAC is authorized and per-MAC upload+download counters sync every 10s. At 0 MB remaining OR 0 seconds remaining, the MAC is immediately evicted.',
          },
          {
            icon: Cpu,
            title: '3. Anti-VPN Detection (Slow to 64 Kbps or Kick)',
            body: 'Router firewall rules inspect WireGuard (UDP 51820), OpenVPN (1194), IPSec/IKEv2 (500/4500), L2TP (1701), PPTP (1723/GRE), and DNS-over-TLS (853). Violators are either throttled to 64 Kbps via Linux tc HTB queues or disconnected immediately.',
          },
          {
            icon: Smartphone,
            title: '4. Free Device Push APIs + Remote Web/Android Admin',
            body: 'Uses 100% free Local SSE + W3C Web Push Notifications + ntfy.sh (free zero-key HTTP pub/sub) to message phones ("Connected at 2:00 PM | Remaining 100MB..."). Admin accesses the PWA from any Android phone ("Add to Home Screen") or browser.',
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
              <div className="flex items-center gap-2.5 text-white font-bold mb-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                  <Icon className="w-4 h-4" />
                </div>
                {card.title}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{card.body}</p>
            </div>
          );
        })}
      </div>

      {/* Method A: OpenWrt / GL.iNet / Linux Routers */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            Option A: Install on OpenWrt / GL.iNet / DD-WRT / Linux Gateway
          </h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold">
            router-scripts/install-openwrt.sh
          </span>
        </div>

        <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
          <button
            onClick={() => copy('install', OPENWRT_INSTALL_CMD)}
            className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center gap-1"
          >
            {copiedId === 'install' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedId === 'install' ? 'Copied' : 'Copy'}
          </button>
          <pre>{OPENWRT_INSTALL_CMD}</pre>
        </div>

        <h3 className="text-base font-bold text-rose-300 flex items-center gap-2 pt-2">
          <Trash2 className="w-4 h-4" />
          Clean Uninstallation (Restores Original Router State in 1 Command)
        </h3>
        <p className="text-xs text-slate-400">
          Before changing anything, the installer backs up <code>/etc/config/wireless</code>, <code>dhcp</code>, and <code>firewall</code> into <code>/etc/netpulse/backup/</code>. Uninstalling deletes the isolated <code>inet netpulse</code> nftables table, removes <code>tc</code> QoS queues, stops the cron watchdog, and restores your original WiFi & firewall settings:
        </p>

        <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-rose-300 overflow-x-auto">
          <button
            onClick={() => copy('uninstall', OPENWRT_UNINSTALL_CMD)}
            className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center gap-1"
          >
            {copiedId === 'uninstall' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedId === 'uninstall' ? 'Copied' : 'Copy'}
          </button>
          <pre>{OPENWRT_UNINSTALL_CMD}</pre>
        </div>
      </div>

      {/* Method B & C: MikroTik RouterOS + Locked Stock ISP Routers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
            Option B: MikroTik RouterOS v6 / v7
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Ready-to-paste script included in <code>router-scripts/mikrotik-routeros.rsc</code>. Every rule is tagged with <code>comment="NETPULSE_RULE"</code> so uninstalling removes only NetPulse rules with zero risk to existing WAN/PPPoE configs.
          </p>
          <pre className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-[11px] text-sky-300 overflow-x-auto">
{`# Uninstall on MikroTik in 1 second:
/ip firewall filter remove [find comment~"NETPULSE_RULE"]
/ip firewall mangle remove [find comment~"NETPULSE_RULE"]
/queue simple remove [find comment~"NETPULSE_RULE"]`}
          </pre>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            Option C: Any Locked Stock / ISP Router (Bridge Mode)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Even if your router cannot flash custom firmware (Starlink router, ISP fiber ONT, cheap TP-Link/Tendacom AP), put the WiFi router in <strong>AP/Bridge Mode</strong> (DHCP off) and connect its LAN cable to any Raspberry Pi or old laptop running NetPulse as the gateway. To uninstall: unplug the Pi and re-enable DHCP on the router.
          </p>
          <pre className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-[11px] text-amber-300 overflow-x-auto">
{STOCK_ROUTER_BRIDGE_CMD}
          </pre>
        </div>
      </div>
    </div>
  );
}
