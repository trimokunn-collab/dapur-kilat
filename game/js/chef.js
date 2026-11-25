// chef.js — the chef: movement and interaction.
// Vanilla JS, no libraries, no network. Original code.
// Exports: createChef(), updateChef(state, dt, input), interact(state).
//
// Movement: 260 px/s, clamped to the kitchen floor
// (x 40..1240, y 220..680). Carrying max 2 items.
// input: { up, down, left, right } booleans (dx/dy also accepted).
// With no keys held, the chef walks toward chef.target if one is set
// (click-to-move, set by the shell) and clears it on arrival.
// interact(): uses the nearest station within 130 px (measured to the
// station centre) and returns whatever useStation() returns.

import { STATIONS } from './state.js';
import { useStation } from './stations.js';

const SPEED = 260; // px per second
const FLOOR = { x0: 40, x1: 1240, y0: 220, y1: 680 };
const REACH = 130; // px to a station centre

export function createChef() {
  return { x: 640, y: 500, dir: 'down', carrying: [], target: null };
}

export function updateChef(state, dt, input) {
  const chef = state.chef;
  let dx = 0;
  let dy = 0;
  if (input) {
    if (typeof input.dx === 'number' || typeof input.dy === 'number') {
      dx = input.dx || 0;
      dy = input.dy || 0;
    } else {
      dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    }
  }
  if (dx === 0 && dy === 0 && chef.target) {
    const tx = chef.target.x - chef.x;
    const ty = chef.target.y - chef.y;
    const dist = Math.hypot(tx, ty);
    if (dist <= 6) {
      chef.x = chef.target.x;
      chef.y = chef.target.y;
      chef.target = null;
    } else {
      dx = tx / dist;
      dy = ty / dist;
    }
  }
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  if (len > 0) {
    chef.x += dx * SPEED * dt;
    chef.y += dy * SPEED * dt;
    chef.x = Math.max(FLOOR.x0, Math.min(FLOOR.x1, chef.x));
    chef.y = Math.max(FLOOR.y0, Math.min(FLOOR.y1, chef.y));
    if (Math.abs(dx) > Math.abs(dy)) chef.dir = dx > 0 ? 'right' : 'left';
    else chef.dir = dy > 0 ? 'down' : 'up';
  }
}

export function interact(state) {
  const chef = state.chef;
  let best = null;
  let bestD = REACH;
  for (const s of STATIONS) {
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    const d = Math.hypot(chef.x - cx, chef.y - cy);
    if (d < bestD) { bestD = d; best = s; }
  }
  if (!best) return { ok: false, reason: 'no-station' };
  return useStation(state, best.id, chef);
}
