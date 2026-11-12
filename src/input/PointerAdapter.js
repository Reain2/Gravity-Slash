/**
 * PointerAdapter: mouse dan sentuh.
 *
 * Mouse: tahan tombol lalu geser (PRD bagian 6.2).
 * Sentuh: maksimal 2 titik aktif; titik ketiga diabaikan oleh InputManager.
 *
 * Koordinat dinormalkan terhadap kotak elemen target supaya sama dengan
 * ruang koordinat orb (ARCHITECTURE bagian 6.5).
 */

const MOUSE_ID = 'mouse-0';

export function createPointerAdapter({ target, manager, onInteraction }) {
  if (!target || !manager) throw new Error('PointerAdapter butuh target dan manager');

  const activeTouch = new Set();

  function toNormalized(event) {
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  function markInteraction() {
    if (typeof onInteraction === 'function') onInteraction();
  }

  function handlePointerDown(event) {
    markInteraction();
    const point = toNormalized(event);
    if (!point) return;

    if (event.pointerType === 'touch') {
      activeTouch.add(event.pointerId);
      manager.setPointer(`touch-${event.pointerId}`, point.x, point.y);
    } else {
      manager.setPointer(MOUSE_ID, point.x, point.y);
    }
    // Jangan preventDefault: tombol UI di atas canvas tetap harus bisa diklik.
  }

  function handlePointerMove(event) {
    const point = toNormalized(event);
    if (!point) return;

    if (event.pointerType === 'touch') {
      if (!activeTouch.has(event.pointerId)) return;
      manager.setPointer(`touch-${event.pointerId}`, point.x, point.y);
    } else {
      // Mouse mengiris hanya saat tombol ditekan.
      if (event.buttons === 0) {
        manager.removePointer(MOUSE_ID);
        return;
      }
      manager.setPointer(MOUSE_ID, point.x, point.y);
    }
  }

  function handlePointerUp(event) {
    if (event.pointerType === 'touch') {
      activeTouch.delete(event.pointerId);
      manager.removePointer(`touch-${event.pointerId}`);
    } else {
      manager.removePointer(MOUSE_ID);
    }
  }

  const options = { passive: true };

  target.addEventListener('pointerdown', handlePointerDown, options);
  target.addEventListener('pointermove', handlePointerMove, options);
  target.addEventListener('pointerup', handlePointerUp, options);
  target.addEventListener('pointercancel', handlePointerUp, options);
  target.addEventListener('pointerleave', handlePointerUp, options);
  window.addEventListener('blur', handlePointerUp);

  return {
    mode: 'pointer',
    handPresent: true,
    handLostMs: 0,
    read(dtSec) {
      return manager.read(dtSec);
    },
    destroy() {
      target.removeEventListener('pointerdown', handlePointerDown);
      target.removeEventListener('pointermove', handlePointerMove);
      target.removeEventListener('pointerup', handlePointerUp);
      target.removeEventListener('pointercancel', handlePointerUp);
      target.removeEventListener('pointerleave', handlePointerUp);
      window.removeEventListener('blur', handlePointerUp);
      activeTouch.clear();
      manager.clear();
    },
  };
}
