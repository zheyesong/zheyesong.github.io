import { escapeHtml, markdownToPlain } from './markdown.js';

const ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

function normalizeSearchText(text) {
  return markdownToPlain(text)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzySubsequenceScore(token, target) {
  let tokenIndex = 0;
  let streak = 0;
  let best = 0;
  for (let i = 0; i < target.length && tokenIndex < token.length; i++) {
    if (target[i] === token[tokenIndex]) {
      tokenIndex++;
      streak++;
      best = Math.max(best, streak);
    } else {
      streak = 0;
    }
  }
  return tokenIndex === token.length ? token.length + best * 0.5 : tokenIndex;
}

function scoreSearchItem(itemNorm, queryNorm, tokens) {
  let score = 0;
  for (const token of tokens) {
    const at = itemNorm.indexOf(token);
    if (at >= 0) {
      score += 120 - Math.min(90, at);
      continue;
    }
    const fuzzy = fuzzySubsequenceScore(token, itemNorm);
    if (fuzzy < Math.max(2, token.length * 0.62)) return 0;
    score += fuzzy * 8;
  }
  if (itemNorm.startsWith(queryNorm)) score += 40;
  return score;
}

function buildSearchIndex(data) {
  const out = [];
  const addItem = (page, href, title, text) => {
    const plain = markdownToPlain(text);
    const norm = normalizeSearchText(plain);
    if (!norm) return;
    out.push({ page, href, title, plain, norm });
  };

  const { profile, collections } = data;
  addItem('home', 'index.html', 'Home', [profile.name, profile.title, profile.interests].join(' '));
  Object.values(profile.previews).forEach(preview => {
    addItem('home', preview.href, 'Home - ' + preview.title, preview.text || '');
  });
  addItem('about', 'about.html', 'About', profile.about.intro || '');
  profile.about.sections.forEach(section => {
    addItem('about', 'about.html', 'About - ' + section.heading, [
      section.heading,
      section.paragraph || '',
      (section.list || []).join(' ')
    ].join(' '));
  });

  collections.blog.forEach(entry => {
    addItem('blog', entry.href, 'Blog - ' + entry.title, [
      entry.title,
      entry.status,
      entry.summary,
      entry.tags.join(' '),
      entry.plain
    ].join(' '));
  });
  collections.reading.forEach(entry => {
    addItem('reading', entry.href, 'Reading Notes - ' + entry.title, [
      entry.title,
      entry.sourceTitle,
      entry.authors.join(' '),
      entry.sourceType,
      entry.venue,
      entry.year,
      entry.url,
      entry.status,
      entry.summary,
      entry.tags.join(' '),
      entry.plain
    ].join(' '));
  });

  return out;
}

export function setupSearch(data, pageKey, options = {}) {
  const input = document.getElementById('siteSearch');
  const panel = document.getElementById('searchPanel');
  if (!input || !panel) return;

  const container = input.closest('.top-search');
  let toggle = document.getElementById('searchToggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.id = 'searchToggle';
    toggle.className = 'search-toggle';
    toggle.type = 'button';
    toggle.innerHTML = ICON_SEARCH;
    container?.insertBefore(toggle, input);
  }
  toggle.setAttribute('aria-label', 'Open site search');
  toggle.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', 'searchPanel');

  const index = buildSearchIndex(data);
  let results = [];
  let activeIndex = -1;

  function setMobileSearchOpen(open) {
    if (!container) return;
    container.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close site search' : 'Open site search');
    if (!open) {
      panel.hidden = true;
      activeIndex = -1;
    }
  }

  function focusActiveResult() {
    const items = Array.from(panel.querySelectorAll('.search-item'));
    items.forEach((item, index) => item.classList.toggle('is-active', index === activeIndex));
    if (activeIndex >= 0 && items[activeIndex]) {
      input.setAttribute('aria-activedescendant', items[activeIndex].id);
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function renderResults(items) {
    activeIndex = items.length ? 0 : -1;
    if (!items.length) {
      panel.innerHTML = '<p class="search-empty">No matching content</p>';
      panel.hidden = false;
      input.removeAttribute('aria-activedescendant');
      return;
    }

    panel.innerHTML = items.map((item, index) => {
      const snippet = escapeHtml(item.plain).slice(0, 120);
      return '<a id="search-result-' + index + '" class="search-item" href="' + escapeHtml(item.href) + '">' +
        '<span class="search-item-title">' + escapeHtml(item.title) + '</span>' +
        '<span class="search-item-text">' + snippet + '</span>' +
        '</a>';
    }).join('');
    panel.hidden = false;
    focusActiveResult();
  }

  function runSearch(query) {
    const norm = normalizeSearchText(query);
    if (!norm) {
      panel.hidden = true;
      panel.innerHTML = '';
      results = [];
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }

    const tokens = norm.split(' ').filter(Boolean);
    const scored = [];
    index.forEach(item => {
      const score = scoreSearchItem(item.norm, norm, tokens);
      if (score > 0) scored.push({ item, score: score + (item.page === pageKey ? 7 : 0) });
    });
    scored.sort((a, b) => b.score - a.score);
    results = scored.slice(0, 10).map(row => row.item);
    renderResults(results);
  }

  function activate({ focus = false } = {}) {
    setMobileSearchOpen(true);
    runSearch(input.value || '');
    if (focus) {
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    }
  }

  toggle.addEventListener('click', () => {
    const nextOpen = !container?.classList.contains('is-open');
    setMobileSearchOpen(nextOpen);
    if (nextOpen) {
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    }
  });

  input.addEventListener('input', event => runSearch(event.target.value || ''));
  input.addEventListener('focus', () => {
    setMobileSearchOpen(true);
    runSearch(input.value || '');
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      activeIndex = Math.min(results.length - 1, activeIndex + 1);
      focusActiveResult();
      return;
    }
    if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
      focusActiveResult();
      return;
    }
    if (event.key === 'Enter' && results.length) {
      event.preventDefault();
      const target = results[Math.max(0, activeIndex)] || results[0];
      window.location.href = target.href;
    }
    if (event.key === 'Escape') {
      if (input.value) {
        input.value = '';
        runSearch('');
      } else {
        setMobileSearchOpen(false);
        input.blur();
      }
    }
  });

  document.addEventListener('click', event => {
    if (container?.contains(event.target)) return;
    panel.hidden = true;
    if (!input.value) setMobileSearchOpen(false);
  });

  document.addEventListener('keydown', event => {
    const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || (document.activeElement && document.activeElement.isContentEditable);
    if (typing) return;
    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      setMobileSearchOpen(true);
      input.focus();
      input.select();
    }
  });

  if (options.activate) activate({ focus: options.focus });

  return { activate };
}
