"""Fut gjuhën angleze në index.html: i18n.src.js + i18n.en.json -> <script id="i18n"> ... </script>.
Ekzekutohet pas çdo ndryshimi në përkthime: python3 tools/i18n_build.py"""
import json, re, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(root, 'i18n.src.js'), encoding='utf-8').read()
d = json.load(open(os.path.join(root, 'i18n.en.json'), encoding='utf-8'))
exact = {k: v for k, v in d['exact'].items()}
def repl(r):
    return 'FN.' + r.strip('_') if re.fullmatch(r'__[A-Z_]+__', r) else json.dumps(r, ensure_ascii=False)
rx = ',\n    '.join('[/%s/, %s]' % (re.sub(r'(?<!\\)/', r'\\/', p), repl(r)) for p, r in d['rx'])
code = src.replace('/*EN*/{}/*END*/', json.dumps(exact, ensure_ascii=False, indent=0)).replace('[/*RX*/]', '[\n    ' + rx + '\n  ]')
p = os.path.join(root, 'index.html')
s = open(p, encoding='utf-8').read()
block = '<script id="i18n">\n' + code + '\n</script>\n'
if '<script id="i18n">' in s:
    s = re.sub(r'<script id="i18n">.*?</script>\n', lambda m: block, s, count=1, flags=re.S)
else:
    s = s.replace('<script type="module">', block + '<script type="module">', 1)
open(p, 'w', encoding='utf-8').write(s)
print('i18n: %d tekste, %d rregulla' % (len(exact), len(d['rx'])))
