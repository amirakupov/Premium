#!/bin/zsh
# hd.sh <port> <label> [css]  — свежий профиль headed Chrome, прогон колесом на high, закрытие
S=$(cd "$(dirname "$0")/.." && pwd)   # корень docs/perf-v4; профили Chrome кладутся рядом в .chrome-*
PORT=$1; LABEL=$2; CSS=$3
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE=$S/.chrome-p$PORT; rm -rf $PROFILE
(nohup "$CH" --user-data-dir=$PROFILE --remote-debugging-port=$PORT --no-first-run --no-default-browser-check --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --window-size=1440,900 --window-position=60,40 about:blank > $S/.chrome-p$PORT.log 2>&1 &)
for i in $(seq 1 40); do curl -s localhost:$PORT/json/version | grep -q Browser && break; sleep 1; done
cd $S/tools
INJECT_CSS="$CSS" CDP_PORT=$PORT node prof.mjs $LABEL "http://localhost:3100/?tier=high" 12 --wheel --cold $EXTRA > results/$LABEL.log 2>&1
node -e '
const o=require("./results/'$LABEL'.json"); const d=o.scrollDown||{};
console.log("'$LABEL'", JSON.stringify({fps:d.fps, dt:d.dt, slow:d.slowFrames}));
console.log(" byChapter", JSON.stringify(Object.fromEntries(Object.entries(d.byChapter||{}).map(([k,v])=>[k,[v.frames,v.slow,v.meanDt,v.rootWrites]]))));
console.log(" spikes", JSON.stringify((d.spikes||[]).map(s=>[s.p,s.dt,s.rootWrites,s.groundWrites])));
if(o.error) console.log(" ERROR", o.error.slice(0,300));'
PID=$(pgrep -f "user-data-dir=$PROFILE" | head -1); [ -n "$PID" ] && kill $PID; sleep 2
