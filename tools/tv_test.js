// TV build: layout at both resolutions, a full round with remote keys only, Back behaviour.
const { chromium } = require('playwright');
const { attach } = require('./mockfb.js');
const SHOTS = require('path').resolve(__dirname, 'shots') + '/';
const TVUA = 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Chrome/94 Safari/537.36 WebAppManager';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  for (const [W, H, tag] of [[1920, 1080, 'fhd'], [1280, 720, 'hd']]){
    const ctx = await b.newContext({ userAgent: TVUA, viewport: {width: W, height: H} });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await attach(p, 'tv-' + tag);
    await p.goto('file://' + require('path').resolve(__dirname, '../tv/app/index.html'));
    await p.waitForFunction(() => document.body.dataset.screen === 'entry'); await sleep(1500);
    const foc = () => p.evaluate(() => { const a = document.activeElement; return a && a !== document.body ? (a.id || a.className.split(' ')[0]) : 'body'; });
    const R = {tag};
    // layout: the right column must not overlap and must fit on screen
    R.layout = await p.evaluate(() => {
      const ids = ['chCpu', 'chRnd']; const els = ids.map(i => document.getElementById(i)).concat([document.querySelector('#scrEntry .or'), document.querySelector('#scrEntry .auth')]);
      const rs = els.map(e => e.getBoundingClientRect());
      const ov = []; for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++){ const a = rs[i], c = rs[j]; if (a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom) ov.push(i + '/' + j); }
      const off = rs.filter(r => r.bottom > innerHeight + 1 || r.right > innerWidth + 1).length;
      return {overlaps: ov, offscreen: off};
    });
    await p.screenshot({path: SHOTS + `tv-${tag}-entry.png`});
    R.startFocus = await foc();
    const path = []; for (const k of ['ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowUp']){ await p.keyboard.press(k); path.push(await foc()); }
    R.path = path.join(' > ');
    // Back while searching must cancel the search (and must not leave a ghost search running)
    while ((await foc()) !== 'chRnd'){ await p.keyboard.press('ArrowDown'); if (path.length > 20) break; path.push(await foc()); }
    await p.keyboard.press('Enter'); await sleep(1200);
    R.searchOpen = await p.isVisible('#mmOv'); R.searchFocus = await foc();
    await p.screenshot({path: SHOTS + `tv-${tag}-search.png`});
    await p.keyboard.press('Escape'); await sleep(700);
    R.searchAfterBack = await p.evaluate(() => ({overlay: !document.getElementById('mmOv').hidden}));
    // full round vs CPU with keys only (1 round)
    while ((await foc()) !== 'chCpu'){ await p.keyboard.press('ArrowUp'); }
    await p.keyboard.press('Enter'); await sleep(600);
    for (let i = 0; i < 4; i++) await p.keyboard.press('ArrowUp');
    for (let i = 0; i < 6; i++) await p.keyboard.press('ArrowLeft');
    await p.keyboard.press('Enter');                       // choose 1 round
    await p.evaluate(() => document.getElementById('rGo').focus());
    await p.keyboard.press('Enter'); await sleep(3000);
    let plays = 0, stuck = 0;
    for (let t = 0; t < 600; t++){
      const s = await p.evaluate(() => ({sum: !document.getElementById('sumOv').hidden, scr: document.body.dataset.screen,
        inHand: !!(document.activeElement && document.activeElement.closest('#hand0')), live: [...document.querySelectorAll('#hand0 > button')].filter(b => !b.disabled).length}));
      if (s.sum || s.scr !== 'game') break;
      if (s.live && s.inHand){ stuck = 0; if (plays === 6) await p.screenshot({path: SHOTS + `tv-${tag}-game.png`}); await p.keyboard.press('Enter'); plays++; await sleep(350); }
      else { if (s.live && ++stuck > 12){ R.focusLost = await foc(); break; } await sleep(250); }
    }
    R.plays = plays;
    await sleep(1500);
    R.summary = await p.isVisible('#sumOv');
    await p.keyboard.press('Escape'); await sleep(500);
    R.afterBack = await p.evaluate(() => document.body.dataset.screen);
    R.errors = errs;
    console.log(JSON.stringify(R));
    await ctx.close();
  }
  await b.close();
})();
