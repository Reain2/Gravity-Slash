# PRD — Gravity Slash

| | |
|---|---|
| **Versi** | 0.1 (draft) |
| **Tanggal** | 4 November 2026 |
| **Status** | Menunggu review pemilik produk |
| **Dokumen terkait** | `ARCHITECTURE.md`, `AGENTS.md`, `TODOLIST.md`, `BUGLIST.md` |

---

## 1. Ringkasan

**Gravity Slash** adalah game web bergaya Fruit Ninja dengan tema **matematika**. Pemain mengiris orb yang jatuh menggunakan **ujung jari telunjuk** yang dideteksi lewat kamera. Di tengah layar muncul sebuah soal aritmetika. Beberapa orb berisi jawaban jatuh dari atas, dan hanya satu yang benar. Pemain harus mengiris orb yang benar dan menghindari orb bahaya.

Nama game, **GRAVITY SLASH**, muncul lewat animasi intro setelah pemain menahan bidik di wordmark **layar pembuka** (kamera sudah menyala di sana) dan menahan tombol **Lanjut** di **layar uji tangan** (latar animasi bertema astral).

## 2. Tujuan dan non-tujuan

### Tujuan
1. Pengalaman bermain yang terasa fisik dan responsif memakai gerakan tangan di depan kamera.
2. Melatih hitungan dasar (+ − × ÷) secara cepat dan menyenangkan.
3. Identitas visual kuat dengan tiga warna utama dan intro yang berkesan.
4. Berjalan sepenuhnya di browser, tanpa backend. Semua data disimpan lokal.

### Non-tujuan (v1)
- Tidak ada akun, login, atau leaderboard online.
- Tidak ada mode multiplayer.
- Tidak ada materi di luar aritmetika dasar (tema lain direncanakan setelah v1).
- Tidak ada aplikasi native.

## 3. Target pengguna dan perangkat

- **Pengguna:** pelajar dan umum yang ingin latihan hitung dengan cara yang seru.
- **Perangkat utama:** desktop/laptop dengan webcam, browser modern (Chrome, Edge, Firefox terbaru).
- **Bonus:** mobile, dikerjakan jika performa hand tracking mencukupi. Mobile tidak boleh menghambat keputusan desain desktop.
- **Fallback input:** mouse atau touch jika kamera ditolak atau tidak tersedia.

## 4. Alur pengguna

```
Buka website
   │  (izin kamera diminta di sini; peringatan privasi tampil)
   ▼
[Layar pembuka — wordmark di atas latar astral, kamera + pratinjau aktif]
   │  hover bebas; tahan bidik di "Gravity Slash" ±3 detik (klik/Enter tetap bisa)
   ▼
[Layar uji tangan — latar animasi astral, "astral projection"]
   │  hover bebas untuk menguji bidik
   │  ── tahan di tombol "Lanjut" ──► loading
   │  ── Tanpa kamera ─────────────► mode Mouse/Touch
   │  ── Kembali ──────────────────► layar pembuka (tanpa meminta izin kamera lagi)
   ▼
[Layar loading — animasi intro "GRAVITY SLASH" (animasi teks) + aturan; hover bebas]
   │
   ▼
[Menu]  Main · Foto · Leaderboard · (demo: kembali ke layar pembuka)
   │
   ▼
[Game]  3 nyawa, timer per soal, soal di tengah, orb jatuh
   │  nyawa habis
   ▼
[Game Over]  skor akhir · Main lagi · Simpan skor
   │  jika skor masuk top 10 → input nama
   ▼
[Leaderboard] → [Menu] atau Main lagi
```

## 5. Mekanik game

### 5.1 Soal
- Satu soal tampil di tengah layar pada satu waktu, contoh: `7 × 8 = ?`
- Operasi v1: penjumlahan, pengurangan, perkalian, pembagian.
- Hasil selalu bilangan bulat dan tidak negatif.
- Pembagian selalu habis dibagi.
- Rentang angka awal (nilai awal, bisa disetel di `config`):
  - `+` dan `−`: 1–20
  - `×`: tabel 2–12
  - `÷`: kebalikan dari tabel perkalian 2–12

