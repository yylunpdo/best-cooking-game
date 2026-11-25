// Keyboard and pointer input. Clicks land on kitchen zones (ingredient bins,
// grill slots, plate items, Serve / Trash buttons) and are queued so a click
// between two frames is never lost; one-shot keys (start, pause, serve) are
// queued as bit flags and taken once by the loop.

import { FIELD, INGREDIENTS, LAYOUT } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const CONFIRM_KEYS = new Set(['Space', 'Enter']);
const MUTE_KEYS = new Set(['KeyM']);

/** Rectangles of the clickable zones, in logical coordinates. */
export function binRect(index) {
  return {
    x: LAYOUT.bins.x + index * (LAYOUT.bins.w + LAYOUT.bins.gap),
    y: LAYOUT.bins.y,
    w: LAYOUT.bins.w,
    h: LAYOUT.bins.h,
  };
}

export function grillSlotRect(index) {
  return {
    x: LAYOUT.grill.x + 250 + index * (LAYOUT.grillSlot.w + LAYOUT.grillSlot.gap),
    y: LAYOUT.grill.y + 16,
    w: LAYOUT.grillSlot.w,
    h: LAYOUT.grillSlot.h,
  };
}

/** Plate items sit as chips in a row right of the plate circle. */
export function plateItemRect(index) {
  return {
    x: LAYOUT.plate.x + 190 + index * 95,
    y: LAYOUT.plate.y + 28,
    w: 85,
    h: 72,
  };
}

export const SERVE_RECT = LAYOUT.serve;
export const TRASH_RECT = LAYOUT.trash;
export const SOUND_RECT = { x: 1200, y: 8, w: 56, h: 46 };

function inside(rect, x, y) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

export function createInput(canvas) {
  let actions = 0;
  let clicks = [];

  /** Window pixels -> logical playfield coordinates (the canvas letterboxes). */
  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const ox = (rect.width - FIELD.width * scale) / 2;
    const oy = (rect.height - FIELD.height * scale) / 2;
    return { x: (clientX - rect.left - ox) / scale, y: (clientY - rect.top - oy) / scale };
  }

  function clickAt(clientX, clientY) {
    const { x, y } = toLogical(clientX, clientY);
    for (let i = 0; i < INGREDIENTS.length; i += 1) {
      if (inside(binRect(i), x, y)) {
        clicks.push({ kind: 'bin', id: INGREDIENTS[i].id });
        return;
      }
    }
    for (let i = 0; i < 2; i += 1) {
      if (inside(grillSlotRect(i), x, y)) {
        clicks.push({ kind: 'grill', index: i });
        return;
      }
    }
    for (let i = 0; i < 4; i += 1) {
      if (inside(plateItemRect(i), x, y)) {
        clicks.push({ kind: 'plate', index: i });
        return;
      }
    }
    if (inside(SERVE_RECT, x, y)) clicks.push({ kind: 'serve' });
    else if (inside(TRASH_RECT, x, y)) clicks.push({ kind: 'trash' });
    else if (inside(SOUND_RECT, x, y)) clicks.push({ kind: 'sound' });
    else clicks.push({ kind: 'confirm' });
  }

  window.addEventListener('keydown', (event) => {
    if (PAUSE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (CONFIRM_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (MUTE_KEYS.has(event.code)) {
      if (!event.repeat) clicks.push({ kind: 'sound' });
    } else if (event.code === 'KeyT') {
      if (!event.repeat) clicks.push({ kind: 'trash' });
    } else if (event.code.startsWith('Digit')) {
      const n = Number(event.code.slice(5));
      if (n >= 1 && n <= INGREDIENTS.length && !event.repeat) {
        clicks.push({ kind: 'bin', id: INGREDIENTS[n - 1].id });
      } else return;
    } else return;
    event.preventDefault();
  });
  // A key released while the tab is hidden never sends keyup: nothing held here.
  window.addEventListener('blur', () => {});

  canvas.addEventListener('pointerdown', (event) => {
    clickAt(event.clientX, event.clientY);
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The clicks since the last call, in order. */
    takeClicks() {
      const taken = clicks;
      clicks = [];
      return taken;
    },
  };
}
