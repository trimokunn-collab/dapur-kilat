// state.js — Dapur Kilat ("Warung Rush") shared game state.
// Vanilla JS, no libraries, no network. Original code.
// Exports: createState(), STATIONS, RECIPES.
//
// State shape (single source of truth for the whole game):
//   state = {
//     timeLeft,   // seconds left in the 180s shift
//     score, combo, served, lost,
//     orders: [{ id, recipe, timeLeft, state }],  // state: 'open' | 'urgent'
//     chef: { x, y, dir, carrying: [], target }, // carrying: max 2 items
//     stations: { id: { progress, item, ... } }, // progress 0..1
//     plates: [{ items: [], at, done }],         // at: 'plating' | 'serving'
//                                                // done: dish finished
//     muted, over, stars,
//     orderSeq, spawnTimer                        // internal counters
//   }

// Fixed kitchen layout (1280x720). Coordinates are the top-left corner
// of each station; every station is 180x110.
export const STATIONS = [
  { id: 'rice',  name: 'Rice Cooker',     x: 60,   y: 120, w: 180, h: 110, kind: 'dispenser' },
  { id: 'wok',   name: 'Wok / Stove',     x: 300,  y: 120, w: 180, h: 110, kind: 'cooker' },
  { id: 'chop',  name: 'Chopping Board',  x: 540,  y: 120, w: 180, h: 110, kind: 'dispenser' },
  { id: 'drink', name: 'Drink Station',   x: 780,  y: 120, w: 180, h: 110, kind: 'pourer' },
  { id: 'plate', name: 'Plating Counter', x: 1020, y: 120, w: 180, h: 110, kind: 'plating' },
  { id: 'serve', name: 'Serving Counter', x: 1020, y: 420, w: 180, h: 110, kind: 'serve' },
];

// Five original Indonesian warung dishes.
//   id, name, price (points), time (order patience in seconds),
//   needs: exact multiset of components the plating counter combines
//          into the finished dish (see stations.js for how each
//          component is produced),
//   steps: the intended production chain — { station, ingredient,
//          processTime } — processTime 0 means "instant dispense".
export const RECIPES = [
  {
    id: 'nasi-goreng',
    name: 'Nasi Goreng',
    price: 25,
    time: 60,
    needs: ['nasi', 'telur', 'ayam-cincang'],
    steps: [
      { station: 'rice',  ingredient: 'nasi',  processTime: 0 },
      { station: 'chop',  ingredient: 'ayam',  processTime: 0 },
      { station: 'wok',   ingredient: 'ayam',  processTime: 2 },
      { station: 'wok',   ingredient: 'telur', processTime: 0 },
    ],
  },
  {
    id: 'mie-goreng',
    name: 'Mie Goreng',
    price: 22,
    time: 55,
    needs: ['mie', 'sayur', 'telur'],
    steps: [
      { station: 'wok',   ingredient: 'mie',   processTime: 0 },
      { station: 'chop',  ingredient: 'sayur', processTime: 0 },
      { station: 'wok',   ingredient: 'telur', processTime: 0 },
    ],
  },
  {
    id: 'soto-ayam',
    name: 'Soto Ayam',
    price: 28,
    time: 65,
    needs: ['ayam-cincang', 'nasi', 'telur'],
    steps: [
      { station: 'chop',  ingredient: 'ayam',  processTime: 0 },
      { station: 'wok',   ingredient: 'ayam',  processTime: 2 },
      { station: 'rice',  ingredient: 'nasi',  processTime: 0 },
      { station: 'wok',   ingredient: 'telur', processTime: 0 },
    ],
  },
  {
    id: 'ayam-geprek',
    name: 'Ayam Geprek',
    price: 30,
    time: 60,
    needs: ['ayam-cincang', 'sambal'],
    steps: [
      { station: 'chop',  ingredient: 'ayam',   processTime: 0 },
      { station: 'wok',   ingredient: 'ayam',   processTime: 2 },
      { station: 'chop',  ingredient: 'sambal', processTime: 0 },
    ],
  },
  {
    id: 'es-teh',
    name: 'Es Teh',
    price: 10,
    time: 40,
    needs: ['es-teh'],
    steps: [
      { station: 'drink', ingredient: 'teh', processTime: 1.5 },
    ],
  },
];

// Fresh state for a new 180-second shift.
export function createState() {
  const state = {
    timeLeft: 180,
    score: 0,
    combo: 0,
    served: 0,
    lost: 0,
    orders: [],
    chef: { x: 640, y: 500, dir: 'down', carrying: [], target: null },
    stations: {},
    plates: [{ items: [], at: 'plating', done: false }],
    muted: false,
    over: false,
    stars: 0,
    orderSeq: 0,
    spawnTimer: 0.5,
  };
  for (const s of STATIONS) {
    state.stations[s.id] = {
      progress: 0,
      item: null,
      cooking: false,
      cookTime: 0,
      elapsed: 0,
      ready: false,
    };
  }
  return state;
}
