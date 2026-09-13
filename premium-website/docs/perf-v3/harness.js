/* Измерительная обвязка perf-v3. Подключается только при NEXT_PUBLIC_PERF_HARNESS=1.
   Всё складывает в window.__perf; ничего не меняет в поведении страницы. */
(function () {
  var P = (window.__perf = {
    longTasks: [], lcp: null, cls: 0, ttfb: null, fcp: null,
    preloader: { seen: null, firstAnim: null, gone: null },
    canvas: { seen: null },
    marks: function () {
      return performance.getEntriesByType('mark').map(function (m) {
        return { name: m.name, t: +m.startTime.toFixed(1) };
      });
    },
  });
  function obs(type, fn) {
    try { new PerformanceObserver(function (l) { fn(l.getEntries()); }).observe({ type: type, buffered: true }); } catch (e) {}
  }
  obs('longtask', function (es) {
    es.forEach(function (e) { P.longTasks.push({ start: +e.startTime.toFixed(1), dur: +e.duration.toFixed(1) }); });
  });
  obs('largest-contentful-paint', function (es) { P.lcp = +es[es.length - 1].startTime.toFixed(1); });
  obs('layout-shift', function (es) { es.forEach(function (e) { if (!e.hadRecentInput) P.cls += e.value; }); });
  obs('paint', function (es) { es.forEach(function (e) { if (e.name === 'first-contentful-paint') P.fcp = +e.startTime.toFixed(1); }); });
  var nav = performance.getEntriesByType('navigation')[0];
  if (nav) P.ttfb = +nav.responseStart.toFixed(1);

  /* Сколько кадров занавес реально был в DOM: ловит «тёмную вспышку» при
     повторном заходе, когда прелоадер должен не показаться ни разу. */
  P.curtainFrames = 0;
  P.curtainFirstFrameAt = null;
  (function countCurtain() {
    var el = document.querySelector('[class*="preloader"]');
    if (el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden') {
      P.curtainFrames += 1;
      if (P.curtainFirstFrameAt === null) P.curtainFirstFrameAt = +performance.now().toFixed(1);
    }
    if (performance.now() < 8000) requestAnimationFrame(countCurtain);
  })();

  /* Жизненный цикл прелоадера и появление canvas — через MutationObserver. */
  var mo = new MutationObserver(function (muts) {
    var now = performance.now();
    if (P.preloader.seen === null) {
      var pre = document.querySelector('[class*="preloader"]');
      if (pre) P.preloader.seen = +now.toFixed(1);
    }
    if (P.canvas.seen === null && document.querySelector('canvas')) P.canvas.seen = +now.toFixed(1);
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'attributes' && P.preloader.firstAnim === null && m.target.className &&
          String(m.target.className).indexOf('letter') >= 0) P.preloader.firstAnim = +now.toFixed(1);
      if (m.type === 'childList' && P.preloader.seen !== null && P.preloader.gone === null) {
        for (var j = 0; j < m.removedNodes.length; j++) {
          var n = m.removedNodes[j];
          if (n.nodeType === 1 && String(n.className).indexOf('preloader') >= 0) P.preloader.gone = +now.toFixed(1);
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'data-curtain'] });

  /* Сводка загрузки: long tasks в интервале прелоадера, TBT, LCP, CLS. */
  P.loadSummary = function () {
    var pre = P.preloader;
    var end = pre.gone || performance.now();
    var start = pre.seen || 0;
    var inPre = P.longTasks.filter(function (t) { return t.start + t.dur > start && t.start < end; });
    var tbt = P.longTasks.reduce(function (a, t) { return a + Math.max(0, t.dur - 50); }, 0);
    return {
      ttfb: P.ttfb, fcp: P.fcp, lcp: P.lcp, cls: +P.cls.toFixed(4), tbt: +tbt.toFixed(0),
      preloader: pre, canvasSeen: P.canvas.seen,
      curtainFrames: P.curtainFrames, curtainFirstFrameAt: P.curtainFirstFrameAt,
      longTasksTotal: P.longTasks.length,
      longTasksInPreloader: inPre.length,
      longTasksInPreloaderMs: +inPre.reduce(function (a, t) { return a + t.dur; }, 0).toFixed(0),
      longTasks: P.longTasks, marks: P.marks(),
    };
  };

  /* Профиль скролла: ровная программная прокрутка за N секунд, время кадра по rAF. */
  P.scrollRun = function (seconds, from, to) {
    return new Promise(function (resolve) {
      var html = document.documentElement;
      var prevSB = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      var start = null, last = null, deltas = [];
      var ltBefore = P.longTasks.length;
      var y0 = from == null ? 0 : from;
      var y1 = to == null ? html.scrollHeight - innerHeight : to;
      window.scrollTo(0, y0);
      performance.mark('perf:scroll:start');
      function tick(now) {
        if (start === null) { start = now; last = now; requestAnimationFrame(tick); return; }
        deltas.push(now - last); last = now;
        var k = Math.min(1, (now - start) / (seconds * 1000));
        window.scrollTo(0, y0 + (y1 - y0) * k);
        if (k < 1) requestAnimationFrame(tick);
        else {
          performance.mark('perf:scroll:end');
          html.style.scrollBehavior = prevSB;
          var s = deltas.slice().sort(function (a, b) { return a - b; });
          var q = function (p) { return +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(2); };
          resolve({
            frames: deltas.length, seconds: seconds,
            median: q(0.5), p95: q(0.95), p99: q(0.99), max: +s[s.length - 1].toFixed(1),
            fps: +(deltas.length / seconds).toFixed(1),
            over16: deltas.filter(function (d) { return d > 16.8; }).length,
            over33: deltas.filter(function (d) { return d > 33.5; }).length,
            longTasksDuring: P.longTasks.length - ltBefore,
          });
        }
      }
      requestAnimationFrame(tick);
    });
  };
})();
