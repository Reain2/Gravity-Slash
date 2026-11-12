# Lisensi pihak ketiga — Gravity Slash

Terakhir diperbarui: 4 November 2026

Proyek ini memakai komponen animasi dari **pustaka gratis React Bits**. Komponennya
disalin apa adanya ke `src/components/reactbits/` dan **tidak diubah isinya**.

## React Bits

|                     |                                            |
| ------------------- | ------------------------------------------ |
| Repositori          | https://github.com/DavidHDev/react-bits    |
| Commit yang disalin | `4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4` |
| Cabang              | `main`                                     |
| Lisensi             | MIT + Commons Clause                       |

### Komponen yang dipakai

| Komponen       | Berkas sumber di repo upstream                                      | Disalin ke                  |
| -------------- | ------------------------------------------------------------------- | --------------------------- |
| Particles      | `src/content/Backgrounds/Particles/Particles.jsx` + `.css`          | `src/components/reactbits/` |
| Pattern Waves  | `src/content/Backgrounds/PatternWaves/PatternWaves.jsx` + `.css`    | `src/components/reactbits/` |
| Particle Text  | `src/content/TextAnimations/ParticleText/ParticleText.jsx` + `.css` | `src/components/reactbits/` |
| Blur Text      | `src/content/TextAnimations/BlurText/BlurText.jsx`                  | `src/components/reactbits/` |
| Crosshair      | `src/content/Animations/Crosshair/Crosshair.jsx`                    | `src/components/reactbits/` |
| Topography     | `src/content/Backgrounds/Topography/Topography.jsx` + `.css`        | `src/components/reactbits/` |
| Gradient ASCII | `src/content/Backgrounds/GradientASCII/GradientASCII.jsx` + `.css`  | `src/components/reactbits/` |
| Ghost Fibers   | `src/content/Backgrounds/GhostFibers/GhostFibers.jsx` + `.css`      | `src/components/reactbits/` |
| Flux Lines     | `src/content/Backgrounds/FluxLines/FluxLines.jsx` + `.css`          | `src/components/reactbits/` |

### Catatan Commons Clause

Commons Clause melarang **menjual ulang atau meredistribusi komponen React Bits
itu sendiri** (misalnya menerbitkannya sebagai paket npm). Memakai komponennya
di dalam aplikasi ini tetap boleh.

**Komponen React Bits Pro TIDAK dipakai** — Pro butuh lisensi berbayar
per-developer yang belum dimiliki proyek ini.

## Karya sendiri (bukan React Bits)

| Karya                                      | Berkas                         | Lisensi                         |
| ------------------------------------------ | ------------------------------ | ------------------------------- |
| `GlyphRain` — latar hujan glyph, canvas 2D | `src/components/GlyphRain.jsx` | karya asli proyek Gravity Slash |

## Dependensi runtime lain

| Paket                     | Dipakai oleh       | Lisensi    | Catatan                                          |
| ------------------------- | ------------------ | ---------- | ------------------------------------------------ |
| `react`, `react-dom`      | seluruh UI         | MIT        |                                                  |
| `@mediapipe/tasks-vision` | hand tracking      | Apache-2.0 | Model & wasm disajikan dari `public/`, bukan CDN |
| `ogl`                     | `PatternWaves.jsx` | MIT        | hanya di-`import` oleh komponen itu              |
| `motion`                  | `BlurText.jsx`     | MIT        | hanya di-`import` oleh komponen itu              |

Font (Chakra Petch, IBM Plex Sans) berlisensi SIL Open Font License 1.1 dan
disajikan dari `public/fonts/`.

## Aset audio

Belum ada aset audio yang diimpor (fase F9). Daftar sumber dan lisensinya akan
dicatat di `public/audio/CREDITS.md` setelah pemilik produk memilih asetnya.
