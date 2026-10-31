// Cartas: tienda de sobres (apertura estilo Clash Royale) y colección.
import { h, $, $$, esc, overlay, confirmBox } from '../dom.js';
import { S, mission, save } from '../state.js';
import { NET } from '../backend.js';
import { PACKS, PACK, CARDS, CARD, RARITY, RARITIES, PITY_LIMIT, SELL_PRICE, cardsFor, BOOSTS } from '../data/catalog.js';
import { cardView } from '../components.js';
import { SFX, confetti, shake, flash, toast, buzz, coinRain, Media, react } from '../fx.js';
import { hud, rarityHype } from '../game.js';
import { go } from '../router.js';
import * as market from './market.js';

export function render(root, p) {
  const tab = p.tab || 'shop';
  const el = h(`<section class="view cards-view">
    <div class="tabs"><button data-t="shop">🎁 Sobres</button><button data-t="col">🗂️ Colección</button><button data-t="market">🏪 Mercado</button><button data-t="trades">🔁 Intercambios</button></div>
    <div class="tabbody"></div></section>`);
  $$('.tabs button', el).forEach(b => { b.classList.toggle('active', b.dataset.t === tab); b.onclick = () => go('cards', { tab: b.dataset.t }); });
  const body = $('.tabbody', el);
  root.append(el);
  if (tab === 'shop') return shop(body);
  if (tab === 'col') return collection(body);
  if (tab === 'market') return market.renderMarket(body);
  if (tab === 'trades') return market.renderTrades(body, p);
}

// ---------------------------------------------------------------- tienda
function shop(body) {
  const draw = () => {
    body.innerHTML = '';
    const left = PITY_LIMIT - NET.pity;
    body.append(h(`<div class="card row"><div class="grow"><b>🪙 ${NET.coins} monedas</b><br><small class="muted">Legendaria garantizada en ${left} sobre${left === 1 ? '' : 's'} · Sobres gratis: ${NET.freePacks}</small></div></div>`));
    const grid = h('<div class="packs"></div>');
    for (const pk of PACKS) {
      const free = pk.freeOnly;
      const can = free ? NET.freePacks > 0 : NET.coins >= pk.price;
      const art = Media.pack(pk.id);
      const c = h(`<div class="pack-card p-${pk.id}">
        <div class="pack-art">${art ? `<img src="${esc(art)}" alt="">` : `<span>${free ? '🎁' : pk.id === 'legendario' ? '👑' : pk.id === 'grande' ? '💎' : '⚡'}</span>`}</div>
        <b>${esc(pk.name)}</b><small class="muted">${esc(pk.desc)}</small>
        <div class="odds small"></div>
        <button class="btn ${can ? 'gold' : ''}" ${can ? '' : 'disabled'}>${free ? `Abrir gratis (${NET.freePacks})` : `🪙 ${pk.price}`}</button>
        ${!free && NET.freePacks > 0 && pk.id === 'basico' ? '<button class="btn sm usefree">Usar sobre gratis</button>' : ''}
      </div>`);
      const tot = Object.values(pk.weights).reduce((a, b) => a + b, 0);
      $('.odds', c).innerHTML = RARITIES.map(r => `<span style="color:${r.color}">${r.name} ${Math.round(pk.weights[r.id] / tot * 1000) / 10}%</span>`).join(' · ');
      $('.btn', c).onclick = () => open(pk.id, free);
      const uf = $('.usefree', c); if (uf) uf.onclick = () => open(pk.id, true);
      grid.append(c);
    }
    body.append(grid);
    boosts(body, draw);
    body.append(h('<p class="small muted">¿Te faltan monedas? Responde preguntas, haz simulacros, cumple misiones y reclama el premio diario. También puedes vender repetidas al juego (precio bajo) o en el mercado (precio que tú pongas).</p>'));
  };
  const open = async (packId, useFree) => {
    SFX.unlock();
    let cards;
    try { cards = await NET.openPack(packId, useFree); }
    catch (e) { toast('No se pudo abrir', e.message, '!', 'bad'); return; }
    mission('pack'); hud(true);
    await openingAnimation(packId, cards);
    draw();
  };
  draw();
}

