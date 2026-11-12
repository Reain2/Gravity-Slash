import { useMemo, useState } from 'react';
import { hasWebGL, readToken, useReducedMotion } from '../utils/env.js';
import { useBackdropComponent } from './reactbitsLoaders.js';

/**
 * Pembungkus komponen animasi React Bits.
 *
 * Aturan yang dijaga (ARCHITECTURE bagian 8 & 11):
 *   - setiap komponen di-`import()` dinamis → tidak masuk bundel awal;
 *   - satu latar animasi aktif per layar;
 *   - `prefers-reduced-motion` atau WebGL gagal → versi statis;
 *   - komponen di `components/reactbits/` tidak diubah isinya.
 *
 * Komponennya diambil lewat `useBackdropComponent`, bukan `lazy()` +
 * `<Suspense>`: alasan lengkapnya ada di `reactbitsLoaders.js`. Singkatnya,
 * `lazy` selalu menangguhkan render pertama dan React baru mencoba ulang
 * ~300 ms kemudian, sehingga latar sebuah layar baru sempat tampil statis di
 * tengah animasi tirai ("kecut" antar-halaman, laporan pemilik produk
 * 4 Nov 2026).
 */

function usePalette() {
  return useMemo(
    () => ({
      white: readToken('--color-white', '#f0f0f0'),
      violet: readToken('--color-violet', '#472e97'),
      pink: readToken('--color-pink', '#ff77bc'),
      night: readToken('--color-night', '#2e1c63'),
      // Turunan violet + putih dari tokens.css: garis kontur harus terang di
      // atas bidang violet gelap tanpa memakai hex palet baru.
      violetLift: readToken('--color-violet-lift', '#aca1d0'),
    }),
    []
  );
}

export function useAnimatedBackdropAllowed() {
  const reduced = useReducedMotion();
  const [webgl] = useState(hasWebGL);
  return !reduced && webgl;
}

/**
 * Merender komponen latar React Bits yang sudah dimuat.
 *
 * Komponennya masuk lewat prop, bukan diambil langsung dari sebuah pemanggilan
 * di dalam komponen ini. Aturan lint `react-hooks/static-components` menandai
 * tag JSX yang berasal dari pemanggilan di badan render sebagai "komponen yang
 * dibuat saat render" (dan memang benar untuk komponen yang dibuat di sana).
 * Di sini identitasnya stabil karena berasal dari cache modul
 * (`getBackdropComponent`), jadi pemisahan kecil ini menjaga aturan itu tetap
 * berguna tanpa harus dimatikan.
 */
export function BackdropLayer({ Component, ...props }) {
  return <Component {...props} />;
}

/** Latar idle: medan bintang bergaris rasi, nuansa astral (React Bits Particles). */
export function AstralBackdrop() {
  const allowed = useAnimatedBackdropAllowed();
  const palette = usePalette();
  const Particles = useBackdropComponent('particles');

  if (!allowed || !Particles) {
    return <div className="backdrop backdrop--astral" aria-hidden="true" />;
  }

  return (
    <div className="screen__bg" aria-hidden="true">
      <BackdropLayer
        Component={Particles}
        className="backdrop__canvas"
        particleCount={280}
        particleSpread={13}
        speed={0.07}
        particleColors={[palette.white, palette.violet, palette.pink]}
        particleBaseSize={92}
        sizeRandomness={1.1}
        glow={0.55}
        twinkle={0.45}
        connections
        connectionDistance={132}
        moveParticlesOnHover
        hoverEffect="parallax"
        hoverRadius={160}
        alphaParticles
        intro
      />
    </div>
  );
}

/**
 * Latar Pattern Waves (React Bits). Tidak lagi dipakai di jalur utama — Menu
 * memakai Ghost Fibers (T-140) — tetapi komponennya sengaja dipertahankan
 * (tidak dihapus), jadi pembungkusnya tetap ada dan chunk-nya tetap dipisah.
 */
