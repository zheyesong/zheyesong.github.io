import type { Page, TestInfo } from '@playwright/test';

export async function attachVisualDiagnostics(page: Page, testInfo: TestInfo) {
  const client = await page.context().newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('CSS.enable');
  const { root } = await client.send('DOM.getDocument');
  const fonts: Record<string, unknown> = {};
  for (const selector of ['h1', '.hero__statement p', '.research-detail__summary', '.site-nav__link']) {
    const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    if (nodeId) {
      const result = await client.send('CSS.getPlatformFontsForNode', { nodeId });
      fonts[selector] = result;
      const family = selector === '.site-nav__link' ? 'Inter' : 'Source Serif 4';
      if (!result.fonts.some((font) => font.isCustomFont && font.familyName === family)) {
        throw new Error(`${selector} is not rendering with the bundled ${family} font`);
      }
    }
  }
  await client.detach();
  const metrics = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    devicePixelRatio,
    fonts: [...document.fonts].map((font) => ({ family: font.family, weight: font.weight, status: font.status })),
    resources: performance.getEntriesByType('resource').filter((entry) => /woff|css/.test(entry.name)).map((entry) => ({ name: entry.name, duration: entry.duration })),
    head: (() => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-kinetic-canvas]');
      if (!canvas || document.querySelector<HTMLElement>('[data-kinetic-head]')?.dataset.ready !== 'true') return null;
      const gl = canvas.getContext('webgl2')!;
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      return { width: canvas.width, height: canvas.height, renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unavailable' };
    })(),
  }));
  await testInfo.attach('visual-environment', { body: JSON.stringify({ fonts, metrics }, null, 2), contentType: 'application/json' });
  // Keep a filesystem copy because the workflow uploads test-results, not an HTML report.
  const { writeFile } = await import('node:fs/promises');
  await writeFile(testInfo.outputPath('visual-environment.json'), JSON.stringify({ fonts, metrics }, null, 2));
}
