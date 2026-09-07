# Zheye Song Academic Homepage

Source for `https://zheyesong.github.io`. The site is a static Astro project designed for supervisors, potential collaborators, and academic peers.

## Stack

- Astro 7 with static output
- TypeScript and Astro content collections
- Three.js and a generated GLB asset for the layered kinetic head
- Cormorant Garamond and Inter, bundled locally with Fontsource

Use Node 22, matching the GitHub Pages workflow.

## Local Development

```bash
npm install
npm run dev
```

The local server prints the URL it selects. Production verification is:

```bash
npm run verify
npm run preview
```

## Public Routes

- `/` - identity, research map, selected research, recent writing, and academic record
- `/research/` - research interests, projects, and project resources
- `/writing/` - public research notes and essays
- `/cv/` - verified academic profile with a downloadable PDF

Legacy `.html` URLs remain in `public/` as redirects so old bookmarks do not break.

## Profile Data

Canonical profile, project, software, contact, navigation, and CV metadata live in:

```text
src/data/profile.json
```

`src/data/site.ts` validates the JSON before exposing it to Astro. Research projects carry their
`featured` state and optional `code`, `manuscript`, and `data` resources directly; project-backed
homepage entries must not be duplicated elsewhere. Standalone software lives under
`softwareProjects`. Keep the JSON factual. Do not add publications, positions, awards, dates, or
links until they can be verified.

## Research Content

Research directions live in `src/content/research/`. Each Markdown file uses:

```markdown
---
title: "Research direction"
catalogueId: "R.01"
summary: "Short description for the homepage."
status: "Research interest"
focus: "Short method or question label"
order: 1
featured: true
---

Longer, carefully qualified description.
```

These frontmatter records are the single source for research-direction titles used by the homepage,
Research page and HTML CV. The OG card uses the profile statement. Set `featured: false` to keep a direction off the homepage
map while retaining it on the Research page.

## CV PDF

The downloadable CV is built from the reviewed LaTeX source at `cv/Zheye-Song-CV.tex`. Website
profile data remains in `src/data/profile.json`; `npm run check:cv` verifies that their key factual
fields remain aligned. Education entries can set `visibleOnWebsite: false` to omit an experience
from both Home and HTML CV without deleting it from the reviewed PDF or LaTeX source. The field
defaults to `true`; the CV fact check deliberately still checks the full education record.
After updating the CV source, regenerate the public PDF with TeX Live or
MacTeX:

```bash
npm run build:cv
```

The command compiles into the ignored `.cv-build/` directory and updates
`public/Zheye-Song-CV.pdf`.

The current CV source and download were synchronized with the September 2, 2026 reviewed CV.
When importing a newer CV, update the LaTeX source, download, profile/education/contact data,
project order and statuses, technical skills, and `cv.updated` together. Education scores and
project mentor details may be omitted when the reviewed CV does not list them; mentor label,
name, and affiliation must otherwise be supplied together. Catalogue IDs remain stable when
entries are reordered. Website research interests and public code links can remain on the site
even when the concise PDF omits them. Run `npm run build:og` after changing the profile, then
`npm run check:cv` to verify the shared facts.

## Writing Content

Writing lives in `src/content/writing/`. Start from `_template.md`:

```markdown
---
title: "Writing title"
summary: "One sentence explaining the note and why it matters."
date: "2026-07-15"
category: "Research note"
tags: ["topic"]
draft: true
order: 1
---

## Question

## Main idea

## Notes

## Open questions
```

Supported categories are `Research note`, `Reading note`, `Course project`, and `Expository note`.
Dates are timezone-independent `YYYY-MM-DD` strings. Entries default to draft unless explicitly set
to `draft: false`; drafts are excluded from the directory, generated routes, sitemap, and homepage
Recent Writing preview. The homepage shows at most the two newest public entries.

## Styles and Verification

The site follows the Quiet Order design system documented in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).
Colors have one source in `src/data/palette.json`; BaseLayout applies them as CSS custom properties,
and the head renderer/exporter and OG generator consume the same palette. Spacing, type scales,
grid spans and breakpoints live in `src/styles/tokens.css`. Source Serif 4 is self-hosted at the
pinned version 5.3.0; Inter handles interface text. No previously installed dependency was upgraded.
Use `SectionHeading variant="margin"` inside a `.margin-section` with a `.section-body` for a
side-label section. Ordinary headings keep the default variant and their semantic size.

Styles are separated by ownership: `tokens.css`, `base.css`, `layout.css`, and `components.css`
provide shared foundations, while `home.css`, `writing.css`, and `cv.css` are imported only by their
own pages. Keep responsive overrides in the same ownership file as the base rule they modify.

`npm run verify` runs type/content checks, CV and OG consistency, asset validation, a production
build, homepage performance budgets, internal-link checks, and Playwright behavior/visual regression.
Local visual tests use installed Google Chrome; CI installs the Playwright-pinned Chromium build.
Approved section-level screenshots live in `tests/__screenshots__/`.

## Kinetic Head

The approved `public/assets/kinetic-head-master.webp` remains the input for model/texture generation.
It is not the homepage poster: the poster is now exported from the same scene as the animation.
Never overwrite the master with a rendered rest pose, or subsequent model generation would feed
its own output back into its input.