// ---------------------------------------------------------------- boosts
const dur = (m) => (m >= 60 ? `${m / 60} h` : `${m} min`);
const minsLeft = (t) => Math.max(0, Math.ceil((t - Date.now()) / 60e3));

function boosts(body, redraw) {
  const u = NET.boostUntil, now = Date.now();
  const act = [u.xp > now && `XP ×2 por ${minsLeft(u.xp)} min más`, u.coins > now && `monedas ×2 por ${minsLeft(u.coins)} min más`].filter(Boolean);
  body.append(h(`<h3 style="margin:18px 0 4px">⚡ Boosts</h3>`));
  body.append(h(`<p class="small muted">Duplican lo que ganas respondiendo preguntas y haciendo simulacros. Si compras otro, se suma el tiempo (máximo 3 horas acumuladas). El tope diario de 3000 monedas por estudio no cambia.${act.length ? `<br><b class="boost-on">Activo: ${act.join(' y ')}.</b>` : ''}</p>`));
  const grid = h('<div class="packs boosts"></div>');
  for (const b of BOOSTS) {
    const r = b.rarity && RARITY[b.rarity];
    const pool = r ? Object.entries(NET.cards).filter(([id, q]) => q >= 2 && CARD[id]?.rarity === b.rarity).map(([id]) => id) : [];
    const can = r ? pool.length > 0 : NET.coins >= b.price;
    const cost = r ? `Sacrifica 1 carta <b style="color:${r.color}">${r.name}</b> repetida` : `Cuesta 🪙 ${b.price}`;
    const c = h(`<div class="pack-card boost-card">
      <div class="boost-ico">${b.icon}</div>
      <b>${esc(b.name)}</b><small>Durante ${dur(b.mins)}</small>
      <small class="muted">${cost}</small>
      <button class="btn ${can ? 'gold' : ''}" ${can ? '' : 'disabled'}>${r ? (can ? 'Elegir carta' : `Sin ${r.name.toLowerCase()}s repetidas`) : `🪙 ${b.price}`}</button>
    </div>`);
    $('.btn', c).onclick = async () => {
      let card = null;
      if (r) { card = await pickCard(pool, b); if (!card) return; }
      const ok = await confirmBox(`${b.name} por ${dur(b.mins)}`, r ? `Se destruye 1 copia de "${CARD[card].name}". No se puede recuperar.` : `Se descuentan ${b.price} monedas.`, 'Activar boost');
      if (!ok) return;
      try { await NET.buyBoost(b.id, card); }
      catch (e) { toast('No se pudo activar', e.message, '!', 'bad'); return; }
      SFX.fanfare(); confetti(innerWidth / 2, innerHeight / 3, 70); react('hype');
      toast('Boost activado', `${b.name} durante ${dur(b.mins)}`, b.icon, 'gold');
      hud(true); redraw();
    };
    grid.append(c);
  }
  body.append(grid);
}

// Elige qué carta repetida sacrificar (muestra solo las de la rareza pedida).
function pickCard(pool, b) {
  return new Promise((res) => {
    const box = h(`<div class="box"><h3>¿Qué carta sacrificas?</h3><p class="muted small">Solo aparecen tus ${RARITY[b.rarity].name.toLowerCase()}s repetidas: siempre te queda al menos una copia.</p><div class="col-grid"></div><div class="row end"><button class="btn ghost">Cancelar</button></div></div>`);
    const ov = overlay(box);
    for (const id of pool) {
      const v = cardView(id, { small: true, qty: NET.cards[id] });
      v.onclick = () => { ov.remove(); res(id); };
      $('.col-grid', box).append(v);
    }
    $('.btn.ghost', box).onclick = () => { ov.remove(); res(null); };
  });
}

