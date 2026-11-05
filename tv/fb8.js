/* Firebase për TV-të pa ES modules (webOS 4.x / Chrome 53): ngarkon Firebase 8 (skripte ES5 nga gstatic)
   dhe i jep lojës të njëjtat funksione si Firebase 10 (initializeApp, getAuth, doc, onValue, ...).
   window.__fbLoad(V) -> Promise [A, Au, Fs, Rt]. Në TV-të e reja përdoret Firebase 10 si në web. ES5. */
(function(){
  'use strict';
  var V8 = 'https://www.gstatic.com/firebasejs/8.10.1/';
  function canImport(){ try { new Function('u', 'return import(u)'); return true; } catch (e) { return false; } }
  function script(src){
    return new Promise(function(res, rej){
      var s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = function(){ res(); }; s.onerror = function(){ rej(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function forced(){ try { return /[?&](fb8|as53)\b/.test(location.search) || localStorage.getItem('pishpirik-fb8') === '1'; } catch (e) { return false; } }

  function v8modules(){
    var fb = window.firebase;
    var A = {
      initializeApp: function(cfg){ return fb.apps && fb.apps.length ? fb.app() : fb.initializeApp(cfg); },
      getApps: function(){ return fb.apps || []; }
    };
    var Au = {
      getAuth: function(app){ return app.auth(); },
      onAuthStateChanged: function(auth, cb, err){ return auth.onAuthStateChanged(cb, err); },
      signInAnonymously: function(auth){ return auth.signInAnonymously(); },
      createUserWithEmailAndPassword: function(auth, e, p){ return auth.createUserWithEmailAndPassword(e, p); },
      signInWithEmailAndPassword: function(auth, e, p){ return auth.signInWithEmailAndPassword(e, p); },
      signOut: function(auth){ return auth.signOut(); },
      EmailAuthProvider: { credential: function(e, p){ return fb.auth.EmailAuthProvider.credential(e, p); } },
      reauthenticateWithCredential: function(user, cred){ return user.reauthenticateWithCredential(cred); },
      updatePassword: function(user, p){ return user.updatePassword(p); }
    };
    // Firestore 8: snapshot.exists është vlerë, te 10 është funksion
    function docSnap(s){ return { id: s.id, exists: function(){ return s.exists; }, data: function(){ return s.data(); }, ref: s.ref }; }
    function anySnap(s){
      if (s && s.docs) return { docs: s.docs.map(docSnap), size: s.size, empty: s.empty, forEach: function(f){ s.docs.map(docSnap).forEach(f); } };
      return docSnap(s);
    }
    function path(args){ return Array.prototype.slice.call(args, 1).join('/'); }
    var dbs = [];
    var Fs = {
      getFirestore: function(app){ return app.firestore(); },
      initializeFirestore: function(app, opts){
        var db = app.firestore();
        if (dbs.indexOf(db) < 0){ dbs.push(db); try { db.settings({ experimentalAutoDetectLongPolling: !!(opts && opts.experimentalAutoDetectLongPolling), merge: true }); } catch (e) {} }
        return db;
      },
      doc: function(db){ return db.doc(path(arguments)); },
      collection: function(db){ return db.collection(path(arguments)); },
      where: function(f, op, v){ return { f: f, op: op, v: v }; },
      query: function(q){ for (var i = 1; i < arguments.length; i++){ var w = arguments[i]; q = q.where(w.f, w.op, w.v); } return q; },
      getDoc: function(r){ return r.get().then(docSnap); },
      setDoc: function(r, d, o){ return o ? r.set(d, o) : r.set(d); },
      deleteDoc: function(r){ return r.delete(); },
      addDoc: function(c, d){ return c.add(d); },
      onSnapshot: function(r, next, err){ return r.onSnapshot(function(s){ next(anySnap(s)); }, err); }
    };
    var Rt = {
      getDatabase: function(app, url){ return url ? app.database(url) : app.database(); },
      ref: function(db, p){ return p ? db.ref(p) : db.ref(); },
      get: function(r){ return r.get(); },
      set: function(r, v){ return r.set(v); },
      update: function(r, v){ return r.update(v); },
      remove: function(r){ return r.remove(); },
      push: function(r, v){ return v === undefined ? r.push() : r.push(v); },
      onValue: function(r, cb, cancel){
        var h = r.on('value', cb, cancel || function(){});
        return function(){ r.off('value', h); };
      },
      onDisconnect: function(r){ return r.onDisconnect(); },
      runTransaction: function(r, fn, opts){
        var local = !(opts && opts.applyLocally === false);
        return r.transaction(fn, undefined, local).then(function(res){ return { committed: res.committed, snapshot: res.snapshot }; });
      }
    };
    return [A, Au, Fs, Rt];
  }

  window.__fbLoad = function(V){
    if (canImport() && !forced()){
      var imp = new Function('u', 'return import(u)');
      return Promise.all([imp(V + 'firebase-app.js'), imp(V + 'firebase-auth.js'), imp(V + 'firebase-firestore.js'), imp(V + 'firebase-database.js')]);
    }
    window.__fbVersion = 8;
    return script(V8 + 'firebase-app.js')
      .then(function(){ return Promise.all([script(V8 + 'firebase-auth.js'), script(V8 + 'firebase-firestore.js'), script(V8 + 'firebase-database.js')]); })
      .then(v8modules);
  };
})();
