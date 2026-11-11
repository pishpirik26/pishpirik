/* ===== Gjuha (Shqip / English) =====
   Loja shkruhet shqip; kur gjuha është English, çdo tekst në ekran përkthehet këtu (edhe ai që shfaqet më vonë).
   ES5, që të punojë edhe në TV-të e vjetra. */
(function(){
  'use strict';
  var EN = /*EN*/{}/*END*/;
  var FN = {
    RES_FINAL: function(m, pre, a, b, c, d){ return (pre ? tr(pre) + ' ' : '') + '(' + a + '–' + b + '). Final score in rounds: ' + c + '–' + d + '.'; },
    INVR: function(m, n){ return 'Pishpirik · ' + n + (n === '1' ? ' round' : ' rounds'); },
    INVSENT: function(m, n){ return 'Invite sent (' + n + (n === '1' ? ' round' : ' rounds') + ') · waiting'; },
    RES: function(m, pre, a, b, c, d){ return (pre ? tr(pre) + ' ' : '') + '(' + a + '–' + b + '). Rounds won: ' + c + '–' + d + '.'; },
    LOBBYGAME: function(m, a, b, r, R, turn){ return a + ' – ' + b + ' · round ' + r + '/' + R + (turn ? ' · Your turn' : ''); },
    LOBBYDONE: function(m, w, a, b){ return {Fitove: 'Won', Humbe: 'Lost', Barazim: 'Draw'}[w] + ' ' + a + '–' + b; },
    NUMNAME: function(m, n, name){ return n + '. ' + tr(name); },
    STATS: function(m, dot, w, l, x, f){ return (dot ? '· ' : '') + w + (w === '1' ? ' win · ' : ' wins · ') + l + (l === '1' ? ' loss' : ' losses') + (f !== undefined ? ' · ' + f + (f === '1' ? ' friend' : ' friends') : ''); }
  };
  var RX = [/*RX*/];
  var KEY = 'pishpirik-lang';
  function pick(){
    var q = /[?&]lang=(sq|en)\b/.exec(location.search); if (q) return q[1];
    try { var s = localStorage.getItem(KEY); if (s === 'sq' || s === 'en') return s; } catch (e) {}
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    if (/^sq/i.test(nav)) return 'sq';
    // TV: gjuha e TV-së (jo shqip -> English); web: shqip si gjithmonë
    return /web0s|webos|netcast|smart-?tv/i.test(navigator.userAgent) ? 'en' : 'sq';
  }
  var lang = pick();
  var miss = window.__i18nMiss = {};
  function tr(s){
    if (lang === 'sq' || !s) return s;
    var t = s.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
    if (!t) return s;
    var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    var out = EN.hasOwnProperty(t) ? EN[t] : null;
    if (out === null){
      for (var i = 0; i < RX.length; i++){
        var m = t.match(RX[i][0]);
        if (m){
          // emrat brenda fjalisë (p.sh. "Lojtar", "Kompjuteri") përkthehen edhe ata
          out = typeof RX[i][1] === 'function' ? RX[i][1].apply(null, m)
            : RX[i][1].replace(/\$(\d)/g, function(_, k){ return name(m[+k] || ''); });
          break;
        }
      }
    }
    if (out === null){
      if (/[a-zëç]{3}/i.test(t) && /[ëç]|\b(të|një|me|nuk|për|nga|dhe|ose|je|ke|po|s’|ka|e|i)\b/i.test(t)) miss[t] = (miss[t] || 0) + 1;
      return s;
    }
    return lead + out + trail;
  }
  // emrat e lojtarëve brenda fjalive: "Lojtar AB12" -> "Player AB12", "Kompjuteri" -> "Computer"
  function name(g){ if (EN.hasOwnProperty(g)) return EN[g]; var m = /^Lojtar (\S+)$/.exec(g); return m ? 'Player ' + m[1] : g; }
  window.T = tr;                                       // për tekstet që s'janë në faqe (p.sh. titulli)
  var ATTR = ['placeholder', 'title', 'aria-label'];
  function skip(el){ return el && el.closest && el.closest('[data-noi18n], script, style, textarea, .chat-log .me-txt'); }
  function doText(n){
    if (skip(n.parentNode)) return;
    if (n.__sq === undefined || (n.data !== n.__en)) n.__sq = n.data;   // teksti origjinal (shqip)
    var v = lang === 'sq' ? n.__sq : tr(n.__sq);
    n.__en = v;
    if (n.data !== v) n.data = v;
  }
  function doAttrs(el){
    if (skip(el)) return;
    for (var i = 0; i < ATTR.length; i++){
      var a = ATTR[i]; if (!el.hasAttribute(a)) continue;
      var cur = el.getAttribute(a), store = el.__sqA || (el.__sqA = {}), done = el.__enA || (el.__enA = {});
      if (store[a] === undefined || cur !== done[a]) store[a] = cur;
      var v = lang === 'sq' ? store[a] : tr(store[a]); done[a] = v;
      if (cur !== v) el.setAttribute(a, v);
    }
  }
  function walk(root){
    if (root.nodeType === 3){ doText(root); return; }
    if (root.nodeType !== 1 || skip(root)) return;
    doAttrs(root);
    var w = document.createTreeWalker(root, 5, null, false), n;   // elementet + teksti
    while ((n = w.nextNode())){ if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  var busy = false;
  var mo = new MutationObserver(function(recs){
    if (busy) return; busy = true;
    try {
      for (var i = 0; i < recs.length; i++){
        var r = recs[i];
        if (r.type === 'characterData') doText(r.target);
        else if (r.type === 'attributes') doAttrs(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
      }
    } finally { mo.takeRecords(); busy = false; }
  });
  function start(){
    walk(document.body);
    if (document.title) document.title = tr(document.title);
    mo.observe(document.body, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR});
  }
  window.I18N = {
    get lang(){ return lang; },
    set: function(l){
      if (l !== 'sq' && l !== 'en') return; lang = l;
      try { localStorage.setItem(KEY, l); } catch (e) {}
      document.documentElement.lang = l;
      busy = true; try { walk(document.body); } finally { mo.takeRecords(); busy = false; }
      var b = document.querySelectorAll('#sLang button');
      for (var i = 0; i < b.length; i++) b[i].setAttribute('aria-checked', b[i].getAttribute('data-v') === l ? 'true' : 'false');
    }
  };
  document.documentElement.lang = lang;
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
