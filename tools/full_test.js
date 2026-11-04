const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 420, height: 820 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(800);

  // 1) play 3 full CPU matches (5 rounds each) with animations off, clicking real buttons
  const res = await page.evaluate(async () => {
    const A = window.__app; A.SET.anim = false; A.SET.sound = false;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const out = [];
    for (let match = 0; match < 3; match++) {
      A.startCpuWith(5);
      let guard = 0, checks = [];
      while (guard++ < 2000) {
        const S = A.S;
        if (S.phase === 'summary') {
          // verify scoring of this round against the rules
          const { t, pts, most } = S.summary;
          for (const k of [0, 1]) {
            const exp = t[k].aces + t[k].jacks + t[k].two + t[k].ten + t[k].pis + (most === k ? 3 : 0);
            if (exp !== pts[k]) checks.push('pts mismatch');
          }
          const total = t[0].n + t[1].n;
          if (total !== 52) checks.push('cards ' + total);
          if (S.summary.over) break;
          document.getElementById('bNext').click();
          await sleep(60);
          continue;
        }
        if (A.canAct()) {
          const btn = document.querySelector('#hand0 .card-btn:not([disabled])');
          if (btn) btn.click();
        }
        await sleep(40);
      }
      const W = A.S.wins;
      out.push({ match, rounds: A.S.round, wins: W, ties: A.S.ties || 0, over: A.S.summary && A.S.summary.over, checks: [...new Set(checks)] });
    }
    return out;
  });
  console.log('matches:', JSON.stringify(res));

  // 2) race: start a new CPU game while the computer is mid-move
  const race = await page.evaluate(async () => {
    const A = window.__app; A.SET.anim = true;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let tries = 0, bad = 0;
    for (let k = 0; k < 6; k++) {
      A.startCpuWith(3);
      // make human play so that AI starts its turn
      for (let w = 0; w < 50 && !A.canAct(); w++) await sleep(50);
      const btn = document.querySelector('#hand0 .card-btn:not([disabled])'); if (btn) btn.click();
      await sleep(700);          // AI is now mid-animation
      A.startCpuWith(3);         // start a fresh game right now
      const fresh = JSON.stringify({ h0: A.S.hands[0].length, h1: A.S.hands[1].length, p: A.S.pile.length, seq: A.S.seq });
      await sleep(1800);         // let the old animation finish
      tries++;
      const S = A.S;
      // the new game must be untouched by the old AI move: either still fresh, or advanced by legit play
      const cards = S.hands[0].length + S.hands[1].length + S.pile.length + S.deck.length + S.cap[0].length + S.cap[1].length;
      if (cards !== 52) bad++;
      if (S.round !== 1) bad++;
    }
    return { tries, bad };
  });
  console.log('race:', JSON.stringify(race));
  console.log('errors:', JSON.stringify(errors));
  await b.close();
})();
