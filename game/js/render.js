import { STATIONS } from './state.js';

// ---------------------------------------------------------------------------
// Dapur Kilat — Warung Rush: semua gambar digambar dengan kode (canvas 2D).
// Ukuran logis 1280x720. Semua label Bahasa Indonesia.
// ---------------------------------------------------------------------------

export const W = 1280;
export const H = 720;

// Tata letak default stasiun (dipakai kalau STATIONS dari state.js tidak
// membawa koordinat sendiri). Kunci: id stasiun yang dinormalisasi.
const LAYOUT = {
  rice:     { x: 24,   y: 168, w: 150, h: 112 },
  chopping: { x: 24,   y: 300, w: 150, h: 112 },
  stove:    { x: 24,   y: 432, w: 150, h: 112 },
  drinks:   { x: 1106, y: 168, w: 150, h: 112 },
  serving:  { x: 1106, y: 300, w: 150, h: 112 },
  plating:  { x: 1106, y: 432, w: 150, h: 112 },
};

const NAMES = {
  rice: 'Penanak Nasi',
  chopping: 'Talenan',
  stove: 'Kompor / Wajan',
  drinks: 'Minuman',
  serving: 'Meja Saji',
  plating: 'Meja Plating',
};

const COLORS = {
  rice: '#d8b25c',
  chopping: '#b08954',
  stove: '#d95d39',
  drinks: '#4aa3df',
  serving: '#58b368',
  plating: '#e8912d',
};

// Counter bahan di bawah tengah (dekorasi + titik ambil bahan).
const ING_COUNTER = { x: 340, y: 556, w: 600, h: 122 };

export const INGREDIENT_LABEL = {
  nasi: 'Nasi',
  ayam: 'Ayam',
  'ayam-cincang': 'Ayam cincang',
  sambal: 'Sambal',
  telur: 'Telur',
  sayur: 'Sayur',
  mie: 'Mie',
  teh: 'Es Teh',
  'es-teh': 'Es Teh',
};

// ---------------------------------------------------------------------------
// Util
// ---------------------------------------------------------------------------
function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = weight + ' ' + size + 'px Arial, Helvetica, sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function canonId(raw) {
  const id = String(raw || '').toLowerCase();
  if (/rice|nasi|penanak/.test(id)) return 'rice';
  if (/chop|talenan|potong|iris/.test(id)) return 'chopping';
  if (/wok|stove|kompor|wajan|goreng|tumis/.test(id)) return 'stove';
  if (/drink|minum|teh|es|jus/.test(id)) return 'drinks';
  if (/serv| saji|saji|antar|keluar/.test(id)) return 'serving';
  if (/plat|plating|rakit|susun/.test(id)) return 'plating';
  return id;
}

function stationEntries() {
  const raw = STATIONS;
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.entries(raw).map(([id, v]) => ({ id, ...(v || {}) }))
      : [];
  return list;
}

// Normalisasi stasiun: { id, kind, name, x, y, w, h }.
// Koordinat diambil dari STATIONS bila ada, kalau tidak dari LAYOUT default,
// kalau id tidak dikenal diletakkan berurutan di sisi kiri.
export function normalizeStations() {
  const list = stationEntries();
  const out = [];
  let fallbackIdx = 0;
  for (const s of list) {
    const kind = canonId(s.id);
    const lay = LAYOUT[kind];
    const x = s.x ?? lay?.x ?? 24;
    const y = s.y ?? lay?.y ?? (168 + fallbackIdx * 132);
    const w = s.w ?? lay?.w ?? 150;
    const h = s.h ?? lay?.h ?? 112;
    out.push({
      id: String(s.id),
      kind,
      name: s.name || NAMES[kind] || String(s.id),
      x, y, w, h,
      color: s.color || COLORS[kind] || '#999',
    });
    if (!lay && s.x == null) fallbackIdx++;
  }
  // Kalau STATIONS kosong (belum diisi modul B), pakai layout default penuh.
  if (out.length === 0) {
    for (const kind of Object.keys(LAYOUT)) {
      const lay = LAYOUT[kind];
      out.push({ id: kind, kind, name: NAMES[kind], ...lay, color: COLORS[kind] });
    }
  }
  return out;
}

