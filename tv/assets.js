const sharp = require('sharp');
const { chromium } = require('playwright');
const fs = require('fs');
(async()=>{
  const src = '../icon-512.png';
  await sharp(src).resize(80,80).png().toFile('app/icon.png');
  await sharp(src).resize(130,130).png().toFile('app/largeIcon.png');
  const img = fs.readFileSync(src).toString('base64');
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1920,height:1080}});
  await p.setContent(`<html><body style="margin:0;width:1920px;height:1080px;display:grid;place-items:center;
    background:radial-gradient(ellipse at 50% 42%, #2a6249 0%, #1d4a37 42%, #102b1d 100%)">
    <div style="display:flex;flex-direction:column;align-items:center;gap:34px">
      <img src="data:image/png;base64,${img}" style="width:300px;height:300px;border-radius:66px;box-shadow:0 24px 60px rgba(0,0,0,.45)">
      <div style="font:900 110px Georgia,'DejaVu Serif',serif;color:#d8ad55;letter-spacing:-1px;text-shadow:0 4px 0 rgba(0,0,0,.25)">Pishpirik</div>
    </div></body></html>`);
  await p.screenshot({path:'app/splash.png'});
  // flat-background store icon (LG refuses gradient backgrounds)
  const ic = await b.newPage({viewport:{width:400,height:400}});
  await ic.setContent(`<html><body style="margin:0;width:400px;height:400px;background:#1d4a37;position:relative;font-family:Georgia,'DejaVu Serif',serif">
<style>.c{position:absolute;width:132px;height:188px;background:#fbf8f1;border-radius:14px;box-shadow:0 8px 18px rgba(0,0,0,.35)}
.r{position:absolute;left:14px;top:10px;font-weight:700;font-size:36px;line-height:1}.s{position:absolute;font-size:96px;line-height:1}</style>
<div class="c" style="left:78px;top:104px;transform:rotate(-9deg);color:#c0262d"><div class="r">J<div style="font-size:26px">♦</div></div><div class="s" style="right:14px;bottom:14px">♦</div></div>
<div class="c" style="left:186px;top:100px;transform:rotate(7deg);color:#1b1b1b"><div class="r">A<div style="font-size:26px">♠</div></div><div class="s" style="left:22px;top:52px">♠</div></div>
</body></html>`);
  await ic.screenshot({path:'store/icon-400-flat.png'});
  await b.close();
  const buf = await sharp('app/splash.png').png({palette:true,quality:90,compressionLevel:9}).toBuffer(); fs.writeFileSync('app/splash.png', buf);
  for (const f of ['app/icon.png','app/largeIcon.png','store/icon-400-flat.png','app/splash.png']){ const m = await sharp(f).metadata(); console.log(f, m.width+'x'+m.height, fs.statSync(f).size); }
})();
