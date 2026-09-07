import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { attachVisualDiagnostics } from './visual-diagnostics';
import { comparePortraits, portraitMatches, portraitMetrics } from './portrait-quality';

test.use({ video: 'on' });

test('web-only education visibility and concise hero identity', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero__role')).toHaveCount(0);
  await expect(page.locator('.site-footer')).not.toContainText('M.S. Student');
  await expect(page.locator('.hero__links a')).toHaveText(['Email', 'CV', 'GitHub']);
  expect(await page.locator('.hero__links').evaluate((el) => el.previousElementSibling?.tagName)).toBe('H1');
  for (const width of [1440, 1280, 1080, 840, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => {
      const hero = document.querySelector('.hero')!.getBoundingClientRect();
      const head = document.querySelector('.kinetic-head')!.getBoundingClientRect();
      const name = document.querySelector('.hero h1')!.getBoundingClientRect();
      const links = document.querySelector('.hero__links')!.getBoundingClientRect();
      return {
        contained: head.left >= hero.left && head.right <= hero.right,
        leftAligned: Math.abs(name.left - links.left) < 1,
        sizes: [...document.querySelectorAll('.hero__links a')].map((el) => el.getBoundingClientRect().height),
      };
    });
    expect(layout.contained).toBe(true);
    expect(layout.leftAligned).toBe(true);
    expect(layout.sizes.every((height) => height >= 44)).toBe(true);
  }
  for (const route of ['/', '/cv/']) {
    await page.goto(route);
    await expect(page.locator('main')).not.toContainText('Exchange Student');
    await expect(page.locator('main')).not.toContainText('Hong Kong Polytechnic');
    await expect(page.locator('main')).toContainText('University of North Carolina');
  }
  const pdf = await readFile('public/Zheye-Song-CV.pdf');
  expect(createHash('sha256').update(pdf).digest('hex'))
    .toBe('813e238b5f312b1fd2ab459703ece0833a6147e1a19985c025a0e32375c4104a');
});

for (const device of [
  { width: 1200, height: 900, deviceScaleFactor: 1 },
  { width: 390, height: 844, deviceScaleFactor: 2 },
]) {
test.describe(`pose comparison at ${device.width}px DPR ${device.deviceScaleFactor}`, () => {
test.use({ viewport: { width: device.width, height: device.height }, deviceScaleFactor: device.deviceScaleFactor });
test('static image and zero-angle canvas share their appearance', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.kinetic-head__fallback').evaluate((image: HTMLImageElement) => image.decode());
  const head = page.locator('[data-kinetic-head]');
  await expect(head).toHaveAttribute('data-poster-ready', 'true');
  await page.getByRole('button', { name: 'Play sculpture rotation', exact: true }).focus();
  await expect(head).toHaveAttribute('data-ready', 'true');
  await attachVisualDiagnostics(page, testInfo);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const options = { style: '.kinetic-head__control { visibility: hidden !important; }' };
  const poster = await head.screenshot({ ...options, path: testInfo.outputPath('poster.png') });
  // Expose the already-rendered rest frame, without playing or changing materials.
  await page.locator('[data-kinetic-canvas]').evaluate((canvas) => {
    canvas.style.transition = 'none';
    canvas.style.opacity = '1';
  });
  const canvas = await head.screenshot({ ...options, path: testInfo.outputPath('zero-angle.png') });
  const metrics = await comparePortraits(poster, canvas);
  await testInfo.attach('poster', { body: poster, contentType: 'image/png' });
  await testInfo.attach('zero-angle-canvas', { body: canvas, contentType: 'image/png' });
  await testInfo.attach('pixel-comparison', { body: JSON.stringify(metrics), contentType: 'application/json' });
  console.log(`Portrait quality: ${JSON.stringify(metrics)}`);
  // Linux SwiftShader and the Metal-exported poster differ at subpixel edges.
  // Keep the original hardware-Mac bound; Linux also must pass all three
  // independent, unfiltered colour/contrast/detail gates below.
  expect(metrics.meanError).toBeLessThan(process.platform === 'linux' ? 4 : 2);
  expect(metrics.channelBias).toBeLessThan(1);
  expect(metrics.contrastChange).toBeLessThan(0.02);
  expect(metrics.edgeChange).toBeLessThan(0.03);
  await page.locator('[data-kinetic-canvas]').evaluate((canvas) => {
    canvas.style.removeProperty('transition');
    canvas.style.removeProperty('opacity');
  });
  await page.mouse.move(0, 0);
  await page.getByRole('button', { name: 'Play sculpture rotation', exact: true }).press('Enter');
  await expect(head).toHaveAttribute('data-phase', 'running');
  await expect(head).toHaveAttribute('data-phase', 'idle', { timeout: 11_000 });
  const settled = await head.screenshot({ ...options, path: testInfo.outputPath('settled-poster.png') });
  expect((await comparePortraits(poster, settled)).meanError).toBeLessThan(0.01);
});
});
}

