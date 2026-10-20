// Genera icon-192.png e icon-512.png desde un SVG (Playwright). Uso: node tests/icon.mjs
import { chromium } from 'playwright';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0E0F11"/>
<g stroke="#C6FF00" stroke-linecap="round" fill="none">
<path d="M150 360 Q256 120 362 360" stroke-width="44"/>
<line x1="96" y1="256" x2="416" y2="256" stroke-width="30"/>
</g><g fill="#C6FF00"><rect x="66" y="196" width="46" height="120" rx="12"/><rect x="400" y="196" width="46" height="120" rx="12"/></g></svg>`;
const b = await chromium.launch();
for (const s of [192, 512]) {
  const p = await b.newPage({ viewport: { width: s, height: s } });
  await p.setContent(`<style>html,body{margin:0}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${s}" height="${s}">`);
  await p.screenshot({ path: new URL(`../icon-${s}.png`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1') });
}
await b.close();
