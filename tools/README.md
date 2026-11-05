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

## TV-të e vjetra (LG 2020, webOS 5 = motori Chrome 68)

Testohen me **Electron 3.1.13** (Chrome 66, edhe më i vjetër se TV-ja). Shkarkohet nga GitHub:
`https://github.com/electron/electron/releases/download/v3.1.13/electron-v3.1.13-linux-x64.zip` → `unzip` diku.

```bash
(cd tv/app && python3 -m http.server 8766 &)       # TV-ja nga http://127.0.0.1:8766
python3 -m http.server 8765 &                      # telefoni
xvfb-run -a electron tools/oldtv http://127.0.0.1:8766/index.html 1280 720 <skenari.js> <dosja>
node tools/oldtv_xplay.js <rruga/te/electron> 1280x720     # TV e vjetër kundër telefonit, ndeshje e plotë
```

`tools/oldtv/` = harness-i (main.js, preload.js që lidh Firebase-in e rremë me HTTP, xplay_tv.js).

TV-të 2018–2019 (Chrome 53): të njëjtat teste me `?as53` (pa grid, Firebase 8, lista e gap-it):
`node tools/oldtv_xplay.js <electron> 1280x720 --as53` (Firebase 8 i rremë: `tools/oldtv/fb8mock.js`).
Electron 1.4 (Chrome 53 i vërtetë) do GTK2, që këtu s'instalohet.
