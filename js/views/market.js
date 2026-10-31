// Mercado entre jugadores: ventas a precio libre e intercambios (cartas y/o monedas).
// Toda la lógica de seguridad está en el servidor (schema.sql); aquí solo está la interfaz.
import { h, $, $$, esc, overlay, confirmBox } from '../dom.js';
import { NET } from '../backend.js';
import { CARDS, CARD, RARITY, RARITIES, SELL_PRICE, MARKET_FEE, MARKET_MAX, cardsFor, MARKET_LEVEL } from '../data/catalog.js';
import { cardView, avatarView } from '../components.js';
import { SFX, toast, confetti, coinRain } from '../fx.js';
import { hud } from '../game.js';
import { go } from '../router.js';

const needAccount = (body) => {
  body.append(h(`<div class="card center"><h3>🔒 El mercado necesita una cuenta</h3><p class="muted">Comprar, vender e intercambiar cartas con otros jugadores pasa por el servidor para que nadie pueda hacer trampa. ${NET.sb ? 'Crea una cuenta o entra desde tu perfil.' : 'Este sitio todavía no tiene Supabase configurado (ver README).'}</p>${NET.sb ? '<button class="btn primary">Entrar o crear cuenta</button>' : ''}</div>`));
  const b = $('.btn', body); if (b) b.onclick = () => go('profile', { auth: 1 });
};
const who = (p) => { const el = h('<span class="who"></span>'); el.append(avatarView(p?.avatar_url, p?.display_name || p?.username, p?.accent, 22)); el.append(document.createTextNode(' ' + (p?.display_name || p?.username || '?'))); return el; };

// ---------------------------------------------------------------- ventas
export function renderMarket(body) {
  if (!NET.online) return needAccount(body);
  if (marketLocked(body)) return;
  let rarity = '', unsub = () => { };
  const draw = async () => {
    body.innerHTML = '<p class="muted">Cargando mercado…</p>';
    let list, mine;
    try { [list, mine] = await Promise.all([NET.listings({ rarity }), NET.listings({ mine: true })]); }
    catch (e) { body.innerHTML = ''; body.append(h(`<div class="card bad">No se pudo cargar el mercado: ${esc(e.message)}</div>`)); return; }
    body.innerHTML = '';
    body.append(h(`<div class="card row"><div class="grow"><b>🪙 ${NET.coins}</b> · <small class="muted">Comisión por venta: ${MARKET_FEE * 100}% (se descuenta al vendedor)</small></div><button class="btn primary sell">Vender una carta</button></div>`));
    $('.sell', body).onclick = () => pickDuplicate((id) => sellDialog(id, draw));
    const chips = h(`<div class="chips"><button class="chip" data-r="">Todas</button>${RARITIES.map(r => `<button class="chip" data-r="${r.id}" style="--rc:${r.color}">${r.name}</button>`).join('')}</div>`);
    $$('.chip', chips).forEach(b => { b.classList.toggle('active', b.dataset.r === rarity); b.onclick = () => { rarity = b.dataset.r; draw(); }; });
    body.append(chips);
    const grid = h('<div class="market-grid"></div>');
    if (!list.length) grid.append(h('<p class="muted">No hay cartas a la venta con este filtro. ¡Sé el primero en publicar!</p>'));
    for (const l of list) {
      const c = h(`<div class="listing"><div class="lv"></div><div class="lmeta"><b class="price">🪙 ${l.price}</b><small class="muted">${NET.cards[l.card_id] ? `Tienes ×${NET.cards[l.card_id]}` : '¡No la tienes!'}</small></div><button class="btn sm ${NET.coins >= l.price ? 'gold' : ''}" ${NET.coins >= l.price ? '' : 'disabled'}>Comprar</button></div>`);
      $('.lv', c).append(cardView(l.card_id, { small: true }));
      $('.lmeta', c).append(who(l.profiles));
      $('button', c).onclick = async () => {
        if (!await confirmBox('Comprar carta', `${CARD[l.card_id].name} por ${l.price} monedas.`, 'Comprar')) return;
        try { await NET.buyListing(l.id); SFX.reveal(RARITY[CARD[l.card_id].rarity].rank); confetti(innerWidth / 2, innerHeight / 2, 60); toast('¡Compra realizada!', CARD[l.card_id].name, '🛒', 'gold'); hud(true); draw(); }
        catch (e) { toast('No se pudo comprar', e.message, '!', 'bad'); draw(); }
      };
      grid.append(c);
    }
    body.append(grid);
    body.append(h(`<h3>Mis publicaciones (${mine.length}/20)</h3>`));
    const mg = h('<div class="market-grid"></div>');
    if (!mine.length) mg.append(h('<p class="small muted">No tienes cartas publicadas.</p>'));
    for (const l of mine) {
      const c = h(`<div class="listing mine"><div class="lv"></div><div class="lmeta"><b class="price">🪙 ${l.price}</b><small class="muted">Recibirás ${l.price - Math.ceil(l.price * MARKET_FEE)}</small></div><button class="btn sm">Cancelar</button></div>`);
      $('.lv', c).append(cardView(l.card_id, { small: true }));
      $('button', c).onclick = async () => { try { await NET.cancelListing(l.id); toast('Publicación cancelada', 'La carta volvió a tu colección', '↩'); draw(); } catch (e) { toast('Error', e.message, '!', 'bad'); } };
      mg.append(c);
    }
    body.append(mg);
  };
  draw();
  let t = null;
  unsub = NET.subscribeMarket(() => { clearTimeout(t); t = setTimeout(draw, 800); });
  return { leave: () => unsub() };
}

