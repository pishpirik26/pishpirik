# CLAUDE.md — Pishpirik project memory

Read this first in any new chat about Pishpirik. It replaces the old chats ("web app loj pishpirik",
"Webos TV app development"), which the owner may delete.

## The owner and how to work with them
- Talks in Albanian (Gheg/Kosovo dialect). Answer in Albanian; UI text in the app is standard Albanian.
- Wants things done end to end ("kryje komplet vet"): build, test, publish, including in Chrome.
- Not a programmer; explain results, not code. Keep replies short.
- Always test before publishing; never claim something is live without checking the live site.

## What it is
Two-player card game Pishpirik (Pishti). One file: `index.html`. Modes:
- **CPU** (no account), difficulty easy/normal/hard, 1–10 rounds.
- **Luaj me dikë** (no account, random human opponent, cross-play phone/PC/LG TV, 3 rounds, no CPU fallback).
- **Friends**: account (username+password), friends by username, invites, online games, chat.
Live: https://pishpirik26.github.io/pishpirik/ (GitHub user `pishpirik26`, repo `pishpirik`, GitHub Pages from `main` root).

## Rules of the game (engine in index.html: newMatch/startRound/applyPlay/endRound)
52 cards; each player gets 4, 4 on the table (3 hidden). Same rank or a Jack captures the pile.
Pishpirik = capturing a single card with the same rank: +10 (J on J +20). Last capturer takes the rest.
Round points: most cards 3, each A 1, each J 1, 2♣ 2, 10♦ 3, plus pishpirik bonuses.
Match = rounds (1–10), winner = most rounds; ends early when decided. Rematch increments `G.match`.

## Architecture (index.html)
- Firebase SDK 10.12.2 loaded lazily from gstatic in `initNet()`; CPU mode works offline.
- `NET.db` = `Router`: paths `games/...` go to **Realtime Database** (`RTGames`), everything else to **Firestore** (`DB`).
  Keeps the old `.doc()/.collection().where().onSnapshot()` interface.
- Firestore (`eur3`): `players/{uid}` {username,key,friends[],results{gameId[_match]:w|l|d},lastSeen}, `usernames/{lower}` {uid}.
- RTDB (`https://pishpirik-7550f-default-rtdb.europe-west1.firebasedatabase.app`):
  - `games/{id}` {p:[uid0,uid1], status: invite|play|over|left, rounds, created, G:<JSON string>, chats{uid:{k,v,ts}}, leftBy, type?:'random', names?{uid:{n,d}}}
  - `gameIndex/{uid}/{gameId}: true` — RTDB has no array-contains, so each user's games are indexed here.
  - `match/waiting` {uid,ts,name,dev} — at most one waiting player; `match/pairs/{uid}: gameId` — "you were matched".
