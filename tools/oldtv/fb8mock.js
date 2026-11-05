// Fake Firebase 8 (namespaced API) on top of window.__mf (same store as mockfb.js), for the Chrome-53 path of tv/fb8.js.
// Served by oldtv_xplay.js as https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js (the other 3 files are empty).
(function(){
  var sid = 0, L = {}, FL = {}; var DBG = window.__f8dbg = {subs: {}, got: {}, offs: 0};
  var prevFire = window.__mfFire, prevFs = window.__mfFsFire;
  window.__mfFire = function(id, v){ DBG.got[id] = (DBG.got[id] || 0) + 1; if (L[id]) L[id](v); else { DBG.orphan = (DBG.orphan || 0) + 1; if (prevFire) prevFire(id, v); } };
  window.__mfFsFire = function(id, v){ if (FL[id]) FL[id](v); else if (prevFs) prevFs(id, v); };
  var mf = function(op, a){ return window.__mf(op, a); };
  function rsnap(path, v){ return { key: path.split('/').pop(), exists: function(){ return v != null; }, val: function(){ return v; } }; }
  function Ref(path){ this.path = path || ''; this.key = this.path.split('/').pop() || null; }
  Ref.prototype.child = function(p){ return new Ref(this.path ? this.path + '/' + p : p); };
  Ref.prototype.get = function(){ var p = this.path; return mf('get', {path: p}).then(function(v){ return rsnap(p, v); }); };
  Ref.prototype.set = function(v){ return mf('set', {path: this.path, v: v}).then(function(){}); };
  Ref.prototype.update = function(v){ return mf('update', {path: this.path, v: v}).then(function(){}); };
  Ref.prototype.remove = function(){ return mf('set', {path: this.path, v: null}).then(function(){}); };
  Ref.prototype.push = function(v){ var r = this.child('-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)); if (v !== undefined) r.set(v); return r; };
  Ref.prototype.on = function(ev, cb){ var id = ++sid, p = this.path; DBG.subs[id] = p; L[id] = function(v){ cb(rsnap(p, v)); }; cb.__ids = (cb.__ids || []).concat([id]);
    mf('sub', {id: id, path: p}).then(function(v){ if (L[id]) cb(rsnap(p, v)); }); return cb; };
  Ref.prototype.off = function(ev, cb){ DBG.offs++; (cb && cb.__ids || []).forEach(function(id){ delete DBG.subs[id]; delete L[id]; mf('unsub', {id: id}); }); };
  Ref.prototype.onDisconnect = function(){ return { remove: function(){ return Promise.resolve(); }, cancel: function(){ return Promise.resolve(); } }; };
  Ref.prototype.transaction = function(fn){
    var p = this.path, n = 0;
    function attempt(cur){
      var nv = fn(cur == null ? null : JSON.parse(JSON.stringify(cur)));
      if (nv === undefined) return {committed: false, snapshot: rsnap(p, cur)};
      return mf('cas', {path: p, expect: cur, v: nv}).then(function(res){
        if (res.ok) return {committed: true, snapshot: rsnap(p, nv)};
        return ++n < 25 ? attempt(res.cur) : {committed: false, snapshot: rsnap(p, res.cur)};
      });
    }
    return mf('get', {path: p}).then(attempt);
  };
  var DB = { ref: function(p){ return new Ref(p); } };
  // Firestore 8
  function dsnap(path, data){ return { id: path.split('/').pop(), exists: data != null, data: function(){ return data; } }; }
  function Q(path, where){ this.path = path; this.w = where || []; }
  Q.prototype.where = function(f, op, v){ return new Q(this.path, this.w.concat([[f, op, v]])); };
  Q.prototype.doc = function(id){ return new D(this.path + '/' + id); };
  Q.prototype.add = function(v){ var id = 'd' + Math.random().toString(36).slice(2); return mf('fsSet', {path: this.path + '/' + id, v: v}).then(function(){ return {id: id}; }); };
  Q.prototype.onSnapshot = function(cb){ var id = ++sid, q = {path: this.path, doc: false, where: this.w};
    function conv(v){ return { docs: v.docs.map(function(d){ return dsnap(d.id, d.data); }), size: v.docs.length, empty: !v.docs.length }; }
    FL[id] = function(v){ cb(conv(v)); }; mf('fsSub', {id: id, q: q}).then(function(v){ if (FL[id]) cb(conv(v)); });
    return function(){ delete FL[id]; mf('fsUnsub', {id: id}); }; };
  function D(path){ this.path = path; this.id = path.split('/').pop(); }
  D.prototype.get = function(){ var p = this.path; return mf('fsGet', {path: p}).then(function(v){ return dsnap(p, v); }); };
  D.prototype.set = function(v, o){ return mf('fsSet', {path: this.path, v: v, merge: !!(o && o.merge)}).then(function(){}); };
  D.prototype.delete = function(){ return mf('fsDel', {path: this.path}).then(function(){}); };
  D.prototype.onSnapshot = function(cb){ var id = ++sid, p = this.path;
    FL[id] = function(v){ cb(dsnap(p, v.data)); }; mf('fsSub', {id: id, q: {path: p, doc: true}}).then(function(v){ if (FL[id]) cb(dsnap(p, v.data)); });
    return function(){ delete FL[id]; mf('fsUnsub', {id: id}); }; };
  var FS = { settings: function(){}, doc: function(p){ return new D(p); }, collection: function(p){ return new Q(p); } };
  // Auth 8
  var auth = { currentUser: null, cbs: [] };
  function fire(){ auth.cbs.forEach(function(cb){ setTimeout(function(){ cb(auth.currentUser); }, 0); }); }
  auth.onAuthStateChanged = function(cb){ auth.cbs.push(cb); setTimeout(function(){ cb(auth.currentUser); }, 0); return function(){}; };
  auth.signInAnonymously = function(){ auth.currentUser = {uid: 'anon8' + Math.random().toString(36).slice(2, 9), isAnonymous: true}; fire(); return Promise.resolve({user: auth.currentUser}); };
  auth.signOut = function(){ auth.currentUser = null; fire(); return Promise.resolve(); };
  auth.createUserWithEmailAndPassword = function(e){ auth.currentUser = {uid: 'u8' + Math.random().toString(36).slice(2, 9), email: e}; fire(); return Promise.resolve({user: auth.currentUser}); };
  auth.signInWithEmailAndPassword = function(){ var e = new Error('x'); e.code = 'auth/invalid-credential'; return Promise.reject(e); };
  var app = { auth: function(){ return auth; }, firestore: function(){ return FS; }, database: function(){ return DB; } };
  window.firebase = { apps: [], initializeApp: function(){ window.firebase.apps = [app]; return app; }, app: function(){ return app; },
    auth: { EmailAuthProvider: { credential: function(){ return {}; } } }, __fake8: true };
})();
