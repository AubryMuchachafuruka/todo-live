import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  loadStore,
  saveStore,
  resetStore,
  generateTokenCode,
  parseDeviceAudit,
} from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let state = loadStore();

// Connected Server-Sent Events (SSE) clients for instant zero-cost push notifications
const sseClients = new Map();

function broadcastSSE(target, eventName, payload) {
  for (const [clientId, client] of sseClients.entries()) {
    if (target === 'all' || client.role === target || client.sessionId === target) {
      try {
        client.res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
      } catch {
        sseClients.delete(clientId);
      }
    }
  }
}

function formatRemainingDuration(ms) {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatMbReadable(mb) {
  if (mb <= 0) return '0 MB';
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB (${Math.round(mb)} MB)`;
  return `${Math.round(mb)} MB`;
}

function formatClock(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addAuditLog(event, sessionOrMeta, detail) {
  const entry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    event,
    mac: sessionOrMeta.mac || 'N/A',
    ip: sessionOrMeta.ip || 'N/A',
    voucherCode: sessionOrMeta.voucherCode || 'N/A',
    deviceSummary: sessionOrMeta.deviceAudit
      ? `${sessionOrMeta.deviceAudit.brand} ${sessionOrMeta.deviceAudit.model} (${sessionOrMeta.deviceAudit.os} • ${sessionOrMeta.deviceAudit.browser})`
      : sessionOrMeta.deviceSummary || 'System / Admin',
    detail,
  };
  state.auditLogs.unshift(entry);
  if (state.auditLogs.length > 250) state.auditLogs.length = 250;
  return entry;
}

//Helper: enrich session with its voucher's live shared pool & multi-device slot info
function enrichSessionView(session) {
  const now = Date.now();
  const voucher = state.vouchers.find((v) => v.id === session.voucherId);
  const poolUsedMb = voucher ? voucher.usedMb : session.usedMb;
  const poolTotalMb = voucher ? voucher.totalMb : session.totalMb;
  const maxDevices = voucher ? voucher.maxDevices || 1 : 1;
  const boundMacs = voucher ? voucher.boundMacs || [] : [session.mac];

  const siblingDevices = state.sessions
    .filter((s) => s.voucherId === session.voucherId)
    .map((s) => ({
      id: s.id,
      mac: s.mac,
      ip: s.ip,
      model: `${s.deviceAudit?.brand || ''} ${s.deviceAudit?.model || 'Device'}`.trim(),
      os: s.deviceAudit?.os || '',
      deviceUsedMb: Number((s.deviceUsedMb || 0).toFixed(2)),
      status: s.status,
    }));

  return {
    ...session,
    totalMb: poolTotalMb,
    usedMb: Number(poolUsedMb.toFixed(2)),
    deviceUsedMb: Number((session.deviceUsedMb || 0).toFixed(2)),
    remainingMb: Math.max(0, Number((poolTotalMb - poolUsedMb).toFixed(2))),
    remainingSeconds: Math.max(0, Math.floor((session.expiresAt - now) / 1000)),
    maxDevices,
    boundDevicesCount: boundMacs.length,
    boundMacs,
    siblingDevices,
  };
}

// Deliver message to user device over Free Local LAN SSE + Browser Notification API + Free ntfy.sh
async function pushMessageToDevice(session, type, customText = null) {
  const now = Date.now();
  const voucher = state.vouchers.find((v) => v.id === session.voucherId);
  const usedMb = voucher ? voucher.usedMb : session.usedMb;
  const totalMb = voucher ? voucher.totalMb : session.totalMb;
  const remMb = Math.max(0, totalMb - usedMb);
  const remMs = Math.max(0, session.expiresAt - now);
  const connectedTimeStr = formatClock(session.connectedAt);

  const messageText =
    customText ||
    `Note: Connected at ${connectedTimeStr} | Remaining Data: ${formatMbReadable(remMb)} | Remaining Time: ${formatRemainingDuration(remMs)}. Thank you, please come again!`;

  const msgObj = {
    id: `msg-${now}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    channel: state.routerConfig.enableNtfyPush
      ? 'Free Browser Push + SSE + ntfy.sh API'
      : 'Free Local LAN SSE + Browser Notification API',
    type,
    text: messageText,
    ntfyUrl: `${state.routerConfig.ntfyServerUrl}/${session.ntfyTopic}`,
  };

  session.messages.unshift(msgObj);
  if (session.messages.length > 30) session.messages.length = 30;

  broadcastSSE(session.id, 'device_message', { sessionId: session.id, message: msgObj });
  broadcastSSE('admin', 'state_updated', { reason: 'device_message', sessionId: session.id });

  if (state.routerConfig.enableNtfyPush && session.ntfyTopic) {
    fetch(`${state.routerConfig.ntfyServerUrl}/${session.ntfyTopic}`, {
      method: 'POST',
      headers: {
        Title: 'NetPulse WiFi Usage Update',
        Priority: type === 'low_data' || type === 'vpn_warning' ? 'high' : 'default',
        Tags: 'wifi,signal_strength',
      },
      body: messageText,
      signal: AbortSignal.timeout(1500),
    }).catch(() => {});
  }

  return msgObj;
}

