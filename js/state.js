// Estado del jugador en el navegador: progreso de estudio, ajustes, misiones y logros.
// En modo invitado aquí también viven las monedas y cartas; con cuenta, esas vienen del servidor.
import { levelFor, xpForLevel, todayCL } from './util.js';
import { START_COINS } from './data/catalog.js';

export const GUEST_KEY = 'certamen2-maquinas-v1';
let SAVE_KEY = GUEST_KEY;

export const DEFAULT = () => ({
  v: 1,
  // perfil local (invitado)
  name: '', avatar: '', bio: '', accent: '#ff6b4a', title: '', favorite: null,
  indecente: false, decided: false,   // modo indecente del invitado (las cuentas lo guardan en el servidor)
  // economía local (solo invitado)
  coins: START_COINS, cards: {}, freePacks: 1, pity: 0, lastDaily: null, dayStreak: 0,
  // progreso
  xp: 0, correct: 0, answered: 0, streak: 0, bestStreak: 0, bestGrade: 0, exams: [],
  lessons: {},            // { fund: { seen: true, quiz: 3 } }
  byTopic: {},            // { cc: { ok: 10, n: 14 } }
  guide: {},              // { guia_CC_4: 'ok' }
  devDone: 0,
  // ajustes
  settings: { fx: 'max', sound: true, vibrate: true, unblur: false },   // unblur: miniaturas indecentes sin blur
  // diarios
  day: null, missions: [], ach: {},
  guest: false,
});

export let S = DEFAULT();

export function load(key = GUEST_KEY) {
  SAVE_KEY = key;
  try { const raw = localStorage.getItem(key); S = raw ? Object.assign(DEFAULT(), JSON.parse(raw)) : DEFAULT(); }
  catch (e) { S = DEFAULT(); }
  S.settings = Object.assign(DEFAULT().settings, S.settings || {});
  dailyInit();
  return S;
}
export function replace(state, key) { SAVE_KEY = key; S = Object.assign(DEFAULT(), state); dailyInit(); save(true); }

let saveT = null; const listeners = new Set();
export function onSave(fn) { listeners.add(fn); }
export function save(now = false) {
  clearTimeout(saveT);
  const go = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } listeners.forEach(f => f(S)); };
  if (now) go(); else saveT = setTimeout(go, 400);
}

export const level = () => {
  const lv = levelFor(S.xp), a = xpForLevel(lv), b = xpForLevel(lv + 1);
  return { lv, into: S.xp - a, need: b - a, pct: (S.xp - a) / (b - a) };
};

export const LEVEL_TITLES = ['Aprendiz de bobinas', 'Ayudante de taller', 'Medidor de rpm', 'Domador de shunts', 'Señor del deslizamiento',
  'Caballero del entrehierro', 'Thevenin humano', 'Arrancador estrella-triángulo', 'Maestro de la placa', 'Ingeniero de campo giratorio',
  'Leyenda del torque máximo', 'Sincronizado absoluto'];
export const titleFor = (lv) => LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((lv - 1) / 3))];

// ---------------------------------------------------------------- misiones diarias
const MISSION_POOL = [
  { k: 'answer', n: 20, t: 'Responde 20 preguntas', coins: 40 },
  { k: 'correct', n: 15, t: 'Acierta 15 preguntas', coins: 50 },
  { k: 'combo', n: 8, t: 'Logra un combo de 8 en Rush', coins: 60 },
  { k: 'dev', n: 2, t: 'Resuelve 2 ejercicios de desarrollo', coins: 70 },
  { k: 'exam', n: 1, t: 'Haz un simulacro de certamen', coins: 80 },
  { k: 'lesson', n: 1, t: 'Completa una lección', coins: 40 },
  { k: 'guide', n: 2, t: 'Resuelve 2 ejercicios de la guía', coins: 60 },
  { k: 'pack', n: 1, t: 'Abre un sobre', coins: 30 },
];
export function dailyInit() {
  const d = todayCL();
  if (S.day === d) return;
  S.day = d;
  const pool = [...MISSION_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
  S.missions = pool.map(m => ({ ...m, p: 0, done: false, claimed: false }));
}
export function mission(k, inc = 1, abs = false) {
  let changed = null;
  for (const m of S.missions) {
    if (m.k !== k || m.done) continue;
    m.p = abs ? Math.max(m.p, inc) : m.p + inc;
    if (m.p >= m.n) { m.p = m.n; m.done = true; changed = m; }
  }
  save();
  return changed;
}

// ---------------------------------------------------------------- logros
export const ACH = [
  { id: 'first', t: 'Primera chispa', d: 'Responde tu primera pregunta', ok: () => S.answered >= 1 },
  { id: 'c50', t: 'Calentando motores', d: '50 respuestas correctas', ok: () => S.correct >= 50 },
  { id: 'c250', t: 'Plena carga', d: '250 respuestas correctas', ok: () => S.correct >= 250 },
  { id: 'c1000', t: 'Velocidad sincrónica', d: '1000 respuestas correctas', ok: () => S.correct >= 1000 },
  { id: 's10', t: 'Combo x10', d: 'Racha de 10 aciertos', ok: () => S.bestStreak >= 10 },
  { id: 's25', t: 'Imparable', d: 'Racha de 25 aciertos', ok: () => S.bestStreak >= 25 },
  { id: 'g4', t: 'Aprobado', d: 'Saca 4,0 o más en un simulacro', ok: () => S.bestGrade >= 4 },
  { id: 'g6', t: 'Destacado', d: 'Saca 6,0 o más en un simulacro', ok: () => S.bestGrade >= 6 },
  { id: 'g7', t: 'Nota máxima', d: 'Saca 7,0 en un simulacro', ok: () => S.bestGrade >= 7 },
  { id: 'l5', t: 'Estudioso', d: 'Completa 5 lecciones', ok: () => Object.values(S.lessons).filter(l => l.done).length >= 5 },
  { id: 'l10', t: 'Teoría completa', d: 'Completa las 10 lecciones', ok: () => Object.values(S.lessons).filter(l => l.done).length >= 10 },
  { id: 'gd10', t: 'Guía en mano', d: 'Resuelve 10 ejercicios de las guías', ok: () => Object.values(S.guide).filter(x => x === 'ok').length >= 10 },
  { id: 'gd26', t: 'Guía completa', d: 'Resuelve los 26 ejercicios de las guías', ok: () => Object.values(S.guide).filter(x => x === 'ok').length >= 26 },
  { id: 'dev10', t: 'Mano firme', d: '10 ejercicios de desarrollo', ok: () => S.devDone >= 10 },
  { id: 'd7', t: 'Semana de fuego', d: 'Racha de 7 días', ok: () => S.dayStreak >= 7 },
];
export function checkAch() {
  const got = [];
  for (const a of ACH) if (!S.ach[a.id] && a.ok()) { S.ach[a.id] = Date.now(); got.push(a); }
  if (got.length) save();
  return got;
}

export function topicStat(topic, ok) {
  const t = S.byTopic[topic] || (S.byTopic[topic] = { ok: 0, n: 0 });
  t.n++; if (ok) t.ok++;
}
