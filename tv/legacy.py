"""Make app/index.html run on older LG TVs: webOS 5.0 (2020, Chrome 68) and webOS 4.x (2018–2019, Chrome 53).

What Chrome 68 does not understand, and what this step does about it:
  JS   ?. ?? and other newer syntax  -> esbuild lowers the main script to chrome66
       replaceChildren, flatMap, fromEntries, globalThis, ... -> small polyfills (polyfills.js)
  CSS  clamp() min() max() env() inset -> replaced with the value they have on a TV screen
       (both packages, 1920x1080 and 1280x720, are wide enough that every clamp ends at its maximum)
       flex 'gap' -> tv.js adds margins instead when the engine lacks it (flexGapShim)
Run after scale.py. Needs node + esbuild (looked up in ./node_modules, /opt/npm-tools or NODE_PATH).
"""
import json, os, re, subprocess, sys

P = 'app/index.html'
s = open(P, encoding='utf-8').read()

# ---------- CSS ----------
def fix_css(css):
    css = re.sub(r'env\(safe-area-inset-[a-z]+\s*,\s*0px\)', '0px', css)          # TVs have no notch
    css = re.sub(r'max\(\s*calc\((\d+)px \* var\(--k\)\)\s*,\s*0px\s*\)', r'calc(\1px * var(--k))', css)
    css = re.sub(r'max\(\s*calc\((\d+)px \* var\(--k\)\)\s*,\s*calc\(0px \+ calc\((\d+)px \* var\(--k\)\)\)\s*\)',
                 r'calc(\1px * var(--k))', css)                                      # 16k vs 0+12k -> 16k
    css = re.sub(r'calc\(\s*(calc\(\d+px \* var\(--k\)\))\s*\+\s*0px\s*\)', r'\1', css)
    # clamp(lo, Nvw, hi): on a 1280/1920 px wide screen Nvw is always above hi -> hi
    def clamp(m):
        lo, mid, hi = [x.strip() for x in m.group(1).split(',')] if m.group(1).count(',') == 2 else (None,)*3
        assert lo and mid.endswith('vw'), m.group(0)
        return hi
    css = re.sub(r'clamp\(((?:[^()]|\([^()]*(?:\([^()]*\))*[^()]*\))*)\)', clamp, css)
    # width:min(Xk, P%) -> width:Xk; max-width:P%
    css = re.sub(r'(?<![-\w])width:\s*min\((calc\(\d+px \* var\(--k\)\))\s*,\s*(\d+%)\)', r'width:\1; max-width:\2', css)
    css = css.replace('max-height:min(26vh, calc(200px * var(--k)))', 'max-height:calc(200px * var(--k))')  # 260<281, 174<187
    css = css.replace('max-height:min(38vh, calc(320px * var(--k)))', 'max-height:38vh')                    # 410<416, 274<278
    css = css.replace('max-width:min(78vw, calc(320px * var(--k)))', 'max-width:calc(320px * var(--k))')
    # inset -> longhands
    def inset(m):
        v = m.group(1).split(); t, r, b, l = (v * 4)[:4] if len(v) == 1 else (v[0], v[1], v[0], v[1]) if len(v) == 2 else (v[0], v[1], v[2], v[1]) if len(v) == 3 else v
        return f'top:{t};right:{r};bottom:{b};left:{l}'
    css = re.sub(r'(?<![-\w])inset\s*:\s*([^;}!]+?)\s*(?=[;}])', inset, css)
    return css

def css_blocks(text):
    return [(m.start(1), m.end(1)) for m in re.finditer(r'<style[^>]*>(.*?)</style>', text, re.S)]

for a, b in reversed(css_blocks(s)):
    s = s[:a] + fix_css(s[a:b]) + s[b:]
left = []
for a, b in css_blocks(s):
    for pat in (r'clamp\(', r'(?<![-\w])min\(', r'(?<![-\w])max\(', r'env\(', r'(?<![-\w])inset\s*:'):
        left += [pat + ' ... ' + s[max(a, m.start() - 60):m.end() + 40].replace('\n', ' ') for m in re.finditer(pat, s[a:b])]
if left:
    sys.exit('legacy.py: CSS still uses features older TVs lack:\n  ' + '\n  '.join(left))

# ---------- Chrome 53 (2018–2019): pamja pa grid + lista e 'gap' për tv.js ----------
def top_split(v):
    out, depth, cur = [], 0, ''
    for ch in v.strip():
        if ch == '(': depth += 1
        if ch == ')': depth -= 1
        if ch.isspace() and depth == 0:
            if cur: out.append(cur); cur = ''
        else: cur += ch
    if cur: out.append(cur)
    return out