// ============================================================================
// STRICT SHARED-POOL QUOTA, STRICT TIME, MULTI-DEVICE & ANTI-VPN ENGINE
// ============================================================================
function evaluateStrictEnforcement(tickDeltaSeconds = 2) {
  const now = Date.now();
  let changed = false;

  // Step 1: Update per-device traffic & Anti-VPN state
  for (const session of state.sessions) {
    if (session.status !== 'online' && session.status !== 'throttled_vpn') {
      session.liveRateKbps = 0;
      continue;
    }

    const voucher = state.vouchers.find((v) => v.id === session.voucherId);

    if (state.routerConfig.backgroundTrafficSim && tickDeltaSeconds > 0) {
      let deltaMb = 0;
      if (session.vpnDetected && state.routerConfig.vpnPolicy === 'throttle') {
        session.liveRateKbps = state.routerConfig.throttleSpeedKbps;
        session.effectiveSpeedMbps = Number((state.routerConfig.throttleSpeedKbps / 1000).toFixed(3));
        deltaMb = (session.liveRateKbps / 8 / 1024) * tickDeltaSeconds;
      } else {
        const jitterKbps = Math.floor(900 + Math.random() * 2200);
        session.liveRateKbps = jitterKbps;
        deltaMb = (jitterKbps / 8 / 1024) * tickDeltaSeconds * 0.3;
      }
      session.deviceUsedMb = Number(((session.deviceUsedMb || 0) + deltaMb).toFixed(3));
      if (voucher) {
        voucher.usedMb = Number((voucher.usedMb + deltaMb).toFixed(2));
      } else {
        session.usedMb = Number((session.usedMb + deltaMb).toFixed(2));
      }
      changed = true;
    }

    // ANTI-VPN ENFORCEMENT PER DEVICE
    if (session.vpnDetected) {
      if (state.routerConfig.vpnPolicy === 'disconnect') {
        session.status = 'disconnected_vpn';
        session.vpnPenaltyState = 'disconnected';
        session.liveRateKbps = 0;
        session.effectiveSpeedMbps = 0;
        addAuditLog(
          'VPN_DISCONNECTED',
          session,
          `Disconnected device immediately: prohibited VPN tunnel (${session.vpnProtocol || 'Encrypted Tunnel'}) detected.`
        );
        pushMessageToDevice(
          session,
          'vpn_warning',
          `DISCONNECTED: VPN usage (${session.vpnProtocol || 'VPN'}) is strictly prohibited on this WiFi. Disable your VPN and reconnect.`
        );
        changed = true;
        continue;
      } else if (session.status !== 'throttled_vpn') {
        session.status = 'throttled_vpn';
        session.vpnPenaltyState = 'throttled';
        session.liveRateKbps = state.routerConfig.throttleSpeedKbps;
        session.effectiveSpeedMbps = Number((state.routerConfig.throttleSpeedKbps / 1000).toFixed(3));
        addAuditLog(
          'ANTI_VPN_THROTTLED',
          session,
          `VPN detected (${session.vpnProtocol || 'WireGuard/OpenVPN'}). Connection slowed to ${state.routerConfig.throttleSpeedKbps} Kbps.`
        );
        pushMessageToDevice(
          session,
          'vpn_warning',
          `VPN DETECTED (${session.vpnProtocol || 'Tunnel'}): VPNs are not allowed. Speed slowed to ${state.routerConfig.throttleSpeedKbps} Kbps until VPN is turned off.`
        );
        changed = true;
      }
    } else if (session.status === 'throttled_vpn') {
      session.status = 'online';
      session.vpnPenaltyState = 'none';
      const plan = state.plans.find((p) => p.id === voucher?.planId);
      session.effectiveSpeedMbps = plan ? plan.speedLimitMbps : 25;
      changed = true;
    }
  }

  // Step 2: Enforce Shared Pool GB Cutoff, Shared Time Cutoff & <=100MB Alerts across ALL devices on each voucher
  for (const session of state.sessions) {
    if (session.status !== 'online' && session.status !== 'throttled_vpn') continue;

    const voucher = state.vouchers.find((v) => v.id === session.voucherId);
    if (voucher) {
      session.usedMb = voucher.usedMb;
      session.totalMb = voucher.totalMb;
      if (voucher.expiresAt) session.expiresAt = voucher.expiresAt;
    }

    const remMb = session.totalMb - session.usedMb;
    const remMs = session.expiresAt - now;

    // STRICT GB / MB ALLOCATION CUTOFF (Cuts off all 1..N devices sharing the depleted token!)
    if (remMb <= 0) {
      session.usedMb = session.totalMb;
      session.status = 'disconnected_quota';
      session.liveRateKbps = 0;
      session.effectiveSpeedMbps = 0;
      if (voucher) {
        voucher.usedMb = voucher.totalMb;
        voucher.status = 'depleted_data';
      }
      if (!session.alertsSent.depleted) {
        session.alertsSent.depleted = true;
        addAuditLog(
          'STRICT_DATA_CUTOFF',
          session,
          `Strict Shared GB cutoff enforced at ${session.totalMb} MB (${(session.totalMb / 1024).toFixed(2)} GB). Device MAC ${session.mac} evicted from authorized_macs.`
        );
        pushMessageToDevice(
          session,
          'cutoff',
          `Note: Connected at ${formatClock(session.connectedAt)} | Remaining Data: 0 MB. Your voucher's data allocation is finished. Thank you, please come again!`
        );
      }
      changed = true;
      continue;
    }

    // STRICT TIME ALLOCATION CUTOFF
    if (remMs <= 0) {
      session.status = 'disconnected_time';
      session.liveRateKbps = 0;
      session.effectiveSpeedMbps = 0;
      if (voucher) {
        voucher.status = 'expired_time';
      }
      if (!session.alertsSent.depleted) {
        session.alertsSent.depleted = true;
        addAuditLog(
          'STRICT_TIME_CUTOFF',
          session,
          `Strict Time cutoff enforced for MAC ${session.mac}.`
        );
        pushMessageToDevice(
          session,
          'cutoff',
          `Note: Connected at ${formatClock(session.connectedAt)} | Remaining Time: 0m (Unused Data: ${Math.round(remMb)} MB). Your voucher time has expired. Thank you, please come again!`
        );
      }
      changed = true;
      continue;
    }

    // AUTOMATIC LOW-DATA MESSAGE AT <= 100 MB REMAINING
    const thresholdMb = state.routerConfig.lowDataAlertMb || 100;
    if (remMb <= thresholdMb && !session.alertsSent.mb100) {
      session.alertsSent.mb100 = true;
      const alertText = `Note: Connected at ${formatClock(session.connectedAt)} | Remaining Data: ${Math.round(remMb)} MB | Remaining Time: ${formatRemainingDuration(remMs)}. Thank you, please come again!`;
      pushMessageToDevice(session, 'low_data', alertText);
      addAuditLog(
        'AUTO_LOW_DATA_ALERT',
        session,
        `Triggered <=${thresholdMb}MB alert to ${session.mac}: "${alertText}"`
      );
      changed = true;
    }
  }

  if (changed) {
    saveStore(state);
    broadcastSSE('all', 'tick', { timestamp: now });
  }
}

