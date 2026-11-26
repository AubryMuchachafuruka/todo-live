# NetPulse Universal Router WiFi Voucher, Anti-VPN & Mobile Admin System

A complete, production-ready Captive Portal, Strict Time + GB Voucher Token Engine, Anti-VPN Firewall Enforcer, Free Push Notification System, and Mobile-Installable React Admin PWA (`Android` + `Web`) designed to work with **any router**.

## Key Capabilities Built

1. **Mixed & Luring WiFi Token Plans**
   - **$1 Lure Promo Starter**: `2GB + 1GB FREE Bonus` (`3GB Total`) for **2 Days** (`48h`).
   - **$2 Heavy Streamer**: `5GB + 512MB FREE Bonus` for **2 Days** (More Data, Less Days).
   - **$2 Express Burst**: `3GB` High-Speed for **24 Hours**.
   - **$2 Long-Stay Saver**: `2GB + 256MB Free` for **7 Full Days** (More Days, Less Data).
   - **$3 Mega Lure**: `5GB + 2GB FREE Bonus` (`7GB Total`) for **3 Days**.
   - Admin can create custom packages & generate single or batch vouchers (`1–50` at once) on demand + export CSV for voucher slips.

2. **Strict Dual Allocation Enforcement (Zero GB or Time Overage)**
   - Tracks exact upload + download bytes per bound MAC address and exact second-level expiration timestamps.
   - Whichever hits `0` first (**0 MB left** OR **0 seconds left**) triggers immediate MAC eviction from `@authorized_macs` in `nftables`.
   - Single-device MAC locking prevents one voucher from being shared across multiple phones.

3. **Free Device Push Notifications (Remaining Hours & Remaining GB)**
   - Uses **100% Free APIs**:
     1. **Local LAN Server-Sent Events (SSE)** + **W3C Browser Notification API** (zero internet or paid SMS API needed).
     2. **Free `ntfy.sh` Open-Source HTTP Push API** (zero API key, free Android/iOS background notifications).
   - Automatically sends low-quota messages (e.g., at `<= 100 MB` left):
     > *"Note: Connected at 02:00 PM | Remaining Data: 100 MB | Remaining Time: 43h 00m. Thank you, please come again!"*

4. **Strict Anti-VPN Detection & Penalty (Slow to 64 Kbps or Instant Disconnect)**
   - Router firewall rules detect WireGuard (`UDP 51820`), OpenVPN (`TCP/UDP 1194`), IPSec/IKEv2 (`UDP 500/4500`), L2TP (`UDP 1701`), PPTP (`TCP 1723` / `GRE`), and DNS-over-TLS (`TCP 853`).
   - Admin can toggle between **Throttle Mode** (`tc` HTB queue slows the phone to `64 Kbps`) or **Strict Disconnect Mode** (immediate firewall drop).

5. **Self-Advertising Free WiFi + Full Phone Type Security Audit**
   - Broadcasts an open luring SSID (default `FREE_WIFI_GET_1GB_BONUS`) with RFC 8910 DHCP Option `114` so phones automatically pop open the Token Sign-In Portal.
   - Every device is fingerprinted and logged for audit: **Phone Brand & Model** (Samsung, TECNO, Infinix, Apple iPhone, Xiaomi, Windows/Mac), **OS version**, **Browser**, **MAC**, **IP**, **Voucher Token**, and security events.

6. **Easiest Anywhere Admin App (Web + Installable Android PWA)**
   - Built in React + Tailwind with a Progressive Web App (`manifest.json` + `sw.js`) so the admin can open it in any browser or tap **"Add to Home screen / Install App"** on Android for a native full-screen app experience anywhere.

---

## Router Installation & Clean Uninstallation

- **OpenWrt / GL.iNet / Linux Routers**:
  - Install: `router-scripts/install-openwrt.sh`
  - Clean Uninstall (restores automatic backups of wireless, DHCP & firewall): `router-scripts/uninstall-openwrt.sh`
- **MikroTik RouterOS v6/v7**:
  - Install & 1-command tagged uninstall: `router-scripts/mikrotik-routeros.rsc`
- **Any Locked Stock / ISP Router**:
  - Put stock WiFi router in **AP / Bridge Mode** (DHCP off) connected to a Raspberry Pi / Mini-PC running `npm start`.

## Running Locally

```bash
npm install
npm run dev
```
