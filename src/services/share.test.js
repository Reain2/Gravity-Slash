import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * share.js menyentuh `navigator`, `document`, dan `URL` saat dipanggil, bukan
 * saat modul dimuat. Lingkungan test berjalan di node, jadi global itu dipasang
 * lewat `vi.stubGlobal` supaya vitest bisa mengembalikannya dengan aman.
 */
let share;

beforeEach(async () => {
  vi.resetModules();
  share = await import('./share.js');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('makePhotoFilename', () => {
  it('memakai timestamp dan ekstensi png', () => {
    expect(share.makePhotoFilename(new Date(1700000000000))).toBe('gravity-slash-1700000000000.png');
  });

  it('tetap menghasilkan nama walau tanggal tidak valid', () => {
    expect(share.makePhotoFilename(new Date('bukan tanggal'))).toMatch(/^gravity-slash-\d+\.png$/);
  });
});

describe('canShareFile', () => {
  it('salah saat navigator atau Web Share tidak ada', () => {
    const file = { name: 'a.png' };
    expect(share.canShareFile(file)).toBe(false);
    vi.stubGlobal('navigator', { share: vi.fn() });
    expect(share.canShareFile(file)).toBe(false);
  });

  it('mengikuti jawaban navigator.canShare', () => {
    const file = { name: 'a.png' };
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: vi.fn(() => true) });
    expect(share.canShareFile(file)).toBe(true);
    vi.stubGlobal('navigator', {
      share: vi.fn(),
      canShare: vi.fn(() => {
        throw new Error('boom');
      }),
    });
    expect(share.canShareFile(file)).toBe(false);
  });
});

describe('shareOrDownload', () => {
  function installDom() {
    const link = { href: '', download: '', rel: '', click: vi.fn() };
    const body = { appendChild: vi.fn(), removeChild: vi.fn() };
    vi.stubGlobal('document', { createElement: vi.fn(() => link), body });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
    return { link, body };
  }

  it('memakai Web Share API saat didukung', async () => {
    const file = { name: 'foto.png' };
    const shareFn = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { share: shareFn, canShare: vi.fn(() => true) });

    const result = await share.shareOrDownload(file, { title: 'Gravity Slash' });

    expect(result).toEqual({ method: 'share', ok: true });
    expect(shareFn).toHaveBeenCalledWith({ files: [file], title: 'Gravity Slash', text: undefined });
  });

  it('pembatalan pengguna bukan kegagalan dan tidak mengunduh', async () => {
    const file = { name: 'foto.png' };
    const abort = Object.assign(new Error('batal'), { name: 'AbortError' });
    vi.stubGlobal('navigator', { share: vi.fn(() => Promise.reject(abort)), canShare: vi.fn(() => true) });
    const { link } = installDom();

    const result = await share.shareOrDownload(file);

    expect(result).toEqual({ method: 'share', ok: false, canceled: true });
    expect(link.click).not.toHaveBeenCalled();
  });

  it('jatuh ke unduh saat berbagi tidak didukung', async () => {
    vi.useFakeTimers();
    const { link, body } = installDom();
    vi.stubGlobal('navigator', {});

    const result = await share.shareOrDownload({ name: 'foto.png' });

    expect(result).toEqual({ method: 'download', ok: true });
    expect(link.download).toBe('foto.png');
    expect(link.click).toHaveBeenCalledOnce();
    expect(body.appendChild).toHaveBeenCalledWith(link);
    expect(body.removeChild).toHaveBeenCalledWith(link);
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(1000);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('melaporkan kegagalan saat DOM tidak tersedia', async () => {
    vi.stubGlobal('navigator', {});
    const result = await share.shareOrDownload({ name: 'foto.png' });
    expect(result).toEqual({ method: 'download', ok: false, reason: 'unsupported' });
  });
});

describe('buildPhotoFile', () => {
  it('membungkus blob jadi File dengan tipe png', () => {
    class FakeFile {
      constructor(parts, name, options) {
        this.parts = parts;
        this.name = name;
        this.type = options.type;
      }
    }
    vi.stubGlobal('File', FakeFile);
    const file = share.buildPhotoFile({ size: 3 }, 'x.png');
    expect(file).toBeInstanceOf(FakeFile);
    expect(file.name).toBe('x.png');
    expect(file.type).toBe('image/png');
  });

  it('mengembalikan blob apa adanya tanpa konstruktor File', () => {
    vi.stubGlobal('File', undefined);
    const blob = { size: 3 };
    expect(share.buildPhotoFile(blob)).toBe(blob);
  });
});
