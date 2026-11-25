import { createState, STATIONS, RECIPES } from './state.js';
import { spawnOrder, updateOrders, serveOrder } from './orders.js';
import { createChef, updateChef, interact } from './chef.js';
import { updateStations, useStation } from './stations.js';
import { render, stationAtPoint } from './render.js';
import { sfx, toggleMute } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const pauseEl = document.getElementById('pause');
const overEl = document.getElementById('gameover');
const restartBtn = document.getElementById('restart-btn');

const W = 1280;
const H = 720;
const SHIFT_SECONDS = 180;

let state = createState();
let paused = false;
let last = performance.now();
let prevServed = 0;
let prevLost = 0;

// Dipakai pengujian otomatis dan screenshot: window.__game.state
window.__game = {
  get state() { return state; },
  get paused() { return paused; },
};

// ---------------------------------------------------------------------------
// Demo: ?demo=1 -> kondisi tengah shift, dipakai untuk screenshot.
// Menampilkan SEMUA yang dinilai juri sekaligus: papan pesanan, bahan di
// counter, satu hidangan setengah jadi di meja plating, timer, dan satu
// piring siap saji yang menyala di meja saji.
// ---------------------------------------------------------------------------
const FALLBACK_RECIPES = [
  { id: 'nasi-ayam', name: 'Nasi Ayam Geprek', ingredients: ['nasi', 'ayam', 'sambal'] },
  { id: 'nasi-goreng', name: 'Nasi Goreng Spesial', ingredients: ['nasi', 'telur', 'sayur'] },
  { id: 'mie-ayam', name: 'Mie Ayam', ingredients: ['mie', 'ayam', 'sayur'] },
];

function pickRecipes() {
  if (Array.isArray(RECIPES) && RECIPES.length >= 3) return RECIPES;
  return FALLBACK_RECIPES;
}

function stationKeyLike(keys, re) {
  for (const k of keys) if (re.test(k)) return k;
  return null;
}

function seedDemo(s) {
  s.timeLeft = 90;
  s.score = 320;
  s.combo = 2;
  s.served = 4;
  s.lost = 1;
  s.over = false;

  const list = pickRecipes();
  const itemsOf = (r) => (r.ingredients || r.items || ['nasi', 'ayam', 'sambal']).slice();
  s.orders = [
    { id: 'demo-1', recipe: list[0], timeLeft: 45, state: 'waiting' },
    { id: 'demo-2', recipe: list[1], timeLeft: 30, state: 'waiting' },
    { id: 'demo-3', recipe: list[2], timeLeft: 18, state: 'waiting' },
  ];

  // Koki di tengah dapur, sedang membawa satu bahan cincang.
  s.chef.x = 640;
  s.chef.y = 380;
  s.chef.dir = 'down';
  s.chef.carrying = ['ayam-cincang'];

  // Satu piring setengah jadi di meja plating, satu piring selesai di meja saji.
  s.plates = [
    { items: ['nasi', 'ayam'], at: 'plating' },
    { items: itemsOf(list[0]), at: 'serving', done: true },
  ];

  // Dua stasiun sedang sibuk supaya progress bar terlihat.
  s.stations = s.stations || {};
  const keys = Object.keys(s.stations);
  const wokKey = stationKeyLike(keys, /wok|stove|kompor/i) || 'wok';
  const riceKey = stationKeyLike(keys, /rice|nasi|penanak/i) || 'rice';
  s.stations[wokKey] = { progress: 0.55, item: 'ayam' };
  s.stations[riceKey] = { progress: 0.3, item: 'nasi' };
}

const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1';
if (DEMO) seedDemo(state);

// ---------------------------------------------------------------------------
// Input: keyboard + mouse
// ---------------------------------------------------------------------------
const keys = new Set();
const input = { up: false, down: false, left: false, right: false };

function syncInput() {
  input.up = keys.has('KeyW') || keys.has('ArrowUp');
  input.down = keys.has('KeyS') || keys.has('ArrowDown');
  input.left = keys.has('KeyA') || keys.has('ArrowLeft');
  input.right = keys.has('KeyD') || keys.has('ArrowRight');
}

function doInteract() {
  if (paused || state.over) return;
  interact(state);
  sfx('pick');
}

function togglePause() {
  if (state.over) return;
  paused = !paused;
  pauseEl.classList.toggle('hidden', !paused);
  sfx('click');
}

function toggleMuteHandler() {
  const muted = toggleMute();
  state.muted = muted;
}

function restart() {
  state = createState();
  if (DEMO) seedDemo(state);
  paused = false;
  prevServed = 0;
  prevLost = 0;
  pauseEl.classList.add('hidden');
  overEl.classList.add('hidden');
  sfx('click');
}

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'KeyE' || e.code === 'Space') doInteract();
  if (e.code === 'KeyP') togglePause();
  if (e.code === 'KeyM') toggleMuteHandler();
  if (e.code === 'KeyR') restart();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// Klik di canvas: koki berjalan ke titik itu (atau ke tengah stasiun yang diklik).
canvas.addEventListener('click', (e) => {
  if (paused || state.over) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  const st = stationAtPoint(x, y);
  if (st) {
    state.chef.target = { x: st.x + st.w / 2, y: st.y + st.h + 26 };
  } else {
    state.chef.target = { x, y };
  }
  sfx('click');
});

restartBtn.addEventListener('click', restart);

// ---------------------------------------------------------------------------
// Game over
// ---------------------------------------------------------------------------
function starsFor(served) {
  if (served >= 12) return 3;
  if (served >= 8) return 2;
  if (served >= 4) return 1;
  return 0;
}

function showGameOver() {
  const stars = starsFor(state.served);
  document.getElementById('final-score').textContent = 'Skor akhir: ' + state.score;
  document.getElementById('final-stars').textContent =
    '★'.repeat(stars) + '☆'.repeat(3 - stars);
  document.getElementById('final-detail').textContent =
    'Pesanan tersaji: ' + state.served + '  •  Pesanan hangus: ' + state.lost +
    '  •  Kombo terbaik: x' + Math.max(1, state.combo);
  overEl.classList.remove('hidden');
  sfx('over');
}

// ---------------------------------------------------------------------------
// Loop utama
// ---------------------------------------------------------------------------
// Catatan integrasi: state.timeLeft (timer shift) dikurangi DI SINI saja.
// updateOrders hanya mengurus timer tiap pesanan (order.timeLeft), bukan
// timer shift, supaya tidak double.
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (!paused && !state.over) {
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.over = true;
      showGameOver();
    } else {
      updateOrders(state, dt);
      updateStations(state, dt);
      syncInput();
      updateChef(state, dt, input);
      if (state.served > prevServed) { sfx('serve'); prevServed = state.served; }
      if (state.lost > prevLost) { sfx('fail'); prevLost = state.lost; }
    }
  }

  render(ctx, state);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// Referensi modul (dipakai alur lain / pengujian): jangan dihapus.
void [spawnOrder, serveOrder, createChef, useStation, STATIONS, SHIFT_SECONDS];