export function WavesBackdrop() {
  const allowed = useAnimatedBackdropAllowed();
  const palette = usePalette();
  const PatternWaves = useBackdropComponent('patternWaves');

  if (!allowed || !PatternWaves) {
    return <div className="backdrop backdrop--waves" aria-hidden="true" />;
  }

  return (
    <div className="screen__bg" aria-hidden="true">
      <BackdropLayer
        Component={PatternWaves}
        color={palette.violet}
        backgroundColor={palette.night}
        opacity={0.6}
        speed={0.55}
        interactive
      />
    </div>
  );
}

/**
 * Latar gerbang kamera: peta kontur yang mengalir (React Bits Topography).
 *
 * Garis konturnya tipis dan pelan, jadi ia tetap terbaca sebagai latar di balik
 * paragraf penjelasan privasi. Warnanya `violetLift` — turunan violet + putih
 * dari tokens.css — supaya garisnya terang di atas bidang violet gelap.
 *
 * Komponennya butuh WebGL2. Saat gerak dikurangi, WebGL gagal, atau WebGL2 tidak
 * ada, `useAnimatedBackdropAllowed` dan kanvas yang mengembalikan `undefined`
 * jatuh ke `backdrop--topography` statis. Jadi lapisan ini tidak pernah kosong.
 */
export function TopographyBackdrop() {
  const allowed = useAnimatedBackdropAllowed();
  const palette = usePalette();
  const Topography = useBackdropComponent('topography');

  if (!allowed || !Topography) {
    return <div className="screen__bg backdrop--topography" aria-hidden="true" />;
  }

  return (
    <div className="screen__bg backdrop--topography" aria-hidden="true">
      <BackdropLayer
        Component={Topography}
        color={palette.violetLift}
        lineCount={26}
        lineWidth={1.1}
        elevation={1.1}
        foreground={0.16}
        tilt={34}
        speed={0.18}
        direction="forward"
        glow={0.5}
        depthOfField={0.45}
        fog={0.42}
        brightness={0.9}
        opacity={0.8}
        mouseInteraction
        hoverEffect="trace"
        clickEffect="pulse"
        intro
      />
    </div>
  );
}

/**
 * Latar gradien ASCII (React Bits GradientASCII) untuk layar penyimpanan skor.
 *
 * `shape` dipilih per layar; kini hanya `rise` (cahaya naik dari bawah) yang
 * dipakai, di `NAME_ENTRY`. `eclipse` sebelumnya dipakai di `GAME_OVER`, tetapi
 * digantikan Flux Lines (T-143) karena terbaca diam.
 * Warna memakai tangga violet → pink → putih dari tokens.css; area gelap tetap
 * transparan sehingga bidang violet di belakangnya tetap terlihat.
 */
export function AsciiBackdrop({ shape = 'eclipse' }) {
  const allowed = useAnimatedBackdropAllowed();
  const palette = usePalette();
  const GradientASCII = useBackdropComponent('gradientAscii');

  if (!allowed || !GradientASCII) {
    return <div className="screen__bg backdrop--ascii" aria-hidden="true" />;
  }

  return (
    <div className="screen__bg backdrop--ascii" aria-hidden="true">
      <BackdropLayer
        Component={GradientASCII}
        colors={[palette.violet, palette.pink, palette.white]}
        shape={shape}
        characters=" =+xX0S8#@"
        cellSize={20}
        density={0.7}
        glyphOpacity={0.7}
        gradientOpacity={0.55}
        glow={0.25}
        flicker={0.18}
        softness={0.55}
        scale={1.05}
        speed={0.7}
        grain={0.07}
        mouseInteraction
        clickEffect="wave"
        intro
      />
    </div>
  );
}

