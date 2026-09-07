import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { width: 1440, height: 900, head: 256, heading: 80 },
  { width: 1280, height: 720, head: 256, heading: 80 },
  { width: 1200, height: 900, head: 256, heading: 80 },
  { width: 1080, height: 900, head: 208, heading: 80 },
  { width: 840, height: 900, head: 160, heading: 48 },
  { width: 584, height: 844, head: 160, heading: 48 },
  { width: 420, height: 844, head: 160, heading: 48 },
  { width: 390, height: 844, head: 160, heading: 48 },
  { width: 320, height: 800, head: 160, heading: 48 },
];

async function projectFacts(page: Page, id: string) {
  return page.locator(`[data-project-id="${id}"]`).evaluate((entry) => ({
    catalogueId: entry.querySelector('.catalogue-index')?.textContent?.trim(),
    title: entry.querySelector('h3')?.textContent?.trim(),
    summary: entry.querySelector('.project-entry__summary')?.textContent?.trim(),
    resources: [...entry.querySelectorAll('.project-entry__actions a')]
      .map((link) => link.textContent?.trim())
      .filter(Boolean),
  }));
}

for (const viewport of viewports) {
  test(`homepage uses the ${viewport.width}px fixed layout tier`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const metrics = await page.evaluate(() => {
      const head = document.querySelector('.kinetic-head')?.getBoundingClientRect();
      const heading = document.querySelector('.hero h1');
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        head: Math.round(head?.width ?? 0),
        heading: Math.round(Number.parseFloat(heading ? getComputedStyle(heading).fontSize : '0')),
      };
    });

    expect(metrics).toEqual({
      overflow: 0,
      head: viewport.head,
      heading: viewport.heading,
    });
  });
}

test('research directions are three semantic links with working anchors', async ({ page }) => {
  await page.goto('/');
  const fields = page.getByRole('list', { name: 'Research directions' }).getByRole('link');
  await expect(fields).toHaveCount(3);
  const destinations = await fields.evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
  for (const destination of destinations) {
    await page.goto(destination);
    await expect(page.locator(destination.slice(destination.indexOf('#')))).toBeVisible();
  }
});

test('featured research is identical across Home, Research, and CV', async ({ page }) => {
  for (const id of ['metric-space-causal-inference']) {
    await page.goto('/');
    const home = await projectFacts(page, id);
    await expect(page.locator('.project-list--home > li')).toHaveCount(1);
    await page.goto('/research/');
    const research = await projectFacts(page, id);
    await page.goto('/cv/');
    const cv = await projectFacts(page, id);

    expect(home.catalogueId).toBe(research.catalogueId);
    expect(home.title).toBe(research.title);
    expect(home.summary).toBe(research.summary);
    expect(cv.catalogueId).toBe(research.catalogueId);
    expect(cv.title).toBe(research.title);
    expect(cv.summary).toBe(research.summary);
    expect(home.resources.filter((value) => value !== 'Details')).toEqual(research.resources);
    expect(cv.resources.filter((value) => value !== 'Details')).toEqual(research.resources);
  }
});

test('Recent Writing uses the same public collection data as Writing', async ({ page }) => {
  await page.goto('/');
  const homeTitle = await page.locator('.home-writing-entry h3').first().innerText();
  const homeSummary = await page.locator('.home-writing-entry__content p').first().innerText();
  expect(await page.locator('.home-writing-entry').count()).toBeLessThanOrEqual(2);

  await page.goto('/writing/');
  await expect(page.locator('.writing-feed__content h2').first()).toHaveText(homeTitle);
  await expect(page.locator('.writing-feed__content > p').first()).toHaveText(homeSummary);
});

test('homepage remains complete without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: 'http://127.0.0.1:4333',
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Zheye Song' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Selected Research' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent Writing' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Academic Record' })).toBeVisible();
  await context.close();
});

test('all routes remain overflow-free at representative tiers', async ({ page }) => {
  for (const viewport of [
    { width: 1200, height: 900 },
    { width: 840, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of ['/', '/research/', '/writing/', '/cv/']) {
      await page.goto(route);
      expect(await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )).toBe(0);
    }
  }
});

test('keyboard focus begins with skip link and primary navigation', async ({ page }) => {
  await page.goto('/');
  const focusOrder = [];
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press('Tab');
    focusOrder.push(await page.evaluate(() => document.activeElement?.textContent?.trim()));
  }
  expect(focusOrder).toEqual(['Skip to content', 'Home', 'Research', 'Writing', 'CV']);
});

test('3D assets load only after interaction and return to the static pose', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await page.waitForTimeout(1_800);

  expect(requests.some((url) => /three\.core|GLTFLoader|kinetic-head\.glb|kinetic-head-texture/.test(url)))
    .toBe(false);

  await page.getByRole('button', { name: 'Play sculpture rotation' }).click();
  await expect(page.locator('[data-kinetic-head]')).toHaveAttribute('data-running', 'true');
  await expect(page.locator('[data-kinetic-head]')).toHaveAttribute('data-layer-count', '63');
  await expect(page.locator('[data-kinetic-head]')).toHaveAttribute('data-running', 'false', {
    timeout: 11_000,
  });
  await expect(page.locator('[data-kinetic-head]')).toHaveAttribute('data-canvas-active', 'false');
  await expect(page.locator('[data-kinetic-head]')).toHaveAttribute('data-max-layer-angle', '0.0000');
});

for (const viewport of [{ width: 1200, height: 900 }, { width: 390, height: 844 }]) {
  test(`homepage visual regression at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const regions = [
      ['identity', '.hero'],
      ['research-map', '[aria-labelledby="research-heading"]'],
      ['selected-research', '[aria-labelledby="work-heading"]'],
      ['recent-writing', '[aria-labelledby="writing-heading"]'],
      ['academic-record', '[aria-labelledby="record-heading"]'],
    ] as const;

    for (const [name, selector] of regions) {
      const region = page.locator(selector);
      await region.scrollIntoViewIfNeeded();
      await page.waitForTimeout(60);
      await expect(region).toHaveScreenshot(`home-${viewport.width}-${name}.png`, {
        animations: 'disabled',
      });
    }
  });
}
