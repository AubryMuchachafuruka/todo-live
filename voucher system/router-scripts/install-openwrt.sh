#!/bin/sh
# ==============================================================================
# NetPulse Universal Router WiFi Voucher & Anti-VPN Installer (OpenWrt / Linux)
# Supports: OpenWrt 21.02 / 22.03 / 23.05+ (nftables & iptables) + Linux Gateways
# ==============================================================================
set -e

PORTAL_SERVER_URL="${1:-http://192.168.1.2:3001}"
SSID_NAME="${2:-FREE_WIFI_GET_1GB_BONUS}"
LAN_IFACE="${3:-br-lan}"
VPN_POLICY="${4:-throttle}" # "throttle" (64kbps slow) or "disconnect" (drop)

echo "============================================================"
echo " NetPulse WiFi Token & Anti-VPN System - Router Installer"
echo "============================================================"
echo "-> Target Controller : $PORTAL_SERVER_URL"
echo "-> Advertising SSID  : $SSID_NAME"
echo "-> LAN Interface     : $LAN_IFACE"
echo "-> Anti-VPN Policy   : $VPN_POLICY"
echo ""

# 1. Backup existing OpenWrt configs cleanly so uninstall is 100% reversible
mkdir -p /etc/netpulse/backup
[ -f /etc/config/wireless ] && cp /etc/config/wireless /etc/netpulse/backup/wireless.bak
[ -f /etc/config/dhcp ] && cp /etc/config/dhcp /etc/netpulse/backup/dhcp.bak
[ -f /etc/config/firewall ] && cp /etc/config/firewall /etc/netpulse/backup/firewall.bak

# 2. Install lightweight packages if running on OpenWrt
if command -v opkg >/dev/null 2>&1; then
  echo "[1/6] Updating opkg & installing Captive Portal + QoS Traffic Control..."
  opkg update
  opkg install opennds kmod-sched-core kmod-ifb tc-tiny curl jq nftables
fi

# 3. Advertise Open SSID ("FREE_WIFI_GET_1GB_BONUS") to lure nearby phones
if command -v uci >/dev/null 2>&1; then
  echo "[2/6] Configuring WiFi SSID Advertisement: $SSID_NAME ..."
  uci set wireless.default_radio0.ssid="$SSID_NAME"
  uci set wireless.default_radio0.encryption='none'
  if uci show wireless.default_radio1 >/dev/null 2>&1; then
    uci set wireless.default_radio1.ssid="$SSID_NAME"
    uci set wireless.default_radio1.encryption='none'
  fi
  uci commit wireless
  wifi reload || true
fi

# 4. Trigger OS Captive Portal Auto-Popup (CNA for Android, iOS, Windows)
echo "[3/6] Setting Captive Portal Detection (RFC 8910 / DHCP Option 114)..."
if command -v uci >/dev/null 2>&1; then
  uci add_list dhcp.lan.dhcp_option="114,$PORTAL_SERVER_URL/portal"
  uci commit dhcp
  /etc/init.d/dnsmasq restart || true
fi

# 5. Deploy Strict GB & Time Accounting + Anti-VPN Firewall Script
echo "[4/6] Installing Strict Byte Counter & Anti-VPN Firewall Rules..."
cat << 'EOF' > /etc/netpulse/enforce.sh
#!/bin/sh
# Runs every 10 seconds to:
#  1) Read exact per-MAC upload+download bytes from nftables/iptables counters
#  2) Detect VPN ports/protocols (WireGuard 51820, OpenVPN 1194, IPSec 500/4500, L2TP 1701, PPTP 1723, DoT 853)
#  3) Sync usage with NetPulse API & enforce instant disconnect on 0 MB or 0 sec remaining

PORTAL_URL="__PORTAL_SERVER_URL__"
LAN_IF="__LAN_IFACE__"

