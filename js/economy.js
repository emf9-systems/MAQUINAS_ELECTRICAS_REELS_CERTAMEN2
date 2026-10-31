// Reglas de la economía en JavaScript, idénticas a las funciones de supabase/schema.sql.
// Se usan en modo invitado (sin servidor) y en las pruebas automáticas.
import { RARITIES, RARITY, PACK, CARDS, PITY_LIMIT, SELL_PRICE, BOOST, BOOST_MAX_MS } from './data/catalog.js';

export const DAILY_BONUS = (streak) => 100 + 20 * Math.min(streak, 10);
export const LEVEL_UP_COINS = 100;            // por cada nivel subido
export const MISSIONS_PER_DAY = 3;
export const EXAM_COINS = (grade) => Math.round(grade * 40);
export const STUDY = {                        // por respuesta correcta (igual que grant_study)
  mcq: { xp: 10, coins: 6 }, rush: { xp: 12, coins: 8 }, dev: { xp: 25, coins: 16 }, lesson: { xp: 15, coins: 10 },
};
export const DAILY_CAP = { xp: 20000, coins: 3000 };

// Compra de un boost sobre {xp, coins} (horas de vencimiento en ms). Devuelve los nuevos vencimientos
// o lanza error si se pasaría de 3 horas acumuladas. Igual que buy_boost en el servidor.
export function addBoost(until, id, now = Date.now()) {
  const b = BOOST[id];
  if (!b) throw new Error('Boost desconocido');
  const out = { ...until };
  for (const k of ['xp', 'coins']) {
    if (!b[k]) continue;
    out[k] = Math.max(until[k] || 0, now) + b.mins * 60e3;
    if (out[k] > now + BOOST_MAX_MS) throw new Error('Ya tienes casi 3 horas de boost acumuladas. Espera a que baje.');
  }
  return out;
}
export const boostMult = (until, now = Date.now()) => (until > now ? 2 : 1);

export function rollRarity(weights, minRank, rand = Math.random) {
  const pool = RARITIES.filter(r => r.rank >= minRank);
  const total = pool.reduce((a, r) => a + (weights[r.id] || 0), 0);
  if (total <= 0) return pool[0].id;
  let x = rand() * total;
  for (const r of pool) { x -= weights[r.id] || 0; if (x < 0) return r.id; }
  return pool[pool.length - 1].id;
}

// Devuelve las cartas que salen y el nuevo pity. Las cuentas decentes solo reciben cartas decentes.
export function rollPack(packId, pity, rand = Math.random, indecente = false) {
  const pk = PACK[packId];
  const out = [];
  let best = 0;
  for (let i = 1; i <= pk.n; i++) {
    let minRank = 1;
    if (i === pk.n && pk.guaranteed) minRank = RARITY[pk.guaranteed].rank;
    if (i === pk.n && pity + 1 >= PITY_LIMIT) minRank = Math.max(minRank, RARITY.legendaria.rank);
    const rar = rollRarity(pk.weights, minRank, rand);
    const pool = CARDS.filter(c => c.rarity === rar && (indecente || !c.spicy));
    const card = pool[Math.floor(rand() * pool.length)];
    best = Math.max(best, RARITY[rar].rank);
    out.push({ card: card.id, rarity: rar });
  }
  return { cards: out, pity: best >= RARITY.legendaria.rank ? 0 : pity + 1 };
}

export { SELL_PRICE };