- Presence: heartbeat writes `players/{uid}.lastSeen` every 60 s; online = seen < 2 min.
  Each client listens only to: own player doc, a query of players whose `friends` contain me, and docs of
  friends + game opponents (listening to all players exploded Firestore reads — don't go back to that).
- `APP_VERSION` (number, `YYYYMMDD.N`): **bump on every publish**. Clients poll `index.html?v=`; when newer they
  auto-reload if not in a game (once per version, sessionStorage), otherwise show the "Rifresko tani" bar.
  `hardReload()` re-fetches with `cache:'reload'` first, because a plain `location.reload()` served old cached JS.
  Keep N < 10 (parseFloat would read `.10` as `.1`); use the next date instead.
- `APP.gen` increments on each new game; animations finishing later must not touch the new game.

## RTDB gotchas (all learned the hard way)
1. Always `getDatabase(app, firebaseConfig.databaseURL)` — without the explicit URL the SDK hung forever (silent, no error).
2. Empty arrays become null in RTDB → the game state `G` is stored as a JSON **string** (`enc`/`decG`).
3. `update()` is shallow → `flattenForUpdate()` turns nested objects into `a/b/c` paths (chats per player).
4. Security rules using `root.child(...)` do NOT see sibling writes of the same multi-path update →
   create `games/{id}` first, then write both `gameIndex` entries in a second update.
5. `.read` on games allows `!data.exists()`; otherwise listeners on deleted games are silently cancelled
   (lobby kept showing deleted games). Listeners also have a cancel callback that cleans up.
6. Transactions on `match/waiting` keep a live `onValue` on that path so the local cache isn't stale.
- The app's generic error text "Nuk u ruajt. Provo prapë." hides the real error; `writeErr()` logs it with console.warn.
- Past bug: `rid()` was deleted together with Poker → accepting invites/online moves threw ReferenceError.
  When removing features, grep for every function they defined.

## Security rules
- `firestore.rules`: usernames create-once; players readable by signed-in users, writable by owner.
- `database.rules.json`: games readable/writable only by the two players (`p` immutable, creator must be p[0]);
  gameIndex readable by owner, others' entry writable only by the game's creator; match/waiting any signed-in user,
  match/pairs/{uid} readable by uid, writable by the creator of that game. Paste into Firebase → Realtime Database → Rules.
- Firebase Auth providers: Email/Password and **Anonymous** (needed for "Luaj me dikë").

## Publishing (how it has actually worked)
- No git push access: `gh` here is logged in as another account (`stoku26`, the owner's other project Stoku).
- Publish through GitHub's web UI in the owner's Chrome (Claude in Chrome):
  - Single file: open `https://github.com/pishpirik26/pishpirik/edit/main/<file>`, put the new text on the
    clipboard with `navigator.clipboard.writeText`, click in the CodeMirror editor, Ctrl+A, Ctrl+V, verify by
    Ctrl+A/Ctrl+C + `clipboard.readText`, then "Commit changes".
  - Files/folders: `https://github.com/pishpirik26/pishpirik/upload/main/<folder>` + `file_upload`; files must be
    staged in `/mnt/user-data/uploads/` (other paths are refused).
  - Read the repo's current file from `api.github.com/repos/pishpirik26/pishpirik/contents/<file>` with
    `Accept: application/vnd.github.raw+json` (raw.githubusercontent.com is CDN-cached and stale).
- Verify live from a tab on pishpirik26.github.io (fetch with `cache:'no-store'`), not from github.com (CORS).
- Firebase console: RTDB rules editor is CodeMirror 6; a synthetic `paste` ClipboardEvent on `.cm-content` works there
  (clipboard API may hang on that origin).

## LG webOS TV app (`tv/`)
- App ID `al.pishpirik.game` (reserved in LG Seller Lounge, can't change). Vendor "Pishpirik".
- Build: `cd tv && ./build.sh` → `make_base.py` (web index.html → base.html: Firebase config inlined because file://
  can't import it; PWA tags and update polling removed) → `scale.py` (all px × `--k`, adds tv.css + tv.js + webOSTV.js)
  → `legacy.py` (for 2020 TVs, webOS 5 = Chrome 68: esbuild lowers the main script to chrome66, `polyfills.js`
  is added, clamp()/min()/max()/env()/inset replaced by their TV-screen values, double-position gradient stops split,
  the two conic-gradient card backs get a linear look-alike when `window.__noConic`) → `mkipk.py` (same format as
  ares-package) → two packages: 1920x1080 and 1280x720 (`resolution` in appinfo). Flex `gap` (Chrome 84) is emulated
  at runtime by `flexGapShim` in tv.js (margins; only when the engine lacks it). esbuild comes from
  /opt/npm-tools/node_modules (npm registry may be blocked in the sandbox).
  Since 1.0.3 the same build also targets **2018–2019 TVs (webOS 4.x = Chrome 53)**: main script lowered to chrome53 as a
  classic IIFE placed after tv.js (no ES modules there); Firebase via `window.__fbLoad(V)` (tv/fb8.js): Firebase 10 by
  dynamic import where possible, otherwise **Firebase 8.10.1 ES5 scripts** + an adapter with the v10 function names;
  `html.nogrid` (polyfills.js, when `display:grid` is unsupported) switches on `tv/legacy53.css` (flex versions of every
  grid); `window.__gapRules`/`__gridSels` (generated by legacy.py) feed the gap shim because Chrome 53 has no `gap` at all.
  `?as53` in the URL forces all Chrome-53 paths on a newer engine (tests). Chrome 53 itself (Electron 1.4) needs GTK2,
  which the sandbox can't install, so tests run Electron 3 (Chrome 66) + `?as53` and an ES2016 parse check.
- TV layout fixes (1.0.3): opponent fan no longer covers the top bar (`.seat.opp` padding-top), "Mori N karta" sits
  below the player's cards; gap shim ignores focus-only class changes; old engines scroll lists with scrollIntoViewIfNeeded.
- `tv.js`: spatial navigation with a gold focus frame, OK = click, Back (461/Esc) closes dialogs / cancels the
  player search / leaves the game / exits the app (`webOS.platformBack`), Magic Remote pointer, in-game
  "Cilësimet" button, focus jumps to your cards when it becomes your turn.
- Seller Lounge settings used: platform "2022 and later" for 1.0.2; **1.0.3 is built for "2018 and later"**
  (owner has an LG 65UN7300, 2020, webOS 5), SDK 7.0.0, all chipsets, category
  Game → Strategy, 12+ (free-text chat), language Albanian only, 22 countries (XK, AL, MK, ME, DE, CH, AT, IT, GB, BE,
  SE, FR, NL, NO, DK, FI, GR, SI, HR, LU, US, CA), keywords space-separated
  (`pishpirik pishti cards letra albanian shqip kosova`), privacy URL `.../privacy.html`, no ads/billing/geo-block,
  test accounts "not applicable" (testers create their own; explained in the UX scenario PDF, `tv/docs`).
  Self-check list: 33 Pass, 20 N/A. Store images: `tv/store` (flat-background icon 400×400, tile color #1d4a37).
- History: 1.0.0 (2026-11-03, cancelled) → 1.0.1 (2026-11-03, built from web 20261103.4, lacked the rid fix) →
  1.0.2 (2026-11-04, web 20261104.2: random cross-play, all fixes; submitted 2026-11-05) → **1.0.3 built 2026-11-05, NOT
  uploaded** (owner: wait until LG accepts 1.0.2): same game, runs on 2018+ TVs (webOS 4.x/5). On LG choose platform
  "2018 and later" for both rows. Firebase 8 path checked against the REAL Firebase on 2026-11-05 via
  `pishpirik26.github.io/pishpirik/tv/app/index.html?as53` (signed-in session picked up, lobby: Firestore friends +
  RTDB games, "Luaj me dikë" search started and cancelled). A full real random match on that path was not played
  (both browser tabs share one Firebase login, so they can't match each other).
- Every LG upload needs a higher version (appinfo.json, file version in the upload row, Service Info).
- **Current status (2026-11-11):** 1.0.2 rejected at pretest on 2026-11-11 ("global app but does not support English").
  **1.0.3 submitted 2026-11-11** (web 20261111.1 + English, platform "2018 and later", SDK auto 4.0.0, both rows File Ver 1.0.3):
  English added as App Service Language (Service Country Info) and in Display Info other languages; English description
  mentions "Available in English and Albanian"; 5 English screenshots (en-1..5) replaced the old 4; new UX PDF; notes
  (Service Feature Update + Images/Service Info Change + Other Information); self-check 33/20 saved; defect resolved
  ("Issue modify"). Status "App Packaging Request" → then QA. LG answers by e-mail (mendurberisha@hotmail.com).
- Seller Lounge extras learned 2026-11-11: App Service Languages live in **Service Country Info** (bottom); screenshots max 6
  (single file input `#secondaryimg`, upload/delete one by one, keep ≥3); Defect Info is inside `#defectInfo_iframe`
  (Resolve dialog: radio IM + textarea, then `chkSave()` link "Ok"); page resets `window.__msgs`, use another name.
- How the resubmission worked (for next time):
  - Edit opens on File Upload with the file table hidden: click **DONE** under the App ID to show it. Use **Modify** on each
    row → File Re-Upload (input type=file) → platform "2022 and later" (row had defaulted to 2021) → File Ver → SAVE.
  - Service Info: App Version → SAVE at the bottom. Test Info: UX PDF (remove old, upload new), tick "Service Feature
    Update" + "Other Information" with notes (notes are NOT kept after a reload: fill and SAVE in the same visit).
  - Self-check list lives in an iframe (`selfCheckList_iframe`); results survived the version change (33 Pass / 20 N/A).
  - **SUBMIT stays grey until Defect Info is resolved**: open the issue → Resolve → "Issue modify" + comment → OK.
  - LG pages use native alert() ("Successfully Saved."), which freezes Claude in Chrome: before clicking Save run
    `window.alert=m=>window.__msgs.push(m); window.confirm=()=>true` in the page.
  - Submit page: 4 agreements (Seller Agreement, QA IPs, rejection cycles, "I agree" for minor defects) → CONFIRM.

## Testing
`tools/` — Playwright with `mockfb.js` (fake Auth/Firestore/RTDB shared by several pages). See `tools/README.md`.
The sandbox can't reach gstatic/Firebase, so real online play can only be checked on the live site with two
accounts (test accounts used: rtdbtest1 / rtdbtest2, password in the owner's hands — don't store passwords here).

## Changelog (short)
- 2026-10: CPU game, accounts/friends/online (Firestore), rounds 1–10, chat, 10 card designs, sounds; Okey, billiards,
  poker added and removed again; cards in a fan; 5 sound styles; captured-cards viewer.
- 2026-11-03: live games moved to Realtime Database (Europe) for speed; fixes: explicit DB URL, two-step game
  create, lobby listener, rid(), deleted games disappear. LG TV app built and submitted.
- 2026-11-04 (20261104.1): "Luaj me dikë" anonymous cross-play; hard reload + auto-update; per-friend listeners
  (Firestore quota); race fixes (new game during CPU move, "Raundi tjetër" overwrite); rematch results;
  friendlier invite errors; privacy page updated; TV 1.0.2.
- 2026-11-11 (20261111.1): **English** (LG rejected 1.0.2 on 2026-11-11 at pretest: "It is a global app but does not
  support English"). `i18n.src.js` + `i18n.en.json` → `python3 tools/i18n_build.py` embeds `<script id="i18n">` in index.html:
  a MutationObserver translates every text node/placeholder/title/aria-label from Albanian (exact table + regex rules,
  names like "Lojtar AB12" → "Player AB12"); originals kept on the node, so switching back works. Settings → Gjuha /
  Language (Shqip/English, saved in localStorage `pishpirik-lang`; `?lang=en` forces). Default: web Albanian; TV English
  unless the TV language is Albanian. When adding UI text, add its English to i18n.en.json and run
  `node tools/i18n_harvest.js` (walks every screen in English and prints leftover Albanian). UX scenario PDF and the
  5 store screenshots are now English. On LG also add English as a service language + English title/description.
- 2026-11-11 (20261111.2): English proofread. Fixes: CPU summary said "kompjuteri won the round" (lowercase name had
  no translation) → "The computer won the round"; "1 rounds" → singular (FN.INVR/INVSENT); final summary says "Final
  score in rounds"; "Friend request sent to Player." (also "Lojtar" in Albanian) → the typed @username; clearer rules text.
  UX PDF wording polished. **TV 1.0.4 built** (`tv/out/*1.0.4*`) with these fixes — NOT uploaded: 1.0.3 is in LG QA;
  upload 1.0.4 as the next update (or if 1.0.3 gets rejected). oldtv_xplay test: the phone now waits on each summary and
  stops at match end (before, it pressed "Next round"/"Play again" instantly and the old TV never saw a summary).
- 2026-11-04 (20261104.2): the table now fits the screen without scrolling on every size (small phones, phones held
  sideways, laptops 1024x600/1280x720): header hidden in game, settings button in the game bar (#bSetG), cards sized by
  screen height, landscape = TV-like grid (scores left). That CSS sits between `web-only-start/end` comments and
  make_base.py strips it for the TV (TV has its own layout in tv.css). Card-design tiles no longer overflow; update bar
  text fixed. `body.dataset.screen` is now set by the web app itself. TV 1.0.2 rebuilt from this version.
