# Pishpirik

Loja e letrave **Pishpirik**, 1 kundër 1, në web. Luaj me CPU pa llogari, ose krijo llogari, shto shokë me username dhe luaj me ta online.
Faqja rri në **GitHub Pages** (falas), llogaritë dhe lojërat në **Firebase** (falas për shumicën e rasteve).

## Skedarët

| Skedari | Çka bën |
|---|---|
| `index.html` | E gjithë loja |
| `firebase-config.js` | Lidhja me projektin tënd në Firebase (këtë e plotëson ti) |
| `firestore.rules` | Rregullat e sigurisë së databazës |

---

## 1. Krijo projektin në Firebase

1. Hap <https://console.firebase.google.com> dhe kyçu me Google.
2. **Add project** → jepi emrin `pishpirik` → Google Analytics mund ta çaktivizosh → **Create project**.

### Kyçja (Authentication)
3. Në menynë majtas: **Build → Authentication → Get started**.
4. Te **Sign-in method** zgjidh **Email/Password** → aktivizo vetëm të parën → **Save**.
   (Loja e kthen username-in në email të brendshëm, kështu që lojtarët shkruajnë vetëm username.)

### Databaza (Firestore)
5. **Build → Firestore Database → Create database**.
6. Lokacioni: zgjidh një në Evropë (p.sh. `eur3` ose `europe-west3`). Modi: **Start in production mode**.
7. Hape skedën **Rules**, fshi çka ka aty, ngjit krejt përmbajtjen e `firestore.rules` → **Publish**.

### Lidhja me faqen
8. Kliko ⚙️ **Project settings** → poshtë te **Your apps** kliko ikonën **Web** (`</>`).
9. Jepi një emër (p.sh. `pishpirik-web`), **mos** zgjidh Firebase Hosting → **Register app**.
10. Të del një bllok `const firebaseConfig = { ... }`. Kopjo vlerat dhe vendosi te `firebase-config.js`.

> `apiKey` del publik në faqe, kjo është normale te Firebase. Siguria vjen nga `firestore.rules`.

---

## 2. Qite në GitHub

1. Krijo llogari në <https://github.com> nëse s'ke.
2. Lart djathtas **+ → New repository** → emri `pishpirik` → **Public** → **Create repository**.
3. Kliko **uploading an existing file** dhe tërhiq aty `index.html`, `firebase-config.js`, `firestore.rules`, `README.md` → **Commit changes**.

### Aktivizo GitHub Pages
4. Në repo: **Settings → Pages**.
5. Te **Source** zgjidh **Deploy from a branch**, branch `main`, folder `/ (root)` → **Save**.
6. Pas 1–2 minutash faqja del në: `https://USERNAME-YT.github.io/pishpirik/`

### Lejo domenin në Firebase
7. Në Firebase: **Authentication → Settings → Authorized domains → Add domain** → shkruaj `USERNAME-YT.github.io`.
   Pa këtë hap, kyçja nuk punon nga GitHub Pages.

Gati. Dërgoju shokëve linkun, le të krijojnë llogari, pastaj shtoni njëri-tjetrin me username.

---

## 3. Ndryshimet më vonë

Ndrysho skedarin në GitHub (ikona e lapsit ✏️ → **Commit changes**) dhe faqja përditësohet vetë pas pak.

Për ta provuar në kompjuter para se ta ngarkosh, hape me një server lokal, sepse
shfletuesi nuk i hap modulet JavaScript nga `file://`:

```bash
npx serve .
# pastaj hap http://localhost:3000
```

(Shto edhe `localhost` te Authorized domains nëse s'është aty.)

## Domain-i yt (opsional)

Nëse do ta kesh p.sh. në `pishpirik.stoku.site`: te **Settings → Pages → Custom domain** shkruaj domenin,
te DNS-i i domenit shto një `CNAME` që tregon te `USERNAME-YT.github.io`, dhe shtoje domenin edhe te
Authorized domains në Firebase.

## Shënime

- **Kostoja:** plani falas *Spark* i Firebase mban rreth 50.000 lexime dhe 20.000 shkrime në ditë, mjaft për shumë lojëra mes shokësh.
- **Mashtrimi:** gjendja e lojës (edhe kartat në dorë) ruhet në dokumentin e lojës, që e lexojnë të dy lojtarët. Dikush që di programim mund t'i shohë kartat e kundërshtarit. Për lojë me të panjohur duhet kalimi i logjikës në server (Cloud Functions).
- **Online:** pika e gjelbër te shokët tregon kush e ka hapur faqen në 2 minutat e fundit.
- **Chat:** emoji, fjali të gatshme ose mesazh i shkruar (deri 100 shkronja). Secili lojtar shkruan në fushën e vet, kështu mesazhet nuk humbin.
- **Vonesa:** çdo lëvizje online shkon telefon → Firebase → telefoni i shokut. Sa më afër të jetë databaza (lokacioni i Firestore), aq më e shpejtë. Lokacioni shihet te Firebase → Firestore Database; nuk mund të ndryshohet pasi krijohet.
