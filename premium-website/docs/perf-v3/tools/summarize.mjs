import fs from 'node:fs';
const dir = process.argv[2] || (process.env.S + '/results');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
const rows = { load: [], scroll: [], other: [] };
for (const f of files) {
  const r = JSON.parse(fs.readFileSync(dir + '/' + f));
  if (r.error) { rows.other.push(`${r.label}: ERROR ${r.error.split('\n')[0]}`); continue; }
  if (r.cmd === 'load') {
    const s = r.summary, t = r.trace;
    const pre = s.preloader; const curtain = pre.gone && pre.seen ? (pre.gone - pre.seen).toFixed(0) : '—';
    const inPre = t.longTasks.filter(x => true);
    rows.load.push(`| ${r.label} | ${s.ttfb} | ${s.fcp} | ${s.lcp} | ${s.cls} | ${s.tbt} | ${pre.seen}→${pre.gone} (${curtain}) | ${pre.firstAnim} | ${s.longTasksInPreloader} / ${s.longTasksInPreloaderMs} | ${s.longTasksTotal} | ${(r.network.jsTransferred/1024).toFixed(0)} KB (${r.network.jsCount}) | ${t.gpuTaskMs} |`);
    rows.load.push(`|   long tasks: ${t.longTasks.map(x => `${x.at}ms/${x.dur}ms [${x.top[0]}${x.marks.length ? ' @' + x.marks.join(',') : ''}]`).join('; ')} |`);
  } else if (r.cmd === 'scroll') {
    const fr = r.frames, t = r.trace, b = t.buckets, p = t.bucketsPct;
    rows.scroll.push(`| ${r.label} | ${r.variant} | ${fr.median} | ${fr.p95} | ${fr.p99} | ${fr.fps} | ${fr.over16}/${fr.over33} | ${t.mainBusyPct}% | ${b.script} | ${b.style} | ${b.layout} | ${b.paint} | ${b.composite} | ${t.gpuTaskMs} | ${r.layersBefore?.count ?? '—'} / ${r.layersBefore?.estMB ?? '—'} MB | ${t.longTasks.length} |`);
  } else {
    rows.other.push(`${r.label}: ${JSON.stringify(r.firstVisit || '')} ${JSON.stringify(r.reload || r.linkNav || r.result || '')}`);
  }
}
console.log('## Загрузка\n| замер | TTFB | FCP | LCP | CLS | TBT | занавес seen→gone (длина) | 1-й кадр анимации | long tasks в занавесе (n / мс) | long tasks всего | JS при загрузке | GPU мс |\n|---|---|---|---|---|---|---|---|---|---|---|---|');
console.log(rows.load.join('\n'));
console.log('\n## Скролл 10 с\n| замер | вариант | медиана | p95 | p99 | fps | >16.8 / >33 мс | main busy | script | style | layout | paint | composite | GPU мс | слои / память | long tasks |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
console.log(rows.scroll.join('\n'));
console.log('\n## Прочее'); console.log(rows.other.join('\n'));
