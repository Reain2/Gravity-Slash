# BUGLIST — Gravity Slash

Terakhir diperbarui: 7 November 2026

Dokumen ini mencatat bug yang ditemukan dan risiko teknis yang perlu diwaspadai.

---

## Cara pakai

1. Setiap bug diberi ID berurutan: `BUG-001`, `BUG-002`, dan seterusnya.
2. Salin template di bagian bawah, isi, lalu taruh di tabel **Bug aktif**.
3. Setelah diperbaiki, pindahkan ke **Bug selesai** dengan catatan perbaikan.
4. Hubungkan dengan item `TODOLIST.md` jika relevan.

### Tingkat keparahan

| Tingkat    | Arti                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| **Kritis** | Game tidak bisa dimainkan, crash, atau data hilang                     |
| **Tinggi** | Fitur utama rusak atau terasa salah, ada jalan memutar yang merepotkan |
| **Sedang** | Masalah terlihat tapi tidak menghalangi bermain                        |
| **Rendah** | Kosmetik atau kasus yang jarang terjadi                                |

### Status

`Baru` · `Dikonfirmasi` · `Dikerjakan` · `Diperbaiki` · `Diverifikasi` · `Tidak akan diperbaiki`

---

## Bug aktif

| ID      | Judul                                                                                                                                                                       | Tingkat | Status     | Area                  | Terkait      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------- | --------------------- | ------------ |
| BUG-011 | Tangan pada jarak 1–1,5 m sering tidak terdeteksi dan gerakan terasa tidak mulus (kamera 640×480, ambang MediaPipe bawaan 0,5)                                              | Tinggi  | Diperbaiki | Input / hand tracking | T-122        |
| BUG-012 | Bidang violet bertumpuk: tombol/bilah berlatar violet yang sama dengan layar, dan pink nyaris tidak terbaca (violet di atas violet hanya 1,16:1)                            | Tinggi  | Diperbaiki | Desain / warna        | T-012, T-116 |
| BUG-013 | Judul **GRAVITY SLASH** tampil tanpa animasi 1–2 detik di layar Intro, baru kemudian partikelnya menyusun                                                                   | Sedang  | Diperbaiki | Animasi / pemuatan    | T-083, T-098 |
| BUG-014 | Audio tidak pernah aktif di mode kamera: `AudioContext` hanya dibuka oleh klik di canvas game, jadi tidak ada suara sama sekali di alur hand tracking                       | Tinggi  | Diperbaiki | Audio                 | T-100        |
| BUG-015 | Musik bisa mulai berbunyi **setelah** layar Menu dilepas (balapan `startMusic` asinkron vs `stopMusic`)                                                                     | Sedang  | Diperbaiki | Audio                 | T-102        |
| BUG-016 | Latar WebGL (Topography, GradientASCII, dan Particles yang sudah ada) **kosong di dev server**; konteks WebGL dimatikan oleh pemasangan ganda StrictMode lalu dipakai ulang | Tinggi  | Diperbaiki | Animasi / pemuatan    | T-138, T-139 |
| BUG-017 | Permainan **mulai sendiri** saat pemain cuma menggerakkan tangan di layar idle: getaran tangan melintasi ambang kecepatan iris dan memicu jalur "lambai cepat = mulai"      | Tinggi  | Diperbaiki | Input / UI            | T-141        |
| BUG-018 | Perpindahan antar-layar terasa "kecut": latar layar baru tampil statis dulu ±300 ms lalu kanvasnya muncul mendadak di tengah animasi tirai (`lazy` + `<Suspense>`)          | Sedang  | Diperbaiki | Animasi / pemuatan    | T-143        |
| BUG-019 | Tombol **Jepret lagi** di layar Foto tidak bisa dipakai: pratinjau kamera beku dan hasil jepretan kedua kosong/basi                                                                                     | Tinggi  | Diperbaiki | Kamera / Foto         | T-133        |
| BUG-020 | Dari jarak jauh MediaPipe kadang memasang kerangka tangan di lengan bawah sehingga bidik melompat ke lengan; hover juga tersendat karena deteksi dipaksa 45 Hz di mesin yang tidak sanggup | Tinggi | Diperbaiki | Input / Performa | T-145 |
| BUG-023 | Hover/bidik berkedip sejak awal: `useHandPointer` menganggap tangan hilang pada satu frame deteksi kosong, sehingga crosshair dan baris status muncul-hilang | Sedang | Diperbaiki | Input / UI | T-145 |
| BUG-022 | Cahaya kuat dari atas/belakang (backlight, jendela, lampu langit-langit) membuat tangan jadi silhouette sehingga deteksi kacau dan bidik melompat | Tinggi | Dikerjakan | Input / hand tracking | T-145 |
| BUG-021 | Kursor tidak "mengunci" tangan: id tangan dicuri deteksi lain yang lebih dekat ke posisi lama (tangan kedua, lengan, objek serupa), jadi bidik tertinggal di sekitar tangan dan berpindah-pindah saat tangan digerakkan | Tinggi | Diperbaiki | Input / hand tracking | T-145 |

> **BUG-011 (detail).** Penyebab: pada jarak 1–1,5 m tangan hanya menempati porsi
> kecil frame. Frame `640×480` menyimpan sedikit detail tangan sebelum MediaPipe
> mengecilkannya ke ukuran input tetap, dan ambang keyakinan bawaan `0,5` terlalu
> ketat — deteksi jadi bolong-bolong, posisi pointer ditahan lalu melompat
> (`staleHoldMs`), sehingga gerakan terasa tersendat.
>
> Perbaikan: resolusi kamera dinaikkan ke ideal `1280×720` dan ambang keyakinan
> diturunkan ke `0,3` (`minHandDetectionConfidence`, `minHandPresenceConfidence`,
> `minTrackingConfidence`). Semua angka pindah ke `gameConfig.hand.camera` dan
> `gameConfig.hand.confidence`, dibaca jalur worker (`handWorker.js`) maupun jalur
> cadangan main thread lewat pesan `init`. Tes adapter +2 (opsi kamera + ambang;
> pesan init worker). **Status: diperbaiki di kode; menunggu uji manual kamera &
> tangan sungguhan (T-122) karena kamera palsu headless selalu 640×480 dan tidak
> punya tangan.**

