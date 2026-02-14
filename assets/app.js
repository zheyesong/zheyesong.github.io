(() => {
    'use strict';

    let siteContent = null;

    const FALLBACK_CONTENT = {"home":{"name":"Zheye Song","title":"B.S. Student, Mathematics & Applied Mathematics — Fudan University","interests":"Interests: Causality (Inference and Reasoning) • Random Matrix Theory •Machine Learning","quickLinks":[{"label":"Publications","href":"#"},{"label":"CV","href":"cv.pdf","comment":"<!-- To enable the CV link, place cv.pdf at the repo root so it is accessible at cv.pdf. -->"},{"label":"GitHub","href":"https://github.com/zheyesong","external":true},{"label":"Email","href":"mailto:song_zheye@163.com"}],"buttons":[{"key":"about","label":"About","href":"about.html"},{"key":"blog","label":"Blog","href":"blog.html"},{"key":"notebook","label":"Notebook","href":"notebook.html"}],"previews":{"about":{"key":"about","title":"About","text":"I am an undergraduate student focusing on probability, inference, and computational methods, with a growing interest in mathematically grounded ML across diverse applications.","href":"about.html","showLink":true},"blog":{"key":"blog","title":"Blog","text":"Notes on papers, course takeaways, and short essays are collected here. I mainly write about causal ideas, asymptotic thinking, and clean problem-solving workflows.","href":"blog.html","showLink":false},"notebook":{"key":"notebook","title":"Notebook","text":"Working drafts, derivation snippets, and experiment logs are organized for future expansion, with room for multiple projects and evolving ideas.","href":"notebook.html","showLink":false}},"previewOrder":["about","blog","notebook"],"lastUpdated":"Last updated: 2026"},"about":{"title":"About","intro":"I am an undergraduate student focusing on probability, inference, and computational methods, with a growing interest in mathematically grounded machine learning across diverse applications.","sections":[{"heading":"Current Focus","list":["Causal inference: identification, robustness, and practical model validation.","Random matrix theory: asymptotic intuition for high-dimensional systems.","Public health ML: interpretable methods with strong statistical assumptions."]},{"heading":"How I Work","paragraph":"I prefer a cycle of theorem-level understanding, implementation-level stress tests, and communication-level simplification. My goal is to keep models both useful and defensible."},{"heading":"Roadmap","paragraph":"This page is designed as a long-form profile area. You can keep extending it with coursework notes, projects, publications, and future research plans while preserving the same visual style."}],"back":{"label":"Back to home","href":"index.html"}},"blog":{"title":"Blog","intro":"This page keeps longer-form writing in one place, with a built-in index so you can continuously add new posts without changing the layout.","directoryLabel":"Blog directory","directoryTitle":"Directory","toc":[{"href":"#post-causal","text":"Causal Estimation Under Practical Constraints"},{"href":"#post-rmt","text":"Random Matrix Intuition for Learning Systems"},{"href":"#post-health","text":"Machine Learning for Public Health: What Matters First"}],"entries":[{"id":"post-causal","title":"Causal Estimation Under Practical Constraints","meta":"Status: Draft","text":"A running note on identification assumptions, sensitivity checks, and decision-focused interpretation. This slot is ready for a full-length article."},{"id":"post-rmt","title":"Random Matrix Intuition for Learning Systems","meta":"Status: Draft","text":"Planned content includes eigenvalue concentration, noise separation, and what these ideas imply for model stability in high dimensions."},{"id":"post-health","title":"Machine Learning for Public Health: What Matters First","meta":"Status: Draft","text":"A practical framework balancing calibration, fairness, interpretability, and domain constraints for health-related machine learning systems."}],"back":{"label":"Back to home","href":"index.html"}},"notebook":{"title":"Notebook","intro":"This page is a structured lab notebook for short technical fragments, derivations, and experiment logs, with an index optimized for many entries.","directoryLabel":"Notebook directory","directoryTitle":"Directory","toc":[{"href":"#note-identification","text":"Identification Checklist for Causal Designs"},{"href":"#note-spectrum","text":"Spectrum Diagnostics for High-Dimensional Covariance"},{"href":"#note-eval","text":"Evaluation Protocol for Health Prediction Tasks"}],"entries":[{"id":"note-identification","title":"Identification Checklist for Causal Designs","meta":"Type: Concept note","text":"A compact list covering positivity, ignorability assumptions, overlap inspection, and practical sanity checks before model fitting."},{"id":"note-spectrum","title":"Spectrum Diagnostics for High-Dimensional Covariance","meta":"Type: Derivation note","text":"Working notes on separating signal spikes from noise bulk, with reminders for sample-size effects and numerical stability checks."},{"id":"note-eval","title":"Evaluation Protocol for Health Prediction Tasks","meta":"Type: Workflow note","text":"A practical protocol template: data split policy, calibration plots, subgroup metrics, and documentation rules for reproducibility."}],"back":{"label":"Back to home","href":"index.html"}}};

    const PAGE_FILE = {
        home: 'index.html',
        about: 'about.html',
        blog: 'blog.html',
        notebook: 'notebook.html'
    };

    const ICO_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    const ICO_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    const ICO_PAUSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="5" x2="9" y2="19"/><line x1="15" y1="5" x2="15" y2="19"/></svg>';
    const ICO_PLAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="8 5 19 12 8 19 8 5"/></svg>';

    const html = document.documentElement;
    const body = document.body;
    const tglBtn = document.getElementById('themeToggle');
    const pauseBtn = document.getElementById('pauseToggle');
    const contentRoot = document.getElementById('contentRoot');

    if (!body || !tglBtn || !contentRoot) return;

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
    let animationPaused = false;
    let rafId = 0;

    const cvs = document.getElementById('bg');
    const ctx = cvs.getContext('2d');
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
        if (!animationPaused) scheduleFrame();
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
            r: 0, g: 0, b: 0, cs: ''
        };
    }
    let n = 0;
    const SPEED_SCALE = 0.9;

    async function loadSiteContent() {
        try {
            const res = await fetch('assets/content.json', { cache: 'force-cache' });
            if (!res.ok) throw new Error('Failed to load content.json');
            return await res.json();
        } catch (err) {
            console.warn('Falling back to embedded content data.', err);
            return FALLBACK_CONTENT;
        }
    }

    function renderPage(key) {
        if (key === 'home') {
            renderHome(siteContent.home);
            return;
        }
        renderDetail(key, siteContent[key]);
    }

    function renderHome(data) {
        const linksHtml = data.quickLinks.map((link, index) => {
            const attrs = [];
            attrs.push('href="' + link.href + '"');
            if (link.external) {
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

        contentRoot.innerHTML = [
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

    function renderDetail(key, data) {
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

        contentRoot.innerHTML = [
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
        chunks.push('<p>' + data.intro + '</p>');

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
            chunks.push('<p>' + entry.text + '</p>');
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

    function updatePauseButton() {
        if (!pauseBtn) return;
        const paused = animationPaused;
        pauseBtn.innerHTML = paused ? ICO_PLAY : ICO_PAUSE;
        pauseBtn.setAttribute('aria-label', paused ? 'Resume page animation' : 'Pause page animation');
        pauseBtn.title = paused ? 'Resume animation' : 'Pause animation';
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    }

    function scheduleFrame() {
        if (rafId || reduced || animationPaused) return;
        rafId = requestAnimationFrame(frame);
    }

    function stopFrame() {
        if (!rafId) return;
        cancelAnimationFrame(rafId);
        rafId = 0;
    }

    function setAnimationPaused(paused) {
        animationPaused = !!paused;
        updatePauseButton();
        if (animationPaused || reduced) {
            stopFrame();
            return;
        }
        scheduleFrame();
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

    function emit() {
        if (n >= POOL || n >= MAX_P) return;
        const p = P[n];
        const ang = Math.random() * 6.2832;
        const dep = Math.random();
        const spd = 1.1 + dep * 1.35 + Math.random() * 3.2;
        let cu = (Math.random() - 0.5) * 0.16;
        if (Math.abs(cu) < 0.018) cu = cu >= 0 ? 0.02 : -0.02;

        p.x = cx;
        p.y = cy;
        p.px = cx;
        p.py = cy;
        p.vx = Math.cos(ang) * spd;
        p.vy = Math.sin(ang) * spd;
        p.cu = cu;
        p.age = 0;
        p.life = 160 + (Math.random() * 340) | 0;
        p.d = dep;
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
        if (reduced || animationPaused) return;
        tickFps(now);

        const dark = theme === 'dark';
        const isMob = mob();

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = dark ? 'rgba(5,5,5,0.072)' : 'rgba(247,243,232,0.078)';
        ctx.fillRect(0, 0, W, H);

        const burst = n < (MAX_P * 0.36) ? (mob() ? 1 : 4) : 0;
        const toSpawn = Math.min(spawn + burst, MAX_P - n);
        for (let s = 0; s < toSpawn; s++) emit();

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

            const co = Math.cos(p.cu);
            const si = Math.sin(p.cu);
            const nvx = p.vx * co - p.vy * si;
            const nvy = p.vx * si + p.vy * co;
            const ageRatio = p.age / p.life;
            const drag = FRIC - ageRatio * 0.0046;
            p.vx = nvx * drag;
            p.vy = nvy * drag;

            p.cu += (Math.random() - 0.5) * (0.004 + (1 - p.d) * 0.0028);
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

            const prog = p.age / p.life;
            let al = (1 - prog);
            al *= dark ? (0.108 + 0.468 * p.d) : (0.11 + 0.572 * p.d);
            if (prog < 0.06) al *= prog / 0.06;
            if (al > 0.88) al = 0.88;
            if (al < 0.003) {
                i++;
                continue;
            }

            const lw = (dark ? 0.32 : 0.24) + p.d * (isMob ? 1.45 : dark ? 1.02 : 0.86);

            ctx.globalAlpha = al;
            ctx.lineWidth = lw;
            ctx.strokeStyle = p.cs;
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();

            i++;
        }

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

    function prefetchPages() {
        const current = PAGE_FILE[pageKey] || 'index.html';
        Object.keys(PAGE_FILE).forEach(key => {
            const href = PAGE_FILE[key];
            if (href === current) return;
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = href;
            document.head.appendChild(link);
        });

        const contentLink = document.createElement('link');
        contentLink.rel = 'prefetch';
        contentLink.href = 'assets/content.json';
        document.head.appendChild(contentLink);
    }

    function boot() {
        sizeCanvas();
        calcLimits();
        applyTheme(theme, false);
        if (pageKey === 'home') setupHomePreview(siteContent.home);
        updatePauseButton();
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                setAnimationPaused(!animationPaused);
            });
        }
        fullClear();
        if (reduced) drawStatic();
        fpsT = performance.now();
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

    (async () => {
        try {
            siteContent = await loadSiteContent();
        } catch (err) {
            console.error(err);
            return;
        }

        if (!siteContent[pageKey]) pageKey = 'home';
        renderPage(pageKey);
        boot();
    })();
})();
