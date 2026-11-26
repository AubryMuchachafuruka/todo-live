#!/bin/sh
# ==============================================================================
# NetPulse Clean Router Uninstaller (OpenWrt / Linux Gateway)
# Restores original WiFi SSID, DHCP, Firewall, and removes all QoS/nftables rules
# ==============================================================================
set -e

LAN_IFACE="${1:-br-lan}"

echo "============================================================"
echo " NetPulse WiFi System - Clean Uninstaller"
echo "============================================================"

# 1. Remove cron watchdog
echo "[1/5] Stopping NetPulse quota & Anti-VPN watchdog..."
if crontab -l >/dev/null 2>&1; then
  crontab -l | grep -v '/etc/netpulse/enforce.sh' | crontab - || true
  /etc/init.d/cron restart 2>/dev/null || true
fi

# 2. Flush NetPulse nftables table & Traffic Control (tc) rules without touching default firewall
echo "[2/5] Removing NetPulse nftables & Traffic Control QoS rules..."
nft delete table inet netpulse 2>/dev/null || true
tc qdisc del dev "$LAN_IFACE" root 2>/dev/null || true

# 3. Stop openNDS if installed
echo "[3/5] Disabling Captive Portal hooks..."
if [ -f /etc/init.d/opennds ]; then
  /etc/init.d/opennds stop || true
  /etc/init.d/opennds disable || true
fi

# 4. Restore backed-up OpenWrt wireless, DHCP, and firewall configs
echo "[4/5] Restoring original Wireless, DHCP & Firewall configurations..."
if [ -d /etc/netpulse/backup ]; then
  [ -f /etc/netpulse/backup/wireless.bak ] && cp /etc/netpulse/backup/wireless.bak /etc/config/wireless
  [ -f /etc/netpulse/backup/dhcp.bak ] && cp /etc/netpulse/backup/dhcp.bak /etc/config/dhcp
  [ -f /etc/netpulse/backup/firewall.bak ] && cp /etc/netpulse/backup/firewall.bak /etc/config/firewall
  wifi reload 2>/dev/null || true
  /etc/init.d/dnsmasq restart 2>/dev/null || true
  /etc/init.d/firewall restart 2>/dev/null || true
fi

# 5. Remove /etc/netpulse directory
echo "[5/5] Cleaning up /etc/netpulse files..."
rm -rf /etc/netpulse

echo "Uninstall Complete! Router has been restored to factory/pre-NetPulse state."
