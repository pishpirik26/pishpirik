// English check: goes through every screen (CPU game, account, friends, invites, online game, chat, random search, errors)
// with the language set to English, and lists every Albanian text that is still on screen (window.__i18nMiss + a scan).
// usage: python3 -m http.server 8765 (repo root) & node tools/i18n_harvest.js
const { chromium } = require('playwright');
const { attach } = require('./mockfb');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ALB = /[ëçË]|\b(të|një|nuk|për|nga|dhe|ose|je|ke|po|s’|ka|me|loj|shok|raund|kart|fito|humb|prit|duke|kyç|ftes|anulo|mbyll|gati|lojtar|pako|mori)\w*/i;
(async () => {
  const b = await chromium.launch();
  const seen = new Set(), errs = [];
  async function page(name){
    const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
    await ctx.addInitScript(() => { try { localStorage.setItem('pishpirik-lang', 'en'); } catch (e) {} });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await attach(p, name); await p.goto('http://localhost:8765/index.html');
    await p.waitForFunction(() => window.__app && window.__app.NET.state === 'ok');
    await p.evaluate(() => { window.__app.SET.anim = false; window.__app.SET.sound = false; });
    return p;
  }
  async function scan(p, tag){
    const txt = await p.evaluate(() => {
      const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())){ const t = n.data.trim(); if (t && n.parentElement && n.parentElement.getClientRects().length && !n.parentElement.closest('[data-noi18n],script,style')) out.push(t); }
      document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(e => ['placeholder','title','aria-label'].forEach(a => e.hasAttribute(a) && out.push(e.getAttribute(a))));
      return out.concat(Object.keys(window.__i18nMiss || {}));
    });
    txt.forEach(t => { if (ALB.test(t) && !seen.has(t)){ seen.add(t); console.log('[' + tag + '] ' + JSON.stringify(t)); } });
  }
  const A = await page('A'), B = await page('B');
  await scan(A, 'entry');
  await A.evaluate(() => document.getElementById('bSet').click()); await sleep(400); await scan(A, 'settings');
  await A.evaluate(() => document.getElementById('bRules').click()); await sleep(300); await scan(A, 'rules');
  await A.keyboard.press('Escape'); await A.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.hidden = true));
  await A.click('#chCpu'); await sleep(300); await scan(A, 'rounds');
  await A.evaluate(() => [...document.querySelectorAll('#rGrid button')][4].click()); await sleep(100); await scan(A, 'rounds5');
  await A.click('#rGo'); await sleep(800); await scan(A, 'game');
  await A.evaluate(() => document.getElementById('bChat').click()); await sleep(300); await scan(A, 'chat');
  await A.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.hidden = true));
  for (let i = 0; i < 400; i++){
    const s = await A.evaluate(() => { const o = document.getElementById('sumOv'); if (!o.hidden) return 'sum'; if (window.__app.canAct()){ const c = document.querySelector('#hand0 .card-btn:not([disabled])'); if (c) c.click(); } return ''; });
    if (s === 'sum') break; await sleep(60); if (i % 40 === 0) await scan(A, 'play');
  }
  await scan(A, 'summary');
  await A.evaluate(() => { document.getElementById('sumOv').hidden = true; const c = document.querySelector('.cap-chip'); if (c) c.click(); }); await sleep(300); await scan(A, 'captured');
  await A.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); document.getElementById('bBack').click(); }); await sleep(500); await scan(A, 'back');
  // errors on forms
  for (const p of [A]){
    await p.evaluate(() => document.getElementById('inBtn').click()); await sleep(300); await scan(p, 'login-empty');
    await p.fill('#inUser', 'nobody'); await p.fill('#inPass', 'wrongpass'); await p.evaluate(() => document.getElementById('inBtn').click()); await sleep(800); await scan(p, 'login-wrong');
    await p.click('#tabUp'); await p.fill('#upUser', 'a'); await p.fill('#upPass', '1'); await p.fill('#upPass2', '2'); await p.evaluate(() => document.getElementById('upBtn').click()); await sleep(300); await scan(p, 'signup-bad');
  }
  // two accounts, friends, invites, online game
  async function signup(p, u){ await p.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.hidden = true)); await p.click('#tabUp').catch(() => {}); await p.fill('#upUser', u); await p.fill('#upPass', 'secret12'); await p.fill('#upPass2', 'secret12'); await p.evaluate(() => document.getElementById('upBtn').click()); await sleep(1500); }
  await signup(A, 'alpha_en'); await signup(B, 'beta_en'); await scan(A, 'lobby'); await scan(B, 'lobby');
  await A.fill('#addUser', 'nosuchuser'); await A.evaluate(() => document.getElementById('fAdd').requestSubmit()); await sleep(800); await scan(A, 'add-missing');
  await A.fill('#addUser', 'alpha_en'); await A.evaluate(() => document.getElementById('fAdd').requestSubmit()); await sleep(800); await scan(A, 'add-self');
  await A.fill('#addUser', 'beta_en'); await A.evaluate(() => document.getElementById('fAdd').requestSubmit()); await sleep(1200); await scan(A, 'added'); await scan(B, 'was-added');
  await B.evaluate(() => { const x = [...document.querySelectorAll('#reqList button')].find(b => /Accept|Prano/.test(b.textContent)); if (x) x.click(); }); await sleep(1200); await scan(A, 'friends'); await scan(B, 'friends');
  await A.evaluate(() => { const x = [...document.querySelectorAll('#frList button')].find(b => /Invite|Fto/.test(b.textContent)); if (x) x.click(); }); await sleep(500); await scan(A, 'invite-rounds');
  await A.evaluate(() => document.getElementById('rGo').click()); await sleep(1500); await scan(A, 'invite-sent'); await scan(B, 'invite-got');
  await B.evaluate(() => { const x = [...document.querySelectorAll('#invList button, #gmList button')].find(b => /Accept|Prano/.test(b.textContent)); if (x) x.click(); }); await sleep(2500); await scan(A, 'online'); await scan(B, 'online');
  for (let i = 0; i < 30; i++){ for (const p of [A, B]) await p.evaluate(() => { if (window.__app.canAct()){ const c = document.querySelector('#hand0 .card-btn:not([disabled])'); if (c) c.click(); } }); await sleep(250); }
  await scan(A, 'online-play'); await scan(B, 'online-play');
  await A.evaluate(() => { document.getElementById('bChat').click(); }); await sleep(300);
  await A.evaluate(() => { const q = document.querySelector('#chatOv .quick button, .chips button, #qList button'); if (q) q.click(); }); await sleep(800); await scan(B, 'chat-recv');
  await A.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); document.getElementById('bBack').click(); }); await sleep(1500); await scan(A, 'left'); await scan(B, 'opp-left');
  await B.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); const x = document.getElementById('bBack'); if (x && x.getClientRects().length) x.click(); }); await sleep(800); await scan(B, 'lobby-after');
  await A.evaluate(() => { document.getElementById('bSet').click(); }); await sleep(400); await scan(A, 'settings-acc');
  await A.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); document.getElementById('bRnd2').click(); }); await sleep(1500); await scan(A, 'search');
  await sleep(26000); await scan(A, 'search-long');
  await B.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); document.getElementById('bRnd2').click(); }); await sleep(4000);
  await scan(A, 'random-match'); await scan(B, 'random-match');
  for (let i = 0; i < 20; i++){ for (const p of [A, B]) await p.evaluate(() => { if (window.__app.canAct()){ const c = document.querySelector('#hand0 .card-btn:not([disabled])'); if (c) c.click(); } }); await sleep(250); }
  await scan(A, 'random-play'); await scan(B, 'random-play');
  await A.screenshot({ path: __dirname + '/shots/en-random.png' });
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
