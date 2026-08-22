# Design QA

> Historical visual QA record. Temporary screenshot paths may expire; current factual links are
> governed by `src/data/profile.json` and the repository verification scripts.

## Scope And Evidence

- Accepted visual baseline: `/private/tmp/academic-homepage-audit/02-home-desktop-fresh.png`
- Final desktop home: `/private/tmp/academic-homepage-redesign-home-desktop.png`
- Final desktop research: `/private/tmp/academic-homepage-redesign-research-desktop.png`
- Final desktop CV: `/private/tmp/academic-homepage-redesign-cv-desktop.png`
- Final mobile home: `/private/tmp/academic-homepage-redesign-home-mobile.png`
- Final mobile research: `/private/tmp/academic-homepage-redesign-research-mobile.png`
- Final mobile CV: `/private/tmp/academic-homepage-redesign-cv-mobile.png`
- Rendered PDF CV: `/private/tmp/zheye-song-cv.png`

The accepted homepage capture and final desktop homepage were opened together with `view_image`.
The kinetic-head asset, geometry, material, and choreography were intentionally frozen; this pass
changed academic information architecture, content density, typography, and responsive spacing.

## Fidelity Ledger

| Area | Baseline | Final treatment | Result |
| --- | --- | --- | --- |
| Visual anchor | Chrome head and large name define the hero | Artwork and two-column composition retained unchanged | Pass |
| Navigation | Home, Research, Writing, CV | Writing removed until public content exists | Intentional approved change |
| Research statement | Broad quoted statement | Two factual, unquoted sentences with narrower claims | Pass |
| Heading system | Cormorant Garamond used across display levels | Cormorant Garamond retained for all headings; Inter handles UI and body copy | Pass |
| Academic evidence | Interest descriptions only | One verified public research-code repository, one unlinked research project, and one public software project | Pass |
| CV | Repeated profile summary | Structured HTML CV, project evidence, update date, and downloadable one-page PDF | Pass |

## Viewport Checks

- 1280 x 900 home: hero and Research Interests meet at y=677; all three research rows remain in
  the first viewport; `scrollWidth=1280`.
- 1280 x 900 research: three interest entries render with meaningful status/focus metadata; two
  linked public research-code entries render below; `scrollWidth=1280`.
- 1280 x 900 CV: `Curriculum Vitae` remains on one line after the final grid correction;
  Education begins at y=396; three selected-work rows and the PDF action are present.
- 390 x 844 home: the first research row begins at y=795 and is visible in the first viewport;
  `scrollWidth=390`.
- 390 x 844 research: the first research entry begins at y=447; the 48 px title wraps without
  clipping; `scrollWidth=390`.
- 390 x 844 CV: title, contact links, PDF action, Education, and Selected Work remain readable;
  `scrollWidth=390`.

## Interaction And Content Integrity

- Primary navigation was clicked from Home to Research and from Research to CV; both routes and
  active states updated correctly.
- Writing was absent during this historical pass and was added in the later Writing Blog Pass.
- The PDF URL returns HTTP 200 with `application/pdf`. The PDF has one page and extracted text
  contains the name, both research-code projects, and the research interests.
- Project descriptions and dates are grounded in public repositories under `github.com/zheyesong`.
- No advisor, award, publication, graduation date, or coursework claim was invented.

## Engineering Checks

- `ASTRO_TELEMETRY_DISABLED=1 npm run check`: 0 errors, 0 warnings, 0 hints across 20 files.
- `ASTRO_TELEMETRY_DISABLED=1 npm run build`: 5 static pages generated successfully.
- `git diff --check`: clean.
- Browser console: no relevant warnings or errors on Home, Research, or CV.
- Browser path: Codex in-app Browser; desktop 1280 x 900 and mobile 390 x 844.

## Residual Content Dependencies

- Random matrix theory is accurately labeled as a foundational interest; no public project is
  linked because none is currently verifiable.
- Education dates, expected graduation, selected coursework, honors, advisor, talks, and formal
  publications remain absent until verified information is supplied.
- The empty Writing route remains available for future content but is not discoverable through the
  site navigation.
- The pre-existing kinetic-head bundle-size warning remains outside this frozen-avatar scope.

final result: passed

## Catalogue And Material Study Pass

- Desktop home: `/private/tmp/academic-homepage-catalogue-home.png`
- Desktop research, top: `/private/tmp/academic-homepage-catalogue-research-top.png`
- Desktop research, full page: `/private/tmp/academic-homepage-catalogue-research-full.png`
- Desktop CV, top: `/private/tmp/academic-homepage-catalogue-cv-top.png`
- Desktop CV, full page: `/private/tmp/academic-homepage-catalogue-cv-full.png`
- Mobile home, 390 x 844: `/private/tmp/academic-homepage-catalogue-mobile-home.png`
- Mobile research, 390 x 844: `/private/tmp/academic-homepage-catalogue-mobile-research.png`
- Mobile CV, 390 x 844: `/private/tmp/academic-homepage-catalogue-mobile-cv.png`

