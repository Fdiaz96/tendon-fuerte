// Genera icon-192.png e icon-512.png (logo de XZ Fit) desde un SVG (Playwright). Uso: node tests/icon.mjs
import { chromium } from 'playwright';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A1D22"/><stop offset="1" stop-color="#0B0C0E"/></linearGradient></defs>
<rect width="512" height="512" fill="url(#g)"/>
<g stroke="#C6FF00" stroke-width="58" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M110 160 L236 340 M236 160 L110 340"/><path d="M286 160 H404 L286 340 H404"/></g>
<text x="256" y="430" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="64" letter-spacing="18" fill="#E8EAED">FIT</text></svg>`;
const b = await chromium.launch();
for (const s of [192, 512]) {
  const p = await b.newPage({ viewport: { width: s, height: s } });
  await p.setContent(`<style>html,body{margin:0}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${s}" height="${s}">`);
  await p.screenshot({ path: new URL(`../icon-${s}.png`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1') });
}
await b.close();