function pickDuplicate(cb, title = 'Elige una carta') {
  const dups = CARDS.filter(c => (NET.cards[c.id] || 0) > 0 && (NET.indecente || !c.spicy));
  const box = h(`<div class="box"><h3>${esc(title)}</h3><div class="col-grid pick"></div></div>`);
  if (!dups.length) $('.pick', box).append(h('<p class="muted">No tienes cartas. ¡Abre sobres!</p>'));
  const ov = overlay(box);
  for (const c of dups) { const v = cardView(c.id, { small: true, qty: NET.cards[c.id] }); v.onclick = () => { ov.remove(); cb(c.id); }; $('.pick', box).append(v); }
}

// El mercado se desbloquea al nivel MARKET_LEVEL (evita pasar monedas entre multicuentas).
function marketLocked(body) {
  const lv = NET.profile?.level || 1;
  if (lv >= MARKET_LEVEL) return false;
  const el = h(`<div class="card center"><div style="font-size:42px">🔒</div><h3>El mercado se desbloquea al nivel ${MARKET_LEVEL}</h3><p class="muted">Vas en el nivel ${lv}. Sube respondiendo preguntas, haciendo simulacros y lecciones. Mientras tanto puedes intercambiar cartas con otros jugadores.</p></div>`);
  if (body) body.append(el); else toast('Mercado bloqueado', `Se desbloquea al nivel ${MARKET_LEVEL} (vas en el ${lv}).`, '🔒', 'bad');
  return true;
}

export function sellDialog(id, onDone = () => { }) {
  if (marketLocked()) return;
  if (!NET.online) { toast('Necesitas una cuenta', 'El mercado funciona con el servidor', '🔒', 'bad'); return; }
  const min = SELL_PRICE(id), sug = { comun: 20, rara: 60, epica: 200, legendaria: 600, mitica: 1500 }[CARD[id].rarity];
  const box = h(`<form class="box"><h3>Vender en el mercado</h3><div class="dv"></div>
    <label class="lbl">Precio (mínimo ${min}, máximo ${MARKET_MAX})<input class="input price" type="number" min="${min}" max="${MARKET_MAX}" value="${sug}" required></label>
    <p class="small muted net"></p>
    <div class="row end"><button type="button" class="btn ghost no">Cancelar</button><button class="btn primary">Publicar</button></div></form>`);
  $('.dv', box).append(cardView(id, { small: true, qty: NET.cards[id] }));
  const upd = () => { const p = +$('.price', box).value || 0; $('.net', box).textContent = `Si se vende recibes ${p - Math.ceil(p * MARKET_FEE)} monedas (comisión ${MARKET_FEE * 100}%). El juego te pagaría solo ${min}.`; };
  $('.price', box).oninput = upd; upd();
  const ov = overlay(box);
  $('.no', box).onclick = () => ov.remove();
  box.onsubmit = async (e) => {
    e.preventDefault();
    try { await NET.createListing(id, +$('.price', box).value); ov.remove(); toast('¡Publicada!', CARD[id].name, '🏪', 'gold'); SFX.coin(); onDone(); }
    catch (err) { toast('No se pudo publicar', err.message, '!', 'bad'); }
  };
}