### 5.2 Jenis orb

| Orb | Warna | Efek jika diiris | Frekuensi |
|---|---|---|---|
| **Jawaban benar** | Marshmallow White `#F0F0F0` | Skor naik, combo naik, soal berganti | Tepat 1 per soal |
| **Jawaban salah** | Marshmallow White `#F0F0F0` (sama dengan benar) | Skor berkurang, combo reset, flash "JAWABAN SALAH" | 2–3 per soal |
| **Orb bahaya** | Warna bahaya dari palet, **wajib kontras jelas** dari orb jawaban | Nyawa berkurang 1, layar bergetar | Kadang-kadang |
| **Orb nyawa (rare)** | Warna aksen dari palet, berbeda dari orb jawaban | Nyawa bertambah 1 (maksimal 3) | Sangat jarang |

> Orb jawaban benar dan salah **sengaja tampil sama** agar pemain benar-benar menghitung. Keduanya hanya dibedakan oleh angka di dalamnya.

> Warna pasti orb bahaya dan orb nyawa ditentukan di F1 (T-013) memakai token dari palet utama. Syaratnya hanya satu: **tidak boleh tertukar dengan orb jawaban**. Jangan menambah hex di luar palet tanpa konfirmasi pemilik produk.

### 5.3 Nyawa, skor, combo, dan timer (angka awal, bisa disetel)
- **Nyawa:** mulai 3, maksimal 3. Game over saat 0.
- **Jawaban benar:** +10 poin dikali pengali combo.
- **Combo:** naik tiap 3 jawaban benar berturut-turut. Pengali x1 sampai x5.
- **Jawaban salah:** −5 poin, skor tidak boleh di bawah 0, combo reset.
- **Orb bahaya:** −1 nyawa. Skor tidak berubah.
- **Orb nyawa:** +1 nyawa. Jika nyawa sudah penuh, orb nyawa tidak muncul.

**Timer soal (pemberi tekanan utama):**
- Setiap soal punya batas waktu. Nilai awal **10 detik**, turun pelan seiring naiknya level kesulitan, dengan batas bawah **5 detik**.
- Timer berjalan selama soal aktif, **berhenti saat pause**, dan **reset penuh setiap soal baru**.
- Timer habis = soal gagal (lihat 5.5). Tanpa timer ini, game nyaris tidak bisa kalah karena orb yang lolos tidak memberi penalti.
- Timer tampil di HUD sebagai bilah waktu atau angka detik, dan berubah warna saat tersisa sedikit.

**Countdown mulai:**
- Sebelum soal pertama, tampil hitung mundur **5 detik** di tengah layar. Timer soal pertama baru berjalan setelah countdown selesai, supaya pemain punya waktu menyiapkan tangan.

**Pause:**
- Game otomatis pause saat **tab tidak aktif** dan saat **tangan hilang dari frame** (mode hand tracking). Saat pause, timer berhenti dan layar menampilkan instruksi singkat untuk melanjutkan.

### 5.4 Spawn dan fisika
- Setiap soal memunculkan satu gelombang berisi 3–4 orb jawaban (1 benar).
- Orb jatuh dari atas dengan posisi X acak dan gravitasi, dan boleh berputar pelan.
- Posisi X antar orb dalam satu gelombang **wajib berjarak minimum** (sekitar 1,5× diameter orb), agar orb tidak bertumpuk dan iris tetap jelas.
- Peluang orb bahaya per gelombang: sekitar 20% (maksimal 1–2 sekaligus).
- Peluang orb nyawa per gelombang: sekitar 8%, hanya jika nyawa kurang dari 3, dan maksimal 1 orb nyawa per 5 gelombang. (Peluang dinaikkan dari 4% karena dengan timer, nyawa lebih sering turun tetapi orb nyawa tetap harus cukup jarang terasa spesial.)
- Orb jawaban salah dipilih dari angka yang masuk akal dan dekat dengan jawaban benar, bukan acak murni. Semua nilai unik dan tidak negatif.
- Tingkat kesulitan naik pelan: kecepatan jatuh, rentang angka, dan penurunan batas waktu bertambah setiap 5 jawaban benar, **sampai level maksimum 5** lalu berhenti (nilai awal, bisa disetel).