setInterval(() => evaluateStrictEnforcement(2), 2500);

// ============================================================================
// REST API + REAL-TIME SSE ENDPOINTS
// ============================================================================

app.get('/api/events', (req, res) => {
  const clientId = crypto.randomUUID();
  const sessionId = req.query.sessionId || null;
  const role = req.query.role || 'client';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

  sseClients.set(clientId, { res, sessionId, role });

  req.on('close', () => {
    sseClients.delete(clientId);
  });
});

// Public Portal Info
app.get('/api/portal/info', (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const detectedAudit = parseDeviceAudit(userAgent, req.query.modelHint || '');

  // Show unused tokens PLUS active multi-device tokens that still have open device slots (like NP-FAM3-LIVE 2/3)!
  const sampleTokens = state.vouchers
    .filter(
      (v) =>
        v.status === 'unused' ||
        (v.status === 'active' && (v.boundMacs?.length || 0) < (v.maxDevices || 1))
    )
    .slice(0, 5)
    .map((v) => ({
      code: v.code,
      planName: v.planName,
      priceUsd: v.priceUsd,
      totalMb: v.totalMb,
      bonusMb: v.bonusMb,
      maxDevices: v.maxDevices || 1,
      boundCount: (v.boundMacs || []).length,
      durationHours: Math.round(v.durationSeconds / 3600),
    }));

  res.json({
    routerConfig: {
      companyName: state.routerConfig.companyName || 'Manageable Tech',
      ssidName: state.routerConfig.ssidName,
      portalBannerTitle: state.routerConfig.portalBannerTitle,
      portalLureSubtext: state.routerConfig.portalLureSubtext,
      vpnPolicy: state.routerConfig.vpnPolicy,
      throttleSpeedKbps: state.routerConfig.throttleSpeedKbps,
      ntfyServerUrl: state.routerConfig.ntfyServerUrl,
    },
    plans: state.plans,
    detectedAudit,
    sampleUnusedTokens: sampleTokens,
  });
});

