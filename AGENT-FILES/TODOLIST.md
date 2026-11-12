# TODOLIST — Gravity Slash

Terakhir diperbarui: 4 November 2026

**Legenda:** `[ ]` belum · `[~]` sedang dikerjakan · `[x]` selesai · 🚫 terblokir · 🔹 bonus

Setiap item punya ID agar bisa dirujuk di laporan dan `BUGLIST.md`.

> **Status 4 Nov 2026 — F0–F9 selesai dikodekan.** `npm run build`, `npm run lint`
> (0 error), dan `npm run test` (**105 test, 12 berkas**, semua lolos) sudah
> dijalankan. F9 (audio) kini **lengkap di kode** — lihat catatan aset di bawah;
> yang menunggu hanyalah impor berkas `.mp3` oleh pemilik produk. Verifikasi
> manual di browser (F10) sebagian sudah dilakukan headless (T-113, T-114, T-116,
> T-118, T-120, T-121); sisanya (kamera & tangan sungguhan, lintas browser,
> deploy, tuning) menunggu pemilik produk.
> **Q-03 selesai 4 Nov 2026** — ketiga hex palet (`F0F0F0`, `472E97`, `FF77BC`;
> direvisi dari `105BFF`/`FE8500` yang terbaca biru/oranye) sudah terverifikasi dan
> tercatat di `tokens.css`, dengan komposisi **60% violet / 30% putih / 10% pink**.
>
> **Putaran perbaikan UI (4 Nov 2026).** Empat temuan dari uji manual pemilik
> produk sudah diperbaiki — lihat `BUGLIST.md` BUG-001…BUG-004:
> `ui.css` yang tidak pernah di-import (semua gaya layar mati), pratinjau kamera
> yang tidak muncul (perlombaan StrictMode + tata letak), perpindahan layar yang
> potongan keras (sekarang tirai iris), dan tombol tanpa umpan balik. Menu,
> intro, dan layar idle juga ditata ulang; intro memakai komposisi 60-30-10 dan
> ditahan 8,2 detik. Perlu diuji ulang di browser.
>
> **Putaran diagnosis kedua (4 Nov 2026).** Tiga gejala baru dari uji manual —
> tombol "Mulai" mati, tangan tidak pernah terdeteksi, animasi iris tidak muncul,
> dan gerakan tersendat — sudah dicari akarnya dan diperbaiki (BUGLIST.md
> BUG-005…BUG-007 + revisi adapter):
>
> - Tombol "Mulai": `setPointerCapture` di kontainer swipe membelokkan event
>   `click` sehingga tombol di dalamnya tidak pernah menerima klik. Dihapus.
> - Kamera ganda + inferensi ganda (StrictMode) membuat **2 track hidup** dan
>   frame `{p50:17, p90:33, p99:50}`; sekarang 1 track dan `{p50:17, p90:17,
p99:17}`, long task dari 4 → 1. Lihat BUG-006.
> - Jejak iris yang terhapus oleh satu deteksi meleset: BUG-007.
> - Delegate GPU/CPU kini dipilih dari hasil pengukuran, deteksi 24 Hz, dan
>   angka tuning pindah ke `gameConfig.hand`. Tes regresi baru
>   (`src/input/HandTrackingAdapter.test.js`, 6 kasus) menutup rantai
>   landmark → pointer → iris dan pembatalan `start()`.
>   Perlu diuji ulang dengan kamera dan tangan sungguhan.
>
> **Putaran optimasi ketiga (4 Nov 2026) — BUG-008, "masih lag".** Penyebabnya
> ditemukan dan diukur: `detectForVideo` menjalankan inferensi **sinkron di main
> thread** ±20 ms tiap panggilan; pada 24 Hz itu ±48% dari setiap detik. Perbaikan:
> inferensi pindah ke **Web Worker klasik** (`src/input/handWorker.js`), main
> thread hanya membayar `createImageBitmap` (±0,1 ms). Worker klasik dipilih
> karena Vite menulis ulang setiap `import()` (termasuk dinamis) sehingga wasm di
> `public/` gagal di dev; `importScripts` tidak disentuh Vite. Bundel tasks-vision
> disalin ke `public/vendor/` oleh `scripts/sync-vendor.mjs` (jalan otomatis lewat
> `postinstall`/`predev`/`prebuild`). Delegate worker `CPU` (XNNPACK) karena GPU
> tidak lebih cepat (19,86 vs 20,79 ms) dan buruk tanpa akselerasi nyata. `detectHz`
> 24 → 30; backpressure satu frame sekaligus mencegah penumpukan bitmap. Hasil
> terukur di Brave headless: sebelum `{p50:16.7, p90:16.7, p99:16.8, max:183.4}`,
> sesudah `{p50:16.7, p90:16.7, p99:16.8, max:16.8}` — nol frame terlewat. Jalur
> cadangan main thread tetap ada bila Worker gagal. Tes regresi jalur worker (+4)
> ditambahkan; suite kini **64 test / 9 berkas**. Perlu diuji ulang dengan kamera
> dan tangan sungguhan (T-122).
>
> **Putaran keempat (4 Nov 2026) — tangan jauh + revisi palet.**
>
> - **BUG-011:** tangan pada jarak 1–1,5 m sering tidak terdeteksi dan gerakan
>   terasa tidak mulus. Kamera dinaikkan `640×480` → ideal `1280×720`, dan ambang
>   keyakinan MediaPipe diturunkan `0,5` → `0,3` (deteksi/presence/tracking).
>   Keduanya kini angka di `gameConfig.hand` (`camera`, `confidence`) dan dipakai
>   jalur worker maupun jalur cadangan. Tes adapter +2 (total **100 test / 11
>   berkas**). Wajib diuji ulang manual dengan kamera dan tangan sungguhan (T-122).
> - **Palet direvisi** atas permintaan pemilik produk: `#105BFF` (terbaca biru) →
>   `#472E97`, dan `#FE8500` (terbaca oranye) → `#FF77BC`. Komposisi **60-30-10**
>   disetel ulang: violet jadi bidang dominan, putih pendukung, pink aksen; banyak
>   aksen teks yang sebelumnya oranye dipindah ke violet/putih. Semua turunan
>   (`--color-night`, `--bg-raised`, scrim, glow, fallback JS) disinkronkan.
>
> **Putaran kelima (4 Nov 2026) — BUG-012 "warna overlap" + layar idle baru.**
>
> - **BUG-012:** keluhan "bidang violet saling menimpa, pink nyaris tak muncul".
>   Akarnya salah peran token: `--accent` (`#472E97`) dipakai sebagai isian
>   sekaligus teks di atas bidang violet setara → **1,16:1**. Bidang digelapkan
>   (`--color-night` `#2e1c63`, panel `#3f2a87`), aksen violet jadi **turunan
>   terang** `#aca1d0` untuk garis/teks, dan **aksi utama pindah ke pink**.
>   Tepi & teks dinaikkan; kontras diukur (putih/bidang 12,60:1, aksen 5,99:1,
>   pink 5,89:1; `--border-strong` 3,21:1). Lihat `BUGLIST.md` BUG-012.
> - **Layar idle baru:** wordmark **GRAVITY SLASH** + penjelasan + tombol Mulai +
>   **Crosshair** (React Bits gratis) yang mengunci ke wordmark/tombol; layar
>   **menunggu pemain** (tanpa auto-advance), masuk berurutan 70 ms dan dimatikan
>   saat `prefers-reduced-motion`.
> - **Kebersihan salinan React Bits:** aturan lint proyek dimatikan khusus
>   `src/components/reactbits/**` di `eslint.config.js` (`no-useless-assignment`),
>   supaya `Crosshair.jsx` tetap identik byte-per-byte dengan upstream
>   (`src/content/Animations/Crosshair/Crosshair.jsx`, commit `4dc7b5b`; sudah
>   diverifikasi dengan `diff`). Suite tetap **100 test / 11 berkas**.
> - **Menunggu konfirmasi visual pemilik produk** atas idle baru dan tombol pink
>   di seluruh layar; sisa keputusan: apakah `--border` (2,39:1) cukup untuk tepi
>   panel statis.
>
> **Putaran keenam (4 Nov 2026) — layar pembuka + BUG-013.**
>
> - **Layar pembuka baru (`OPENING`, T-098)** di depan gerbang kamera: hanya
>   wordmark **GRAVITY SLASH** + petunjuk "Klik untuk mulai" di atas Particles dan
>   Crosshair. Seluruh bidang adalah satu tombol (klik di mana saja; Enter/Space
>   dan fokus keyboard jalan). Penjelasan panjang tetap di `CAMERA_GATE`. Layar
>   awal aplikasi kini `OPENING` (`screens.js`, `uiStore.initialScreen`).
> - **BUG-013 diperbaiki:** judul "GRAVITY SLASH" sempat terlihat tanpa animasi
>   1–2 detik karena chunk `ParticleText` baru diunduh saat tirai membuka.
>   Perbaikan: `src/components/reactbitsLoaders.js` (registri `LOADERS` +
>   `preloadBackdrops()`) dipakai untuk memanaskan chunk dari layar pembuka, dan
>   `fallback` `ParticleTitle` disembunyikan (`.intro__title--pending`) sambil
>   tetap memesan tinggi. Terukur: judul statis tidak pernah terlihat.
> - **Pintasan dev** bergeser: `Alt+1` = OPENING, `Alt+2` = CAMERA_GATE,
>   `Alt+3` = IDLE_GLOBE, `Alt+4` = INTRO, dan seterusnya; `Alt+0` = PHOTO.
> - Suite tetap **100 test / 11 berkas**; lint 0 error.
>
> **Putaran ketujuh (4 Nov 2026) — latar React Bits tambahan + BUG-016.**
>
> - **Topography** dan **GradientASCII** disalin apa adanya dari repo resmi React
>   Bits (commit `4dc7b5b`, terverifikasi identik byte-per-byte) dan dipasang:
>   `TopographyBackdrop` di **CAMERA_GATE**, `AsciiBackdrop` (`shape="eclipse"`)
>   di **GAME_OVER** dan (`shape="rise"`) di **NAME_ENTRY**. Warna Gradien ASCII
>   memakai `[violet, pink, putih]`. Keduanya `import()` dinamis lewat
>   `reactbitsLoaders.js`; hanya `topography` yang ikut dipanaskan dari layar
>   pembuka (lihat `preloadBackdrops`). Keduanya WebGL2 dan tidak membawa
>   dependensi pihak ketiga (kanvas mentah), jadi **tidak ada paket baru**.
> - **Fallback statis + scrim.** Tiap pembungkus memakai `.screen__bg` baik saat
>   animasi jalan maupun saat jatuh ke fallback, dengan gradien CSS statis dan
>   lapisan `::after` (scrim) supaya lapisan latar tidak pernah kosong dan kontras
>   teks aman. `prefers-reduced-motion` memakai fallback statis (0 kanvas).
> - **BUG-016 diperbaiki:** ketiga latar WebGL (termasuk **Particles** yang sudah
>   ada) kosong di dev server karena `<StrictMode>` memasang efek dua kali
>   sementara komponen menutup konteks WebGL di pembersihnya. Perbaikan:
>   `src/utils/webglStrictModeGuard.js` (dev-only, dipanggil dari `main.jsx`)
>   mengabaikan `loseContext()` yang datang saat kanvas masih tercantum di
>   dokumen, sehingga pembersihan asli saat layar dilepas tetap jalan. Ini juga
>   memulihkan **Particles** yang sejak awal kosong di dev; lihat BUGLIST.md
>   BUG-016.
> - Verifikasi headless: latar bergerak (selisih piksel tangkapan CAMERA_GATE
>   15,4%, GAME_OVER 2,2%, NAME_ENTRY 3,0%), `lost: false`, 0 error konsol,
>   reduced-motion statis. Suite tetap **105 test / 12 berkas**; lint 0 error;
>   build produksi mencakup chunk `Topography` 37,00 kB dan `GradientASCII`
>   20,78 kB.
> - **Menunggu konfirmasi visual pemilik produk** atas penempatan dan props
>   ketiga latar (warna, kepadatan, bentuk Gradien ASCII).
>
> **Putaran kedelapan (4 Nov 2026) — Ghost Fibers lebih terlihat + layar Menu/Idle di tengah.**
>
> - **Ghost Fibers** (React Bits gratis, verbatim, commit `4dc7b5b`, terverifikasi
>   identik byte-per-byte) disalin ke `src/components/reactbits/`. Ia dipasang lewat
>   `GhostFibersBackdrop({ variant })` di `Backgrounds.jsx` dengan dua setelan:
>   `opening` (lebih terang/cepat) dan `menu` (lebih redup/pelan) — jadi **Opening
>   dan Menu** sekarang memakai latar serat cahaya violet→pink alih-alih
>   Particles/Pattern Waves. Satu latar animasi per layar tetap dijaga.
> - **Hover tangan di layar idle (T-141).** Modul baru `src/utils/handPointer.js`
>   menjalankan `HandTrackingAdapter` yang sama di layar mulai; ujung telunjuk
>   menggerakkan crosshair dan mengunci wordmark/tombol, tetapi **tidak bisa
>   menekan atau memulai apa pun** (tidak ada `pointerdown`/`click`). Mulai tetap
>   lewat tombol Mulai/Enter/iris mouse. Pratinjau kamera memakai stream adapter
>   yang sama.
> - **Revisi pemilik produk (4 Nov 2026).** Tiga temuan: (a) serat Ghost Fibers
>   kurang terlihat — scrim khusus latar itu dilonggarkan di `ui.css` dan
>   `glow`/`sparkle`/`particles`/`brightness` dinaikkan serta `gradient` dibuat
>   `across`/`along` supaya untaian terbaca dua warna; (b) hover tangan sempat
>   memicu start sendiri — jalur "lambai cepat = mulai" **dibuang** dari
>   `handPointer.js`, jadi tangan murni untuk membidik; (c) layar **Intro**
>   terbaca seperti layar loading — komposisinya ditengahkan dan diperbesar
>   (**T-142**), bilah progres 6 px berwarna pink, nomor aturan besar, tombol
>   Lewati jadi tombol nyata, plus selubung lembut di belakang konten. Judul
>   partikel tetap beranimasi (tidak ada gerak yang dihapus).
> - **Menu & Idle ditengahkan (T-141).** Menu kini satu kolom di tengah (judul,
>   pratinjau kamera, tombol Main/Foto/Leaderboard, papan skor, fakta, meta);
>   ajakan bermain di Idle juga ditengahkan.
> - Suite tetap **105 test / 12 berkas**; lint 0 error. Build produksi menambah
>   chunk `GhostFibers` 26,94 kB (malas, tidak masuk bundel awal); `PatternWaves`
>   18,99 kB tetap dibundel walau Menu tidak lagi memakainya (komponen tidak
>   dihapus). Probe headless: Opening/Menu 60 FPS, 0 error konsol; reduced-motion
>   jatuh ke `.backdrop--fibers` statis (0 kanvas animasi).
> - **Menunggu konfirmasi visual pemilik produk** atas penempatan dan props
>   Ghost Fibers di Opening dan Menu, dan atas uji hover tangan dengan kamera
>   sungguhan (headless tidak bisa menjalankan MediaPipe).

