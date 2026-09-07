# GitHub Pages deployment verification

The site is an Astro static build. In repository Settings → Pages, Source must be
**GitHub Actions**. The Pages workflow verifies the source, uploads only `dist/`,
and deploys only `main`. A repair branch may run diagnostics but cannot deploy.
Never publish the repository root: legacy Vite sources contain build-time virtual
imports which a browser cannot resolve.

## September 2026 Linux investigation

The previously pushed site compiled successfully, but six visual checks blocked
publication: four screenshot suites and two poster/WebGL comparisons. The
unchanged failures were reproduced on the non-deploying repair branch in run
34164408984; run 34164747583 captured platform-font and sampling diagnostics.

The font probes confirmed that both environments use the bundled **Source Serif 4**
and **Inter**, not fallback fonts. The existing baseline was macOS Chrome 152;
CI was Linux Chromium 151. Font rasterization and line wrapping differ between
those environments. Baselines are therefore separated into `darwin/` and `linux/`.
macOS baseline pixels were retained unchanged. New Linux baselines require visual
review before committing; ordinary verification never updates snapshots.
The 20 Linux page/section candidates from run 34165714439 were individually
reviewed at desktop and mobile widths before inclusion. The temporary candidate
generation step was then removed; deployment uses only committed baselines.

The portrait comparison exposed a real compositing mismatch: Linux downsampled
the image more softly than the WebGL canvas. Drawing the original decoded poster
once, at its original resolution, onto a 2D canvas uses the same CSS compositing
path as the dynamic canvas. The accessible picture remains beneath it and is the
no-JavaScript / decoding-failure fallback. This introduces no Three.js load on
the idle homepage and no render loop for the static surface.

The model, texture, rest images, social image, PDF, 63 layers, camera, materials,
sampling resolution, rotation duration and 180 ms handoffs are unchanged.
Linux desktop raw RGB error dropped from **12.857 to about 3.006 / 255**; mobile
remains about **3.168 / 255**, dominated by cross-renderer subpixel differences.
macOS remains about **0.967 / 255**. These are fixture measurements, not universal
device guarantees.

Quality checks deliberately do not blur or resize comparison images:

- Raw mean RGB error: below 2 on macOS, below 4 on Linux.
- Maximum mean channel drift: below 1 / 255.
- Global contrast change: below 2%.
- Adjacent-pixel edge-energy change: below 3%, protecting the fine layers.
- A complete rotation must return to the identical static pixels.
- Negative controls must reject blur, brightness shifts, contrast loss and a
  one-pixel vertical displacement. Raising a raw tolerance alone is not a fix.

## Verification and evidence

Use Node 22 and the committed lockfile. Run `npm ci`, then `npm run verify`.
Local tests use Chrome; CI installs the lockfile-matched Playwright Chromium.
The workflow retains test results, platform-font diagnostics, pose images and
handoff recordings for seven days, including on failure.

For an intentional baseline update, generate candidates in the matching OS with
`npm run test:visual -- --update-snapshots=all`, inspect them, then commit only the
reviewed platform files. Do not update baselines automatically during deployment.

After deployment, check the public Home, Research, Writing, article, CV, PDF,
robots and sitemap. Also check a genuinely missing URL returns 404; directory
URLs without a slash redirect to the canonical slash form; assets and fonts load;
and the portrait preserves navigation, reduced-motion and its static fallback.
Writing drafts must not appear in routes, listings or the sitemap.

Deployment repair does not authorize publishing uncommitted Writing material,
changing CV facts, redesigning the site, or upgrading dependencies.
