import re
# Every size in the main stylesheet follows one multiplier (--k), so the same build
# fits 1920x1080 (4K TVs) and 1280x720 (Full HD TVs) without CSS zoom.
s = open('base.html', encoding='utf-8').read()
blocks = [(m.start(), m.end()) for m in re.finditer(r'<style>.*?</style>', s, re.S)]
a, b = max(blocks, key=lambda t: t[1] - t[0])
css = s[a:b]

def scale_rules(text):
    def rep(m):
        v = float(m.group(1))
        if v <= 2:
            return m.group(0)
        return f"calc({m.group(1)}px * var(--k))"
    return re.sub(r'(?<![\w.#-])(\d+(?:\.\d+)?)px', rep, text)

def scale_line(line):
    if line.lstrip().startswith('@media'):
        i = line.find('{')  # keep the media query literal
        return line[:i + 1] + scale_rules(line[i + 1:]) if i >= 0 else line
    return scale_rules(line)

css = '\n'.join(scale_line(l) for l in css.split('\n'))
out = s[:a] + css + s[b:]
tv_css = open('tv.css', encoding='utf-8').read()
tv_js = open('tv.js', encoding='utf-8').read()
out = out.replace('</head>', '<style id="tv">\n' + tv_css + '\n</style>\n<script src="webOSTV.js"></script>\n</head>', 1)
out = out.replace('</body>', '<script>\n' + tv_js + '\n</script>\n</body>', 1)
# loja e web-it e vendos vetë body.dataset.screen (që nga 20261104.2); versionet e vjetra jo
if 'document.body.dataset.screen = name' not in out:
    old = "  APP.screen = name;\n"
    assert old in out
    out = out.replace(old, "  APP.screen = name; document.body.dataset.screen = name;\n", 1)
open('app/index.html', 'w', encoding='utf-8').write(out)
print('scaled values:', out.count('var(--k)'))