// Authenticate / Redeem Voucher Token on Captive Sign-In Page (Enforces Strict Max Devices per Token!)
app.post('/api/portal/connect', (req, res) => {
  const { token, customMac, customModelHint, simulateNewDevice } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Please enter a valid WiFi voucher token.' });
  }

  const normalized = token.trim().toUpperCase();
  const voucher = state.vouchers.find((v) => v.code.toUpperCase() === normalized);

  if (!voucher) {
    addAuditLog(
      'AUTH_FAILED_INVALID_TOKEN',
      { mac: customMac || 'Unknown', ip: req.ip, voucherCode: normalized },
      `Rejected invalid voucher token attempt "${normalized}".`
    );
    saveStore(state);
    return res.status(404).json({
      error: `Invalid token "${normalized}". Please check your voucher code or choose a package below.`,
    });
  }

  const now = Date.now();

  if (voucher.status === 'depleted_data' || voucher.usedMb >= voucher.totalMb) {
    return res.status(403).json({ error: 'This voucher has 0 MB remaining (Strict GB Limit Reached).' });
  }
  if (voucher.status === 'expired_time' || (voucher.expiresAt && voucher.expiresAt <= now)) {
    return res.status(403).json({ error: 'This voucher has expired (Strict Time Limit Reached).' });
  }
  if (voucher.status === 'revoked') {
    return res.status(403).json({ error: 'This voucher was revoked by the router administrator.' });
  }

  if (!Array.isArray(voucher.boundMacs)) {
    voucher.boundMacs = voucher.boundMac ? [voucher.boundMac] : [];
  }
  const maxDevices = Math.max(1, Number(voucher.maxDevices || 1));

  // Determine the connecting phone's MAC address (real OpenWrt router passes client MAC via openNDS/DHCP)
  const mac = (
    customMac ||
    (simulateNewDevice
      ? Array.from({ length: 6 }, () =>
          crypto.randomInt(0, 256).toString(16).padStart(2, '0').toUpperCase()
        ).join(':')
      : null) ||
    Array.from({ length: 6 }, () =>
      crypto.randomInt(0, 256).toString(16).padStart(2, '0').toUpperCase()
    ).join(':')
  ).toUpperCase();

  const isAlreadyBound = voucher.boundMacs.some((m) => m.toUpperCase() === mac);

  // STRICT CONNECTION LIMIT PER TOKEN ENFORCEMENT (e.g. Max 3 devices -> 4th device is strictly rejected!)
  if (!isAlreadyBound && voucher.boundMacs.length >= maxDevices) {
    const deviceAuditAttempt = parseDeviceAudit(req.headers['user-agent'] || '', customModelHint || '');
    addAuditLog(
      'MAX_DEVICES_LIMIT_BLOCKED',
      {
        mac,
        ip: req.ip,
        voucherCode: voucher.code,
        deviceAudit: deviceAuditAttempt,
      },
      `Blocked extra device (${mac}) on token ${voucher.code}: Strict limit of ${maxDevices}/${maxDevices} device(s) already reached (${voucher.boundMacs.join(', ')}).`
    );
    saveStore(state);
    broadcastSSE('admin', 'state_updated', { reason: 'max_devices_blocked' });

    return res.status(403).json({
      error: `Device Limit Reached (${voucher.boundMacs.length}/${maxDevices} devices connected)! Token "${voucher.code}" only allows up to ${maxDevices} device${maxDevices > 1 ? 's' : ''}. Disconnect an old device in Admin or use another voucher.`,
      code: 'MAX_DEVICES_REACHED',
      maxDevices,
      boundCount: voucher.boundMacs.length,
    });
  }

  if (!isAlreadyBound) {
    voucher.boundMacs.push(mac);
  }

  if (voucher.status === 'unused') {
    voucher.status = 'active';
    voucher.activatedAt = now;
    voucher.expiresAt = now + voucher.durationSeconds * 1000;
  }

  const ip = `192.168.1.${crypto.randomInt(125, 248)}`;
  const deviceAudit = parseDeviceAudit(req.headers['user-agent'] || '', customModelHint || '');
  const plan = state.plans.find((p) => p.id === voucher.planId);

  // Find session for this specific (voucherId + MAC) pair so each of the 3 devices has its own audited session!
  let session = state.sessions.find(
    (s) => s.voucherId === voucher.id && s.mac.toUpperCase() === mac
  );
  const ntfySlug = `netpulse-${mac.replace(/:/g, '').toLowerCase().slice(0, 8)}`;
  const slotNumber = voucher.boundMacs.findIndex((m) => m.toUpperCase() === mac) + 1;

  if (!session) {
    session = {
      id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      voucherId: voucher.id,
      voucherCode: voucher.code,
      planName: voucher.planName,
      mac,
      ip,
      hostname: `${deviceAudit.brand}-${deviceAudit.model}`.replace(/\s+/g, '-').slice(0, 28),
      ntfyTopic: ntfySlug,
      deviceAudit,
      connectedAt: now,
      expiresAt: voucher.expiresAt,
      totalMb: voucher.totalMb,
      usedMb: voucher.usedMb,
      deviceUsedMb: 0,
      liveRateKbps: 1450,
      effectiveSpeedMbps: plan ? plan.speedLimitMbps : 25,
      vpnDetected: false,
      vpnProtocol: null,
      vpnPenaltyState: 'none',
      status: 'online',
      alertsSent: { welcome: true, pct80: false, mb100: false, depleted: false },
      messages: [],
    };
    state.sessions.unshift(session);
  } else {
    session.status = 'online';
    session.deviceAudit = deviceAudit;
    session.vpnDetected = false;
    session.vpnPenaltyState = 'none';
  }

  const remMb = Math.max(0, voucher.totalMb - voucher.usedMb);
  const remMs = Math.max(0, voucher.expiresAt - now);

  pushMessageToDevice(
    session,
    'welcome',
    `Connected at ${formatClock(session.connectedAt)} (Device ${slotNumber} of ${maxDevices} allowed on token ${voucher.code})! Shared Remaining Data: ${formatMbReadable(remMb)} | Remaining Time: ${formatRemainingDuration(remMs)}.`
  );

  addAuditLog(
    'DEVICE_AUTH_SUCCESS',
    session,
    `Token ${voucher.code} bound Device ${slotNumber}/${maxDevices} (${deviceAudit.brand} ${deviceAudit.model}, MAC ${mac}). Shared pool: ${Math.round(remMb)} MB left.`
  );

  saveStore(state);
  broadcastSSE('admin', 'state_updated', { reason: 'new_connection', sessionId: session.id });

  res.json({ session: enrichSessionView(session), voucher });
});

