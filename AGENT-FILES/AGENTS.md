# AGENTS.md — Panduan untuk AI Agent

File ini wajib dibaca sebelum mengerjakan apa pun di proyek **Gravity Slash**.

## 1. Tentang proyek

Game web bergaya Fruit Ninja bertema matematika. Pemain mengiris orb jawaban dengan ujung jari telunjuk yang dideteksi kamera (maksimal 2 tangan). Ada 3 nyawa, orb bahaya, dan orb nyawa yang rare. Leaderboard disimpan lokal.

Dokumen acuan, baca sesuai kebutuhan. Semua dokumen ada di folder `AGENT-FILES/` — **satu lokasi, tidak disalin ke root repo**:

| File | Isi |
|---|---|
| `PRD.md` | Apa yang dibuat dan aturan game |
| `ARCHITECTURE.md` | Bagaimana dibuat, struktur folder, kontrak antar modul |
| `TODOLIST.md` | Daftar pekerjaan dan statusnya |
| `BUGLIST.md` | Bug yang diketahui dan statusnya |

Jika dokumen saling bertentangan, urutan prioritas: **instruksi pemilik produk di percakapan → PRD → ARCHITECTURE → AGENTS**.

Pembagian wilayah agar tidak saling menabrak: **aturan game dan perilaku pemain** selalu PRD; **struktur teknis, penamaan modul, dan kontrak data** selalu ARCHITECTURE; **status pekerjaan** hanya TODOLIST.

## 2. Aturan utama

1. **WAJIB bertanya jika ada yang kurang jelas.** Jangan menebak. Ajukan pertanyaan singkat dan spesifik sebelum menulis kode. Ini berlaku untuk perilaku game, tampilan, dan pilihan teknis.
2. **Jangan mengarang komponen React Bits.** Komponen animasi diambil dari **pustaka gratis React Bits** (lisensi MIT + Commons Clause), rasa **JS-CSS**, disalin apa adanya dari repositori resminya. Jangan menulis ulang dari deskripsi, jangan menebak props, dan **jangan mengambil komponen React Bits Pro** (butuh lisensi berbayar yang belum dimiliki). Kalau komponennya belum ada di `src/components/reactbits/`, pakai placeholder bertanda `TODO(reactbits)` dan beri tahu pemilik produk — jangan mengarang isinya.
3. **Kerjakan satu hal per langkah**, sesuai item di `TODOLIST.md`. Jangan melompat atau menambah fitur di luar PRD tanpa persetujuan.
4. **Perbarui dokumen** setelah selesai: centang item di `TODOLIST.md`, catat bug baru di `BUGLIST.md`, dan beri tahu jika ada perubahan yang memengaruhi PRD atau ARCHITECTURE.
5. **Bahasa:** dokumen dan teks UI dalam Bahasa Indonesia. Nama variabel, fungsi, dan komentar kode dalam bahasa Inggris, kecuali pemilik produk meminta lain.

## 3. Tech stack

- React (JavaScript, **bukan** TypeScript) + Vite
- **Pustaka gratis React Bits** (MIT + Commons Clause), rasa **JS-CSS**: komponen latar dan teks animasi (lihat PRD 7.5)
- `@mediapipe/tasks-vision` untuk hand tracking
- Canvas 2D untuk gameplay
- Vitest, ESLint, Prettier
- **Dependensi pihak ketiga hanya yang benar-benar di-`import` oleh komponen yang dipakai.** Kandidat di ekosistem React Bits: `motion`, `gsap`, `ogl`, `three`, `postprocessing`, `@react-three/fiber`, `meshline`, `maath`, `gl-matrix`. Daftar pastinya dicatat di `ARCHITECTURE.md` bagian 2 **setelah sumber komponennya dibaca** — jangan menebak dan jangan memasang lebih dulu

**Default tanpa dependensi baru.** Sebutkan alasannya dan tanyakan dulu bila ragu. Khusus v1: `zustand`, `howler`, dan `@react-three/fiber` **tidak dipakai kecuali pemilik produk menyetujuinya secara eksplisit** — state UI memakai React Context + `useReducer`, audio memakai Web Audio API, dan komponen animasi hanya memakai dependensi yang benar-benar dibawanya.

Dua aturan yang tidak boleh dilanggar untuk komponen animasi: **setiap komponen di-`import()` dinamis** (agar tidak masuk bundel awal) dan **satu latar animasi aktif per layar** — tidak pernah dua bersamaan, dan tidak ada latar animasi di layar Game.

## 4. Penggunaan skills

Gunakan skill yang tersedia secara maksimal. Panggil skill lewat tool `skill` di sesi ini — **jangan mengandalkan path `SKILL.md`**, karena lokasinya bisa berbeda di tiap lingkungan. Jika skill yang dibutuhkan tidak tersedia, kerjakan sesuai brief di bagian ini dan beri tahu pemilik produk.

| Situasi | Skill |
|---|---|
| Membangun atau mengubah tampilan: layar, HUD, intro, tipografi, warna, animasi | `design-taste-frontend`, `frontend-design-direction` |
| Meninjau kualitas antarmuka dan kepatuhan pedoman web | `web-design-guidelines` |
| Memeriksa kontras, fokus keyboard, target sentuh, dukungan pembaca layar | `accessibility` |
| Menulis atau menyunting teks UI agar tidak terdengar generik | `antislop-copywriting` |