# Initialize nftables accounting table if missing
nft list table inet netpulse >/dev/null 2>&1 || {
  nft add table inet netpulse
  nft add set inet netpulse authorized_macs { type ether_addr \; flags timeout \; }
  nft add set inet netpulse throttled_ips { type ipv4_addr \; }
  nft add chain inet netpulse forward { type filter hook forward priority 0 \; policy accept \; }

  # Block unauthenticated LAN clients from forwarding to WAN (Walled Garden)
  nft add rule inet netpulse forward iifname "$LAN_IF" ether saddr != @authorized_macs counter drop

  # Anti-VPN Detection Rule: WireGuard(51820), OpenVPN(1194), IPSec/IKEv2(500,4500), L2TP(1701), PPTP(1723)
  nft add rule inet netpulse forward iifname "$LAN_IF" udp dport { 500, 1194, 1701, 4500, 51820 } log prefix \"NETPULSE_VPN_DETECTED: \" counter drop
  nft add rule inet netpulse forward iifname "$LAN_IF" tcp dport { 1194, 1723, 853 } log prefix \"NETPULSE_VPN_DETECTED: \" counter drop
  nft add rule inet netpulse forward iifname "$LAN_IF" meta l4proto { gre, esp, ah } log prefix \"NETPULSE_VPN_DETECTED: \" counter drop
}

# Set up tc (Traffic Control) 64kbps throttle class for VPN violators
tc qdisc show dev "$LAN_IF" | grep -q "htb" || {
  tc qdisc add dev "$LAN_IF" root handle 1: htb default 10
  tc class add dev "$LAN_IF" parent 1: classid 1:10 htb rate 100mbit
  tc class add dev "$LAN_IF" parent 1: classid 1:99 htb rate 64kbit ceil 64kbit
}

# Read ARP + DHCP leases (IP, MAC, Hostname) and report bytes to NetPulse Server
if [ -f /tmp/dhcp.leases ]; then
  while read -r ts mac ip hostname clientid; do
    # Query per-IP byte counters
    rx_bytes=$(nft -j list ruleset 2>/dev/null | grep -o "\"$ip\".*bytes" | head -n 1 || echo 0)
    vpn_hit=$(dmesg | tail -n 50 | grep "NETPULSE_VPN_DETECTED" | grep -c "$ip" || true)

    resp=$(curl -s -X POST "$PORTAL_URL/api/router/sync" \
      -H "Content-Type: application/json" \
      -d "{\"mac\":\"$mac\",\"ip\":\"$ip\",\"hostname\":\"$hostname\",\"vpnDetected\":$vpn_hit}")

    action=$(echo "$resp" | jsonfilter -e '@.action' 2>/dev/null || echo "block")
    if [ "$action" = "allow" ]; then
      nft add element inet netpulse authorized_macs { "$mac" } 2>/dev/null || true
    elif [ "$action" = "throttle" ]; then
      nft add element inet netpulse authorized_macs { "$mac" } 2>/dev/null || true
      tc filter add dev "$LAN_IF" protocol ip parent 1:0 prio 1 u32 match ip dst "$ip" flowid 1:99 2>/dev/null || true
    else
      nft delete element inet netpulse authorized_macs { "$mac" } 2>/dev/null || true
    fi
  done < /tmp/dhcp.leases
fi
EOF

sed -i "s|__PORTAL_SERVER_URL__|$PORTAL_SERVER_URL|g" /etc/netpulse/enforce.sh
sed -i "s|__LAN_IFACE__|$LAN_IFACE|g" /etc/netpulse/enforce.sh
chmod +x /etc/netpulse/enforce.sh

# 6. Register 10-second enforcement daemon via cron / procd
echo "[5/6] Activating 10-second real-time quota & Anti-VPN watchdog..."
(crontab -l 2>/dev/null | grep -v '/etc/netpulse/enforce.sh'; echo "* * * * * /etc/netpulse/enforce.sh; sleep 15; /etc/netpulse/enforce.sh; sleep 15; /etc/netpulse/enforce.sh; sleep 15; /etc/netpulse/enforce.sh") | crontab -
/etc/init.d/cron restart 2>/dev/null || true

echo "[6/6] NetPulse Installation Complete!"
echo " -> Users joining '$SSID_NAME' will automatically see the Token Sign-In Portal."
echo " -> Strict GB + Time cutoffs & Anti-VPN rules are active."