// ---------------------------------------------------------------- intercambios
export function renderTrades(body, p = {}) {
  if (!NET.online) return needAccount(body);
  let unsub = () => { };
  const draw = async () => {
    body.innerHTML = '<p class="muted">Cargando…</p>';
    let list; try { list = await NET.trades(); } catch (e) { body.innerHTML = ''; body.append(h(`<div class="card bad">${esc(e.message)}</div>`)); return; }
    body.innerHTML = '';
    body.append(h(`<div class="card row"><div class="grow small muted">Ofrece tus cartas y/o monedas a otro jugador a cambio de las suyas. Lo que ofreces queda en custodia hasta que acepten, rechacen o canceles.</div><button class="btn primary new">Nueva oferta</button></div>`));
    $('.new', body).onclick = () => tradeDialog(null, draw);
    const me = NET.user.id;
    const sec = (title, items, mk) => { body.append(h(`<h3>${title}</h3>`)); if (!items.length) body.append(h('<p class="small muted">Nada por aquí.</p>')); items.forEach(t => body.append(mk(t))); };
    const itemsRow = (arr, coins) => { const r = h('<div class="titems"></div>'); arr.forEach(x => { const v = cardView(x.card, { small: true, qty: x.qty }); r.append(v); }); if (coins) r.append(h(`<span class="tcoins">🪙 ${coins}</span>`)); if (!arr.length && !coins) r.append(h('<span class="muted small">nada</span>')); return r; };
    const card = (t, actions) => {
      const c = h(`<div class="card trade ${t.status}"><div class="row small"><span class="grow"></span><span class="muted">${new Date(t.created_at).toLocaleString('es-CL')}</span></div>
        <div class="tside"><small>${t.from_user === me ? 'Tú ofreces' : 'Te ofrece'}</small></div><div class="tside2"><small>${t.from_user === me ? 'A cambio de' : 'Te pide'}</small></div>
        ${t.message ? `<p class="small">“${esc(t.message)}”</p>` : ''}<div class="row end acts"></div></div>`);
      $('.grow', c).append(t.from_user === me ? h('<span>Para </span>') : h('<span>De </span>'));
      $('.grow', c).append(who(t.from_user === me ? t.to : t.from));
      $('.tside', c).append(itemsRow(t.offer_cards, t.offer_coins));
      $('.tside2', c).append(itemsRow(t.request_cards, t.request_coins));
      actions(c);
      return c;
    };
    const pend = list.filter(t => t.status === 'pending');
    sec('Recibidas', pend.filter(t => t.to_user === me), (t) => card(t, (c) => {
      const a = h('<button class="btn gold">Aceptar</button>'), r = h('<button class="btn ghost">Rechazar</button>');
      a.onclick = async () => { try { await NET.respondTrade(t.id, true); SFX.fanfare(); confetti(innerWidth / 2, innerHeight / 2, 80); coinRain(10); toast('¡Intercambio realizado!', '', '🔁', 'gold'); hud(true); draw(); } catch (e) { toast('No se pudo aceptar', e.message, '!', 'bad'); } };
      r.onclick = async () => { try { await NET.respondTrade(t.id, false); toast('Oferta rechazada', '', '✕'); draw(); } catch (e) { toast('Error', e.message, '!', 'bad'); } };
      $('.acts', c).append(r, a);
    }));
    sec('Enviadas', pend.filter(t => t.from_user === me), (t) => card(t, (c) => {
      const b = h('<button class="btn ghost">Cancelar</button>');
      b.onclick = async () => { try { await NET.cancelTrade(t.id); toast('Oferta cancelada', 'Lo ofrecido volvió a tu colección', '↩'); hud(true); draw(); } catch (e) { toast('Error', e.message, '!', 'bad'); } };
      $('.acts', c).append(b);
    }));
    const hist = list.filter(t => t.status !== 'pending').slice(0, 15);
    const label = { accepted: 'Aceptado ✓', rejected: 'Rechazado', cancelled: 'Cancelado' };
    sec('Historial', hist, (t) => card(t, (c) => $('.acts', c).append(h(`<span class="tag">${label[t.status]}</span>`))));
  };
  draw();
  if (p.to) tradeDialog(p.to, draw);
  let tm = null;
  unsub = NET.subscribeMarket(() => { clearTimeout(tm); tm = setTimeout(draw, 800); });
  return { leave: () => unsub() };
}