> **BUG-012 (detail).** Gejala yang dilaporkan pemilik produk: "warna overlap" —
> bidang-bidang violet berdekatan saling melebur sehingga tepinya tidak terbaca,
> dan aksen pink hampir tidak muncul. Akarnya bukan kekurangan warna, melainkan
> **salah peran token**: `--accent` (`#472E97`) dipakai sebagai **isian bidang**
> (tombol utama, bilah tirai, sakelar) **sekaligus sebagai warna teks di atas
> bidang violet yang setara**. Violet di atas violet hanya **1,16:1** — jauh di
> bawah 3:1, jadi bentuknya tenggelam. Efek sampingnya: teks/garis memakai
> `--accent-strong`/`--accent` yang juga turunan violet, sehingga tidak ada satu
> pun elemen yang naik dari bidangnya.
>
> Perbaikan (hanya turunan, tanpa hex palet baru):
>
> - **Bidang dominan digelapkan.** `--color-night` `#3d2882` → **`#2e1c63`**
>   (violet digelapkan) untuk `--bg`; `--bg-raised` `#4a31a0` → **`#3f2a87`**
>   (satu langkah terang di atas bidang, untuk panel); `--bg-overlay`
>   `rgba(24,14,56,.78)` → `rgba(17,9,40,.82)`.
> - **Aksen violet dipisah dari isian.** `--accent` kini **turunan terang**
>   `#aca1d0` (violet + putih 55%, `--color-violet-lift`) untuk **garis dan teks
>   di atas bidang**; `--accent-strong` `#d3c9f6`. Nilainya tetap literal (bukan
>   `color-mix()`), karena `renderer.js` membacanya untuk kanvas.
> - **Aksi utama pindah ke pink 10%.** `.btn--primary` = isian pink +
>   teks `--color-night`; `.btn--accent` = isian putih + teks `--color-night`.
>   Violet `#472E97` tidak mungkin mencapai 3:1 di atas bidang bergelap apa pun,
>   jadi ia **tidak boleh lagi** jadi isian tombol di tema ini.
> - **Tepi dinaikkan.** `--border` 0,14 → **0,3**, `--border-strong` 0,28 →
>   **0,4** (3,21:1, memenuhi 3:1 untuk kontrol interaktif); teks
>   `--text-muted`/`--text-faint` 0,64/0,38 → **0,78/0,66**.
> - `--accent`/`--accent-2` alfa lembut dibekukan sebagai rgba literal
>   (`--accent-soft`, `--accent-2-soft`) karena `color-mix()` mengembalikan teks
>   mentah saat dibaca `getComputedStyle`.
>
> Kontras terukur (skrip WCAG, latar `#2e1c63`, panel `#3f2a87` @72%):
> teks putih/bidang **12,60:1**; putih/panel **10,51:1**; muted 0,78/panel
> **6,54:1**; faint 0,66/panel **5,17:1**; aksen violet-terang/bidang **5,99:1**,
> /panel terangkat **4,63:1**; pink/bidang **5,89:1**; teks gelap di tombol pink
> **5,89:1**; garis 0,4 **3,21:1**.
>
> **Status: diperbaiki di kode dan diukur headless; menunggu konfirmasi visual
> pemilik produk.** Sisa yang perlu diputuskan: apakah `--border` (0,3 → 2,39:1)
> cukup untuk tepi panel statis, karena kontrol interaktif sudah memakai
> `--border-strong` (3,21:1).

> **BUG-013 (detail).** Gejala: setelah menekan Enter, judul **GRAVITY SLASH**
> muncul _tanpa animasi_ sekitar 1–2 detik, baru kemudian partikelnya menyusun.
>
> Penyebab terukur: komponen `ParticleText` dimuat lewat `import()` dinamis, jadi
> chunk-nya baru di-`fetch` tepat saat tirai antar-layar membuka. Selama chunk itu
> dimuat, `Suspense` menampilkan `fallback` statis — `<h1>` **GRAVITY SLASH** yang
> sudah jadi. Begitu chunk tiba, komponen diganti versi kanvas dan animasi
> `gather` mulai dari nol, sehingga judul terlihat "dianimasikan ulang".
>
> Pengukuran headless (Brave, dev server) memperkuat: pada kunjungan dingin,
> tirai menutup ±400 ms, layar Intro terpasang, fallback statis terlihat ±250 ms,
> baru kanvas partikel muncul berisi. Di mesin pemilik produk jeda pemuatan chunk
> lebih lama (1–2 detik).
>
> Perbaikan:
>
> - **Panaskan chunk lebih awal.** `src/components/reactbitsLoaders.js` menyimpan
>   `LOADERS` (dipakai `lazy()` di `Backgrounds.jsx`) dan `preloadBackdrops()`.
>   Layar pembuka memanggilnya di dalam `requestIdleCallback`, jadi chunk
>   `ParticleText`, `PatternWaves`, dan `BlurText` sudah ada sebelum pemain
>   meninggalkan layar pertama. Dilewati saat `prefers-reduced-motion` atau tanpa
>   WebGL.
> - **Fallback statis disembunyikan.** Cadangan `ParticleTitle` kini memakai
>   `.intro__title--pending` (`visibility: hidden`) sehingga tetap memesan tinggi
>   yang sama (tanpa lompatan tata letak) tetapi tidak pernah menampilkan judul
>   yang belum beranimasi.
>
> Verifikasi headless: `staticVisibleEver: false` (judul statis tidak pernah
> terlihat), kanvas partikel sudah berisi pada contoh pertama setelah tirai
> membuka, prefetch terkonfirmasi lewat `performance.getEntriesByType('resource')`.
> **Status: diperbaiki dan diukur; menunggu konfirmasi visual pemilik produk.**

