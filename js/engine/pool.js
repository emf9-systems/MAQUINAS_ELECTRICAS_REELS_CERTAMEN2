// Arma preguntas para cada modo (práctica por tema, rush, simulacros) desde los tres bancos.
import { TEMPLATES, generate } from '../content/generators.js';
import { CONCEPTS, TRUEFALSE } from '../content/concepts.js';
import { GUIDE } from '../content/guide.js';
import { partToMCQ, buildOptions } from './mcq.js';
import { conceptItem, tfItem } from '../components.js';
import { newSeed, rng } from '../util.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function randomExercise(topic = null, seed = newSeed()) {
  const list = topic ? TEMPLATES.filter(t => t.topic === topic) : TEMPLATES;
  return generate(pick(list).id, seed);
}
export function calcItem(topic = null) {
  const ex = randomExercise(topic);
  return partToMCQ(ex, Math.floor(Math.random() * ex.parts.length));
}
export function conceptQ(topic = null) {
  const list = topic ? CONCEPTS.filter(c => c.topic === topic) : CONCEPTS;
  return conceptItem(pick(list));
}
export function tfQ(topic = null) {
  const list = topic ? TRUEFALSE.filter(c => c.topic === topic) : TRUEFALSE;
  return list.length ? tfItem(pick(list)) : conceptQ(topic);
}
// Guía como alternativas (para el rush y los tests)
export function guideItem(topic = null) {
  const list = topic ? GUIDE.filter(g => g.topic === topic) : GUIDE;
  if (!list.length) return calcItem(topic);
  const g = pick(list), i = Math.floor(Math.random() * g.parts.length);
  const p = g.parts[i], o = buildOptions(p, newSeed());
  return { kind: 'guide', topic: g.topic, title: `Guía ${g.guide} · Ej. ${g.n}`, context: g.text, q: p.q, options: o.options, correct: o.correct, steps: p.steps };
}

// Test de un tema: mezcla teoría y cálculo sin repetir teoría.
export function topicQuiz(topic, n = 8) {
  const concepts = CONCEPTS.filter(c => c.topic === topic).sort(() => Math.random() - 0.5);
  const hasCalc = TEMPLATES.some(t => t.topic === topic);
  const out = [];
  for (let i = 0; i < n; i++) {
    if (hasCalc && (i % 2 === 1 || !concepts.length)) out.push(Math.random() < 0.3 ? guideItem(topic) : calcItem(topic));
    else if (concepts.length) out.push(conceptItem(concepts.pop()));
    else out.push(tfQ(topic));
  }
  return out;
}

// ---------------------------------------------------------------- simulacros
// Formato del certamen: 12 preguntas en 12 minutos. El C1 fue 3 ejercicios × 4 preguntas.
export const EXAM_FORMATS = {
  c1: { name: 'Formato C1: 3 ejercicios × 4 preguntas', minutes: 12, desc: 'Igual que el certamen 1: tres enunciados de cálculo, cuatro preguntas de alternativas cada uno.' },
  mixto: { name: 'Mixto: 2 ejercicios × 4 + 4 teóricas', minutes: 12, desc: 'Dos enunciados de cálculo y cuatro preguntas de teoría (control, arranques, otros motores).' },
  teoria: { name: 'Teórico rápido: 12 preguntas', minutes: 12, desc: 'Solo conceptos de las presentaciones. Ideal para repasar el día antes.' },
};
// Los tres ejercicios salen de temas distintos para cubrir CC y CA.
const EXAM_TOPIC_SETS = [['cc', 'ind', 'flujo'], ['cc', 'trif', 'circ'], ['fund', 'flujo', 'circ'], ['cc', 'sinc', 'flujo'], ['cc', 'trif', 'ind'], ['cc', 'arr', 'flujo'], ['fund', 'cc', 'circ']];

function examExercise(topic, r) {
  const useGuide = r.chance(0.25);
  const fromGuide = GUIDE.filter(g => g.topic === topic && g.parts.length >= 4);
  if (useGuide && fromGuide.length) { const g = r.pick(fromGuide); return { ...g, parts: g.parts }; }
  const list = TEMPLATES.filter(t => t.topic === topic);
  return generate(r.pick(list).id, r.int(1, 2 ** 30));
}
function fourParts(ex, r) {
  // 4 partes manteniendo el orden del enunciado
  const idx = r.shuffle(ex.parts.map((_, i) => i)).slice(0, 4).sort((a, b) => a - b);
  return idx.map(i => ({ ex, i }));
}

export function buildExam(format = 'c1', seed = newSeed()) {
  const r = rng(seed);
  const qs = [];
  const nEx = format === 'c1' ? 3 : format === 'mixto' ? 2 : 0;
  const topics = r.pick(EXAM_TOPIC_SETS);
  for (let k = 0; k < nEx; k++) {
    const ex = examExercise(topics[k], r);
    for (const { i } of fourParts(ex, r)) {
      const p = ex.parts[i], o = buildOptions(p, r.int(1, 2 ** 30));
      qs.push({ kind: 'calc', group: k, topic: ex.topic, title: ex.title, context: ex.text, q: p.q, options: o.options, correct: o.correct, steps: p.steps });
    }
  }
  const theory = r.shuffle(CONCEPTS.filter(c => ['ccctrl', 'arr', 'otros', 'sinc', 'ind', 'circ', 'trif', 'cc'].includes(c.topic)));
  while (qs.length < 12) { const c = theory.pop(); qs.push({ ...conceptItem(c, r.int(1, 2 ** 30)), group: 'teoria' }); }
  return { format, seed, minutes: EXAM_FORMATS[format].minutes, qs };
}

// Simulacro de desarrollo: 3 ejercicios escritos (12 resultados), 36 minutos.
export function buildDevExam(seed = newSeed()) {
  const r = rng(seed);
  const topics = r.pick(EXAM_TOPIC_SETS);
  const exs = topics.map(t => {
    const ex = examExercise(t, r);
    const idx = r.shuffle(ex.parts.map((_, i) => i)).slice(0, 4).sort((a, b) => a - b);
    return { ...ex, parts: idx.map(i => ex.parts[i]) };
  });
  return { seed, minutes: 36, exs };
}
