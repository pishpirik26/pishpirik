# Testet (Playwright)

Firebase-i i vërtetë s'nevojitet: `mockfb.js` është një Firebase i rremë (Auth, Firestore, Realtime Database)
që e ndajnë disa dritare, kështu që "telefoni", "PC" dhe "TV-ja" luajnë me njëri-tjetrin.

Nga rrënja e repos:

```bash
python3 -m http.server 8765 &          # loja e web-it në http://localhost:8765
node tools/full_test.js                 # 3 ndeshje kundër CPU: pikët, 52 kartat, gara "lojë e re gjatë lëvizjes"
node tools/mm_test.js                   # "Luaj me dikë": telefon + TV + PC, ndeshje e plotë, chat, anulim, 3 njëherësh
(cd tv && ./build.sh) && node tools/tv_test.js     # TV me tastierë (shigjeta/OK/Back) në 1920x1080 dhe 1280x720
node tools/xplay_test.js                # cross-play: TV-ja (vetëm me tastet) kundër telefonit
```
