#!/bin/sh
set -eu

mkdir -p /app/upload/images /app/upload/movies /app/upload/sounds
mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp

# Keep Node behind nginx. nginx listens on :8080, Node on :3001.
PORT="${NODE_APP_PORT:-3001}" pnpm start &
NODE_PID=$!

nginx -g "daemon off;" &
NGINX_PID=$!

cleanup() {
  kill -TERM "$NODE_PID" "$NGINX_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

while :; do
  if ! kill -0 "$NODE_PID" 2>/dev/null; then
    wait "$NODE_PID" || true
    exit 1
  fi
  if ! kill -0 "$NGINX_PID" 2>/dev/null; then
    wait "$NGINX_PID" || true
    exit 1
  fi
  sleep 1
done