### 5.5 Kondisi khusus
- Jawaban benar iris → soal berganti, orb lain di layar memudar.
- **Soal gagal** terjadi bila **timer habis** *atau* orb jawaban benar keluar layar tanpa diiris. Akibatnya: combo reset, **nyawa berkurang 1**, lalu soal berganti. Inilah sumber tekanan utama permainan.
- **Daur hidup orb saat soal berganti:** semua orb dari gelombang lama langsung ditandai teriris (`sliced`), memudar, lalu dihapus, dan **tidak bisa dinilai lagi**. Jadi memotong orb sisa tidak menambah atau mengurangi skor.
- Orb yang keluar dari bawah layar dihapus tanpa efek (kecuali orb jawaban benar, yang memicu soal gagal).
- Orb tidak boleh diiris dua kali.

## 6. Input

### 6.1 Hand tracking (mode utama)
- Sumber: kamera lewat browser (`getUserMedia`).
- Deteksi tangan: **MediaPipe Hand Landmarker**, `numHands = 2`.
- **Maksimal 2 tangan.** Tangan ketiga ke atas tidak diproses.
- Hanya **ujung jari telunjuk** (landmark index 8) yang dipakai sebagai "pisau". Jari lain diabaikan.
- Gambar kamera dibalik horizontal (mirror) agar gerakan terasa alami.
- Posisi dihaluskan (smoothing) agar tidak bergetar, tanpa menambah latensi yang terasa.
- Setiap telunjuk menghasilkan jejak slash sendiri.
- Iris dianggap sah jika **kecepatan gerak melewati ambang minimum**, sehingga telunjuk yang diam di atas orb tidak ikut mengiris.
- Pratinjau kamera kecil di pojok, bisa disembunyikan.

### 6.2 Mouse/touch (fallback)
- Mouse: satu pointer, tahan klik lalu geser untuk mengiris.
- Touch: sampai 2 titik sentuh.
- Aturan iris, kecepatan, dan jejak sama dengan mode kamera.

### 6.3 Kasus kamera
| Kondisi | Perilaku |
|---|---|
| Izin ditolak | Pesan singkat yang menjelaskan alasan dan langkah memperbaiki, lalu tawarkan mode mouse/touch |
| Kamera tidak ada | Langsung tawarkan mode mouse/touch |
| Tangan hilang dari frame | Jejak memudar, game otomatis pause dan menampilkan instruksi lanjut |
| Model gagal dimuat | Pesan error jelas dan tawarkan mode mouse/touch |

## 7. Visual dan audio

### 7.1 Palet utama (3 warna, dari referensi pemilik produk)

| Nama referensi | Hex | Penggunaan |
|---|---|---|
| Marshmallow White | `#F0F0F0` | Pendukung 30%: teks utama, orb jawaban, tombol sekunder (`.btn--accent`) |
| Galactic Violet | `#472E97` | Bidang dominan 60% (latar, panel). **Bukan** isian tombol dan **bukan** teks di atas bidang violet |
| Bubblegum Pink | `#FF77BC` | Aksen 10%: **aksi utama** (`.btn--primary`), feedback, sorotan combo |

