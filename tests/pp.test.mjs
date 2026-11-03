import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, TEMPLATE, projectFlow } from '../js/content/pp/generators.js';
import { GUIDE } from '../js/content/pp/guide.js';
import { CONCEPTS, TRUEFALSE } from '../js/content/pp/concepts.js';
import { TOPICS, LESSONS } from '../js/content/pp/lessons.js';
import { buildOptions } from '../js/engine/mcq.js';
import { rng } from '../js/util.js';

const gen = (id, seed) => TEMPLATE[id].gen(rng(seed));

test('Proyectos: cada plantilla genera ejercicios válidos con 200 semillas', () => {
  for (const t of TEMPLATES) for (let seed = 1; seed <= 200; seed++) {
    const ex = gen(t.id, seed);
    assert.ok(ex.parts.length >= 4, `${t.id}: al menos 4 partes`);
    for (const [i, p] of ex.parts.entries()) {
      assert.ok(Number.isFinite(p.ans) && p.ans !== 0, `${t.id}#${seed} parte ${i}: ${p.ans}`);
      const o = buildOptions(p, seed);
      assert.equal(new Set(o.options).size, 4, `${t.id}#${seed} parte ${i}: ${o.options}`);
      assert.equal(o.values[o.correct], p.ans);
    }
  }
});

test('Proyectos: el flujo de caja tiene al menos 8 preguntas (formato certamen)', () => {
  for (let seed = 1; seed <= 100; seed++) assert.ok(gen('pp_flujo', seed).parts.length >= 8);
});

test('Proyectos: ejemplos de clase cuadran con las láminas', () => {
  const v = (n, i, g = 'Clases') => GUIDE.find(x => x.guide === g && x.n === n).parts[i].ans;
  const near = (a, b, t = 0.002) => assert.ok(Math.abs(a - b) <= Math.abs(b) * t, `${a} ≈ ${b}`);
  near(v(1, 2), 1123.6); near(v(2, 0), 10217391); near(v(2, 1), 836387); near(v(2, 2), 9.59); near(v(2, 3), 37.17);
  near(v(3, 1), 277.04);
  near(v(5, 0), 1500); near(v(5, 4), 1057.54); near(v(5, 6), 2879.96);
  near(v(6, 0), 489.05); near(v(6, 4), 91.34); near(v(6, 5), 261.61);
  near(v(7, 0), 9.9143); near(v(7, 1), 39.2095); near(v(7, 5), 99.38);
  near(v(10, 0), 384.65); near(v(10, 1), 256, 0.01);
});

test('Proyectos: certamen 2024 (pérdida arrastrada y crédito CP)', () => {
  const F = GUIDE.find(x => x.guide === 'Certamen 2024');
  assert.ok(F.parts.length >= 12);
  const A = [{ name: 'T', sii: null, price: 1000, sale: 1000 }, { name: 'G', sii: 'galpon', price: 1000, sale: 200 }];
  const f = projectFlow({ H: 3, assets: A, mode: 'normal', ing: [0, 100, 3000, 3000], cost: [0, 500, 500, 500], lp: 0.5, iLP: 0.1, iCP: 0.1, rate: 0.1 });
  assert.ok(f.rows[1].UAI < 0 && f.rows[1].imp === 0, 'sin impuesto con pérdida');
  assert.equal(f.rows[2].pea, -f.rows[1].UAI, 'la pérdida pasa al año siguiente');
  assert.ok(f.rows[1].CP > 0 && Math.abs(f.rows[1].FN) < 1e-9, 'crédito CP deja el flujo en 0');
  assert.ok(Math.abs(f.rows[2].intCP - 0.1 * f.rows[1].CP) < 1e-9 && f.rows[2].amCP === f.rows[1].CP, 'el CP se paga con interés al año siguiente');
  assert.ok(Math.abs(f.loan[3].P) < 1e-6, 'el crédito LP termina en 0');
});

test('Proyectos: banco de teoría y lecciones completos', () => {
  for (const t of TOPICS) {
    assert.ok(LESSONS[t.id], `lección ${t.id}`);
    assert.ok(CONCEPTS.filter(c => c.topic === t.id).length >= 5, `teoría ${t.id}`);
    if (LESSONS[t.id].example) assert.ok(TEMPLATE[LESSONS[t.id].example], `ejemplo ${t.id}`);
  }
  for (const c of CONCEPTS) assert.equal(new Set(c.opts).size, 4, c.q);
  assert.ok(CONCEPTS.length >= 120 && TRUEFALSE.length >= 20);
});
