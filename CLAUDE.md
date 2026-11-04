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
  → `mkipk.py` (same format as ares-package) → two packages: 1920x1080 and 1280x720 (`resolution` in appinfo).
- `tv.js`: spatial navigation with a gold focus frame, OK = click, Back (461/Esc) closes dialogs / cancels the
  player search / leaves the game / exits the app (`webOS.platformBack`), Magic Remote pointer, in-game
  "Cilësimet" button, focus jumps to your cards when it becomes your turn.
- Seller Lounge settings used: platform "2022 and later" (CSS needs it), SDK 7.0.0, all chipsets, category
  Game → Strategy, 12+ (free-text chat), language Albanian only, 22 countries (XK, AL, MK, ME, DE, CH, AT, IT, GB, BE,
  SE, FR, NL, NO, DK, FI, GR, SI, HR, LU, US, CA), keywords space-separated
  (`pishpirik pishti cards letra albanian shqip kosova`), privacy URL `.../privacy.html`, no ads/billing/geo-block,
  test accounts "not applicable" (testers create their own; explained in the UX scenario PDF, `tv/docs`).
  Self-check list: 33 Pass, 20 N/A. Store images: `tv/store` (flat-background icon 400×400, tile color #1d4a37).
- History: 1.0.0 (2026-11-03, cancelled) → 1.0.1 (2026-11-03, built from web 20261103.4, lacked the rid fix) →
  1.0.2 (2026-11-04, web 20261104.2: random cross-play, all fixes, not yet uploaded to LG).
- Every LG upload needs a higher version (appinfo.json, file version in the upload row, Service Info).
- **Current status (2026-11-04 01:10):** 1.0.1 is "QA Processing" at LG (can't be edited/cancelled by us any more;
  Edit redirects to 1:1 Q&A). We sent a 1:1 Q&A (Applications → App QA Schedule Check/Hold Request) asking LG to
  hold QA and let us replace it with 1.0.2. LG answers by e-mail (mendurberisha@hotmail.com) and in 1:1 Q&A.
  **Next step when they reply (or if they reject 1.0.1):** File Upload → delete both 1.0.1 rows → upload
  `tv/out/*_1.0.2_*.ipk` (stage them in /mnt/user-data/uploads first; decline "apply appinfo"; All chipsets;
  2022 and later; SDK 7.0.0; resolution 1920,1080 / 1280,720; file version 1.0.2) → Service Info app version 1.0.2 →
  Test Info: upload `tv/docs/Pishpirik_UX_Scenario.pdf`, remove the old PDF, tick "Other Information" and re-type the
  tester note → check Self-check list (33 Pass / 20 N/A) → SUBMIT → accept the 4 agreement checkboxes → confirm.
  Optionally refresh Images with `tv/store/shot-*.png` (entry screen now shows "Luaj me dikë").

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
- 2026-11-04 (20261104.2): the table now fits the screen without scrolling on every size (small phones, phones held
  sideways, laptops 1024x600/1280x720): header hidden in game, settings button in the game bar (#bSetG), cards sized by
  screen height, landscape = TV-like grid (scores left). That CSS sits between `web-only-start/end` comments and
  make_base.py strips it for the TV (TV has its own layout in tv.css). Card-design tiles no longer overflow; update bar
  text fixed. `body.dataset.screen` is now set by the web app itself. TV 1.0.2 rebuilt from this version.
