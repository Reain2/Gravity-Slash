# Kredit dan lisensi aset audio

Fase **F9 diisi 5 Nov 2026**: pemilik produk mengimpor sendiri berkas audionya ke
folder ini (keputusan Q-11). Agent memverifikasi pemuatan dan pemutaran di peramban.

> **Status aset (5 Nov 2026) — terverifikasi.**
> Ketujuh berkas ada dan berfungsi: di build produksi aplikasi mengambil ketujuhnya
> setelah gestur pertama (7/7, tanpa error konsol), dan modul `services/audio.js`
> berhasil men-dekode serta memutar keenam SFX (`play()` → `true`) dan musik
> (`startMusic()` → `true`).
>
> Satu koreksi nama: berkas **`right.mp3` diubah menjadi `correct.mp3`** karena
> `AUDIO_FILES` di `src/services/audio.js` mencari `correct.mp3` — tanpa ini bunyi
> jawaban benar tidak akan pernah berbunyi. Isi berkasnya tidak diubah.
>
> Menunggu diisi pemilik produk: **tabel sumber & lisensi** di bawah (wajib
> menurut PRD 7.4 sebelum dipakai — jangan pakai berkas yang lisensinya tidak jelas).

## Nama berkas yang diharapkan

`src/services/audio.js` mencari berkas berikut di `public/audio/`. Kalau ada yang
belum ada, game tetap jalan tanpa bunyi (tidak error).

| Berkas | Dipakai untuk |
|---|---|
| `slash.mp3` | setiap gerakan iris |
| `correct.mp3` | jawaban benar |
| `wrong.mp3` | jawaban salah dan waktu habis |
| `bomb.mp3` | orb bahaya tersentuh |
| `heal.mp3` | orb nyawa diambil |
| `game-over.mp3` | permainan selesai |
| `music.mp3` | musik latar (di-loop) |

Format: `.mp3`. Kalau memakai format lain, ubah peta `AUDIO_FILES` di
`src/services/audio.js`.

## Spesifikasi bunyi yang dibutuhkan (catat 5 Nov 2026)

Pemilik produk menanyakan bunyi apa saja yang perlu dicari. Total **7 berkas**:
6 efek suara pendek (SFX) + 1 musik latar. Semua berformat `.mp3`. Nama berkas
**harus persis** seperti di tabel di atas, karena `AUDIO_FILES` di
`src/services/audio.js` mencarinya di jalur itu.

Saran durasi & karakter (bukan aturan keras — yang penting terasa cocok dan
tidak mengganggu saat cepat berulang):

| Berkas | Karakter yang dicari | Durasi saran | Kata kunci pencarian | Volume kode |
|---|---|---|---|---|
| `slash.mp3` | "swoosh" iris tajam; **diputar sangat sering** (tiap orb teriris), jadi harus pendek dan tidak menusuk | 0,15–0,35 s | `sword slash`, `whoosh slash`, `knife swipe` | 1,0 (default) |
| `correct.mp3` | konfirmasi **positif/naik** — bunyi "bener" yang enak, boleh bernada (ding/chime/pluck) | 0,3–0,6 s | `correct answer`, `success chime`, `positive notification` | 1,0 |
| `wrong.mp3` | **negatif turun**, tegas tapi tidak kasar (dipakai untuk jawaban salah **dan** waktu habis) | 0,3–0,6 s | `wrong answer`, `error buzz`, `negative notification` | 1,0 |
| `bomb.mp3` | **ledakan/dampak** orb bahaya tersentuh; boleh lebih berat dari yang lain | 0,5–1,0 s | `explosion impact`, `bomb hit`, `boom short` | 1,0 |
| `heal.mp3` | **cerah/menaikkan** untuk orb nyawa langka (nuansa "sembuh", sparkle) | 0,4–0,8 s | `heal`, `power up`, `magic sparkle`, `life up` | 1,0 |
| `game-over.mp3` | **penutup/selesai** — menurun, tidak panjang, boleh bernada | 0,8–2,0 s | `game over`, `lose jingle`, `failure sting` | 1,0 |
| `music.mp3` | musik latar **di-loop**; hanya diputar di layar Menu. Harus enak diulang (loop mulus) dan tidak bersaing dengan teks | 30–90 s (loop) | `ambient loop`, `calm electronic loop`, `menu background music` | 0,35 (diatur kode) |

