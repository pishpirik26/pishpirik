// Old-Chromium harness (Electron 3 = Chrome 66, older than LG webOS 5's Chrome 68).
// usage: electron tools/oldtv <url> <W> <H> <scenario.js> <outdir> [bridgePort]
// bridgePort: the fake Firebase of oldtv_xplay.js; gstatic requests are redirected to it
const { app, BrowserWindow, session } = require('electron');
const fs = require('fs'), path = require('path');
const [url, W, H, scenarioFile, out, bridge] = process.argv.slice(2);
if (bridge) process.env.BRIDGE_PORT = bridge;   // read by preload.js
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.on('ready', async () => {
  session.defaultSession.webRequest.onBeforeRequest((d, cb) => {
    if (bridge && d.url.indexOf('https://www.gstatic.com/firebasejs/') === 0) return cb({ redirectURL: 'http://127.0.0.1:' + bridge + '/' + d.url.split('/').slice(-2).join('/') });
    cb({ cancel: /^https?:\/\//.test(d.url) && !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(d.url) });
  });
  const win = new BrowserWindow({ width: +W, height: +H, useContentSize: true, show: true, frame: false, webPreferences: { nodeIntegration: false, contextIsolation: false, preload: bridge ? path.join(__dirname, 'preload.js') : undefined } });
  const logs = [];
  win.webContents.on('console-message', (e, level, msg, line, src) => logs.push({ level, msg: String(msg).slice(0, 400), line, src: String(src).split('/').pop() }));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const evalJS = code => win.webContents.executeJavaScript(code, true);
  const key = async (code, n = 1) => { for (let i = 0; i < n; i++){ win.webContents.sendInputEvent({ type: 'keyDown', keyCode: code }); win.webContents.sendInputEvent({ type: 'char', keyCode: code === 'Enter' ? '\r' : code }); win.webContents.sendInputEvent({ type: 'keyUp', keyCode: code }); await sleep(250); } };
  const shot = name => new Promise(res => win.webContents.capturePage(img => { fs.writeFileSync(path.join(out, name + '.png'), img.toPNG()); res(); }));
  const result = {};
  try {
    await win.loadURL(url); win.focus(); win.webContents.focus(); win.webContents.sendInputEvent({ type: 'mouseMove', x: 2, y: H - 2 });
    await sleep(2500);
    const scenario = require(path.resolve(scenarioFile));
    await scenario({ win, evalJS, key, shot, sleep, result, logs });
  } catch (e) { result.harnessError = String(e && e.stack || e); }
  result.logs = logs.filter(l => l.level >= 2 || /error|Uncaught/i.test(l.msg));
  result.ua = await evalJS('navigator.userAgent').catch(() => '?');
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 1));
  app.exit(0);
});
