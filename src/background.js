export function setupBackground(getTheme) {
  const cvs = document.getElementById('bg');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  if (!ctx) return;

  let theme = getTheme();
  const isDetailPage = document.body.classList.contains('page-detail');
  let rafId = 0;
  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, reach = 1;
  const mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = mqRM.matches;

  const mob = () => W < 600;
  let MAX_P = 0;
  let ORIG_MAX = 0;
  let spawn = 0;
  let origSpawn = 0;
  let fpsCnt = 0;
  let fpsT = 0;
  let fps = 60;
  let lastFullClearAt = 0;

  const ms = { x: -10000, y: -10000, on: false };
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

  const FRIC = 0.996;
  const OUTF = 0.018;
  const SWIRL = 0.022;
  const MR = 120;
  const MR2 = MR * MR;
  const MSTR = 0.1;
  ctx.lineCap = 'round';

  function scheduleFrame() {
    if (rafId || reduced || document.hidden) return;
    rafId = requestAnimationFrame(frame);
  }

  function stopFrame() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
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
    cy = H * (isDetailPage ? (mob() ? 0.56 : 0.58) : 0.5);
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
    const glowScale = isDetailPage ? 0.66 : 1;
    if (theme === 'dark') {
      g.addColorStop(0, 'rgba(0,255,65,' + (0.108 * glowScale) + ')');
      g.addColorStop(1, 'rgba(5,5,5,0)');
    } else {
      g.addColorStop(0, 'rgba(255,195,56,' + (0.17 * glowScale) + ')');
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
    const base = isDetailPage ? 3200 + Math.random() * 5200 : 2000 + Math.random() * 4000;
    const jitter = (Math.random() - 0.5) * 420;
    nextPulseAt = now + Math.max(isDetailPage ? 3200 : 1900, base + jitter);
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
    const detailPulseScale = isDetailPage ? 0.78 : 1;
    const major = Math.random() < (isDetailPage ? 0.16 : 0.24);
    pulseEnergy = (major ? 1.35 + Math.random() * 0.45 : 0.9 + Math.random() * 0.34) * (isDetailPage ? 0.86 : 1);
    pulseTracts = pickPulseTracts(major);
    const capacity = Math.max(0, MAX_P - n);
    if (capacity < 8) {
      pulseActive = false;
      scheduleNextPulse(now);
      return;
    }
    const rawCount = major
      ? ((mob() ? 70 : 260) + ((Math.random() * (mob() ? 90 : 300)) | 0))
      : ((mob() ? 32 : 96) + ((Math.random() * (mob() ? 42 : 150)) | 0));
    const scale = 0.7 + spawn * 0.06;
    pulseRemaining = Math.min(capacity, Math.max(10, (rawCount * scale * detailPulseScale) | 0));
    pulseEndsAt = now + (isDetailPage ? 130 : 110) + Math.random() * (isDetailPage ? 70 : 90);
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
    emit((Math.random() * TRACT_COUNT) | 0, (isDetailPage ? 0.5 : 0.58) + Math.random() * (isDetailPage ? 0.14 : 0.18), false);
    nextDriftEmitAt = now + (isDetailPage ? 520 : 320) + Math.random() * (isDetailPage ? 980 : 760);
  }

  function addBloom(x, y, depth, now) {
    const bloomCap = isDetailPage ? (mob() ? 26 : 84) : (mob() ? 36 : BLOOM_CAP);
    if (blooms.length >= bloomCap) blooms.shift();
    blooms.push({
      x,
      y,
      born: now,
      life: 220 + Math.random() * 280,
      radius: (30 + Math.random() * 50) * (0.82 + depth * 0.4),
      alpha: (0.18 + depth * 0.26) * (isDetailPage ? 0.72 : 1)
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
        grad.addColorStop(0, 'rgba(255,242,168,' + (alpha * 1.02) + ')');
        grad.addColorStop(0.35, 'rgba(255,195,56,' + (alpha * 0.9) + ')');
        grad.addColorStop(1, 'rgba(233,130,0,0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(b.x - radius, b.y - radius, radius * 2, radius * 2);
    }
  }

  function calcLimits() {
    if (mob()) {
      MAX_P = isDetailPage ? 380 : 480;
      spawn = isDetailPage ? 2 : 3;
    } else {
      const computedMax = Math.min(2500, Math.max(1200, (W * H / 820) | 0));
      MAX_P = isDetailPage ? Math.max(900, (computedMax * 0.82) | 0) : computedMax;
      spawn = Math.min(isDetailPage ? 9 : 12, Math.max(isDetailPage ? 4 : 6, (MAX_P / (isDetailPage ? 220 : 180)) | 0));
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
    } else if (t < 0.48) {
      const s = t / 0.48;
      p.r = 255;
      p.g = (242 - s * 47) | 0;
      p.b = (168 - s * 112) | 0;
    } else if (t < 0.82) {
      const s = (t - 0.48) / 0.34;
      p.r = 255;
      p.g = (195 - s * 19) | 0;
      p.b = (56 - s * 56) | 0;
    } else {
      const s = (t - 0.82) / 0.18;
      p.r = (255 - s * 22) | 0;
      p.g = (176 - s * 46) | 0;
      p.b = 0;
    }
    p.cs = 'rgb(' + p.r + ',' + p.g + ',' + p.b + ')';
  }

  function emit(tractId, energy, pulseEmit) {
    if (n >= POOL || n >= MAX_P) return;
    const p = P[n];
    const tract = tractVectors[tractId] || {
      x: Math.cos(Math.random() * 6.2832),
      y: Math.sin(Math.random() * 6.2832),
      curl: 0
    };
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

  function frame(now) {
    rafId = 0;
    if (reduced || document.hidden) return;
    tickFps(now);
    const dark = theme === 'dark';
    const isMob = mob();
    updateTractVectors(now);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (!dark && now - lastFullClearAt > 9000) {
      fullClear();
      lastFullClearAt = now;
    } else {
      ctx.fillStyle = dark ? 'rgba(5,5,5,0.072)' : 'rgba(247,243,232,0.145)';
      ctx.fillRect(0, 0, W, H);
    }

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
      const drag = FRIC - prog * 0.0046;
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
      al *= dark ? (0.102 + 0.45 * p.d) : (0.13 + 0.62 * p.d);
      if (prog < 0.09) al *= 1.35 - prog * 2.8;
      al *= 0.76 + Math.min(1.2, p.spark) * 0.26;
      if (isDetailPage) al *= 0.88;
      if (al > 0.9) al = 0.9;
      if (al < 0.003) {
        i++;
        continue;
      }

      let lw = (dark ? 0.32 : 0.28) + p.d * (isMob ? 1.45 : dark ? 1.02 : 0.96);
      if (prog < 0.18) lw += (0.22 * (1 - prog / 0.18)) * p.spark;
      const hotG = dark ? 252 : 242;
      const hotB = dark ? 224 : 168;
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
    const centerGlowScale = isDetailPage ? 0.62 : 1;
    const gr = isMob ? (isDetailPage ? 28 : 32) : (isDetailPage ? 40 : 48);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
    if (dark) {
      grd.addColorStop(0, 'rgba(0,255,65,' + (0.05 * centerGlowScale) + ')');
      grd.addColorStop(1, 'rgba(0,255,65,0)');
    } else {
      grd.addColorStop(0, 'rgba(255,195,56,' + (0.052 * centerGlowScale) + ')');
      grd.addColorStop(1, 'rgba(255,195,56,0)');
    }
    ctx.fillStyle = grd;
    ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    scheduleFrame();
  }

  function boot() {
    sizeCanvas();
    calcLimits();
    initTracts();
    const now = performance.now();
    updateTractVectors(now);
    nextPulseAt = now + (isDetailPage ? 2800 + Math.random() * 2200 : 520 + Math.random() * 1200);
    nextDriftEmitAt = now + (isDetailPage ? 360 + Math.random() * 420 : 120 + Math.random() * 240);
    fullClear();
    lastFullClearAt = now;
    if (reduced) drawStatic();
    fpsT = now;
    scheduleFrame();
  }

  window.addEventListener('mousemove', e => {
    ms.x = e.clientX;
    ms.y = e.clientY;
    ms.on = true;
  });
  window.addEventListener('mouseleave', () => {
    ms.on = false;
  });
  window.addEventListener('touchmove', e => {
    if (e.touches.length) {
      ms.x = e.touches[0].clientX;
      ms.y = e.touches[0].clientY;
      ms.on = true;
    }
  }, { passive: true });
  window.addEventListener('touchend', () => {
    ms.on = false;
  });

  const onReducedMotionChange = e => {
    reduced = e.matches;
    if (reduced) {
      stopFrame();
      drawStatic();
      return;
    }
    fullClear();
    lastFullClearAt = performance.now();
    scheduleFrame();
  };
  if (typeof mqRM.addEventListener === 'function') {
    mqRM.addEventListener('change', onReducedMotionChange);
  } else if (typeof mqRM.addListener === 'function') {
    mqRM.addListener(onReducedMotionChange);
  }

  window.addEventListener('resize', () => {
    sizeCanvas();
    calcLimits();
    fullClear();
    lastFullClearAt = performance.now();
    if (reduced) drawStatic();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopFrame();
      return;
    }
    fullClear();
    lastFullClearAt = performance.now();
    scheduleFrame();
  });

  window.addEventListener('site-theme-change', event => {
    theme = event.detail?.theme || getTheme();
    fullClear();
    lastFullClearAt = performance.now();
    if (reduced) drawStatic();
  });

  boot();
}
