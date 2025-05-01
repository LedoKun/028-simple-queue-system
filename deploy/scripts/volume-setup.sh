#!/usr/bin/env bash
# /srv/volume-setup.sh
set -euo pipefail

# Ensure critical environment variables are present
: "${USER:?Environment variable USER must be set}"  
: "${XDG_RUNTIME_DIR:?Environment variable XDG_RUNTIME_DIR must be set}"  

# (Optional) Export TZ if you want time-based logging inside the script
export TZ=${TZ:-Asia/Bangkok}

# Log start
echo "$(date +'%Y-%m-%d %H:%M:%S') [${USER}] — Unmuting and setting volume…" >&2

# Unmute and set HDMI/PCM volume via PulseAudio’s ALSA plugin
amixer -D pulse sset Master unmute                 # Unmute the “Master” control :contentReference
amixer -D pulse sset Master 95%                    # Set volume to 95% :contentReference

echo "$(date +'%Y-%m-%d %H:%M:%S') [${USER}] — Volume configured." >&2