Catatan:
- **SFX diputar lewat Web Audio `decodeAudioData`** lalu dimainkan satu-per-satu;
  berkas kecil (di bawah ~200 KB per SFX) paling aman.
- **Musik**: harus bisa di-loop mulus — pilih potongan yang awal/akhirnya bertemu,
  atau potongan ambient yang tidak punya ending jelas.
- **Nada/palette sonik**: game bertema luar angkasa + iris. Nada synth yang bersih
  atau ambient "astral" lebih pas daripada orkestra berat. Tidak wajib, tapi enak
  kalau ke-6 SFX berasal dari satu paket supaya nadanya konsisten.
- Semua wajib berlisensi jelas (CC0/CC-BY/Pixabay/OGA). Kalau CC-BY, isi kolom
  atribusi di tabel di bawah.

## Hasil ukur berkas yang sudah diimpor (5 Nov 2026)

Diukur dengan `afinfo`/`ffprobe` + dekode di peramban nyata:

| Berkas | Ukuran | Kanal | Durasi | Dekode di peramban | Catatan untuk dicek telinga |
|---|---|---|---|---|---|
| `slash.mp3` | 38 KB | mono | 1,20 s | 11 ms | **paling sering berbunyi**; 1,2 s terasa panjang saat iris cepat — cek apakah tumpang tindih terdengar penuh |
| `correct.mp3` | 87 KB | mono | 2,77 s | 5 ms | lebih panjang dari saran (0,3–0,6 s); cek apakah menutupi bunyi berikutnya |
| `wrong.mp3` | 57 KB | stereo | 1,80 s | 5 ms | ok |
| `bomb.mp3` | 158 KB | mono | 5,04 s | 4 ms | 5 detik cukup panjang untuk satu ledakan; cek apakah ekornya mengganggu |
| `heal.mp3` | 22 KB | mono | 0,71 s | 1 ms | pas |
| `game-over.mp3` | 97 KB | stereo | 3,08 s | 3 ms | ok |
| `music.mp3` | 3,8 MB | stereo | **243,6 s (4 menit)** | 164 ms | **berat**: buffer terdekode ≈ 86 MB RAM saat Menu dibuka. Pertimbangkan memangkas ke potongan loop 30–60 detik |

Tidak ada batas keras dari kode; kolom catatan hanya saran agar telinga pemilik
produk memutuskan. Yang paling layak dilihat: panjang `music.mp3` (memori) dan
`slash.mp3` (frekuensi tertinggi).

## Contoh sumber aset (gratis, lisensi jelas)

Pilih satu sumber, lalu catat pilihan sebenarnya di tabel bawah.

| Sumber | Lisensi | Catatan |
|---|---|---|
| https://freesound.org | CC0 / CC-BY (per berkas) | Banyak pilihan potongan pendek; cek lisensi tiap berkas |
| https://pixabay.com/sound-effects/ | Pixabay License | Bebas pakai komersial, tanpa atribusi wajib |
| https://opengameart.org | CC0 / CC-BY / GPL (per berkas) | Khusus aset game |
| https://kenney.nl/assets | CC0 | Paket efek suara siap pakai |

## Format tabel yang wajib diisi setelah aset diimpor

| Berkas | Judul | Pembuat | Sumber (URL) | Lisensi | Wajib atribusi? |
|---|---|---|---|---|---|
| `slash.mp3` | | | | | |
| `correct.mp3` | | | | | |
| `wrong.mp3` | | | | | |
| `bomb.mp3` | | | | | |
| `heal.mp3` | | | | | |
| `game-over.mp3` | | | | | |
| `music.mp3` | | | | | |

Aturan:
- Satu baris per berkas.
- Kalau lisensinya CC-BY, cantumkan atribusi yang diminta (nama pembuat + judul + lisensi) juga di layar Kredit atau di README nanti.
- Jangan memakai berkas yang lisensinya tidak jelas.
