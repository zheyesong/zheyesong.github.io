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

- `/` - profile, research interests, selected work, and education
- `/research/` - research interests and linked public research code
- `/writing/` - public research notes and essays
- `/cv/` - verified academic profile with a downloadable PDF

Legacy `.html` URLs remain in `public/` as redirects so old bookmarks do not break.

## Profile Data

Canonical profile, project, contact, navigation, and CV metadata live in:

```text
src/data/profile.json
```

`src/data/site.ts` validates the JSON before exposing it to Astro. Keep the JSON factual. Do not add
publications, positions, awards, dates, or links until they can be verified.

## Research Content

Research directions live in `src/content/research/`. Each Markdown file uses:

```markdown
---
title: "Research direction"
summary: "Short description for the homepage."
status: "Research interest"
focus: "Short method or question label"
order: 1
featured: true
---

Longer, carefully qualified description.
```

Set `featured: false` to keep an entry off the homepage while retaining it on the Research page.

## CV PDF

The downloadable CV is built from the reviewed LaTeX source at `cv/Zheye-Song-CV.tex`. Website
profile data remains in `src/data/profile.json`; `npm run check:cv` verifies that their key factual
fields remain aligned. After updating the CV source, regenerate the public PDF with TeX Live or
MacTeX:

```bash
npm run build:cv
```

The command compiles into the ignored `.cv-build/` directory and updates
`public/Zheye-Song-CV.pdf`.

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
to `draft: false`; drafts are excluded from the directory, generated routes, and sitemap.

## Kinetic Head

The sculpture uses `public/assets/kinetic-head-master.png` as its canonical resting image. That keeps the face, neck, lamella spacing, crop, and reflections pixel-faithful to the approved visual reference instead of asking a procedural model to approximate them.

`scripts/build-kinetic-head.mjs` converts that source into a 63-layer GLB and a matching texture.
During interaction, the layers complete one independently directed mechanical turn over seven seconds.
Each layer uses a motor-like acceleration/deceleration profile plus a small cam offset while returning
to exact alignment with the static image at the end of the cycle.

The choreography is grounded in the documented mechanism rather than a generic spin. [David Cerny's official work page](https://www.davidcerny.cz/work/k-kafka-head) describes 42 independently rotating panels; [Quadrio's technical page](https://www.quadrio.cz/en/franz-kafka-statue) documents 42 synchronous motors and inductive alignment sensors; and the [engineering brief](https://www.apexdyna.nl/wp-content/uploads/V-hlave-Franze-Kafky-znaceni-en-2015.pdf) records 15 movement types in the original long-form choreography. This web interaction condenses that behavior into one deliberate hover/button cycle rather than claiming to reproduce the physical 40-minute program literally.

The control supports pointer hover, button activation, Enter, and Space; rejects duplicate triggers while moving; and returns to the untouched native image after the final alignment hold. Motion is disabled when `prefers-reduced-motion` is enabled.

## Deployment

`.github/workflows/pages.yml` installs dependencies, runs type/content/CV/internal-link checks,
builds `dist/`, and deploys it to GitHub Pages on pushes to `main`.