Catatan penerapan skill desain untuk proyek ini:
- Brief visual: palet 3 warna utama dari referensi pemilik produk. **Hex direvisi & terverifikasi** (4 Nov 2026): Marshmallow White `#F0F0F0`, Galactic Violet `#472E97`, Bubblegum Pink `#FF77BC`, tercatat di `tokens.css`. Komposisi **60% violet / 30% putih / 10% pink** (dominan/pendukung/aksen). **Ikuti brief tersebut persis**; jangan menambah hex baru.
- Buat rencana desain singkat (warna, tipografi, layout, prinsip) sebelum menulis kode UI, lalu tinjau terhadap brief.
- Pilih font dengan sengaja, bukan font bawaan generik.
- Gerakan non-interaktif dipakai hemat. Satu momen utama: intro **GRAVITY SLASH**.
- Penuhi batas kualitas: kontras cukup, fokus keyboard terlihat, `prefers-reduced-motion` dihormati.
- Teks UI singkat dan jelas, dari sudut pandang pemain. Pesan error menjelaskan masalah dan cara memperbaikinya, tanpa permintaan maaf berlebihan.

> Jika pemilik produk memasang skill lain (misalnya terkait React Bits atau MediaPipe), skill itu **ditambahkan di tabel ini** dan dipakai lebih dulu untuk area terkait.

## 5. Perintah

> Sesuaikan jika `package.json` berubah.

```bash
npm install        # pasang dependensi
npm run dev        # server pengembangan (localhost, kamera diizinkan di localhost)
npm run build      # build produksi ke dist/
npm run preview    # uji hasil build
npm run lint       # ESLint
npm run test       # Vitest
```

## 6. Konvensi kode

- Komponen React: `PascalCase.jsx`. Modul biasa: `camelCase.js`.
- Satu tanggung jawab per file. Pisahkan logika dari tampilan.
- **Folder `src/engine/` dan `src/input/` tidak boleh meng-import React.**
- Semua angka game (nyawa, skor, peluang spawn, kecepatan, ambang iris) hanya ada di `src/config/gameConfig.js`. **Jangan menulis angka ajaib di tempat lain.**
- Warna, font, dan spacing diambil dari `src/styles/tokens.css`. Jangan menulis hex langsung di komponen.
- Komponen di `components/reactbits/` **jangan diubah isinya**. Buat pembungkus (wrapper) bila perlu penyesuaian.
- Komentar menjelaskan **mengapa**, bukan **apa**.

## 7. Aturan khusus game

Pelanggaran aturan ini hampir selalu menimbulkan bug serius.

1. **Jangan taruh posisi orb, jejak slash, atau data per-frame di state React.** Simpan di engine. React hanya menerima event ringan (skor, nyawa, soal, feedback).
2. **Fisika memakai `dt`.** Tidak boleh bergantung pada FPS.
3. **Maksimal 2 pointer.** Jaminan ini ada di `InputManager`. Hanya landmark **8** (ujung telunjuk) yang dipakai.
4. **Iris dihitung sebagai segmen vs lingkaran**, bukan hanya titik. Iris wajib melewati ambang kecepatan.
5. **Setiap soal punya tepat 1 jawaban benar** dan semua pilihan unik, tidak negatif.
6. **Orb yang sudah teriris tidak boleh diproses lagi.**
7. **Semua akses `localStorage` dibungkus `try/catch`** lewat `services/storage.js`.
8. **Bersihkan sumber daya:** hentikan track kamera, loop `requestAnimationFrame`, listener, dan komponen animasi saat layar dilepas.
9. **Pause otomatis** saat tab tidak aktif **dan** saat tangan hilang dari frame.
10. **Privasi:** jangan mengirim, menyimpan, atau merekam frame kamera. Tidak ada panggilan jaringan untuk data pengguna.
11. **Aset (model MediaPipe, wasm, audio) disajikan dari `public/`**, bukan CDN pihak ketiga.

## 8. Definisi selesai

Sebuah item dianggap selesai jika:
- [ ] Perilaku sesuai PRD
- [ ] `npm run lint` dan `npm run test` lolos
- [ ] Diuji manual di browser desktop (kamera dan mode mouse)
- [ ] Tidak ada error atau peringatan di konsol
- [ ] Tidak ada kebocoran: kamera mati dan loop berhenti saat keluar dari layar
- [ ] `TODOLIST.md` dan `BUGLIST.md` diperbarui
- [ ] Untuk UI: fokus keyboard, kontras, dan `prefers-reduced-motion` diperiksa

## 9. Hal yang dilarang

- Mengubah aturan game di PRD tanpa persetujuan.
- Menghapus fallback mouse/touch.
- Menambah backend, akun, atau pelacakan.
- Memakai font atau komponen yang tidak jelas lisensinya.
- **Memakai komponen React Bits Pro tanpa lisensi.** Proyek ini memakai pustaka gratisnya (MIT + Commons Clause). Komponen Pro butuh lisensi berbayar per-developer dan **tidak boleh** disalin dari dokumentasi, devtools, atau sumber mana pun tanpa lisensi.
- **Menjual ulang atau meredistribusi komponen React Bits itu sendiri** (misalnya menerbitkannya sebagai paket npm sendiri). Commons Clause melarang itu; memakai komponennya di dalam aplikasi tetap boleh.
- Menyimpan atau mengunggah gambar dari kamera.
- Memasukkan `dangerouslySetInnerHTML` dengan data pengguna (misalnya nama leaderboard).

## 10. Format laporan setelah bekerja

Setelah selesai, laporkan singkat:
1. Apa yang dikerjakan (kaitkan dengan ID di `TODOLIST.md`).
2. File yang diubah.
3. Cara mengujinya.
4. Pertanyaan atau keputusan yang masih menunggu pemilik produk.
