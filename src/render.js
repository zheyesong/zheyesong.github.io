import { escapeHtml, sanitizeHref } from './markdown.js';

function linkAttributes(link) {
  if (link.obfuscated) {
    return [
      'href="#"',
      'class="email-obf"',
      'aria-label="Email me; address reveals on hover or focus"',
      'data-u="' + escapeHtml(link.userEnc || '') + '"',
      'data-d="' + escapeHtml(link.domainEnc || '') + '"'
    ].join(' ');
  }

  const attrs = ['href="' + escapeHtml(sanitizeHref(link.href)) + '"'];
  if (link.external) attrs.push('target="_blank"', 'rel="noopener noreferrer"');
  return attrs.join(' ');
}

function renderQuickLinks(profile) {
  const links = (profile.quickLinks || []).filter(link => link.enabled !== false && (link.obfuscated || link.href));
  return links.map((link, index) => {
    const sep = index < links.length - 1 ? '<span class="sep" aria-hidden="true">|</span>' : '';
    return '<a ' + linkAttributes(link) + '>' + escapeHtml(link.label) + '</a>' + sep;
  }).join('\n                ');
}

function getHomeMarkup({ site, profile }) {
  const firstPreview = profile.previews.about;
  const btnHtml = profile.homeButtons.map(btn => (
    '<a class="page-btn" href="' + escapeHtml(sanitizeHref(btn.href)) + '" data-preview="' + escapeHtml(btn.key) + '">' + escapeHtml(btn.label) + '</a>'
  )).join('\n                ');
  const firstLink = firstPreview.showLink
    ? '<a class="preview-link" href="' + escapeHtml(sanitizeHref(firstPreview.href)) + '">See more details</a>'
    : '<a class="preview-link" href="#" hidden>See more details</a>';

  return [
    '<main class="card">',
    '    <h1 class="name">' + escapeHtml(profile.name) + '</h1>',
    '    <p class="title">' + escapeHtml(profile.title) + '</p>',
    '    <p class="interests">' + escapeHtml(profile.interests) + '</p>',
    '    <nav class="links" aria-label="Quick links">',
    '        ' + renderQuickLinks(profile),
    '    </nav>',
    '    <div class="page-nav" aria-label="Site sections">',
    '        ' + btnHtml,
    '    </div>',
    '    <div id="previewViewport" class="preview-list" aria-live="polite">',
    '        <section id="previewCardA" class="preview-card">',
    '            <h2 class="preview-title">' + escapeHtml(firstPreview.title) + '</h2>',
    '            <p><span class="preview-text">' + escapeHtml(firstPreview.text) + '</span>' + firstLink + '</p>',
    '        </section>',
    '        <section id="previewCardB" class="preview-card" aria-hidden="true">',
    '            <h2 class="preview-title"></h2>',
    '            <p><span class="preview-text"></span><a class="preview-link" href="#" hidden>See more details</a></p>',
    '        </section>',
    '    </div>',
    '    <p class="foot">' + escapeHtml(site.lastUpdated) + '</p>',
    '</main>'
  ].join('\n');
}

function getNavMarkup(site, activeKey) {
  return site.nav.map(item => {
    const active = item.key === activeKey ? ' class="active" aria-current="page"' : '';
    return '<a' + active + ' href="' + escapeHtml(sanitizeHref(item.href)) + '">' + escapeHtml(item.label) + '</a>';
  }).join('\n                ');
}

function getAboutMarkup({ site, profile }) {
  const chunks = [];
  const about = profile.about;
  chunks.push('<h1>' + escapeHtml(about.title) + '</h1>');
  chunks.push('<p>' + escapeHtml(about.intro) + '</p>');
  about.sections.forEach(section => {
    chunks.push('<h2>' + escapeHtml(section.heading) + '</h2>');
    if (section.list) {
      chunks.push('<ul>');
      section.list.forEach(item => chunks.push('<li>' + escapeHtml(item) + '</li>'));
      chunks.push('</ul>');
    }
    if (section.paragraph) chunks.push('<p>' + escapeHtml(section.paragraph) + '</p>');
  });
  chunks.push('<p><a href="index.html">Back to home</a></p>');

  return [
    '<main class="detail-card">',
    '    <nav class="site-nav" aria-label="Main pages">',
    '        ' + getNavMarkup(site, 'about'),
    '    </nav>',
    '    <article class="content">',
    chunks.join('\n                '),
    '    </article>',
    '</main>'
  ].join('\n');
}

function renderTags(tags) {
  if (!tags.length) return '';
  return '<p class="tags">' + tags.map(tag => '<span>' + escapeHtml(tag) + '</span>').join('') + '</p>';
}

