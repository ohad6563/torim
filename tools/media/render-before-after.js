// Renders the before/after ILLUSTRATIONS to assets/gallery/demo-{before,after}.jpg.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const out = path.join(__dirname, '..', '..', 'assets', 'gallery');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  await p.goto('file://' + path.join(__dirname, 'before-after.html'));
  for (const which of ['before', 'after']) {
    const data = await p.evaluate((w) => window.draw(w), which);
    fs.writeFileSync(path.join(out, `demo-${which}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
  }
  await b.close();
  console.log('done');
})();