/**
 * Latar GhostFibers (React Bits) untuk layar pembuka dan menu.
 *
 * Serat cahaya violet→pink yang melipat; ini latar paling "ramai" yang dipakai
 * aplikasi, jadi hanya dua layar non-permainan yang memakainya dan masing-masing
 * memakai setelan berbeda (`variant`) supaya keduanya tidak terasa kembar:
 *   - `opening` — paling terang dan cepat, karena area teksnya sedikit;
 *   - `menu`    — sedikit lebih tenang supaya judul, pratinjau kamera, dan
 *                 tombol tetap terbaca di atasnya.
 *
 * Revisi pemilik produk (4 Nov 2026): seratnya kurang terlihat, jadi
 * `glow`/`sparkle`/`particles`/`brightness` dinaikkan, `vignette` diturunkan,
 * dan `gradient` dibuat `across`/`along` supaya untaian violet→pink terbaca
 * dua warna (bukan satu warna pekat). Scrim di `ui.css` juga dilonggarkan
 * khusus untuk latar ini.
 *
 * Komponennya butuh WebGL2 dan rantai bloom-nya berat (bilah × titik × lapisan).
 * Karena itu `threads`, `density`, dan `dpr` tetap ditahan di bawah bawaan. Sama
 * seperti latar lain: `prefers-reduced-motion` atau WebGL gagal → versi statis
 * `backdrop--fibers`, jadi lapisan ini tidak pernah kosong saat gerbang itu
 * menolak. (Seperti Topography, browser yang hanya punya WebGL1 tetap lolos
 * gerbang `hasWebGL` dan kanvasnya merender kosong — keterbatasan yang sudah ada
 * sebelum komponen ini.)
 */
const FIBER_VARIANTS = {
  opening: {
    layers: 3,
    threads: 84,
    density: 1,
    thickness: 1.1,
    waves: 1,
    twist: 1.3,
    spread: 1,
    volume: 0.75,
    rotation: 18,
    perspective: 0.65,
    speed: 0.55,
    flow: 0.45,
    rollSpeed: 0.16,
    depthOfField: 0.8,
    focusDepth: 0,
    particles: 0.8,
    sparkle: 0.9,
    glow: 1.15,
    brightness: 1.25,
    vignette: 0.22,
    grain: 0.05,
    gradient: 'across',
  },
  menu: {
    layers: 3,
    threads: 68,
    density: 0.9,
    thickness: 1,
    waves: 0.9,
    twist: 1,
    spread: 1,
    volume: 0.7,
    rotation: -14,
    perspective: 0.7,
    speed: 0.4,
    flow: 0.32,
    rollSpeed: 0.12,
    depthOfField: 0.78,
    focusDepth: 0.1,
    particles: 0.6,
    sparkle: 0.65,
    glow: 0.95,
    brightness: 1.08,
    vignette: 0.3,
    grain: 0.05,
    gradient: 'along',
  },
};

export function GhostFibersBackdrop({ variant = 'opening' }) {
  const allowed = useAnimatedBackdropAllowed();
  const palette = usePalette();
  const GhostFibers = useBackdropComponent('ghostFibers');
  const settings = FIBER_VARIANTS[variant] ?? FIBER_VARIANTS.opening;

  if (!allowed || !GhostFibers) {
    return <div className="screen__bg backdrop--fibers" aria-hidden="true" />;
  }

  return (
    <div className="screen__bg backdrop--fibers" aria-hidden="true">
      <BackdropLayer
        Component={GhostFibers}
        className="backdrop__canvas"
        glowColor={palette.violet}
        secondaryColor={palette.pink}
        fiberStyle="dots"
        mouseInteraction
        hoverEffect="focus"
        pulseOnClick={false}
        intro
        dpr={1.5}
        {...settings}
      />
    </div>
  );
}