function renderPageIntro(page) {
  return String(page.introHtml || '');
}

const collectionReaders = {
  blog: { label: 'Blog', directoryFile: 'blog.html', param: 'post', emptyText: 'No public blog entries yet.' },
  reading: { label: 'Reading Notes', directoryFile: 'reading.html', param: 'note', emptyText: 'No reading notes yet.' }
};

function renderReadingMeta(entry) {
  const chunks = [
    entry.sourceType,
    entry.venue,
    entry.year,
    entry.status,
    entry.date
  ].filter(Boolean);
  return chunks.join(' - ');
}

function renderReadingSourceLink(entry, label = 'Original source') {
  if (!entry.url) return '';
  return '<a class="source-link" ' + linkAttributes({
    label,
    href: entry.url,
    external: true
  }) + '>' + escapeHtml(label) + '</a>';
}

function renderReadingSourceBlock(entry) {
  if (!entry.url && !entry.authors.length && !entry.sourceType && !entry.venue && !entry.year) return '';
  const meta = renderReadingMeta(entry);
  const authors = entry.authors.length ? '<p class="source-authors">' + escapeHtml(entry.authors.join(', ')) + '</p>' : '';
  const link = renderReadingSourceLink(entry);

  return [
    '<aside class="reading-source" aria-label="Reading source">',
    meta ? '    <p class="meta">' + escapeHtml(meta) + '</p>' : '',
    authors ? '    ' + authors : '',
    link ? '    <p>' + link + '</p>' : '',
    '</aside>'
  ].filter(Boolean).join('\n');
}

function getIndexedMarkup(key, page, entries, site) {
  if (collectionReaders[key]) return getCollectionDirectoryMarkup(key, page, entries, site);

  const tocHtml = entries.map(entry => (
    '<li><a href="#' + escapeHtml(entry.id) + '">' + escapeHtml(entry.title) + '</a></li>'
  )).join('\n                    ');
  const entryHtml = entries.map(entry => {
    const meta = [entry.status, entry.date].filter(Boolean).join(' - ');
    return [
      '<section id="' + escapeHtml(entry.id) + '" class="entry">',
      '    <h3>' + escapeHtml(entry.title) + '</h3>',
      meta ? '    <p class="meta">' + escapeHtml(meta) + '</p>' : '',
      entry.summary ? '    <p class="summary">' + escapeHtml(entry.summary) + '</p>' : '',
      renderTags(entry.tags),
      entry.html || '',
      '</section>'
    ].filter(Boolean).join('\n');
  }).join('\n                ');

  return [
    '<main class="detail-card">',
    '    <nav class="site-nav" aria-label="Main pages">',
    '        ' + getNavMarkup(site, key),
    '    </nav>',
    '    <article class="content">',
    '        <h1>' + escapeHtml(page.title) + '</h1>',
    renderPageIntro(page),
    '        <section class="toc" aria-label="' + escapeHtml(page.directoryLabel) + '">',
    '            <h2>' + escapeHtml(page.directoryTitle) + '</h2>',
    '            <ol>',
    '                    ' + tocHtml,
    '            </ol>',
    '        </section>',
    '                ' + entryHtml,
    '        <p><a href="index.html">Back to home</a></p>',
    '    </article>',
    '</main>'
  ].join('\n');
}

