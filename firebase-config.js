// Konfigurimi i projektit Firebase "pishpirik" (pishpirik-7550f).
// Këto vlera janë publike sipas dizajnit të Firebase; siguria vjen nga firestore.rules.
export const firebaseConfig = {
  apiKey: "AIzaSyDCfgBV5KtlUviyihkYGtZuhroHZISV-bc",
  authDomain: "pishpirik-7550f.firebaseapp.com",
  projectId: "pishpirik-7550f",
  storageBucket: "pishpirik-7550f.firebasestorage.app",
  messagingSenderId: "105744464734",
  appId: "1:105744464734:web:5e3238b110dd0150a6adcf",
  // Lëvizjet e lojës live shkojnë te Realtime Database (ma e shpejtë se Firestore
  // për sinkronizim të vogël mes 2 lojtarësh); llogaritë/shokët mbesin në Firestore.
  databaseURL: "https://pishpirik-7550f-default-rtdb.europe-west1.firebasedatabase.app"
};

// Emri i përdoruesit kthehet në një email të brendshëm (p.sh. arben@pishpirik.game)
// që Firebase ta pranojë. Mos e ndrysho pasi të kenë krijuar llogari njerëzit.
export const USER_DOMAIN = "pishpirik.game";
