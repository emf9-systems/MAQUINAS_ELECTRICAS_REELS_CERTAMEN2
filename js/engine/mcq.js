// Convierte una parte numérica en una pregunta de alternativas (4 opciones).
// Las opciones trampa salen primero de los errores típicos de la plantilla; si faltan,
// se completan con variaciones creíbles (×√3, ÷2, ×1,2…).
import { fmt, rng, SQ3, closeAny } from '../util.js';

const FACTORS = [SQ3, 1 / SQ3, 2, 0.5, 1.2, 0.8, 1.5, 2 / 3, 3, 1 / 3, 1.1, 0.9];
const far = (a, b) => Math.abs(a - b) > Math.max(Math.abs(a), Math.abs(b)) * 0.035;

export function unitTxt(u) { return u ? ' ' + u : ''; }
export function showNum(x, unit) { return fmt(x) + unitTxt(unit); }

export function buildOptions(part, seed = 1, n = 4) {
  const r = rng(seed);
  const ans = part.ans;
  const opts = [ans];
  const okVal = (v) => isFinite(v) && v !== 0 && (ans < 0 || v > 0) && opts.every(o => far(o, v));
  for (const w of r.shuffle(part.wrong || [])) { if (opts.length >= n) break; if (okVal(w)) opts.push(w); }
  for (const f of r.shuffle(FACTORS)) { if (opts.length >= n) break; const v = ans * f; if (okVal(v)) opts.push(v); }
  let k = 2; while (opts.length < n) { const v = ans * (1 + 0.13 * k++); if (okVal(v)) opts.push(v); }
  // Para porcentajes no se ofrecen valores imposibles (>100%)
  const shuffled = r.shuffle(opts.slice(0, n));
  return {
    options: shuffled.map(v => showNum(v, part.unit)),
    values: shuffled,
    correct: shuffled.indexOf(ans),
  };
}

// Una pregunta de alternativas lista para mostrar, a partir de un ejercicio generado.
export function partToMCQ(ex, i, seed) {
  const part = ex.parts[i];
  const o = buildOptions(part, seed ?? (ex.seed + i * 7919));
  return {
    kind: 'calc', topic: ex.topic, title: ex.title, context: ex.text, q: part.q,
    options: o.options, correct: o.correct, steps: part.steps, exId: ex.id, part: i,
  };
}

export function checkNumeric(part, value) { return closeAny(value, part.ans, part.unit, part.tol ?? 0.02); }
