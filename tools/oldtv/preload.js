// Runs in the TV page before its scripts: the fake Firebase modules call window.__mf, which goes over HTTP
var PORT = 9317, B = 'http://127.0.0.1:' + PORT;
window.__mf = function(op, a){
  return fetch(B + '/mf', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({op: op, a: a})}).then(function(r){ return r.json(); });
};
var es = new EventSource(B + '/events');
window.__sseN = 0; es.onopen = function(){ window.__sseOpen = true; }; es.onerror = function(){ window.__sseErr = (window.__sseErr||0) + 1; };
es.onmessage = function(e){ window.__sseN++; var m = JSON.parse(e.data); var f = m.ev === 'fs' ? window.__mfFsFire : window.__mfFire; if (f) f(m.id, m.v); };
