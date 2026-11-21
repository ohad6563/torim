const { chromium } = require('playwright'); const fs = require('fs');
const mark = fs.readFileSync(__dirname + '/mark.svg', 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const markWhite = mark; const markBlack = mark.replace(/#F4F4F2/g, '#0A0A0A');
const page = (body, size, bg) => `<html><body style="margin:0;width:${size}px;height:${size}px;background:${bg};display:flex;align-items:center;justify-content:center">${body}</body></html>`;
const wrap = (svg, pct) => `<div style="width:${pct}%;height:${pct}%">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>`;
(async () => {
  const b = await chromium.launch(); const out = process.argv[2];
  const jobs = [
    ['icon.png', 1024, '#0A0A0A', wrap(markWhite, 92)],
    ['android-icon-foreground.png', 1024, 'transparent', wrap(markWhite, 62)],
    ['android-icon-background.png', 1024, '#0A0A0A', ''],
    ['android-icon-monochrome.png', 1024, 'transparent', wrap(markWhite, 62)],
    ['splash-icon.png', 512, 'transparent', wrap(markWhite, 100)],
    ['favicon.png', 96, '#0A0A0A', wrap(markWhite, 100)],
    ['preview-light.png', 512, '#F4F4F2', wrap(markBlack, 90)],
  ];
  for (const [name, size, bg, body] of jobs) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(page(body, size, bg));
    await p.screenshot({ path: `${out}/${name}`, omitBackground: bg === 'transparent' });
    await p.close();
  }
  await b.close();
})();
