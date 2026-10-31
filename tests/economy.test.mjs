import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollPack } from '../js/economy.js';
import { PACKS, CARDS, CARD, RARITY, PITY_LIMIT } from '../js/data/catalog.js';
import { rng, gradeCL, levelFor, parseNum, close } from '../js/util.js';
import { readFileSync } from 'node:fs';

test('sobres: cantidad de cartas, garantía y pity', () => {
  const r = rng(123);
  for (const pk of PACKS) {
    for (let i = 0; i < 2000; i++) {
      const out = rollPack(pk.id, 0, r.next);
      assert.equal(out.cards.length, pk.n);
      for (const c of out.cards) assert.ok(CARD[c.card] && CARD[c.card].rarity === c.rarity);
      if (pk.guaranteed) assert.ok(RARITY[out.cards.at(-1).rarity].rank >= RARITY[pk.guaranteed].rank);
    }
    const forced = rollPack(pk.id, PITY_LIMIT - 1, r.next);
    assert.ok(RARITY[forced.cards.at(-1).rarity].rank >= 4, 'pity da legendaria');
    assert.equal(forced.pity, 0);
  }
});

test('sobres: decentes nunca reciben indecentes; indecentes sí', () => {
  const r = rng(99);
  let spicy = 0;
  for (let i = 0; i < 3000; i++) {
    for (const c of rollPack('legendario', 0, r.next).cards) assert.ok(!CARD[c.card].spicy, c.card);
    for (const c of rollPack('legendario', 0, r.next, true).cards) if (CARD[c.card].spicy) spicy++;
  }
  assert.ok(spicy > 0);
  assert.ok(CARDS.every(c => /^[ch]\d{3}$/.test(c.id) && c.spicy === c.id.startsWith('h')));
});

test('sobres: la frecuencia se parece a las probabilidades publicadas', () => {
  const r = rng(7), counts = {};
  const N = 40000;
  for (let i = 0; i < N; i++) for (const c of rollPack('basico', 0, r.next).cards) counts[c.rarity] = (counts[c.rarity] || 0) + 1;
  const comun = counts.comun / (N * 3);
  assert.ok(Math.abs(comun - 0.70) < 0.01, `común ${comun}`);
});

test('catálogo y seed.sql están sincronizados', () => {
  const sql = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
  for (const c of CARDS) assert.ok(sql.includes(`('${c.id}', '${c.rarity}', true, ${!!c.spicy})`), c.id);
  for (const p of PACKS) assert.ok(sql.includes(`('${p.id}', ${p.price}, ${p.n},`), p.id);
});

test('nota chilena y niveles (iguales al SQL)', () => {
  assert.equal(gradeCL(12, 12), 7); assert.equal(gradeCL(0, 12), 1); assert.equal(gradeCL(6, 10), 4); assert.equal(gradeCL(9, 12), 5.1); assert.equal(gradeCL(8, 12), 4.5); assert.equal(gradeCL(7, 10), 4.8);
  assert.equal(levelFor(0), 1); assert.equal(levelFor(120), 2); assert.equal(levelFor(359), 2); assert.equal(levelFor(360), 3);
});

test('lectura de números escritos por el alumno', () => {
  const cases = [['4762,35', 4762.35], ['4.762,35', 4762.35], ['4762.35', 4762.35], ['4,76k', 4760], ['1.2e3', 1200], ['86,9 %', 86.9], ['230 V', 230], ['-3,5', -3.5], ['7,36 kW', 7360], ['1.000.000', 1e6], ['abc', NaN], ['', NaN]];
  for (const [s, v] of cases) Number.isNaN(v) ? assert.ok(Number.isNaN(parseNum(s)), s) : assert.ok(Math.abs(parseNum(s) - v) < 1e-9, `${s} → ${parseNum(s)}`);
  assert.ok(close(4762, 4762.35)); assert.ok(!close(4000, 4762.35));
});