// Crear oferta: buscar jugador → elegir lo que pides de sus cartas y lo que ofreces de las tuyas.
export async function tradeDialog(toUsername = null, onDone = () => { }) {
  const box = h(`<form class="box trade-dialog"><h3>Nueva oferta de intercambio</h3>
    <div class="row"><input class="input grow uname" placeholder="Usuario del otro jugador" required><button type="button" class="btn find">Buscar</button></div>
    <div class="target"></div></form>`);
  const ov = overlay(box);
  if (toUsername) $('.uname', box).value = toUsername;
  const offer = {}, request = {};
  const find = async () => {
    const u = await NET.findUser($('.uname', box).value);
    const tg = $('.target', box); tg.innerHTML = '';
    if (!u) { tg.append(h('<p class="bad small">No existe ese usuario.</p>')); return; }
    if (u.id === NET.user.id) { tg.append(h('<p class="bad small">No puedes intercambiar contigo mismo.</p>')); return; }
    const { cards } = await NET.publicProfile(u.id);
    // Cartas indecentes solo si ambos son indecentes.
    const both = cardsFor(NET.indecente && u.indecente);
    const theirs = both.filter(c => (cards[c.id] || 0) > 0), mine = both.filter(c => (NET.cards[c.id] || 0) > 0);
    const pickGrid = (list, src, sel) => {
      const g = h('<div class="col-grid pick"></div>');
      if (!list.length) g.append(h('<p class="small muted">Sin cartas.</p>'));
      for (const c of list) {
        const v = cardView(c.id, { small: true, qty: src[c.id] });
        v.onclick = () => { const max = src[c.id]; sel[c.id] = ((sel[c.id] || 0) + 1) % (max + 1); v.dataset.sel = sel[c.id] || ''; v.classList.toggle('selected', !!sel[c.id]); };
        g.append(v);
      }
      return g;
    };
    tg.append(h(`<p class="who-line"></p>`)); $('.who-line', tg).append(who(u));
    tg.append(h('<p class="small"><b>Pides</b> (cartas de él/ella; toca varias veces para pedir más copias):</p>'));
    tg.append(pickGrid(theirs, cards, request));
    tg.append(h('<p class="small"><b>Ofreces</b> (tus cartas; si das la última copia, dejas de tenerla):</p>'));
    tg.append(pickGrid(mine, NET.cards, offer));
    tg.append(h(`<div class="row"><label class="lbl grow">Ofreces monedas<input class="input oc" type="number" min="0" max="${Math.min(NET.coins, 100000)}" value="0"></label><label class="lbl grow">Pides monedas<input class="input rc" type="number" min="0" max="100000" value="0"></label></div>
      <input class="input msg" maxlength="140" placeholder="Mensaje (opcional)">
      <div class="row end"><button type="button" class="btn ghost no">Cancelar</button><button class="btn primary">Enviar oferta</button></div>`));
    $('.no', tg).onclick = () => ov.remove();
    box.onsubmit = async (e) => {
      e.preventDefault();
      const toArr = (o) => Object.entries(o).filter(([, q]) => q > 0).map(([card, qty]) => ({ card, qty }));
      try {
        await NET.createTrade(u.id, toArr(offer), toArr(request), +$('.oc', tg).value || 0, +$('.rc', tg).value || 0, $('.msg', tg).value);
        ov.remove(); toast('Oferta enviada', 'Lo ofrecido queda en custodia', '📨', 'gold'); hud(true); onDone();
      } catch (err) { toast('No se pudo enviar', err.message, '!', 'bad'); }
    };
  };
  $('.find', box).onclick = find;
  box.onsubmit = (e) => { e.preventDefault(); find(); };
  if (toUsername) find();
}
