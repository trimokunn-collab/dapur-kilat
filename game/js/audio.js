// audio.js — tiny WebAudio bleeps, no audio files.
// Vanilla JS, no libraries, no network. Original code.
// Exports: sfx(name), toggleMute().
//
// sfx('pickup' | 'chop' | 'cook' | 'serve' | 'error' | 'tick' | 'win' | 'lose')
// plays a short oscillator envelope. toggleMute() flips the mute flag and
// returns the new value — the shell should copy it into state.muted.
// Every call is guarded: if AudioContext is unavailable (or anything
// throws), audio silently does nothing and the game keeps running.

let ctx = null;
let muted = false;

function ac() {
  if (muted) return null;
  try {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch (e) {
    return null;
  }
}

// [frequency, duration, wave, volume, delay] per note.
const PRESETS = {
  pickup: [[660, 0.07, 'sine', 0.12, 0]],
  chop: [[180, 0.05, 'square', 0.10, 0], [140, 0.05, 'square', 0.10, 0.06]],
  cook: [[220, 0.12, 'triangle', 0.10, 0], [330, 0.12, 'triangle', 0.10, 0.12]],
  serve: [[523, 0.09, 'sine', 0.14, 0], [659, 0.09, 'sine', 0.14, 0.09], [784, 0.14, 'sine', 0.14, 0.18]],
  error: [[160, 0.12, 'sawtooth', 0.10, 0], [120, 0.16, 'sawtooth', 0.10, 0.10]],
  tick: [[880, 0.05, 'sine', 0.10, 0]],
  win: [[523, 0.12, 'sine', 0.14, 0], [659, 0.12, 'sine', 0.14, 0.12], [784, 0.12, 'sine', 0.14, 0.24], [1047, 0.20, 'sine', 0.14, 0.36]],
  lose: [[392, 0.15, 'sine', 0.12, 0], [330, 0.15, 'sine', 0.12, 0.15], [262, 0.25, 'sine', 0.12, 0.30]],
};

export function sfx(name) {
  try {
    const c = ac();
    if (!c) return;
    const notes = PRESETS[name];
    if (!notes) return;
    const t0 = c.currentTime;
    for (const [freq, dur, type, vol, delay] of notes) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0 + delay);
      g.gain.setValueAtTime(0.0001, t0 + delay);
      g.gain.exponentialRampToValueAtTime(vol, t0 + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t0 + delay);
      o.stop(t0 + delay + dur + 0.02);
    }
  } catch (e) {
    // Audio must never break the game.
  }
}

export function toggleMute() {
  muted = !muted;
  return muted;
}