> **Putaran kesembilan (4 Nov 2026) — Game Over hidup, perpindahan halus, tangan lebih responsif.**
>
> Empat temuan dari uji manual pemilik produk (screenshot + catatan):
>
> - **Game Over terbaca statik (T-143).** Latar Gradient ASCII `eclipse` terlalu
>   tenang sehingga pemain bingung "ini apa". Diganti **Flux Lines** (React Bits
>   gratis, verbatim, commit `4dc7b5b`, terverifikasi identik byte-per-byte):
>   aliran garis violet→pink yang bergerak terus. Judul tetap **Blur Text**.
> - **Perpindahan antar-layar "kecut" (BUG-018, T-143).** Bukan potongan keras
>   (itu BUG-003), melainkan latar layar baru yang masuk **±300 ms terlambat**.
>   Akar masalah diukur di build produksi: `React.lazy` menangguhkan render
>   pertama dan React baru mencoba ulang ±300 ms kemudian, tepat saat tirai sudah
>   membuka. Diperbaiki dengan membuang `lazy()`/`<Suspense>` dan menyimpan
>   komponen yang sudah dimuat di `reactbitsLoaders.js`, sehingga kanvas masuk
>   DOM di frame yang sama dengan pergantian layar. Verifikasi headless seluruh
>   alur: **0 frame tanpa kanvas latar** saat reveal (sebelumnya ada jendela
>   ±300 ms), jeda frame terbesar 69 ms, tanpa main thread terblokir.
> - **Hand tracking lebih responsif (T-144).** `detectHz` 30 → 45,
>   `staleHoldMs` 200 → 140, `smoothingAlpha` 0,6. Menunggu uji manual kamera
>   nyata.
> - Suite tetap **105 test / 12 berkas**; lint 0 error / 8 peringatan lama. Build
>   produksi menambah chunk `FluxLines` 11,08 kB (malas) dan tetap memisahkan
>   `Topography` 37,00 kB, `vendor-ogl` 53,01 kB.
> - **Menunggu konfirmasi visual pemilik produk** atas Game Over baru
>   (Flux Lines + Blur Text) dan kehalusan perpindahan layar.