// Get live session status for the connected client portal widget
app.get('/api/portal/session/:sessionId', (req, res) => {
  const session = state.sessions.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({
    session: enrichSessionView(session),
    routerConfig: state.routerConfig,
  });
});

// Client Simulator Actions (Test +500MB, 95MB alert, VPN toggle, or Connecting Additional Phones to test 3-device cap!)
app.post('/api/portal/session/:sessionId/simulate', (req, res) => {
  const session = state.sessions.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { action } = req.body || {};
  const voucher = state.vouchers.find((v) => v.id === session.voucherId);

  if (action === 'consume_500mb') {
    const add = 500;
    session.deviceUsedMb = Number(((session.deviceUsedMb || 0) + add).toFixed(2));
    if (voucher) {
      voucher.usedMb = Math.min(voucher.totalMb, Number((voucher.usedMb + add).toFixed(2)));
      session.usedMb = voucher.usedMb;
    } else {
      session.usedMb = Math.min(session.totalMb, Number((session.usedMb + add).toFixed(2)));
    }
    addAuditLog('TRAFFIC_ACCOUNTING', session, `Device ${session.mac} consumed +500 MB from shared token pool.`);
  } else if (action === 'drop_to_95mb') {
    if (voucher) {
      voucher.usedMb = Math.max(0, voucher.totalMb - 95);
      session.usedMb = voucher.usedMb;
    } else {
      session.usedMb = Math.max(0, session.totalMb - 95);
    }
    session.alertsSent.mb100 = false;
  } else if (action === 'exhaust_data') {
    if (voucher) {
      voucher.usedMb = voucher.totalMb;
      session.usedMb = voucher.totalMb;
    } else {
      session.usedMb = session.totalMb;
    }
  } else if (action === 'expire_time') {
    const expiredTs = Date.now() - 1000;
    session.expiresAt = expiredTs;
    if (voucher) voucher.expiresAt = expiredTs;
  } else if (action === 'toggle_vpn') {
    session.vpnDetected = !session.vpnDetected;
    session.vpnProtocol = session.vpnDetected ? 'WireGuard UDP:51820 / OpenVPN' : null;
    if (!session.vpnDetected) {
      addAuditLog('VPN_DISABLED_BY_USER', session, `User turned off VPN tunnel; full speed restored.`);
      pushMessageToDevice(
        session,
        'info',
        `Thank you for turning off your VPN! Full high-speed WiFi (${session.effectiveSpeedMbps} Mbps) has been restored.`
      );
    }
  }

  evaluateStrictEnforcement(0);
  saveStore(state);

  res.json({
    session: enrichSessionView(session),
  });
});

// Router Hardware Heartbeat Sync Endpoint (Called every 10s by /etc/netpulse/enforce.sh on OpenWrt)
app.post('/api/router/sync', (req, res) => {
  const { mac, ip, hostname, bytesUsedDelta, vpnDetected } = req.body || {};
  if (!mac) return res.status(400).json({ action: 'block' });

  const session = state.sessions.find(
    (s) => s.mac.toUpperCase() === mac.toUpperCase() && (s.status === 'online' || s.status === 'throttled_vpn')
  );

  if (!session) {
    return res.json({ action: 'block', reason: 'unauthenticated_or_expired' });
  }

  const voucher = state.vouchers.find((v) => v.id === session.voucherId);
  if (ip) session.ip = ip;
  if (hostname && hostname !== '*') session.hostname = hostname;

  if (typeof bytesUsedDelta === 'number' && bytesUsedDelta > 0) {
    const deltaMb = bytesUsedDelta / (1024 * 1024);
    session.deviceUsedMb = Number(((session.deviceUsedMb || 0) + deltaMb).toFixed(3));
    if (voucher) {
      voucher.usedMb = Number((voucher.usedMb + deltaMb).toFixed(3));
    }
  }

  if (vpnDetected && Number(vpnDetected) > 0) {
    session.vpnDetected = true;
    session.vpnProtocol = 'Router Firewall DPI (UDP 51820/1194/4500)';
  }

  evaluateStrictEnforcement(0);

  if (session.status === 'online') {
    return res.json({ action: 'allow', speedLimitMbps: session.effectiveSpeedMbps });
  }
  if (session.status === 'throttled_vpn') {
    return res.json({ action: 'throttle', rateKbps: state.routerConfig.throttleSpeedKbps });
  }
  return res.json({ action: 'block', reason: session.status });
});

