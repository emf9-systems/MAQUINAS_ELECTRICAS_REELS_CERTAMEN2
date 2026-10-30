// Genera supabase/seed.sql a partir de js/data/catalog.js.
// Uso: node scripts/gen-seed.mjs
import { writeFileSync } from 'node:fs';
import { RARITIES, PACKS, CARDS } from '../js/data/catalog.js';

const q = (s) => s === null || s === undefined ? 'null' : "'" + String(s).replace(/'/g, "''") + "'";
const lines = [
  '-- GENERADO por scripts/gen-seed.mjs desde js/data/catalog.js. No editar a mano.',
  '-- Pegar en Supabase → SQL Editor → Run, DESPUÉS de schema.sql. Se puede re-ejecutar.',
  '',
  'insert into public.rarities (id, rank, sell_price) values',
  RARITIES.map(r => `  (${q(r.id)}, ${r.rank}, ${r.sell})`).join(',\n'),
  'on conflict (id) do update set rank = excluded.rank, sell_price = excluded.sell_price;',
  '',
  'insert into public.cards (id, rarity, active) values',
  CARDS.map(c => `  (${q(c.id)}, ${q(c.rarity)}, true)`).join(',\n'),
  'on conflict (id) do update set rarity = excluded.rarity, active = excluded.active;',
  '',
  'insert into public.packs (id, price, n_cards, weights, guaranteed, free_only) values',
  PACKS.map(p => `  (${q(p.id)}, ${p.price}, ${p.n}, ${q(JSON.stringify(p.weights))}::jsonb, ${q(p.guaranteed)}, ${p.freeOnly})`).join(',\n'),
  'on conflict (id) do update set price = excluded.price, n_cards = excluded.n_cards, weights = excluded.weights,',
  '  guaranteed = excluded.guaranteed, free_only = excluded.free_only;',
  '',
];
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), lines.join('\n'));
console.log('seed.sql: %d rarezas, %d cartas, %d sobres', RARITIES.length, CARDS.length, PACKS.length);
