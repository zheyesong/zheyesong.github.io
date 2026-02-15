(() => {
    'use strict';

    let siteContent = null;
    const SESSION_CONTENT_KEY = 'zs_site_content_v1';
    const SESSION_TEMPLATE_KEY = 'zs_page_tpl_v1';

    const PAGE_FILE = {
        home: 'index.html',
        about: 'about.html',
        blog: 'blog.html',
        notebook: 'notebook.html'
    };

    const ICO_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    const ICO_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    const html = document.documentElement;
    const body = document.body;
    const tglBtn = document.getElementById('themeToggle');
    const searchInput = document.getElementById('siteSearch');
    const searchPanel = document.getElementById('searchPanel');
    const contentRoot = document.getElementById('contentRoot');
    const cvs = document.getElementById('bg');

    if (!body || !tglBtn || !contentRoot || !cvs) return;

    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    let pageKey = (body.dataset.page || 'home').toLowerCase();

    let theme = 'light';
    try { theme = localStorage.getItem('theme') || 'light'; } catch (_) {}

    let previewMap = null;
    let previewOrder = null;
    let previewNav = null;
    let previewBtns = [];
    let previewViewport = null;
    let previewCards = [];
    let previewIndex = 0;
    let activePreview = 'about';
    let previewTimer = 0;
    let viewTransitionLock = false;
    let rafId = 0;
    let searchIndex = [];
    let searchResults = [];

    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, reach = 1;

    const mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = mqRM.matches;
    mqRM.addEventListener('change', e => {
        reduced = e.matches;
        if (reduced) {
            stopFrame();
            drawStatic();
            return;
        }
        fullClear();
        scheduleFrame();
    });

    const mob = () => W < 600;
    let MAX_P, ORIG_MAX, spawn, origSpawn;
    let fpsCnt = 0, fpsT = 0, fps = 60;

    const ms = { x: -1e4, y: -1e4, on: false };
    window.addEventListener('mousemove', e => { ms.x = e.clientX; ms.y = e.clientY; ms.on = true; });
    window.addEventListener('mouseleave', () => { ms.on = false; });
    window.addEventListener('touchmove', e => {
        if (e.touches.length) {
            ms.x = e.touches[0].clientX;
            ms.y = e.touches[0].clientY;
            ms.on = true;
        }
    }, { passive: true });
    window.addEventListener('touchend', () => { ms.on = false; });

    const POOL = 3200;
    const P = new Array(POOL);
    for (let i = 0; i < POOL; i++) {
        P[i] = {
            x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
            cu: 0, age: 0, life: 0, d: 0,
            r: 0, g: 0, b: 0, cs: '',
            tract: 0, spark: 1, cortexHit: 0
        };
    }
    let n = 0;
    const SPEED_SCALE = 0.9;

    let cortexRadius = 1;
    let cortexRadius2 = 1;
    const TRACT_COUNT = 7;
    const tracts = new Array(TRACT_COUNT);
    const tractVectors = new Array(TRACT_COUNT);
    const blooms = [];
    const BLOOM_CAP = 120;

    let nextPulseAt = 0;
    let pulseActive = false;
    let pulseEndsAt = 0;
    let pulseRemaining = 0;
    let pulseEnergy = 1;
    let pulseTracts = [0];
    let nextDriftEmitAt = 0;

    function readStoredContent() {
        try {
            const raw = sessionStorage.getItem(SESSION_CONTENT_KEY);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return null;
    }

    function storeContent(data) {
        try { sessionStorage.setItem(SESSION_CONTENT_KEY, JSON.stringify(data)); } catch (_) {}
    }

    function readInlineFallbackContent() {
        const fallbackNode = document.getElementById('siteContentFallback');
        if (!fallbackNode || !fallbackNode.textContent.trim()) return null;
        try { return JSON.parse(fallbackNode.textContent); } catch (_) { return null; }
    }

    function loadContentViaXHR() {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', 'assets/content.json', true);
            xhr.responseType = 'text';
            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4) return;
                if (xhr.status === 200 || (location.protocol === 'file:' && xhr.status === 0)) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (err) {
                        reject(err);
                    }
                    return;
                }
                reject(new Error('XHR fallback failed'));
            };
            xhr.onerror = () => reject(new Error('XHR fallback failed'));
            xhr.send(null);
        });
    }

    async function loadSiteContent() {
        const cached = readStoredContent();
        if (cached) {
            fetch('assets/content.json', { cache: 'force-cache' })
                .then(res => (res.ok ? res.json() : null))
                .then(data => { if (data) storeContent(data); })
                .catch(() => {});
            return cached;
        }

        try {
            const res = await fetch('assets/content.json', { cache: 'force-cache' });
            if (!res.ok) throw new Error('Failed to load content.json');
            const data = await res.json();
            storeContent(data);
            return data;
        } catch (err) {
            try {
                const xhrData = await loadContentViaXHR();
                if (xhrData) {
                    storeContent(xhrData);
                    return xhrData;
                }
            } catch (_) {}
            const inline = readInlineFallbackContent();
            if (inline) {
                storeContent(inline);
                return inline;
            }
            throw err;
        }
    }

    function renderLoadError(error) {
        const msg = (error && error.message) ? error.message : 'Content load failed';
        if (pageKey === 'home') {
            contentRoot.innerHTML = [
                '<main class="card">',
                '    <h1 class="name">Zheye Song</h1>',
                '    <p class="title">Academic Portfolio</p>',
                '    <p class="interests">Unable to load page content. Please refresh or use a local web server.</p>',
                '    <nav class="links" aria-label="Fallback links">',
                '        <a href="index.html">Home</a><span class="sep" aria-hidden="true">|</span>',
                '        <a href="about.html">About</a><span class="sep" aria-hidden="true">|</span>',
                '        <a href="blog.html">Blog</a><span class="sep" aria-hidden="true">|</span>',
                '        <a href="notebook.html">Notebook</a>',
                '    </nav>',
                '    <p class="foot">' + escapeHtml(msg) + '</p>',
                '</main>'
            ].join('\n');
            return;
        }

        contentRoot.innerHTML = [
            '<main class="detail-card">',
            '    <article class="content">',
            '        <h1>Content Unavailable</h1>',
            '        <p>The page data could not be loaded. Please refresh or use a local web server.</p>',
            '        <p>Reason: ' + escapeHtml(msg) + '</p>',
            '        <p><a href="index.html">Back to home</a></p>',
            '    </article>',
            '</main>'
        ].join('\n');
    }

    function renderPage(key) {
        if (key === 'home') {
            renderHome(siteContent.home);
            return;
        }
        renderDetail(key, siteContent[key]);
    }

    function seedFromTemplateCache() {
        try {
            const raw = sessionStorage.getItem(SESSION_TEMPLATE_KEY);
            if (!raw) return;
            const map = JSON.parse(raw);
            if (map && map[pageKey]) contentRoot.innerHTML = map[pageKey];
        } catch (_) {}
    }

    function getHomeMarkup(data) {
        const linksHtml = data.quickLinks.map((link, index) => {
            const attrs = [];
            if (link.obfuscated) {
                attrs.push('href="#"');
                attrs.push('class="email-obf"');
                attrs.push('data-u="' + (link.userEnc || '') + '"');
                attrs.push('data-d="' + (link.domainEnc || '') + '"');
            } else {
                attrs.push('href="' + link.href + '"');
            }
            if (!link.obfuscated && link.external) {
                attrs.push('target="_blank"');
                attrs.push('rel="noopener noreferrer"');
            }
            const sep = index < data.quickLinks.length - 1
                ? '<span class="sep" aria-hidden="true">|</span>'
                : '';
            const hint = link.comment ? (link.comment + '\n                ') : '';
            return hint + '<a ' + attrs.join(' ') + '>' + link.label + '</a>' + sep;
        }).join('\n                ');

        const btnHtml = data.buttons.map(btn => (
            '<a class="page-btn" href="' + btn.href + '" data-preview="' + btn.key + '">' + btn.label + '</a>'
        )).join('\n                ');

        const firstPreview = data.previews.about;
        const firstLink = firstPreview.showLink
            ? '<a class="preview-link" href="' + firstPreview.href + '">See more details</a>'
            : '<a class="preview-link" href="#" hidden>See more details</a>';

        return [
            '<main class="card">',
            '    <h1 class="name">' + data.name + '</h1>',
            '    <p class="title">' + data.title + '</p>',
            '    <p class="interests">' + data.interests + '</p>',
            '    <nav class="links" aria-label="Quick links">',
            '        ' + linksHtml,
            '    </nav>',
            '    <div class="page-nav" aria-label="Site sections">',
            '        ' + btnHtml,
            '    </div>',
            '    <div id="previewViewport" class="preview-list" aria-live="polite">',
            '        <section id="previewCardA" class="preview-card">',
            '            <h2 class="preview-title">' + firstPreview.title + '</h2>',
            '            <p><span class="preview-text">' + firstPreview.text + '</span>' + firstLink + '</p>',
            '        </section>',
            '        <section id="previewCardB" class="preview-card" aria-hidden="true">',
            '            <h2 class="preview-title"></h2>',
            '            <p><span class="preview-text"></span><a class="preview-link" href="#" hidden>See more details</a></p>',
            '        </section>',
            '    </div>',
            '    <p class="foot">' + data.lastUpdated + '</p>',
            '</main>'
        ].join('\n');
    }

    function renderHome(data) {
        contentRoot.innerHTML = getHomeMarkup(data);
        setupObfuscatedEmail();
    }

    function getDetailMarkup(key, data) {
        const navItems = [
            { key: 'home', label: 'Home', href: 'index.html' },
            { key: 'about', label: 'About', href: 'about.html' },
            { key: 'blog', label: 'Blog', href: 'blog.html' },
            { key: 'notebook', label: 'Notebook', href: 'notebook.html' }
        ];

        const navHtml = navItems.map(item => {
            const active = item.key === key ? ' class="active"' : '';
            return '<a' + active + ' href="' + item.href + '">' + item.label + '</a>';
        }).join('\n                ');

        let articleHtml = '';
        if (key === 'about') {
            articleHtml = buildAboutArticle(data);
        } else {
            articleHtml = buildIndexedArticle(data);
        }

        return [
            '<main class="detail-card">',
            '    <nav class="site-nav" aria-label="Main pages">',
            '        ' + navHtml,
            '    </nav>',
            '    <article class="content">',
            articleHtml,
            '    </article>',
            '</main>'
        ].join('\n');
    }

    function renderDetail(key, data) {
        contentRoot.innerHTML = getDetailMarkup(key, data);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sanitizeHref(href) {
        const v = String(href || '').trim();
        if (!v) return '#';
        if (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(v)) return v;
        return '#';
    }

    function renderMarkdownInline(text) {
        let htmlTxt = escapeHtml(text);
        htmlTxt = htmlTxt.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
            return '<a href="' + sanitizeHref(href) + '">' + escapeHtml(label) + '</a>';
        });
        htmlTxt = htmlTxt.replace(/`([^`]+)`/g, '<code>$1</code>');
        htmlTxt = htmlTxt.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        htmlTxt = htmlTxt.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        htmlTxt = htmlTxt.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        htmlTxt = htmlTxt.replace(/_([^_]+)_/g, '<em>$1</em>');
        return htmlTxt;
    }

    function renderMarkdown(markdown) {
        const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
        const out = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();
            if (!trimmed) {
                i++;
                continue;
            }

            if (/^```/.test(trimmed)) {
                const code = [];
                i++;
                while (i < lines.length && !/^```/.test(lines[i].trim())) {
                    code.push(lines[i]);
                    i++;
                }
                if (i < lines.length) i++;
                out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
                continue;
            }

            if (/^###\s+/.test(trimmed)) {
                out.push('<h3>' + renderMarkdownInline(trimmed.replace(/^###\s+/, '')) + '</h3>');
                i++;
                continue;
            }
            if (/^##\s+/.test(trimmed)) {
                out.push('<h2>' + renderMarkdownInline(trimmed.replace(/^##\s+/, '')) + '</h2>');
                i++;
                continue;
            }
            if (/^#\s+/.test(trimmed)) {
                out.push('<h1>' + renderMarkdownInline(trimmed.replace(/^#\s+/, '')) + '</h1>');
                i++;
                continue;
            }

            if (/^[-*]\s+/.test(trimmed)) {
                const items = [];
                while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
                    items.push('<li>' + renderMarkdownInline(lines[i].trim().replace(/^[-*]\s+/, '')) + '</li>');
                    i++;
                }
                out.push('<ul>' + items.join('') + '</ul>');
                continue;
            }

            if (/^\d+\.\s+/.test(trimmed)) {
                const items = [];
                while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
                    items.push('<li>' + renderMarkdownInline(lines[i].trim().replace(/^\d+\.\s+/, '')) + '</li>');
                    i++;
                }
                out.push('<ol>' + items.join('') + '</ol>');
                continue;
            }

            const para = [];
            while (i < lines.length && lines[i].trim() && !/^([#]|[-*]\s+|\d+\.\s+|```)/.test(lines[i].trim())) {
                para.push(lines[i].trim());
                i++;
            }
            out.push('<p>' + renderMarkdownInline(para.join(' ')) + '</p>');
        }

        return out.join('\n');
    }

    function markdownToPlain(markdown) {
        return String(markdown || '')
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 $2')
            .replace(/[*_>#~`-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function buildAboutArticle(data) {
        const chunks = [];
        chunks.push('<h1>' + data.title + '</h1>');
        chunks.push('<p>' + data.intro + '</p>');

        data.sections.forEach(section => {
            chunks.push('<h2>' + section.heading + '</h2>');
            if (section.list) {
                chunks.push('<ul>');
                section.list.forEach(item => chunks.push('<li>' + item + '</li>'));
                chunks.push('</ul>');
            }
            if (section.paragraph) {
                chunks.push('<p>' + section.paragraph + '</p>');
            }
        });

        chunks.push('<p><a href="' + data.back.href + '">' + data.back.label + '</a></p>');
        return chunks.join('\n                ');
    }

    function buildIndexedArticle(data) {
        const chunks = [];
        chunks.push('<h1>' + data.title + '</h1>');
        if (data.introMarkdown) {
            chunks.push(renderMarkdown(data.introMarkdown));
        } else {
            chunks.push('<p>' + data.intro + '</p>');
        }

        chunks.push('<section class="toc" aria-label="' + data.directoryLabel + '">');
        chunks.push('<h2>' + data.directoryTitle + '</h2>');
        chunks.push('<ol>');
        data.toc.forEach(item => {
            chunks.push('<li><a href="' + item.href + '">' + item.text + '</a></li>');
        });
        chunks.push('</ol>');
        chunks.push('</section>');

        data.entries.forEach(entry => {
            chunks.push('<section id="' + entry.id + '" class="entry">');
            chunks.push('<h3>' + entry.title + '</h3>');
            chunks.push('<p class="meta">' + entry.meta + '</p>');
            if (entry.markdown) {
                chunks.push(renderMarkdown(entry.markdown));
            } else {
                chunks.push('<p>' + entry.text + '</p>');
            }
            chunks.push('</section>');
        });

        chunks.push('<p><a href="' + data.back.href + '">' + data.back.label + '</a></p>');
        return chunks.join('\n                ');
    }

    function fillPreviewCard(card, item) {
        card.dataset.preview = item.key;
        const title = card.querySelector('.preview-title');
        const text = card.querySelector('.preview-text');
        const link = card.querySelector('.preview-link');
        title.textContent = item.title;
        text.textContent = item.text;
        if (item.showLink) {
            link.hidden = false;
            link.setAttribute('href', item.href);
            link.textContent = 'See more details';
        } else {
            link.hidden = true;
            link.removeAttribute('href');
        }
    }

    function cardHeight(card) {
        return Math.ceil(card.scrollHeight);
    }

    function resetPreviewCards() {
        const current = previewCards[previewIndex];
        const other = previewCards[1 - previewIndex];
        current.style.transition = 'none';
        current.style.opacity = '1';
        current.style.transform = 'translateX(0)';
        current.style.pointerEvents = 'auto';
        other.style.transition = 'none';
        other.style.opacity = '0';
        other.style.transform = 'translateX(0)';
        other.style.pointerEvents = 'none';
    }

    function setPreview(key, immediate) {
        if (!previewMap || !previewViewport || previewCards.length !== 2) return;

        const nextKey = previewMap[key] ? key : 'about';
        if (!immediate && nextKey === activePreview) return;

        previewBtns.forEach(btn => btn.classList.toggle('is-preview', btn.dataset.preview === nextKey));

        if (previewTimer) {
            clearTimeout(previewTimer);
            previewTimer = 0;
            resetPreviewCards();
        }

        if (immediate) {
            const card = previewCards[previewIndex];
            fillPreviewCard(card, previewMap[nextKey]);
            resetPreviewCards();
            previewViewport.style.height = cardHeight(card) + 'px';
            activePreview = nextKey;
            return;
        }

        const outCard = previewCards[previewIndex];
        const inCard = previewCards[1 - previewIndex];
        const forward = previewOrder.indexOf(nextKey) >= previewOrder.indexOf(activePreview);

        fillPreviewCard(inCard, previewMap[nextKey]);
        inCard.style.transition = 'none';
        inCard.style.opacity = '0';
        inCard.style.transform = 'translateX(' + (forward ? '26px' : '-26px') + ')';
        inCard.style.pointerEvents = 'none';
        outCard.style.transition = 'transform .34s ease, opacity .34s ease';
        inCard.style.transition = 'transform .34s ease, opacity .34s ease';

        previewViewport.style.height = cardHeight(outCard) + 'px';
        void inCard.offsetHeight;

        requestAnimationFrame(() => {
            inCard.style.opacity = '1';
            inCard.style.transform = 'translateX(0)';
            outCard.style.opacity = '0';
            outCard.style.transform = 'translateX(' + (forward ? '-26px' : '26px') + ')';
            previewViewport.style.height = cardHeight(inCard) + 'px';
        });

        previewTimer = window.setTimeout(() => {
            previewIndex = 1 - previewIndex;
            activePreview = nextKey;
            resetPreviewCards();
            previewViewport.style.height = cardHeight(previewCards[previewIndex]) + 'px';
            previewTimer = 0;
        }, 360);
    }

    function setupHomePreview(homeData) {
        previewMap = homeData.previews;
        previewOrder = homeData.previewOrder;
        previewNav = document.querySelector('.page-nav');
        previewBtns = Array.from(document.querySelectorAll('.page-btn[data-preview]'));
        previewViewport = document.getElementById('previewViewport');
        previewCards = [document.getElementById('previewCardA'), document.getElementById('previewCardB')];

        if (!previewNav || !previewViewport || previewCards.some(card => !card)) return;

        setPreview('about', true);

        previewBtns.forEach(btn => {
            const key = btn.dataset.preview || 'about';
            btn.addEventListener('mouseenter', () => setPreview(key));
            btn.addEventListener('focus', () => setPreview(key));
        });

        previewNav.addEventListener('mouseleave', () => setPreview('about'));
        previewNav.addEventListener('focusout', e => {
            if (!previewNav.contains(e.relatedTarget)) setPreview('about');
        });
    }

    function decodeEmailSegment(seg) {
        try { return atob(seg || ''); } catch (_) { return ''; }
    }

    function setupObfuscatedEmail() {
        const links = Array.from(document.querySelectorAll('a.email-obf[data-u][data-d]'));
        links.forEach(link => {
            const defaultLabel = link.textContent || 'Email Me';
            const reveal = () => {
                const user = decodeEmailSegment(link.dataset.u);
                const domain = decodeEmailSegment(link.dataset.d);
                if (!user || !domain) return;
                const email = user + '@' + domain;
                link.setAttribute('href', 'mailto:' + email);
                link.textContent = email;
            };
            const conceal = () => {
                link.removeAttribute('href');
                link.textContent = defaultLabel;
            };
            link.addEventListener('mouseenter', reveal);
            link.addEventListener('focus', reveal);
            link.addEventListener('mouseleave', conceal);
            link.addEventListener('blur', conceal);
            link.addEventListener('click', e => {
                reveal();
                if (!link.getAttribute('href')) e.preventDefault();
            });
        });
    }

    function normalizeSearchText(text) {
        return markdownToPlain(text)
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fff\s]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function fuzzySubsequenceScore(token, target) {
        let ti = 0;
        let streak = 0;
        let best = 0;
        for (let i = 0; i < target.length && ti < token.length; i++) {
            if (target[i] === token[ti]) {
                ti++;
                streak++;
                if (streak > best) best = streak;
            } else {
                streak = 0;
            }
        }
        return ti === token.length ? token.length + best * 0.5 : ti;
    }

    function scoreSearchItem(itemNorm, queryNorm, tokens) {
        let score = 0;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
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

    function buildSearchIndex() {
        const out = [];
        const addItem = (page, href, title, text) => {
            const plain = markdownToPlain(text);
            const norm = normalizeSearchText(plain);
            if (!norm) return;
            out.push({ page: page, href: href, title: title, plain: plain, norm: norm });
        };

        const home = siteContent.home;
        addItem('home', 'index.html', 'Home', [home.name, home.title, home.interests].join(' '));
        Object.keys(home.previews).forEach(k => {
            const p = home.previews[k];
            addItem('home', p.href, 'Home · ' + p.title, p.text || '');
        });

        const about = siteContent.about;
        addItem('about', 'about.html', 'About', about.intro || '');
        (about.sections || []).forEach(section => {
            addItem('about', 'about.html', 'About · ' + (section.heading || 'Section'), [section.heading || '', section.paragraph || '', (section.list || []).join(' ')].join(' '));
        });

        const appendIndexed = (key, data, file) => {
            addItem(key, file, data.title || key, data.introMarkdown || data.intro || '');
            (data.entries || []).forEach(entry => {
                const body = entry.markdown || entry.text || '';
                addItem(key, file + '#' + entry.id, data.title + ' · ' + entry.title, entry.title + ' ' + entry.meta + ' ' + body);
            });
        };
        appendIndexed('blog', siteContent.blog, 'blog.html');
        appendIndexed('notebook', siteContent.notebook, 'notebook.html');

        searchIndex = out;
    }

    function renderSearchResults(results) {
        if (!searchPanel) return;
        if (!results.length) {
            searchPanel.innerHTML = '<p class="search-empty">No matching content</p>';
            searchPanel.hidden = false;
            return;
        }

        const htmlRows = results.map(item => {
            const snippet = escapeHtml(item.plain).slice(0, 110);
            return '<a class="search-item" href="' + item.href + '">' +
                '<span class="search-item-title">' + escapeHtml(item.title) + '</span>' +
                '<span class="search-item-text">' + snippet + '</span>' +
                '</a>';
        });
        searchPanel.innerHTML = htmlRows.join('');
        searchPanel.hidden = false;
    }

    function runSearch(query) {
        if (!searchPanel) return;
        const norm = normalizeSearchText(query);
        if (!norm) {
            searchPanel.hidden = true;
            searchPanel.innerHTML = '';
            searchResults = [];
            return;
        }
        const tokens = norm.split(' ').filter(Boolean);
        const scored = [];
        for (let i = 0; i < searchIndex.length; i++) {
            const item = searchIndex[i];
            const score = scoreSearchItem(item.norm, norm, tokens);
            if (score <= 0) continue;
            scored.push({ item: item, score: score + (item.page === pageKey ? 7 : 0) });
        }
        scored.sort((a, b) => b.score - a.score);
        searchResults = scored.slice(0, 10).map(x => x.item);
        renderSearchResults(searchResults);
    }

    function setupSearch() {
        if (!searchInput || !searchPanel) return;
        buildSearchIndex();
        searchPanel.hidden = true;
        searchInput.addEventListener('input', e => runSearch(e.target.value || ''));
        searchInput.addEventListener('focus', () => runSearch(searchInput.value || ''));
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && searchResults.length) {
                window.location.href = searchResults[0].href;
            }
            if (e.key === 'Escape') {
                searchPanel.hidden = true;
            }
        });
        document.addEventListener('click', e => {
            if (!searchPanel) return;
            if (searchPanel.contains(e.target) || searchInput.contains(e.target)) return;
            searchPanel.hidden = true;
        });
        document.addEventListener('keydown', e => {
            const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
            const typing = tag === 'input' || tag === 'textarea' || (document.activeElement && document.activeElement.isContentEditable);
            if (typing) return;
            if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
            }
        });
    }

    function scheduleFrame() {
        if (rafId || reduced) return;
        rafId = requestAnimationFrame(frame);
    }

    function stopFrame() {
        if (!rafId) return;
        cancelAnimationFrame(rafId);
        rafId = 0;
    }

    function commitTheme(t, doClear) {
        theme = t;
        html.setAttribute('data-theme', t);
        tglBtn.innerHTML = t === 'dark' ? ICO_SUN : ICO_MOON;
        try { localStorage.setItem('theme', t); } catch (_) {}
        if (doClear && W) {
            fullClear();
            if (reduced) drawStatic();
        }
    }

    function fadeTheme(t, doClear) {
        document.body.style.transition = 'opacity .26s ease';
        document.body.style.opacity = '0.84';
        requestAnimationFrame(() => {
            commitTheme(t, doClear);
            requestAnimationFrame(() => { document.body.style.opacity = '1'; });
        });
        window.setTimeout(() => {
            document.body.style.transition = '';
            document.body.style.opacity = '';
        }, 300);
    }

    function runCircularThemeTransition(t, doClear) {
        if (viewTransitionLock) return;
        if (!doClear) {
            commitTheme(t, doClear);
            return;
        }
        if (reduced) {
            commitTheme(t, doClear);
            return;
        }
        if (typeof document.startViewTransition !== 'function') {
            fadeTheme(t, doClear);
            return;
        }

        const rect = tglBtn.getBoundingClientRect();
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
                commitTheme(t, doClear);
            });
        } catch (_) {
            viewTransitionLock = false;
            fadeTheme(t, doClear);
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
                        easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
                        pseudoElement: '::view-transition-new(root)'
                    }
                );
            } catch (_) {}
        }).catch(() => {});

        transition.finished.finally(() => {
            viewTransitionLock = false;
        });
    }

    function applyTheme(t, doClear) {
        runCircularThemeTransition(t, doClear);
    }

    function sizeCanvas() {
        dpr = window.devicePixelRatio || 1;
        W = window.innerWidth;
        H = window.innerHeight;
        cvs.width = W * dpr;
        cvs.height = H * dpr;
        cvs.style.width = W + 'px';
        cvs.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx = W * 0.5;
        cy = H * 0.5;
        reach = Math.hypot(W, H) * 0.62;
        cortexRadius = reach * 0.78;
        cortexRadius2 = cortexRadius * cortexRadius;
    }

    function fullClear() {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = theme === 'dark' ? '#050505' : '#F7F3E8';
        ctx.fillRect(0, 0, W, H);
    }

    function drawStatic() {
        fullClear();
        const r = Math.max(W, H) * 0.45;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        if (theme === 'dark') {
            g.addColorStop(0, 'rgba(0,255,65,0.108)');
            g.addColorStop(1, 'rgba(5,5,5,0)');
        } else {
            g.addColorStop(0, 'rgba(255,180,0,0.132)');
            g.addColorStop(1, 'rgba(247,243,232,0)');
        }
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    function initTracts() {
        const anchor = Math.random() * 6.2832;
        for (let i = 0; i < TRACT_COUNT; i++) {
            tracts[i] = {
                base: anchor + (i / TRACT_COUNT) * 6.2832 + (Math.random() - 0.5) * 0.26,
                phase: Math.random() * 6.2832,
                swing: 0.08 + Math.random() * 0.14,
                drift: 0.00007 + Math.random() * 0.00009,
                curl: (Math.random() - 0.5) * 0.12
            };
            tractVectors[i] = { x: 1, y: 0, curl: 0 };
        }
    }

    function updateTractVectors(now) {
        for (let i = 0; i < TRACT_COUNT; i++) {
            const t = tracts[i];
            const drift = Math.sin(now * t.drift + t.phase) * t.swing
                + Math.sin(now * (t.drift * 0.51) + t.phase * 1.37) * t.swing * 0.4;
            const angle = t.base + drift;
            const v = tractVectors[i];
            v.x = Math.cos(angle);
            v.y = Math.sin(angle);
            v.curl = t.curl + Math.sin(now * (t.drift * 0.93) + t.phase) * 0.03;
        }
    }

    function scheduleNextPulse(now) {
        const base = 2000 + Math.random() * 4000;
        const jitter = (Math.random() - 0.5) * 420;
        nextPulseAt = now + Math.max(1900, base + jitter);
    }

    function pickPulseTracts(major) {
        const picked = [];
        const target = Math.min(4, 2 + ((Math.random() * 3) | 0) + (major ? 1 : 0));
        while (picked.length < target) {
            const idx = (Math.random() * TRACT_COUNT) | 0;
            if (!picked.includes(idx)) picked.push(idx);
        }
        return picked;
    }

    function beginPulse(now) {
        const major = Math.random() < 0.24;
        pulseEnergy = major ? 1.35 + Math.random() * 0.45 : 0.9 + Math.random() * 0.34;
        pulseTracts = pickPulseTracts(major);

        const capacity = Math.max(0, MAX_P - n);
        if (capacity < 8) {
            pulseActive = false;
            scheduleNextPulse(now);
            return;
        }

        const rawCount = major
            ? ((mob() ? 120 : 260) + ((Math.random() * (mob() ? 160 : 300)) | 0))
            : ((mob() ? 54 : 96) + ((Math.random() * (mob() ? 72 : 150)) | 0));
        const scale = 0.7 + spawn * 0.06;
        pulseRemaining = Math.min(capacity, Math.max(12, (rawCount * scale) | 0));
        pulseEndsAt = now + 110 + Math.random() * 90;
        pulseActive = true;
        scheduleNextPulse(now);
    }

    function emitPulseWave(now) {
        if (!pulseActive || pulseRemaining <= 0) return;
        const capacity = MAX_P - n;
        if (capacity <= 0) {
            pulseActive = false;
            return;
        }
        const msLeft = Math.max(1, pulseEndsAt - now);
        const framesLeft = Math.max(1, Math.ceil(msLeft / 16));
        let quota = Math.ceil(pulseRemaining / framesLeft);
        quota = Math.max(1, Math.min(quota, pulseRemaining, capacity));

        for (let i = 0; i < quota; i++) {
            const tractId = pulseTracts[(Math.random() * pulseTracts.length) | 0];
            emit(tractId, pulseEnergy, true);
        }

        pulseRemaining -= quota;
        if (pulseRemaining <= 0 || now >= pulseEndsAt) pulseActive = false;
    }

    function emitDrift(now) {
        if (pulseActive || now < nextDriftEmitAt) return;
        if (n >= POOL || n >= MAX_P) return;
        emit((Math.random() * TRACT_COUNT) | 0, 0.58 + Math.random() * 0.18, false);
        nextDriftEmitAt = now + 320 + Math.random() * 760;
    }

    function addBloom(x, y, depth, now) {
        if (blooms.length >= BLOOM_CAP) blooms.shift();
        blooms.push({
            x: x,
            y: y,
            born: now,
            life: 220 + Math.random() * 280,
            radius: (30 + Math.random() * 50) * (0.82 + depth * 0.4),
            alpha: 0.18 + depth * 0.26
        });
    }

    function drawBlooms(now, dark) {
        if (!blooms.length) return;
        ctx.globalCompositeOperation = dark ? 'screen' : 'lighter';
        for (let i = blooms.length - 1; i >= 0; i--) {
            const b = blooms[i];
            const t = (now - b.born) / b.life;
            if (t >= 1) {
                blooms.splice(i, 1);
                continue;
            }
            const k = 1 - t;
            const radius = b.radius * (1 + (1 - k) * 0.28);
            const alpha = b.alpha * k * k;
            const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, radius);
            if (dark) {
                grad.addColorStop(0, 'rgba(250,255,240,' + (alpha * 0.95) + ')');
                grad.addColorStop(0.35, 'rgba(0,255,120,' + (alpha * 0.78) + ')');
                grad.addColorStop(1, 'rgba(0,255,120,0)');
            } else {
                grad.addColorStop(0, 'rgba(255,255,245,' + (alpha * 0.96) + ')');
                grad.addColorStop(0.35, 'rgba(255,186,32,' + (alpha * 0.8) + ')');
                grad.addColorStop(1, 'rgba(255,186,32,0)');
            }
            ctx.fillStyle = grad;
            ctx.fillRect(b.x - radius, b.y - radius, radius * 2, radius * 2);
        }
    }

    function calcLimits() {
        if (mob()) {
            MAX_P = 800;
            spawn = 5;
        } else {
            MAX_P = Math.min(2500, Math.max(1200, (W * H / 820) | 0));
            spawn = Math.min(12, Math.max(6, (MAX_P / 180) | 0));
        }
        ORIG_MAX = MAX_P;
        origSpawn = spawn;
    }

    function tickFps(now) {
        fpsCnt++;
        if (now - fpsT >= 1000) {
            fps = fpsCnt;
            fpsCnt = 0;
            fpsT = now;
            if (fps < 28) {
                spawn = Math.max(1, spawn - 2);
                MAX_P = Math.max(200, MAX_P - 150);
            } else if (fps > 50 && MAX_P < ORIG_MAX) {
                spawn = Math.min(origSpawn, spawn + 1);
                MAX_P = Math.min(ORIG_MAX, MAX_P + 80);
            }
        }
    }

    function paintColor(p) {
        const t = Math.random();
        if (theme === 'dark') {
            if (t < 0.74) {
                const s = t / 0.74;
                p.r = 0;
                p.g = (255 - s * 112) | 0;
                p.b = (65 - s * 48) | 0;
            } else {
                const s = (t - 0.74) / 0.26;
                p.r = 0;
                p.g = (215 + s * 40) | 0;
                p.b = (110 + s * 130) | 0;
            }
        } else {
            if (t < 0.55) {
                const s = t / 0.55;
                p.r = 255;
                p.g = (204 - s * 64) | 0;
                p.b = 0;
            } else if (t < 0.85) {
                const s = (t - 0.55) / 0.30;
                p.r = 255;
                p.g = (140 - s * 71) | 0;
                p.b = 0;
            } else {
                const s = (t - 0.85) / 0.15;
                p.r = 255;
                p.g = (69 - s * 26) | 0;
                p.b = (s * 18) | 0;
            }
        }
        p.cs = 'rgb(' + p.r + ',' + p.g + ',' + p.b + ')';
    }

    function emit(tractId, energy, pulseEmit) {
        if (n >= POOL || n >= MAX_P) return;
        const p = P[n];
        const tract = tractVectors[tractId] || { x: Math.cos(Math.random() * 6.2832), y: Math.sin(Math.random() * 6.2832), curl: 0 };
        const spread = pulseEmit ? (Math.random() - 0.5) * 0.2 : (Math.random() - 0.5) * 0.9;
        const ang = Math.atan2(tract.y, tract.x) + spread;
        const dep = Math.random();
        const burst = energy || 1;
        const spd = (0.92 + dep * 1.2 + Math.random() * 2.1) * burst;
        let cu = tract.curl + (Math.random() - 0.5) * 0.06;
        if (Math.abs(cu) < 0.012) cu = cu >= 0 ? 0.013 : -0.013;

        p.x = cx;
        p.y = cy;
        p.px = cx;
        p.py = cy;
        p.vx = Math.cos(ang) * spd;
        p.vy = Math.sin(ang) * spd;
        p.cu = cu;
        p.age = 0;
        p.life = pulseEmit ? (200 + (Math.random() * 300) | 0) : (170 + (Math.random() * 230) | 0);
        p.d = dep;
        p.tract = tractId;
        p.spark = Math.min(1.8, burst * (pulseEmit ? (1.02 + Math.random() * 0.3) : 0.7));
        p.cortexHit = 0;
        paintColor(p);
        n++;
    }

    const FRIC = 0.996;
    const OUTF = 0.018;
    const SWIRL = 0.022;
    const MR = 120;
    const MR2 = MR * MR;
    const MSTR = 0.1;

    ctx.lineCap = 'round';

    function frame(now) {
        rafId = 0;
        if (reduced) return;
        tickFps(now);

        const dark = theme === 'dark';
        const isMob = mob();

        updateTractVectors(now);

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = dark ? 'rgba(5,5,5,0.072)' : 'rgba(247,243,232,0.078)';
        ctx.fillRect(0, 0, W, H);

        if (!pulseActive && now >= nextPulseAt) beginPulse(now);
        emitPulseWave(now);
        emitDrift(now);

        ctx.globalCompositeOperation = dark ? 'screen' : 'source-over';

        const mOn = ms.on;
        const mx = ms.x;
        const my = ms.y;

        for (let i = 0; i < n;) {
            const p = P[i];

            p.age++;
            if (p.age >= p.life) {
                n--;
                P[i] = P[n];
                P[n] = p;
                continue;
            }

            const prog = p.age / p.life;
            const co = Math.cos(p.cu);
            const si = Math.sin(p.cu);
            const nvx = p.vx * co - p.vy * si;
            const nvy = p.vx * si + p.vy * co;
            const ageRatio = prog;
            const drag = FRIC - ageRatio * 0.0046;
            p.vx = nvx * drag;
            p.vy = nvy * drag;

            const tract = tractVectors[p.tract] || tractVectors[0];
            const guidePhase = Math.max(0, 1 - prog / (0.39 + p.d * 0.09));
            if (guidePhase > 0) {
                const gForce = (0.058 + p.spark * 0.012) * guidePhase;
                p.vx += tract.x * gForce;
                p.vy += tract.y * gForce;
                const vm = Math.hypot(p.vx, p.vy) || 1;
                const align = 0.16 * guidePhase;
                p.vx = p.vx * (1 - align) + tract.x * vm * align;
                p.vy = p.vy * (1 - align) + tract.y * vm * align;
            } else {
                const disper = (prog - 0.32) * 0.046 * (0.88 + (1 - p.d));
                p.vx += (Math.random() - 0.5) * disper;
                p.vy += (Math.random() - 0.5) * disper;
            }

            p.cu += (Math.random() - 0.5) * (0.0036 + (1 - p.d) * 0.0024) * (guidePhase > 0 ? 0.72 : 1.85);
            p.cu *= 0.9996;

            const ox = p.x - cx;
            const oy = p.y - cy;
            const r2 = ox * ox + oy * oy;
            if (r2 > 0.3) {
                const r = Math.sqrt(r2);
                const invR = 1 / r;
                const rn = Math.min(1, r / reach);
                const of = OUTF * (1 - rn * 0.55) * (0.62 + p.d * 0.88);
                p.vx += ox * invR * of;
                p.vy += oy * invR * of;
                const sf = SWIRL * (p.cu >= 0 ? 1 : -1) * (0.28 + (1 - rn) * 0.72);
                p.vx += -oy * invR * sf;
                p.vy += ox * invR * sf;
            }

            if (mOn) {
                const dx = p.x - mx;
                const dy = p.y - my;
                const d2 = dx * dx + dy * dy;
                if (d2 < MR2 && d2 > 1) {
                    const d = Math.sqrt(d2);
                    const f = (MR - d) / MR * MSTR;
                    p.vx += dx / d * f;
                    p.vy += dy / d * f;
                }
            }

            p.px = p.x;
            p.py = p.y;
            p.x += p.vx * SPEED_SCALE;
            p.y += p.vy * SPEED_SCALE;

            if (p.x < -120 || p.x > W + 120 || p.y < -120 || p.y > H + 120) {
                i++;
                continue;
            }

            const nx = p.x - cx;
            const ny = p.y - cy;
            const nr2 = nx * nx + ny * ny;
            const nr = Math.sqrt(nr2);
            const rn = Math.min(1, nr / reach);

            if (!p.cortexHit && nr2 >= cortexRadius2) {
                p.cortexHit = 1;
                if (Math.random() < (0.28 + p.d * 0.22)) addBloom(p.x, p.y, p.d, now);
            }

            let al = (1 - prog);
            al *= dark ? (0.102 + 0.45 * p.d) : (0.11 + 0.57 * p.d);
            if (prog < 0.09) al *= 1.35 - prog * 2.8;
            al *= 0.76 + Math.min(1.2, p.spark) * 0.26;
            if (al > 0.9) al = 0.9;
            if (al < 0.003) {
                i++;
                continue;
            }

            let lw = (dark ? 0.32 : 0.24) + p.d * (isMob ? 1.45 : dark ? 1.02 : 0.86);
            if (prog < 0.18) lw += (0.22 * (1 - prog / 0.18)) * p.spark;

            const hotG = dark ? 252 : 242;
            const hotB = dark ? 224 : 188;
            const cool = Math.min(1, prog * 1.3 + rn * 0.95);
            const sr = (255 + (p.r - 255) * cool) | 0;
            const sg = (hotG + (p.g - hotG) * cool) | 0;
            const sb = (hotB + (p.b - hotB) * cool) | 0;

            ctx.globalAlpha = al;
            ctx.lineWidth = lw;
            ctx.strokeStyle = 'rgb(' + sr + ',' + sg + ',' + sb + ')';
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();

            i++;
        }

        drawBlooms(now, dark);

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = dark ? 'screen' : 'source-over';
        const gr = isMob ? 32 : 48;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
        if (dark) {
            grd.addColorStop(0, 'rgba(0,255,65,0.05)');
            grd.addColorStop(1, 'rgba(0,255,65,0)');
        } else {
            grd.addColorStop(0, 'rgba(255,170,0,0.035)');
            grd.addColorStop(1, 'rgba(255,170,0,0)');
        }
        ctx.fillStyle = grd;
        ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        scheduleFrame();
    }

    function warmTemplateCache() {
        try {
            const map = {
                home: getHomeMarkup(siteContent.home),
                about: getDetailMarkup('about', siteContent.about),
                blog: getDetailMarkup('blog', siteContent.blog),
                notebook: getDetailMarkup('notebook', siteContent.notebook)
            };
            sessionStorage.setItem(SESSION_TEMPLATE_KEY, JSON.stringify(map));
        } catch (_) {}
    }

    function prefetchPages() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn && conn.saveData) return;
        const current = PAGE_FILE[pageKey] || 'index.html';
        const docs = [];
        Object.keys(PAGE_FILE).forEach(key => {
            const href = PAGE_FILE[key];
            if (href === current) return;
            docs.push(href);
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = href;
            document.head.appendChild(link);
        });

        const staticAssets = ['assets/content.json', 'assets/styles.css', 'assets/app.js'];
        staticAssets.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
        });

        const warmTargets = docs.concat(staticAssets);
        const warm = () => {
            warmTargets.forEach(url => {
                fetch(url, { credentials: 'same-origin', cache: 'force-cache' }).catch(() => {});
            });
        };
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(warm, { timeout: 1200 });
        } else {
            setTimeout(warm, 120);
        }
    }

    function boot() {
        sizeCanvas();
        calcLimits();
        initTracts();
        const now = performance.now();
        updateTractVectors(now);
        nextPulseAt = now + 520 + Math.random() * 1200;
        nextDriftEmitAt = now + 120 + Math.random() * 240;
        applyTheme(theme, false);
        if (pageKey === 'home') setupHomePreview(siteContent.home);
        setupSearch();
        warmTemplateCache();
        fullClear();
        if (reduced) drawStatic();
        fpsT = now;
        scheduleFrame();
        prefetchPages();
    }

    tglBtn.addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark', true));

    window.addEventListener('resize', () => {
        sizeCanvas();
        calcLimits();
        fullClear();
        if (reduced) drawStatic();
    });

    seedFromTemplateCache();

    (async () => {
        try {
            siteContent = await loadSiteContent();
        } catch (err) {
            console.error(err);
            renderLoadError(err);
            return;
        }

        if (!siteContent[pageKey]) pageKey = 'home';
        renderPage(pageKey);
        boot();
    })();
})();