/**
 * Latar FluxLines (React Bits) untuk layar game over.
 *
 * Alasan dipilih (revisi pemilik produk, 4 Nov 2026): layar game over sebelumnya
 * memakai Gradient ASCII bentuk `eclipse` — gradien tenang tanpa gerak yang
 * terbaca, jadi pemain yang baru kehilangan nyawa melihat layar yang tampak
 * diam dan bingung "ini apa". FluxLines mengalir terus (dua lapis noise yang
 * diaduk), jadi ada gerakan yang jelas tanpa perlu membaca teks.
 *
 * Warna memakai tangga violet → pink dari tokens.css; area gelap dibiarkan
 * transparan (`transparent`) sehingga bidang violet di belakangnya tetap
 * terlihat. Komponennya butuh WebGL2 dan memanggil `WEBGL_lose_context` saat
 * dibersihkan — perilaku yang sudah ditangani `webglStrictModeGuard` (BUG-016).
 * Saat gerak dikurangi atau WebGL gagal, ia jatuh ke `backdrop--flux` statis,
 * jadi lapisan ini tidak pernah kosong.
 */
export function FluxLinesBackdrop() {
  const allowed = useAnimatedBackdropAllowed();
  const palette = usePalette();
  const FluxLines = useBackdropComponent('fluxLines');

  if (!allowed || !FluxLines) {
    return <div className="screen__bg backdrop--flux" aria-hidden="true" />;
  }

  return (
    <div className="screen__bg backdrop--flux" aria-hidden="true">
      <BackdropLayer
        Component={FluxLines}
        className="backdrop__canvas"
        colors={[palette.violet, palette.pink, palette.white]}
        speed={0.45}
        scale={1.5}
        turbulence={1}
        fluidity={0.1}
        rimWidth={0.2}
        sharpness={2.4}
        shimmer={1.3}
        glow={2}
        lineWidth={1}
        flowDirection="down"
        mouseInteraction
        clickSwirl
        opacity={0.9}
        dpr={1.5}
      />
    </div>
  );
}

/**
 * Teks intro GRAVITY SLASH (React Bits Particle Text).
 * Versi reduksi gerak: judul biasa, tanpa kanvas partikel.
 */
export function ParticleTitle({ text = 'GRAVITY SLASH' }) {
  const allowed = useAnimatedBackdropAllowed();
  const palette = usePalette();
  const ParticleText = useBackdropComponent('particleText');

  if (!allowed) {
    return (
      <h1 className="intro__title intro__title--static" lang="en">
        {text}
      </h1>
    );
  }

  // Belum siap (jarang: komponennya biasanya sudah dipanaskan `App.jsx`):
  // judul cadangan disembunyikan tapi tetap memesan tinggi, supaya pemain tidak
  // melihat judul yang belum beranimasi lalu "dianimasikan ulang".
  if (!ParticleText) {
    return (
      <h1 className="intro__title intro__title--static intro__title--pending" aria-hidden="true">
        {text}
      </h1>
    );
  }

  return (
    <BackdropLayer
      Component={ParticleText}
      text={text}
      particleSize={2.2}
      density={4}
      color={palette.white}
      highlightColor={palette.pink}
      highlightMode="motion"
      shape="circle"
      intro="gather"
      scatter={200}
      gatherDuration={1500}
      stagger={380}
      idleDrift={0.6}
      glow
      fontSize="clamp(2.6rem, 12vw, 8rem)"
      fontWeight={700}
      fontFamily='"Chakra Petch", "Trebuchet MS", sans-serif'
    />
  );
}

/**
 * Teks GAME OVER (React Bits Blur Text).
 * Versi reduksi gerak: teks langsung tampil.
 */
export function BlurTitle({ text = 'GAME OVER', className = '' }) {
  const allowed = useAnimatedBackdropAllowed();
  const BlurText = useBackdropComponent('blurText');

  if (!allowed) {
    return (
      <h1 className={`${className} gameover__title--static`} lang="en">
        {text}
      </h1>
    );
  }

  if (!BlurText) {
    return <h1 className={className}>{text}</h1>;
  }

  return (
    <BackdropLayer
      Component={BlurText}
      text={text}
      className={className}
      animateBy="letters"
      direction="top"
      delay={90}
      stepDuration={0.42}
      blur={12}
      distance={46}
    />
  );
}