> **Status hex: TERVERIFIKASI ULANG (4 Nov 2026).** Pemilik produk merevisi dua
> hex karena `#105BFF` terbaca biru, bukan violet: `F0F0F0`, `472E97`, `FF77BC`.
> Ketiganya kini menjadi sumber kebenaran di `tokens.css`. Jangan menambah hex
> baru tanpa konfirmasi.
>
> **Peran warna diperbaiki (BUG-012, 4 Nov 2026).** Violet `#472E97` di atas
> bidang violet hanya **1,16:1**, jadi ia tidak boleh menjadi isian tombol maupun
> warna teks di atas bidang violet — bentuknya tenggelam ("warna overlap"). Tiga
> peran token ditetapkan:
> - **Bidang (60%):** violet **digelapkan** jadi `--color-night` **`#2e1c63`**
>   untuk `--bg`; panel `--bg-raised` **`#3f2a87`** (satu langkah terang, bukan
>   setara). Ini turunan violet, bukan hex palet baru.
> - **Aksen violet (garis/teks di atas bidang):** turunan terang
>   `--color-violet-lift` **`#aca1d0`** (violet + putih 55%) sebagai `--accent`,
>   `--accent-strong` `#d3c9f6`. Nilai literal karena dibaca kanvas.
> - **Aksi (10%):** pink **`#FF77BC`** untuk tombol utama dan umpan balik; teks
>   di atasnya memakai `--color-night`.
>
> Kontras terukur: putih/bidang 12,60:1, putih/panel 10,51:1, aksen-terang/bidang
> 5,99:1, pink/bidang 5,89:1 — semuanya lolos WCAG AA.
>
> **Komposisi 60-30-10** (dikonfirmasi pemilik produk 4 Nov 2026): 60% Galactic
> Violet sebagai bidang dominan (latar, permukaan, tombol), 30% Marshmallow White
> sebagai pendukung (teks, orb jawaban), 10% Bubblegum Pink sebagai aksen (combo,
> nyawa, umpan balik). Latar gelap adalah turunan Galactic Violet yang digelapkan,
> bukan hex baru.
>
> Catatan setelah BUG-012: bagian "tombol" pada violet **digugurkan** — aksi
> utama kini pink (30% putih untuk tombol sekunder), karena violet tidak bisa
> kontras di atas bidang violet.

Warna latar gelap dan warna bahaya diturunkan dari palet utama saat token visual dibuat (F1). Jangan menambah hex baru tanpa konfirmasi.

### 7.2 Umpan balik
- **Jawaban benar:** flash singkat warna aksen (pink), partikel Marshmallow White, suara slash positif.
- **Jawaban salah:** flash warna berbeda dengan teks **"JAWABAN SALAH"**, angka pengurang skor muncul di titik iris.
- **Orb bahaya:** layar bergetar, flash warna bahaya, ikon nyawa pecah.
- **Orb nyawa:** efek warna aksen (pink), ikon nyawa bertambah.
- **Game over:** layar meredup dan skor akhir tampil.

### 7.3 Pembuka, uji tangan, dan intro (revisi 7 Nov 2026)
- **Layar pembuka** adalah kesan pertama: wordmark **GRAVITY SLASH** di atas latar astral, **izin kamera diminta di sini**, pratinjau kamera kecil tampil, dan **peringatan privasi kamera** ada di bagian bawah layar. Pemain boleh hover ke mana saja; untuk mulai ia **menahan bidik di tulisan Gravity Slash ±3 detik** (`confirmHoldMs`), dengan bilah pink sebagai umpan balik. Klik mouse dan Enter/Space tetap memulai (jalur cadangan).
- **Layar uji tangan** memakai latar animasi bertema astral: medan bintang yang saling terhubung dan berputar pelan, nuansa *astral projection*. Komponennya dari pustaka gratis React Bits (lihat 7.5). Layar ini menggantikan gerbang kamera + layar idle lama.
- Di layar ini pemain **mencoba bidik dengan bebas**: pratinjau kamera besar, dan ujung telunjuk menggerakkan **Crosshair** (React Bits gratis, lihat 7.5) yang mengunci wordmark dan tombol — bahasa visual yang sama dengan mengiris orb.
- **Lanjut:** pemain **berhenti di tombol Lanjut dan menahannya ±3 detik**. Bilah pink terisi; bidik keluar tombol atau tangan hilang membuat bilah kembali ke nol. Penuh → layar loading → menu. Klik mouse pada tombol juga langsung lanjut.
- **Jalur tanpa kamera:** tombol **Tanpa kamera** langsung memakai mode mouse/touch dan lanjut ke loading → menu.
- **Kembali:** tombol **Kembali ke layar pembuka** mematikan kamera dan kembali ke layar pertama tanpa meminta izin kamera lagi. Dari **Menu** juga ada tombol **Kembali ke layar pembuka** (khusus demo) yang kembali ke layar pertama.
- **Layar loading** adalah animasi intro **GRAVITY SLASH** (animasi teks) beserta tiga aturan singkat; setelah selesai (atau **Lewati**) masuk ke menu.
- Efek "globe pecah" tidak dipakai; penggantinya reaksi latar.

