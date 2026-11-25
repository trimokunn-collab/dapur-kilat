// stations.js — what every kitchen station does.
// Vanilla JS, no libraries, no network. Original code.
// Exports: updateStations(state, dt), useStation(state, stationId, chef).
//
// ============================================================================
// INTERACTION RULES (the whole game in one place — read this first)
// ============================================================================
// The chef carries at most 2 items. Press interact near a station
// (within 130 px of its centre) to use it. Only these ingredient
// strings exist: 'nasi', 'ayam', 'ayam-cincang', 'sambal', 'telur',
// 'sayur', 'mie', 'teh', 'es-teh'.
//
//   RICE (Rice Cooker)   — instantly gives 'nasi' if your hands are not full.
//
//   CHOP (Chopping Board) — instantly gives one raw item, smart-picked from
//     ['ayam', 'sayur', 'sambal']: the item your open orders need
//     most right now (with a bonus for the dish already on the plate).
//
//   WOK (Wok / Stove) — three jobs, in priority order:
//     1. COLLECT a finished cook (interact again when the progress bar is
//        full) — the cooked item goes into your hands.
//     2. COOK carried 'ayam' into 'ayam-cincang' (2s). The raw item is
//        consumed when cooking starts.
//     3. DISPENSE a pantry item when you carry nothing cookable:
//        smart-picked from ['mie', 'telur'] the same way CHOP picks.
//     While something is cooking, interact does nothing but report progress.
//
//   DRINK (Drink Station) — pours iced tea. First interact starts a 1.5s
//     pour (the station shows 'teh' while pouring); interact again to
//     collect the finished 'es-teh'.
//
//   PLATE (Plating Counter) — the combiner. Interact with items in hand to
//     put them on the plate (at 'plating', done false). When the plate
//     holds exactly the components of a recipe (see RECIPES 'needs'), it
//     becomes the finished dish and moves to the serving counter
//     (at 'serving', done true). A plate that can no longer become any
//     dish is dumped (error sound) so you can never get stuck. While a
//     finished plate waits at serving, the plating counter is busy.
//
//   SERVE (Serving Counter) — serve the finished plate waiting at serving,
//     or a finished dish you are carrying. Pays the dish price + a speed
//     tip (up to +10) times the combo multiplier. Serving a dish nobody
//     ordered is an error.
//
// A full dish takes roughly 15-20 seconds of play; the first order can
// be served within ~30 seconds of starting.
// ============================================================================

import { RECIPES } from './state.js';
import { serveOrder } from './orders.js';
import { sfx } from './audio.js';

const MAX_CARRY = 2;

// Raw item -> cooked item, and how long the wok takes (seconds).
const COOK_MAP = {
  ayam: { result: 'ayam-cincang', time: 2 },
};

// Cooked component -> the raw item it comes from (for demand scoring).
const RAW_OF = {
  'ayam-cincang': 'ayam',
};

function isDish(item) {
  return RECIPES.some((r) => r.name === item);
}

// True when two item lists hold the same items, order aside.
function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const count = {};
  for (const x of a) count[x] = (count[x] || 0) + 1;
  for (const x of b) {
    if (!count[x]) return false;
    count[x] -= 1;
  }
  return true;
}

// The recipe whose 'needs' exactly match these items, or null.
function recipeFor(items) {
  return RECIPES.find((r) => sameMultiset(items, r.needs)) || null;
}

// True when these items could still grow into some recipe (a proper subset
// of that recipe's needs).
function canLeadToRecipe(items) {
  return RECIPES.some((r) => {
    if (items.length >= r.needs.length) return false;
    const pool = r.needs.slice();
    for (const x of items) {
      const i = pool.indexOf(x);
      if (i === -1) return false;
      pool.splice(i, 1);
    }
    return true;
  });
}

