#!/usr/bin/env bash

#------------------------------------------------------------------------------
# Usage
#------------------------------------------------------------------------------
# 1. Copy this script to the kiosk host (e.g. /srv/rpi-kiosk-launch.sh) and make
#    it executable: chmod +x /srv/rpi-kiosk-launch.sh.
# 2. Ensure the following environment variables are exported for the kiosk user:
#      - SERVER_IP (required): IP/hostname to ping and verify via HTTP.
#      - SERVER_HTTP_URL (optional): Full health-check URL; defaults to
#        http://SERVER_IP.
#      - KIOSK_URL (optional): Page to open in Chromium; defaults to SERVER_HTTP_URL.
#      - XDG_RUNTIME_DIR (recommended): PulseAudio runtime path; defaults to
#        /run/user/<uid> when unset.
#    Persist them via /etc/environment or a sourced file (e.g. ~/.profile). Example
#    /etc/environment snippet (adjust values):
#      SERVER_IP=192.168.1.50
#      SERVER_HTTP_URL=http://192.168.1.50/health
#      KIOSK_URL=http://192.168.1.50/queue
#      XDG_RUNTIME_DIR=/run/user/1000
# 3. Integrate with LXDE autostart by adding this line to
#    /home/<user>/.config/lxsession/LXDE-pi/autostart:
#      @/srv/rpi-kiosk-launch.sh
#    Adjust the user path if you run under an account other than "pi".
# 4. Install OS-level dependencies on Raspberry Pi OS (Bullseye or earlier):
#      sudo apt-get update && \
#      sudo apt-get install -y chromium-browser xserver-xorg lxsession x11-xserver-utils \
#        pulseaudio-utils curl jq
#    (jq is optional, but handy for future JSON health checks.)
# 5. Reboot or restart the graphical session to confirm the kiosk launches with
#    mirrored 1080p displays, Chromium in fullscreen, and volume at 95%.

set -euo pipefail

log() {
  printf '%s [%s] %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "${USER:-unknown}" "$*" >&2
}

configure_volume() {
  if ! command -v amixer >/dev/null 2>&1; then
    log "amixer command not available; skipping volume configuration"
    return
  fi

  if [ -z "${XDG_RUNTIME_DIR:-}" ]; then
    user_uid=$(id -u "${USER:-pi}" 2>/dev/null || echo 1000)
    export XDG_RUNTIME_DIR="/run/user/${user_uid}"
    log "XDG_RUNTIME_DIR not set; defaulting to $XDG_RUNTIME_DIR"
  fi

  log "Configuring ALSA/PulseAudio volume to 95%"
  amixer -D pulse sset Master unmute || log "Failed to unmute Master via PulseAudio"
  amixer -D pulse sset Master 95% || log "Failed to set Master volume via PulseAudio"
}