def walk_css(css, media, rules):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    i, n = 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        head = css[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        body = css[j + 1:k - 1]
        if head.startswith('@media'):
            walk_css(body, head[6:].strip(), rules)
        elif head.startswith('@supports'):
            walk_css(body, media, rules)
        elif not head.startswith('@'):
            rules.append((head, body, media))
        i = k
gap_rules, grid_sels = [], []
for a, b in css_blocks(s):
    rules = []; walk_css(s[a:b], '', rules)
    for head, body, media in rules:
        decl = {}
        for d in body.split(';'):
            if ':' in d:
                k, v = d.split(':', 1); decl[k.strip().lower()] = v.replace('!important', '').strip()
        if re.match(r'(inline-)?grid$', decl.get('display', '')) or 'grid-template-columns' in decl or 'grid-template-areas' in decl:
            grid_sels.append(head)
        rg = cg = None
        if 'gap' in decl:
            parts = top_split(decl['gap']); rg = parts[0]; cg = parts[1] if len(parts) > 1 else parts[0]
        if 'row-gap' in decl: rg = decl['row-gap']
        if 'column-gap' in decl: cg = decl['column-gap']
        if rg or cg:
            gap_rules.append({'s': head, 'rg': rg, 'cg': cg, 'm': media})
gap_js = 'window.__gapRules=' + json.dumps(gap_rules, ensure_ascii=False) + ';window.__gridSels=' + json.dumps(sorted(set(grid_sels)), ensure_ascii=False) + ';'

# ---------- gradients (card backs) ----------
# Chrome 68 rejects a colour stop with two positions ("red 0 2px", Chrome 71) -> "red 0, red 2px"
COLOR = r'(?:#[0-9a-fA-F]{3,8}|rgba?\([^()]*\)|transparent|white|black)'
LEN = r'-?\d*\.?\d+(?:px|%|deg)?'
def split_stops(text):
    return re.sub(r'(' + COLOR + r')\s+(' + LEN + r')\s+(' + LEN + r')(?=\s*[,)])', r'\1 \2, \1 \3', text)
s = split_stops(s)
# conic-gradient (Chrome 69) is used by two card designs: on older TVs use a look-alike made of linear gradients
CONIC = {
    "conic-gradient(#111 25%, #c8102e 0 50%, #111 0 75%, #c8102e 0) 0 0/14px 14px":
        "linear-gradient(45deg, #111 25%, transparent 25%, transparent 75%, #111 75%) 0 0/14px 14px, "
        "linear-gradient(45deg, #111 25%, transparent 25%, transparent 75%, #111 75%) 7px 7px/14px 14px, #c8102e",
    "repeating-conic-gradient(from -90deg at 50% 100%, #d4af37 0 5deg, #141414 5deg 10deg)":
        "repeating-linear-gradient(90deg, #d4af37 0, #d4af37 3px, #141414 3px, #141414 6px)",
}
for new_engine, old_engine in CONIC.items():
    key = split_stops(new_engine)
    assert ("'" + key + "'") in s, 'card design changed: ' + new_engine
    s = s.replace("'" + key + "'", "(window.__noConic ? '" + old_engine + "' : '" + key + "')")

# ---------- JS ----------
def find_esbuild():
    for d in [os.path.join(os.getcwd(), 'node_modules'), '/opt/npm-tools/node_modules'] + os.environ.get('NODE_PATH', '').split(':'):
        if d and os.path.isdir(os.path.join(d, 'esbuild')):
            return d
    sys.exit('legacy.py: esbuild not found (npm i esbuild)')

nm = find_esbuild()
m = re.search(r'<script type="module">(.*?)</script>', s, re.S)
assert m, 'main module script not found'
src = m.group(1)
# Firebase: TV-të pa ES modules marrin Firebase 8 nga fb8.js (window.__fbLoad), të rejat Firebase 10
IMP = "const [A, Au, Fs, Rt] = await Promise.all([import(V+'firebase-app.js'), import(V+'firebase-auth.js'), import(V+'firebase-firestore.js'), import(V+'firebase-database.js')]);"
assert IMP in src, 'Firebase import line changed'
src = src.replace(IMP, "const [A, Au, Fs, Rt] = await window.__fbLoad(V);")
assert 'import(' not in src and 'import.meta' not in src
runner = ("const e=require(process.argv[1]+'/esbuild');let c='';process.stdin.on('data',d=>c+=d).on('end',()=>{"
          "const r=e.transformSync(c,{loader:'js',format:'iife',target:'chrome53',charset:'utf8',legalComments:'none'});process.stdout.write(r.code)})")
low = subprocess.run(['node', '-e', runner, nm], input=src.encode('utf-8'), capture_output=True)
if low.returncode:
    sys.exit('legacy.py: esbuild failed\n' + low.stderr.decode())
low = low.stdout.decode('utf-8')
# si skript i zakonshëm: hiqet nga vendi i vjetër dhe vihet pas tv.js (moduli ekzekutohej pas tij)
s = s[:m.start()] + s[m.end():]
k = s.rfind('</body>')
s = s[:k] + '<script>\n' + low + '\n</script>\n' + s[k:]

# polyfills before anything else runs
poly = open('polyfills.js', encoding='utf-8').read() + '\n' + open('fb8.js', encoding='utf-8').read() + '\n' + gap_js
s = s.replace('<script src="webOSTV.js"></script>', '<script>\n' + poly + '\n</script>\n<script src="webOSTV.js"></script>', 1)
s = s.replace('<style id="tv">', '<style id="tv">\n' + open('legacy53.css', encoding='utf-8').read() + '\n', 1)
open(P, 'w', encoding='utf-8').write(s)
print('legacy: main script', len(src), '->', len(low), 'bytes; gap rules', len(gap_rules), '; grid selectors', len(set(grid_sels)), '; target Chrome 53')
