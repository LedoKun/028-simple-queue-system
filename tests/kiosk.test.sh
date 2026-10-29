#!/usr/bin/env bash
set -euo pipefail
repo_dir=$(cd "$(dirname "$0")/.." && pwd)
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT
mkdir "$test_dir/bin"
# Mock hardware and process commands so the check cannot affect a real kiosk.
for command_name in ping curl amixer xrandr xset pkill sleep; do
  printf '#!/usr/bin/env bash\nexit 0\n' > "$test_dir/bin/$command_name"
done
cat > "$test_dir/bin/chromium-browser" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$KIOSK_ARGS_FILE"
MOCK
chmod +x "$test_dir/bin/"*

check_launch() {
  local health_url=$1 expected_url=$2 explicit_url=$3
  rm -f "$test_dir/args"
  PATH="$test_dir/bin:$PATH" SERVER_IP=127.0.0.1 SERVER_HTTP_URL="$health_url" \
    KIOSK_URL="$explicit_url" KIOSK_ARGS_FILE="$test_dir/args" \
    bash "$repo_dir/deploy/kiosk/rpi-kiosk-launch.sh" > "$test_dir/log" 2>&1
  for attempt in {1..50}; do
    if [ -s "$test_dir/args" ]; then break; fi
    /usr/bin/sleep 0.01
  done
  actual_url=$(sed -n '2p' "$test_dir/args")
  if [ "$actual_url" != "$expected_url" ]; then
    printf 'Expected %s, got %s\n' "$expected_url" "$actual_url" >&2
    exit 1
  fi
}
check_launch '' 'http://127.0.0.1:3000/signage.html' ''
check_launch 'https://queue.local/health' 'https://queue.local/signage.html' ''
check_launch 'https://queue.local/' 'https://queue.local/signage.html' ''
check_launch 'https://queue.local/health' 'https://queue.local/signage_with_028_qr.html' 'https://queue.local/signage_with_028_qr.html'
printf 'Kiosk URL defaults and overrides: passed\n'