> **BUG-014 (detail).** Gejala: di mode kamera (mode utama) tidak ada satu pun
> bunyi — efek maupun musik. Penyebab: `audio.unlock()` hanya dipanggil dari
> `PointerAdapter` (`onInteraction`) di `Game.jsx`, yaitu saat `pointerdown`
> mengenai canvas game. Alur hand tracking tidak pernah menyentuh canvas itu,
> sehingga `AudioContext` tidak pernah dibuat dan `play()` selalu menolak
> (PRD §7.4: audio aktif setelah interaksi pertama, apa pun mode inputnya).
>
> Perbaikan: `App.jsx` memasang pemantau sekali pakai untuk gestur pertama
> (`pointerdown` **atau** `keydown`) di layar mana pun, lalu memanggil
> `audio.unlock()`; listener langsung dilepas supaya tidak ada `AudioContext`
> kedua. `ensureAudio` di `Game.jsx` tetap ada sebagai jalur cadangan idempoten.
>
> Verifikasi: (a) unit test `audio.test.js` — `play()` menolak sebelum unlock,
> berhasil sesudahnya; (b) probe headless — `AudioContext` dibuat **0** sebelum
> gestur, **1** tepat setelah `pointerdown`, dan tetap **1** setelah gestur
> tambahan (tidak ada konteks ganda).

> **BUG-015 (detail).** Gejala yang dicegah: `startMusic()` memuat buffer musik
> secara asinkron; kalau pemain meninggalkan Menu (atau menekan mute) sebelum
> buffer selesai dimuat, `stopMusic()` tidak menemukan sumber musik apa pun,
> lalu `startMusic()` yang masih berjalan tetap memulai musik — bunyi tertinggal
> di layar lain.
>
> Perbaikan: penanda generasi (`musicToken`) di `services/audio.js`.
> `startMusic` mencatat token sebelum menunggu buffer dan membatalkan diri bila
> token berubah; `stopMusic`/`reset` menaikkan token.
>
> Verifikasi: unit test dengan `fetch` musik yang ditahan — `stopMusic()` dipanggil
> saat buffer masih dimuat, dan `startMusic` selesai dengan `false` tanpa memulai
> sumber musik.

> **BUG-016 (detail).** Gejala: ketiga latar WebGL — **Topography** (gerbang
> kamera), **GradientASCII** (game over & nama), dan **Particles** yang sudah ada
> sejak awal (pembuka & idle) — tampil sebagai bidang kosong **di dev server**,
> padahal build produksi normal. Penyebab, terbukti lewat probe headless:
>
> 1. Tiap komponen React Bits melepas konteks WebGL-nya di fungsi pembersih efek
>    lewat `getExtension('WEBGL_lose_context').loseContext()`.
> 2. `<StrictMode>` di `main.jsx` memasang setiap efek **dua kali** di dev
>    (pasang → bersihkan → pasang lagi).
> 3. Pembersihan pertama mematikan konteks, lalu pemasangan kedua mengambil
>    konteks **yang sudah mati** dari `canvas.getContext('webgl2')`; semua gambar
>    jadi no-op dan kanvas tampak kosong.
>
> Bukti: di dev `webglcontextlost` memicu pada `topography-canvas` /
> `gradient-ascii-canvas`, `gl.isContextLost() === true`, `drawingBuffer 0×0`,
> `gl.getError() === 37442` (`CONTEXT_LOST_WEBGL`). Build produksi sehat
> (`lost: false`, `err: 0`) dan beranimasi. Menghapus StrictMode sementara, atau
> menetralkan `WEBGL_lose_context`, keduanya memulihkan latar di dev.
>
> Perbaikan: `src/utils/webglStrictModeGuard.js`, dipanggil dari `main.jsx`
> sebelum render pertama. Hanya aktif di `import.meta.env.DEV` (tanpa efek di
> build produksi). Ia membungkus `getExtension('WEBGL_lose_context')` dan
> **mengabaikan `loseContext()` yang datang saat kanvas masih tercantum di
> dokumen** — yaitu tepat pembersihan palsu StrictMode, yang memang tidak melepas
> DOM. Saat layar benar-benar dilepas, React sudah mencabut kanvas dari dokumen
> lebih dulu, jadi `loseContext()` berjalan seperti biasa dan sumber daya GPU
> tetap dibebaskan (syarat AGENTS.md 7.8). Pendekatan ini menyentuh semua latar
> WebGL sekaligus tanpa mengubah isi komponen React Bits yang disalin apa adanya.
>
> Verifikasi headless (Brave, dev server, dengan guard aktif): CAMERA_GATE
> (Topography) 533 → 542 sampel non-nol (bergerak), GAME_OVER (GradientASCII)
> 435 → 501, NAME_ENTRY 273; selisih piksel tangkapan 15,4% / 2,2% / 3,0%;
> `lost: false`; 0 pengecualian konsol. Setelah berpindah layar, ketiga kanvas
> (`particles` / `topography` / `gradient-ascii`) melaporkan `lost: true`,
> membuktikan pembersihan asli tetap terjadi. `prefers-reduced-motion` tetap
> jatuh ke latar statis (0 kanvas). **Status: diperbaiki dan diukur; build
> produksi tidak terpengaruh.**

