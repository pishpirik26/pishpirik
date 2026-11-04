// Every screen at phone / tablet / PC sizes: screenshots + overflow checks.
const { chromium } = require('playwright');
const { attach } = require('./mockfb.js');
const path = require('path');
const OUT = path.resolve(__dirname, 'shots'); require('fs').mkdirSync(OUT, {recursive:true});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const VPS = [['p320',320,568,true],['p390',390,844,true],['land',844,390,true],['tab',768,1024,true],['pc',1440,900,false]];
(async () => {
  const b = await chromium.launch();
  for (const [tag, W, H, mobile] of VPS){
    const ctx = await b.newContext({ viewport:{width:W,height:H}, isMobile:mobile, hasTouch:mobile, deviceScaleFactor:1 });
    const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
    await attach(p, tag);
    await p.goto('http://localhost:8765/index.html');
    await p.waitForFunction(() => window.__app && window.__app.NET.state==='ok');
    await p.evaluate(()=>{ window.__app.SET.anim=false; window.__app.SET.sound=false; });
    const check = async (name) => {
      await sleep(300);
      const r = await p.evaluate(() => {
        const W = innerWidth, sw = document.documentElement.scrollWidth;
        const bad = [];
        document.querySelectorAll('button, input, .card, h1, h2, .panel, .row, .chip, .sheet').forEach(e => {
          if (!e.getClientRects().length || e.closest('[hidden]')) return;
          const r = e.getBoundingClientRect();
          if (r.right > W + 1 || r.left < -1) bad.push((e.id || e.className || e.tagName).toString().slice(0,30) + '@' + Math.round(r.left) + '..' + Math.round(r.right));
        });
        // text that is cut inside buttons
        const cut = [...document.querySelectorAll('button')].filter(e => e.getClientRects().length && !e.closest('[hidden]') && e.scrollWidth > e.clientWidth + 2).map(e => (e.id || e.textContent.trim()).slice(0,24));
        return {hscroll: sw > W + 1 ? sw : 0, outside: [...new Set(bad)].slice(0,6), cutText: [...new Set(cut)].slice(0,6)};
      });
      await p.screenshot({path: `${OUT}/${tag}-${name}.png`, fullPage: true});
      const issues = r.hscroll || r.outside.length || r.cutText.length;
      console.log(tag, name.padEnd(9), issues ? JSON.stringify(r) : 'ok');
    };
    await check('entry');
    // rules + settings from entry
    await p.click('#bSet'); await check('settings'); await p.keyboard.press('Escape');
    await p.evaluate(()=>{ document.getElementById('setOv').hidden=true; document.getElementById('bRules').click(); }); await check('rules'); await p.evaluate(()=>document.getElementById('rulesOv').hidden=true);
    // search overlay
    await p.click('#chRnd'); await sleep(1200); await check('search'); await p.click('#mmCancel'); await sleep(500);
    // create account -> lobby
    await p.evaluate(()=>window.__app.show('entry'));
    await p.evaluate(()=>document.getElementById('tabUp').click());
    await p.fill('#upUser', 'lojtari_' + tag); await p.fill('#upPass', 'secret12'); await p.fill('#upPass2', 'secret12');
    await p.click('#upBtn'); await sleep(1500);
    await p.fill('#addUser', 'someone_long_name'); await check('lobby');
    // CPU game + chat + summary
    await p.evaluate(()=>window.__app.startCpuWith(1)); await sleep(800); await check('game');
    await p.click('#bChat'); await check('chat'); await p.evaluate(()=>document.getElementById('chatOv').hidden=true);
    for (let i=0;i<600;i++){ const s = await p.evaluate(()=>{ const A=window.__app; if (A.S.phase==='summary') return 'sum'; if (A.canAct()){ document.querySelector('#hand0 .card-btn:not([disabled])').click(); } return ''; }); if (s==='sum') break; await sleep(60); }
    await sleep(500); await check('summary');
    await p.evaluate(()=>document.getElementById('sumOv').hidden=true);
    // captured cards viewer
    await p.evaluate(()=>{ const b=[...document.querySelectorAll('.cap-chip')].find(x=>!x.disabled); if(b) b.click(); }); await check('captured');
    if (errs.length) console.log(tag, 'ERRORS', errs);
    await ctx.close();
  }
  await b.close();
})();