// Animación de apertura: tocar el sobre → explota → revelar carta por carta → resumen.
function openingAnimation(packId, cards) {
  return new Promise((resolve) => {
    const pk = PACK[packId];
    const stage = h(`<div class="opening"><div class="pack-big p-${packId}"><span>${esc(pk.name)}</span><small>Toca para abrir</small></div><div class="counter"></div><div class="reveal-zone"></div><div class="summary" hidden></div></div>`);
    const ov = overlay(stage, { dismiss: false, cls: 'dark' });
    const big = $('.pack-big', stage);
    let taps = 0;
    big.onclick = () => {
      taps++; SFX.shake(); buzz(30); shake(big, taps >= 2);
      big.style.setProperty('--crack', taps);
      if (taps < 3) { $('small', big).textContent = taps === 1 ? '¡Otra vez!' : '¡Una más!'; return; }
      big.onclick = null; SFX.burst(); flash('rgba(255,255,255,.7)'); confetti(innerWidth / 2, innerHeight / 2, 100); buzz([60, 30, 120]);
      big.classList.add('burst'); setTimeout(() => { big.remove(); reveal(0); }, 450);
    };
    const zone = $('.reveal-zone', stage);
    const best = Math.max(...cards.map(c => RARITY[c.rarity].rank));
    const reveal = (i) => {
      $('.counter', stage).textContent = `${i + 1} / ${cards.length}`;
      zone.innerHTML = '';
      const c = cards[i], r = RARITY[c.rarity];
      const v = cardView(c.card, { flip: true, isNew: c.isNew, qty: c.qty });
      v.classList.add('big', 'fly-in');
      if (i === cards.length - 1 && best >= 4) v.classList.add('tease');       // la última "brilla" si es especial
      zone.append(v);
      zone.append(h(`<p class="tap-hint">Toca para revelar</p>`));
      const flipIt = () => {
        v.onclick = null; v.classList.remove('face-down'); v.classList.add('revealed');
        SFX.reveal(r.rank); buzz(r.rank >= 4 ? [80, 40, 160] : 20);
        $('.tap-hint', zone).textContent = c.isNew ? `¡${r.name.toUpperCase()} NUEVA!` : `${r.name} · ahora tienes ×${c.qty}`;
        if (r.rank >= 3) confetti(innerWidth / 2, innerHeight / 2, 40 * r.rank, [r.color, '#fff', '#ffd166']);
        if (r.rank >= 4) { flash(r.color + '88'); shake(document.body, true); coinRain(20); react('hype'); rarityHype(c.rarity, CARD[c.card].name); }
        v.onclick = () => (i + 1 < cards.length ? reveal(i + 1) : summary());
        $('.tap-hint', zone).onclick = v.onclick;
      };
      v.onclick = flipIt; $('.tap-hint', zone).onclick = flipIt;
    };
    const summary = () => {
      zone.remove(); $('.counter', stage).remove();
      const s = $('.summary', stage); s.hidden = false;
      s.append(h(`<h2>¡Sobre abierto!</h2>`));
      const g = h('<div class="sum-grid"></div>');
      cards.forEach(c => g.append(cardView(c.card, { small: true, isNew: c.isNew, qty: c.qty })));
      s.append(g);
      const nNew = cards.filter(c => c.isNew).length;
      s.append(h(`<p class="muted">${nNew} nueva${nNew === 1 ? '' : 's'} · ${cards.length - nNew} repetida${cards.length - nNew === 1 ? '' : 's'}</p>`));
      const row = h('<div class="row center"><button class="btn primary">Seguir</button><button class="btn col">Ver colección</button></div>');
      $('.primary', row).onclick = () => { ov.remove(); resolve(); };
      $('.col', row).onclick = () => { ov.remove(); resolve(); go('cards', { tab: 'col' }); };
      s.append(row);
    };
  });
}

