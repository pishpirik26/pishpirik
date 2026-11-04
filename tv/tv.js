/* ===== Telekomanda: shigjetat lëvizin fokusin, OK shtyp, Back kthehet ===== */
(function(){
  'use strict';
  var KEY = {LEFT:37, UP:38, RIGHT:39, DOWN:40, ENTER:13, BACK:461, ESC:27, BACKSPACE:8};
  var SEL = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';
  var lastRect = null, lastHandIdx = -1;

  function $(id){ return document.getElementById(id); }
  function visible(el){
    if (!el || el.disabled || el.closest('[hidden]')) return false;
    if (!el.getClientRects().length) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }
  // The topmost open dialog takes the focus; otherwise the page itself
  function scope(){
    var ovs = Array.prototype.filter.call(document.querySelectorAll('.overlay'), function(o){ return !o.hidden; });
    return ovs.length ? ovs[ovs.length - 1] : null;
  }
  function candidates(){
    var root = scope();
    var list = Array.prototype.slice.call((root || document).querySelectorAll(SEL));
    return list.filter(function(el){ return visible(el) && (root || !el.closest('.overlay')); });
  }
  function center(r){ return {x:r.left + r.width / 2, y:r.top + r.height / 2}; }

  var LOG = [];
  function setFocus(el, why){
    if (!el) return;
    LOG.push((why||'?')+':'+(el.id||String(el.className).split(' ')[0])+(el.closest('#hand0')?'#h':'')); if (LOG.length>14) LOG.shift();
    var prev = document.querySelector('.tv-focus');
    if (prev && prev !== el) prev.classList.remove('tv-focus');
    el.classList.add('tv-focus');
    if (document.activeElement !== el) { try { el.focus({preventScroll:true}); } catch(e){ el.focus(); } }
    if (el.scrollIntoView && el.closest('.sheet, #scrLobby')) el.scrollIntoView({block:'nearest'});
    lastRect = el.getBoundingClientRect();
    var h = el.closest('#hand0');
    lastHandIdx = h ? Array.prototype.indexOf.call(h.children, el) : -1;
  }
  function current(){
    var a = document.activeElement;
    return (a && a !== document.body && visible(a) && candidates().indexOf(a) >= 0) ? a : null;
  }

  // Where focus should land when nothing sensible has it
  function preferred(){
    var root = scope(), c = candidates();
    if (!c.length) return null;
    if (root){
      return root.querySelector('.btn.primary:not([disabled])') && visible(root.querySelector('.btn.primary:not([disabled])'))
        ? root.querySelector('.btn.primary:not([disabled])') : c[0];
    }
    var scr = document.body.dataset.screen;
    if (scr === 'game'){
      var hand = Array.prototype.filter.call($('hand0').children, visible);
      if (hand.length) return hand[Math.min(Math.max(lastHandIdx, 0), hand.length - 1)];
    }
    if (scr === 'entry' && visible($('chCpu'))){
      var lg = $('bToLobby');
      return visible(lg) ? lg : $('chCpu');
    }
    if (lastRect) return nearest(c, center(lastRect));
    return c[0];
  }
  function nearest(c, p){
    var best = null, bd = Infinity;
    c.forEach(function(el){
      var q = center(el.getBoundingClientRect()), d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bd){ bd = d; best = el; }
    });
    return best;
  }

  // Spatial navigation: closest element in the pressed direction, favouring the same row/column
  function move(dir){
    var cur = current();
    if (!cur){ setFocus(preferred(), 'nocur'); return; }
    var r = cur.getBoundingClientRect(), p = center(r), best = null, bs = Infinity;
    var pool = candidates();
    if (cur.closest('#hand0') && (dir === 'left' || dir === 'right')) pool = pool.filter(function(el){ return el.parentNode === cur.parentNode; });
    pool.forEach(function(el){
      if (el === cur) return;
      var q = el.getBoundingClientRect(), c = center(q), main, cross;
      // gap between the two boxes on an axis (0 when they overlap), so wide fields line up with narrow buttons
      function gap(a1, a2, b1, b2){ return Math.max(0, Math.max(a1, b1) - Math.min(a2, b2)); }
      if (dir === 'left'){  if (c.x >= p.x - 4 || q.right > r.right) return; main = Math.max(0, r.left - q.right) + (p.x - c.x) * .1; cross = gap(r.top, r.bottom, q.top, q.bottom); }
      if (dir === 'right'){ if (c.x <= p.x + 4 || q.left < r.left) return; main = Math.max(0, q.left - r.right) + (c.x - p.x) * .1; cross = gap(r.top, r.bottom, q.top, q.bottom); }
      if (dir === 'up'){    if (c.y >= p.y - 4 || q.bottom > r.bottom) return; main = Math.max(0, r.top - q.bottom) + (p.y - c.y) * .1; cross = gap(r.left, r.right, q.left, q.right); }
      if (dir === 'down'){  if (c.y <= p.y + 4 || q.top < r.top) return; main = Math.max(0, q.top - r.bottom) + (c.y - p.y) * .1; cross = gap(r.left, r.right, q.left, q.right); }
      // majtas/djathtas qëndron në të njëjtin rresht (p.sh. nga karta e fundit mos kërce te "Menyja")
      if ((dir === 'left' || dir === 'right') && cross > 0) return;
      var score = main + cross * 3;
      if (score < bs){ bs = score; best = el; }
    });
    if (best){ setFocus(best, 'mv-'+dir); if (window.__tvSfx) window.__tvSfx(); }
  }

  function isTextField(el){
    return el && el.tagName === 'INPUT' && /^(text|password|email|search|number|tel|url)$/i.test(el.type || 'text') || (el && el.tagName === 'TEXTAREA');
  }

  function back(){
    var root = scope();
    if (root){
      if (root.id === 'sumOv'){ $('bSumMenu').click(); return; }
      if (root.id === 'mmOv'){ $('mmCancel').click(); return; }   // kërkimi i lojtarit: Back = Anulo (jo thjesht mbyll dritaren)
      var close = root.querySelector('[data-close]');
      if (close) close.click(); else root.hidden = true;
      return;
    }
    var scr = document.body.dataset.screen;
    if (scr === 'game'){ $('bBack').click(); return; }
    if (scr === 'lobby'){ $('bHome').click(); return; }
    // Hyrja: dil nga aplikacioni (kthehu te ekrani i TV-së)
    if (window.webOS && typeof webOS.platformBack === 'function') webOS.platformBack();
    else window.close();
  }

  document.addEventListener('keydown', function(e){
    var k = e.keyCode, a = document.activeElement;
    if (k === KEY.BACK || (k === KEY.ESC) || (k === KEY.BACKSPACE && !isTextField(a))){
      e.preventDefault(); e.stopPropagation(); back(); return;
    }
    var dir = k === KEY.LEFT ? 'left' : k === KEY.RIGHT ? 'right' : k === KEY.UP ? 'up' : k === KEY.DOWN ? 'down' : null;
    if (dir){
      if (isTextField(a) && (dir === 'left' || dir === 'right')){
        // let the caret move inside the field until it reaches the edge
        try {
          var atStart = a.selectionStart === 0 && a.selectionEnd === 0, atEnd = a.selectionStart === a.value.length;
          if ((dir === 'left' && !atStart) || (dir === 'right' && !atEnd)) return;
        } catch(err){}
      }
      if (a && a.type === 'range' && (dir === 'left' || dir === 'right')) return;
      e.preventDefault(); move(dir); return;
    }
    if (k === KEY.ENTER && a && a.tagName === 'INPUT' && (a.type === 'checkbox' || a.type === 'radio')){
      e.preventDefault(); a.click(); return;
    }
  }, true);

  // The game re-draws hands and opens dialogs on its own; keep a sensible element focused
  var lastTurn = '';
  function keepFocus(){
    var root = scope(), a = document.activeElement, mark = document.querySelector('.tv-focus');
    if (mark && mark !== a) mark.classList.remove('tv-focus');
    // Kur vjen radha jote (sidomos online, kur kundërshtari hedh i pari), fokusi shkon te kartat e tua;
    // përndryshe mbetet te "Cilësimet" dhe OK e hap atë në vend që të luajë
    var turn = document.body.dataset.screen === 'game' ? ($('scrGame').dataset.turn || '') : '';
    if (turn !== lastTurn){
      if (turn !== 'me' || root) lastTurn = turn;
      else {
        var mine = Array.prototype.filter.call($('hand0').children, visible);
        if (mine.length){                       // kartat u aktivizuan: tani (jo gjatë animacionit) e kalojmë fokusin
          lastTurn = turn;
          if (!(a && a.closest && a.closest('#hand0'))){ setFocus(mine[Math.min(Math.max(lastHandIdx, 0), mine.length - 1)], 'my-turn'); return; }
        }
      }
    }
    var ok = a && a !== document.body && visible(a) && (root ? root.contains(a) : !a.closest('.overlay'));
    // Gjatë radhës së CPU-së kartat e tua janë të çaktivizuara: prit aty, mos e hidh fokusin te chat-i
    if (!ok && !root && document.body.dataset.screen === 'game' && lastHandIdx >= 0){
      var live = Array.prototype.filter.call($('hand0').children, visible);
      if (!live.length) return;
    }
    if (ok){ if (!a.classList.contains('tv-focus') && candidates().indexOf(a) >= 0) setFocus(a, 'keep-ok'); else if (a.classList.contains('tv-focus')) lastRect = a.getBoundingClientRect(); return; }
    var p = preferred();
    if (p) setFocus(p, 'keep-pref');
  }

  // Në tavolinë shiriti i sipërm fshihet, kështu që cilësimet shkojnë në shiritin e lojës
  (function(){
    var act = $('bGameAct');
    if (!act || $('bSetTv')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btn'; b.id = 'bSetTv'; b.textContent = 'Cilësimet';
    b.onclick = function(){ $('bSet').click(); };
    var wrap = document.createElement('span'); wrap.className = 'tv-acts';
    act.parentNode.insertBefore(wrap, act); wrap.appendChild(b); wrap.appendChild(act);
  })();

  setInterval(function(){ try { keepFocus(); } catch(err){ window.__tvErr = String(err && err.stack || err); } }, 200);
  window.__tvDbg = function(){ return {idx:lastHandIdx, err:window.__tvErr || null, log:LOG.join(' ')}; };

  // Magic Remote (shigjeta në ekran): fokusi ndjek treguesin
  document.addEventListener('mouseover', function(e){
    var el = e.target.closest && e.target.closest(SEL);
    if (el && visible(el) && candidates().indexOf(el) >= 0) setFocus(el, 'mouse');
  });
  document.addEventListener('focusin', function(e){
    var el = e.target;
    if (el && el.classList && !el.classList.contains('tv-focus') && candidates().indexOf(el) >= 0) setFocus(el, 'focusin');
  });
})();