// Dipakai main.js untuk klik: stasiun apa di titik (x, y), atau null.
export function stationAtPoint(x, y) {
  for (const s of normalizeStations()) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s;
  }
  return null;
}

export function stationByKind(kind) {
  return normalizeStations().find((s) => s.kind === kind) || null;
}

// ---------------------------------------------------------------------------
// Bahan makanan (ikon kecil, digambar dari bentuk dasar)
// kind: nasi | ayam | ayam-cincang | sambal | telur | sayur | mie | teh
// ---------------------------------------------------------------------------
export function drawIngredient(ctx, kind, cx, cy, s) {
  const r = s / 2;
  ctx.save();
  ctx.translate(cx, cy);
  const k = String(kind || '').toLowerCase();
  if (k === 'nasi') {
    // Gunungan nasi putih
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath();
    ctx.ellipse(0, 2, r, r * 0.72, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath();
    ctx.ellipse(0, 2, r, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c9b98f';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(-r * 0.5 + i * r * 0.25, -r * 0.25 + (i % 2) * r * 0.2, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (k === 'ayam' || k === 'ayam-cincang') {
    // Potongan ayam goreng keemasan (cincang = kotak-kotak kecil)
    ctx.fillStyle = '#e8a33d';
    ctx.strokeStyle = '#a86414';
    ctx.lineWidth = 1.5;
    if (k === 'ayam-cincang') {
      for (const [dx, dy] of [[-0.35, -0.3], [0.3, -0.35], [-0.05, 0.15], [0.4, 0.3], [-0.45, 0.3]]) {
        ctx.beginPath();
        ctx.rect(dx * s - 4, dy * s - 4, 9, 9);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.95, r * 0.7, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c97e1e';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.15, r * 0.22, 0, Math.PI * 2);
      ctx.arc(r * 0.25, r * 0.2, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      // Tulang kecil
      ctx.strokeStyle = '#fff3d6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * 0.75, -r * 0.45);
      ctx.lineTo(r * 1.05, -r * 0.75);
      ctx.stroke();
    }
  } else if (k === 'sambal') {
    // Sambal merah
    ctx.fillStyle = '#d92b1f';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.9, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6b4a';
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, -r * 0.2, r * 0.45, r * 0.25, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8f130b';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-r * 0.5 + i * r * 0.3, r * 0.1 + (i % 2) * r * 0.2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (k === 'telur') {
    // Telur mata sapi
    ctx.fillStyle = '#fffdf5';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.75, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffdf6b';
    ctx.beginPath();
    ctx.arc(-r * 0.12, -r * 0.12, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (k === 'sayur') {
    // Daun hijau
    ctx.fillStyle = '#3f9d4e';
    for (const a of [-0.5, 0, 0.5]) {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.35, r * 0.32, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = '#2b7a38';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.7);
    ctx.lineTo(0, -r * 0.2);
    ctx.stroke();
  } else if (k === 'mie') {
    // Mie kuning bergelombang
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, i * r * 0.45);
      ctx.bezierCurveTo(-r * 0.4, i * r * 0.45 - r * 0.35, -r * 0.1, i * r * 0.45 + r * 0.35,
        r * 0.25, i * r * 0.45 - r * 0.2);
      ctx.bezierCurveTo(r * 0.5, i * r * 0.45 - r * 0.4, r * 0.65, i * r * 0.45 + r * 0.2, r * 0.85, i * r * 0.45);
      ctx.stroke();
    }
  } else if (k === 'teh' || k === 'es-teh') {
    // Gelas es teh
    ctx.fillStyle = '#b5651d';
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.5);
    ctx.lineTo(r * 0.55, -r * 0.5);
    ctx.lineTo(r * 0.35, r * 0.8);
    ctx.lineTo(-r * 0.35, r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7a3c08';
    ctx.fillRect(-r * 0.55, -r * 0.5, r * 1.1, r * 0.28);
    ctx.fillStyle = '#e8f4ff';
    ctx.fillRect(-r * 0.15, -r * 0.9, r * 0.3, r * 0.3);
    ctx.strokeStyle = '#ff5b5b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.25, -r * 0.45);
    ctx.lineTo(r * 0.55, -r * 1.05);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, '?', 0, 1, Math.round(s * 0.55), '#5a2d00');
  }
  ctx.restore();
}

export function ingredientLabel(kind) {
  return INGREDIENT_LABEL[String(kind || '').toLowerCase()] || String(kind || 'Bahan');
}

// ---------------------------------------------------------------------------
// Piring: alas putih + bahan-bahan di atasnya. done -> cincin emas menyala.
// ---------------------------------------------------------------------------
export function drawPlate(ctx, x, y, items, done, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (done) {
    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 46, 34, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // Piring
  ctx.fillStyle = '#f7f3ea';
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cbb98f';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  // Isi piring
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    ctx.fillStyle = '#b7a98a';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('kosong', 0, 0);
  } else if (list.length === 1) {
    drawIngredient(ctx, list[0], 0, 0, 34);
  } else if (list.length === 2) {
    drawIngredient(ctx, list[0], -13, -2, 28);
    drawIngredient(ctx, list[1], 13, 3, 28);
  } else {
    drawIngredient(ctx, list[0], -16, -6, 24);
    drawIngredient(ctx, list[1], 15, -7, 24);
    drawIngredient(ctx, list[2], 0, 10, 24);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Koki: topi putih, baju koki, celemek. dir: up | down | left | right.
// carrying: bahan yang sedang dibawa (digambar di atas kepala + label).
// ---------------------------------------------------------------------------
export function drawChef(ctx, chef) {
  if (!chef) return;
  const x = chef.x ?? 640;
  const y = chef.y ?? 380;
  const dir = chef.dir || 'down';
  ctx.save();
  ctx.translate(x, y);

  // Bayangan
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 26, 24, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Badan (baju putih + celemek)
  ctx.fillStyle = '#f2f2f2';
  rr(ctx, -17, -6, 34, 34, 10);
  ctx.fill();
  ctx.strokeStyle = '#b9b9b9';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#e4572e';
  rr(ctx, -12, 2, 24, 26, 6);
  ctx.fill();
  // Kancing celemek
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-5, 12, 2, 0, Math.PI * 2);
  ctx.arc(5, 12, 2, 0, Math.PI * 2);
  ctx.fill();

  // Kepala
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath();
  ctx.arc(0, -16, 13, 0, Math.PI * 2);
  ctx.fill();
  // Topi koki
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, -30, 15, 9, 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-8, -30, 6, 0, Math.PI * 2);
  ctx.arc(0, -33, 7, 0, Math.PI * 2);
  ctx.arc(8, -30, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-13, -31, 26, 5);

  // Mata mengikuti arah hadap
  const ex = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
  const ey = dir === 'up' ? -2 : dir === 'down' ? 1 : 0;
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-5 + ex, -16 + ey, 1.8, 0, Math.PI * 2);
  ctx.arc(5 + ex, -16 + ey, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Senyum
  ctx.strokeStyle = '#7a4a21';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0 + ex, -12 + ey, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // Bahan yang dibawa: gelembung di atas kepala + label
  const carrying = Array.isArray(chef.carrying) ? chef.carrying : [];
  if (carrying.length > 0) {
    const item = carrying[carrying.length - 1];
    ctx.fillStyle = 'rgba(255, 248, 230, 0.95)';
    rr(ctx, -34, -78, 68, 30, 9);
    ctx.fill();
    ctx.strokeStyle = '#c98f2d';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawIngredient(ctx, item, 0, -63, 20);
    text(ctx, ingredientLabel(item), 0, -44, 11, '#5a2d00');
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Ikon tiap stasiun (digambar di dalam kotak stasiun)
// ---------------------------------------------------------------------------
function drawStationIcon(ctx, kind, cx, cy, w, h, progress, item) {
  ctx.save();
  ctx.translate(cx, cy);
  if (kind === 'rice') {
    // Penanak nasi: panci + uap
    ctx.fillStyle = '#8d99ae';
    rr(ctx, -34, -8, 68, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#5d6b7d';
    ctx.fillRect(-34, -12, 68, 8);
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.arc(0, -16, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2.5;
    for (const dx of [-14, 0, 14]) {
      ctx.beginPath();
      ctx.moveTo(dx, -24);
      ctx.quadraticCurveTo(dx + 5, -32, dx, -40);
      ctx.stroke();
    }
  } else if (kind === 'chopping') {
    // Talenan kayu + pisau + potongan
    ctx.fillStyle = '#c89b6a';
    rr(ctx, -38, -14, 76, 34, 8);
    ctx.fill();
    ctx.strokeStyle = '#8a5a2e';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawIngredient(ctx, 'ayam-cincang', -8, 2, 26);
    ctx.fillStyle = '#d7dee8';
    ctx.beginPath();
    ctx.moveTo(14, -16);
    ctx.lineTo(34, -6);
    ctx.lineTo(30, 0);
    ctx.lineTo(12, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(30, -8, 10, 4);
  } else if (kind === 'stove') {
    // Kompor + wajan + api
    ctx.fillStyle = '#3a3a3a';
    rr(ctx, -38, 6, 76, 16, 5);
    ctx.fill();
    // Api
    ctx.fillStyle = '#ff7b24';
    ctx.beginPath();
    ctx.moveTo(-22, 8);
    ctx.quadraticCurveTo(-14, -12, -6, 8);
    ctx.quadraticCurveTo(0, -14, 6, 8);
    ctx.quadraticCurveTo(14, -12, 22, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.quadraticCurveTo(-4, -6, 2, 8);
    ctx.quadraticCurveTo(8, -6, 12, 8);
    ctx.closePath();
    ctx.fill();
    // Wajan
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.ellipse(0, -6, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.ellipse(0, -8, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (item) drawIngredient(ctx, item, 0, -8, 26);
  } else if (kind === 'drinks') {
    // Tiga gelas minuman
    drawIngredient(ctx, 'teh', -24, 0, 30);
    drawIngredient(ctx, 'teh', 0, -4, 34);
    drawIngredient(ctx, 'teh', 24, 0, 30);
  } else if (kind === 'serving') {
    // Meja saji + lonceng + piring
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    ctx.arc(0, -2, 20, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(0, -22, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-2, -22, 4, 10);
    drawPlate(ctx, 0, 14, [], false, 0.8);
  } else if (kind === 'plating') {
    // Meja plating + piring kosong siap dirakit
    drawPlate(ctx, 0, 2, [], false, 1);
    ctx.fillStyle = '#ff5b5b';
    ctx.beginPath();
    ctx.arc(30, -18, 7, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, '+', 30, -18, 12, '#fff');
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// HUD atas: judul, timer, skor, kombo, tersaji/hangus
// ---------------------------------------------------------------------------
function fmtTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function drawHUD(ctx, state) {
  ctx.save();
  // Bar atas
  ctx.fillStyle = '#241608';
  ctx.fillRect(0, 0, W, 56);
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(0, 54, W, 2);

  text(ctx, 'DAPUR KILAT', 20, 29, 26, '#ffb347', 'left');
  text(ctx, 'Warung Rush', 196, 30, 15, '#d9b48a', 'left');

  // Timer tengah (besar, merah kalau mepet)
  const urgent = state.timeLeft <= 30;
  const tColor = urgent ? '#ff5b4a' : '#ffeecf';
  ctx.fillStyle = urgent ? 'rgba(255,60,40,0.25)' : 'rgba(255,255,255,0.06)';
  rr(ctx, 540, 8, 200, 40, 10);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#ff5b4a' : '#6b4423';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, '⏱ ' + fmtTime(state.timeLeft), 640, 29, 26, tColor);

  // Skor kanan
  text(ctx, 'SKOR', 830, 18, 12, '#d9b48a');
  text(ctx, String(state.score ?? 0), 830, 40, 24, '#ffd23f');
  // Kombo
  const combo = state.combo ?? 0;
  text(ctx, 'KOMBO', 950, 18, 12, '#d9b48a');
  text(ctx, 'x' + Math.max(1, combo), 950, 40, 24, combo >= 3 ? '#ff8c42' : '#ffeecf');
  // Tersaji / hangus (rata kanan di dalam canvas)
  text(ctx, 'TERSAJI ✓ ' + (state.served ?? 0), 1140, 29, 17, '#7ed491', 'right');
  text(ctx, 'HANGUS ✗ ' + (state.lost ?? 0), 1272, 29, 17, '#ff8a7a', 'right');
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Papan pesanan (strip atas, di bawah HUD)
// ---------------------------------------------------------------------------
function orderItems(recipe) {
  if (!recipe) return [];
  return recipe.ingredients || recipe.items || recipe.needs || [];
}

function drawOrderBoard(ctx, state) {
  ctx.save();
  // Papan kayu gelap
  ctx.fillStyle = '#2b1a0e';
  rr(ctx, 12, 64, W - 24, 78, 10);
  ctx.fill();
  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'PESANAN', 30, 103, 18, '#ffb347', 'left');

  const orders = Array.isArray(state.orders) ? state.orders : [];
  if (orders.length === 0) {
    text(ctx, 'Belum ada pesanan — siap-siap, pelanggan segera datang…', 640, 103, 17, '#d9b48a');
    ctx.restore();
    return;
  }

  const cardW = 218;
  const gap = 10;
  let x = 150;
  for (const order of orders.slice(0, 5)) {
    const recipe = order.recipe || {};
    const name = recipe.name || 'Pesanan';
    const items = orderItems(recipe);
    const total = recipe.time || 60;
    const left = Math.max(0, order.timeLeft ?? 0);
    const frac = Math.max(0, Math.min(1, left / total));
    const urgent = left <= 10;
    const cardX = x;
    const cardY = 72;

    // Kartu
    ctx.fillStyle = urgent ? '#4a1f16' : '#fff6e0';
    rr(ctx, cardX, cardY, cardW, 62, 8);
    ctx.fill();
    ctx.strokeStyle = urgent ? '#ff5b4a' : '#c98f2d';
    ctx.lineWidth = urgent ? 3 : 2;
    ctx.stroke();

    const ink = urgent ? '#ffeecf' : '#3a2410';
    text(ctx, name, cardX + 10, cardY + 14, 14, ink, 'left');
    // Ikon bahan
    const icons = items.slice(0, 3);
    icons.forEach((it, i) => drawIngredient(ctx, it, cardX + 24 + i * 34, cardY + 36, 24));
    if (items.length > 3) text(ctx, '+' + (items.length - 3), cardX + 24 + 3 * 34, cardY + 36, 12, ink);
    // Bar countdown
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(ctx, cardX + 10, cardY + 52, cardW - 20, 6, 3);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#58b368' : frac > 0.25 ? '#ffb703' : '#ff5b4a';
    if (frac > 0) {
      rr(ctx, cardX + 10, cardY + 52, (cardW - 20) * frac, 6, 3);
      ctx.fill();
    }
    // Angka detik
    text(ctx, Math.ceil(left) + ' dtk', cardX + cardW - 10, cardY + 14, 13, urgent ? '#ff8a7a' : '#8a5a2e', 'right');
    x += cardW + gap;
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Stasiun: kotak + label + ikon + progress bar saat sibuk
// ---------------------------------------------------------------------------
function drawStations(ctx, state) {
  const stations = normalizeStations();
  const stState = state.stations || {};
  for (const s of stations) {
    ctx.save();
    // Meja stasiun
    ctx.fillStyle = '#5d4030';
    rr(ctx, s.x - 3, s.y - 3, s.w + 6, s.h + 6, 12);
    ctx.fill();
    ctx.fillStyle = '#d9d3c3';
    rr(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.fill();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Label nama
    ctx.fillStyle = s.color;
    rr(ctx, s.x + 6, s.y + 6, s.w - 12, 22, 6);
    ctx.fill();
    text(ctx, s.name, s.x + s.w / 2, s.y + 18, 13, '#ffffff');

    // Ikon
    const st = stState[s.id] || stState[s.kind] || {};
    drawStationIcon(ctx, s.kind, s.x + s.w / 2, s.y + 62, s.w, s.h, st.progress || 0, st.item);

    // Progress bar saat stasiun sibuk
    const prog = st.progress || 0;
    if (prog > 0 && prog < 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      rr(ctx, s.x + 10, s.y + s.h - 16, s.w - 20, 9, 4);
      ctx.fill();
      ctx.fillStyle = '#ffb703';
      rr(ctx, s.x + 10, s.y + s.h - 16, (s.w - 20) * prog, 9, 4);
      ctx.fill();
      if (st.item) text(ctx, 'Memasak: ' + ingredientLabel(st.item), s.x + s.w / 2, s.y + s.h - 26, 11, '#3a2410');
    } else if (prog >= 1 && st.item) {
      text(ctx, ingredientLabel(st.item) + ' siap!', s.x + s.w / 2, s.y + s.h - 22, 12, '#2b7a38');
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Counter bahan (bawah tengah): 5 peti bahan berlabel
// ---------------------------------------------------------------------------
function drawIngredientCounter(ctx) {
  const c = ING_COUNTER;
  ctx.save();
  ctx.fillStyle = '#5d4030';
  rr(ctx, c.x - 3, c.y - 3, c.w + 6, c.h + 6, 12);
  ctx.fill();
  ctx.fillStyle = '#8a6a45';
  rr(ctx, c.x, c.y, c.w, c.h, 10);
  ctx.fill();
  text(ctx, 'COUNTER BAHAN — ambil di sini', c.x + 14, c.y + 16, 13, '#ffeecf', 'left');

  const kinds = ['nasi', 'ayam', 'sayur', 'telur', 'teh'];
  const cw = (c.w - 28) / kinds.length;
  kinds.forEach((kind, i) => {
    const bx = c.x + 14 + i * cw;
    const by = c.y + 30;
    ctx.fillStyle = '#6b4a26';
    rr(ctx, bx, by, cw - 8, 74, 8);
    ctx.fill();
    ctx.strokeStyle = '#c9a06a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawIngredient(ctx, kind, bx + (cw - 8) / 2, by + 28, 34);
    text(ctx, ingredientLabel(kind), bx + (cw - 8) / 2, by + 62, 12, '#ffeecf');
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Piring di atas meja plating / meja saji
// ---------------------------------------------------------------------------
function drawPlates(ctx, state) {
  const plates = Array.isArray(state.plates) ? state.plates : [];
  const plating = stationByKind('plating');
  const serving = stationByKind('serving');
  for (const plate of plates) {
    const at = String(plate.at || 'plating').toLowerCase();
    let base = at.includes('serv') ? serving : plating;
    if (!base) base = plating || serving;
    if (!base) continue;
    // Piring diletakkan di atas meja (sedikit di atas tengah stasiun).
    const px = base.x + base.w / 2;
    const py = base.y + base.h / 2 + 6;
    const done = !!plate.done;
    drawPlate(ctx, px, py, plate.items, done, done ? 1.05 : 1);
    if (done) {
      text(ctx, 'SIAP DISAJIKAN!', px, base.y - 12, 15, '#ffd700');
    } else {
      const n = (plate.items || []).length;
      text(ctx, n > 0 ? 'Dirakit: ' + n + ' bahan' : 'Piring kosong', px, base.y - 12, 12, '#ffeecf');
    }
  }
}

// ---------------------------------------------------------------------------
// Render utama
// ---------------------------------------------------------------------------
export function render(ctx, state) {
  // Lantai ubin dapur hangat
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(0, 0, W, H);
  const tile = 80;
  for (let ty = 0; ty < H / tile; ty++) {
    for (let tx = 0; tx < W / tile; tx++) {
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = '#96683c';
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += tile) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += tile) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // Karpet tengah (area jalan koki)
  ctx.fillStyle = 'rgba(255, 220, 160, 0.10)';
  rr(ctx, 210, 160, 860, 380, 18);
  ctx.fill();

  drawHUD(ctx, state);
  drawOrderBoard(ctx, state);
  drawStations(ctx, state);
  drawIngredientCounter(ctx);
  drawPlates(ctx, state);
  drawChef(ctx, state.chef);

  // Petunjuk kecil di bawah (dalam canvas, ikut mengecil dengan rapi)
  text(ctx, 'E / Spasi: ambil & olah   •   Klik stasiun: jalan ke sana   •   P: jeda   •   M: suara',
    W / 2, H - 12, 13, 'rgba(255,238,207,0.85)');

  // Tirai gelap saat game over (panel DOM tampil di atasnya)
  if (state.over) {
    ctx.fillStyle = 'rgba(10, 5, 2, 0.45)';
    ctx.fillRect(0, 0, W, H);
  }
}