> **BUG-017 (detail).** Gejala: di layar idle dengan mode kamera, permainan
> kadang **langsung mulai** tanpa pemain menekan apa pun — pemain hanya
> mengangkat tangan ke depan kamera untuk mencoba membidik. Ditemukan langsung
> oleh pemilik produk: "pas hover pake tangan tiba-tiba udah kestart sendiri".
>
> Penyebab: `src/utils/handPointer.js` menerjemahkan **lambaian cepat** ujung
> telunjuk menjadi start, memakai ambang kecepatan yang sama dengan gameplay
> (`CONFIG.slash.minSpeed`). Ambang itu cocok untuk _mengiris orb_, tetapi
> getaran kecil tangan saat mengangkat/menahan di depan kamera pun melewatinya,
> sehingga sinyal "mulai" terpicu sendiri. Ini bertentangan dengan keputusan
> pemilik produk untuk `useHandPointer`: tangan **hanya untuk melihat** (hover +
> kunci bidik), bukan menekan.
>
> Perbaikan: jalur "lambai cepat = mulai" **dibuang**. Tanda tangan hook
> disederhanakan menjadi `useHandPointer({ enabled, containerRef })` — parameter
> `onSwipe` dan `minSpeed` dihapus, begitu pula perhitungan kecepatan dan
> `fired`/`prev` yang menyertainya. Modul ini kini hanya menyuntik `pointermove`
> asli ke elemen di bawah ujung telunjuk dan **tidak pernah** mengirim
> `pointerdown`/`pointerup`/`click`. Mulai di layar idle tetap lewat tombol
> Mulai (klik), Enter, atau iris **mouse**. Salinan perilaku ditulis ulang di
> komentar modul dan di teks layar ("Bidik hanya untuk menguji, tidak bisa
> menekan apa pun."). **Status: diperbaiki.**
>
> Catatan verifikasi: deteksi MediaPipe tidak bisa dijalankan di probe headless,
> jadi jalur hover-tangan yang sebenarnya perlu diuji manual dengan kamera nyata;
> yang bisa diverifikasi headless adalah tidak adanya lagi pengiriman
> `pointerdown`/`click` dari modul ini.

> **BUG-018 (detail).** Gejala yang dilaporkan pemilik produk: perpindahan
> antar-halaman terasa "kecut" — seolah layar baru muncul dalam dua langkah,
> latar diam dulu baru bergerak. Bukan potongan keras (itu BUG-003 yang sudah
> memakai tirai iris), melainkan **latar layar baru yang masuk terlambat**.
>
> Akar masalah ditemukan dengan mengukur, bukan menebak. Dengan
> `MutationObserver` + `PerformanceObserver` di build **produksi** (bukan dev,
> agar StrictMode tidak mengaburkan hasil): tirai mulai membuka pada ±471 ms,
> tetapi `<canvas>` latar baru masuk DOM pada ±774 ms — **±300 ms setelahnya**.
> Tidak ada long task di antara keduanya (thread tidak diblokir), tidak ada
> `<link>` CSS yang disuntikkan terlambat, dan `import()` ulang atas chunk yang
> sudah terunduh selesai dalam **0 ms** (chunk-nya sudah lama ada di memori).
> Jadi bukan jaringan, bukan CSS, dan bukan pekerjaan berat. Satu percobaan
> pembanding memastikan tersangkanya: saat satu latar diganti menjadi impor
> statis, kanvasnya masuk DOM di **frame yang sama** dengan pembukaan tirai
> (459 ms). Pola "±300 ms tanpa pekerjaan apa pun" itu adalah **percobaan ulang
> penangguhan `React.lazy`** — `lazy()` selalu menangguhkan render pertama dan
> React menjadwalkan percobaan ulang, yang kebetulan jatuh persis saat tirai
> sudah membuka.
>
> Perbaikan: `lazy()` + `<Suspense>` **dibuang** dari semua backdrop. Registri
> `src/components/reactbitsLoaders.js` kini menyimpan komponen yang sudah dimuat
> (`getBackdropComponent`, `loadBackdrop`) dan mengekspor hook
> `useBackdropComponent(name)`. `App.jsx` memanggil `preloadBackdrops()` untuk
> chunk **layar tujuan** begitu tirai mulai menutup, jadi saat layar baru
> dipasang komponennya sudah siap dan `useState(() => getBackdropComponent(name))`
> mengembalikannya pada render **pertama** — kanvas masuk DOM di frame yang sama
> dengan pergantian layar. `Backgrounds.jsx` merender lewat pembungkus modul-scope
> `BackdropLayer({ Component, ... })` (komponen diteruskan sebagai prop) agar
> aturan lint `react-hooks/static-components` tetap aktif tanpa dimatikan.
>
> Verifikasi headless di build produksi, seluruh alur (Opening → CameraGate →
> IdleGlobe → Intro → Menu → Game → Game Over), semua frame saat tirai membuka:
> **0 frame tanpa kanvas latar** (sebelumnya ada jendela ±300 ms), dan jeda frame
> terbesar 69 ms tanpa main thread terblokir. Kanvas Game Over (Flux Lines) dan
> Menu (Ghost Fibers) sudah ada di frame reveal pertama (`bgFirst=1`).
> **Status: diperbaiki dan terverifikasi headless di produksi.**
>
> Catatan: di dev server hal ini tampak jauh lebih buruk (blokir main thread
> multi-detik) karena StrictMode memasang efek dua kali sementara penjaga WebGL
> (BUG-016) menahan pembersihan pertama, sehingga dua loop latar hidup
> bersamaan. Itu artefak dev, bukan perilaku produksi — diukur: di produksi tidak
> ada blokir serupa.

> **BUG-019 (detail).** Gejala yang dilaporkan pemilik produk: "fitur jepret
> lagi bug gabisa jepret ga muncul" — setelah satu jepretan, menekan **Jepret
> lagi** mengembalikan layar ke pratinjau, tetapi pratinjau itu membeku dan
> jepretan berikutnya tidak menghasilkan foto.
>
> Akar masalah ditemukan dengan probe headless (kamera palsu 1280×720) yang
> mencatat status elemen `<video>` tiap fase: setelah **Jepret lagi**,
> `video.paused` bernilai **true** padahal elemennya masih di DOM. Penyebabnya,
> fase hasil melepas elemen video dari DOM (agar kanvas hasil bisa memakai
> panggung), dan peramban **menjeda** pemutaran video yang terlepas. Saat
> elemen ditempel ulang, `srcObject` masih ada sehingga tidak ada pemuatan
> ulang yang otomatis memutar kembali — jadi pratinjau beku, dan `drawImage`
> atas video yang tidak punya frame terkini menghasilkan tangkapan basi atau
> kosong.
>
> Perbaikan: (1) `CameraStage` di `components/CameraPreview.jsx` memanggil
> `video.play()` lagi setiap kali menempelkan elemen ke panggung; (2) pembungkus
> `CameraPreview` melakukan hal yang sama; (3) `capture` di `screens/Photo.jsx`
> menunggu `video.play()` bila `readyState < 2` sebelum menggambar, supaya
> frame pertama setelah kembali ke pratinjau tidak ikut kosong.
>
> Verifikasi headless (kamera palsu, dev **dan** build preview): setelah
> **Jepret lagi**, `video2 {paused:false}`; jepretan kedua menghasilkan kanvas
> 1080×1080; 0 error konsol di kedua lingkungan.

> **BUG-020 (detail).** Dua keluhan pemilik produk: (1) "kalo dari jauh …
> dia ngedetect lengan bukan indexnya", dan (2) "lag pas hovering … hoveringnya
> juga ga patah-patah".
>
> **Salah deteksi lengan.** Worker hanya mengirim landmark 8 tanpa informasi
> kualitas, jadi hasil apa pun yang keluar dari MediaPipe langsung menjadi
> pointer. Saat telapak tidak terlihat (tangan jauh, hanya lengan di frame),
> model tetap memasang kerangka tangan dan landmark 8 mendarat di lengan.
> Perbaikan: worker kini mengirim tiga ukuran per tangan — skor `handedness`,
> panjang telapak (`palm`, pergelangan → MCP jari tengah), dan `reach` (jarak
> ujung telunjuk dari pergelangan dibagi jarak MCP telunjuk, dihitung 3D supaya
> telunjuk yang menunjuk ke kamera tidak dianggap menggenggam). Adapter menolak
> deteksi di bawah `minHandScore` 0,25, di bawah `minPalmSize` 0,012, atau di
> luar `minIndexReach` 1,15–`maxIndexReach` 3,6. Jalur worker dan jalur cadangan
> main thread memakai aturan yang sama. Tes baru: skor rendah, telapak kecil,
> telunjuk menggenggam, dan jangkauan tak wajar semuanya tidak menghasilkan
> pointer; geometri sehat tetap lolos.
>
> **Revisi setelah uji pemilik produk:** versi pertama memakai ambang lebih
> ketat (0,4 / 0,025 / 1,3–3,2) dan menghitung jarak dalam 3D. Hasilnya deteksi
> berkedip — satu frame ditolak, pointer hilang sebentar lalu muncul di posisi
> baru, terasa "meloncat-loncat" dan kurang halus. Perbaikan: jarak kembali 2D
> (`z` MediaPipe berisik), ambang dilonggarkan, dan penyaring memakai
> **histeresis** `qualityGraceMs` 350 ms — tangan yang sedang terlacak ditahan
> saat kualitasnya menurun, dan posisinya tidak dipindahkan ke hasil yang
> meragukan. Kualitas buruk berkelanjutan tetap ditolak lewat `staleHoldMs`.
>
> **Hover tersendat.** Tiga penyebab: laju deteksi dipaksa 45 Hz walau satu
> inferensi butuh ~20 ms (worker jenuh, frame bolong-bolong); `useHandPointer`
> menyuntik `pointermove` 60×/detik termasuk saat tangan diam sehingga kanvas
> Crosshair tidak pernah berhenti menggambar; dan `useHoldTarget` menulis
> `style.transform` tiap frame walau nilainya sama. Perbaikan: laju deteksi
> **adaptif** (turun cepat saat inferensi mahal, naik pelan saat murah, lantai
> `minDetectHz` 15; `idleDetectHz` 10 saat tidak ada tangan), emisi pointer
> hanya saat posisi berubah ≥ `emitMinMovePx` 0,75 px atau tiap
> `emitHeartbeatMs` 60 ms (detak tetap menjaga hover-tahan hidup di bawah
> pengawas 250 ms), dan penulisan bilah tahan hanya saat progres berubah.
>
> **Revisi kedua (sapuan cepat).** Setelah ambang dilonggarkan, pemilik
> produk melaporkan gerakan cepat "kayak ga ngedetect". Penyebab: saat blur,
> MediaPipe kadang tidak mengembalikan tangan sama sekali sehingga pointer
> membeku sampai `staleHoldMs`, dan lompatan sampel di atas 0,25 satuan
> dianggap tangan baru (id, penghalusan, dan kecepatan tereset). Perbaikan:
> `idMatchRadius` 0,25 → 0,5; pointer **dilanjutkan** mengikuti kecepatan
> terakhir (`coastMaxMs` 120 ms, `coastDamping` 0,5) selagi menunggu deteksi
> berikutnya; `staleHoldMs` 140 → 200 ms; dan posisi hasil deteksi yang
> meragukan tetap dipakai saat blur kalau lompatannya < `graceMaxJump` 0,15.
> Tes adapter +2: lompatan 0,45 satuan mempertahankan id, dan pointer bergerak
> maju saat satu hasil kosong.
>
> **Verifikasi.** `npm run lint` 0 error / 8 warning, `npm run test` **109/109**,
> build `index.js` 306,58 kB (gzip 97,06). Alur pembuka → uji tangan → Lanjut →
> Intro → Menu → kembali masih lolos di preview dengan kamera palsu, **0 error
> konsol**. Deteksi tangan sungguhan dari jarak jauh tetap perlu diuji manual
> (T-122/T-145): headless tidak punya tangan.

> **BUG-021 (detail).** Keluhan pemilik produk: "udah lock di jari, terus ada
> yang mirip di sebelahnya, jadi lompat dan ngunci di sekitar; aku pindah dia
> malah ngunci yang di dekat aku tadi". Deteksi **bukan** berbasis warna —
> MediaPipe Hand Landmarker memakai landmark bentuk tangan, jadi "mirip warna"
> bukan penyebabnya. Penyebab sebenarnya ada di pencocokan identitas: deteksi
> baru dicocokkan ke posisi **terakhir** tangan sebelumnya, satu per satu
> mengikuti urutan keluaran MediaPipe. Saat tangan bergerak cepat, deteksi
> palsu (lengan/tangan kedua/objek mirip) yang kebetulan masih di posisi lama
> bisa lebih dulu mencuri id, sehingga kursor tertinggal di situ; `pointers[0]`
> di layar non-permainan juga bisa menunjuk tangan mana pun karena urutan
> array berubah.
>
> Perbaikan:
>
> - Pencocokan id memakai **posisi ramalan** (posisi mentah terakhir + kecepatan
>   × waktu, dibatasi `predictMaxSec` 0,2 dtk), bukan posisi terakhir. Kecepatan
>   dihitung dari posisi mentah supaya ramalan tidak tertinggal oleh penghalusan.
> - Semua pasangan deteksi ↔ tangan sebelumnya diurutkan jaraknya (pencocokan
>   global), jadi urutan keluaran MediaPipe tidak lagi menentukan siapa yang
>   menang.
> - **Kursor utama dikunci** (`adapter.primaryId`): sekali sebuah tangan menjadi
>   kursor, id itu dipertahankan selama tangannya masih terdeteksi. Kalau benar-
>   benar hilang, penerusnya yang paling dekat dengan posisi terakhir. Layar
>   pembuka/uji tangan/menu memakai `primaryId`, bukan `pointers[0]`.
>
> Tes adapter +2: deteksi mirip di posisi lama tidak mencuri id tangan yang
> bergerak, dan kursor utama tidak berpindah saat tangan kedua mendekat.
>
> **Verifikasi.** `npm run lint` 0 error / 8 warning, `npm run test` **111/111**,
> build `index.js` 307,46 kB (gzip 97,40). Perilaku sebenarnya tetap perlu diuji
> dengan tangan sungguhan (T-122/T-145).

> **BUG-022 (detail).** Laporan pemilik produk: saat ada matahari/cahaya kuat dari
> atas atau belakang, deteksi tangan jadi error. Ini bukan bug warna atau
> landmark: kamera menyetel eksposur untuk latar yang terang, sehingga tangan
> yang membelakangi sumber cahaya menjadi **silhouette** tanpa detail; MediaPipe
> kehilangan landmark dan bidik melompat atau hilang.
>
> Mitigasi di kode:
>
> - `getUserMedia` meminta `exposureMode`, `whiteBalanceMode`, dan `focusMode`
>   `'continuous'` lewat `advanced`. Constraint yang tidak didukung perangkat
>   diabaikan, jadi kamera tetap terbuka. Ini membantu webcam UVC yang
>   mengekspos kontrol eksposur; banyak webcam bawaan macOS tidak.
> - Layar **Uji tangan** memakai baris status yang sudah ada untuk mengingatkan:
>   kalau kulit terlihat putih karena cahaya dari atas/belakang, matikan atau
>   redupkan lampunya dulu. Peringatan menumpang baris "tangan belum terlihat",
>   jadi tidak menambah tinggi halaman (penting untuk layar 320×640).
>
> Fakta yang membatasi: piksel yang sudah **clipped** (kulit tampil putih
> 255,255,255) tidak bisa dipulihkan perangkat lunak — informasinya hilang di
> sensor. Karena itu "blinking" saat deteksi adalah auto-exposure kamera yang
> berayun antara latar terang dan tangan; satu-satunya perbaikan nyata adalah
> menurunkan cahaya di belakang/atas, miringkan kamera, atau pakai webcam yang
> mengekspos kontrol eksposur.
>
> **Revisi 8 Nov 2026 (feed OBS).** Pemilik produk memakai webcam Ausdom lewat
> OBS Virtual Camera; pratinjau dan bidik sama-sama berkedip tiap gerakan.
> Virtual camera tidak meneruskan kontrol eksposur, jadi `advanced` di atas
> tidak berpengaruh dan kuning/putihnya tetap urusan driver + OBS. Di sisi
> aplikasi celah deteksi diperpanjang supaya bidik tidak ikut putus:
> `staleHoldMs` 200 → 320 ms dan `coastMaxMs` 120 → 200 ms. Pratinjau kamera
> sendiri tetap mengikuti feed; itu tidak bisa diperbaiki dari aplikasi.
>
> Belum dikerjakan (butuh keputusan pemilik produk): mendeteksi overexposure
> otomatis dari sampel luma frame dan menampilkan peringatan di layar Game.
>
> **Verifikasi.** `npm run lint` 0 error / 8 warning, `npm run test` **111/111**.
> Efek nyata hanya bisa dinilai dengan kamera + cahaya sungguhan.

> **BUG-023 (detail).** `useHandPointer` memanggil `emitLeave` + `setPresent(false)`
> begitu satu frame `adapter.read()` kosong. Akibatnya crosshair memudar lalu
> muncul lagi (berkedip), dan baris status "Tangan belum terlihat" ikut
> muncul-hilang sehingga tata letak lompat. Perbaikan: kelangkaan satu-dua frame
> memakai jendela adapter `presentWindowMs` (280 ms); `pointerleave` baru
> dikirim setelah jendela itu lewat. Tidak ada perubahan angka.

## Bug selesai

| ID      | Judul                                                                        | Diperbaiki pada | Catatan perbaikan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------- | ---------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUG-001 | `src/styles/ui.css` tidak pernah di-`import`                                 | 4 Nov 2026      | Gaya HUD, pratinjau kamera, latar, dan tata letak layar tidak aktif sama sekali. Pratinjau kamera memang dirender, tetapi terdorong ke luar viewport karena `canvas` gameplay ikut mengalir normal. Ditambahkan `import './styles/ui.css'` di `src/main.jsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| BUG-002 | Pratinjau kamera tidak pernah muncul (React StrictMode)                      | 4 Nov 2026      | Efek engine memakai `mountedRef` bersama; pemasangan ganda StrictMode membuat hasil `start()` milik efek yang sudah dibersihkan menimpa `video` efek yang masih hidup. Diganti flag `cancelled` lokal per pemasangan efek di `src/screens/Game.jsx`. Pratinjau juga dipasang di layar idle dan menu lewat hook `useCameraPreview`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| BUG-003 | Perpindahan layar terasa potongan keras                                      | 4 Nov 2026      | `App.jsx` hanya merender layar aktif. Ditambah tirai iris (dua bidang penuh layar menyapu 400 ms; layar baru dipasang saat tirai menutup penuh) dan dilewati saat `prefers-reduced-motion`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| BUG-004 | Tombol tidak punya umpan balik hover/tekanan                                 | 4 Nov 2026      | `.btn` diberi bilah iris yang menyapu saat kursor masuk, angkat 1px saat hover, dan tekanan saat `:active`; kelas `.btn--big` untuk aksi utama                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| BUG-005 | Tombol "Mulai" di layar idle mati terhadap klik mouse                        | 4 Nov 2026      | `useSwipeToStart` memanggil `setPointerCapture` pada kontainer swipe. Pointer capture membelokkan event `click` turunannya ke elemen kontainer, sehingga tombol di dalamnya tidak pernah menerima klik — hanya `Enter` yang jalan. Eksperimen terisolasi di browser menunjukkan log `["host:pointerdown","host:click"]` tanpa `btn:click`. Handler ditulis ulang: `setPointerCapture` dihapus, posisi terakhir dan kotak elemen disimpan di `ref` (bukan `dataset`/state) agar `pointermove` tidak memicu layout atau re-render. Klik mouse asli kini melepas pratinjau (`live: 0`) dan lanjut ke Intro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| BUG-006 | Kamera dan MediaPipe ganda → animasi tersendat di layar Game                 | 4 Nov 2026      | React StrictMode memasang efek dua kali. Tanpa token pembatalan, adapter yang sudah dibuang tetap menyelesaikan `getUserMedia` + pembuatan model lalu menjalankan loop deteksinya sendiri. Instrumen halaman mencatat 7 `getUserMedia`, **2 track hidup** di layar Game, dan frame `{p50:17, p90:33, p99:50}` dengan 4 long task. `start()` kini memakai token `generation` yang dinaikkan tiap `stop()`, sehingga `start()` yang masih berjalan membatalkan diri dan menutup kamera/model yang baru dibuka. Setelah perbaikan: 1 track hidup, frame `{p50:17, p90:17, p99:17}`, 1 long task (pemuatan model saat countdown). Sekaligus: pilihan delegate GPU/CPU kini **diukur** (hangat `warmupFrames`, tolak di atas `maxInferenceMs` 45 ms), laju deteksi 24 Hz, dan angka tuning pindah ke `gameConfig.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| BUG-007 | Jejak iris terhapus oleh satu deteksi yang meleset                           | 4 Nov 2026      | Adapter memanggil `manager.clear()` setiap kali satu deteksi tidak menemukan tangan, sehingga jejak iris ikut terhapus dan iris terasa "menghilang sendiri" saat tangan bergerak cepat. Kini tiap id tangan punya `staleHoldMs` (200 ms) dan pointer baru dibuang setelah tangan benar-benar hilang selama itu; kehadiran tangan memakai `presentWindowMs` (280 ms)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| BUG-008 | Animasi tersendat saat hand tracking aktif (inferensi memblokir main thread) | 4 Nov 2026      | `detectForVideo` menjalankan inferensi **sinkron di main thread** selama ~20 ms tiap panggilan. Pada 24 Hz itu ±48% dari setiap detik, sehingga animasi orb dan tirai tersendat. Pengukuran headless (Brave, `ANGLE Metal Renderer: Apple M5`, kamera palsu): baseline main thread `detectForVideo` rata-rata 14,57 ms, frame `{p50:16.7, p90:16.7, p99:16.8, max:183.4}` (max = pemuatan model). Perbaikan: inferensi dipindah ke **Web Worker klasik** (`src/input/handWorker.js`). Worker `type: 'module'` tidak bisa dipakai karena Vite menulis ulang setiap `import()`, termasuk dinamis (`__vite__injectQuery`), sehingga pemuat wasm MediaPipe di `public/` gagal di mode pengembangan; `importScripts` tidak disentuh Vite. Worker hanya mengirim landmark 8. Delegate **CPU (XNNPACK)** dipilih karena GPU tidak lebih cepat (19,86 vs 20,79 ms) dan jauh lebih buruk tanpa akselerasi nyata (SwiftShader 234 ms). Main thread hanya membayar `createImageBitmap` (±0,11 ms) lalu mengirim bitmap yang dialihkan; backpressure satu permintaan sekaligus mencegah penumpukan. Setelah perbaikan: pipeline `worker`, worker-side `detectForVideo` rata-rata 20,3 ms, frame `{p50:16.7, p90:16.7, p99:16.8, max:16.8}` — **nol frame terlewat**. `detectHz` dinaikkan 24 → 30 karena biayanya kini di thread lain. Jalur cadangan main thread tetap ada (dimuat malas) kalau Worker gagal |
| BUG-009 | Pratinjau Foto tidak persegi, tidak sama dengan hasil unduhan                | 4 Nov 2026      | `.photo__stage` memakai `aspect-ratio: 1/1` **dan** `max-height: min(64vh, 560px)`. Di desktop, kolom kiri 600 px lebih lebar dari batas tinggi 560 px, sehingga `max-height` menang dan panggung menjadi 600×560 (siku), padahal kanvas hasil 1080×1080. Pengukuran headless: `stageSquare:false` (560 px tinggi vs 600 px lebar). Perbaikan: batas dipindah ke lebar — `width: min(100%, 64vh, 560px)` dan `max-height: none` — sehingga `aspect-ratio` selalu menang. Setelah perbaikan: panggung 560×560 (desktop) dan 390×390 (layar sempit), keduanya persegi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| BUG-010 | Kanvas hasil lama menutupi pratinjau setelah "Jepret lagi"                   | 4 Nov 2026      | Efek yang menempelkan kanvas hasil ke panggung hanya berjalan saat `result` berubah. `backToSetup()` mengubah `phase` tanpa mengosongkan `result`, sehingga kanvas lama tidak pernah dilepas dan tetap terlihat menumpuk di atas pratinjau kamera yang hidup. Pengukuran headless: setelah "Jepret lagi", `hasPreview:true` **dan** `hasCanvas:true`. Perbaikan: `backToSetup()` memanggil `setResult(null)`, jadi efek melepas kanvas lewat pembersihnya. Setelah perbaikan: `hasCanvas:false`, pratinjau hidup kembali                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

---

## Risiko yang sudah diketahui (cek saat pengujian)

Bukan bug sungguhan, tapi titik rawan. Jika terbukti terjadi, ubah menjadi entri bug.

> Daftar ini sengaja dipangkas ke risiko yang benar-benar bisa diamati. Nomor ID tidak berurutan karena beberapa risiko lama dipindahkan menjadi langkah uji manual di `TODOLIST.md` bagian F10.

| ID   | Risiko                                                                                                             | Gejala yang dicari                                             | Area uji             | Terkait |
| ---- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | -------------------- | ------- |
| R-01 | Jejak dua tangan tertukar saat tangan saling menyilang                                                             | Garis loncat antar tangan                                      | Hand tracking        | T-026   |
| R-02 | Telunjuk yang diam ikut mengiris orb                                                                               | Orb pecah tanpa gerakan iris                                   | Collision            | T-047   |
| R-03 | Iris cepat "menembus" orb karena hanya titik yang diuji                                                            | Orb tidak pecah padahal dilewati                               | Collision            | T-047   |
| R-04 | Kamera tetap menyala setelah keluar dari game                                                                      | Lampu kamera tidak mati                                        | Siklus hidup         | T-113   |
| R-05 | Loop `requestAnimationFrame` ganda setelah masuk-keluar layar                                                      | FPS turun, orb bergerak terlalu cepat                          | Engine               | T-051   |
| R-06 | Fisika bergantung FPS                                                                                              | Orb jatuh lebih cepat di layar 144 Hz                          | Engine               | T-043   |
| R-09 | Tangan ketiga ikut terdeteksi                                                                                      | Lebih dari 2 jejak                                             | Input                | T-020   |
| R-11 | Koordinat salah saat window di-resize atau DPR berubah                                                             | Iris meleset dari orb                                          | Renderer             | T-060   |
| R-18 | `localStorage` rusak membuat leaderboard crash                                                                     | Layar kosong saat membuka leaderboard                          | Storage              | T-091   |
| R-22 | File `.task` atau `.wasm` gagal dimuat saat deploy (MIME salah)                                                    | Hand tracking gagal hanya di produksi                          | Deploy               | T-118   |
| R-23 | Model GPU gagal di perangkat tertentu                                                                              | Hand tracking tidak jalan                                      | Hand tracking        | T-023   |
| R-27 | Pause otomatis saat tab hilang tidak melanjutkan dengan benar                                                      | Game macet setelah kembali ke tab                              | Engine               | T-052   |
| R-28 | Orb dari soal lama masih bisa diiris                                                                               | Skor berubah setelah soal sudah berganti                       | Engine               | T-057   |
| R-29 | Dua orb bertumpuk, satu iris mengenai keduanya                                                                     | Satu iris memecah dua orb sekaligus                            | Spawner              | T-044   |
| R-30 | Komponen animasi membawa dependensi berat (three/ogl/motion) sehingga ikut ke bundel awal                          | Bundel awal membengkak, halaman lambat dibuka                  | Build                | T-088   |
| R-31 | Timer tetap berjalan saat pause                                                                                    | Nyawa hilang sendiri saat pemain menjeda                       | Engine               | T-055   |
| R-32 | Nama kosong tersimpan sebagai entri tanpa nama di leaderboard                                                      | Baris leaderboard tanpa nama                                   | Storage / UI         | T-074   |
| R-33 | Komponen React Bits **Pro** (tanpa lisensi) ikut dipakai, atau komponen gratis diubah sampai tidak bisa diperbarui | Pelanggaran lisensi; kode sulit di-update                      | Legal / Pemeliharaan | T-080   |
| R-34 | Dua komponen latar animasi jalan bersamaan                                                                         | FPS jatuh di bawah 60                                          | Performa             | T-080   |
| R-35 | Komponen gratis disalin tanpa mencatat commit upstream                                                             | Tidak tahu versi mana yang dipakai saat ada perbaikan upstream | Pemeliharaan         | T-018   |
| R-36 | Komponen animasi mengabaikan `prefers-reduced-motion`                                                              | Gerakan tetap jalan saat pengguna minta reduksi                | UI                   | T-095   |
| R-37 | `GlyphRain` memakai terlalu banyak kolom/glyph sehingga FPS jatuh                                                  | Layar leaderboard tersendat                                    | Performa             | T-089   |
| R-38 | Tangan keluar frame sekejap memicu auto-pause berkedip (pause → lanjut → pause)                                    | Permainan terasa tersendat saat tangan goyang                  | Input / Engine       | T-052   |
| R-39 | Timer soal mulai berjalan saat countdown belum selesai                                                             | Soal gagal sendiri sebelum pemain siap                         | Engine               | T-059   |

---

## Template laporan bug

```markdown
### BUG-XXX — [judul singkat]

- **Tingkat:** Kritis / Tinggi / Sedang / Rendah
- **Status:** Baru
- **Area:** (input / engine / renderer / UI / storage / audio / intro)
- **Terkait:** (ID TODOLIST, bila ada)
- **Ditemukan pada:** (tanggal)
- **Lingkungan:** (browser + versi, OS, desktop/mobile, mode kamera/mouse)

**Langkah mereproduksi** 1. 2. 3.

**Hasil yang diharapkan**
(sesuai PRD bagian ...)

**Hasil yang terjadi**

**Bukti** (tangkapan layar, pesan konsol, rekaman)

**Dugaan penyebab** (opsional)

**Perbaikan** (diisi setelah selesai)
```
