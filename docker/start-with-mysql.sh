#!/bin/bash

set -euo pipefail

MYSQL_DATA_DIR=${MYSQL_DATA_DIR:-/var/lib/mysql}
MYSQL_SOCKET=${MYSQL_SOCKET:-/tmp/mysql.sock}
MYSQL_PID_FILE=${MYSQL_PID_FILE:-/tmp/mysql.pid}
MYSQL_PORT=${MYSQL_PORT:-3306}
MYSQL_DATABASE=${MYSQL_DATABASE:-cax}
MYSQL_USER=${MYSQL_USER:-cax}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-cax}

mkdir -p /app/upload "${MYSQL_DATA_DIR}"

if [ ! -d "${MYSQL_DATA_DIR}/mysql" ]; then
  mariadb-install-db --user=root --datadir="${MYSQL_DATA_DIR}" >/dev/null
fi

mysqld \
  --user=root \
  --datadir="${MYSQL_DATA_DIR}" \
  --bind-address=127.0.0.1 \
  --port="${MYSQL_PORT}" \
  --socket="${MYSQL_SOCKET}" \
  --pid-file="${MYSQL_PID_FILE}" \
  --skip-networking=0 &

for i in $(seq 1 60); do
  if mysqladmin --socket="${MYSQL_SOCKET}" -uroot ping --silent >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

mysql --socket="${MYSQL_SOCKET}" -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'127.0.0.1' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

export DB_DIALECT=mysql
export DB_HOST=127.0.0.1
export DB_PORT="${MYSQL_PORT}"
export DB_NAME="${MYSQL_DATABASE}"
export DB_USER="${MYSQL_USER}"
export DB_PASSWORD="${MYSQL_PASSWORD}"

exec pnpm start