### 7.4 Audio
- Efek: slash, benar, salah, bahaya, nyawa bertambah, game over.
- Musik latar ringan.
- Tombol mute. Audio baru aktif setelah interaksi pertama pemain (aturan autoplay browser).
- **Sumber dan lisensi setiap berkas audio wajib dicatat** di `public/audio/CREDITS.md` sebelum dipakai (lihat AGENTS bagian 9). Semua audio disajikan dari `public/`, bukan CDN pihak ketiga.

### 7.5 Komponen animasi (React Bits gratis + efek original)

Komponen diambil dari **pustaka gratis React Bits** (lisensi MIT + Commons Clause), rasa **JS-CSS** — JavaScript dengan CSS biasa, tanpa Tailwind dan tanpa TypeScript. React Bits **Pro tidak dipakai** karena butuh lisensi berbayar yang belum dimiliki.

| Slot | Peran | Asal | Komponen |
|---|---|---|---|
| Latar uji tangan | medan bintang bergaris rasi, nuansa astral | React Bits gratis | **Topography** |
| Kursor layar pembuka & uji tangan | penanda bidik yang mengunci ke wordmark & tombol | React Bits gratis | **Crosshair** |
| Latar menu | drape titik bercahaya yang melipat | React Bits gratis | **Pattern Waves** |
| Latar leaderboard | hujan glyph bercahaya berlapis | Efek original | `GlyphRain` (canvas 2D) |
| Teks intro | **GRAVITY SLASH** tersusun dari partikel | React Bits gratis | **Particle Text** |
| Teks game over | **GAME OVER** terurai dari kabut | React Bits gratis | **Blur Text** |

Catatan:
- Nama komponen diambil dari daftar resmi pustaka gratis React Bits, bukan karangan. Rakitan nama install-nya mengikuti aturan resmi `@react-bits/<Nama>-JS-CSS` (misalnya `@react-bits/Particles-JS-CSS`), dan **wajib diverifikasi lagi saat komponennya benar-benar disalin di F7**.
- **Crosshair** bukan latar animasi, melainkan overlay kursor (kanvas `pointer-events: none` di atas layar uji tangan). Karena itu ia tidak melanggar aturan "satu latar aktif per layar". Warnanya disuplai sebagai nilai nyata (pink token) karena `color`-nya melalui `ctx.fillStyle`.
- Latar leaderboard sengaja dibuat original (canvas 2D) karena tidak ada komponen gratis yang benar-benar "hujan glyph berlapis", dan efeknya sederhana serta ringan tanpa dependensi tambahan.
- Pengganti gratis dipilih karena bentuknya paling dekat dengan yang diinginkan. Kalau saat F7 hasilnya kurang cocok, **dibahas dulu dengan pemilik produk** sebelum diganti.

Aturan pemakaian:
- **Satu komponen latar aktif pada satu waktu**, dan **tidak ada latar animasi di layar Game** (canvas game menutupi seluruh layar, jadi latar di belakangnya tidak terlihat).
- Setiap komponen animasi wajib punya versi reduksi untuk `prefers-reduced-motion`.
- Komponen React Bits disalin apa adanya; penyesuaian warna/ukuran lewat pembungkus (wrapper), bukan dengan mengubah isi komponennya.
- Setiap komponen dimuat lewat `import()` dinamis agar tidak masuk bundel awal.
- Karena dimuat dinamis, komponen **dipanaskan lebih awal** dari layar pembuka (`preloadBackdrops`) supaya tidak ada jeda "muncul tanpa animasi" saat tirai antar-layar membuka (BUG-013).
- Sumber, versi, dan lisensi tiap komponen dicatat (lihat `docs/LICENSES.md`).

