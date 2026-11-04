// A tiny fake Firebase (auth + firestore + realtime db) shared by several Playwright pages.
// The data lives in Node; pages talk to it with exposed functions, Node pushes changes back.
const clone = v => v === undefined ? null : JSON.parse(JSON.stringify(v));
const isEmpty = v => v === null || v === undefined || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
function norm(v){ // RTDB stores arrays as objects-ish; keep arrays but drop empties like RTDB does
  if (v === null || v === undefined) return null;
  if (typeof v !== 'object') return v;
  const out = Array.isArray(v) ? [] : {};
  let any = false;
  for (const k of Object.keys(v)){ const n = norm(v[k]); if (n !== null){ out[k] = n; any = true; } }
  return any ? out : null;
}
class Store {
  constructor(){ this.root = {}; this.subs = []; this.fsSubs = []; this.pages = new Map(); this.seq = 0; }
  segs(p){ return p.split('/').filter(Boolean); }
  get(p){ let n = this.root; for (const s of this.segs(p)){ if (n == null || typeof n !== 'object') return null; n = n[s]; } return n === undefined ? null : clone(n); }
  set(p, v){
    const s = this.segs(p); v = norm(clone(v));
    if (!s.length){ this.root = v || {}; return; }
    let n = this.root;
    for (let i = 0; i < s.length - 1; i++){ if (n[s[i]] == null || typeof n[s[i]] !== 'object') n[s[i]] = {}; n = n[s[i]]; }
    if (v === null) delete n[s[s.length-1]]; else n[s[s.length-1]] = v;
    // prune empty parents
    for (let k = s.length - 1; k > 0; k--){ const par = this.getRef(s.slice(0, k)); if (par && isEmpty(par)) this.setRaw(s.slice(0, k), null); }
  }
  getRef(s){ let n = this.root; for (const x of s){ if (n == null) return null; n = n[x]; } return n; }
  setRaw(s, v){ let n = this.root; for (let i = 0; i < s.length - 1; i++) n = n[s[i]]; if (v === null) delete n[s[s.length-1]]; else n[s[s.length-1]] = v; }
  async notify(changed){
    for (const sub of this.subs){
      const a = sub.path, b = changed;
      if (a === b || a.startsWith(b + '/') || b.startsWith(a + '/') || b === '' || a === ''){
        const v = this.get(sub.path);
        const js = JSON.stringify(v);
        if (js === sub.last) continue; sub.last = js;
        const pg = this.pages.get(sub.page); if (pg) pg.evaluate(([id, v]) => window.__mfFire(id, v), [sub.id, v]).catch(()=>{});
      }
    }
    for (const sub of this.fsSubs){
      const v = this.fsEval(sub.q); const js = JSON.stringify(v);
      if (js === sub.last) continue; sub.last = js;
      const pg = this.pages.get(sub.page); if (pg) pg.evaluate(([id, v]) => window.__mfFsFire(id, v), [sub.id, v]).catch(()=>{});
    }
  }
  fsEval(q){
    if (q.doc){ const v = this.get('__fs/' + q.path); return {doc:true, id:q.path.split('/').pop(), data:v}; }
    const col = this.get('__fs/' + q.path) || {};
    let docs = Object.entries(col).map(([id, data]) => ({id, data}));
    for (const [f, op, val] of (q.where || [])){
      if (op === 'array-contains') docs = docs.filter(d => Array.isArray(d.data[f]) ? d.data[f].includes(val) : Object.values(d.data[f]||{}).includes(val));
      if (op === '==') docs = docs.filter(d => d.data[f] === val);
    }
    return {doc:false, docs};
  }
}
const store = new Store();
async function attach(page, name){
  store.pages.set(name, page);
  await page.exposeFunction('__mf', async (op, a) => {
    if (op === 'get') return store.get(a.path);
    if (op === 'set'){ store.set(a.path, a.v); await store.notify(a.path); return true; }
    if (op === 'update'){ for (const [k, v] of Object.entries(a.v)) store.set(a.path ? a.path + '/' + k : k, v); await store.notify(a.path); return true; }
    if (op === 'cas'){ // compare-and-set for transactions
      const cur = JSON.stringify(store.get(a.path));
      if (cur !== JSON.stringify(a.expect)) return {ok:false, cur:store.get(a.path)};
      store.set(a.path, a.v); await store.notify(a.path); return {ok:true};
    }
    if (op === 'sub'){ const v = store.get(a.path); store.subs.push({page:name, id:a.id, path:a.path, last:JSON.stringify(v)}); return v; }
    if (op === 'unsub'){ store.subs = store.subs.filter(s => !(s.page === name && s.id === a.id)); return true; }
    if (op === 'fsGet') return store.get('__fs/' + a.path);
    if (op === 'fsSet'){
      const p = '__fs/' + a.path;
      if (a.merge){ const deep = (o, pre) => { for (const [k, v] of Object.entries(o)){ if (v && typeof v === 'object' && !Array.isArray(v)) deep(v, pre + '/' + k); else store.set(pre + '/' + k, v); } }; deep(a.v, p); }
      else store.set(p, a.v);
      await store.notify('__fs'); return true;
    }
    if (op === 'fsDel'){ store.set('__fs/' + a.path, null); await store.notify('__fs'); return true; }
    if (op === 'fsSub'){ const v = store.fsEval(a.q); store.fsSubs.push({page:name, id:a.id, q:a.q, last:JSON.stringify(v)}); return v; }
    if (op === 'fsUnsub'){ store.fsSubs = store.fsSubs.filter(s => !(s.page === name && s.id === a.id)); return true; }
  });
  const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const mods = {
    'firebase-app.js': `export const initializeApp = (o) => ({options:o, name:'[DEFAULT]'}); export const getApps = () => [];`,
    'firebase-auth.js': `
      const auth = {currentUser:null, cbs:[]};
      const fire = () => auth.cbs.forEach(cb => setTimeout(() => cb(auth.currentUser), 0));
      export const getAuth = () => auth;
      export const onAuthStateChanged = (a, cb) => { auth.cbs.push(cb); setTimeout(() => cb(auth.currentUser), 0); return () => {}; };
      export const signInAnonymously = async () => { auth.currentUser = {uid:'anon' + Math.random().toString(36).slice(2, 10), isAnonymous:true}; fire(); return {user:auth.currentUser}; };
      export const signOut = async () => { auth.currentUser = null; fire(); };
      export const createUserWithEmailAndPassword = async () => { throw Object.assign(new Error('x'), {code:'auth/operation-not-allowed'}); };
      export const signInWithEmailAndPassword = createUserWithEmailAndPassword;
      export const EmailAuthProvider = {credential(){}}; export const reauthenticateWithCredential = async()=>{}; export const updatePassword = async()=>{};`,
    'firebase-firestore.js': `
      let sid = 0; const L = {}; window.__mfFsFire = (id, v) => { if (L[id]) L[id](v); };
      export const initializeFirestore = () => ({}); export const getFirestore = () => ({});
      export const doc = (db, ...p) => ({path:p.join('/'), doc:true});
      export const collection = (db, ...p) => ({path:p.join('/'), doc:false, where:[]});
      export const where = (f, op, v) => [f, op, v];
      export const query = (q, w) => ({...q, where:[...q.where, w]});
      const snapDoc = (id, data) => ({id, exists: () => data != null, data: () => data});
      const toSnap = (v) => v.doc ? snapDoc(v.id, v.data) : ({docs: v.docs.map(d => snapDoc(d.id, d.data)), size: v.docs.length, empty: !v.docs.length});
      export const getDoc = async (r) => snapDoc(r.path.split('/').pop(), await window.__mf('fsGet', {path:r.path}));
      export const setDoc = async (r, v, o) => { await window.__mf('fsSet', {path:r.path, v, merge: !!(o && o.merge)}); };
      export const deleteDoc = async (r) => { await window.__mf('fsDel', {path:r.path}); };
      export const addDoc = async (c, v) => { const id = 'd' + Math.random().toString(36).slice(2); await window.__mf('fsSet', {path:c.path + '/' + id, v}); return {id}; };
      export const onSnapshot = (q, cb, err) => { const id = ++sid; L[id] = v => cb(toSnap(v)); window.__mf('fsSub', {id, q}).then(v => cb(toSnap(v))); return () => { delete L[id]; window.__mf('fsUnsub', {id}); }; };`,
    'firebase-database.js': `
      let sid = 0; const L = {}; window.__mfFire = (id, v) => { if (L[id]) L[id](v); };
      export const getDatabase = () => ({});
      export const ref = (db, path) => ({path: path || '', key: (path || '').split('/').pop()});
      const snap = (r, v) => ({key: r.key, exists: () => v != null, val: () => v});
      export const get = async (r) => snap(r, await window.__mf('get', {path:r.path}));
      export const set = async (r, v) => { await window.__mf('set', {path:r.path, v}); };
      export const update = async (r, v) => { await window.__mf('update', {path:r.path, v}); };
      export const remove = async (r) => { await window.__mf('set', {path:r.path, v:null}); };
      export const push = (r) => ref(null, r.path + '/-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
      export const onValue = (r, cb, err) => { const id = ++sid; L[id] = v => cb(snap(r, v)); window.__mf('sub', {id, path:r.path}).then(v => { if (L[id]) cb(snap(r, v)); }); return () => { delete L[id]; window.__mf('unsub', {id}); }; };
      export const onDisconnect = () => ({remove(){ return Promise.resolve(); }, cancel(){ return Promise.resolve(); }});
      export const runTransaction = async (r, fn) => {
        let cur = await window.__mf('get', {path:r.path});
        for (let i = 0; i < 25; i++){
          const nv = fn(cur == null ? null : JSON.parse(JSON.stringify(cur)));
          if (nv === undefined) return {committed:false, snapshot: snap(r, cur)};
          const res = await window.__mf('cas', {path:r.path, expect:cur, v:nv});
          if (res.ok) return {committed:true, snapshot: snap(r, nv)};
          cur = res.cur;
        }
        return {committed:false, snapshot: snap(r, cur)};
      };`,
  };
  await page.route(base + '*', route => {
    const f = route.request().url().split('/').pop();
    if (mods[f]) return route.fulfill({status:200, contentType:'application/javascript', headers:{'access-control-allow-origin':'*'}, body:mods[f]});
    return route.abort();
  });
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
}
module.exports = {store, attach};
