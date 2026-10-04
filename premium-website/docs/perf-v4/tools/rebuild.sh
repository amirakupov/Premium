#!/bin/zsh
# Прод-сборка с обвязкой и перезапуск сервера :3100 (next start читает .next при старте —
# после новой сборки старый процесс отдавал бы чанки другого BUILD_ID).
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"
NEXT_PUBLIC_PERF_HARNESS=1 BACKEND_URL=http://localhost:8080 npx next build > /tmp/perf-v4-build.log 2>&1 || { tail -30 /tmp/perf-v4-build.log; exit 1; }
pkill -f "next start -p 3100" 2>/dev/null || true
sleep 1
(PORT=3100 BACKEND_URL=http://localhost:8080 NEXT_PUBLIC_PERF_HARNESS=1 nohup npx next start -p 3100 > /tmp/perf-v4-server.log 2>&1 &)
for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/ 2>/dev/null | grep -q 200 && { echo "server :3100 up, build $(cat .next/BUILD_ID)"; exit 0; }; sleep 1; done
echo "server did not come up"; tail -20 /tmp/perf-v4-server.log; exit 1
