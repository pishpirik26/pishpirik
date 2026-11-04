const { chromium } = require('playwright');
const { store, attach } = require('./mockfb.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const errors = [];
  async function device(name, ua, vp){
    const ctx = await b.newContext({ userAgent: ua, viewport: vp });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(name + ': ' + e));
    p.on('console', m => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
    await attach(p, name);
    await p.goto('http://localhost:8765/index.html');
    await p.waitForFunction(() => window.__app && window.__app.NET.state === 'ok', null, {timeout: 10000});
    await p.evaluate(() => { window.__app.SET.anim = false; window.__app.SET.sound = false; });
    return p;
  }
  const phone = await device('phone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148', {width: 390, height: 844});
  const tv = await device('tv', 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Chrome/94 Safari/537.36 WebAppManager', {width: 1280, height: 720});
  const pc = await device('pc', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36', {width: 1280, height: 800});

  const R = {};
  // 1) phone searches alone -> waits
  await phone.click('#chRnd');
  await sleep(1500);
  R.phoneWaitingOverlay = await phone.evaluate(() => !document.getElementById('mmOv').hidden);
  R.slotAfterPhone = store.get('match/waiting') && 'someone waiting';
  // 2) TV searches -> they match
  await tv.click('#chRnd');
  await sleep(2500);
  R.phoneScreen = await phone.evaluate(() => window.__app.APP.screen);
  R.tvScreen = await tv.evaluate(() => window.__app.APP.screen);
  R.phoneSeesOpp = await phone.evaluate(() => window.__app.APP.oppName);
  R.tvSeesOpp = await tv.evaluate(() => window.__app.APP.oppName);
  R.slotAfterMatch = store.get('match/waiting');
  const gid = await phone.evaluate(() => window.__app.NET.gameId);
  const g = store.get('games/' + gid);
  R.gameType = g && g.type; R.devices = g && Object.values(g.names).map(x => x.d);

  // 3) play the whole match by clicking cards on whichever device has the turn
  let moves = 0, rounds = 0;
  for (let step = 0; step < 4000; step++){
    let acted = false;
    for (const p of [phone, tv]){
      const st = await p.evaluate(() => { const A = window.__app; return {can: A.canAct(), phase: A.S && A.S.phase, over: A.S && A.S.summary && A.S.summary.over}; });
      if (st.phase === 'summary' && st.over){ acted = 'over'; break; }
      if (st.phase === 'summary'){ const vis = await p.evaluate(() => !document.getElementById('sumOv').hidden && !document.getElementById('bNext').disabled); if (vis){ await p.click('#bNext'); rounds++; acted = true; await sleep(300); } continue; }
      if (st.can){ await p.click('#hand0 .card-btn:not([disabled])'); moves++; acted = true; await sleep(120); }
    }
    if (acted === 'over') break;
    if (!acted) await sleep(80);
  }
  const fin = async p => p.evaluate(() => { const S = window.__app.S; return {seq: S.seq, round: S.round, wins: S.wins, phase: S.phase}; });
  R.final = {phone: await fin(phone), tv: await fin(tv), moves, nextPresses: rounds};
  const fp = R.final.phone, ft = R.final.tv;
  R.inSync = fp.seq === ft.seq && fp.wins[0] === ft.wins[0] && fp.wins[1] === ft.wins[1];

  // 4) chat from TV to phone
  await tv.evaluate(() => window.__app.sendChat('t', 7));
  await sleep(800);
  R.phoneGotChat = await phone.evaluate(() => window.__app.CHATLOG.some(m => !m.me && m.text.includes('GG')));

  // 5) phone goes back to menu -> TV sees the opponent left; TV leaves -> game deleted
  await phone.evaluate(() => document.getElementById('bSumMenu').click());
  await sleep(800);
  R.tvMsgAfterPhoneLeft = await tv.evaluate(() => window.__app.NET.gameDoc && window.__app.NET.gameDoc.status);
  await tv.evaluate(() => document.getElementById('bSumMenu').click());
  await sleep(800);
  R.gameDeletedAfterBothLeft = store.get('games/' + gid) === null;
  R.phoneBackOnEntry = await phone.evaluate(() => window.__app.APP.screen);

  // 6) cancel: phone searches then cancels -> slot cleared
  await phone.click('#chRnd'); await sleep(1200);
  R.slotWhileSearching = !!store.get('match/waiting');
  await phone.click('#mmCancel'); await sleep(800);
  R.slotAfterCancel = store.get('match/waiting');

  // 7) three devices search at once -> exactly two get a game, the third keeps waiting
  await Promise.all([phone.click('#chRnd'), tv.click('#chRnd'), pc.click('#chRnd')]);
  await sleep(4000);
  const scr = await Promise.all([phone, tv, pc].map(p => p.evaluate(() => window.__app.APP.screen + (document.getElementById('mmOv').hidden ? '' : '+searching'))));
  R.threeWay = scr;
  // 8) a fourth arrives later? the waiting one should then match with a new searcher (phone after exit)
  const waiter = [phone, tv, pc][scr.findIndex(s => s.includes('searching'))];
  R.waiterExists = !!waiter;

  console.log(JSON.stringify(R, null, 1));
  console.log('errors:', JSON.stringify(errors));
  await b.close();
})();
