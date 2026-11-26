import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper: Generate crisp readable router voucher token like "MT-7K4M-9X2P" (Manageable Tech)
export function generateTokenCode(prefix = 'MT') {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // avoids ambiguous 0/O, 1/I
  const seg = (len) =>
    Array.from({ length: len }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join('');
  return `${prefix}-${seg(4)}-${seg(4)}`;
}

// Parse detailed phone/device audit fingerprint from User-Agent + optional hints
export function parseDeviceAudit(userAgent = '', hintModel = '') {
  const ua = userAgent || '';
  let deviceType = 'Smartphone';
  let brand = 'Generic';
  let model = hintModel || 'Unknown Device';
  let os = 'Unknown OS';
  let browser = 'Captive Portal CNA';

  if (/iPhone/i.test(ua)) {
    brand = 'Apple';
    model = hintModel || 'iPhone';
    const match = ua.match(/OS (\d+[_\d]*)/);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
    deviceType = 'Smartphone';
  } else if (/iPad/i.test(ua)) {
    brand = 'Apple';
    model = hintModel || 'iPad';
    os = 'iPadOS';
    deviceType = 'Tablet';
  } else if (/Android/i.test(ua)) {
    const verMatch = ua.match(/Android\s([0-9.]+)/i);
    os = verMatch ? `Android ${verMatch[1]}` : 'Android';
    const modelMatch = ua.match(/;\s*([^;)]+?)\s+Build\//i) || ua.match(/Android[^;]+;\s*([^)]+)\)/i);
    const rawModel = hintModel || (modelMatch ? modelMatch[1].trim() : 'Android Phone');
    model = rawModel;
    if (/SM-|Samsung|Galaxy/i.test(rawModel)) brand = 'Samsung';
    else if (/TECNO/i.test(rawModel)) brand = 'TECNO';
    else if (/Infinix/i.test(rawModel)) brand = 'Infinix';
    else if (/itel/i.test(rawModel)) brand = 'itel';
    else if (/Redmi|Xiaomi|POCO|M2\d/i.test(rawModel)) brand = 'Xiaomi';
    else if (/Pixel/i.test(rawModel)) brand = 'Google';
    else if (/HUAWEI|VOG-|MAR-/i.test(rawModel)) brand = 'Huawei';
    else if (/CPH|OPPO/i.test(rawModel)) brand = 'OPPO';
    else brand = 'Android OEM';
    deviceType = /Tablet|Tab/i.test(rawModel) ? 'Tablet' : 'Smartphone';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    brand = 'Apple';
    model = hintModel || 'MacBook';
    os = 'macOS';
    deviceType = 'Laptop';
  } else if (/Windows NT/i.test(ua)) {
    brand = 'PC';
    model = hintModel || 'Windows Laptop';
    os = 'Windows 11/10';
    deviceType = 'Laptop';
  } else if (/Linux/i.test(ua)) {
    brand = 'Linux';
    model = hintModel || 'Linux Workstation';
    os = 'Linux';
    deviceType = 'Laptop';
  }

  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  return { deviceType, brand, model, os, browser, rawUserAgent: ua.slice(0, 220) };
}

const now = Date.now();

const DEFAULT_PLANS = [
  {
    id: 'plan-lure-starter',
    name: 'Lure Promo Starter',
    category: 'lure',
    priceUsd: 1.0,
    baseMb: 2048,        // 2 GB base
    bonusMb: 1024,       // + 1 GB FREE Lure Bonus = 3 GB Total!
    durationHours: 48,   // 2 Days
    maxDevices: 1,       // Strict 1-device personal voucher
    speedLimitMbps: 25,
    badge: 'MOST POPULAR • +1GB FREE!',
    tagline: '$1 for 2 Days • 2GB + 1GB FREE Bonus (1 Device)',
    highlight: true,
  },
  {
    id: 'plan-speed-24h',
    name: '24-Hour Express Pass',
    category: 'less-days-more-speed',
    priceUsd: 2.0,
    baseMb: 3072,        // 3 GB
    bonusMb: 0,
    durationHours: 24,   // 24 Hours (fewer days, fast burst)
    maxDevices: 2,       // Up to 2 devices (e.g. Phone + Laptop)
    speedLimitMbps: 50,
    badge: 'FAST 24H • 2 DEVICES',
    tagline: '$2 for 24 Hours • 3GB High-Speed (Up to 2 Devices)',
    highlight: false,
  },
  {
    id: 'plan-heavy-2d',
    name: '2-Day Multi-Device Streamer',
    category: 'more-data-less-days',
    priceUsd: 2.0,
    baseMb: 5120,        // 5 GB
    bonusMb: 512,        // +512 MB Lure Bonus
    durationHours: 48,   // 2 Days
    maxDevices: 3,       // Exactly 3 devices per token!
    speedLimitMbps: 40,
    badge: '5GB + 512MB • 3 DEVICES!',
    tagline: '$2 for 2 Days • 5GB + 512MB Free (Connect up to 3 Devices)',
    highlight: true,
  },
  {
    id: 'plan-longstay-7d',
    name: '7-Day Light Saver',
    category: 'more-days-less-data',
    priceUsd: 2.0,
    baseMb: 2048,        // 2 GB total spread over a full week
    bonusMb: 256,        // +256 MB Free WhatsApp/Chat Cushion
    durationHours: 168,  // 7 Days (more days, less data)
    maxDevices: 1,
    speedLimitMbps: 15,
    badge: '7 FULL DAYS STAY',
    tagline: '$2 for 7 Days • 2GB + 256MB Free (1 Device)',
    highlight: false,
  },
  {
    id: 'plan-mega-lure',
    name: 'Mega Family Lure 5GB + 2GB Free',
    category: 'lure',
    priceUsd: 3.0,
    baseMb: 5120,        // 5 GB
    bonusMb: 2048,       // + 2 GB FREE Lure Bonus = 7 GB Total!
    durationHours: 72,   // 3 Days
    maxDevices: 3,       // Connect up to 3 devices on 1 token!
    speedLimitMbps: 60,
    badge: 'MEGA DEAL • +2GB FREE • 3 DEVICES',
    tagline: '$3 for 3 Days • 5GB + 2GB FREE Bonus (Up to 3 Devices)',
    highlight: true,
  },
  {
    id: 'plan-2week-chat',
    name: '14-Day Economy Saver',
    category: 'more-days-less-data',
    priceUsd: 3.0,
    baseMb: 3072,        // 3 GB across 14 days
    bonusMb: 512,        // +512 MB Free
    durationHours: 336,  // 14 Days
    maxDevices: 2,
    speedLimitMbps: 15,
    badge: '2 WEEKS • 2 DEVICES',
    tagline: '$3 for 14 Days • 3GB + 512MB Free (Up to 2 Devices)',
    highlight: false,
  },
];

function createInitialState() {
  const t1 = 'MT-3DEV-5GBX'; // 3-Device Demo Token (Manageable Tech)
  const t2 = 'MT-1D2G-FREE'; // 1-Device Demo Token
  const t3 = 'MT-24HR-2DEV'; // 2-Device Demo Token
  const t4 = 'MT-FAM3-LIVE'; // Active 3-device token with 2 phones already sharing it (2/3 slots used!)
  const t5 = 'MT-LOW1-100M'; // Active token with 100 MB left

  const demoOneConnectedAt = now - 2 * 3600 * 1000 - 15 * 60 * 1000;
  const demoTwoConnectedAt = now - 45 * 60 * 1000;
  const demoLowDataConnectedAt = now - 5 * 3600 * 1000;

  const vouchers = [
    {
      id: 'v-demo-1',
      code: t1,
      planId: 'plan-heavy-2d',
      planName: '2-Day Multi-Device Streamer ($2 • 5GB + 512MB Free)',
      priceUsd: 2.0,
      baseMb: 5120,
      bonusMb: 512,
      totalMb: 5632,
      usedMb: 0,
      durationSeconds: 48 * 3600,
      maxDevices: 3, // Allows 3 distinct devices!
      boundMacs: [],
      status: 'unused',
      createdAt: now - 3600 * 1000,
      activatedAt: null,
      expiresAt: null,
      notes: 'Ready-to-test 3-Device Token ($2 • 5GB+512MB, Max 3 Devices)',
    },
    {
      id: 'v-demo-2',
      code: t2,
      planId: 'plan-lure-starter',
      planName: 'Lure Promo Starter ($1 • 2GB + 1GB Free)',
      priceUsd: 1.0,
      baseMb: 2048,
      bonusMb: 1024,
      totalMb: 3072,
      usedMb: 0,
      durationSeconds: 48 * 3600,
      maxDevices: 1, // Strict 1-device token
      boundMacs: [],
      status: 'unused',
      createdAt: now - 3600 * 1000,
      activatedAt: null,
      expiresAt: null,
      notes: 'Ready-to-test $1 Lure Token (Strict 1 Device Limit)',
    },
    {
      id: 'v-demo-3',
      code: t3,
      planId: 'plan-speed-24h',
      planName: '24-Hour Express Pass ($2 • 3GB)',
      priceUsd: 2.0,
      baseMb: 3072,
      bonusMb: 0,
      totalMb: 3072,
      usedMb: 0,
      durationSeconds: 24 * 3600,
      maxDevices: 2, // 2-device token
      boundMacs: [],
      status: 'unused',
      createdAt: now - 3600 * 1000,
      activatedAt: null,
      expiresAt: null,
      notes: 'Ready-to-test $2 24h Token (Max 2 Devices)',
    },
    {
      id: 'v-demo-4',
      code: t4,
      planId: 'plan-mega-lure',
      planName: 'Mega Family Lure ($3 • 5GB + 2GB Free)',
      priceUsd: 3.0,
      baseMb: 5120,
      bonusMb: 2048,
      totalMb: 7168,
      usedMb: 1820.6, // Shared pool across the 2 connected devices (Samsung + MacBook)
      durationSeconds: 72 * 3600,
      maxDevices: 3, // 2 of 3 devices currently bound -> 1 more device can still join this token!
      boundMacs: ['A4:77:33:9B:12:4E', 'D0:81:7A:44:C1:08'],
      status: 'active',
      createdAt: demoOneConnectedAt,
      activatedAt: demoOneConnectedAt,
      expiresAt: demoOneConnectedAt + 72 * 3600 * 1000,
      notes: 'Shared 3-device token (2/3 slots used, 1 slot open!)',
    },
    {
      id: 'v-demo-5',
      code: t5,
      planId: 'plan-lure-starter',
      planName: 'Lure Promo Starter ($1 • 2GB + 1GB Free)',
      priceUsd: 1.0,
      baseMb: 2048,
      bonusMb: 1024,
      totalMb: 3072,
      usedMb: 2972.0, // Only 100 MB left!
      durationSeconds: 48 * 3600,
      maxDevices: 1,
      boundMacs: ['3C:28:6D:D1:80:09'],
      status: 'active',
      createdAt: demoLowDataConnectedAt,
      activatedAt: demoLowDataConnectedAt,
      expiresAt: demoLowDataConnectedAt + 48 * 3600 * 1000,
      notes: 'Low-quota user (100 MB left, 1/1 device)',
    },
    {
      id: 'v-demo-6',
      code: 'NP-VPN8-TEST',
      planId: 'plan-speed-24h',
      planName: '24-Hour Express Pass ($2 • 3GB)',
      priceUsd: 2.0,
      baseMb: 3072,
      bonusMb: 0,
      totalMb: 3072,
      usedMb: 640.2,
      durationSeconds: 24 * 3600,
      maxDevices: 2,
      boundMacs: ['F8:E4:3B:55:19:C2'],
      status: 'active',
      createdAt: demoTwoConnectedAt,
      activatedAt: demoTwoConnectedAt,
      expiresAt: demoTwoConnectedAt + 24 * 3600 * 1000,
      notes: 'Attempted WireGuard UDP:51820 (1/2 devices)',
    },
  ];

  const sessions = [
    {
      id: 'sess-demo-1',
      voucherId: 'v-demo-4',
      voucherCode: t4,
      planName: 'Mega Family Lure (Shared 3-Device Pool)',
      mac: 'A4:77:33:9B:12:4E',
      ip: '192.168.1.104',
      hostname: 'Samsung-Galaxy-A54',
      ntfyTopic: 'netpulse-a477339b',
      deviceAudit: {
        deviceType: 'Smartphone',
        brand: 'Samsung',
        model: 'Samsung Galaxy A54 5G (SM-A546B)',
        os: 'Android 14',
        browser: 'Chrome',
        rawUserAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A) Chrome/129.0 Mobile Safari/537.36',
      },
      connectedAt: demoOneConnectedAt,
      expiresAt: demoOneConnectedAt + 72 * 3600 * 1000,
      totalMb: 7168,
      usedMb: 1820.6,
      deviceUsedMb: 1180.4, // Individual device's bytes inside the shared voucher pool
      liveRateKbps: 1840,
      effectiveSpeedMbps: 60,
      vpnDetected: false,
      vpnProtocol: null,
      vpnPenaltyState: 'none',
      status: 'online',
      alertsSent: { welcome: true, pct80: false, mb100: false, depleted: false },
      messages: [
        {
          id: 'msg-init-1',
          timestamp: demoOneConnectedAt,
          channel: 'Captive SSE + Web Push + ntfy.sh',
          type: 'welcome',
          text: `Connected at ${new Date(demoOneConnectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Device 1 of 3 on token ${t4}). Shared Pool: 7.00 GB total.`,
        },
      ],
    },
    {
      id: 'sess-demo-1b',
      voucherId: 'v-demo-4',
      voucherCode: t4,
      planName: 'Mega Family Lure (Shared 3-Device Pool)',
      mac: 'D0:81:7A:44:C1:08',
      ip: '192.168.1.109',
      hostname: 'MacBook-Air-M2',
      ntfyTopic: 'netpulse-d0817a44',
      deviceAudit: {
        deviceType: 'Laptop',
        brand: 'Apple',
        model: 'MacBook Air M2',
        os: 'macOS',
        browser: 'Safari',
        rawUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Safari/605.1.15',
      },
      connectedAt: demoOneConnectedAt + 20 * 60 * 1000,
      expiresAt: demoOneConnectedAt + 72 * 3600 * 1000,
      totalMb: 7168,
      usedMb: 1820.6,
      deviceUsedMb: 640.2,
      liveRateKbps: 2150,
      effectiveSpeedMbps: 60,
      vpnDetected: false,
      vpnProtocol: null,
      vpnPenaltyState: 'none',
      status: 'online',
      alertsSent: { welcome: true, pct80: false, mb100: false, depleted: false },
      messages: [
        {
          id: 'msg-init-1b',
          timestamp: demoOneConnectedAt + 20 * 60 * 1000,
          channel: 'Captive SSE + Web Push + ntfy.sh',
          type: 'welcome',
          text: `Connected (Device 2 of 3 on token ${t4}). 1 device slot still available on this voucher!`,
        },
      ],
    },
    {
      id: 'sess-demo-2',
      voucherId: 'v-demo-5',
      voucherCode: t5,
      planName: 'Lure Promo Starter (+1GB Free)',
      mac: '3C:28:6D:D1:80:09',
      ip: '192.168.1.112',
      hostname: 'TECNO-SPARK-20',
      ntfyTopic: 'netpulse-3c286dd1',
      deviceAudit: {
        deviceType: 'Smartphone',
        brand: 'TECNO',
        model: 'TECNO Spark 20 Pro (KJ6)',
        os: 'Android 13',
        browser: 'Chrome',
        rawUserAgent: 'Mozilla/5.0 (Linux; Android 13; TECNO KJ6 Build/TP1A) Chrome/128.0 Mobile Safari/537.36',
      },
      connectedAt: demoLowDataConnectedAt,
      expiresAt: demoLowDataConnectedAt + 48 * 3600 * 1000,
      totalMb: 3072,
      usedMb: 2972.0, // Exactly 100 MB remaining!
      deviceUsedMb: 2972.0,
      liveRateKbps: 620,
      effectiveSpeedMbps: 25,
      vpnDetected: false,
      vpnProtocol: null,
      vpnPenaltyState: 'none',
      status: 'online',
      alertsSent: { welcome: true, pct80: true, mb100: true, depleted: false },
      messages: [
        {
          id: 'msg-init-2',
          timestamp: now - 120 * 1000,
          channel: 'Free Web Push + ntfy.sh API',
          type: 'low_data',
          text: `Note: Connected at ${new Date(demoLowDataConnectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | Remaining Data: 100 MB | Remaining Time: 43h 00m. Thank you, please come again!`,
        },
      ],
    },
    {
      id: 'sess-demo-3',
      voucherId: 'v-demo-6',
      voucherCode: 'NP-VPN8-TEST',
      planName: '24-Hour Express Pass',
      mac: 'F8:E4:3B:55:19:C2',
      ip: '192.168.1.119',
      hostname: 'iPhone-15-Pro',
      ntfyTopic: 'netpulse-f8e43b55',
      deviceAudit: {
        deviceType: 'Smartphone',
        brand: 'Apple',
        model: 'iPhone 15 Pro',
        os: 'iOS 18.1',
        browser: 'Safari',
        rawUserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1',
      },
      connectedAt: demoTwoConnectedAt,
      expiresAt: demoTwoConnectedAt + 24 * 3600 * 1000,
      totalMb: 3072,
      usedMb: 640.2,
      deviceUsedMb: 640.2,
      liveRateKbps: 64,
      effectiveSpeedMbps: 0.064,
      vpnDetected: true,
      vpnProtocol: 'WireGuard UDP:51820',
      vpnPenaltyState: 'throttled',
      status: 'throttled_vpn',
      alertsSent: { welcome: true, pct80: false, mb100: false, depleted: false },
      messages: [
        {
          id: 'msg-init-3',
          timestamp: now - 300 * 1000,
          channel: 'Router Anti-VPN Engine + Push',
          type: 'vpn_warning',
          text: 'SECURITY ALERT: VPN detected (WireGuard UDP:51820). VPNs are prohibited on this network. Your speed has been throttled to 64 Kbps until VPN is turned off.',
        },
      ],
    },
  ];

  const auditLogs = [
    {
      id: 'aud-1',
      timestamp: demoOneConnectedAt,
      event: 'MULTI_DEVICE_SLOT_1_OF_3',
      mac: 'A4:77:33:9B:12:4E',
      ip: '192.168.1.104',
      voucherCode: t4,
      deviceSummary: 'Samsung Galaxy A54 5G (Android 14 • Chrome)',
      detail: `Bound Device 1/3 on multi-device token ${t4} (Shared 7168 MB pool).`,
    },
    {
      id: 'aud-1b',
      timestamp: demoOneConnectedAt + 20 * 60 * 1000,
      event: 'MULTI_DEVICE_SLOT_2_OF_3',
      mac: 'D0:81:7A:44:C1:08',
      ip: '192.168.1.109',
      voucherCode: t4,
      deviceSummary: 'Apple MacBook Air M2 (macOS • Safari)',
      detail: `Bound Device 2/3 on multi-device token ${t4} (1 slot remaining before strict block).`,
    },
    {
      id: 'aud-3',
      timestamp: now - 300 * 1000,
      event: 'ANTI_VPN_ENFORCED',
      mac: 'F8:E4:3B:55:19:C2',
      ip: '192.168.1.119',
      voucherCode: 'NP-VPN8-TEST',
      deviceSummary: 'Apple iPhone 15 Pro (iOS 18.1 • Safari)',
      detail: 'Detected WireGuard UDP port 51820 packet signature. Applied 64 Kbps tc HTB throttle.',
    },
    {
      id: 'aud-4',
      timestamp: now - 120 * 1000,
      event: 'AUTO_USAGE_MESSAGE_SENT',
      mac: '3C:28:6D:D1:80:09',
      ip: '192.168.1.112',
      voucherCode: t5,
      deviceSummary: 'TECNO Spark 20 Pro (Android 13 • Chrome)',
      detail: 'Sent 100 MB remaining quota alert via Free Browser Push + SSE + ntfy.sh topic netpulse-3c286dd1.',
    },
  ];

  return {
    routerConfig: {
      companyName: 'Manageable Tech',
      ssidName: 'MANAGEABLE_TECH_FREE_BONUS_WIFI',
      portalBannerTitle: 'Manageable Tech • FREE BONUS WiFi Hotspot',
      portalLureSubtext: 'Powered by Manageable Tech: Buy $1 (2GB + 1GB FREE) or Share 1 Token Across up to 3 Devices! Scan your Voucher QR Code or enter token below.',
      vpnPolicy: 'throttle',
      throttleSpeedKbps: 64,
      defaultMaxDevices: 3, // Default per-token device cap if not specified by plan
      strictAccounting: true,
      enableNtfyPush: true,
      ntfyServerUrl: 'https://ntfy.sh',
      lowDataAlertMb: 100,
      backgroundTrafficSim: true,
      adminPin: '1234',
    },
    plans: DEFAULT_PLANS,
    vouchers,
    sessions,
    auditLogs,
  };
}

// Normalize legacy store.json vouchers cleanly if upgrading from boundMac -> boundMacs
function migrateStateIfNeeded(st) {
  if (!st) return null;
  if (st.routerConfig && !st.routerConfig.companyName) {
    st.routerConfig.companyName = 'Manageable Tech';
  }
  for (const p of st.plans || []) {
    if (!p.maxDevices) p.maxDevices = 1;
  }
  for (const v of st.vouchers || []) {
    if (!Array.isArray(v.boundMacs)) {
      v.boundMacs = v.boundMac ? [v.boundMac] : [];
    }
    if (!v.maxDevices) v.maxDevices = 1;
  }
  for (const s of st.sessions || []) {
    if (typeof s.deviceUsedMb !== 'number') {
      s.deviceUsedMb = s.usedMb || 0;
    }
  }
  return st;
}

export function loadStore() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = migrateStateIfNeeded(JSON.parse(raw));
      if (parsed && parsed.vouchers?.some((v) => v.code === 'MT-3DEV-5GBX')) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed reading store.json, re-initializing:', err.message);
  }
  const initial = createInitialState();
  saveStore(initial);
  return initial;
}

export function saveStore(state) {
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function resetStore() {
  const initial = createInitialState();
  saveStore(initial);
  return initial;
}
