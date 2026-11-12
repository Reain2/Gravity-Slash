/**
 * Membagikan atau mengunduh berkas foto (PRD 14.4).
 *
 * Semua berkas diproses di perangkat. Tidak ada unggahan jaringan (NFR-03).
 * Web Share API tidak tersedia di semua peramban (umumnya desktop tidak
 * mendukung berbagi berkas), jadi unduh lewat `<a download>` selalu jadi jalur
 * cadangan. Semua akses `navigator`/`document` dilakukan saat fungsi dipanggil,
 * bukan saat modul dimuat, supaya modul ini bisa diuji di luar peramban.
 */

const PHOTO_EXT = 'png';
const PHOTO_TYPE = 'image/png';

/** Nama berkas hasil foto: `gravity-slash-<timestamp>.png`. */
export function makePhotoFilename(date = new Date()) {
  const stamp = date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : Date.now();
  return `gravity-slash-${stamp}.${PHOTO_EXT}`;
}

/** Bungkus blob jadi `File` bila peramban mendukungnya; kalau tidak, kembalikan blob. */
export function buildPhotoFile(blob, filename = makePhotoFilename()) {
  if (typeof File === 'function') {
    try {
      return new File([blob], filename, { type: PHOTO_TYPE });
    } catch {
      return blob;
    }
  }
  return blob;
}

/**
 * Apakah berkas ini benar-benar bisa dibagikan? `canShare` perlu berkas nyata:
 * sebagian peramban punya `share` tetapi menolak berbagi berkas.
 */
export function canShareFile(file) {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  if (!nav || typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false;
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Unduh lewat tautan sementara. Mengembalikan status supaya UI bisa memberi tahu. */
export function downloadBlob(blob, filename) {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
    return { method: 'download', ok: false, reason: 'unsupported' };
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Beri waktu unduhan mulai sebelum URL dilepas.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { method: 'download', ok: true };
}

/**
 * Coba bagikan lewat Web Share API, jatuh ke unduh bila tidak didukung.
 * Pembatalan oleh pengguna (`AbortError`) bukan kegagalan: jangan unduh diam-diam.
 */
export async function shareOrDownload(file, { title, text } = {}) {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title, text });
      return { method: 'share', ok: true };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { method: 'share', ok: false, canceled: true };
      }
      // Dukungan ada tetapi gagal: lanjut ke unduh.
    }
  }
  const name = file?.name || makePhotoFilename();
  return downloadBlob(file, name);
}
