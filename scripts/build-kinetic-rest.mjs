import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import palette from '../src/data/palette.json' with { type: 'json' };

const root = dirname(dirname(fileURLToPath(import.meta.url)));
// Use Astro's own bundler version, including when npm nests it under Astro.
const astroRequire = createRequire(import.meta.resolve('astro'));
const { build } = await import(astroRequire.resolve('vite'));
// Bundle an isolated in-memory export harness, never a public Astro route.
const result = await build({
  configFile: false, root, publicDir: false, logLevel: 'error',
  build: {
    write: false, minify: false,
    lib: { entry: join(root, 'src/scripts/kinetic-head-scene.ts'), formats: ['es'] },
    rolldownOptions: { output: { codeSplitting: false } },
  },
});
const outputs = (Array.isArray(result) ? result : [result]).flatMap((entry) => entry.output);
const bundle = outputs.find((entry) => entry.type === 'chunk' && entry.isEntry).code;
const assets = new Map([
  ['/assets/models/kinetic-head.glb', 'model/gltf-binary'],
  ['/assets/kinetic-head-texture.webp', 'image/webp'],
]);
const server = createServer(async (request, response) => {
  try {
    if (request.url === '/') {
      response.setHeader('Content-Type', 'text/html');
      response.end(`<!doctype html><style>html,body{margin:0;background:${palette.paper}}canvas{display:block;width:394px;height:560px}</style><canvas></canvas>`);
    } else if (request.url === '/scene.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(bundle);
    } else if (assets.has(request.url)) {
      response.setHeader('Content-Type', assets.get(request.url));
      response.end(await readFile(join(root, 'public', request.url)));
    } else {
      response.writeHead(404).end();
    }
  } catch {
    response.writeHead(500).end();
  }
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
let browser;
try {
  browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
  const page = await browser.newPage({ viewport: { width: 394, height: 560 }, deviceScaleFactor: 1.5 });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async () => {
    const scene = await import('/scene.js');
    window.view = await scene.createKineticScene(document.querySelector('canvas'));
    window.view.resetPose();
    window.view.resize();
  });
  const png = await page.locator('canvas').screenshot();
  const webp = await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer();
  const avif = await sharp(png).avif({ quality: 82, effort: 6, chromaSubsampling: '4:4:4' }).toBuffer();
  if (avif.length >= 50 * 1024) throw new Error(`Rest AVIF exceeds 50 KB: ${avif.length} bytes`);
  await writeFile(join(root, 'public/assets/kinetic-head-rest.webp'), webp);
  await writeFile(join(root, 'public/assets/kinetic-head-rest.avif'), avif);
  console.log(`Exported matching rest pose: WebP ${webp.length} B, AVIF ${avif.length} B.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