`src/scripts/kinetic-head-scene.ts` owns the shared model, texture, material, orthographic camera,
sRGB output, shared warm-paper background, and aligned pose. Both the runtime and offline exporter use this
recipe at a fixed 394:560 aspect ratio and 591 x 840 internal rendering resolution. CSS scales both
surfaces identically; a fixed sampling grid prevents the fine layers shifting as the surfaces swap.
The poster uses the WebKit/Chromium downsampling hint to match the canvas's bilinear filtering;
other engines fall back to their normal image filtering and should be visually checked.
The homepage uses the approximately 40 KB rest AVIF, with lossless WebP as the fallback.

`scripts/build-kinetic-head.mjs` converts that source into a 63-layer GLB and a matching texture.
During interaction, the layers complete one independently directed mechanical turn in approximately
4.67 seconds (the original seven-second choreography at 1.5x speed). The 180 ms entry and exit fades
keep their original duration.
Each layer uses a motor-like acceleration/deceleration profile plus a small cam offset while returning
to the exported rest pose at the end of the cycle.

The exported GLB carries positions, UVs and indices only. Every runtime material is an unlit
`MeshBasicMaterial`, so vertex normals would be roughly 412 KB of data the shader never reads;
the generator does not compute them.

The choreography is grounded in the documented mechanism rather than a generic spin. [David Cerny's official work page](https://www.davidcerny.cz/work/k-kafka-head) describes 42 independently rotating panels; [Quadrio's technical page](https://www.quadrio.cz/en/franz-kafka-statue) documents 42 synchronous motors and inductive alignment sensors; and the [engineering brief](https://www.apexdyna.nl/wp-content/uploads/V-hlave-Franze-Kafky-znaceni-en-2015.pdf) records 15 movement types in the original long-form choreography. This web interaction condenses that behavior into one deliberate hover/button cycle rather than claiming to reproduce the physical 40-minute program literally.

The control supports mouse hover, button activation, Enter, and Space, and rejects duplicate
triggers while moving. Focus preloads without playing. The poster always stays underneath the
opaque canvas; only the canvas fades in/out over 180 ms, with a zero-angle frame at both ends.
There are no surface-specific colour filters. Rendering stops while idle. The runtime, GLTF
parser, model, and texture load only after interaction. Changing `prefers-reduced-motion` during
play immediately restores the poster, and touch gestures over the head can scroll the page.

After changing the shared scene, texture, or model, regenerate the poster and social card:

```bash
npm run build:kinetic-rest
npm run build:og
npm run verify
```

The rest exporter uses the existing Playwright/Sharp dependencies and Astro's own Vite bundler.
It serves an in-memory harness on a loopback-only temporary port and closes the browser/server
after export. There is no production render/debug route. Local export uses installed Chrome;
CI uses Playwright Chromium. Exported images must be visually reviewed before updating baselines.

## Public Assets

Everything under `public/` is deployed verbatim. Generated files are identified below; do not
hand-edit them.

| File | Origin | Notes |
| --- | --- | --- |
| `assets/kinetic-head-master.webp` | Approved visual reference, committed by hand | Input to geometry/texture generation; never replace with the rest image |
| `assets/kinetic-head-master.avif` | Generated by `npm run build:images` | Legacy derivative retained; no longer the homepage poster |
| `assets/kinetic-head-rest.webp`, `assets/kinetic-head-rest.avif` | Generated by `npm run build:kinetic-rest` | Same scene and sampling as the animation; homepage poster and OG input |
| `assets/kinetic-head-texture.webp` | Generated by `npm run build:kinetic-head` | Lossless, including the alpha channel the shader's `alphaTest` reads |
| `assets/models/kinetic-head.glb` | Generated by `npm run build:kinetic-head` | 63 layers; positions, UVs and indices only |
| `assets/kinetic-head-detail.webp` | Crop of the master image | Research page material study |
| `assets/og-image.jpg` | Generated by `npm run build:og` | 1200 x 630 Open Graph card; run `npm run check:og` to detect stale profile content |
| `favicon.png` | Committed by hand | 256 x 256 |
| `Zheye-Song-CV.pdf` | Generated by `npm run build:cv` | See the CV PDF section above |
| `about.html`, `blog.html`, `blog-read.html`, `reading.html`, `reading-read.html` | Committed by hand | Redirects preserving pre-Astro bookmarks |

Regenerate the social card whenever the public profile identity or research fields change:

```bash
npm run build:og
```

If the approved source image itself changes, regenerate the model first, then its rendered poster:

```bash
npm run build:kinetic-head
npm run build:kinetic-rest
npm run build:og
```

`npm run check:assets` resolves every asset URL referenced from `src/` and `scripts/` against
`public/`, and lists any shipped file that no source file references. It exists because asset URLs
loaded from JavaScript -- the texture and the GLB -- never appear as an HTML `href` or `src`, so
`npm run check:links` cannot see them.

## Deployment

`.github/workflows/pages.yml` installs dependencies and the cached Playwright browser, then runs
`npm run verify` before deploying `dist/` to GitHub Pages on pushes to `main`.