// ---------------------------------------------------------------- colección
function collection(body) {
  let filter = 'all', set = 'all';
  const draw = () => {
    body.innerHTML = '';
    const inv = NET.cards;
    const CARDS = cardsFor(NET.indecente);
    const owned = CARDS.filter(c => inv[c.id] > 0).length;
    const dups = CARDS.reduce((a, c) => a + Math.max(0, (inv[c.id] || 0) - 1), 0);
    body.append(h(`<div class="card"><div class="row"><div class="grow"><b>${owned}/${CARDS.length} cartas</b> · ${dups} repetidas<div class="bar"><i style="width:${owned / CARDS.length * 100}%"></i></div></div><button class="btn sm sellall" ${dups ? '' : 'disabled'}>Vender repetidas comunes</button></div></div>`));
    const f = h(`<div class="chips"><button class="chip" data-f="all">Todas</button><button class="chip" data-f="own">Tengo</button><button class="chip" data-f="miss">Me faltan</button><button class="chip" data-f="dup">Repetidas</button>
      <select class="input sm set"><option value="all">Todas las series</option>${[...new Set(CARDS.map(c => c.set))].map(s => `<option>${esc(s)}</option>`).join('')}</select></div>`);
    $$('[data-f]', f).forEach(b => { b.classList.toggle('active', b.dataset.f === filter); b.onclick = () => { filter = b.dataset.f; draw(); }; });
    $('.set', f).value = set; $('.set', f).onchange = (e) => { set = e.target.value; draw(); };
    body.append(f);
    const grid = h('<div class="col-grid"></div>');
    for (const c of CARDS) {
      const q = inv[c.id] || 0;
      if (filter === 'own' && !q) continue; if (filter === 'miss' && q) continue; if (filter === 'dup' && q < 2) continue;
      if (set !== 'all' && c.set !== set) continue;
      const v = cardView(c.id, { small: true, qty: q, locked: !q });
      v.onclick = () => detail(c.id, draw);
      grid.append(v);
    }
    body.append(grid);
    $('.sellall', body).onclick = async () => {
      const list = CARDS.filter(c => c.rarity === 'comun' && (inv[c.id] || 0) > 1);
      const n = list.reduce((a, c) => a + inv[c.id] - 1, 0);
      if (!n) { toast('No tienes comunes repetidas', '', 'i'); return; }
      if (!await confirmBox('Vender comunes repetidas', `Venderás ${n} carta${n === 1 ? '' : 's'} al juego por ${n * RARITY.comun.sell} monedas (te queda 1 de cada una).`, 'Vender')) return;
      let total = 0;
      for (const c of list) { try { total += await NET.sellToSystem(c.id, inv[c.id] - 1); } catch (e) { toast('Error', e.message, '!', 'bad'); break; } }
      SFX.coin(); coinRain(10); toast(`+${total} monedas`, 'Repetidas vendidas', '🪙', 'gold'); hud(true); draw();
    };
  };
  draw();
}

export function detail(id, onChange = () => { }) {
  const c = CARD[id], r = RARITY[c.rarity], q = NET.cards[id] || 0, price = SELL_PRICE(id);
  const box = h(`<div class="box card-detail"><div class="dv"></div>
    <p><b>${esc(c.name)}</b> · ${esc(c.set)} · <span style="color:${r.color}">${r.name}</span></p>
    <p class="small muted">Tienes ×${q}. ${q > 1 ? `Repetidas: ${q - 1}.` : 'Solo se pueden vender o intercambiar las repetidas.'} El juego paga ${price} 🪙 por cada repetida.</p>
    <div class="col-actions"></div></div>`);
  $('.dv', box).append(cardView(id, { qty: q, locked: !q }));
  const act = $('.col-actions', box);
  const ov = overlay(box);
  const btn = (txt, cls, fn, dis = false) => { const b = h(`<button class="btn ${cls}" ${dis ? 'disabled' : ''}></button>`); b.textContent = txt; b.onclick = fn; act.append(b); };
  btn(`Vender 1 al juego (+${price} 🪙)`, '', async () => { try { await NET.sellToSystem(id, 1); SFX.coin(); toast(`+${price} monedas`, c.name, '🪙'); hud(true); ov.remove(); onChange(); } catch (e) { toast('No se pudo', e.message, '!', 'bad'); } }, q < 2);
  btn(`Vender todas las repetidas (+${price * Math.max(0, q - 1)} 🪙)`, '', async () => { try { await NET.sellToSystem(id, q - 1); SFX.coin(); toast(`+${price * (q - 1)} monedas`, c.name, '🪙'); hud(true); ov.remove(); onChange(); } catch (e) { toast('No se pudo', e.message, '!', 'bad'); } }, q < 3);
  btn('Publicar en el mercado', 'primary', () => { ov.remove(); market.sellDialog(id, onChange); }, q < 2);
  btn(NET.favorite === id ? '★ Destacada en tu perfil' : '☆ Destacar en mi perfil', 'gold', async () => { try { await NET.updateProfile({ favorite: id }); toast('Carta destacada', c.name, '★'); ov.remove(); } catch (e) { toast('No se pudo', e.message, '!', 'bad'); } }, !q);
}
