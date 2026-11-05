// Every TV screen once (account, lobby, settings + password form, chat, round summary, captured cards), screenshots + checks.
// Run through oldtv_xplay.js --scenario=tools/oldtv/screens_tv.js (fake Firebase), with or without --as53.
module.exports = async ({ evalJS, key, shot, sleep, result }) => {
  const probe = `(function(){ var root=[].slice.call(document.querySelectorAll('.overlay')).filter(function(o){return !o.hidden}).pop() || document.querySelector('.screen:not([hidden])') || document.body;
    var els=[].slice.call(root.querySelectorAll('button, input, .card, .tile, h1, h2, h3, p, label')).filter(function(e){ return e.getClientRects().length && getComputedStyle(e).visibility!=='hidden'; });
    var off=[], cut=[]; els.forEach(function(e){ var r=e.getBoundingClientRect(); if (r.right>innerWidth+2||r.left<-2||r.bottom>innerHeight+2&&!e.closest('.sheet')) off.push(e.id||String(e.className).split(' ')[0]||e.tagName);
      if ((e.tagName==='BUTTON'||e.tagName==='LABEL') && e.scrollWidth>e.clientWidth+2 && getComputedStyle(e).overflow!=='visible') cut.push(e.id||e.textContent.trim().slice(0,20)); });
    return {n:els.length, off:off.slice(0,8), cut:cut.slice(0,8), err: window.__tvErr||null}; })()`;
  const step = async (name) => { await sleep(700); await shot(name); result[name] = await evalJS(probe); };
  await sleep(1500);
  result.net = await evalJS(`window.__app.NET.state + ' fb' + (window.__fbVersion||10) + ' ' + document.documentElement.className`);
  // account
  await evalJS(`document.getElementById('tabUp').click()`);
  await evalJS(`(function(){ function v(id,x){ var e=document.getElementById(id); e.value=x; e.dispatchEvent(new Event('input',{bubbles:true})); } v('upUser','tvtest_old'); v('upPass','secret12'); v('upPass2','secret12'); })()`);
  await step('a-signup');
  await evalJS(`document.getElementById('upBtn').click()`); await sleep(2500);
  result.screenAfterSignup = await evalJS(`document.body.dataset.screen`);
  await step('b-lobby');
  // settings with account + password form
  await evalJS(`document.getElementById('bSet').click()`); await sleep(600);
  await evalJS(`(function(){ var b=[].slice.call(document.querySelectorAll('#setOv button')).filter(function(x){return /fjalëkalim/i.test(x.textContent)})[0]; if(b) b.click(); var s=document.querySelector('#setOv .sheet'); s.scrollTop=s.scrollHeight; })()`);
  await step('c-settings-account');
  await key('Escape'); await sleep(400);
  // CPU game, chat, summary, captured cards
  await evalJS(`window.__app.SET.anim=false; window.__app.startCpuWith(1)`); await sleep(1200);
  await step('d-game');
  await evalJS(`document.getElementById('bChat').click()`);
  await step('e-chat');
  await key('Escape'); await sleep(400);
  for (let i = 0; i < 300; i++){
    const s = await evalJS(`(function(){ var A=window.__app; var o=document.getElementById('sumOv'); if (o && !o.hidden) return 'sum'; if (A.canAct()){ var c=document.querySelector('#hand0 .card-btn:not([disabled])'); if(c) c.click(); } return ''; })()`);
    if (s === 'sum') break; await sleep(120);
  }
  await step('f-summary');
  await evalJS(`document.getElementById('sumOv').hidden=true; (function(){ var b=[].slice.call(document.querySelectorAll('.cap-chip')).filter(function(x){return !x.disabled})[0]; if(b) b.click(); })()`);
  await step('g-captured');
  result.tvErr = await evalJS('window.__tvErr || null');
};