// ============================================================================
// ADMIN CAPABILITIES API
// ============================================================================

app.get('/api/admin/overview', (req, res) => {
  const enrichedSessions = state.sessions.map((s) => enrichSessionView(s));

  const activeCount = enrichedSessions.filter(
    (s) => s.status === 'online' || s.status === 'throttled_vpn'
  ).length;
  const vpnFlaggedCount = enrichedSessions.filter((s) => s.vpnDetected).length;
  const totalRevenueUsd = state.vouchers
    .filter((v) => v.status !== 'unused' && v.status !== 'revoked')
    .reduce((acc, v) => acc + Number(v.priceUsd || 0), 0);
  const totalDataUsedMb = state.vouchers.reduce((acc, v) => acc + Number(v.usedMb || 0), 0);

  res.json({
    stats: {
      activeDevices: activeCount,
      totalSessions: enrichedSessions.length,
      unusedVouchers: state.vouchers.filter((v) => v.status === 'unused').length,
      totalVouchers: state.vouchers.length,
      vpnFlaggedCount,
      totalRevenueUsd: Number(totalRevenueUsd.toFixed(2)),
      totalDataUsedGb: Number((totalDataUsedMb / 1024).toFixed(2)),
    },
    routerConfig: state.routerConfig,
    plans: state.plans,
    vouchers: state.vouchers,
    sessions: enrichedSessions,
    auditLogs: state.auditLogs,
  });
});

// Admin: Create Vouchers on Demand (Includes Custom maxDevices Limit per Token, e.g. 1, 2, 3, 5, 10!)
app.post('/api/admin/vouchers/generate', (req, res) => {
  const {
    planId,
    quantity = 1,
    prefix = 'MT',
    customPlanName,
    priceUsd,
    baseMb,
    bonusMb = 0,
    durationHours,
    maxDevices,
    notes = '',
  } = req.body || {};

  const count = Math.min(500, Math.max(1, Number(quantity) || 1));
  const preset = planId ? state.plans.find((p) => p.id === planId) : null;
  const batchId = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}`;

  const finalPrice = preset ? preset.priceUsd : Number(priceUsd ?? 1);
  const finalBaseMb = preset ? preset.baseMb : Number(baseMb ?? 2048);
  const finalBonusMb = preset ? preset.bonusMb : Number(bonusMb ?? 0);
  const finalTotalMb = finalBaseMb + finalBonusMb;
  const finalHours = preset ? preset.durationHours : Number(durationHours ?? 48);
  // Admin can override maxDevices even on a preset plan!
  const finalMaxDevices = Math.min(
    25,
    Math.max(1, Number(maxDevices || (preset ? preset.maxDevices : 3) || 1))
  );

  const finalName = preset
    ? `${preset.name} ($${preset.priceUsd} • Max ${finalMaxDevices} Dev)`
    : customPlanName ||
      `Custom $${finalPrice} • ${(finalBaseMb / 1024).toFixed(1)}GB${
        finalBonusMb > 0 ? ` + ${(finalBonusMb / 1024).toFixed(1)}GB Free` : ''
      } (${finalHours}h • ${finalMaxDevices} Dev)`;

  const existingCodes = new Set(state.vouchers.map((v) => v.code));
  const created = [];
  for (let i = 0; i < count; i++) {
    let uniqueCode = generateTokenCode(prefix.toUpperCase().slice(0, 4) || 'NP');
    while (existingCodes.has(uniqueCode)) {
      uniqueCode = generateTokenCode(prefix.toUpperCase().slice(0, 4) || 'NP');
    }
    existingCodes.add(uniqueCode);

    const v = {
      id: `v-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      batchId,
      code: uniqueCode,
      planId: preset ? preset.id : 'custom',
      planName: finalName,
      priceUsd: finalPrice,
      baseMb: finalBaseMb,
      bonusMb: finalBonusMb,
      totalMb: finalTotalMb,
      usedMb: 0,
      durationSeconds: Math.round(finalHours * 3600),
      maxDevices: finalMaxDevices,
      boundMacs: [],
      status: 'unused',
      createdAt: Date.now(),
      activatedAt: null,
      expiresAt: null,
      notes,
    };
    state.vouchers.unshift(v);
    created.push(v);
  }

  addAuditLog(
    'ADMIN_BULK_VOUCHERS_CREATED',
    { deviceSummary: 'Admin App / Console' },
    `Bulk generated ${created.length} voucher(s) [${batchId}] for "${finalName}" (Max ${finalMaxDevices} device(s) per token, ${finalTotalMb} MB pool, ${finalHours}h).`
  );
  saveStore(state);
  broadcastSSE('admin', 'state_updated', { reason: 'vouchers_created', batchId });

  res.json({ batchId, created });
});

