// Cross-play: TV build (keys only) vs phone web build, through the shared fake Firebase.
const { chromium } = require('playwright');
const { store, attach } = require('./mockfb.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const tvCtx = await b.newContext({ userAgent: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Chrome/94 Safari/537.36', viewport: {width: 1280, height: 720} });
  const tv = await tvCtx.newPage(); tv.on('pageerror', e => errs.push('tv: ' + e.message));
  await attach(tv, 'tv');
  await tv.goto('file://' + require('path').resolve(__dirname, '../tv/app/index.html'));
  const phCtx = await b.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36', viewport: {width: 390, height: 844} });
  const ph = await phCtx.newPage(); ph.on('pageerror', e => errs.push('phone: ' + e.message));
  await attach(ph, 'phone');
  await ph.goto('http://localhost:8765/index.html');
  await ph.waitForFunction(() => window.__app && window.__app.NET.state === 'ok');
  await ph.evaluate(() => { window.__app.SET.anim = false; window.__app.SET.sound = false; });
  await sleep(1800);
  const foc = () => tv.evaluate(() => { const a = document.activeElement; return a && a !== document.body ? (a.id || a.className.split(' ')[0]) : 'body'; });
  const R = {};
  // TV: Down to "Luaj me dikë", OK
  await tv.keyboard.press('ArrowDown'); R.tvOn = await foc();
  await tv.keyboard.press('Enter'); await sleep(1500);
  R.tvSearching = await tv.isVisible('#mmOv');
  // phone joins
  await ph.click('#chRnd'); await sleep(3000);
  R.tvScreen = await tv.evaluate(() => document.body.dataset.screen);
  R.phoneScreen = await ph.evaluate(() => window.__app.APP.screen);
  R.tvOpp = await tv.evaluate(() => document.getElementById('name1').textContent);
  R.phoneOpp = await ph.evaluate(() => window.__app.APP.oppName);
  const gid = await ph.evaluate(() => window.__app.NET.gameId);
  R.devices = Object.values((store.get('games/' + gid) || {}).names || {}).map(x => x.d);
  // play the whole 3-round match: TV with OK only, phone by clicking
  let tvPlays = 0, phPlays = 0, rounds = 0;
  for (let step = 0; step < 5000; step++){
    const t = await tv.evaluate(() => ({sum: !document.getElementById('sumOv').hidden, inHand: !!(document.activeElement && document.activeElement.closest('#hand0') && !document.activeElement.disabled), over: /Fitove|Fitoi|Barazim/.test(document.getElementById('sumH').textContent), next: !document.getElementById('bNext').disabled}));
    const p = await ph.evaluate(() => { const A = window.__app; return {can: A.canAct(), phase: A.S && A.S.phase, over: A.S && A.S.summary && A.S.summary.over}; });
    if (t.sum && t.over && p.phase === 'summary'){ break; }
    let acted = false;
    if (t.sum && !t.over && t.next && p.phase === 'summary'){ await tv.evaluate(() => document.getElementById('bNext').focus()); await tv.keyboard.press('Enter'); rounds++; acted = true; await sleep(600); }
    else if (t.inHand){ await tv.keyboard.press('Enter'); tvPlays++; acted = true; await sleep(250); }
    if (p.can){ await ph.click('#hand0 .card-btn:not([disabled])'); phPlays++; acted = true; await sleep(150); }
    if (!acted) await sleep(120);
  }
  const st = pg => pg.evaluate(() => { const s = window.__appS || null; return null; });
  R.plays = {tv: tvPlays, phone: phPlays, nextRounds: rounds};
  R.phoneFinal = await ph.evaluate(() => { const S = window.__app.S; return {seq: S.seq, wins: S.wins, round: S.round, over: S.summary && S.summary.over}; });
  R.tvSummary = await tv.evaluate(() => document.getElementById('sumH').textContent + ' | ' + document.getElementById('sumSub').textContent);
  // chat from phone shows on TV
  await ph.evaluate(() => window.__app.sendChat('t', 1)); await sleep(800);
  R.tvGotChat = await tv.evaluate(() => !!document.querySelector('#scrGame .opp .bubble'));
  // TV presses Back (summary -> Menyja), phone sees "left"; phone leaves -> game deleted
  await tv.keyboard.press('Escape'); await sleep(800);
  R.tvAfterBack = await tv.evaluate(() => document.body.dataset.screen);
  R.phoneSeesLeft = await ph.evaluate(() => window.__app.NET.gameDoc && window.__app.NET.gameDoc.status);
  await ph.evaluate(() => document.getElementById('bSumMenu').click()); await sleep(800);
  R.gameDeleted = store.get('games/' + gid) === null;
  R.queueEmpty = store.get('match/waiting') === null;
  console.log(JSON.stringify(R, null, 1));
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
