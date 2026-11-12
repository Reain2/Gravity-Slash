/**
 * renderer.js — semua urusan piksel ada di sini (ARCHITECTURE bagian 6.5 & 7.6).
 * Engine dan input hanya berbicara dalam satuan ternormalisasi 0..1.
 *
 * Urutan gambar: orb → partikel → jejak slash. Latar layar diurus CSS React
 * (tidak ada latar animasi di layar Game), jadi canvas dibiarkan transparan.
 */

const TOKEN_FALLBACK = {
  '--orb-answer': '#f0f0f0',
  '--orb-answer-text': '#2e1c63',
  '--orb-danger': '#b3001b',
  '--orb-danger-text': '#ffffff',
  '--orb-heal': '#ff77bc',
  '--orb-heal-text': '#2e1c63',
  '--slash': '#f0f0f0',
  '--accent': '#aca1d0',
  '--accent-2': '#ff77bc',
  '--text': '#f0f0f0',
  '--font-display': 'sans-serif',
};

function readTokens() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { ...TOKEN_FALLBACK };
  }
  const styles = getComputedStyle(document.documentElement);
  const tokens = {};
  for (const [name, fallback] of Object.entries(TOKEN_FALLBACK)) {
    const value = (styles.getPropertyValue(name) || '').trim();
    tokens[name] = value || fallback;
  }
  return tokens;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  let cssWidth = 0;
  let cssHeight = 0;
  let tokens = readTokens();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(1, rect.width);
    cssHeight = Math.max(1, rect.height);
    // DPR dibatasi 2: layar 3x tidak sebanding dengan biaya gambarnya.
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(cssWidth * dpr);
    const pixelHeight = Math.round(cssHeight * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
  }

  const px = (value) => value * cssWidth;
  const py = (value) => value * cssHeight;

  function drawOrb(orb) {
    const cx = px(orb.x);
    const cy = py(orb.y);
    const r = px(orb.radius);
    if (r <= 0) return;

    const isBomb = orb.kind === 'bomb';
    const isHeal = orb.kind === 'heal';
    const fill = isBomb ? tokens['--orb-danger'] : isHeal ? tokens['--orb-heal'] : tokens['--orb-answer'];
    const ink = isBomb
      ? tokens['--orb-danger-text']
      : isHeal
        ? tokens['--orb-heal-text']
        : tokens['--orb-answer-text'];

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, orb.fade));

    if (isBomb) {
      // Lingkar duri berdenyut: penanda bahaya yang tidak mungkin tertukar.
      const spikes = 14;
      const pulse = 1 + Math.sin(orb.rotation * 3) * 0.06;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i += 1) {
        const angle = (i / (spikes * 2)) * Math.PI * 2;
        const radius = r * (i % 2 === 0 ? 1.22 * pulse : 1.02);
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    } else {
      const gradient = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.15, cx, cy, r);
      gradient.addColorStop(0, fill);
      gradient.addColorStop(1, isHeal ? tokens['--accent-2'] : fill);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.stroke();
    }

    // Angka selalu tegak supaya tetap terbaca saat orb berputar.
    ctx.fillStyle = ink;
    const label = isBomb ? '!' : isHeal ? '+' : String(orb.value ?? '');
    if (label) {
      let fontSize = r * 0.82;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${fontSize}px ${tokens['--font-display']}`;
      const maxWidth = r * 1.5;
      const measured = ctx.measureText(label).width;
      if (measured > maxWidth) {
        fontSize *= maxWidth / measured;
        ctx.font = `700 ${fontSize}px ${tokens['--font-display']}`;
      }
      ctx.fillText(label, cx, cy + fontSize * 0.04);
    }

    ctx.restore();
  }

  function drawParticles(particles) {
    for (const particle of particles) {
      const lifeRatio = particle.life / particle.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, lifeRatio));
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(px(particle.x), py(particle.y), Math.max(0.5, px(particle.size)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTrails(trails, now, windowMs) {
    const window = windowMs > 0 ? windowMs : 1;
    const baseWidth = Math.max(2, px(0.004));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tokens['--slash'];
    for (const trail of trails) {
      const points = trail.points;
      if (!points || points.length < 2) continue;
      for (let i = 1; i < points.length; i += 1) {
        const previous = points[i - 1];
        const current = points[i];
        const life = 1 - (now - current.t) / window;
        if (life <= 0) continue;
        ctx.globalAlpha = Math.min(1, life) * 0.9;
        ctx.lineWidth = baseWidth * (0.4 + life);
        ctx.beginPath();
        ctx.moveTo(px(previous.x), py(previous.y));
        ctx.lineTo(px(current.x), py(current.y));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  return {
    resize,

    refreshTokens() {
      tokens = readTokens();
    },

    draw({ orbs = [], particles = [], trails = [], now = 0, windowMs = 120, shake = 0 } = {}) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      if (shake > 0) {
        const magnitude = shake * cssWidth * 0.018;
        ctx.translate((Math.random() - 0.5) * magnitude, (Math.random() - 0.5) * magnitude);
      }

      for (const orb of orbs) drawOrb(orb);
      drawParticles(particles);
      drawTrails(trails, now, windowMs);
    },

    destroy() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    get size() {
      return { width: cssWidth, height: cssHeight, dpr };
    },
  };
}