### 7.6 Tipografi
Belum ditentukan. Pemilihan font dilakukan saat implementasi UI dengan panduan skill desain yang tersedia (hindari font default yang generik), lalu **disajikan sendiri dari `public/fonts/`** dengan lisensi yang jelas dicatat. Angka di dalam orb **harus terbaca jelas** saat bergerak.

## 8. Leaderboard (lokal)

- Disimpan di `localStorage` pada perangkat dan browser yang sama.
- Isi: **nama, skor, tanggal**. Top 10.
- Nama diketik lewat keyboard di layar game over (maksimal 12 karakter). Jika dikosongkan, dipakai nama bawaan `PEMAIN`.
- Jika leaderboard belum berisi 10 entri, setiap skor dianggap masuk top 10.
- Skor sama diurutkan berdasarkan tanggal paling lama dulu.
- Ada tombol hapus data leaderboard dengan konfirmasi.
- Jika `localStorage` tidak tersedia, game tetap jalan dan pemain diberi tahu bahwa skor tidak tersimpan.

## 9. Kebutuhan fungsional

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-01 | Layar pembuka: minta izin kamera sejak awal, sediakan pratinjau + hover bidik, dan mulai dengan menahan bidik di wordmark ±3 detik (klik/Enter tetap bisa) | Wajib |
| FR-02 | Layar uji tangan (latar animasi astral): hover bebas untuk menguji bidik, lalu tahan di tombol Lanjut ±3 detik untuk memicu loading + intro "GRAVITY SLASH" | Wajib |
| FR-03 | Hand tracking maksimal 2 tangan, hanya ujung telunjuk | Wajib |
| FR-04 | Fallback mouse/touch dengan aturan iris yang sama | Wajib |
| FR-05 | Generator soal + - × ÷ dengan hasil bulat dan tidak negatif | Wajib |
| FR-06 | Gelombang orb: tepat 1 jawaban benar per soal | Wajib |
| FR-07 | Orb bahaya mengurangi 1 nyawa | Wajib |
| FR-08 | Orb nyawa rare menambah 1 nyawa (maksimal 3) | Wajib |
| FR-09 | Jawaban salah mengurangi skor dan menampilkan flash "JAWABAN SALAH" | Wajib |
| FR-10 | Sistem nyawa, skor, dan combo | Wajib |
| FR-11 | Game over, input nama, simpan ke leaderboard lokal | Wajib |
| FR-12 | Halaman leaderboard top 10 | Wajib |
| FR-13 | Audio dengan tombol mute | Sebaiknya |
| FR-14 | Pause (tombol atau tekan Esc/Spasi) | Sebaiknya |
| FR-15 | Pratinjau kamera dengan opsi sembunyikan | Sebaiknya |
| FR-16 | Layout responsif untuk mobile | Bonus |
| FR-17 | Timer per soal sebagai pemberi tekanan utama | Wajib |

## 10. Kebutuhan non-fungsional

| ID | Kebutuhan |
|---|---|
| NFR-01 | Render game stabil mendekati 60 FPS di laptop menengah |
| NFR-02 | Latensi dari gerakan jari ke jejak slash terasa instan (target di bawah 100 ms) |
| NFR-03 | Semua pemrosesan kamera berjalan **lokal di browser**. Tidak ada video yang dikirim atau disimpan. |
| NFR-04 | Pesan kamera dan privasi ditampilkan jelas sebelum izin diminta |
| NFR-05 | Dapat dimainkan tanpa kamera (fallback) |
| NFR-06 | Menghormati `prefers-reduced-motion` untuk animasi non-gameplay, dan fokus keyboard terlihat di menu |
| NFR-07 | Model MediaPipe dan aset disajikan dari proyek sendiri agar tidak bergantung CDN pihak ketiga saat bermain |
| NFR-08 | Aplikasi berupa situs statis tanpa backend |