// Admin: Update maxDevices limit or clear bound device slots on an existing voucher!
app.post('/api/admin/vouchers/:id/devices', (req, res) => {
  const voucher = state.vouchers.find((v) => v.id === req.params.id);
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' });

  const { maxDevices, removeMac } = req.body || {};

  if (typeof maxDevices === 'number' && maxDevices >= 1) {
    voucher.maxDevices = Math.min(25, Math.max(1, Math.round(maxDevices)));
    addAuditLog(
      'ADMIN_UPDATED_TOKEN_DEVICE_CAP',
      { voucherCode: voucher.code },
      `Updated device connection limit on token ${voucher.code} to Max ${voucher.maxDevices} device(s).`
    );
  }

  if (removeMac) {
    voucher.boundMacs = (voucher.boundMacs || []).filter(
      (m) => m.toUpperCase() !== removeMac.toUpperCase()
    );
    const linkedSession = state.sessions.find(
      (s) => s.voucherId === voucher.id && s.mac.toUpperCase() === removeMac.toUpperCase()
    );
    if (linkedSession) {
      linkedSession.status = 'disconnected_admin';
      linkedSession.liveRateKbps = 0;
    }
    addAuditLog(
      'ADMIN_FREED_DEVICE_SLOT',
      { voucherCode: voucher.code, mac: removeMac },
      `Released MAC ${removeMac} from token ${voucher.code} (${voucher.boundMacs.length}/${voucher.maxDevices} slots used).`
    );
  }

  saveStore(state);
  res.json({ voucher });
});

// Admin: Create a new Lure / Mixed Pricing Plan (with maxDevices per token!)
app.post('/api/admin/plans', (req, res) => {
  const {
    name,
    category = 'lure',
    priceUsd = 1,
    baseGb = 2,
    bonusGb = 1,
    durationHours = 48,
    maxDevices = 3,
    speedLimitMbps = 25,
    badge = 'SPECIAL BONUS',
  } = req.body || {};

  if (!name) return res.status(400).json({ error: 'Plan name is required' });

  const baseMb = Math.round(Number(baseGb) * 1024);
  const bonusMb = Math.round(Number(bonusGb) * 1024);
  const devCap = Math.min(25, Math.max(1, Number(maxDevices) || 1));
  const daysText =
    durationHours >= 24 && durationHours % 24 === 0
      ? `${durationHours / 24} Day${durationHours / 24 > 1 ? 's' : ''}`
      : `${durationHours} Hours`;

  const newPlan = {
    id: `plan-${Date.now()}`,
    name,
    category,
    priceUsd: Number(priceUsd),
    baseMb,
    bonusMb,
    durationHours: Number(durationHours),
    maxDevices: devCap,
    speedLimitMbps: Number(speedLimitMbps),
    badge,
    tagline: `$${priceUsd} for ${daysText} • ${baseGb}GB${
      Number(bonusGb) > 0 ? ` + ${bonusGb}GB FREE` : ''
    } (Up to ${devCap} Device${devCap > 1 ? 's' : ''})`,
    highlight: Number(bonusGb) > 0 || devCap > 1,
  };

  state.plans.unshift(newPlan);
  addAuditLog('ADMIN_PLAN_CREATED', { deviceSummary: 'Admin App' }, `Created new plan: ${newPlan.tagline}`);
  saveStore(state);
  res.json({ plan: newPlan });
});

// Admin: Revoke Voucher (Disconnects all devices bound to it)
app.post('/api/admin/vouchers/:id/revoke', (req, res) => {
  const voucher = state.vouchers.find((v) => v.id === req.params.id);
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' });

  voucher.status = 'revoked';
  for (const session of state.sessions) {
    if (
      session.voucherId === voucher.id &&
      (session.status === 'online' || session.status === 'throttled_vpn')
    ) {
      session.status = 'disconnected_admin';
      session.liveRateKbps = 0;
      pushMessageToDevice(session, 'cutoff', 'Your voucher has been revoked by the WiFi Administrator.');
    }
  }
  addAuditLog('ADMIN_VOUCHER_REVOKED', { voucherCode: voucher.code }, `Revoked voucher ${voucher.code} across all bound devices.`);
  saveStore(state);
  res.json({ voucher });
});

// Admin: Bulk Revoke an Entire Batch of Vouchers
app.post('/api/admin/vouchers/batch/:batchId/revoke', (req, res) => {
  const { batchId } = req.params;
  let revokedCount = 0;
  for (const v of state.vouchers) {
    if (v.batchId === batchId && v.status !== 'revoked') {
      v.status = 'revoked';
      revokedCount++;
      for (const s of state.sessions) {
        if (s.voucherId === v.id && (s.status === 'online' || s.status === 'throttled_vpn')) {
          s.status = 'disconnected_admin';
          s.liveRateKbps = 0;
        }
      }
    }
  }
  addAuditLog(
    'ADMIN_BATCH_REVOKED',
    { deviceSummary: 'Admin App' },
    `Bulk revoked ${revokedCount} voucher(s) in batch ${batchId}.`
  );
  saveStore(state);
  res.json({ batchId, revokedCount });
});

