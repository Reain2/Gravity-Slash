/**
 * Partikel sederhana untuk efek pecah orb (F5 T-063).
 * Jumlahnya dibatasi supaya tidak ada alokasi tak terbatas tiap frame.
 */

const DEFAULT_MAX = 320;

export function createParticleField({ max = DEFAULT_MAX } = {}) {
  const items = [];

  function push(item) {
    if (items.length >= max) items.shift();
    items.push(item);
  }

  return {
    burst(x, y, { count = 16, color = '#ffffff', speed = 0.4, lifeMs = 620, size = 0.006 } = {}) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.35 + Math.random() * 0.85);
        push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity - speed * 0.25,
          life: lifeMs,
          maxLife: lifeMs,
          color,
          size: size * (0.6 + Math.random() * 0.9),
        });
      }
    },

    update(dt) {
      for (let i = items.length - 1; i >= 0; i -= 1) {
        const p = items[i];
        p.life -= dt * 1000;
        if (p.life <= 0) {
          items.splice(i, 1);
          continue;
        }
        p.vy += 0.9 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    },

    clear() {
      items.length = 0;
    },

    get items() {
      return items;
    },

    get count() {
      return items.length;
    },

    get max() {
      return max;
    },
  };
}
