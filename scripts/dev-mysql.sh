#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MYSQL_HOME="${MYSQL_HOME:-/usr/local/mysql}"
MYSQLD="$MYSQL_HOME/bin/mysqld"
MYSQL="$MYSQL_HOME/bin/mysql"
MYSQLADMIN="$MYSQL_HOME/bin/mysqladmin"
PORT="${DEV_MYSQL_PORT:-3307}"
DATA_DIR="$ROOT_DIR/.local/mysql-data"
RUN_DIR="$ROOT_DIR/.local/mysql-run"
LOG_DIR="$ROOT_DIR/.local/mysql-logs"
SOCKET="$RUN_DIR/mysql.sock"
PID_FILE="$RUN_DIR/mysql.pid"

require_mysql() {
  if [[ ! -x "$MYSQLD" || ! -x "$MYSQL" || ! -x "$MYSQLADMIN" ]]; then
    echo "MySQL server binaries not found under MYSQL_HOME=$MYSQL_HOME" >&2
    exit 1
  fi
}

init_mysql() {
  require_mysql
  mkdir -p "$DATA_DIR" "$RUN_DIR" "$LOG_DIR"
  if [[ -f "$DATA_DIR/auto.cnf" ]]; then
    echo "MySQL data directory already initialized: $DATA_DIR"
    return
  fi
  "$MYSQLD" --initialize-insecure --datadir="$DATA_DIR" --log-error="$LOG_DIR/init.err"
  echo "Initialized MySQL data directory: $DATA_DIR"
}

start_mysql() {
  require_mysql
  init_mysql
  if "$MYSQLADMIN" --socket="$SOCKET" -uroot ping >/dev/null 2>&1; then
    echo "MySQL already running on socket $SOCKET"
    return
  fi
  "$MYSQLD" \
    --datadir="$DATA_DIR" \
    --socket="$SOCKET" \
    --pid-file="$PID_FILE" \
    --log-error="$LOG_DIR/mysql.err" \
    --bind-address=127.0.0.1 \
    --port="$PORT" \
    --mysqlx=0 \
    --skip-name-resolve \
    >/dev/null 2>&1 &

  for _ in $(seq 1 30); do
    if "$MYSQLADMIN" --socket="$SOCKET" -uroot ping >/dev/null 2>&1; then
      echo "MySQL started on 127.0.0.1:$PORT"
      return
    fi
    sleep 1
  done
  echo "MySQL failed to start. See $LOG_DIR/mysql.err" >&2
  exit 1
}

create_user() {
  require_mysql
  "$MYSQL" --socket="$SOCKET" -uroot -e "CREATE DATABASE IF NOT EXISTS travel_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'travel'@'127.0.0.1' IDENTIFIED BY 'travel'; CREATE USER IF NOT EXISTS 'travel'@'localhost' IDENTIFIED BY 'travel'; GRANT ALL PRIVILEGES ON travel_app.* TO 'travel'@'127.0.0.1'; GRANT ALL PRIVILEGES ON travel_app.* TO 'travel'@'localhost'; FLUSH PRIVILEGES;"
  echo "Ensured travel_app database and travel user"
}

stop_mysql() {
  require_mysql
  if "$MYSQLADMIN" --socket="$SOCKET" -uroot ping >/dev/null 2>&1; then
    "$MYSQLADMIN" --socket="$SOCKET" -uroot shutdown
    echo "MySQL stopped"
    return
  fi
  echo "MySQL is not running"
}

status_mysql() {
  require_mysql
  "$MYSQLADMIN" --socket="$SOCKET" -uroot ping
}

print_dsn() {
  echo "travel:travel@tcp(127.0.0.1:$PORT)/travel_app?charset=utf8mb4&parseTime=True&loc=Local"
}

case "${1:-}" in
  init) init_mysql ;;
  start) start_mysql ;;
  create-user) create_user ;;
  stop) stop_mysql ;;
  status) status_mysql ;;
  dsn) print_dsn ;;
  *)
    echo "Usage: $0 {init|start|create-user|stop|status|dsn}" >&2
    exit 2
    ;;
esac