test('hover playback can repeat and does no WebGL drawing while idle', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { headDrawCalls: number };
    state.headDrawCalls = 0;
    const original = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function(...args) {
      state.headDrawCalls += 1;
      return original.apply(this, args);
    };
  });
  await page.goto('/');
  const head = page.locator('[data-kinetic-head]');
  for (let cycle = 0; cycle < 2; cycle += 1) {
    await page.mouse.move(0, 0);
    await head.hover();
    await expect(head).toHaveAttribute('data-phase', 'running');
    await expect(head).toHaveAttribute('data-phase', 'idle', { timeout: 11_000 });
    await expect(head).toHaveAttribute('data-max-layer-angle', '0.0000');
    const before = await page.evaluate(() => (window as unknown as { headDrawCalls: number }).headDrawCalls);
    expect(before).toBeGreaterThan(0);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => (window as unknown as { headDrawCalls: number }).headDrawCalls);
    expect(after).toBe(before);
  }
});

test('reduced motion stops a running sequence and can be turned off again', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const assets: string[] = [];
  page.on('request', (request) => assets.push(request.url()));
  await page.goto('/');
  const head = page.locator('[data-kinetic-head]');
  await expect(page.locator('[data-kinetic-trigger]')).toBeHidden();
  expect(assets.some((url) => /\.glb|kinetic-head-texture/.test(url))).toBe(false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const button = page.getByRole('button', { name: 'Play sculpture rotation', exact: true });
  await button.focus();
  await button.press('Enter');
  await expect(head).toHaveAttribute('data-phase', 'running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(head).toHaveAttribute('data-running', 'false');
  await expect(head).toHaveAttribute('data-canvas-active', 'false');
  await expect(head).toHaveAttribute('data-max-layer-angle', '0.0000');
  await expect(page.locator('[data-kinetic-canvas]')).toHaveCSS('opacity', '0');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await button.press('Space');
  await expect(head).toHaveAttribute('data-phase', 'running');
});

test('portrait quality gates reject blur, lighting changes and shifted layers', async () => {
  const source = await readFile('public/assets/kinetic-head-rest.webp');
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const valid = portraitMetrics(data, data, info.width, info.height);
  expect(portraitMatches(valid)).toBe(true);
  const blurred = await sharp(source).blur(1).removeAlpha().raw().toBuffer();
  const brightened = Uint8Array.from(data, (value) => Math.min(255, value + 8));
  const lowerContrast = Uint8Array.from(data, (value) => Math.round(128 + (value - 128) * 0.9));
  const shifted = Uint8Array.from(data, (_, index) => data[(index + info.width * 3) % data.length]);
  for (const altered of [blurred, brightened, lowerContrast, shifted]) {
    expect(portraitMatches(portraitMetrics(data, altered, info.width, info.height))).toBe(false);
  }
});

test('failed model loading keeps the poster and navigation usable', async ({ page }) => {
  await page.route('**/kinetic-head.glb', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Play sculpture rotation', exact: true }).click();
  await expect(page.locator('[data-kinetic-head]')).toHaveAttribute('data-phase', 'failed');
  await expect(page.locator('.kinetic-head__fallback')).toBeVisible();
  await expect(page.locator('[data-kinetic-trigger]')).toBeHidden();
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'CV', exact: true }).click();
  await expect(page).toHaveURL(/\/cv\/$/);
});

test('touch scrolling over the static head is not intercepted', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4333/');
    const rect = (await page.locator('[data-kinetic-head]').boundingBox())!;
    const client = await context.newCDPSession(page);
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height * 0.6;
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let delta = 15; delta <= 120; delta += 15) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - delta }] });
      await page.waitForTimeout(25);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(40);
    await page.evaluate(() => scrollTo(0, 0));
    await page.getByRole('button', { name: 'Play sculpture rotation', exact: true }).tap();
    await expect(page.locator('[data-kinetic-head]')).toHaveAttribute('data-running', 'true');
  } finally {
    await context.close();
  }
});