function getCollectionDirectoryMarkup(key, page, entries, site) {
  const collection = collectionReaders[key];
  const entryHtml = entries.length ? entries.map((entry, index) => {
    const infoId = key + '-info-' + index;
    const meta = key === 'reading' ? renderReadingMeta(entry) : [entry.status, entry.date].filter(Boolean).join(' - ');
    const infoText = [
      meta,
      key === 'reading' && entry.authors.length ? 'By ' + entry.authors.join(', ') : '',
      entry.tags.length ? 'Tags: ' + entry.tags.join(', ') : 'No tags'
    ].filter(Boolean).join(' | ');
    const sourceLink = key === 'reading' ? renderReadingSourceLink(entry) : '';
    return [
      '<article id="' + escapeHtml(entry.id) + '" class="collection-index-card blog-index-card">',
      '    <a class="blog-index-link" href="' + escapeHtml(entry.href) + '" aria-describedby="' + infoId + '">',
      '        <span class="blog-index-title">' + escapeHtml(entry.title) + '</span>',
      meta ? '        <span class="blog-index-meta">' + escapeHtml(meta) + '</span>' : '',
      key === 'reading' && entry.authors.length ? '        <span class="blog-index-meta">' + escapeHtml(entry.authors.join(', ')) + '</span>' : '',
      '    </a>',
      '    <div id="' + infoId + '" class="blog-hover-info" role="note">',
      '        <div class="blog-hover-inner">',
      entry.summary ? '            <p class="blog-abstract">' + escapeHtml(entry.summary) + '</p>' : '',
      '            <p class="blog-info-line">' + escapeHtml(infoText) + '</p>',
      sourceLink ? '            <p class="blog-info-line">' + sourceLink + '</p>' : '',
      renderTags(entry.tags),
      '        </div>',
      '    </div>',
      '</article>'
    ].filter(Boolean).join('\n');
  }).join('\n                ') : '<p class="summary">' + escapeHtml(collection.emptyText) + '</p>';

  return [
    '<main class="detail-card">',
    '    <nav class="site-nav" aria-label="Main pages">',
    '        ' + getNavMarkup(site, key),
    '    </nav>',
    '    <article class="content collection-directory-content blog-directory-content">',
    '        <h1>' + escapeHtml(page.title) + '</h1>',
    renderPageIntro(page),
    '        <section class="blog-directory" aria-label="' + escapeHtml(page.directoryLabel) + '">',
    '                ' + entryHtml,
    '        </section>',
    '        <p><a href="index.html">Back to home</a></p>',
    '    </article>',
    '</main>'
  ].join('\n');
}

function getCollectionPostMarkup(data, key) {
  const collection = collectionReaders[key];
  const params = new URLSearchParams(window.location.search);
  const slug = params.get(collection.param) || params.get('post') || '';
  const entry = data.collections[key].find(item => item.slug === slug) || null;
  const site = data.site;

  if (!entry) {
    document.title = collection.label + ' Entry Not Found - Zheye Song';
    return [
      '<main class="detail-card">',
      '    <nav class="site-nav" aria-label="Main pages">',
      '        ' + getNavMarkup(site, key),
      '    </nav>',
      '    <article class="content collection-post-content blog-post-content">',
      '        <h1>Entry Not Found</h1>',
      '        <p>The requested entry could not be found. It may be a draft or the URL may be outdated.</p>',
      '        <p><a href="' + collection.directoryFile + '">Back to ' + collection.label + ' directory</a></p>',
      '    </article>',
      '</main>'
    ].join('\n');
  }

  const meta = [entry.status, entry.date].filter(Boolean).join(' - ');
  document.title = entry.title + ' - ' + collection.label + ' - Zheye Song';

  return [
    '<main class="detail-card">',
    '    <nav class="site-nav" aria-label="Main pages">',
    '        ' + getNavMarkup(site, key),
    '    </nav>',
    '    <article class="content collection-post-content blog-post-content">',
    '        <p class="reader-back"><a href="' + collection.directoryFile + '#' + escapeHtml(entry.id) + '">Back to ' + collection.label + ' directory</a></p>',
    '        <h1>' + escapeHtml(entry.title) + '</h1>',
    meta ? '        <p class="meta">' + escapeHtml(meta) + '</p>' : '',
    key === 'reading' ? renderReadingSourceBlock(entry) : '',
    entry.summary ? '        <p class="summary">' + escapeHtml(entry.summary) + '</p>' : '',
    renderTags(entry.tags),
    entry.html || '',
    '    </article>',
    '</main>'
  ].filter(Boolean).join('\n');
}

function fillPreviewCard(card, item) {
  card.dataset.preview = item.key;
  card.querySelector('.preview-title').textContent = item.title;
  card.querySelector('.preview-text').textContent = item.text;
  const link = card.querySelector('.preview-link');
  if (item.showLink) {
    link.hidden = false;
    link.href = item.href;
    link.textContent = 'See more details';
  } else {
    link.hidden = true;
    link.removeAttribute('href');
  }
}

