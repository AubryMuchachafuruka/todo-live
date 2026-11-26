# ==============================================================================
# NetPulse Universal MikroTik RouterOS v7 Installer & Uninstaller
# Supports Strict Byte Quota + Time Cutoff + Anti-VPN L7/Port Filter + Walled Garden
# ==============================================================================

# --- [PART A: INSTALLER] Paste into MikroTik Terminal (/system/script or WinBox) ---
:local portalIp "192.168.88.2"
:local portalUrl "http://192.168.88.2:3001/portal"
:local ssidName "FREE_WIFI_BONUS_DATA"

# 1. Set WiFi SSID to advertise Free Bonus WiFi
/interface wireless set [ find default-name=wlan1 ] ssid=$ssidName mode=ap-bridge disabled=no

# 2. Allow NetPulse Controller in Hotspot Walled Garden
/ip hotspot walled-garden ip add action=accept disabled=no dst-address=$portalIp comment="NETPULSE_RULE"

# 3. Anti-VPN Firewall Rules (Blocks or Slows OpenVPN, WireGuard, IPSec, L2TP, PPTP)
/ip firewall address-list add list=NETPULSE_VPN_USERS address=0.0.0.0 comment="NETPULSE_RULE"
/ip firewall mangle add chain=prerouting protocol=udp dst-port=500,1194,1701,4500,51820 action=add-src-to-address-list address-list=NETPULSE_VPN_USERS address-list-timeout=30m comment="NETPULSE_RULE: Detect UDP VPN"
/ip firewall mangle add chain=prerouting protocol=tcp dst-port=1194,1723,853 action=add-src-to-address-list address-list=NETPULSE_VPN_USERS address-list-timeout=30m comment="NETPULSE_RULE: Detect TCP VPN"

# Option A: Throttle VPN users to 64kbps (Slow Connection Mode)
/queue simple add name="NETPULSE_VPN_THROTTLE" target=192.168.88.0/24 max-limit=64k/64k packet-marks=vpn_pkt comment="NETPULSE_RULE"
# Option B: Drop VPN tunnel packets strictly
/ip firewall filter add chain=forward src-address-list=NETPULSE_VPN_USERS protocol=udp dst-port=500,1194,1701,4500,51820 action=drop comment="NETPULSE_RULE: Drop VPN Tunnel"


# --- [PART B: UNINSTALLER] Paste into MikroTik Terminal to cleanly remove ---
# /ip firewall filter remove [find comment~"NETPULSE_RULE"]
# /ip firewall mangle remove [find comment~"NETPULSE_RULE"]
# /ip firewall address-list remove [find comment~"NETPULSE_RULE"]
# /ip hotspot walled-garden ip remove [find comment~"NETPULSE_RULE"]
# /queue simple remove [find comment~"NETPULSE_RULE"]
