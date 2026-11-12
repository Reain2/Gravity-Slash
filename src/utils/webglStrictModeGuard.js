/**
 * Penjaga kompatibilitas WebGL ↔ React StrictMode (khusus mode pengembangan).
 *
 * Komponen animasi React Bits (Particles, Topography, GradientASCII, dan
 * seterusnya) melepas konteks WebGL-nya di fungsi pembersih efek lewat
 * `getExtension('WEBGL_lose_context').loseContext()`. Di mode pengembangan,
 * StrictMode memasang setiap efek dua kali — pasang, bersihkan, pasang lagi.
 * Pembersihan pertama mematikan konteks, lalu pemasangan kedua memakai ulang
 * konteks yang sudah mati itu; semua gambar jadi no-op dan kanvas tampak kosong.
 * Karena komponennya disalin apa adanya (tidak boleh diubah isinya), dampaknya
 * menimpa semua latar WebGL, termasuk yang sudah ada sebelumnya (BUG-016).
 *
 * Perbaikannya sengaja sempit: `loseContext()` yang datang saat kanvas MASIH
 * tercantum di dokumen diabaikan — itulah pembersihan palsu dari StrictMode,
 * yang memang tidak melepas DOM. Saat layar benar-benar dilepas, React sudah
 * mencabut kanvas dari dokumen lebih dulu, jadi `loseContext()` berjalan seperti
 * biasa dan sumber daya GPU tetap dibebaskan (syarat AGENTS.md bagian 7.8).
 *
 * Hanya aktif di `import.meta.env.DEV`, jadi build produksi tidak tersentuh dan
 * isi fungsi ini dibuang saat build.
 */

const LOSE_CONTEXT_EXTENSION = 'WEBGL_lose_context';

export function installWebglStrictModeGuard() {
  if (!import.meta.env.DEV) return;
  if (typeof HTMLCanvasElement === 'undefined') return;
  if (HTMLCanvasElement.prototype.__strictModeGuard) return;
  HTMLCanvasElement.prototype.__strictModeGuard = true;

  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function getContext(type, attributes) {
    const context = originalGetContext.call(this, type, attributes);
    if (!context || !String(type).startsWith('webgl') || context.__strictModeGuard) return context;
    context.__strictModeGuard = true;

    const canvas = this;
    const originalGetExtension = context.getExtension.bind(context);

    context.getExtension = (name) => {
      if (name !== LOSE_CONTEXT_EXTENSION) return originalGetExtension(name);
      const extension = originalGetExtension(name);
      if (!extension) return extension;
      return {
        loseContext() {
          if (canvas.isConnected) return;
          extension.loseContext();
        },
        restoreContext: () => extension.restoreContext(),
      };
    };

    return context;
  };
}
