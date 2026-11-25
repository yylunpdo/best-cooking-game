// Dapur Kilat! — every tuning number, dish, ingredient and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One full shift, in seconds. When the timer hits zero the shift ends. */
export const SHIFT_SECONDS = 150;

export const HEARTS = 3;

/** Ingredients. `needsGrill` ones go to the grill first and only land on the
 *  plate once cooked; the rest go straight from the bin to the plate. */
export const INGREDIENTS = [
  { id: 'bun',     name: 'Roti',   emoji: '🍞', key: '1', color: '#e8a94e', dark: '#9c6b1e', needsGrill: false },
  { id: 'patty',   name: 'Daging', emoji: '🥩', key: '2', color: '#b4552d', dark: '#6e2f16', needsGrill: true },
  { id: 'lettuce', name: 'Selada', emoji: '🥬', key: '3', color: '#5da83c', dark: '#2f6620', needsGrill: false },
  { id: 'tomato',  name: 'Tomat',  emoji: '🍅', key: '4', color: '#e23b2e', dark: '#8f1d15', needsGrill: false },
  { id: 'cheese',  name: 'Keju',   emoji: '🧀', key: '5', color: '#f5c542', dark: '#a67c00', needsGrill: false },
  { id: 'egg',     name: 'Telur',  emoji: '🥚', key: '6', color: '#f7ead0', dark: '#a08c5a', needsGrill: true },
];

/** Dishes: the recipe is the exact multiset of ingredients on the plate. */
export const DISHES = [
  { id: 'burger',       name: 'Burger Klasik',  emoji: '🍔', recipe: ['bun', 'patty', 'lettuce'], base: 12 },
  { id: 'cheeseburger', name: 'Keju Burger',    emoji: '🍔', recipe: ['bun', 'patty', 'cheese'],  base: 14 },
  { id: 'spesial',      name: 'Burger Spesial', emoji: '🍔', recipe: ['bun', 'patty', 'cheese', 'tomato'], base: 18 },
  { id: 'salad',        name: 'Salad Segar',    emoji: '🥗', recipe: ['lettuce', 'tomato', 'egg'], base: 14 },
  { id: 'rotitelur',    name: 'Roti Telur',     emoji: '🥪', recipe: ['bun', 'egg', 'cheese'],    base: 13 },
  { id: 'veggie',       name: 'Veggie Delight', emoji: '🥙', recipe: ['bun', 'lettuce', 'tomato', 'cheese'], base: 16 },
];

/** Grill timing, in seconds: cooked at `ready`, burnt after `burnt`. */
export const GRILL = {
  patty: { ready: 4.0, burnt: 6.5 },
  egg: { ready: 3.0, burnt: 5.5 },
  slots: 2,
};

/** Orders: how long a customer waits, and how fast new ones arrive. */
export const ORDERS = {
  max: 3,
  patience: 45,
  patiencePerLevel: -2.5,
  minPatience: 22,
  firstDelay: 1.2,
  spawnInterval: 9,
  spawnPerLevel: -0.6,
  minSpawn: 4.5,
};

/** One level every 5 dishes served; the kitchen only gets busier. */
export const LEVEL = { every: 5, max: 10 };

/** A plate holds at most four items. */
export const PLATE_MAX = 4;

/** Layout rectangles (logical coordinates) shared by input and renderer. */
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 62 },
  orders: { x: 24, y: 86, w: 400, h: 104, gap: 16 },
  bins: { x: 24, y: 218, w: 190, h: 118, gap: 16 },
  grill: { x: 24, y: 352, w: 596, h: 128 },
  grillSlot: { w: 150, h: 96, gap: 24 },
  plate: { x: 660, y: 352, w: 596, h: 128 },
  serve: { x: 660, y: 496, w: 290, h: 72 },
  trash: { x: 966, y: 496, w: 290, h: 72 },
  hint: { x: 0, y: 668, w: 1280, h: 52 },
};

export const PALETTE = {
  backdrop: '#20160f',
  wall: '#f7e8d0',
  wallTop: '#e8b04b',
  floor: '#8a5a33',
  counter: '#c98d4b',
  counterTop: '#e8b878',
  panel: '#fff6e5',
  panelEdge: '#d9a05b',
  text: '#3a2412',
  muted: '#8a6a44',
  coin: '#f5c542',
  green: '#3f9e4d',
  red: '#d9382b',
  blue: '#2f7fc2',
  grill: '#3a3a3f',
  grillHot: '#e25822',
  plate: '#fdfdfd',
  plateEdge: '#c9c9c9',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji"';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'dapur-kilat.best';