This pass retained the frozen sculpture, Cormorant Garamond and Inter typography, white paper,
and black/deep-green palette. It added page folios, indexed section headings, R/W/C catalogue
numbers, factual research-status metadata on the home page, and a restrained Lucide download
control on the CV page. The Research page now includes one static material study derived from the
approved sculpture master image; no second portrait style or generated substitute was introduced.

The desktop and mobile captures were inspected for hierarchy, wrapping, line alignment, and visual
density. The browser console reported no warnings or errors. `npm run check` completed with zero
diagnostics, and `npm run build` generated all five static routes successfully. The existing kinetic
head bundle-size warning remains unchanged and outside this visual refinement pass.

## Writing Blog Pass

This pass supersedes the earlier decision to keep Writing undiscoverable. Writing is now a public,
blog-like section with a directory, category filters, reading metadata, long-form article template,
outline navigation, tags, and adjacent-post navigation when more entries are published.

### Source And Implementation Evidence

- Source blog index: `/private/tmp/writing-reference-index.png`
- Source article: `/private/tmp/writing-reference-article.png`
- Final Writing index, desktop: `/private/tmp/writing-new-index-viewport.png`
- Final article, desktop: `/private/tmp/writing-new-article-viewport.png`
- Final Writing index, mobile: `/private/tmp/writing-new-index-mobile.png`
- Final article, mobile: `/private/tmp/writing-new-article-mobile-top.png`
- Side-by-side index comparison: `/private/tmp/writing-index-comparison.png`
- Side-by-side article comparison: `/private/tmp/writing-article-comparison.png`

The index comparison used 1280 x 720 source and implementation captures at a 1280 x 720 CSS
viewport and 1x density. The article source was 1261 x 709 and was normalized to 1280 x 720 before
comparison; the implementation was captured at 1280 x 720, 1x density. Both comparison boards were
opened as single side-by-side inputs. The state was light theme, top of page, public article list and
published article respectively.

The full-view comparisons established the information-architecture match: persistent navigation,
introductory directory, article summaries and metadata on the index, then breadcrumb, title, date,
reading metadata, and readable long-form content on the article. The article comparison also served
as a focused typography and reading-column comparison because the title, deck, metadata, outline,
and opening paragraph are legible at full size. No image-focused comparison was needed: neither
Writing surface uses visible image assets.

### Fidelity Review

- **Fonts and typography:** The reference's sans-serif hierarchy was translated into the site's
  established Cormorant Garamond display and Inter reading system. Body text remains 17 px/1.78 on
  desktop and 16 px/1.75 on mobile. Letter spacing remains zero. The larger article title is an
  intentional continuation of the existing academic-homepage identity rather than a reference
  mismatch.
- **Spacing and layout rhythm:** The article body is capped at 720 px, matching the reference's
  readable measure. Desktop adds a restrained 150 px outline rail; mobile collapses it above the
  prose. Both 1280 px and 390 px checks reported no horizontal overflow.
- **Colors and visual tokens:** White paper, graphite text, cool gray rules, and deep green accents
  retain the accepted site palette. The source's pale gray card background was not copied because
  the current project uses unframed catalogue rows throughout.
- **Image quality and asset fidelity:** No images, logos, or illustrative assets are required on
  these text-first Writing surfaces; no placeholders or code-drawn substitutes were introduced.
- **Copy and content:** The sample research note is grounded only in existing CV/project data and
  explicitly distinguishes evolving project notes from finished results.

### Interaction And Responsive Checks

- `All` and `Research note` filters update `aria-pressed`, visible-entry count, and entry visibility.
- The article link resolves to `/writing/research-directions-map/`.
- Outline links update the URL fragment and scroll to the selected section.
- Desktop Writing and article pages render at 1280 x 720 without horizontal overflow.
- Mobile Writing and article pages render at 390 x 844 without clipping; the three-line article
  title, filter controls, metadata, outline, and 350 px prose column remain readable.

### Comparison History

- Initial P2: the Writing index introduced a nested `main` landmark inside the layout's existing
  `main`, weakening document semantics. Fix: replaced the nested landmark with a labelled `section`.
  Post-fix evidence: the final DOM snapshot exposes one `main` containing a `Writing` region.
- No P0, P1, or other P2 visual differences remained after the post-fix desktop and mobile review.
  The reference's denser sans-serif title treatment and card surfaces are accepted intentional
  deviations required to preserve the site's established artistic system.

### Engineering Checks

- `npm run check`: 0 errors, 0 warnings, 0 hints across 23 files.
- `npm run build`: 6 static pages generated, including the Writing index and sample article.
- The existing kinetic-head chunk-size warning remains unchanged and outside this Writing scope.

final result: passed
