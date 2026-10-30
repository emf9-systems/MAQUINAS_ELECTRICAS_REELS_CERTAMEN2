import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, generate } from '../js/content/generators.js';
import { buildOptions } from '../js/engine/mcq.js';

test('cada plantilla genera ejercicios válidos con 200 semillas', () => {
  for (const t of TEMPLATES) {
    for (let seed = 1; seed <= 200; seed++) {
      const ex = generate(t.id, seed);
      assert.ok(ex.parts.length >= 4, `${t.id}: al menos 4 partes`);
      assert.ok(ex.text.length > 20, `${t.id}: enunciado`);
      for (const [i, p] of ex.parts.entries()) {
        assert.ok(Number.isFinite(p.ans), `${t.id}#${seed} parte ${i}: respuesta finita (${p.ans})`);
        assert.ok(p.ans > 0, `${t.id}#${seed} parte ${i}: respuesta positiva (${p.ans}) — ${p.q}`);
        assert.ok(p.steps.length >= 1, `${t.id}: desarrollo`);
        if (p.unit === '%') assert.ok(p.ans < 100, `${t.id}#${seed} parte ${i}: % menor a 100 (${p.ans})`);
        const o = buildOptions(p, seed);
        assert.equal(o.options.length, 4);
        assert.equal(new Set(o.options).size, 4, `${t.id}#${seed} parte ${i}: opciones distintas ${o.options}`);
        assert.equal(o.values[o.correct], p.ans);
      }
    }
  }
});

test('mismo seed ⇒ mismo ejercicio', () => {
  for (const t of TEMPLATES) assert.deepEqual(generate(t.id, 42).parts.map(p => p.ans), generate(t.id, 42).parts.map(p => p.ans));
});

test('motor shunt: balance de potencias cierra', () => {
  for (let seed = 1; seed < 100; seed++) {
    const ex = generate('cc_shunt', seed);
    assert.ok(ex.parts[5].ans > 0, 'pérdidas mecánicas positivas');
  }
});

test('flujo_balance: pérdidas mecánicas positivas', () => {
  for (let seed = 1; seed < 300; seed++) {
    const ex = generate('flujo_balance', seed);
    assert.ok(ex.parts[3].ans > 0, `seed ${seed}: Pmec=${ex.parts[3].ans}`);
  }
});

import { GUIDE } from '../js/content/guide.js';
test('guías: 9 de CC + 17 de CA, todas con opciones válidas', () => {
  assert.equal(GUIDE.filter(g => g.guide === 'CC').length, 9);
  assert.equal(GUIDE.filter(g => g.guide === 'CA').length, 17);
  for (const g of GUIDE) for (const [i, p] of g.parts.entries()) {
    assert.ok(Number.isFinite(p.ans) && p.ans > 0, `${g.id} parte ${i}`);
    const o = buildOptions(p, 7 + i);
    assert.equal(new Set(o.options).size, 4, `${g.id} parte ${i}: ${o.options}`);
  }
});
test('guías: valores clave', () => {
  const v = (id, i) => GUIDE.find(g => g.id === id).parts[i].ans;
  const near = (a, b, t = 0.005) => assert.ok(Math.abs(a - b) <= Math.abs(b) * t, `${a} ≈ ${b}`);
  near(v('guia_CC_1', 0), 4762.35); near(v('guia_CC_2', 1), 7.127); near(v('guia_CC_4', 2), 86.96);
  near(v('guia_CC_5', 3), 0.2857); near(v('guia_CC_5', 5), 304); near(v('guia_CC_7', 0), 206); near(v('guia_CC_7', 3), 3.333);
  near(v('guia_CC_8', 2), 229.55); near(v('guia_CC_9', 5), 879.2);
  near(v('guia_CA_3', 2), 1445.6); near(v('guia_CA_8', 3), 95.15); near(v('guia_CA_10', 4), 186.6); near(v('guia_CA_11', 5), 0.8768);
});
