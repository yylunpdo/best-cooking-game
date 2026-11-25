// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Warm kitchen colours, chunky panels, emoji food.

import {
  FIELD,
  FONT,
  GRILL,
  HEARTS,
  INGREDIENTS,
  LAYOUT,
  PALETTE,
  SHIFT_SECONDS,
} from './config.js';
import { dishById, ingredientById } from './world.js';
import { binRect, grillSlotRect, plateItemRect } from './input.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 640, top: 150, line: 32, bottom: 78 };
const CUSTOMERS = ['🧑‍🍳', '👩', '👨', '👵', '🧒', '👨‍🦰'];
const MOODS = ['😊', '😐', '😟', '😠'];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}|${weight || ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function bar(x, y, w, h, frac, good, bad) {
    context.fillStyle = '#00000033';
    roundRect(context, x, y, w, h, h / 2);
    context.fill();
    context.fillStyle = frac > 0.5 ? good : frac > 0.25 ? '#e8a13a' : bad;
    if (frac > 0) {
      roundRect(context, x, y, Math.max(h, w * Math.max(0, Math.min(1, frac))), h, h / 2);
      context.fill();
    }
  }

  function drawTopBar(state, soundOn) {
    context.fillStyle = PALETTE.wallTop;
    context.fillRect(0, 0, FIELD.width, LAYOUT.topBar.h);
    context.textBaseline = 'top';
    text('🍲 DAPUR KILAT!', 24, 14, 32, '#fff', 'left', 'bold');
    text(`🪙 ${state.coins}`, 300, 18, 28, '#fff', 'left', 'bold');
    text(`Level ${state.level}`, 470, 20, 24, '#fff', 'left', 'bold');
    const t = Math.max(0, Math.ceil(state.timeLeft));
    const mm = Math.floor(t / 60);
    const ss = String(t % 60).padStart(2, '0');
    text(`⏱ ${mm}:${ss}`, 600, 18, 28, '#fff', 'left', 'bold');
    bar(700, 20, 220, 20, state.timeLeft / SHIFT_SECONDS, '#3f9e4d', '#d9382b');
    for (let i = 0; i < HEARTS; i += 1) {
      text(i < state.hearts ? '❤️' : '🖤', 980 + i * 44, 14, 30, '#fff', 'left');
    }
    context.fillStyle = '#ffffff55';
    roundRect(context, 1200, 8, 56, 46, 10);
    context.fill();
    text(soundOn ? '🔊' : '🔇', 1228, 16, 28, '#fff', 'center');
  }

  function drawOrders(state) {
    context.textBaseline = 'top';
    text('📋 PESANAN', 24, LAYOUT.orders.y - 24, 20, PALETTE.text, 'left', 'bold');
    for (let i = 0; i < 3; i += 1) {
      const x = LAYOUT.orders.x + i * (LAYOUT.orders.w + LAYOUT.orders.gap);
      const y = LAYOUT.orders.y;
      const order = state.orders[i];
      context.fillStyle = PALETTE.panel;
      roundRect(context, x, y, LAYOUT.orders.w, LAYOUT.orders.h, 14);
      context.fill();
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 3;
      context.stroke();
      if (!order) {
        text('— menunggu pelanggan —', x + LAYOUT.orders.w / 2, y + 40, 20, PALETTE.muted, 'center');
        continue;
      }
      const dish = dishById(order.dish);
      const frac = Math.max(0, order.patience / order.maxPatience);
      const mood = MOODS[Math.min(3, Math.floor((1 - frac) * 4))];
      text(CUSTOMERS[order.id % CUSTOMERS.length], x + 16, y + 12, 44, '#000', 'left');
      text(mood, x + 66, y + 12, 30, '#000', 'left');
      text(dish.name, x + 110, y + 12, 26, PALETTE.text, 'left', 'bold');
      text(dish.emoji, x + 110, y + 46, 30, '#000', 'left');
      let ix = x + 150;
      for (const ingId of dish.recipe) {
        const ing = ingredientById(ingId);
        context.fillStyle = ing.color;
        context.beginPath();
        context.arc(ix + 16, y + 62, 17, 0, Math.PI * 2);
        context.fill();
        text(ing.emoji, ix + 16, y + 46, 22, '#000', 'center');
        ix += 42;
      }
      bar(x + 16, y + 84, LAYOUT.orders.w - 32, 12, frac, '#3f9e4d', '#d9382b');
    }
  }

  function drawBins(state) {
    context.textBaseline = 'top';
    text('🧺 BAHAN — klik atau tekan 1-6', 24, LAYOUT.bins.y - 24, 20, PALETTE.text, 'left', 'bold');
    for (let i = 0; i < INGREDIENTS.length; i += 1) {
      const ing = INGREDIENTS[i];
      const r = binRect(i);
      context.fillStyle = ing.color;
      roundRect(context, r.x, r.y, r.w, r.h, 14);
      context.fill();
      context.fillStyle = '#00000022';
      roundRect(context, r.x, r.y + r.h - 34, r.w, 34, 14);
      context.fill();
      text(ing.emoji, r.x + r.w / 2, r.y + 8, 52, '#000', 'center');
      text(ing.name, r.x + r.w / 2, r.y + 70, 22, '#fff', 'center', 'bold');
      text(`[${ing.key}]`, r.x + 12, r.y + 8, 18, '#ffffffcc', 'left', 'bold');
      if (ing.needsGrill) text('🔥 PANGGANG', r.x + r.w / 2, r.y + r.h - 26, 15, '#fff', 'center', 'bold');
    }
  }

  function drawGrill(state) {
    const g = LAYOUT.grill;
    context.fillStyle = PALETTE.grill;
    roundRect(context, g.x, g.y, g.w, g.h, 14);
    context.fill();
    context.textBaseline = 'top';
    text('🔥', g.x + 24, g.y + 34, 52, '#000', 'left');
    text('PANGGANG', g.x + 90, g.y + 30, 24, '#fff', 'left', 'bold');
    text('klik saat emas!', g.x + 90, g.y + 62, 17, '#ffb08a', 'left');
    for (let i = 0; i < 2; i += 1) {
      const slot = state.grill[i];
      const r = grillSlotRect(i);
      context.fillStyle = slot.ing ? '#55555c' : '#232327';
      roundRect(context, r.x, r.y, r.w, r.h, 12);
      context.fill();
      context.strokeStyle = '#00000066';
      context.lineWidth = 2;
      context.stroke();
      if (!slot.ing) {
        text('— kosong —', r.x + r.w / 2, r.y + 38, 16, '#888', 'center');
        continue;
      }
      const ing = ingredientById(slot.ing);
      const timing = GRILL[slot.ing];
      const done = slot.t >= timing.ready;
      const burnt = slot.t >= timing.burnt;
      context.fillStyle = burnt ? '#1c1c1c' : done ? '#f5b942' : ing.color;
      context.beginPath();
      context.arc(r.x + r.w / 2, r.y + 36, 26, 0, Math.PI * 2);
      context.fill();
      text(ing.emoji, r.x + r.w / 2, r.y + 12, 28, '#000', 'center');
      const frac = Math.min(1, slot.t / timing.burnt);
      bar(r.x + 12, r.y + r.h - 22, r.w - 24, 10, frac, '#f5b942', '#d9382b');
      text(
        burnt ? 'GOSONG! klik buang' : done ? 'MATANG! klik ambil' : 'memasak…',
        r.x + r.w / 2, r.y + r.h - 44, 14, burnt ? '#ff6b5e' : done ? '#ffd94d' : '#ddd', 'center', 'bold',
      );
    }
  }

  function drawPlate(state) {
    const p = LAYOUT.plate;
    context.fillStyle = PALETTE.panel;
    roundRect(context, p.x, p.y, p.w, p.h, 14);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    context.stroke();
    context.textBaseline = 'top';
    text('🍽️ PIRING', p.x + 16, p.y + 12, 22, PALETTE.text, 'left', 'bold');
    context.fillStyle = PALETTE.plate;
    context.beginPath();
    context.arc(p.x + 75, p.y + 74, 48, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.plateEdge;
    context.lineWidth = 3;
    context.stroke();
    context.beginPath();
    context.arc(p.x + 75, p.y + 74, 33, 0, Math.PI * 2);
    context.stroke();
    if (state.plate.length === 0) {
      text('kosong', p.x + 75, p.y + 64, 18, PALETTE.muted, 'center');
    }
    for (let i = 0; i < state.plate.length; i += 1) {
      const ing = ingredientById(state.plate[i]);
      const r = plateItemRect(i);
      context.fillStyle = ing.color;
      roundRect(context, r.x, r.y, r.w, r.h, 12);
      context.fill();
      text(ing.emoji, r.x + r.w / 2, r.y + 4, 36, '#000', 'center');
      text(ing.name, r.x + r.w / 2, r.y + 46, 16, '#fff', 'center', 'bold');
    }
  }

  function drawButtons(state) {
    const s = LAYOUT.serve;
    const t = LAYOUT.trash;
    const canServe = state.plate.length > 0;
    context.fillStyle = canServe ? PALETTE.green : '#9aa0a6';
    roundRect(context, s.x, s.y, s.w, s.h, 16);
    context.fill();
    context.textBaseline = 'top';
    text('✅ SAJIKAN  [Spasi]', s.x + s.w / 2, s.y + 20, 26, '#fff', 'center', 'bold');
    context.fillStyle = state.plate.length > 0 ? '#b03a2e' : '#9aa0a6';
    roundRect(context, t.x, t.y, t.w, t.h, 16);
    context.fill();
    text('🗑️ BUANG  [T]', t.x + t.w / 2, t.y + 20, 26, '#fff', 'center', 'bold');
  }

  function drawHint() {
    const h = LAYOUT.hint;
    context.fillStyle = '#00000044';
    context.fillRect(h.x, h.y, h.w, h.h);
    context.textBaseline = 'top';
    text(
      'Cara main: klik bahan → daging & telur dipanggang dulu, klik saat keemasan → susun di piring sesuai resep → SAJIKAN sebelum pelanggan pergi!',
      24, h.y + 14, 19, '#ffe9c4', 'left',
    );
  }

  function drawFlash(state) {
    if (state.flashT > 0 && state.flash) {
      context.textBaseline = 'top';
      const alpha = Math.min(1, state.flashT);
      context.globalAlpha = alpha;
      context.font = `bold 24px ${FONT}`;
      const tw = context.measureText(state.flash).width;
      context.fillStyle = '#3a2412ee';
      roundRect(context, FIELD.width / 2 - tw / 2 - 18, 596, tw + 36, 44, 22);
      context.fill();
      text(state.flash, FIELD.width / 2, 606, 24, '#fff', 'center', 'bold');
      context.globalAlpha = 1;
    }
  }

  function drawKitchen(state, soundOn) {
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 600, FIELD.width, 120);
    context.fillStyle = PALETTE.counterTop;
    context.fillRect(0, 206, FIELD.width, 12);
    context.fillStyle = PALETTE.counter;
    context.fillRect(0, 208, FIELD.width, 460);
    drawTopBar(state, soundOn);
    drawOrders(state);
    drawBins(state);
    drawGrill(state);
    drawPlate(state);
    drawButtons(state);
    drawHint();
    drawFlash(state);
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = '#00000088';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, PANEL.width, height, 18);
    context.fill();
    context.strokeStyle = accent || PALETTE.panelEdge;
    context.lineWidth = 4;
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center', 'bold');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 24, PALETTE.green, 'center', 'bold');
  }

  /** Paint one frame: the kitchen, then a panel for the screen the game is on. */
  function draw(state, screen, best, soundOn) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawKitchen(state, soundOn);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        '🍲 DAPUR KILAT!',
        [
          'Masak cepat, sajikan panas — sebelum pelanggan pergi!',
          'Klik bahan, panggang daging & telur sampai keemasan,',
          'susun piring sesuai resep, lalu SAJIKAN.',
          `Skor terbaik: ${best} koin`,
        ],
        'Tekan Spasi atau klik untuk mulai',
        PALETTE.wallTop,
      );
      return;
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('⏸️ Istirahat', ['Panggangan menunggu — pelanggan juga sabar sebentar.'], 'Tekan P untuk lanjut', PALETTE.blue);
    } else if (screen === SCREEN_OVER) {
      const lines = [
        `Skor akhir: ${state.score} koin  •  ${state.served} hidangan tersaji`,
        state.served > 0 ? `Level tercapai: ${state.level}` : 'Belum ada hidangan tersaji — coba lagi!',
        `Skor terbaik: ${best} koin`,
        '',
      ];
      drawPanel(
        state.timeLeft <= 0 ? '🎉 Shift Selesai!' : '😢 Dapur Tutup!',
        lines,
        'Tekan Spasi atau klik untuk main lagi',
        state.timeLeft <= 0 ? PALETTE.green : PALETTE.red,
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