#------------------------------------------------------------------------------
# Configuration via environment variables
#------------------------------------------------------------------------------
: "${SERVER_IP:?Set SERVER_IP to the host/IP address that should respond to ping}"
SERVER_HTTP_URL=${SERVER_HTTP_URL:-http://$SERVER_IP}
KIOSK_URL=${KIOSK_URL:-$SERVER_HTTP_URL}
DISPLAY_NAME=${DISPLAY:-:0}
XAUTHORITY_FILE=${XAUTHORITY:-/home/${USER:-pi}/.Xauthority}
TARGET_RESOLUTION=${TARGET_RESOLUTION:-1920x1080}
TARGET_RATE=${TARGET_RATE:-60}
PING_RETRY_INTERVAL=${PING_RETRY_INTERVAL:-5}
HTTP_RETRY_INTERVAL=${HTTP_RETRY_INTERVAL:-5}
MAX_WAIT_SECONDS=${MAX_WAIT_SECONDS:-0}  # 0 means wait indefinitely

export DISPLAY="$DISPLAY_NAME"
export XAUTHORITY="$XAUTHORITY_FILE"

log "Waiting for network reachability of $SERVER_IP"

#------------------------------------------------------------------------------
# Wait until ping succeeds and the HTTP endpoint returns a successful response
#------------------------------------------------------------------------------
start_time=$(date +%s)
while true; do
  if ping -c1 -W2 "$SERVER_IP" >/dev/null 2>&1; then
    if curl -fsS --max-time 5 --retry 0 "$SERVER_HTTP_URL" >/dev/null; then
      log "Network reachability confirmed for $SERVER_HTTP_URL"
      break
    fi
    log "Ping succeeded but HTTP check failed for $SERVER_HTTP_URL; retrying in ${HTTP_RETRY_INTERVAL}s"
    sleep "$HTTP_RETRY_INTERVAL"
  else
    log "Ping failed for $SERVER_IP; retrying in ${PING_RETRY_INTERVAL}s"
    sleep "$PING_RETRY_INTERVAL"
  fi

  if (( MAX_WAIT_SECONDS > 0 )); then
    now=$(date +%s)
    elapsed=$(( now - start_time ))
    if (( elapsed >= MAX_WAIT_SECONDS )); then
      log "Timed out after ${MAX_WAIT_SECONDS}s while waiting for network; exiting"
      exit 1
    fi
  fi
done

#------------------------------------------------------------------------------
# Configure displays to 1080p and mirror if multiple outputs are present
#------------------------------------------------------------------------------
if command -v xrandr >/dev/null 2>&1; then
  for attempt in {1..10}; do
    if xrandr --query >/dev/null 2>&1; then
      break
    fi
    log "Display server not ready (attempt ${attempt}/10); retrying in 2s"
    sleep 2
  done

  if xrandr --query >/dev/null 2>&1; then
    mapfile -t outputs < <(xrandr --query | awk '/ connected/{print $1}')
    if ((${#outputs[@]} > 0)); then
      primary=${outputs[0]}
      args=()
      for output in "${outputs[@]}"; do
        if [ "$output" = "$primary" ]; then
          args+=(--output "$output" --mode "$TARGET_RESOLUTION" --rate "$TARGET_RATE" --primary)
        else
          args+=(--output "$output" --mode "$TARGET_RESOLUTION" --rate "$TARGET_RATE" --same-as "$primary")
        fi
      done
      if ! xrandr "${args[@]}"; then
        log "Failed to apply ${TARGET_RESOLUTION}@${TARGET_RATE} to displays: ${outputs[*]}"
      else
        log "Applied ${TARGET_RESOLUTION}@${TARGET_RATE} to displays: ${outputs[*]}"
      fi
    else
      log "No connected displays reported by xrandr"
    fi
  else
    log "Display server still unavailable; skipping xrandr configuration"
  fi
else
  log "xrandr not available; cannot configure display resolution/mirroring"
fi

# Disable screen blanking and power management if xset is present
if command -v xset >/dev/null 2>&1; then
  xset s off || true
  xset -dpms || true
  xset s noblank || true
fi

#------------------------------------------------------------------------------
# Configure audio volume
#------------------------------------------------------------------------------
configure_volume

#------------------------------------------------------------------------------
# Launch Chromium in kiosk mode
#------------------------------------------------------------------------------
CHROMIUM_BIN=""
if command -v chromium-browser >/dev/null 2>&1; then
  CHROMIUM_BIN=$(command -v chromium-browser)
elif command -v chromium >/dev/null 2>&1; then
  CHROMIUM_BIN=$(command -v chromium)
fi

if [ -z "$CHROMIUM_BIN" ]; then
  log "Chromium is not installed; cannot start kiosk"
  exit 1
fi

log "Starting Chromium kiosk for $KIOSK_URL"
# Terminate existing Chromium instances for a clean start
pkill -f "$CHROMIUM_BIN" >/dev/null 2>&1 || true

# Give the window manager a moment to settle
sleep 2

"$CHROMIUM_BIN" \
  --kiosk "$KIOSK_URL" \
  --start-fullscreen \
  --noerrdialogs \
  --disable-session-crashed-bubble \
  --disable-infobars \
  --check-for-update-interval=31536000 \
  --simulate-outdated-no-au="Tue, 31 Dec 2099 23:59:59 GMT" \
  --disable-translate \
  --disable-features=TranslateUI \
  --disable-component-update \
  --overscroll-history-navigation=0 \
  --disable-pinch \
  --enable-features=OverlayScrollbar \
  --incognito \
  --autoplay-policy=no-user-gesture-required \
  --window-position=0,0 \
  --window-size=${TARGET_RESOLUTION/x/,} \
  --user-data-dir=/tmp/chromium-kiosk-data \
  --allow-running-insecure-content \
  --ignore-certificate-errors \
  >/tmp/chromium-kiosk.log 2>&1 &

log "Chromium kiosk started with PID $!"
