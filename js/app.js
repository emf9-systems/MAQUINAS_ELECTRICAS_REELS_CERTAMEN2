// Punto de entrada: arma el HUD, la navegación y conecta todo.
import { $, h, esc } from './dom.js';
import { S, level, save } from './state.js';
import { NET } from './backend.js';
import { Media, SFX } from './fx.js';
import { register, start, go, refreshView, viewName } from './router.js';
import { setHud } from './game.js';
import { avatarView, decencyDialog } from './components.js';
import * as home from './views/home.js';
import * as learn from './views/learn.js';
import * as practice from './views/practice.js';
import * as exam from './views/exam.js';
import * as rush from './views/rush.js';
import * as cards from './views/cards.js';
import * as profile from './views/profile.js';

register('home', home);
register('learn', learn);
register('practice', practice);
register('exam', exam);
register('rush', rush);
register('cards', cards);
register('profile', profile);
register('ranking', { render: profile.renderRanking });

let lastCoins = null, lastLv = null;
function drawHud(bump = false) {
  const L = level();
  const hudEl = $('#hud');
  hudEl.style.setProperty('--ac', NET.accent);
  $('.h-av', hudEl).replaceChildren(avatarView(NET.avatar, NET.name, NET.accent, 34));
  $('.h-lv', hudEl).textContent = L.lv;
  $('.h-xp i', hudEl).style.width = Math.round(L.pct * 100) + '%';
  const coins = NET.coins;
  $('.h-coins b', hudEl).textContent = coins;
  $('.h-streak b', hudEl).textContent = S.streak;
  $('.h-streak', hudEl).classList.toggle('hot', S.streak >= 5);
  if (bump && lastCoins !== null && coins !== lastCoins) { const c = $('.h-coins', hudEl); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  if (bump && lastLv !== null && L.lv !== lastLv) { const c = $('.h-lvbox', hudEl); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  lastCoins = coins; lastLv = L.lv;
  const st = $('.h-mode', hudEl);
  st.textContent = NET.mode === 'online' ? '' : NET.mode === 'guest' ? 'invitado' : NET.mode === 'local' ? 'local' : '…';
  st.hidden = NET.mode === 'online';
  document.body.dataset.fx = S.settings.fx;
  drawBoost();
}

// Chip del boost activo en la barra superior, con los minutos que le quedan.
export function drawBoost() {
  const el = $('#hud .h-boost'), u = NET.boostUntil, now = Date.now();
  const left = (t) => { const m = Math.ceil((t - now) / 60e3); return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m}m`; };
  const parts = [];
  if (u.xp > now) parts.push(`⚡${left(u.xp)}`);
  if (u.coins > now) parts.push(`🪙${left(u.coins)}`);
  el.hidden = !parts.length;
  el.textContent = '×2 ' + parts.join(' ');
  el.title = 'Boost activo: ' + [u.xp > now && 'XP ×2', u.coins > now && 'monedas ×2'].filter(Boolean).join(' y ');
}
setHud(drawHud);

async function boot() {
  $('#hud .h-av').onclick = () => go('profile');
  $('#hud .h-coins').onclick = () => go('cards');
  $('#hud .h-boost').onclick = () => go('cards', { tab: 'shop' });
  setInterval(drawBoost, 20e3);
  document.addEventListener('pointerdown', () => SFX.unlock(), { once: true });
  await Promise.all([Media.load(), NET.init()]);
  NET.onChange(() => { drawHud(true); });
  NET.joinLobby((ev) => { if (viewName() === 'home') refreshView(); });
  drawHud();
  start('home');
  if (NET.mode === 'guest' && !localStorage.getItem('c2-seen-auth')) { localStorage.setItem('c2-seen-auth', '1'); go('profile', { auth: 1 }); }
  // Modo local (sin servidor): la pregunta decente/indecente se hace al primer ingreso.
  if (NET.mode === 'local' && !S.decided) { const ind = await decencyDialog(); if (ind !== null) { S.indecente = ind; S.decided = true; save(true); refreshView(); } }
  addEventListener('beforeunload', () => NET.pushNow());
  document.addEventListener('visibilitychange', () => { if (document.hidden) NET.pushNow(); });
}
boot();
