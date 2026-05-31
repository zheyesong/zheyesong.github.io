const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

function storedTheme() {
  try {
    return localStorage.getItem('theme') || 'light';
  } catch (_) {
    return 'light';
  }
}

export function setupTheme() {
  const html = document.documentElement;
  const button = document.getElementById('themeToggle');
  let theme = storedTheme();
  let viewTransitionLock = false;

  function commit(nextTheme) {
    theme = nextTheme;
    html.setAttribute('data-theme', theme);
    if (button) {
      button.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON;
      const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    }
    try {
      localStorage.setItem('theme', theme);
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('site-theme-change', { detail: { theme } }));
  }

  function fadeCommit(nextTheme) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commit(nextTheme);
      return;
    }
    document.body.style.transition = 'opacity .22s ease';
    document.body.style.opacity = '0.86';
    requestAnimationFrame(() => {
      commit(nextTheme);
      requestAnimationFrame(() => {
        document.body.style.opacity = '1';
      });
    });
    window.setTimeout(() => {
      document.body.style.transition = '';
      document.body.style.opacity = '';
    }, 260);
  }

  function circularCommit(nextTheme) {
    if (!button || viewTransitionLock) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof document.startViewTransition !== 'function') {
      fadeCommit(nextTheme);
      return;
    }

    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width * 0.5;
    const y = rect.top + rect.height * 0.5;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    let transition;
    viewTransitionLock = true;
    try {
      transition = document.startViewTransition(() => {
        commit(nextTheme);
      });
    } catch (_) {
      viewTransitionLock = false;
      fadeCommit(nextTheme);
      return;
    }

    transition.ready.then(() => {
      try {
        document.documentElement.animate(
          {
            clipPath: [
              'circle(0px at ' + x + 'px ' + y + 'px)',
              'circle(' + endRadius + 'px at ' + x + 'px ' + y + 'px)'
            ]
          },
          {
            duration: 860,
            easing: 'cubic-bezier(0.645,0.045,0.355,1)',
            pseudoElement: '::view-transition-new(root)'
          }
        );
      } catch (_) {}
    }).catch(() => {});

    transition.finished.finally(() => {
      viewTransitionLock = false;
    });
  }

  commit(theme);
  button?.addEventListener('click', () => circularCommit(theme === 'dark' ? 'light' : 'dark'));

  return {
    getTheme: () => theme
  };
}
