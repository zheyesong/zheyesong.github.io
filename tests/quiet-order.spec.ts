import { expect, test } from '@playwright/test';
import palette from '../src/data/palette.json' with { type: 'json' };

const routes = ['/', '/research/', '/writing/', '/writing/research-directions-map/', '/cv/', '/404.html'];
const viewports = [
  { width: 1440, height: 900 }, { width: 1280, height: 720 },
  { width: 1080, height: 900 }, { width: 840, height: 900 },
  { width: 390, height: 844 }, { width: 320, height: 844 },
];

test('all pages retain readable landmarks and reflow at all six sizes', async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 245, 239)');
      await expect(page.locator('h1')).toHaveCSS('font-family', /Source Serif 4/);
    }
  }
});

test('editorial content axes line up and article measure stays bounded', async ({ page }) => {
  for (const viewport of [viewports[0], viewports[2]]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const axes = await page.locator('.section-body').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().x));
    expect(Math.max(...axes) - Math.min(...axes)).toBeLessThan(1);
    const homeAxis = axes[0];
    for (const route of ['/research/', '/cv/']) {
      await page.goto(route);
      const x = await page.locator('[data-project-id="metric-space-causal-inference"] h3').evaluate((node) => node.getBoundingClientRect().x);
      expect(Math.abs(x - homeAxis)).toBeLessThan(1);
    }
    await page.goto('/writing/research-directions-map/');
    const measure = await page.locator('.prose--reading').evaluate((node) => {
      const width = node.getBoundingClientRect().width;
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;width:68ch;visibility:hidden;';
      node.append(probe);
      const limit = probe.getBoundingClientRect().width;
      probe.remove();
      return { width, limit };
    });
    expect(measure.width).toBeLessThanOrEqual(measure.limit + 1);
  }
});

test('writing controls, outline links, PDF download and 404 remain functional', async ({ page }) => {
  await page.goto('/writing/');
  await page.getByRole('button', { name: 'Research note', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Research note', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-visible-count]')).toHaveText('1');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('heading', { name: 'A Map of My Current Research Directions' }).getByRole('link').click();
  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Current project map', exact: true }).click();
  await expect(page).toHaveURL(/#current-project-map$/);
  await expect(page.locator('#current-project-map')).toBeInViewport();
  await page.goto('/cv/');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Zheye-Song-CV.pdf');
  const pdf = await page.request.get('/Zheye-Song-CV.pdf');
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  // Request a genuinely missing route; /404.html is also a directly served static asset.
  const missing = await page.goto('/quiet-order-missing-page/');
  expect(missing?.status()).toBe(404);
  await page.getByRole('link', { name: 'Return home', exact: true }).click();
  await expect(page).toHaveURL('/');
});

test('200 percent equivalent desktop reflow stays readable', async ({ browser }) => {
  // A 1280x720 screen at 200% exposes 640x360 CSS pixels with DPR 2.
  // This tests desktop zoom's layout/raster dimensions, not browser-chrome shortcuts.
  const context = await browser.newContext({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage();
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:4333${route}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      await expect(page.locator('h1')).toBeVisible();
      const nav = page.getByRole('navigation', { name: 'Primary navigation' });
      await expect(nav.getByRole('link')).toHaveCount(4);
    }
  } finally { await context.close(); }
});

test('palette contrast and interactive control sizes meet the design contract', async ({ page }) => {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/../g)!.map((pair) => parseInt(pair, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const color of [palette.ink, palette.muted, palette.accent, palette['accent-dark']]) {
    expect((luminance(palette.paper) + 0.05) / (luminance(color) + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
  for (const viewport of [viewports[0], viewports[4]]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const heights = await page.locator('.hero__links a').evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
    expect(heights.every((height) => height >= 48)).toBe(true);
    await page.goto('/writing/');
    const sizes = await page.locator('.writing-filter button').evaluateAll((buttons) => buttons.map((button) => ({ w: button.getBoundingClientRect().width, h: button.getBoundingClientRect().height })));
    expect(sizes.every(({ w, h }) => w >= 48 && h >= 48)).toBe(true);
  }
});

for (const viewport of [viewports[0], viewports[4]]) {
  test(`interior page visual regression at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const [name, route] of [
      ['research', '/research/'], ['writing', '/writing/'],
      ['article', '/writing/research-directions-map/'], ['cv', '/cv/'], ['404', '/404.html'],
    ]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`quiet-${name}-${viewport.width}.png`, { animations: 'disabled' });
    }
  });
}