export function setupHomePreview(profile) {
  const previewMap = profile.previews;
  const previewOrder = profile.previewOrder;
  const previewNav = document.querySelector('.page-nav');
  const previewBtns = Array.from(document.querySelectorAll('.page-btn[data-preview]'));
  const viewport = document.getElementById('previewViewport');
  const cards = [document.getElementById('previewCardA'), document.getElementById('previewCardB')];
  let currentIndex = 0;
  let activePreview = 'about';
  let timer = 0;

  if (!previewNav || !viewport || cards.some(card => !card)) return;

  function cardHeight(card) {
    return Math.ceil(card.scrollHeight);
  }

  function resetCards() {
    const current = cards[currentIndex];
    const other = cards[1 - currentIndex];
    current.style.transition = 'none';
    current.style.opacity = '1';
    current.style.transform = 'translateX(0)';
    current.style.pointerEvents = 'auto';
    other.style.transition = 'none';
    other.style.opacity = '0';
    other.style.transform = 'translateX(0)';
    other.style.pointerEvents = 'none';
  }

  function setPreview(key, immediate = false) {
    const nextKey = previewMap[key] ? key : 'about';
    if (!immediate && nextKey === activePreview) return;
    previewBtns.forEach(btn => btn.classList.toggle('is-preview', btn.dataset.preview === nextKey));

    if (timer) {
      clearTimeout(timer);
      timer = 0;
      resetCards();
    }

    if (immediate) {
      const card = cards[currentIndex];
      fillPreviewCard(card, previewMap[nextKey]);
      resetCards();
      viewport.style.height = cardHeight(card) + 'px';
      activePreview = nextKey;
      return;
    }

    const outCard = cards[currentIndex];
    const inCard = cards[1 - currentIndex];
    const forward = previewOrder.indexOf(nextKey) >= previewOrder.indexOf(activePreview);

    fillPreviewCard(inCard, previewMap[nextKey]);
    inCard.style.transition = 'none';
    inCard.style.opacity = '0';
    inCard.style.transform = 'translateX(' + (forward ? '26px' : '-26px') + ')';
    inCard.style.pointerEvents = 'none';
    outCard.style.transition = 'transform .34s ease, opacity .34s ease';
    inCard.style.transition = 'transform .34s ease, opacity .34s ease';

    viewport.style.height = cardHeight(outCard) + 'px';
    void inCard.offsetHeight;
    requestAnimationFrame(() => {
      inCard.style.opacity = '1';
      inCard.style.transform = 'translateX(0)';
      outCard.style.opacity = '0';
      outCard.style.transform = 'translateX(' + (forward ? '-26px' : '26px') + ')';
      viewport.style.height = cardHeight(inCard) + 'px';
    });

    timer = window.setTimeout(() => {
      currentIndex = 1 - currentIndex;
      activePreview = nextKey;
      resetCards();
      viewport.style.height = cardHeight(cards[currentIndex]) + 'px';
      timer = 0;
    }, 360);
  }

  setPreview('about', true);
  previewBtns.forEach(btn => {
    const key = btn.dataset.preview || 'about';
    btn.addEventListener('mouseenter', () => setPreview(key));
    btn.addEventListener('focus', () => setPreview(key));
  });
  previewNav.addEventListener('mouseleave', () => setPreview('about'));
  previewNav.addEventListener('focusout', event => {
    if (!previewNav.contains(event.relatedTarget)) setPreview('about');
  });
}

export function setupObfuscatedEmail() {
  document.querySelectorAll('a.email-obf[data-u][data-d]').forEach(link => {
    let email = '';
    try {
      const user = atob(link.dataset.u || '');
      const domain = atob(link.dataset.d || '');
      email = user && domain ? user + '@' + domain : '';
    } catch (_) {
      email = '';
    }
    if (!email) return;

    link.dataset.email = email;

    const reveal = () => {
      link.href = 'mailto:' + email;
      link.classList.add('is-revealed');
      link.setAttribute('aria-label', 'Email ' + email);
    };
    const conceal = () => {
      link.href = '#';
      link.classList.remove('is-revealed');
      link.setAttribute('aria-label', 'Email me; address reveals on hover or focus');
    };
    link.addEventListener('mouseenter', reveal);
    link.addEventListener('focus', reveal);
    link.addEventListener('mouseleave', conceal);
    link.addEventListener('blur', conceal);
    link.addEventListener('click', event => {
      reveal();
      if (!link.getAttribute('href')) event.preventDefault();
    });
  });
}

export function renderPage(pageKey, data) {
  const root = document.getElementById('contentRoot');
  if (!root) return;

  if (pageKey === 'home') {
    root.innerHTML = getHomeMarkup(data);
    setupObfuscatedEmail();
    setupHomePreview(data.profile);
    return;
  }

  if (pageKey === 'about') {
    root.innerHTML = getAboutMarkup(data);
    return;
  }

  if (pageKey === 'blog-post') {
    root.innerHTML = getCollectionPostMarkup(data, 'blog');
    return;
  }

  if (pageKey === 'reading-post') {
    root.innerHTML = getCollectionPostMarkup(data, 'reading');
    return;
  }

  const page = data.site.pages[pageKey] || data.site.pages.blog;
  const entries = data.collections[pageKey] || [];
  root.innerHTML = getIndexedMarkup(pageKey, page, entries, data.site);
}
