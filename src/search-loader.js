const ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

export function setupSearchLoader(content, pageKey) {
  const input = document.getElementById('siteSearch');
  const panel = document.getElementById('searchPanel');
  if (!input || !panel) return;

  const container = input.closest('.top-search');
  const toggle = document.createElement('button');
  toggle.id = 'searchToggle';
  toggle.className = 'search-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Open site search');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = ICON_SEARCH;
  container?.insertBefore(toggle, input);
  input.setAttribute('aria-controls', 'searchPanel');

  let searchApiPromise = null;

  function detachBootstrapListeners() {
    toggle.removeEventListener('click', onToggleClick);
    input.removeEventListener('focus', onInputActivate);
    input.removeEventListener('input', onInputActivate);
    document.removeEventListener('keydown', onDocumentKeydown);
  }

  function loadSearch({ focus = false } = {}) {
    if (!searchApiPromise) {
      container?.classList.add('is-loading');
      searchApiPromise = import('./search.js')
        .then(module => {
          detachBootstrapListeners();
          return module.setupSearch(content, pageKey, { activate: true, focus });
        })
        .finally(() => {
          container?.classList.remove('is-loading');
        });
    } else {
      searchApiPromise.then(api => api?.activate?.({ focus }));
    }
    return searchApiPromise;
  }

  function onToggleClick(event) {
    event.preventDefault();
    loadSearch({ focus: true });
  }

  function onInputActivate() {
    loadSearch();
  }

  function onDocumentKeydown(event) {
    const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || (document.activeElement && document.activeElement.isContentEditable);
    if (typing) return;
    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      loadSearch({ focus: true });
    }
  }

  toggle.addEventListener('click', onToggleClick);
  input.addEventListener('focus', onInputActivate);
  input.addEventListener('input', onInputActivate);
  document.addEventListener('keydown', onDocumentKeydown);
}
