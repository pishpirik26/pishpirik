import re, sys
# Merr lojën e web-it (../pishpirik/index.html) dhe e kthen në base.html për TV:
#  - konfigurimi i Firebase futet brenda faqes (në TV skedari lokal s'mund ta importojë)
#  - hiqen pjesët e PWA-së dhe kontrolli i versionit të ri (TV përditësohet nga LG Content Store)
web = sys.argv[1] if len(sys.argv) > 1 else '..'
s = open(web + '/index.html', encoding='utf-8').read()
cfg = open(web + '/firebase-config.js', encoding='utf-8').read().replace('export const', 'const')
old = 'import { firebaseConfig, USER_DOMAIN } from "./firebase-config.js";'
assert old in s, 'import line not found'
s = s.replace(old, cfg.strip(), 1)
s = re.sub(r'<link rel="manifest"[^>]*>\n?', '', s)
s = re.sub(r'<link rel="apple-touch-icon"[^>]*>\n?', '', s)
s = re.sub(r'<meta name="(apple-mobile-web-app-capable|mobile-web-app-capable|apple-mobile-web-app-title)"[^>]*>\n?', '', s)
for x in ["document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });",
          "window.addEventListener('focus', checkForUpdate);",
          "setInterval(checkForUpdate, 3*60*1000);",
          "setTimeout(checkForUpdate, 3*1000);"]:
    assert x in s, 'missing: ' + x
    s = s.replace(x, '')
# pamja e tavolinës për telefon/laptop (TV-ja e ka në tv.css)
s = re.sub(r'/\* web-only-start.*?/\* web-only-end \*/\n', '', s, flags=re.S)
s = s.replace('<link rel="icon" type="image/png" href="icon-192.png">', '<link rel="icon" type="image/png" href="icon.png">')
assert 'checkForUpdate()' not in s.split('async function checkForUpdate')[1].split('$(\'updBtn\')')[1], 'an update trigger is still active'
open('base.html', 'w', encoding='utf-8').write(s)
m = re.search(r'APP_VERSION = ([\d.]+)', s)
print('base.html from web version', m.group(1))
