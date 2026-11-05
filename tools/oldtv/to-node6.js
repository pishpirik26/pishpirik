// Electron 1.4 (Chrome 53, like LG 2018–2019) runs Node 6: lower the harness and scenarios (async/await) for it
// usage: node tools/oldtv/to-node6.js <out dir> <files...>
const e = require(['/opt/npm-tools/node_modules/esbuild', 'esbuild'].find(p => { try { require.resolve(p); return true; } catch (_) { return false; } }));
const fs = require('fs'), path = require('path');
const [out, ...files] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
for (const f of files){
  const r = e.transformSync(fs.readFileSync(f, 'utf8'), { loader: 'js', format: 'cjs', target: 'node6.5', platform: 'node' });
  fs.writeFileSync(path.join(out, path.basename(f)), r.code);
}
fs.writeFileSync(path.join(out, 'package.json'), '{"name":"oldtv-harness-n6","main":"main.js"}');
