import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * audio.js memakai Web Audio API dan `fetch`. Lingkungan test berjalan di node,
 * jadi `window`, `AudioContext`, dan `fetch` ditiru. Modul disegarkan tiap test
 * karena menyimpan status (context, mute, sumber musik) di level modul.
 */

const startedSources = [];

class FakeBufferSource {
  constructor() {
    this.buffer = null;
    this.loop = false;
    this.playbackRate = { value: 1 };
    this.started = 0;
    this.stopped = 0;
  }
  connect() {}
  start() {
    this.started += 1;
    startedSources.push(this);
  }
  stop() {
    this.stopped += 1;
  }
}

class FakeGain {
  constructor() {
    this.gain = { value: 1, setTargetAtTime() {} };
  }
  connect() {}
}

class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
  }
  createGain() {
    return new FakeGain();
  }
  createBufferSource() {
    return new FakeBufferSource();
  }
  async resume() {
    this.state = 'running';
  }
  async decodeAudioData() {
    return { duration: 1 };
  }
}

function installLocalStorage() {
  const map = new Map();
  globalThis.window = {
    AudioContext: FakeAudioContext,
    localStorage: {
      getItem: (key) => (map.has(key) ? map.get(key) : null),
      setItem: (key, value) => map.set(key, String(value)),
      removeItem: (key) => map.delete(key),
    },
  };
  return map;
}

const realFetch = globalThis.fetch;

function installFetch({ musicGate } = {}) {
  globalThis.fetch = vi.fn(async (url) => {
    if (musicGate && String(url).includes('music.mp3')) await musicGate.promise;
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
  });
}

let map;
let audio;

beforeEach(async () => {
  startedSources.length = 0;
  map = installLocalStorage();
  installFetch();
  vi.resetModules();
  audio = await import('./audio.js');
});

afterEach(() => {
  delete globalThis.window;
  globalThis.fetch = realFetch;
});

describe('audio', () => {
  it('menolak memutar bunyi sebelum di-unlock', () => {
    expect(audio.play('slash')).toBe(false);
  });

  it('unlock lalu memutar efek slash', async () => {
    await audio.unlock();
    await audio.preload();
    expect(audio.play('slash')).toBe(true);
    expect(startedSources.length).toBe(1);
  });

  it('mute memblokir bunyi dan tersimpan di localStorage', async () => {
    await audio.unlock();
    await audio.preload();

    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
    expect(audio.play('slash')).toBe(false);
    expect(map.get('gravityslash:muted:v1')).toBe('1');

    audio.setMuted(false);
    expect(audio.play('slash')).toBe(true);
    expect(map.get('gravityslash:muted:v1')).toBe('0');
  });

  it('memulai musik latar berulang lalu menghentikannya', async () => {
    await audio.unlock();
    expect(await audio.startMusic()).toBe(true);

    const music = startedSources.find((source) => source.loop === true);
    expect(music).toBeTruthy();
    expect(music.started).toBe(1);
    expect(await audio.startMusic()).toBe(false); // tidak dobel saat sudah berbunyi

    audio.stopMusic();
    expect(music.stopped).toBe(1);
  });

  it('tidak memulai musik basi kalau layar dilepas saat buffer masih dimuat', async () => {
    await audio.unlock();

    let release;
    const musicGate = { promise: new Promise((resolve) => (release = resolve)) };
    installFetch({ musicGate });

    const pending = audio.startMusic();
    audio.stopMusic(); // layar Menu dilepas sebelum buffer selesai dimuat
    release();

    expect(await pending).toBe(false);
    expect(startedSources.find((source) => source.loop === true)).toBeUndefined();
  });
});
