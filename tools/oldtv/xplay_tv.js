// TV side of oldtv_xplay.js: search for a player with the remote, play every turn with OK, read the result
module.exports = async ({ evalJS, key, shot, sleep, result }) => {
  await sleep(1500);
  result.netState = await evalJS(`window.__app && window.__app.NET.state`);
  result.fb = await evalJS(`({v: window.__fbVersion || 10, fake8: !!(window.firebase && window.firebase.__fake8), nogrid: document.documentElement.className})`);
  await evalJS(`document.getElementById('chRnd').focus()`); await key('Enter'); await sleep(2500);
  await shot('tv-search');
  result.search = await evalJS(`(function(){var o=document.getElementById('mmOv'); return o && !o.hidden ? o.innerText.replace(/\\s+/g,' ').slice(0,120) : 'closed'})()`);
  let plays = 0, rounds = [], idle = 0;
  for (let i = 0; i < 1500; i++){
    const st = await evalJS(`(function(){ var A=window.__app; var s=document.getElementById('sumOv'); if (s && !s.hidden) return 'sum'; if (document.body.dataset.screen!=='game') return 'wait'; return A.canAct() ? 'me' : 'wait'; })()`);
    if (st === 'sum'){
      const t = await evalJS(`document.getElementById('sumOv').innerText.replace(/\\s+/g,' ').slice(0,110)`);
      if (!rounds.includes(t)) rounds.push(t);
      const next = await evalJS(`(function(){var b=document.getElementById('bNext'); return !!(b && b.getClientRects().length && !b.disabled)})()`);
      if (next && rounds.length < 4){ await evalJS(`document.getElementById('bNext').focus()`); await key('Enter'); await sleep(1500); continue; }
      if (!next) break;
      await sleep(400); continue;
    }
    if (st === 'me'){
      // si njeri: OK vetëm kur fokusi është te kartat (tv.js e çon vetë aty kur vjen radha)
      let inHand = false;
      for (let w = 0; w < 10 && !inHand; w++){ inHand = await evalJS(`!!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#hand0'))`); if (!inHand) await sleep(200); }
      if (!inHand){ result.focusMiss = (result.focusMiss || 0) + 1; result.focusAt = await evalJS(`(document.activeElement||{}).id || String((document.activeElement||{}).className)`); await sleep(300); continue; }
      idle = 0; if (plays === 3) await shot('tv-game'); await key('Enter'); plays++; await sleep(600); } else { await sleep(300); if (++idle > 150) { result.stalled = true; break; } }
  }
  result.plays = plays; result.rounds = rounds; result.sse = await evalJS('({n: window.__sseN, open: window.__sseOpen, err: window.__sseErr, scr: document.body.dataset.screen, mm: !document.getElementById("mmOv").hidden})');
  result.state = await evalJS(`(function(){var A=window.__app, S=A.S||{}; return {seq:S.seq, turn:S.turn, phase:S.phase, me:A.APP.me, anim:A.NET.animating, pending:!!A.NET.pending, pendSeq:A.NET.pending&&A.NET.pending.seq, busy:A.APP.busy, docSeq: A.NET.gameDoc && A.NET.gameDoc.G && A.NET.gameDoc.G.seq}})()`);
  result.f8 = await evalJS('JSON.stringify(window.__f8dbg)');
  await shot('tv-end');
  result.chatGot = await evalJS(`document.getElementById('bChat') ? document.getElementById('bChat').className : null`);
  await key('Escape'); await sleep(800);
  result.afterBack = await evalJS(`document.body.dataset.screen`);
  result.tvErr = await evalJS('window.__tvErr || null');
};
