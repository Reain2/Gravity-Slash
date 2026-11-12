import { useEffect, useState } from 'react';

/**
 * Registri pemuat dinamis untuk komponen animasi React Bits.
 *
 * Dipisah dari `Backgrounds.jsx` supaya file itu tetap hanya mengekspor
 * komponen (aturan `react-refresh/only-export-components`). Modul ini tidak
 * merender apa pun — ia hanya menyimpan cara memuat tiap komponen, dan
 * dipakai tiga arah:
 *
 *   - `useBackdropComponent(name)` di pembungkus untuk merendernya;
 *   - `loadBackdrop(name)` / `preloadBackdrops(...)` untuk memanaskannya lebih
 *     awal (dipakai `App.jsx` saat tirai antar-layar mulai menutup);
 *   - `preloadAllBackdrops()` sebagai jaring pengaman saat mesin menganggur.
 *
 * Komponen di `components/reactbits/` tetap disalin apa adanya; modul ini tidak
 * menyentuh isinya.
 */
export const LOADERS = {
  particles: () => import('./reactbits/Particles.jsx'),
  patternWaves: () => import('./reactbits/PatternWaves.jsx'),
  particleText: () => import('./reactbits/ParticleText.jsx'),
  blurText: () => import('./reactbits/BlurText.jsx'),
  topography: () => import('./reactbits/Topography.jsx'),
  gradientAscii: () => import('./reactbits/GradientASCII.jsx'),
  ghostFibers: () => import('./reactbits/GhostFibers.jsx'),
  fluxLines: () => import('./reactbits/FluxLines.jsx'),
  crosshair: () => import('./reactbits/Crosshair.jsx'),
};

/**
 * Chunk animasi yang dibutuhkan tiap layar. Dipanaskan saat pemain menuju layar
 * itu (lihat `App.jsx`), supaya tirai antar-layar tidak pernah membuka ke layar
 * yang latarnya belum siap. Nama mengikuti kunci `LOADERS` di atas.
 *
 * Layar Game sengaja kosong: tidak boleh ada latar animasi di sana (aturan
 * ARCHITECTURE bagian 2).
 */
export const SCREEN_CHUNKS = {
  OPENING: ['ghostFibers', 'crosshair'],
  HAND_TEST: ['topography', 'crosshair'],
  INTRO: ['particleText'],
  MENU: ['ghostFibers'],
  PLAYING: [],
  GAME_OVER: ['fluxLines', 'blurText'],
  NAME_ENTRY: ['gradientAscii', 'blurText'],
  LEADERBOARD: [],
  PHOTO: [],
};

/** Komponen yang sudah selesai dimuat, per nama. */
const resolved = new Map();
/** Pemuatan yang sedang berjalan, supaya tidak ada unduhan ganda. */
const inFlight = new Map();

/**
 * Komponen latar yang SUDAH siap, atau `null`.
 *
 * Dipakai pembungkus supaya komponen yang sudah dipanaskan bisa dirender pada
 * commit pertama layar baru — lihat `useBackdropComponent` di bawah.
 */
export function getBackdropComponent(name) {
  return resolved.get(name) ?? null;
}

/**
 * Muat satu komponen latar lalu SIMPAN komponennya.
 *
 * Bedanya dengan sekadar memanaskan unduhan: hasil `import()` di sini juga
 * dipecah menjadi komponen dan disimpan, jadi pemanggil berikutnya bisa
 * merendernya secara sinkron.
 */
export function loadBackdrop(name) {
  const cached = resolved.get(name);
  if (cached) return Promise.resolve(cached);
  const running = inFlight.get(name);
  if (running) return running;

  const load = LOADERS[name];
  if (!load) return Promise.resolve(null);

  const task = load()
    .then((mod) => {
      const Component = mod?.default ?? null;
      if (Component) resolved.set(name, Component);
      return Component;
    })
    // Kegagalan diabaikan: `resolved` tidak diisi, jadi percobaan berikutnya
    // (atau layar lain) masih bisa memuatnya.
    .catch(() => null)
    .then((Component) => {
      inFlight.delete(name);
      return Component;
    });

  inFlight.set(name, task);
  return task;
}

/**
 * Ambil komponen latar React Bits untuk `name`, memuatnya bila perlu.
 *
 * Kenapa bukan `lazy()` + `<Suspense>`: komponen `lazy` SELALU menangguhkan
 * render pertamanya, dan React baru mencoba ulang beberapa ratus milidetik
 * kemudian. Saat layar baru dipasang tepat ketika tirai antar-layar membuka,
 * jendela itu terlihat: pemain melihat latar statis lebih dulu, lalu kanvasnya
 * "muncul mendadak" di tengah animasi tirai — kedutan yang dilaporkan pemilik
 * produk (4 Nov 2026). Diukur pada build produksi: kanvas latar baru masuk DOM
 * 300 ms setelah layarnya dipasang, padahal chunk-nya sudah lama diunduh.
 *
 * Karena `loadBackdrop` menyimpan komponennya dan `App.jsx` memanggilnya saat
 * tirai mulai menutup, komponennya sudah siap sebelum layar baru dipasang:
 * `useState` di bawah mengembalikan komponen pada render PERTAMA layar baru,
 * jadi kanvas masuk DOM di frame yang sama dengan pergantian layar. Tidak ada
 * jendela kosong.
 *
 * Kalau belum siap (mis. pemain melompat layar sangat cepat), pembungkus
 * merender versi statis dulu dan komponennya masuk satu render kemudian —
 * lapisan ini tidak pernah kosong.
 */
export function useBackdropComponent(name) {
  const [Component, setComponent] = useState(() => getBackdropComponent(name));

  useEffect(() => {
    if (Component) return undefined;
    let alive = true;
    void loadBackdrop(name).then((loaded) => {
      // `setComponent(() => loaded)`: bentuk fungsi dipakai supaya React tidak
      // salah mengira komponennya sebagai pembaru state.
      if (alive && loaded) setComponent(() => loaded);
    });
    return () => {
      alive = false;
    };
  }, [name, Component]);

  return Component;
}

/**
 * Panaskan chunk React Bits sebelum layarnya benar-benar tampil.
 *
 * Panggil saat layar yang tidak buru-buru tampil, jadi biaya unduhnya
 * tersembunyi. Kegagalan diabaikan; pemuatan sebenarnya tetap terjadi di
 * `useBackdropComponent`.
 */
export function preloadBackdrops(...names) {
  for (const name of names) void loadBackdrop(name);
}

/**
 * Panaskan SEMUA chunk React Bits sekaligus, sekali, saat mesin menganggur.
 * Dipakai layar pembuka sebagai jaring pengaman: kalaupun pemain melompat cepat
 * antar layar sebelum `SCREEN_CHUNKS` sempat memanas, chunk-nya tetap siap.
 */
export function preloadAllBackdrops() {
  for (const name of Object.keys(LOADERS)) void loadBackdrop(name);
}
