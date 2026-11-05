/* Për TV-të e vjetra LG (webOS 5, 2020): funksione që motori i tyre (Chrome 68) s'i ka. ES5, pa varësi. */
(function(){
  'use strict';
  var g = typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : window;
  if (typeof globalThis === 'undefined') { try { Object.defineProperty(Object.prototype, '__gT', {get: function(){ return this; }, configurable: true}); __gT.globalThis = __gT; delete Object.prototype.__gT; } catch (e) { window.globalThis = window; } }
  try { window.__noConic = !(window.CSS && CSS.supports('background-image', 'conic-gradient(red, blue)')); } catch (e) { window.__noConic = true; }
  function def(o, k, f){ if (!o[k]) Object.defineProperty(o, k, {value: f, writable: true, configurable: true}); }
  def(Array.prototype, 'flat', function(d){ d = d === undefined ? 1 : Math.floor(d); var out = []; (function fl(a, n){ for (var i = 0; i < a.length; i++){ if (!(i in a)) continue; if (Array.isArray(a[i]) && n > 0) fl(a[i], n - 1); else out.push(a[i]); } })(this, d); return out; });
  def(Array.prototype, 'flatMap', function(f, t){ return Array.prototype.map.call(this, f, t).flat(1); });
  def(Object, 'fromEntries', function(it){ var o = {}; Array.from(it).forEach(function(e){ o[e[0]] = e[1]; }); return o; });
  def(String.prototype, 'replaceAll', function(a, b){ if (a instanceof RegExp) return this.replace(a, b); return this.split(a).join(typeof b === 'function' ? b(a) : b); });
  def(Promise, 'allSettled', function(ps){ return Promise.all(Array.from(ps).map(function(p){ return Promise.resolve(p).then(function(v){ return {status: 'fulfilled', value: v}; }, function(r){ return {status: 'rejected', reason: r}; }); })); });
  if (typeof g.queueMicrotask !== 'function') g.queueMicrotask = function(f){ Promise.resolve().then(f); };
  [Element.prototype, Document.prototype, DocumentFragment.prototype].forEach(function(p){
    def(p, 'replaceChildren', function(){ while (this.lastChild) this.removeChild(this.lastChild); if (arguments.length) this.append.apply(this, arguments); });
  });
  // TV-të 2018–2019 (webOS 4.x, Chrome 53)
  def(Object, 'values', function(o){ return Object.keys(o).map(function(k){ return o[k]; }); });
  def(Object, 'entries', function(o){ return Object.keys(o).map(function(k){ return [k, o[k]]; }); });
  def(Object, 'getOwnPropertyDescriptors', function(o){ var r = {}; Object.getOwnPropertyNames(o).concat(Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(o) : []).forEach(function(k){ r[k] = Object.getOwnPropertyDescriptor(o, k); }); return r; });
  def(String.prototype, 'padStart', function(n, s){ var t = String(this); s = s === undefined ? ' ' : String(s); if (t.length >= n || !s) return t; while (s.length < n - t.length) s += s; return s.slice(0, n - t.length) + t; });
  def(String.prototype, 'padEnd', function(n, s){ var t = String(this); s = s === undefined ? ' ' : String(s); if (t.length >= n || !s) return t; while (s.length < n - t.length) s += s; return t + s.slice(0, n - t.length); });
  def(Promise.prototype, 'finally', function(f){ var P = this.constructor || Promise; return this.then(function(v){ return P.resolve(f()).then(function(){ return v; }); }, function(e){ return P.resolve(f()).then(function(){ throw e; }); }); });
  function nodes(args){ var f = document.createDocumentFragment(); Array.prototype.forEach.call(args, function(n){ f.appendChild(n instanceof Node ? n : document.createTextNode(String(n))); }); return f; }
  [Element.prototype, Document.prototype, DocumentFragment.prototype].forEach(function(p){
    def(p, 'append', function(){ this.appendChild(nodes(arguments)); });
    def(p, 'prepend', function(){ this.insertBefore(nodes(arguments), this.firstChild); });
  });
  [Element.prototype, CharacterData.prototype].forEach(function(p){
    def(p, 'before', function(){ if (this.parentNode) this.parentNode.insertBefore(nodes(arguments), this); });
    def(p, 'after', function(){ if (this.parentNode) this.parentNode.insertBefore(nodes(arguments), this.nextSibling); });
    def(p, 'replaceWith', function(){ if (this.parentNode) this.parentNode.replaceChild(nodes(arguments), this); });
  });
  // pa CSS grid (Chrome < 57): tv.css ka pamjen rezervë nën html.nogrid
  // ?as53 = test në motor më të ri: sillu si Chrome 53 (pa grid, Firebase 8, lista e gap-it)
  window.__as53 = /[?&]as53\b/.test(location.search);
  try { if (window.__as53 || !(window.CSS && CSS.supports('display', 'grid'))) document.documentElement.className += ' nogrid'; } catch (e) { document.documentElement.className += ' nogrid'; }
  def(Element.prototype, 'toggleAttribute', function(n, f){ var has = this.hasAttribute(n); if (f === undefined) f = !has; if (f) this.setAttribute(n, ''); else this.removeAttribute(n); return f; });
})();