// Admin: Send Live Usage/Custom Notification Message
app.post('/api/admin/sessions/:id/message', async (req, res) => {
  const { customText } = req.body || {};
  if (req.params.id === 'broadcast-all') {
    const active = state.sessions.filter((s) => s.status === 'online' || s.status === 'throttled_vpn');
    for (const s of active) {
      await pushMessageToDevice(s, 'admin_notice', customText || null);
    }
    addAuditLog(
      'ADMIN_BROADCAST_MSG',
      { deviceSummary: 'Admin App' },
      `Sent live usage & remaining GB/hrs notification to ${active.length} active device(s).`
    );
    saveStore(state);
    return res.json({ sentCount: active.length });
  }

  const session = state.sessions.find((s) => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const msg = await pushMessageToDevice(session, 'admin_notice', customText || null);
  addAuditLog(
    'ADMIN_DEVICE_MSG_SENT',
    session,
    `Sent notification to ${session.deviceAudit.model}: "${msg.text}"`
  );
  saveStore(state);
  res.json({ message: msg });
});

// Admin: Control Connected Device (Disconnect, Release Slot so another phone can join, Restore, Gift +500MB)
app.post('/api/admin/sessions/:id/action', (req, res) => {
  const session = state.sessions.find((s) => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const { action } = req.body || {};
  const voucher = state.vouchers.find((v) => v.id === session.voucherId);

  if (action === 'disconnect') {
    session.status = 'disconnected_admin';
    session.liveRateKbps = 0;
    session.effectiveSpeedMbps = 0;
    addAuditLog('ADMIN_DISCONNECTED_DEVICE', session, `Admin disconnected ${session.mac}.`);
    pushMessageToDevice(session, 'cutoff', `Your device has been disconnected by the network administrator.`);
  } else if (action === 'release_slot') {
    // Disconnects AND frees its MAC slot from voucher.boundMacs so another device can use the 3-device slot!
    session.status = 'disconnected_admin';
    session.liveRateKbps = 0;
    if (voucher && Array.isArray(voucher.boundMacs)) {
      voucher.boundMacs = voucher.boundMacs.filter(
        (m) => m.toUpperCase() !== session.mac.toUpperCase()
      );
    }
    addAuditLog(
      'ADMIN_FREED_DEVICE_SLOT',
      session,
      `Disconnected ${session.mac} & freed 1 device slot on token ${session.voucherCode} (${voucher?.boundMacs.length || 0}/${voucher?.maxDevices || 1} used).`
    );
  } else if (action === 'reconnect') {
    const used = voucher ? voucher.usedMb : session.usedMb;
    const total = voucher ? voucher.totalMb : session.totalMb;
    if (used < total && session.expiresAt > Date.now()) {
      if (voucher && !voucher.boundMacs.includes(session.mac)) {
        if (voucher.boundMacs.length >= (voucher.maxDevices || 1)) {
          return res.status(403).json({ error: 'Token device slots are already full!' });
        }
        voucher.boundMacs.push(session.mac);
      }
      session.status = 'online';
      session.vpnDetected = false;
      session.vpnPenaltyState = 'none';
      session.effectiveSpeedMbps = 25;
      addAuditLog('ADMIN_RESTORED_DEVICE', session, `Admin re-authorized ${session.mac} on router firewall.`);
    }
  } else if (action === 'simulate_vpn') {
    session.vpnDetected = !session.vpnDetected;
    session.vpnProtocol = session.vpnDetected ? 'OpenVPN/WireGuard Tunnel' : null;
    evaluateStrictEnforcement(0);
  } else if (action === 'gift_500mb') {
    if (voucher) {
      voucher.bonusMb += 500;
      voucher.totalMb += 500;
      for (const s of state.sessions) {
        if (s.voucherId === voucher.id) {
          s.totalMb = voucher.totalMb;
          if (s.status === 'disconnected_quota') s.status = 'online';
        }
      }
    } else {
      session.totalMb += 500;
    }
    pushMessageToDevice(
      session,
      'lure_gift',
      `BONUS GIFT! Admin just added +500 MB FREE Bonus Data to your voucher! Shared Remaining Data: ${Math.round((voucher ? voucher.totalMb - voucher.usedMb : session.totalMb - session.usedMb))} MB.`
    );
    addAuditLog('ADMIN_GIFTED_DATA', session, `Gifted +500 MB lure bonus to token ${session.voucherCode}.`);
  }

  saveStore(state);
  res.json({ session: enrichSessionView(session) });
});

app.post('/api/admin/config', (req, res) => {
  const updates = req.body || {};
  state.routerConfig = {
    ...state.routerConfig,
    ...updates,
  };
  evaluateStrictEnforcement(0);
  addAuditLog(
    'ROUTER_CONFIG_UPDATED',
    { deviceSummary: 'Admin App' },
    `Updated router config: SSID="${state.routerConfig.ssidName}", Anti-VPN="${state.routerConfig.vpnPolicy}".`
  );
  saveStore(state);
  res.json({ routerConfig: state.routerConfig });
});

app.post('/api/admin/reset-demo', (req, res) => {
  state = resetStore();
  res.json({ ok: true, state });
});

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NetPulse WiFi Voucher & Router Controller API listening on 0.0.0.0:${PORT}`);
});