## 11. Metrik keberhasilan (v1)
- Pemain bisa dari halaman awal sampai game pertama dalam kurang dari 30 detik.
- Iris dengan telunjuk terdeteksi andal pada pencahayaan ruangan biasa.
- Tidak ada crash saat kamera ditolak, tangan hilang, atau tab di-background.
- Leaderboard tetap benar setelah refresh.

## 12. Asumsi dan keputusan terbuka

**Sudah diputuskan**
- Salah iris: skor berkurang + flash "JAWABAN SALAH".
- Materi v1: aritmetika dasar (+ − × ÷).
- Fallback mouse/touch ada.
- Desktop utama, mobile bonus.
- **Komponen animasi memakai pustaka gratis React Bits** (MIT + Commons Clause) rasa **JS-CSS**, ditambah **satu efek original** (`GlyphRain`) untuk latar leaderboard (lihat 7.5). React Bits **Pro tidak dipakai** karena lisensinya berbayar dan belum dimiliki.
- Mekanik iris-globe diganti: pemain mengiris orb di layar permainan; layar uji tangan memakai hover + tahan tangan untuk memulai.
- Auto-pause aktif saat tangan hilang dari frame.
- Sebelum game dimulai, tampil countdown **5 detik**. Timer soal mulai setelah countdown selesai.
- Karena komponennya berlisensi bebas, komponen boleh ikut masuk repo (publik maupun privat). Yang **dilarang** adalah menjual ulang atau meredistribusi komponennya sebagai produk sendiri.
- Dokumen berbahasa Indonesia.
- **Timer per soal** sebagai pemberi tekanan utama; soal gagal (timer habis **atau** orb benar lolos) mengurangi 1 nyawa.
- **Tidak ada layar Pengaturan di v1.** Menu hanya berisi Main dan Leaderboard; tombol mute diletakkan di HUD, tombol hapus leaderboard di layar Leaderboard.
- **Palet diganti** jadi 3 warna utama dari referensi pemilik produk (lihat 7.1). Hex **sudah terverifikasi ulang** (4 Nov 2026): `F0F0F0`, `472E97`, `FF77BC`.
- **Tanpa dependensi Zustand/Howler** (lihat AGENTS bagian 3).
- **Pengurang skor jawaban salah: −5**, skor tidak boleh di bawah 0.
- **Plafon kesulitan: level 5**, dengan kenaikan awal dibuat pelan.
- **Countdown 5 detik** sebelum soal pertama; timer soal berikutnya 10 detik (minimum 5 detik).
- **Auto-pause** saat tab tidak aktif dan saat tangan hilang dari frame.

**Asumsi yang perlu dikonfirmasi**
1. ~~**Nilai hex palet** (7.1) — pemilik produk mengetikkan 3 hex-nya sebagai teks.~~ → **Selesai 4 Nov 2026, direvisi hari yang sama:** `F0F0F0`, `472E97`, `FF77BC` (`#105BFF` dan `#FE8500` diganti karena terbaca biru/oranye, bukan violet/pink).
2. **Pilihan komponen gratis** pada tabel 7.5 (Particles, Pattern Waves, Particle Text, Blur Text) perlu disetujui; kalau ada yang kurang cocok, sebutkan penggantinya.
3. **Tipografi** belum dipilih.
4. **Aset audio:** agent menyiapkan daftar contoh + format kredit; pemilik produk memilih dan mengimpor sendiri.

## 13. Di luar cakupan v1
- Tema materi lain (fisika, bahasa, dll.).
- Leaderboard online dan akun.
- Mode multiplayer.
- Pengaturan tingkat kesulitan manual.
- Gesture selain telunjuk.

## 14. Fitur Foto / selfie dengan efek (v1.1 — ditambahkan 4 Nov 2026)

Diminta pemilik produk 4 Nov 2026: "fitur foto bisa menunjukkan foto dengan efek-efek yang available, jadi orang-orang bisa selfie/foto." Bagian ini mengikat perilaku fitur tersebut.

