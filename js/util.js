// Utilidades sin DOM (se pueden importar desde Node para las pruebas).

// ---- Azar reproducible: el mismo "seed" genera el mismo ejercicio ----
export function rng(seed = Date.now() ^ (Math.random() * 1e9)) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    seed,
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    real: (lo, hi, step = 0.01) => Math.round((lo + next() * (hi - lo)) / step) * step,
    chance: (p) => next() < p,
    shuffle: (arr) => { const b = [...arr]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; },
  };
  return r;
}
export const newSeed = () => (Math.random() * 2 ** 31) >>> 0;

// ---- Números ----
export const PI = Math.PI;
export const SQ3 = Math.sqrt(3);
export const HP = 746;            // 1 HP = 746 W (como en el curso)
export const G = 9.8;             // gravedad usada en las soluciones
export const rpm2rad = (n) => n * 2 * PI / 60;
export const rad2rpm = (w) => w * 60 / (2 * PI);
export const deg = (rad) => rad * 180 / PI;
export const rad = (d) => d * PI / 180;

// Redondeo "humano": más decimales para números chicos.
export function roundNice(x) {
  if (!isFinite(x)) return x;
  const a = Math.abs(x);
  const d = a >= 1000 ? 1 : a >= 10 ? 2 : a >= 1 ? 3 : a >= 0.01 ? 4 : 6;
  return Math.round(x * 10 ** d) / 10 ** d;
}
// Formato con coma decimal (estilo Chile). tex=true lo deja listo para KaTeX.
export function fmt(x, tex = false) {
  if (typeof x !== 'number' || !isFinite(x)) return String(x);
  const s = String(roundNice(x)).replace('.', ',');
  return tex ? s.replace(',', '{,}') : s;
}
export const T = (x) => fmt(x, true);

// Lee lo que escribe el alumno: "4762,35", "4.762,35", "4,76k", "1.2e3", "86,9 %", "230 V".
export function parseNum(input) {
  if (input === null || input === undefined) return NaN;
  let s = String(input).trim().replace(/\s+/g, '').replace(/−/g, '-');
  if (!s) return NaN;
  const m = s.match(/^([+-]?[\d.,]*\d(?:[eE][+-]?\d+)?)([kKM]?)(.*)$/);
  if (!m) return NaN;
  let num = m[1];
  const hasDot = num.includes('.'), hasComma = num.includes(',');
  if (hasDot && hasComma) {
    // el último separador es el decimal
    if (num.lastIndexOf(',') > num.lastIndexOf('.')) num = num.replace(/\./g, '').replace(',', '.');
    else num = num.replace(/,/g, '');
  } else if (hasComma) {
    num = (num.match(/,/g).length > 1) ? num.replace(/,/g, '') : num.replace(',', '.');
  } else if (hasDot && (num.match(/\./g).length > 1)) {
    num = num.replace(/\./g, '');
  }
  let v = Number(num);
  const rest = m[3] || '';
  // "k"/"M" solo cuentan como prefijo si no son parte de una palabra (ej. "kW" sí, "km" sí).
  if (m[2] === 'k' || m[2] === 'K') v *= 1e3;
  if (m[2] === 'M') v *= 1e6;
  if (/^[^\d]*$/.test(rest) === false) return NaN;
  return v;
}

// ¿La respuesta del alumno está bien? Tolerancia relativa (por defecto 2%) para no castigar redondeos.
export function close(user, ans, tol = 0.02) {
  if (!isFinite(user) || !isFinite(ans)) return false;
  if (Math.abs(ans) < 1e-9) return Math.abs(user) < 1e-3;
  return Math.abs(user - ans) <= Math.abs(ans) * tol + 1e-9;
}
// Para porcentajes: acepta 86,96 o 0,8696.
export function closeAny(user, ans, unit, tol = 0.02) {
  if (close(user, ans, tol)) return true;
  if (unit === '%') return close(user * 100, ans, tol);
  return false;
}

// Nota chilena 1,0–7,0 con 60% de exigencia (igual que grade_cl en schema.sql).
export function gradeCL(correct, total) {
  if (total <= 0) return 1;
  const p = correct / total;
  const g = p < 0.6 ? 1 + 3 * p / 0.6 : 4 + 3 * (p - 0.6) / 0.4;
  return Math.round(g * 10 + 1e-9) / 10;            // +1e-9: redondea x,x5 hacia arriba como round() de Postgres
}

// Nivel n necesita 60·n·(n−1) XP acumulada (igual que level_for en schema.sql).
export const levelFor = (xp) => Math.max(1, Math.floor((1 + Math.sqrt(1 + 4 * xp / 60)) / 2));
export const xpForLevel = (n) => 60 * n * (n - 1);

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const esc = (x) => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const todayCL = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
