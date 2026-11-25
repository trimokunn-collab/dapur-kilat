// orders.js — order spawning, patience, serving and scoring.
// Vanilla JS, no libraries, no network. Original code.
// Exports: spawnOrder(state), updateOrders(state, dt), serveOrder(state, plateItems).
//
// Difficulty: a new order every 14s at the start of the shift, shrinking
// to every 8s by the end; at most 4 orders on screen at once.
// Scoring: dish price + speed tip (up to +10 for serving fast), times a
// combo multiplier of x1 + combo * 0.1, capped at x2. An expired order
// costs a lost order and resets the combo to 0.

import { RECIPES } from './state.js';

const SPAWN_START = 14; // seconds between orders at shift start
const SPAWN_END = 8;    // seconds between orders at shift end
const MAX_ORDERS = 4;
const TIP_MAX = 10;     // max speed tip, in points

// Pick a random recipe. Early in the shift the simple dishes (the first
// entries) are weighted more heavily so the player can learn the ropes.
export function spawnOrder(state) {
  if (state.orders.length >= MAX_ORDERS) return null;
  const early = state.timeLeft > 120;
  const weights = early ? [4, 3, 2, 2, 1] : [1, 1, 1, 1, 1];
  let total = 0;
  for (const w of weights) total += w;
  let roll = Math.random() * total;
  let idx = weights.length - 1;
  for (let i = 0; i < weights.length; i++) {
    if (roll < weights[i]) { idx = i; break; }
    roll -= weights[i];
  }
  const recipe = RECIPES[idx];
  const order = { id: ++state.orderSeq, recipe, timeLeft: recipe.time, state: 'open' };
  state.orders.push(order);
  return order;
}

// Advance the spawn timer and order patience by dt seconds.
// Call once per frame from the game loop.
// NOTE: the shift clock (state.timeLeft) and the end of the shift
// (state.over / stars) are owned by main.js — this module only reads
// state.timeLeft to scale the spawn interval below.
export function updateOrders(state, dt) {
  if (state.over) return;
  // Spawn timer: interval shrinks 14s -> 8s across the shift.
  const frac = state.timeLeft / 180; // 1 at the start, 0 at the end
  const interval = SPAWN_END + (SPAWN_START - SPAWN_END) * frac;
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnOrder(state);
    state.spawnTimer = interval;
  }
  // Order patience: an order that runs out of time is lost.
  for (let i = state.orders.length - 1; i >= 0; i--) {
    const o = state.orders[i];
    o.timeLeft -= dt;
    if (o.timeLeft <= 10 && o.state === 'open') o.state = 'urgent';
    if (o.timeLeft <= 0) {
      state.orders.splice(i, 1);
      state.lost += 1;
      state.combo = 0; // reputation hit: combo resets
    }
  }
}

// Serve a finished dish (plateItems is the carried dish, e.g. ['Nasi Goreng']).
// Finds an open order for that dish and pays out.
// Returns { ok: true, points } on success, { ok: false, points: 0 } otherwise.
export function serveOrder(state, plateItems) {
  if (!plateItems || plateItems.length === 0) return { ok: false, points: 0 };
  const dish = plateItems[0];
  const idx = state.orders.findIndex((o) => o.recipe.name === dish);
  if (idx === -1) return { ok: false, points: 0 };
  const order = state.orders[idx];
  // Speed tip: up to +10, scaled by the patience still left on the order.
  const tip = Math.round(TIP_MAX * Math.max(0, order.timeLeft) / order.recipe.time);
  // Combo multiplier uses the combo BEFORE this serve, capped at x2.
  const mult = Math.min(2, 1 + state.combo * 0.1);
  const points = Math.round((order.recipe.price + tip) * mult);
  state.score += points;
  state.combo += 1;
  state.served += 1;
  state.orders.splice(idx, 1);
  return { ok: true, points };
}
