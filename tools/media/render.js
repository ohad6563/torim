// Renders tools/media/hero-loop.html to assets/video/hero-loop.mp4 (and a poster image).
// Usage: node tools/media/render.js   (needs Playwright + ffmpeg)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FPS = 30, SECONDS = 8;
const root = path.join(__dirname, '..', '..');
const frames = fs.mkdtempSync(path.join(require('os').tmpdir(), 'hero-'));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
  await page.goto('file://' + path.join(__dirname, 'hero-loop.html'));
  for (let i = 0; i < FPS * SECONDS; i++) {
    const data = await page.evaluate((t) => window.renderFrame(t), i / FPS);
    fs.writeFileSync(path.join(frames, String(i).padStart(4, '0') + '.jpg'), Buffer.from(data.split(',')[1], 'base64'));
  }
  await browser.close();
  const out = path.join(root, 'assets', 'video');
  fs.mkdirSync(out, { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, '%04d.jpg'),
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow',
    '-movflags', '+faststart', '-an', path.join(out, 'hero-loop.mp4')]);
  fs.copyFileSync(path.join(frames, '0000.jpg'), path.join(out, 'hero-poster.jpg'));
  fs.rmSync(frames, { recursive: true, force: true });
  console.log('done:', (fs.statSync(path.join(out, 'hero-loop.mp4')).size / 1e6).toFixed(2), 'MB');
})();
