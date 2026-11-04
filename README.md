# Pishpirik

Loja e letrave **Pishpirik**, 1 kundër 1, në web dhe në LG TV.

- **Luaj me CPU**: pa llogari, fillon menjëherë.
- **Luaj me dikë**: pa llogari, kundër një lojtari të rastësishëm. Telefoni, PC-ja dhe TV-ja luajnë bashkë (cross-play).
- **Me shokët**: krijo llogari me username, shto shokë dhe ftoji në lojë.

Live: <https://pishpirik26.github.io/pishpirik/>
LG TV: `al.pishpirik.game` (LG Content Store, në shqyrtim)

## Çka ka në repo

| Vendi | Çka është |
|---|---|
| `index.html` | E gjithë loja (HTML + CSS + JavaScript në një skedar) |
| `firebase-config.js` | Lidhja me projektin Firebase `pishpirik-7550f` |
| `firestore.rules` | Rregullat e Firestore (llogaritë, shokët) |
| `database.rules.json` | Rregullat e Realtime Database (lojërat live, radha e "Luaj me dikë") |
| `privacy.html` | Politika e privatësisë (e kërkon LG) |
| `tv/` | Versioni për LG webOS TV: telekomanda, pamja për TV, paketimi `.ipk`, materialet për LG |
| `tools/` | Testet automatike (me një Firebase të rremë, pa internet) |
| `CLAUDE.md` | Historia e plotë e projektit dhe si funksionon çdo pjesë, për Claude-in në biseda të reja |

## Si ndryshohet

1. Ndrysho `index.html`.
2. **Rrite `APP_VERSION`** (p.sh. `20261104.1` → `20261104.2`, ose data e re `20261105.1`). Kështu telefonat që e kanë faqen të ruajtur e marrin versionin e ri vetë.
3. Ngarkoje në GitHub. Faqja përditësohet pas 1–2 minutash.

### Për TV
1. Rrit `version` te `tv/app/appinfo.json` (LG s'pranon dy herë të njëjtin version).
2. `cd tv && ./build.sh`: del `tv/out/al.pishpirik.game_<versioni>_1920x1080.ipk` dhe `_1280x720.ipk`.
3. Ngarkoji të dyja te LG Seller Lounge (shih `tv/LEXOMË.txt`).

## Firebase (projekti `pishpirik-7550f`)

- **Authentication**: Email/Password (llogaritë; username kthehet në `emri@pishpirik.game`) dhe **Anonymous** (për "Luaj me dikë").
- **Firestore** (`eur3`): `players`, `usernames`. Rregullat: `firestore.rules`.
- **Realtime Database** (Belgjikë, `europe-west1`): `games`, `gameIndex`, `match`. Rregullat: `database.rules.json`, ngjiten te Firebase → Realtime Database → Rules.
- Plani falas Spark mjafton.

## Testet

Shih `tools/README.md`. Firebase-i i vërtetë s'nevojitet.
