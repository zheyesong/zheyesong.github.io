# Zheye Song Academic Portfolio

This repository contains the source for `https://zheyesong.github.io`.
It is a Vite-powered static site with Markdown-backed Blog and Reading Notes collections.

## Local Development

```bash
npm install
npm run dev
```

The Vite dev server keeps the public URLs stable:

- `/`
- `/about.html`
- `/blog.html`
- `/blog-read.html?post=<slug>`
- `/reading.html`
- `/reading-read.html?note=<slug>`

## Content Model

Site-level metadata lives in `content/site.json`.
Profile and homepage/About copy live in `content/profile.json`.

Blog posts live in `content/blog/`.
Reading notes live in `content/reading/`.
Drop a new `.md` file into `content/blog/` and it will be included in the Blog directory, search index, and `blog-read.html?post=<slug>` reader on the next dev refresh/build. Drop a new `.md` file into `content/reading/` and it will follow the same flow through `reading.html` and `reading-read.html?note=<slug>`.
Blog posts use frontmatter:

```markdown
---
title: "Entry Title"
slug: "entry-anchor"
date: "2026-02-14"
status: "Draft"
summary: "One sentence summary."
tags: ["topic", "method"]
order: 1
draft: false
---

Markdown body goes here.
```

Set `draft: true` to keep an entry out of the rendered directory and search index.

Reading notes use frontmatter shaped around external source material:

```markdown
---
title: "Source Title"
slug: "short-stable-slug"
sortKey: "Author A"
date: "2026-06-01"
sourceType: "paper"
authors: ["Author A", "Author B"]
year: 2025
venue: "arXiv"
url: "https://example.com/source"
status: "Reading"
summary: "One sentence summary of why this source matters."
tags: ["topic", "method"]
order: 1
draft: false
---

## Why I Read It

## Core Idea

## My Notes

## Questions
```

Supported `sourceType` values are intentionally informal: `paper`, `blog`, `article`, `book`, `talk`, or any short label that fits the source.

Reading notes are sorted A-Z by `sortKey`. If `sortKey` is empty, the site falls back to the first author, then the note title.

## Build And Deploy

```bash
npm run build
npm run preview
```

GitHub Actions builds the Vite site and deploys `dist/` to GitHub Pages on pushes to `main`.

## Link Notes

The homepage hides unavailable CV and Publications links by default. To enable the CV link, place `cv.pdf` in `public/` and set the CV entry in `content/profile.json` to `"enabled": true`.