// How many of each raw ingredient the open orders still need, after
// subtracting what is already on the plate, in hand, or in a station.
function demandMap(state) {
  const want = {};
  for (const o of state.orders) {
    for (const ing of o.recipe.needs) {
      const raw = RAW_OF[ing] || ing;
      want[raw] = (want[raw] || 0) + 1;
    }
  }
  const have = {};
  const countItems = (items) => {
    for (const x of items) {
      const raw = RAW_OF[x] || x;
      have[raw] = (have[raw] || 0) + 1;
    }
  };
  for (const p of state.plates) countItems(p.items);
  countItems(state.chef.carrying);
  for (const id in state.stations) {
    const st = state.stations[id];
    if (st.item) countItems([st.item]);
  }
  const need = {};
  for (const k in want) need[k] = want[k] - (have[k] || 0);
  return need;
}

// Pick the candidate the kitchen needs most: demand from open orders,
// plus a bonus when it belongs to the dish already on the plate.
function smartPick(candidates, state) {
  const need = demandMap(state);
  const plate = state.plates[0];
  let plateRecipe = null;
  if (plate && plate.items.length > 0 && !plate.done) {
    plateRecipe = RECIPES.find((r) => {
      if (plate.items.length >= r.needs.length) return false;
      const pool = r.needs.slice();
      for (const x of plate.items) {
        const i = pool.indexOf(x);
        if (i === -1) return false;
        pool.splice(i, 1);
      }
      return true;
    }) || null;
  }
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const c of candidates) {
    let score = Math.max(0, need[c] || 0);
    if (plateRecipe && plateRecipe.needs.includes(c)) score += 2;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

// Tick the timed stations (wok cooking, drink pouring). When a job
// finishes, the item is ready to collect: wok items come out cooked,
// and a finished pour is 'es-teh' (it shows as 'teh' while pouring).
export function updateStations(state, dt) {
  for (const id of ['wok', 'drink']) {
    const st = state.stations[id];
    if (!st || !st.cooking) continue;
    st.elapsed += dt;
    st.progress = Math.min(1, st.elapsed / st.cookTime);
    if (st.elapsed >= st.cookTime) {
      st.cooking = false;
      st.progress = 1;
      if (id === 'wok' && COOK_MAP[st.item]) st.item = COOK_MAP[st.item].result;
      if (id === 'drink') st.item = 'es-teh';
      st.ready = true;
      sfx('tick');
    }
  }
}

// Use a station. Returns { ok, ... } — see each handler for details.
export function useStation(state, stationId, chef) {
  switch (stationId) {
    case 'rice': return useRice(state, chef);
    case 'chop': return useChop(state, chef);
    case 'wok': return useWok(state, chef);
    case 'drink': return useDrink(state, chef);
    case 'plate': return usePlate(state, chef);
    case 'serve': return useServe(state, chef);
    default: return { ok: false, reason: 'unknown-station' };
  }
}

function useRice(state, chef) {
  if (chef.carrying.length >= MAX_CARRY) {
    sfx('error');
    return { ok: false, reason: 'hands-full' };
  }
  chef.carrying.push('nasi');
  sfx('pickup');
  return { ok: true, item: 'nasi' };
}

function useChop(state, chef) {
  if (chef.carrying.length >= MAX_CARRY) {
    sfx('error');
    return { ok: false, reason: 'hands-full' };
  }
  const item = smartPick(['ayam', 'sayur', 'sambal'], state);
  chef.carrying.push(item);
  sfx('chop');
  return { ok: true, item };
}

// Wok priority: collect finished cook -> cook carried 'ayam' ->
// dispense a pantry item. While cooking, report progress only.
function useWok(state, chef) {
  const st = state.stations.wok;
  if (st.ready && st.item) {
    if (chef.carrying.length >= MAX_CARRY) {
      sfx('error');
      return { ok: false, reason: 'hands-full' };
    }
    const item = st.item;
    st.item = null;
    st.ready = false;
    st.progress = 0;
    chef.carrying.push(item);
    sfx('pickup');
    return { ok: true, item };
  }
  if (st.cooking) return { ok: false, reason: 'cooking', progress: st.progress };
  const idx = chef.carrying.findIndex((x) => COOK_MAP[x]);
  if (idx !== -1) {
    const raw = chef.carrying.splice(idx, 1)[0];
    const job = COOK_MAP[raw];
    st.item = raw;
    st.cooking = true;
    st.cookTime = job.time;
    st.elapsed = 0;
    st.progress = 0;
    st.ready = false;
    sfx('cook');
    return { ok: true, action: 'cooking', item: raw, time: job.time };
  }
  if (chef.carrying.length >= MAX_CARRY) {
    sfx('error');
    return { ok: false, reason: 'hands-full' };
  }
  const item = smartPick(['mie', 'telur'], state);
  chef.carrying.push(item);
  sfx('pickup');
  return { ok: true, item };
}

// Drink: first interact starts a 1.5s pour (shows 'teh'), second
// interact collects the finished 'es-teh'.
function useDrink(state, chef) {
  const st = state.stations.drink;
  if (st.ready && st.item) {
    if (chef.carrying.length >= MAX_CARRY) {
      sfx('error');
      return { ok: false, reason: 'hands-full' };
    }
    const item = st.item;
    st.item = null;
    st.ready = false;
    st.progress = 0;
    chef.carrying.push(item);
    sfx('pickup');
    return { ok: true, item };
  }
  if (st.cooking) return { ok: false, reason: 'pouring', progress: st.progress };
  if (chef.carrying.length >= MAX_CARRY) {
    sfx('error');
    return { ok: false, reason: 'hands-full' };
  }
  st.item = 'teh';
  st.cooking = true;
  st.cookTime = 1.5;
  st.elapsed = 0;
  st.progress = 0;
  st.ready = false;
  sfx('cook');
  return { ok: true, action: 'pouring', item: 'teh', time: 1.5 };
}

// Plate: deposit carried items to build a dish, or pick a finished dish
// back up when it is still at the plating counter. A finished dish
// moves to the serving counter (at 'serving', done true) — serve it
// there with the SERVE station.
function usePlate(state, chef) {
  const plate = state.plates[0];
  // A finished plate has moved to serving — nothing to do here.
  if (plate.done && plate.at === 'serving') return { ok: false, reason: 'plate-serving' };
  // Pick up a finished dish with empty hands.
  if (chef.carrying.length === 0 && plate.items.length === 1 && isDish(plate.items[0])) {
    const dish = plate.items[0];
    plate.items = [];
    plate.at = 'plating';
    plate.done = false;
    chef.carrying.push(dish);
    sfx('pickup');
    return { ok: true, item: dish };
  }
  if (chef.carrying.length === 0) return { ok: false, reason: 'nothing-to-plate' };
  // A finished dish never goes back on the plate.
  if (chef.carrying.some(isDish)) {
    sfx('error');
    return { ok: false, reason: 'carrying-dish' };
  }
  const combined = plate.items.concat(chef.carrying);
  chef.carrying = [];
  const dish = recipeFor(combined);
  if (dish) {
    plate.items = [dish.name];
    plate.at = 'serving';
    plate.done = true;
    sfx('tick');
    return { ok: true, dish: dish.name };
  }
  if (canLeadToRecipe(combined)) {
    plate.items = combined;
    plate.at = 'plating';
    plate.done = false;
    sfx('pickup');
    return { ok: true, action: 'staged', items: combined.slice() };
  }
  // Dead end: dump the plate so the player is never stuck.
  plate.items = [];
  plate.at = 'plating';
  plate.done = false;
  sfx('error');
  return { ok: false, reason: 'bad-combo' };
}

// Serve the finished plate waiting at serving, or a finished dish
// carried by the chef.
function useServe(state, chef) {
  if (chef.carrying.length > 0 && isDish(chef.carrying[0])) {
    const result = serveOrder(state, chef.carrying.slice());
    if (result.ok) {
      chef.carrying = [];
      sfx('serve');
      return { ok: true, points: result.points };
    }
    sfx('error');
    return { ok: false, reason: 'no-matching-order' };
  }
  const plate = state.plates[0];
  if (plate.at === 'serving' && plate.done && plate.items.length === 1 && isDish(plate.items[0])) {
    const result = serveOrder(state, plate.items.slice());
    if (result.ok) {
      plate.items = [];
      plate.at = 'plating';
      plate.done = false;
      sfx('serve');
      return { ok: true, points: result.points };
    }
    sfx('error');
    return { ok: false, reason: 'no-matching-order' };
  }
  if (chef.carrying.length > 0) {
    sfx('error');
    return { ok: false, reason: 'not-a-dish' };
  }
  return { ok: false, reason: 'empty-hands' };
}
