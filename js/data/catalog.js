// Catálogo de cartas, rarezas y sobres.
// Es la ÚNICA fuente de verdad: `node scripts/gen-seed.mjs` genera supabase/seed.sql desde aquí,
// así el navegador (modo invitado) y el servidor usan exactamente los mismos números.
//
// Los ids (c001…, h001…) NO se deben cambiar: son los que quedan guardados en la base de datos.
// Cartas "spicy" (h…): solo salen en sobres, mercado e intercambios de cuentas indecentes.

import { CARD_LIST } from './cards.js';

export const RARITIES = [
  { id: 'comun', name: 'Común', rank: 1, sell: 5, color: '#9aa3b8', glow: 0 },
  { id: 'rara', name: 'Rara', rank: 2, sell: 15, color: '#4cc9f0', glow: 1 },
  { id: 'epica', name: 'Épica', rank: 3, sell: 50, color: '#b06cff', glow: 2 },
  { id: 'legendaria', name: 'Legendaria', rank: 4, sell: 150, color: '#ffb703', glow: 3 },
  { id: 'mitica', name: 'Mítica', rank: 5, sell: 400, color: '#ff4fd8', glow: 4 },
];
export const RARITY = Object.fromEntries(RARITIES.map(r => [r.id, r]));

export const PACKS = [
  {
    id: 'diario', name: 'Sobre diario', price: 0, n: 2, freeOnly: true, guaranteed: null,
    weights: { comun: 75, rara: 21, epica: 3.5, legendaria: 0.45, mitica: 0.05 },
    desc: 'Gratis una vez al día (al reclamar el premio diario).',
  },
  {
    id: 'basico', name: 'Sobre básico', price: 100, n: 3, freeOnly: false, guaranteed: null,
    weights: { comun: 70, rara: 24, epica: 5, legendaria: 0.9, mitica: 0.1 },
    desc: '3 cartas. Ideal para empezar la colección.',
  },
  {
    id: 'grande', name: 'Sobre grande', price: 250, n: 5, freeOnly: false, guaranteed: 'rara',
    weights: { comun: 60, rara: 30, epica: 8, legendaria: 1.7, mitica: 0.3 },
    desc: '5 cartas. La última es Rara o mejor.',
  },
  {
    id: 'legendario', name: 'Sobre legendario', price: 600, n: 6, freeOnly: false, guaranteed: 'epica',
    weights: { comun: 45, rara: 35, epica: 15, legendaria: 4, mitica: 1 },
    desc: '6 cartas. La última es Épica o mejor.',
  },
];
export const PACK = Object.fromEntries(PACKS.map(p => [p.id, p]));

// Tras 20 sobres pagados/gratis sin Legendaria, la última carta del siguiente es Legendaria o mejor.
export const PITY_LIMIT = 20;
export const MARKET_FEE = 0.05;      // 5% del precio se quema en cada venta entre jugadores
export const MARKET_MAX = 100000;
export const START_COINS = 300;

// Las cartas salen de la carpeta de monas: `python3 scripts/build-cards.py "<carpeta>"` genera
// js/data/cards.js y las imágenes en assets/cards/ (c… = decentes, h… = indecentes).
// Para cambiarle el nombre a una carta sin regenerar todo, agrégala aquí:
const NAMES = {};

export const CARDS = CARD_LIST.map((c, i) => ({
  ...c, n: i + 1, name: NAMES[c.id] || c.name,
  art: `assets/cards/${c.id}.webp`, thumb: `assets/cards/t/${c.id}.webp`,
}));
export const CARD = Object.fromEntries(CARDS.map(c => [c.id, c]));

export const SELL_PRICE = (cardId) => RARITY[CARD[cardId]?.rarity]?.sell || 0;

// Cartas que puede ver/conseguir una cuenta: las decentes ven solo las decentes.
export const cardsFor = (indecente) => indecente ? CARDS : CARDS.filter(c => !c.spicy);
