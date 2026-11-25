// The kitchen itself: orders, the grill, the plate, the clock and the score.
// Pure state plus one fixed-step update; drawing lives in render.js, input in
// input.js. Every public action returns an event bit so the loop can play the
// right sound and announce the right thing.

import {
  DISHES,
  GRILL,
  HEARTS,
  INGREDIENTS,
  LEVEL,
  ORDERS,
  PLATE_MAX,
  SHIFT_SECONDS,
  STEP,
} from './config.js';
import { pick } from './random.js';

export const EVENT_SERVED = 1;
export const EVENT_WRONG = 2;
export const EVENT_WALKOUT = 4;
export const EVENT_BURNT = 8;
export const EVENT_OVER = 16;
export const EVENT_COOKED = 32;

export function ingredientById(id) {
  return INGREDIENTS.find((item) => item.id === id);
}

export function dishById(id) {
  return DISHES.find((dish) => dish.id === id);
}

/** True when the plate's items are exactly the dish's recipe, order aside. */
function plateMatches(plate, recipe) {
  if (plate.length !== recipe.length) return false;
  const left = recipe.slice();
  for (const item of plate) {
    const at = left.indexOf(item);
    if (at === -1) return false;
    left.splice(at, 1);
  }
  return left.length === 0;
}

export function createWorld(random) {
  const state = freshState();

  function freshState() {
    return {
      score: 0,
      coins: 0,
      served: 0,
      wrongServes: 0,
      hearts: HEARTS,
      timeLeft: SHIFT_SECONDS,
      level: 1,
      orders: [],
      nextOrderId: 1,
      spawnIn: ORDERS.firstDelay,
      plate: [],
      grill: Array.from({ length: GRILL.slots }, () => ({ ing: null, t: 0 })),
      flash: '',
      flashT: 0,
      over: false,
    };
  }

  function patienceForLevel(level) {
    return Math.max(ORDERS.minPatience, ORDERS.patience + ORDERS.patiencePerLevel * (level - 1));
  }

  function spawnInterval(level) {
    return Math.max(ORDERS.minSpawn, ORDERS.spawnInterval + ORDERS.spawnPerLevel * (level - 1));
  }

  function spawnOrder(forceDishId) {
    if (state.orders.length >= ORDERS.max) return null;
    const dish = forceDishId ? dishById(forceDishId) : pick(random, DISHES);
    if (!dish) return null;
    const patience = patienceForLevel(state.level);
    const order = {
      id: state.nextOrderId,
      dish: dish.id,
      patience,
      maxPatience: patience,
      born: state.timeLeft,
    };
    state.nextOrderId += 1;
    state.orders.push(order);
    return order;
  }

  function setFlash(message) {
    state.flash = message;
    state.flashT = 1.6;
  }

  /** Start over with a fresh shift (same seed stream continues). */
  function reset() {
    const kept = state;
    const fresh = freshState();
    for (const key of Object.keys(fresh)) kept[key] = fresh[key];
  }

  /**
   * Add an ingredient: grill food goes to a free grill slot, the rest straight
   * to the plate. Returns an event bit (0 = nothing happened, buzz it).
   */
  function addIngredient(id) {
    const def = ingredientById(id);
    if (!def || state.over) return 0;
    if (def.needsGrill) {
      const slot = state.grill.find((s) => s.ing === null);
      if (!slot) {
        setFlash('Panggangan penuh!');
        return EVENT_WRONG;
      }
      slot.ing = id;
      slot.t = 0;
      return EVENT_COOKED;
    }
    if (state.plate.length >= PLATE_MAX) {
      setFlash('Piring penuh! Sajikan atau buang dulu.');
      return EVENT_WRONG;
    }
    if (state.plate.includes(id)) {
      setFlash(`${def.name} sudah di piring.`);
      return EVENT_WRONG;
    }
    state.plate.push(id);
    return EVENT_COOKED;
  }

  /**
   * Click a grill slot: golden food joins the plate, burnt food is binned,
   * still-cooking food stays put. Returns an event bit.
   */
  function takeGrill(index) {
    const slot = state.grill[index];
    if (!slot || !slot.ing || state.over) return 0;
    const timing = GRILL[slot.ing];
    if (slot.t >= timing.burnt) {
      slot.ing = null;
      slot.t = 0;
      setFlash('Gosong! Dibuang.');
      return EVENT_BURNT;
    }
    if (slot.t < timing.ready) {
      setFlash('Belum matang, tunggu sampai keemasan!');
      return EVENT_WRONG;
    }
    if (state.plate.length >= PLATE_MAX) {
      setFlash('Piring penuh! Sajikan atau buang dulu.');
      return EVENT_WRONG;
    }
    if (state.plate.includes(slot.ing)) {
      setFlash(`${ingredientById(slot.ing).name} sudah di piring.`);
      return EVENT_WRONG;
    }
    state.plate.push(slot.ing);
    slot.ing = null;
    slot.t = 0;
    return EVENT_COOKED;
  }

  /** Remove one item from the plate (click it). */
  function removeFromPlate(index) {
    if (index < 0 || index >= state.plate.length || state.over) return false;
    state.plate.splice(index, 1);
    return true;
  }

  /** Empty the plate into the bin. */
  function trashPlate() {
    if (state.plate.length === 0 || state.over) return false;
    state.plate.length = 0;
    setFlash('Piring dikosongkan.');
    return true;
  }

  /**
   * Serve the plate to the oldest order it matches exactly. A match pays the
   * dish price plus a tip for the patience left; no match is just a buzz and
   * the plate stays put so the cook can fix it.
   */
  function serve() {
    if (state.plate.length === 0 || state.over) return 0;
    const at = state.orders.findIndex((order) => plateMatches(state.plate, dishById(order.dish).recipe));
    if (at === -1) {
      state.wrongServes += 1;
      setFlash('Tidak ada pesanan yang cocok — cek resepnya!');
      return EVENT_WRONG;
    }
    const order = state.orders[at];
    const dish = dishById(order.dish);
    const tip = Math.round((order.patience / order.maxPatience) * 10);
    const earned = dish.base + tip;
    state.score += earned;
    state.coins += earned;
    state.served += 1;
    state.orders.splice(at, 1);
    state.plate.length = 0;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.served / LEVEL.every));
    setFlash(`+${earned} koin — ${dish.name} tersaji!`);
    return EVENT_SERVED;
  }

  /** One fixed step of the kitchen: orders arrive, patience drains, food cooks. */
  function step(dt) {
    if (state.over) return 0;
    let events = 0;
    state.timeLeft -= dt;
    if (state.flashT > 0) state.flashT -= dt;

    for (const slot of state.grill) {
      if (slot.ing) slot.t += dt;
    }

    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      spawnOrder();
      state.spawnIn = spawnInterval(state.level);
    }

    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders.splice(i, 1);
        state.hearts -= 1;
        events |= EVENT_WALKOUT;
        setFlash(`Pelanggan ${dishById(order.dish).name} pergi! -1 ❤`);
      }
    }

    if (state.hearts <= 0 || state.timeLeft <= 0) {
      state.timeLeft = Math.max(0, state.timeLeft);
      state.hearts = Math.max(0, state.hearts);
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  return {
    state,
    reset,
    spawnOrder,
    addIngredient,
    takeGrill,
    removeFromPlate,
    trashPlate,
    serve,
    step,
    setFlash,
    dishById,
    ingredientById,
    plateMatches,
    stepSize: STEP,
  };
}
