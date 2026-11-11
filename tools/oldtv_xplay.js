// "Luaj me dikë" between an OLD LG TV engine (Electron 3 = Chrome 66, older than webOS 5's Chrome 68)
// and a phone (modern Playwright), sharing the fake Firebase of mockfb.js through a small HTTP bridge.
// usage: node tools/oldtv_xplay.js <electron binary> [1920x1080|1280x720]
// needs: python3 -m http.server 8765 in the repo root, Xvfb (xvfb-run)
const http = require('http'), path = require('path'), fs = require('fs'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const { store, attach, MODS } = require('./mockfb');
const ELECTRON = process.argv[2], RES = process.argv[3] || '1280x720', AS53 = process.argv.includes('--as53'), SCEN = (process.argv.find(a => a.startsWith('--scenario=')) || '').slice(11), NOPHONE = !!SCEN;
const [W, H] = RES.split('x').map(Number);
const PORT = 9317, OUT = path.join(__dirname, 'shots', 'oldtv');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- bridge: the old TV page calls the store over HTTP and gets pushes over Server-Sent Events
const streams = new Map(), queue = [], bridgeStats = { connects: 0, queued: 0 };
store.pages.set('tv', { evaluate: async (fn, args) => {
  const src = String(fn), [id, v] = args, ev = src.includes('__mfFsFire') ? 'fs' : 'db';
  const msg = `data: ${JSON.stringify({ ev, id, v })}\n\n`, s = streams.get('tv');
  if (s) s.write(msg); else { queue.push(msg); bridgeStats.queued++; }
} });
const handlers = {};
attach({ exposeFunction: async (n, f) => { handlers[n] = f; }, route: async () => {} }, 'tv-bridge');
store.pages.delete('tv-bridge');
const server = http.createServer((req, res) => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' };
  if (req.method === 'OPTIONS'){ res.writeHead(204, cors); return res.end(); }
  if (req.url.startsWith('/events')){
    res.writeHead(200, { ...cors, 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    res.write(': hi\n\n'); streams.set('tv', res); bridgeStats.connects++;
    while (queue.length) res.write(queue.shift());
    req.on('close', () => { if (streams.get('tv') === res) streams.delete('tv'); }); return;
  }
  if (req.url.startsWith('/mf')){
    let body = ''; req.on('data', d => body += d).on('end', async () => {
      const { op, a } = JSON.parse(body);
      // subscriptions from the TV page must be registered under the page name 'tv'
      let r;
      if (op === 'sub'){ const v = store.get(a.path); store.subs.push({ page: 'tv', id: a.id, path: a.path, last: JSON.stringify(v) }); r = v; }
      else if (op === 'unsub'){ store.subs = store.subs.filter(s => !(s.page === 'tv' && s.id === a.id)); r = true; }
      else if (op === 'fsSub'){ const v = store.fsEval(a.q); store.fsSubs.push({ page: 'tv', id: a.id, q: a.q, last: JSON.stringify(v) }); r = v; }
      else if (op === 'fsUnsub'){ store.fsSubs = store.fsSubs.filter(s => !(s.page === 'tv' && s.id === a.id)); r = true; }
      else r = await handlers.__mf(op, a);
      res.writeHead(200, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify(r === undefined ? null : r));
    }); return;
  }
  const parts = req.url.split('?')[0].split('/'), f = parts.pop(), ver = parts.pop();
  if (ver === '8.10.1'){   // Firebase 8 (TV-të 2018–2019): i rremë, në një skedar
    res.writeHead(200, { ...cors, 'content-type': 'application/javascript' });
    return res.end(f === 'firebase-app.js' ? fs.readFileSync(path.join(__dirname, 'oldtv', 'fb8mock.js'), 'utf8') : '');
  }
  if (MODS[f]){ res.writeHead(200, { ...cors, 'content-type': 'application/javascript' }); return res.end(MODS[f]); }
  res.writeHead(404, cors); res.end();
});

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  // ---- phone (modern)
  const b = await chromium.launch();
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36', viewport: { width: 390, height: 844 } });
  const ph = await ctx.newPage(); const errs = []; ph.on('pageerror', e => errs.push('phone: ' + e.message));
  await attach(ph, 'phone');
  await ph.goto('http://localhost:8765/index.html');
  await ph.waitForFunction(() => window.__app && window.__app.NET.state === 'ok');
  await ph.evaluate(() => { window.__app.SET.anim = false; window.__app.SET.sound = false; });

  // ---- old TV engine
  const harness = path.join(__dirname, 'oldtv');
  const res = path.join(OUT, RES + (AS53 ? '-as53' : '')); fs.mkdirSync(res, { recursive: true }); try { fs.unlinkSync(path.join(res, 'result.json')); } catch (e) {}
  const tv = spawn('xvfb-run', ['-a', '-s', `-screen 0 ${W}x${H}x24`, ELECTRON, harness, 'http://127.0.0.1:8766/index.html?x=1' + (AS53 ? '&as53' : '') + (process.argv.includes('--en') ? '&lang=en' : ''), W, H, SCEN ? path.resolve(SCEN) : path.join(harness, 'xplay_tv.js'), res, String(PORT)], { stdio: ['ignore', 'ignore', 'ignore'], env: Object.assign({}, process.env, { BRIDGE_PORT: String(PORT) }) });
  const tvDone = new Promise(r => tv.on('exit', r));

  if (NOPHONE){ await tvDone; const r = JSON.parse(fs.readFileSync(path.join(res, 'result.json'), 'utf8')); console.log(JSON.stringify(r, null, 1)); await b.close(); server.close(); process.exit(0); }
  // the phone searches a little after the TV
  await sleep(9000);
  await ph.click('#chRnd');
  const phone = { plays: 0 };
  for (let i = 0, idle = 0; i < 1500; i++){
    const st = await ph.evaluate(() => { const A = window.__app; const s = document.getElementById('sumOv'); if (s && !s.hidden) return 'sum'; return A.canAct() ? 'me' : 'wait'; }).catch(() => 'x');
    if (st === 'sum'){
      phone.summary = await ph.evaluate(() => document.querySelector('#sumOv h2, #sumOv .sheet h2') ? document.querySelector('#sumOv h2').textContent : document.getElementById('sumOv').innerText.slice(0, 80));
      const next = await ph.$('#bNext');
      if (next && await next.isVisible()){ await next.click(); await sleep(800); continue; }
      break;
    }
    if (st === 'me'){ idle = 0; await ph.evaluate(() => document.querySelector('#hand0 .card-btn:not([disabled])').click()); phone.plays++; }
    else if (++idle > 240){ phone.stalled = true; break; }
    await sleep(250);
  }
  await ph.screenshot({ path: path.join(res, 'phone-end.png') });
  phone.state = await ph.evaluate(() => { const A = window.__app, S = A.S || {}; return {seq: S.seq, turn: S.turn, phase: S.phase, me: A.APP.me, anim: A.NET.animating, busy: A.APP.busy}; });
  const games = store.get('games') || {}; phone.store = Object.values(games).map(g => { const G = JSON.parse(g.G || 'null') || {}; return {status: g.status, seq: G.seq, turn: G.turn, phase: G.phase}; });
  await Promise.race([tvDone, sleep(240000)]);
  try { tv.kill(); } catch (e) {}
  let tvRes = null; try { tvRes = JSON.parse(fs.readFileSync(path.join(res, 'result.json'), 'utf8')); } catch (e) {}
  console.log(JSON.stringify({ res: RES, as53: AS53, bridge: bridgeStats, phone, tv: tvRes, errors: errs }, null, 1));
  await b.close(); server.close(); process.exit(0);
})();