### 14.1 Alur
1. Dari **Menu** → tombol **Foto** → layar **Foto**.
2. Layar Foto **membuka stream kamera sendiri** lewat hook pratinjau yang sudah ada (640×480, **tanpa** MediaPipe — tidak ada deteksi tangan di layar ini). Izin kamera bisa muncul sekali lagi di sini; ini konsekuensi aturan privasi yang mematikan kamera begitu keluar dari layar permainan.
3. Pemain memilih efek, menekan **Jepret** → **hitung mundur 3 detik** → foto diambil otomatis.
4. Hasil tampil. Pemain bisa **Unduh PNG** dan, kalau perangkat mendukung, **Bagikan**. Bisa **Jepret lagi** atau **Kembali ke Menu**.

Kamera tetap dimatikan sepenuhnya saat meninggalkan layar Foto (aturan 6.1 / AGENTS bagian 7.8).

### 14.2 Pilihan efek (semua bisa dinyalakan/dimatikan; filter wajib pilih satu)
| Efek | Isi |
|---|---|
| **Filter warna** (pilih satu) | `Asli`, `Starlight`, `Galactic` (tint violet), `Bubblegum` (tint pink), `Mono` |
| **Bingkai + skor/combo** | Bingkai bertema orb yang memuat angka dari **sesi terakhir** |
| **Jejak slash + partikel** | Goresan iris dan pecahan orb digambar sebagai hiasan |
| **Latar animasi** | Backdrop bergradasi palet + bintang di belakang potongan kamera (gaya photobooth) |
| **Stiker teks** | Teks pendek pilihan pemain, maksimal 20 karakter |

### 14.3 Sumber data skor
- Snapshot **sesi terakhir** disimpan saat game over di `localStorage` (`gravityslash:lastsession:v1`): `{ score, level, bestCombo, date }`.
- Kalau belum pernah ada sesi, bingkai menampilkan wordmark **GRAVITY SLASH** tanpa angka (tidak menampilkan 0 palsu).
- Snapshot ini **bukan** leaderboard; ia hanya untuk hiasan foto.

### 14.4 Komposisi dan hasil
- Kanvas hasil **1080×1080 px** (persegi, ramah selfie). Frame kamera di-*crop* tengah (cover) supaya tidak gepeng.
- Preview dan hasil **sama-sama dicermin** pada sumbu X (seperti cermin selfie) supaya hasil tidak terasa terbalik dari yang dilihat saat memotret.
- **Unduh PNG**: nama berkas `gravity-slash-<timestamp>.png`.
- **Bagikan**: memakai Web Share API (`navigator.canShare({ files })` + `navigator.share`). Kalau tidak didukung (umumnya desktop), tombol Bagikan disembunyikan dan hanya Unduh yang tampil.
- Foto diproses **lokal di browser**; tidak pernah diunggah atau dikirim (NFR-03). Kalau `toBlob` gagal, tampilkan pesan dan tawarkan coba lagi.

### 14.5 Kasus kamera ditolak
Pesan jelas (izin ditolak / kamera tidak ada / kamera sedang dipakai) + tombol **Coba lagi** dan **Kembali ke Menu**. Fitur lain (Menu, Main, Leaderboard) tetap jalan tanpa kamera.

### 14.6 Aksesibilitas dan gerak
- Semua kontrol berupa tombol dengan fokus terlihat; hitung mundur dan status hasil diumumkan lewat `aria-live`.
- `prefers-reduced-motion`: hitung mundut tetap berjalan (fungsional) tetapi tanpa animasi denyut/denyut skala.
- Layar Foto **tidak memakai latar animasi layar** (fokus ke kamera); "latar animasi" hanya digambar ke dalam foto. Ini tidak melanggar aturan satu latar per layar.

### 14.7 Kebutuhan fungsional tambahan
| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-18 | Layar Foto dapat dibuka dari Menu dan membuka kamera sendiri | Wajib |
| FR-19 | Filter warna bertema palet (minimal 3 pilihan) | Wajib |
| FR-20 | Bingkai skor/combo dari sesi terakhir | Wajib |
| FR-21 | Hitung mundur 3 detik sebelum jepret | Wajib |
| FR-22 | Unduh PNG hasil foto | Wajib |
| FR-23 | Bagikan lewat Web Share API bila didukung | Sebaiknya |