> **Putaran kesepuluh (5 Nov 2026) — verifikasi reveal PROD mencakup SEMUA layar.**
>
> Melanjutkan daftar "Lanjutan yang belum dikerjakan" (poin 4). Alur prod diukur
> ulang dengan `probe-flow3.mjs` (dikendalikan dari Node, progres per langkah),
> dua jalur: **RUN A** Opening → CameraGate → IdleGlobe → Intro → Menu → Game →
> Game Over → **NAME_ENTRY** → Menu; **RUN B** Opening → … → Menu →
> **LEADERBOARD** → Menu → **PHOTO** → Menu. Semua langkah tercapai, **0 error
> konsol**, dan tiap segmen `sweep--reveal` punya **0 frame tanpa latar**
> (`zeroBg=0`) dengan kanvas latar sudah ada di frame reveal pertama
> (`bgFirst=1`) — jeda frame terbesar **57 ms**:
>
> | Layar | `bgFirst` | `zeroBg` | catatan |
> |---|---|---|---|
> | CameraGate (`screen`) | 1 | 0 | Topography |
> | IdleGlobe | 1 | 0 | Astral + Crosshair |
> | Intro | −1 | — | tanpa `.screen__bg` **memang desain** |
> | Menu (×3) | 1 | 0 | Ghost Fibers (menu) |
> | Game | −1 | — | **tanpa latar animasi, memang aturan** |
> | Game Over | 1 | 0 | Flux Lines |
> | NameEntry (`screen`) | 1 | 0 | Gradient ASCII `rise` |
> | Leaderboard | 1 | 0 | GlyphRain |
> | Photo | −1 | — | tanpa latar **memang desain** (PRD 14.6) |
>
> Catatan alat: layar NAME_ENTRY tidak punya kelas khas (root hanya `screen`),
> jadi deteksi dipakai `.name__title`. Foto di headless menunjukkan status galat
> kamera (tidak ada perangkat) tetapi reveal-nya tetap bersih.
>
> **Putaran kesebelas (5 Nov 2026) — optimasi LCP + layout mobile/iPad (B-01).**
>
> - **LCP (dikonfirmasi pemilik produk: "sudah jadi 1,2 s").** Aturan
>   `manualChunks` untuk `node_modules/motion` membuat rolldown menambatkan
>   `vendor-motion` sebagai **import statis** entry + `<link rel="modulepreload">`
>   di `index.html`, sehingga 46 kB gzip `motion` — yang hanya dipakai Blur Text
>   di layar Game Over — menahan paint pertama. Aturan dihapus; `motion` tinggal
>   di chunk dinamis `BlurText`. Terukur (throttle ala Lighthouse di
>   `vite preview`): median **1.468 → 1.272 ms**; tanpa throttle ±108 ms. Dev
>   server (±22 s) **tidak mewakili apa pun**. Uji coba "panaskan chunk saat
>   gestur pertama" diukur **tanpa perbaikan** dan justru melemahkan jaminan
>   transisi (BUG-018) → **dikembalikan**. Detail: ARCHITECTURE bagian 14 & 15.
> - **Layout mobile/iPad (FR-16 / B-01, bonus yang kini dikerjakan).** PRD
>   sebelumnya menandai mobile sebagai bonus dan "tidak boleh menghambat
>   keputusan desain desktop"; pemilik produk memintanya sekarang. Pemilik
>   produk mengonfirmasi 5 Nov 2026: **"untuk mobile dan iPad sudah bisa work"**.
>   Tiga hal yang
>   tidak bisa diturunkan dari layout desktop ditambahkan **tanpa mengubah
>   tampilan desktop**:
>   1. **Area aman** (`viewport-fit=cover` + `env(safe-area-inset-*)` di
>      `tokens.css`, dipakai lewat `max(nilai lama, inset)` di `ui.css`) untuk
>      notch, sudut membulat, dan home indicator. Kanvas Game tetap penuh layar;
>      hanya HUD dan pratinjau kamera yang mundur.
>   2. **Target sentuh ≥44 px** (WCAG 2.2 AA 2.5.8) khusus `(hover: none) and
>      (pointer: coarse)`: `.icon-btn`/`.icon-btn--tiny`, `.btn--small`,
>      `.link-btn`. Tampilan desktop tidak berubah.
>   3. **Tinggi pendek** (ponsel lanskap ≤560 px) menggeser soal Game dan
>      merapatkan padding; **ponsel sempit ≤560 px** merapatkan HUD dan mengecilkan
>      pratinjau kamera.
> - **Pratinjau kamera diperbesar** atas permintaan pemilik produk ("supaya
>   player bisa lihat dirinya"), 5 Nov 2026. `.camera-preview__frame` dari
>   168 px tetap menjadi `clamp(180px, 15vw, 240px)`; ponsel sedang 150 px,
>   ponsel sempit `min(132px, 38vw)`, lanskap pendek 132 px. Terukur:
>   laptop 1440 → 216×162, iPad 834/1194 → 180×135, iPhone 390 → 132×99
>   (sebelumnya 88), sempit 320 → 121×91. Masih bisa disembunyikan lewat
>   tombol FR-15.
> - **Verifikasi headless (`probe-mobile.mjs`, dev + Alt+1..0).** Sepuluh layar ×
>   lima viewport (iPad 1194×834 & 834×1194, iPhone 390×844, ponsel lanskap
>   844×390, sempit 320×640): **nol overflow horizontal**, nol elemen keluar
>   layar, nol pergantian layout mendadak. Temuan "kecil" hanya `input` radio
>   1×1 yang memang disembunyikan (tap target-nya `label.photo__chip`/
>   `label.photo__switch`, sudah 44 px). Safe-area tidak bisa diemulasi headless
>   (inset = 0), tetapi `max()` terbukti no-op saat inset 0.
> - Suite tetap **105 test / 12 berkas**; lint 0 error; build produksi
>   (`index.css` 34,38 kB / gzip 7,28 kB, `index.js` 305,75 kB / gzip 96,75 kB).
>
> **Putaran kedua belas (6 Nov 2026) — papan skor Menu jadi target penonton.**
>
> Permintaan pemilik produk: "munculkan leaderboard di menu supaya menarik para
> penonton mengalahkan highscore". Papan skor Menu diubah dari ringkasan 3 baris
> menjadi target yang jelas:
>
> - `Menu.jsx`: `getTop(3)` → `getTop(5)`; peringkat 1 tetap jadi sorotan besar
>   (label "Skor terbaik" + angka + nama), lalu tangga peringkat 2–5.
> - Baris ajakan baru `.menu__challenge` — **"Kalahkan skor ini"** — memakai
>   aksen pink yang sama dengan tombol **Main**, sehingga target dan cara
>   mengejarnya terbaca sebagai satu pasangan. Tanpa skor, papan menampilkan
>   **"Belum ada skor — jadilah yang pertama."** dan ajakan disembunyikan.
> - Terverifikasi headless dengan 6 skor seed (`probe-menu.mjs`): di laptop dan
>   iPhone tampil hero + 4 baris tangga, warna ajakan `rgb(255,119,188)`
>   (= `--accent-2`), **0 overflow horizontal**, 0 error konsol. Keadaan kosong
>   diuji terpisah dan benar.
> - **Dipindah ke kolom kanan (pemilik produk, 6 Nov 2026: "mending taro di
>   samping kanan apa di tengah? biar terlihat besar gitu").** Jawaban: **kanan**.
>   Kalau di tengah, papan berebut ruang vertikal dengan judul dan tombol sehingga
>   ukurannya selalu ketahan; di kolom kanan ia punya ruang sendiri dan bisa besar.
>   `.menu__stage` (satu kolom tengah) diganti `.menu__grid` (dua kolom,
>   `minmax(0, 1fr) minmax(300px, 360px)`) berisi `.menu__main` (identitas + aksi)
>   dan `.menu__aside` (panel papan). Rincian panel: `--bg-raised` 66%, `--border`,
>   `--radius-lg`, `--shadow-md`, `blur(14px)`. Skor hero naik `4.6rem → 5.2rem`
>   (laptop → 83px), `.menu__top` jadi `width: 100%`. Di bawah 860px kembali satu
>   kolom. Terukur (`probe-menu2col.mjs`): laptop + iPad lanskap dua kolom, iPad
>   potret + iPhone bertumpuk, **0 overflow, 0 error**; screenshot laptop/iPad/ponsel
>   + keadaan kosong diperiksa.
> - Suite tetap **105 test / 12 berkas**; lint 0 error; build produksi
>   (`index.css` 34,93 kB / gzip 7,36 kB, `index.js` 306,14 kB / gzip 96,83 kB).
>
> **Putaran ketiga belas (7 Nov 2026) — pratinjau kamera Game lebih besar & tidak terpotong.**
>
> Permintaan pemilik produk: "bisa dibuat lebih besar ga ya layar preview pas lagi
> main supaya yang main bisa liat dirinya dan ga out of frame". Dua masalah
> sekaligus:
>
> - **Terpotong.** Kamera Game meminta `1280×720` (16:9) tetapi bingkai pratinjau
>   4:3 dengan `object-fit: cover` memotong ±25% lebar. Pemain yang berdiri agak
>   ke tepi tetap dilacak tetapi **tidak terlihat** di pratinjau. `.camera-preview__video`
>   diganti ke `object-fit: contain`; seluruh bidang kamera selalu tampak.
>   Pratinjau kini identik dengan bidang yang dilihat pelacak tangan.
> - **Ukuran.** Bingkai Game jadi `16 / 9` dan lebih besar: `clamp(240px, 22vw, 360px)`
>   (laptop 1440 → **317×178**, dulu 216×162), ponsel ≤560px `min(196px, 50vw)`
>   (iPhone 390 → **195×110**, dulu 132×99), lanskap pendek `clamp(150px,26vw,180px)`.
>   Ukuran khusus Game memakai `:where(.game)` supaya spesifisitasnya sama dengan
>   aturan dasar — media query kecil tetap bisa mengecilkannya, dan **Menu/Idle
>   tidak berubah** (tetap 4:3 216×162).
> - Terukur (`probe-gamepreview.mjs`): laptop 317×178, iPad lanskap 263×148,
>   iPad potret 240×135, iPhone 195×110, ponsel lanskap 180×101, sempit 320 →
>   160×90. Semua **0 overflow, 0 error konsol**, rasio `16/9`, `object-fit: contain`.
> - Suite tetap **105 test / 12 berkas**; lint 0 error; build produksi
>   (`index.css` 35,21 kB / gzip 7,42 kB, `index.js` 306,14 kB / gzip 96,82 kB).

> **Putaran keempat belas (7 Nov 2026) — konfirmasi mode tangan + musik seluruh sesi.**
>
> Permintaan pemilik produk: "apakah possible bisa pilih pakai tangan juga setelah
> menyalakan kamera? kayak hold dulu 3-5 detik untuk konfirmasi terus juga musicnya
> main aja dari awal sampai akhir pas lagi main juga nyala". Dua keputusan diambil
> lewat pertanyaan: konfirmasi = **tahan tangan di layar idle**, musik = **seluruh
> sesi**.
>
> - **Tahan tangan 3 detik (konfirmasi mode tangan).** `useHandPointer` sekarang
>   juga melaporkan `present`, dan hanya berubah saat tangan masuk/keluar frame
>   (bukan tiap frame). `IdleGlobe` menjalankan dwell di rAF sendiri, mengisi bilah
>   pink lewat ref (tanpa render React per frame), lalu lanjut ke Intro saat penuh.
>   Tangan hilang → bilah balik ke nol. Ambang di `CONFIG.hand.confirmHoldMs`
>   (3000 ms). Tombol **Mulai**, Enter, dan iris mouse tetap jalan tanpa menahan
>   tangan. Menahan diam dipilih supaya tidak bentrok dengan lambaian tak sengaja
>   yang dulu memicu start sendiri (T-141).
> - **Bilah dipindah ke tengah.** Percobaan pertama menaruh blok tahan di sudut
>   pratinjau kamera; terukur melebar sampai 348 px dan menabrak konten di iPad
>   potret/lanskap. Blok kini berada di dalam `.idle__content`
>   (`width: min(100%, 34ch)`), jadi ikut sumbu tengah dan tidak pernah menembus
>   konten. Terukur (`probe-hold.mjs`): laptop 1440 343×58, iPad potret 326×32,
>   iPhone 390 326×32, lanskap 844×390 326×32, sempit 320 272×53 — semuanya **di
>   dalam konten, 0 overflow, 0 error konsol**.
> - **Musik seluruh sesi.** `App.jsx` memanggil `audio.unlock()` lalu
>   `audio.startMusic()` pada gestur pertama, dan Menu tidak lagi menghentikannya.
>   Tidak ada pemanggil `stopMusic` di luar `services/audio.js` dan test-nya, jadi
>   musik berjalan dari opening sampai foto. Sudah diukur: `music.mp3` terambil
>   setelah keydown pertama (0 sebelum gestur) dan tidak ada permintaan ulang.
> - **Verifikasi.** `npm run lint` 0 error / 8 warning (fast-refresh bawaan),
>   `npm run test` **105/105 lulus**, build produksi `index.css` 35,63 kB /
>   gzip 7,47 kB dan `index.js` 307,12 kB / gzip 97,15 kB.
> - **Belum bisa diuji headless:** dwell tangan butuh kamera + tangan nyata, jadi
>   pemilik produk perlu mencoba di perangkat.

> **Putaran kelima belas (7 Nov 2026) — campuran SFX, alur layar baru, perbaikan "Jepret lagi".**
>
> Permintaan pemilik produk: "sfx jawaban salah dan bom besar sekali, coba
> dikecilin terus slashnya dibesarin gapapa, healnya juga terdengar kecil", plus
> "ganti warning privacy pas di awal buka website", halaman gerbang diubah jadi
> halaman uji hover + tahan 3–5 detik sebelum loading lalu Menu, tombol kembali
> ke layar pertama (tanpa minta izin kamera lagi), dan "fitur jepret lagi bug
> gabisa jepret ga muncul".
>
> - **Campuran volume SFX.** `CONFIG.audio.sfx` ditambahkan di `gameConfig.js`:
>   `slash 1.4`, `correct 1`, `wrong 0.4`, `bomb 0.4`, `heal 1.8`,
>   `gameOver 1`. `audio.play(name)` memakai nilai itu bila pemanggil tidak
>   mengirim `volume` (pemanggil lama tidak diubah). Nilai > 1 sah untuk berkas
>   yang direkam pelan seperti `heal`.
> - **Alur baru: Pembuka → Uji tangan → Intro (loading) → Menu.** Privasi
>   dipindah ke layar pertama (`.opening__privacy`, selubung
>   `color-mix(--bg 82%)`, `pointer-events: none`). `screens/HandTest.jsx`
>   menggantikan `CameraGate.jsx` + `IdleGlobe.jsx` (keduanya dihapus):
>   latar **Topography** + **Crosshair**, tombol **Nyalakan kamera**,
>   pratinjau dari stream adapter yang sama, hover bidik, bilah tahan
>   (`CONFIG.hand.confirmHoldMs` 3 detik) yang mengisi di rAF tanpa render per
>   frame, tombol **Tanpa kamera** → Intro, tombol **Kembali ke layar pembuka**
>   → Opening, serta **Coba lagi** lewat `retryKey` di `useHandPointer`. Menu
>   dan layar Game kini menautkan **Ubah mode input** ke `HAND_TEST`.
>   `SCREENS.CAMERA_GATE`/`IDLE_GLOBE` diganti `SCREENS.HAND_TEST`,
>   `SCREEN_CHUNKS.HAND_TEST = ['topography','crosshair']`, dan
>   `DevShortcuts.ORDER` berisi 9 layar (Foto = **Alt+9**).
> - **Intro jadi layar loading.** `Intro.jsx` tidak berubah isinya; ia kini
>   berjalan setelah hold tangan dan sebelum Menu (8,2 detik atau **Lewati**).
> - **Bersih-bersih.** `useSwipeToStart` dihapus dari `utils/env.js` (tidak ada
>   pemakai lagi), blok CSS `.idle*` diganti `.handtest*`, `.hold-meter*` dibuat
>   netral layar, `.gate__title/lead/panel/panel-title/list` dibuang, dan
>   jendela lanskap pendek memakai grid dua kolom (teks+tombol kiri, pratinjau
>   kanan) karena satu kolom setinggi 390 px terpotong.
> - **"Jepret lagi" diperbaiki (BUG-019).** Video pratinjau dijeda peramban
>   saat elemennya dicabut dari DOM di fase hasil; pratinjau kembali beku dan
>   frame tangkapan kedua basi/kosong. `CameraStage`/`CameraPreview` kini
>   meminta `video.play()` lagi saat menempel ulang, dan `Photo.capture`
>   menunggu frame segar bila `readyState < 2`.
> - **Verifikasi.** `npm run lint` 0 error / 8 warning (fast-refresh bawaan),
>   `npm run test` **105/105 lulus**, build produksi `index.css` 35,71 kB /
>   gzip 7,56 kB dan `index.js` 303,15 kB / gzip 95,96 kB. Probe
>   `probe-handtest-layout.mjs` di 1440×900, 834×1194, 390×844, 844×390,
>   320×640: **0 overflow, 0 anak terpotong, 0 error konsol**, pratinjau
>   1280×720 tampil, peringatan privasi tidak menabrak "Klik untuk mulai".
>   Probe alur (dev + preview) membuktikan Pembuka → Uji tangan → Kembali →
>   Uji tangan → Tanpa kamera → Intro → Menu → Ubah mode input → Uji tangan.
>   Fake camera di dev dan preview: `hasil1 true`, `video2 {paused:false}`,
>   `hasil2 true`, 0 error konsol.
> - **Belum bisa diuji headless:** tahan tangan 3 detik butuh kamera + tangan
>   nyata; area aman iPad/iPhone juga tidak bisa ditiru headless.

> **Putaran ketujuh belas (7 Nov 2026) — deteksi lengan dan hover tersendat.**
>
> Laporan pemilik produk: "lag pas hovering, bugnya itu kalo dari jauh mungkin
> kan warnanya sama ya kayak lengan kadang dia ngedetect lengan bukan indexnya,
> kalo bisa di optimize webnya supaya ga ngelag pas hovering + hoveringnya juga
> ga patah-patah".
>
> - **Lengan bukan tangan (BUG-020).** Worker dulu hanya mengirim landmark 8,
>   jadi setiap hasil MediaPipe langsung menjadi pointer. Sekarang worker
>   mengirim skor `handedness`, panjang telapak, dan rasio jangkauan telunjuk
>   (3D, supaya telunjuk yang menunjuk ke kamera tidak dianggap menggenggam).
>   Adapter menolak deteksi di luar `minHandScore` 0,4 / `minPalmSize` 0,025 /
>   `minIndexReach` 1,3–`maxIndexReach` 3,2. Jalur worker dan jalur cadangan
>   memakai aturan sama; tes baru menutup empat bentuk penolakan + satu kontrol.
> - **Hover tersendat.** Laju deteksi dibuat **adaptif** dari `ms` yang
>   dilaporkan worker (`inferenceBudget` 0,6, lantai `minDetectHz` 15, idle
>   `idleDetectHz` 10 setelah `idleAfterMs`). `useHandPointer` hanya menyuntik
>   `pointermove` saat posisi bergeser ≥ `emitMinMovePx` 1,5 px atau tiap
>   `emitHeartbeatMs` 120 ms, jadi `Crosshair` berhenti menggambar saat tangan
>   diam. `useHoldTarget` tidak lagi menulis `style.transform` yang sama tiap
>   frame.
> - **Verifikasi.** Lint 0 error / 8 warning, **106/106 tes**, build
>   `index.js` 306,71 kB (gzip 97,15). Alur pembuka → tahan wordmark → uji
>   tangan → tahan Lanjut → Intro → Menu → kembali tetap lolos di preview
>   dengan kamera palsu, 0 error konsol.
> - **Menunggu uji perangkat nyata:** deteksi lengan dari jarak 1–1,5 m dan
>   kehalusan hover hanya bisa dinilai dengan kamera + tangan sungguhan.
>   Kalau penyaring terlalu ketat (pointer hilang saat telunjuk setengah
>   menekuk), turunkan `minIndexReach` ke 1,2 lebih dulu.

> **Putaran kesembilan belas (8 Nov 2026) — kehalusan di feed 30 fps.**
>
> Pemilik produk memakai webcam Ausdom lewat OBS Virtual Camera (30 fps) dan
> minta hover lebih halus. EMA lama memakai bobot per **sampel**, jadi kehalusan
> berubah saat laju deteksi turun. Sekarang bobotnya fungsi waktu:
> `alpha = 1 - e^(-dt/tau)` dengan `smoothingTauMs` 40 ms, sehingga 30 fps dan
> 45 fps terasa sama halus. Tes penghalusan +1 (112 total).

> **Putaran kedelapan belas (7 Nov 2026) — kursor tidak mengunci tangan (BUG-021).**
>
> Laporan pemilik produk: "udah lock di jari, terus ada yang mirip di
> sebelahnya, jadi lompat dan ngunci di sekitar; aku pindah dia malah ngunci
> yang di dekat aku tadi". Deteksi tidak berbasis warna — MediaPipe memakai
> landmark bentuk tangan — jadi penyebabnya pencocokan identitas, bukan warna.
>
> - Pencocokan id memakai **posisi ramalan** (posisi mentah + kecepatan,
>   dibatasi `predictMaxSec` 0,2 dtk) dan mencocokkan **semua pasangan** dengan
>   urutan jarak global. Dulu deteksi diproses berurutan keluaran MediaPipe,
>   jadi deteksi palsu di posisi lama bisa mencuri id tangan yang bergerak.
> - **Kursor utama dikunci** (`adapter.primaryId`). Layar pembuka, uji tangan,
>   dan menu memakai `primaryId`, bukan `pointers[0]`, sehingga bidik tidak
>   berpindah ke tangan kedua.
> - Kecepatan untuk ramalan dan coasting dihitung dari posisi **mentah**;
>   posisi terhaluskan tetap dipakai sebagai titik awal coasting.
> - Verifikasi: lint 0 error / 8 warning, **111/111 tes**, build `index.js`
>   308,08 kB (gzip 97,70). Perilaku dengan tangan sungguhan tetap perlu diuji
>   (T-122/T-145).

> **Putaran keenam belas (7 Nov 2026) — kamera dari layar pertama, tahan di wordmark, tombol Lanjut, kembali ke pembuka.**
>
> Permintaan pemilik produk: "izin minta kamera dari awal aja jd gravity slash
> klik untuk mulai bisa tahan 3 detik buat start ato ga biarin aja pemain hover
> kemanapun, nanti mereka perlu hold di tulisan gravity slash", "halaman uji
> tangan udah bener nanti biarin mereka cobain terus ada tombol Lanjut mereka
> perlu hover ke situ dan tahan", "pas loading screen biarin pemain hover aja
> juga gapapa", dan "pas masuk ke menu utama ... adakan tombol kembali ke
> halaman pertama karena ini demo".
>
> - **Kamera menyala sejak layar pembuka.** `Opening.jsx` memakai
>   `useHandPointer({ enabled: true })`, jadi izin kamera diminta begitu halaman
>   dibuka dan pratinjau kecil tampil di bawah wordmark. Saat kamera siap, mode
>   input otomatis `HAND` supaya layar uji langsung memakai kamera yang sama
>   (tidak bertanya dua kali). Status kamera juga ditulis ke `uiStore`.
> - **Mulai = tahan di wordmark.** `src/utils/useHoldTarget.js` (baru) mengisi
>   bilah pink selama bidik berhenti di `.opening__start` (±3 detik,
>   `CONFIG.hand.confirmHoldMs`). Hover ke mana saja tetap bebas. Tanpa tangan,
>   tombol harus ditekan-ditahan; **klik biasa dan Enter/Space tetap memulai**
>   agar mouse/keyboard tidak pernah buntu.
> - **Uji tangan: tombol Lanjut.** Tahan-di-mana-saja dibuang. Pemain bebas
>   mencoba bidik, lalu berhenti di tombol **Lanjut** dan menahannya ±3 detik
>   (bilah pink di dalam tombol). Klik mouse juga lanjut. Urutan setelahnya
>   tetap: loading (Intro) → Menu.
> - **Loading screen:** tidak ada aksi tahan di Intro; hover bebas, **Lewati**
>   tetap tombol biasa.
> - **Menu:** tautan **Kembali ke layar pembuka** ditambahkan di `menu__meta`
>   (khusus demo) — kembali ke layar pertama tanpa memuat ulang halaman, kamera
>   pembuka menyala lagi.
> - **Layout.** `.opening` sekarang kolom flex (isi di tengah, privasi di alur
>   dokumen, bukan `absolute`), jadi privasi tidak bisa menimpa pratinjau. Di
>   lanskap ≤560 px bingkai kamera pembuka disembunyikan (crosshair tetap
>   tampil) supaya wordmark + bilah + privasi muat. Terukur
>   `probe-hold-layout.mjs` di 1440×900, 834×1194, 390×844, 844×390, 320×640:
>   **0 overflow, 0 anak terpotong, 0 error konsol**, tombol Lanjut 171×71 px di
>   dalam konten.
> - **Alur terverifikasi headless** (preview, kamera palsu): kamera langsung
>   hidup di pembuka (video 1280×720), tahan wordmark 3,4 dtk → uji tangan,
>   tombol Kembali → pembuka, klik wordmark → uji tangan, tahan Lanjut 3,6 dtk
>   → Intro → Menu, tombol Menu kembali → pembuka. **0 error konsol.**
> - **Verifikasi.** `npm run lint` 0 error / 8 warning (fast-refresh bawaan),
>   `npm run test` **105/105 lulus**, build produksi `index.css` 36,45 kB /
>   gzip 7,66 kB dan `index.js` 305,41 kB / gzip 96,53 kB.
> - **Catatan biaya:** model deteksi tangan sekarang dimuat di layar pertama
>   (konsekuensi "izin kamera dari awal"). Bundel awal tidak berubah, tetapi
>   unduhan aset MediaPipe mulai lebih awal; kalau LCP di jaringan lambat jadi
>   keluhan, tunda `useHandPointer` sampai gestur pertama.
> - **Belum bisa diuji headless:** menahan dengan tangan sungguhan (butuh kamera
>   nyata) dan area aman iPad/iPhone.

---

## Lanjutan yang belum dikerjakan (catat 4 Nov 2026)

Dihentikan atas permintaan pemilik produk ("lanjut nanti"). Urutan yang disarankan
saat melanjutkan:

1. ~~**Konfirmasi arti "animasi ke-skip".**~~ **Terjawab 5 Nov 2026: sudah hilang
   dan bagus.** Pemilik produk mengonfirmasi keluhan hilang, jadi kedua perbaikan
   (T-144 respons tangan + BUG-018 latar masuk se-frame) dianggap tepat. Tidak
   perlu tindakan lanjutan; item ditutup.
2. ~~**Konfirmasi visual pemilik produk.**~~ **Terjawab 5 Nov 2026: "visualnya
   sudah bagus."** Game Over baru, kehalusan transisi, Ghost Fibers, dan restyle
   Intro diterima. Item ditutup.
3. ~~**Uji manual kamera & tangan sungguhan (T-122).**~~ **Terjawab 5 Nov 2026:
   "sudah ok."** T-144 (`detectHz` 45, `staleHoldMs` 140, `smoothingAlpha` 0,6)
   terbukti enak di perangkat nyata. Item ditutup.
4. ~~**Verifikasi reveal PROD untuk layar yang belum dikunjungi alur uji:**
   `NAME_ENTRY`, `LEADERBOARD`, `PHOTO`.~~ **Selesai 5 Nov 2026** — lihat
   paragraf putaran kesepuluh di bawah.
5. **Uji manual layar Photo (T-137)** — pemilik produk belum mengeceknya ("aku
   belum uji manual layar"). Masih menunggu.
6. ~~**F9: impor 7 berkas `.mp3`** ke `public/audio/`.~~ **Diimpor 5 Nov 2026 dan
   terverifikasi** (7/7 terambil di produksi, semua terdekode & terputar; lihat
   catatan aset di bagian F9). Sisa: pemilik produk belum mencatat **sumber &
   lisensi** di `public/audio/CREDITS.md` (wajib PRD 7.4), plus pertimbangan
   memangkas `music.mp3` (4 menit) dan meninjau ulang `slash.mp3` (1,2 s).
7. **Ingat:** setiap `npm run build` perlu **restart `npm run preview`**
   (`vite preview` bisa menyajikan berkas basi). Server saat ini: preview di
   `http://localhost:4173`, dev di `http://localhost:5174` (pintasan Alt+1..0 hanya
   di dev).

---

## Menunggu keputusan pemilik produk

Selesaikan sebelum fase terkait dimulai.

- [x] **Q-01** ~~Orb jawaban benar jatuh tanpa diiris: nyawa tidak berkurang?~~ → **Diputuskan:** timer per soal; soal gagal (timer habis atau orb benar lolos) mengurangi 1 nyawa. Lihat PRD 5.3 & 5.5
- [x] **Q-03** Palet diganti dari referensi jadi 3 warna utama. **Terverifikasi 4 Nov 2026, direvisi hari yang sama:** Marshmallow White `#F0F0F0`, Galactic Violet `#472E97`, Bubblegum Pink `#FF77BC`. Komposisi dominan/pendukung/aksen = **60/30/10**. Tercatat di `tokens.css` → **F1 siap**
- [x] **Q-08** Layar Pengaturan → **Diputuskan: tidak ada di v1.** Mute di HUD, hapus leaderboard di layar Leaderboard
- [x] **Q-02** Pengurang skor jawaban salah = 5 → diputuskan: −5, skor tidak di bawah 0
- [x] **Q-04** Komponen animasi → **Diputuskan: jalur campuran.** Pustaka gratis React Bits (rasa JS-CSS) untuk latar idle, latar menu, teks intro, dan teks game over; ditambah efek original `GlyphRain` untuk latar leaderboard. Sumber diambil sendiri dari repositori resmi. Lihat PRD 7.5
- [x] **Q-05** Rasa komponen dikonfirmasi: **JS-CSS** (JavaScript + CSS biasa, tanpa Tailwind, tanpa TypeScript)
- [x] **Q-13** Lisensi React Bits **Pro tidak dipegang** → Pro **tidak dipakai**. Pustaka gratisnya (MIT + Commons Clause) dipakai, jadi repo publik pun tidak masalah. Lisensi tetap dicatat di `docs/LICENSES.md` (T-018)
- [x] **Q-06** Auto-pause saat tangan hilang → ya; tampilkan instruksi lanjut
- [x] **Q-07** Skill → agent memakai skill yang tersedia lewat tool `skill` di harness OpenCode ini (lihat `AGENTS.md` bagian 4); tidak ada pemasangan manual
- [x] **Q-09** Timer soal → 10 detik awal, minimum 5 detik; countdown 5 detik sebelum game mulai
- [x] **Q-10** Plafon kesulitan → level maksimum 5; kenaikan awal dibuat pelan
- [x] **Q-11** Aset audio → pemilik produk akan mengimpor aset; contoh format kredit diberikan sebelum F9
- [x] **Q-12** Unduh `hand_landmarker.task` + wasm MediaPipe ke `public/` → disetujui
- [x] **Q-14** Fitur **foto/selfie dengan efek** (permintaan pemilik produk 4 Nov 2026). **Terjawab 4 Nov 2026** dan dikodekan sebagai F11 (`PRD.md` bagian 14):
  - **(a) Tempat:** layar **Foto** tersendiri, dibuka dari Menu
  - **(b) Efek:** filter palet, bingkai skor/combo, jejak iris + partikel, latar animasi, stiker teks (semua bisa dinyalakan/dimatikan; filter wajib pilih satu)
  - **(c) Hasil:** **Unduh PNG** selalu ada; **Bagikan** lewat Web Share API bila peramban mendukung
  - **(d) Sumber gambar:** aliran kamera **terpisah** (tanpa MediaPipe), dibuka sendiri oleh layar dan ditutup saat dilepas
  - **(e) Privasi:** tetap diproses **di perangkat saja**, tidak diunggah; skor diambil dari snapshot sesi terakhir

---

## F0 — Setup proyek

- [x] **T-001** Inisialisasi Vite + React (JavaScript)
- [x] **T-002** Pasang ESLint, Prettier, Vitest
- [x] **T-003** Buat struktur folder sesuai `ARCHITECTURE.md` bagian 5
- [x] **T-004** Buat `src/config/gameConfig.js` dengan nilai awal dari PRD
- [x] **T-005** Siapkan `public/models` dan `public/wasm`; unduh `hand_landmarker.task` dan salin wasm dari `node_modules/@mediapipe/tasks-vision`, lalu catat sumber & lisensinya
- [x] **T-006** Pasang store UI (React Context + `useReducer`, tanpa Zustand) dan router layar berdasarkan state
- [x] **T-007** Pastikan dokumen tetap **satu lokasi** di `AGENT-FILES/` (tidak disalin ke root agar tidak ada dua sumber kebenaran)
- [x] **T-008** `ErrorBoundary` global + halaman pemulihan ke Menu
- [x] **T-009** Rute/dev-shortcut sementara menuju layar Game, agar F4–F6 bisa diuji tanpa menunggu F7
- [x] **T-017** Buat `.gitignore`: `node_modules`, `dist`, `.env.local`, dan berkas aset besar. Komponen React Bits bebas masuk repo, jadi **tidak** perlu dikecualikan
- [x] **T-018** Catat di `docs/LICENSES.md`: lisensi React Bits (MIT + Commons Clause), **commit/tag upstream** yang disalin, dan lisensi `GlyphRain` (karya sendiri)

## F1 — Desain visual dan token

- [x] **T-010** Rencana desain singkat (warna, tipografi, layout, prinsip) lewat skill desain yang tersedia (`design-taste-frontend` / `frontend-design-direction`)
- [x] **T-011** Pilih font dan skala tipografi
- [x] **T-012** Buat `styles/tokens.css` (palet, font, spacing)
- [x] **T-013** Desain visual tiap jenis orb: jawaban, bahaya, nyawa
- [x] **T-014** Desain gaya jejak slash dan efek flash (benar, salah, bahaya, nyawa)
- [x] **T-015** Perbaiki **peran token** warna setelah BUG-012: bidang violet digelapkan (`--color-night` `#2e1c63`), aksen violet jadi turunan terang `#aca1d0` (garis/teks), aksi utama pindah ke pink, tepi & teks dinaikkan alfa; kontras WCAG diukur (lihat `BUGLIST.md` BUG-012)

## F2 — Input layer

- [x] **T-020** Kontrak `pointers[]` dan `InputManager` (batas maksimal 2)
- [x] **T-021** `PointerAdapter` mouse
- [x] **T-022** `PointerAdapter` touch (maksimal 2 titik)
- [x] **T-023** `HandTrackingAdapter`: kamera + MediaPipe `numHands: 2`
- [x] **T-024** Ambil hanya landmark 8, mirror sumbu X
- [x] **T-025** Smoothing posisi (EMA atau One Euro)
- [x] **T-026** Penjaga ID tangan agar jejak tidak tertukar
- [x] **T-027** `slashTrail.js`: riwayat posisi dan kecepatan
- [x] **T-028** Penanganan error kamera: ditolak, tidak ada, dipakai aplikasi lain, model gagal dimuat
- [x] **T-029** Test unit untuk smoothing, batas 2 pointer, dan adapter tangan (`HandTrackingAdapter.test.js`, 10 kasus: rantai landmark 8 → pointer → iris, pilihan delegate terukur, pembatalan `start()`, toleransi deteksi meleset, plus jalur worker — worker jadi jalur utama, tips worker jadi pointer yang bisa mengiris, kembali ke main thread saat worker gagal, dan backpressure saat worker belum menjawab)

## F3 — Layar awal

- [x] **T-030** `CameraGate`: penjelasan privasi, tombol aktifkan kamera, tombol mode mouse/touch
- [x] **T-031** `CameraPreview`: pratinjau kecil, bisa disembunyikan
- [x] **T-032** Hubungkan pilihan mode ke `InputManager`

## F4 — Game engine

- [x] **T-040** `questions.js`: generator soal + − × ÷, hasil bulat dan tidak negatif
- [x] **T-041** Generator distraktor (unik, tidak negatif, masuk akal)
- [x] **T-042** Test unit generator soal (termasuk seed deterministik)
- [x] **T-043** `Orb.js` dan fisika gravitasi berbasis `dt`
- [x] **T-044** `Spawner.js`: gelombang 3–4 orb, tepat 1 jawaban benar, jarak minimum antar orb
- [x] **T-045** Spawn orb bahaya (peluang dari config)
- [x] **T-046** Spawn orb nyawa rare (hanya jika nyawa < 3 dan sudah lewat cooldown gelombang)
- [x] **T-047** `collision.js`: segmen vs lingkaran + ambang kecepatan
- [x] **T-048** Test unit collision
- [x] **T-049** `scoring.js`: benar, salah, bahaya, nyawa, combo, soal gagal
- [x] **T-050** Test unit scoring
- [x] **T-051** `GameEngine.js`: loop, pause/resume, event ke UI
- [x] **T-052** Auto-pause: saat tab tidak aktif **dan** saat tangan hilang dari frame (tampilkan instruksi lanjut)
- [x] **T-053** Kesulitan naik tiap N jawaban benar sampai level maksimum
- [x] **T-054** Kondisi game over
- [x] **T-055** Timer soal: hitung mundur, reset tiap soal, jeda saat pause, event `timerChanged`
- [x] **T-056** Soal gagal (timer habis / orb benar lolos): combo reset + nyawa −1
- [x] **T-057** Daur hidup orb: tandai `sliced` semua orb lama saat soal berganti
- [x] **T-058** Test unit timer dan daur hidup orb
- [x] **T-059** Countdown 5 detik sebelum game mulai; timer soal baru berjalan setelah countdown selesai

## F5 — Render dan efek

- [x] **T-060** `renderer.js`: canvas, DPR, urutan gambar
- [x] **T-061** Gambar orb dengan angka yang terbaca jelas
- [x] **T-062** Jejak slash per pointer
- [x] **T-063** Partikel (pakai _object pool_ hanya bila T-114 menunjukkan perlu)
- [x] **T-064** Efek pecah orb saat teriris
- [x] **T-065** Screen shake untuk orb bahaya

## F6 — UI game

- [x] **T-070** `Hud`: nyawa, skor, combo, soal di tengah layar, bilah waktu timer, tombol mute
- [x] **T-070b** Overlay countdown 5 detik sebelum soal pertama
- [x] **T-071** `FlashOverlay`: flash jawaban benar, bahaya, nyawa
- [x] **T-072** Flash **"JAWABAN SALAH"** + angka pengurang skor di titik iris
- [x] **T-073** Layar pause
- [x] **T-074** Layar game over + tombol **Main lagi** + input nama (nama kosong → `PEMAIN`)
- [x] **T-075** Menghormati `prefers-reduced-motion` untuk efek non-gameplay

## F7 — Idle, intro, dan menu

- [x] **T-096** Baca sumber tiap komponen React Bits yang dipakai, lalu catat **daftar dependensi nyatanya** ke `ARCHITECTURE.md` bagian 2 (jangan menebak)
- [x] **T-080** Salin komponen gratis **Particles** (JS-CSS) dari repo resmi React Bits; catat commit upstream di `docs/LICENSES.md`
- [x] **T-081** `IdleGlobe`: pasang Particles sebagai latar, dengan placeholder sementara lebih dulu agar alur bisa diuji
- [x] **T-082** Deteksi swipe di area layar idle untuk memicu intro (aturan sama dengan gameplay)
- [x] **T-083** Salin **Particle Text** (JS-CSS) dan pakai untuk teks intro **GRAVITY SLASH**
- [x] **T-084** Transisi intro → menu
- [x] **T-085** Salin **Blur Text** (JS-CSS) dan pakai untuk teks **GAME OVER** di layar game over
- [x] **T-086** `Menu`: Main, Leaderboard (tanpa Pengaturan di v1) + latar **Pattern Waves** (JS-CSS)
- [x] **T-087** Fallback bila WebGL atau kanvas gagal: latar diganti versi statis, game tetap jalan
- [x] **T-088** Semua komponen animasi dimuat lewat `import()` dinamis agar tidak masuk bundel awal
- [x] **T-089** `GlyphRain` (efek original, canvas 2D) untuk latar layar leaderboard: hujan glyph berlapis, jumlah kolom dibatasi
- [x] **T-095** Versi reduksi `prefers-reduced-motion` untuk keempat komponen React Bits dan `GlyphRain`
- [x] **T-097** Layar idle baru: salin **Crosshair** (React Bits gratis, `import()` dinamis, verbatim) + wordmark **GRAVITY SLASH**, baris penjelasan, dan tombol **Mulai**; layar **menunggu pemain** (tanpa auto-advance), masuk berurutan `idle-rise` yang dimatikan saat `prefers-reduced-motion` _(revisi putaran 14: mode kamera punya satu auto-advance — menahan tangan 3 detik)_
- [x] **T-098** Layar **pembuka** (`Opening.jsx`) di depan gerbang kamera: wordmark + petunjuk "Klik untuk mulai" di atas Particles/Crosshair, seluruh bidang = satu tombol (klik / Enter / fokus keyboard); sekalian memanaskan chunk animasi lewat `reactbitsLoaders.js` (`preloadBackdrops`) untuk **BUG-013**

## F8 — Leaderboard lokal

- [x] **T-090** `services/storage.js`: `getTop`, `isHighScore`, `add`, `clear`
- [x] **T-091** Penanganan `localStorage` gagal atau data rusak
- [x] **T-092** Test unit storage
- [x] **T-093** Layar leaderboard top 10
- [x] **T-094** Tombol hapus data dengan konfirmasi

## F9 — Audio

- [x] **T-099** Sebelum F9, agent menyiapkan **daftar contoh aset + format `public/audio/CREDITS.md`**; pemilik produk memilih dan mengimpor sendiri asetnya
- [x] **T-100** `services/audio.js` (Web Audio API, tanpa Howler) + aktivasi setelah interaksi pertama _(aktivasi kini dari gestur pertama di layar mana pun lewat `App.jsx`, bukan hanya klik di canvas game — lihat BUG-014; 5 unit test di `audio.test.js`)_
- [x] **T-101** Efek: slash, benar, salah, bahaya, nyawa, game over _(slash diputar dari event engine baru `sliced` untuk **setiap** orb teriris, termasuk sisa gelombang lama; benar/salah/bahaya/nyawa/game over dari event `feedback`. Diuji headless: 5 iris → 5× slash + efek hasil yang cocok)_
- [x] **T-102** Musik latar _(hanya di Menu, keputusan pemilik produk; dihentikan saat layar dilepas. BUG-015 menutup balapan start/stop)_
- [x] **T-103** Tombol mute + simpan preferensi _(tombol mute ada di HUD dan Menu; status disimpan di `localStorage`; diuji)_

> **Catatan aset (Q-11) — diperbarui 5 Nov 2026.** Ketujuh berkas `.mp3`
> (`slash`, `correct`, `wrong`, `bomb`, `heal`, `game-over`, `music`) **sudah
> diimpor** pemilik produk ke `public/audio/` dan **terverifikasi**: di build
> produksi aplikasi mengambil 7/7 berkas setelah gestur pertama (0 error konsol),
> dan `services/audio.js` berhasil men-dekode + memutar keenam SFX (`play()` →
> `true`) serta musik (`startMusic()` → `true`). Satu koreksi: `right.mp3` diubah
> jadi `correct.mp3` agar cocok dengan `AUDIO_FILES` (isi berkas tidak diubah).
> **Masih menunggu:** tabel sumber & lisensi wajib diisi di
> `public/audio/CREDITS.md` (PRD 7.4), dan pertimbangan panjang `music.mp3`
> (4 menit, ≈86 MB RAM terdekode) — lihat "Hasil ukur" di berkas itu.
> Kode F9 tetap **gagal dengan tenang** kalau berkas hilang.

## F10 — Penyelesaian

- [ ] **T-110** Uji manual hand tracking: 1 tangan, 2 tangan, 3 tangan (harus diabaikan)
- [ ] **T-111** Uji pencahayaan redup dan terang
- [ ] **T-112** Uji kamera ditolak dan model gagal dimuat
- [x] **T-113** Cek kebocoran: kamera mati, loop berhenti, komponen animasi dilepas saat layar berganti _(headless: track kamera hidup 1→0 di tiap perpindahan layar; rAF aktif 1 di Game → 1 di Menu = hanya latar Menu, tidak ada loop ganda; komponen animasi dilepas)_
- [x] **T-114** Profil performa (FPS dan latensi iris) _(headless mode mouse di layar Game: p50 16,7 ms / p95 16,8 ms / max 16,8 ms, 0 frame terlewat — NFR-01 terpenuhi. Latensi iris dengan kamera asli menunggu T-122)_
- [ ] **T-115** Uji Chrome, Edge, Firefox
- [x] **T-116** Aksesibilitas: fokus keyboard, kontras, reduced motion _(kontras token sudah diukur lewat skrip WCAG setelah BUG-012 — putih/bidang 12,60:1, pink 5,89:1, `--border-strong` 3,21:1; **fokus keyboard** terlihat di OPENING/GATE/IDLE/MENU (garis 3 px pink); **reduced motion** mematikan animasi wordmark, latar statis tanpa kanvas, dan INTRO→MENU ±1700 ms vs ±8200 ms)_
- [ ] **T-117** Tuning keseimbangan game (kecepatan, peluang spawn, skor)
- [x] **T-118** Build produksi dan uji `npm run preview` _(`vite preview` :4173 — MIME benar: `.wasm` → `application/wasm`, `.task` tanpa content-type (dibaca `arrayBuffer`, tetap jalan), `/vendor/vision_bundle.js` → `text/javascript`; alur OPENING→…→PHOTO berjalan, 0 error konsol)_
- [ ] **T-119** Deploy ke hosting statis HTTPS
- [x] **T-120** Uji manual titik rawan yang dipindahkan dari `BUGLIST.md` (mirror kamera, soal duplikat/negatif, nyawa > 3, skor negatif, audio sebelum interaksi, reduced-motion) _(semua titik tertutup bukti: unit test soal/nyawa/skor/`photoStudio` mirror; **audio sebelum interaksi** — `AudioContext` 0 sebelum gestur, `play()` menolak (test) lalu berhasil setelah unlock; reduced-motion diukur)_
- [x] **T-121** Uji performa komponen animasi: satu latar per layar, ukur FPS terhadap NFR-01, dan catat ukuran chunk tiap komponen _(satu latar per layar terkonfirmasi (kanvas bergerak via selisih byte tangkapan: MENU `GhostFibers` sejak putaran kedelapan, LEADERBOARD `GlyphRain`); FPS memenuhi NFR-01 (lihat T-114); ukuran chunk tercatat di keluaran `npm run build` — `ParticleText` 12,55 kB, `PatternWaves` 18,99 kB (tetap dibundel, tidak lagi dipakai Menu), `Particles` 19,41 kB, `BlurText` 6,69 kB, `Crosshair` 7,69 kB; `Topography` 37,00 kB dan `GradientASCII` 20,78 kB ditambahkan di putaran ketujuh, `GhostFibers` 26,94 kB di putaran kedelapan — semuanya chunk malas, tidak masuk bundel awal)_
- [x] **T-122** Uji deteksi tangan dengan **kamera dan tangan sungguhan**: tekan "Mulai" dengan klik mouse (bukan hanya Enter), pastikan tangan terdeteksi, jejak iris muncul, dan orb benar-benar teriris. **Uji juga pada jarak 1–1,5 m** (BUG-011: kamera 1280×720 + ambang keyakinan 0,3) dan pastikan gerakan mulus. **Sekaligus pastikan lag sudah hilang** (animasi orb dan tirai mulus saat tangan aktif) setelah inferensi dipindah ke Web Worker (BUG-008). Kamera palsu headless tidak punya tangan, jadi langkah ini wajib dilakukan manual di desktop _(**Dikonfirmasi pemilik produk 5 Nov 2026: "sudah ok"** — termasuk rasa "respons cepat" dari setelan T-144. Lag BUG-008 dan ambang BUG-011 ikut tervalidasi di perangkat nyata)_

## F11 — Fitur Foto / selfie dengan efek (v1.1, permintaan pemilik produk 4 Nov 2026)

Spesifikasi lengkap ada di `PRD.md` bagian 14. Keputusan pemilik produk: layar **Foto** tersendiri dari Menu; layar membuka kamera sendiri; data skor/slash dari **sesi terakhir**; jepret lewat **tombol + hitung mundur 3 detik**; hasil **unduh PNG** dan **bagikan (Web Share API)**; efek: filter palet, bingkai skor/combo, jejak slash + partikel, latar animasi, stiker teks.

- [x] **T-130** `services/storage.js`: simpan/baca snapshot sesi terakhir (`gravityslash:lastsession:v1` → `{ score, level, bestCombo, date }`) dengan `try/catch` seperti data lain + test unit
- [x] **T-131** `engine/photoStudio.js` (murni, tanpa React): komposisi 1080×1080, crop cover, mirror sumbu X, filter palet, bingkai skor/combo, jejak slash + partikel, latar animasi, stiker teks + test unit
- [x] **T-132** `services/share.js`: `shareOrDownload(blob, filename)` memakai `navigator.canShare`/`share`, fallback unduh lewat `<a download>` + test unit
- [x] **T-133** `screens/Photo.jsx`: buka kamera sendiri lewat `useCameraPreview`, panel pilihan efek, tombol **Jepret** + hitung mundur 3 detik, tampilan hasil, Unduh/Bagikan/Jepret lagi, dan kasus kamera ditolak
- [x] **T-134** Gaya kelas `photo*` di `styles/ui.css`: kontrol efek, tombol jepret, hitung mundur (tanpa denyut saat `prefers-reduced-motion`), fokus terlihat
- [x] **T-135** Rute `SCREENS.PHOTO` di `App.jsx`, tombol **Foto** di `Menu.jsx`, dan tambah layar ini ke `DevShortcuts.jsx` (**Alt+0**)
- [x] **T-136** Simpan `bestCombo` saat game over (`Game.jsx`) ke snapshot sesi terakhir, agar bingkai foto punya angka
- [ ] **T-137** Uji manual: buka Foto dari Menu, izinkan kamera, pilih tiap efek, jepret, unduh PNG, coba Bagikan di perangkat yang mendukung, dan uji kasus kamera ditolak

## F12 — Latar React Bits tambahan (permintaan pemilik produk 4 Nov 2026)

- [x] **T-138** Salin **Topography** (React Bits gratis, verbatim, commit `4dc7b5b`) + `GradientASCII` ke `src/components/reactbits/`; pasang lewat pembungkus `TopographyBackdrop` (CAMERA_GATE) dan `AsciiBackdrop` (`eclipse` di GAME_OVER, `rise` di NAME_ENTRY); `import()` dinamis lewat `reactbitsLoaders.js`; fallback statis + scrim `.screen__bg::after`; warna Gradien ASCII `[violet, pink, putih]`
- [x] **T-139** Perbaiki **BUG-016** (StrictMode mematikan konteks WebGL saat pemasangan ganda → latar WebGL kosong di dev) dengan `src/utils/webglStrictModeGuard.js` dev-only, dipanggil dari `main.jsx` sebelum render
- [x] **T-140** Salin **Ghost Fibers** (React Bits gratis, verbatim, commit `4dc7b5b`) ke `src/components/reactbits/`; pasang lewat `GhostFibersBackdrop({ variant })` (`opening` di **Opening**, `menu` di **Menu**, setelan berbeda supaya tidak kembar); `import()` dinamis lewat `reactbitsLoaders.js`; fallback statis `.backdrop--fibers` + scrim `::after`; warna brand dari `readToken` (`violet` → `glowColor`, `pink` → `secondaryColor`). Pattern Waves tetap terdaftar (tidak dihapus) walau Menu tidak lagi memakainya
- [x] **T-141** Tengahkan layar **Menu** (satu kolom: judul, pratinjau kamera, tombol Main/Foto/Leaderboard, papan skor, fakta, meta) dan ajakan bermain di **Idle**; tambah hover tangan di Idle lewat `src/utils/handPointer.js` (`useHandPointer`) — ujung telunjuk menggerakkan crosshair dan mengunci target, **tidak bisa menekan atau memulai** (tidak ada `pointerdown`/`click`, dan jalur "lambai cepat = mulai" dibuang setelah getaran tangan sempat memicu start); mulai tetap lewat tombol Mulai/Enter/iris mouse; pratinjau kamera memakai stream adapter yang sama _(direvisi putaran keempat belas: menahan tangan 3 detik di layar idle kini **memang** memulai — lihat catatan putaran 14)_
- [x] **T-142** Tata ulang layar **Intro** supaya tidak terbaca seperti layar loading: komposisi ditengahkan & diperbesar, aturan bernomor besar, bilah progres 6 px pink, tombol **Lewati** jadi tombol nyata, dan selubung lembut di belakang konten untuk kontras. Judul **Particle Text** tetap beranimasi (gerak tidak dihapus); versi `prefers-reduced-motion` tetap statis
- [x] **T-143** Salin **Flux Lines** (React Bits gratis, verbatim, commit `4dc7b5b`) + `.css` ke `src/components/reactbits/`; ganti latar **GAME_OVER** dari Gradient ASCII `eclipse` ke `FluxLinesBackdrop()` (aliran violet→pink yang bergerak terus) supaya layar tidak terbaca diam; sekalian perbaiki **BUG-018** dengan membuang `lazy()` + `<Suspense>` pada semua backdrop: `reactbitsLoaders.js` menyimpan komponen yang sudah dimuat (`getBackdropComponent`/`loadBackdrop`), `useBackdropComponent()` + `BackdropLayer` di `Backgrounds.jsx`/`Opening.jsx`/`IdleGlobe.jsx`, dan `App.jsx` memanaskan chunk **layar tujuan** saat tirai menutup
- [x] **T-144** Setel ulang rasa **hand tracking** ke target pemilik produk "respons cepat": `detectHz` 30 → 45, `staleHoldMs` 200 → 140, dan `smoothingAlpha` 0,6 (angka tetap di `gameConfig.hand`); wajib diuji manual dengan kamera & tangan sungguhan (lihat T-122)
- [x] **T-145** Perbaiki **BUG-020**: tolak deteksi lengan (skor handedness, panjang telapak, rasio jangkauan telunjuk 3D) dan hilangkan hover tersendat (laju deteksi adaptif dari biaya inferensi, emisi `pointermove` berambang + detak, bilah tahan tidak ditulis ulang tanpa perubahan)

## Bonus

- [x] 🔹 **B-01** Layout responsif untuk mobile _(5 Nov 2026: area aman `viewport-fit=cover` + `env(safe-area-inset-*)`, target sentuh ≥44 px di pointer kasar, penyesuaian lanskap pendek & ponsel sempit; `probe-mobile.mjs` 10 layar × 5 viewport = 0 overflow horizontal. Desktop tidak berubah. Detail: ARCHITECTURE bagian 8.3)_
- [ ] 🔹 **B-02** Penurunan kualitas adaptif di perangkat lemah
- [ ] 🔹 **B-03** Uji Safari dan browser mobile

---

## Urutan kerja yang disarankan

```
F0 (termasuk T-009 dev-shortcut) → F1 → F2 (mouse dulu) → F4 (termasuk timer)
   → F5 → F6 → F8 → F3 → F2 (hand tracking) → F7 → F9 → F10
```

Mengerjakan **mouse dulu** memungkinkan gameplay diuji lebih awal sebelum hand tracking siap. Hand tracking dipasang setelah game inti berjalan.
