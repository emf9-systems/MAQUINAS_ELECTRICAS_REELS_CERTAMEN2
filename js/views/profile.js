// Perfil (editar foto, nombre, bio, título, color, carta destacada, ajustes), login y ranking.
import { h, $, $$, esc } from '../dom.js';
import { S, save, level, titleFor, LEVEL_TITLES, ACH } from '../state.js';
import { NET } from '../backend.js';
import { CARDS, CARD } from '../data/catalog.js';
import { avatarView, cardView, squareImage } from '../components.js';
import { toast, SFX, confetti } from '../fx.js';
import { hud } from '../game.js';
import { go } from '../router.js';
import { fmt } from '../util.js';

const ACCENTS = ['#ff6b4a', '#ffd166', '#3ddc97', '#4cc9f0', '#9b8cff', '#b06cff', '#ff4fd8', '#f1edff'];

export function render(root, p) {
  if (p.id) return publicProfile(root, p.id);
  const L = level();
  const el = h(`<section class="view profile">
    <div class="card account"></div>
    <div class="card me" style="--ac:${esc(NET.accent)}">
      <div class="row"><label class="avatar-edit" title="Cambiar foto"><span class="av"></span><input type="file" accept="image/*" hidden><small>Cambiar foto</small></label>
        <div class="grow"><h2 class="dname"></h2><small class="muted">Nivel ${L.lv} · ${esc(NET.title || titleFor(L.lv))}</small></div></div>
      <form class="edit">
        <label class="lbl">Nombre visible<input class="input name" maxlength="30"></label>
        <label class="lbl">Bio<input class="input bio" maxlength="160" placeholder="Ej: Team motor shunt ⚡"></label>
        <label class="lbl">Título<select class="input title"></select></label>
        <div class="lbl">Color<div class="accents"></div></div>
        <div class="lbl">Carta destacada<div class="fav"></div></div>
        <div class="row end"><button class="btn primary">Guardar perfil</button></div>
      </form>
    </div>
    <div class="card"><h3>Estadísticas</h3><div class="stats"></div></div>
    <div class="card"><h3>Logros</h3><div class="achs"></div></div>
    <div class="card"><h3>Ajustes</h3>
      <div class="lbl">Intensidad de estímulos</div>
      <div class="seg fx"><button data-v="zen">🧘 Zen</button><button data-v="normal">🙂 Normal</button><button data-v="max">🤯 Dopamina máxima</button></div>
      <label class="check"><input type="checkbox" class="snd"> Sonidos</label>
      <label class="check"><input type="checkbox" class="vib"> Vibración (celular)</label>
    </div>
  </section>`);

  // ---- cuenta / login
  const acc = $('.account', el);
  if (NET.online) {
    acc.append(h(`<div class="row"><span class="grow">Sesión iniciada como <b>${esc(NET.uname)}</b>. Tu progreso, monedas y cartas se guardan en el servidor.</span><button class="btn sm ghost">Cerrar sesión</button></div>`));
    $('button', acc).onclick = async () => { await NET.signOut(); toast('Sesión cerrada', '', '✓'); go('home'); };
  } else if (NET.sb) authForm(acc, p.auth);
  else acc.append(h('<p class="small muted">Modo local: sin servidor configurado. Tu progreso queda en este navegador y no hay ranking ni mercado. (El administrador debe completar <code>js/config.js</code>; ver README.)</p>'));

  // ---- foto
  const av = $('.av', el); av.append(avatarView(NET.avatar, NET.name, NET.accent, 84));
  $('input[type=file]', el).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 15e6) { toast('Imagen muy grande', 'Máximo 15 MB antes de comprimir', '!', 'bad'); return; }
    try { const blob = await squareImage(f, NET.online ? 256 : 128); await NET.uploadAvatar(blob); av.innerHTML = ''; av.append(avatarView(NET.avatar, NET.name, NET.accent, 84)); toast('¡Foto actualizada!', '', '📸', 'gold'); SFX.coin(); hud(true); }
    catch (err) { toast('No se pudo subir la foto', err.message, '!', 'bad'); }
  };

  // ---- edición
  $('.dname', el).textContent = NET.name;
  $('.name', el).value = NET.online ? (NET.profile?.display_name || '') : S.name;
  $('.bio', el).value = NET.bio || '';
  const titles = LEVEL_TITLES.filter((_, i) => i * 3 + 1 <= L.lv).concat(ACH.filter(a => S.ach[a.id]).map(a => a.t));
  $('.title', el).innerHTML = `<option value="">(automático: ${esc(titleFor(L.lv))})</option>` + titles.map(t => `<option ${t === NET.title ? 'selected' : ''}>${esc(t)}</option>`).join('');
  let accent = NET.accent;
  for (const c of ACCENTS) { const b = h(`<button type="button" class="swatch" style="background:${c}"></button>`); b.classList.toggle('active', c === accent); b.onclick = () => { accent = c; $$('.swatch', el).forEach(x => x.classList.remove('active')); b.classList.add('active'); }; $('.accents', el).append(b); }
  const fav = $('.fav', el);
  const drawFav = () => { fav.innerHTML = ''; if (NET.favorite && CARD[NET.favorite]) fav.append(cardView(NET.favorite, { small: true })); else fav.append(h('<small class="muted">Elige una desde tu colección (toca una carta → "Destacar en mi perfil").</small>')); };
  drawFav();
  $('.edit', el).onsubmit = async (e) => {
    e.preventDefault();
    try {
      await NET.updateProfile({ name: $('.name', el).value.trim(), bio: $('.bio', el).value.trim(), title: $('.title', el).value || null, accent });
      $('.dname', el).textContent = NET.name; toast('Perfil guardado', '', '✓', 'gold'); hud(true);
    } catch (err) { toast('No se pudo guardar', err.message, '!', 'bad'); }
  };

  // ---- estadísticas y logros
  const owned = Object.values(NET.cards).filter(q => q > 0).length;
  const stats = [['XP total', S.xp], ['Respuestas correctas', `${S.correct}/${S.answered}`], ['Mejor racha', S.bestStreak], ['Mejor nota', fmt(S.bestGrade || 0)], ['Simulacros', S.exams.length], ['Ejercicios de desarrollo', S.devDone], ['Guías resueltas', `${Object.values(S.guide).filter(x => x === 'ok').length}/26`], ['Colección', `${owned}/${CARDS.length}`], ['Récord sprint', S.sprintBest || 0]];
  $('.stats', el).innerHTML = stats.map(([k, v]) => `<div class="stat"><b>${esc(String(v))}</b><small>${k}</small></div>`).join('');
  $('.achs', el).innerHTML = ACH.map(a => `<div class="ach ${S.ach[a.id] ? 'got' : ''}"><b>${S.ach[a.id] ? '🏆' : '🔒'} ${esc(a.t)}</b><small>${esc(a.d)}</small></div>`).join('');

  // ---- ajustes
  $$('.fx button', el).forEach(b => { b.classList.toggle('active', b.dataset.v === S.settings.fx); b.onclick = () => { S.settings.fx = b.dataset.v; save(true); $$('.fx button', el).forEach(x => x.classList.toggle('active', x === b)); document.body.dataset.fx = S.settings.fx; if (b.dataset.v === 'max') { SFX.fanfare(); confetti(innerWidth / 2, innerHeight / 2, 80); } }; });
  $('.snd', el).checked = S.settings.sound; $('.snd', el).onchange = (e) => { S.settings.sound = e.target.checked; save(true); };
  $('.vib', el).checked = S.settings.vibrate; $('.vib', el).onchange = (e) => { S.settings.vibrate = e.target.checked; save(true); };
  root.append(el);
}

function authForm(acc, focus) {
  let mode = 'login';
  acc.append(h(`<div><b>Entra para competir en el ranking y usar el mercado</b><p class="small muted">Solo usuario y contraseña, sin correo. Cada cuenta parte con 300 monedas y un sobre gratis.</p>
    <div class="seg"><button data-m="login" class="active">Entrar</button><button data-m="signup">Crear cuenta</button></div>
    <form class="auth"><input class="input u" placeholder="Usuario (3–20: letras, números . _ -)" autocomplete="username" required>
    <input class="input p" type="password" placeholder="Contraseña (mínimo 6)" autocomplete="current-password" required>
    <input class="input p2" type="password" placeholder="Repite la contraseña" autocomplete="new-password" hidden>
    <p class="err small bad"></p><button class="btn primary go">Entrar</button></form></div>`));
  const f = $('form', acc);
  $$('.seg button', acc).forEach(b => b.onclick = () => { mode = b.dataset.m; $$('.seg button', acc).forEach(x => x.classList.toggle('active', x === b)); $('.p2', f).hidden = mode === 'login'; $('.p2', f).required = mode === 'signup'; $('.go', f).textContent = mode === 'login' ? 'Entrar' : 'Crear cuenta'; });
  f.onsubmit = async (e) => {
    e.preventDefault();
    const u = $('.u', f).value.trim(), pw = $('.p', f).value, err = $('.err', f);
    err.textContent = '';
    if (!/^[A-Za-z0-9_.-]{3,20}$/.test(u)) { err.textContent = 'El usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo.'; return; }
    if (pw.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
    if (mode === 'signup' && pw !== $('.p2', f).value) { err.textContent = 'Las contraseñas no coinciden.'; return; }
    const b = $('.go', f); b.disabled = true; b.textContent = 'Un momento…';
    try {
      if (mode === 'login') await NET.signIn(u, pw); else await NET.signUp(u, pw);
      SFX.fanfare(); confetti(innerWidth / 2, innerHeight / 2, 80);
      toast(mode === 'login' ? '¡Hola de nuevo!' : '¡Cuenta creada!', u, '✓', 'gold');
      NET.presence(); hud(true); go('profile');
    } catch (ex) { err.textContent = ex.message; b.disabled = false; b.textContent = mode === 'login' ? 'Entrar' : 'Crear cuenta'; }
  };
  if (focus) setTimeout(() => $('.u', f).focus(), 50);
}

// ---------------------------------------------------------------- ranking
export function renderRanking(root, p) {
  const order = p.by || 'xp';
  const el = h(`<section class="view ranking"><h2>Ranking</h2>
    <div class="chips"><button class="chip" data-b="xp">⚡ XP</button><button class="chip" data-b="grade">📝 Mejor nota</button><button class="chip" data-b="cards">🗂️ Colección</button><button class="chip" data-b="streak">🔥 Racha</button><button class="chip" data-b="days">📅 Días seguidos</button></div>
    <div class="board"><p class="muted">Cargando…</p></div></section>`);
  $$('[data-b]', el).forEach(b => { b.classList.toggle('active', b.dataset.b === order); b.onclick = () => go('ranking', { by: b.dataset.b }); });
  root.append(el);
  const board = $('.board', el);
  if (!NET.sb) { board.innerHTML = '<p class="muted">El ranking necesita el servidor (Supabase). Ver README.</p>'; return; }
  const load = async () => {
    let rows; try { await NET.flush(); rows = await NET.ranking(order); } catch (e) { board.innerHTML = `<p class="bad">${esc(e.message)}</p>`; return; }
    board.innerHTML = '';
    if (!rows.length) board.append(h('<p class="muted">Aún no hay jugadores. ¡Sé el primero!</p>'));
    const val = (r) => ({ xp: `${r.xp} XP`, grade: fmt(Number(r.best_grade)), cards: `${r.cards_unique}/${CARDS.length}`, streak: `${r.best_streak} 🔥`, days: `${r.day_streak} días` }[order]);
    rows.forEach((r, i) => {
      const row = h(`<button class="rank-row ${r.id === NET.user?.id ? 'me' : ''} ${i < 3 ? 'top' + (i + 1) : ''}" style="--ac:${esc(r.accent)}"><span class="pos">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="av"></span><span class="grow"><b></b><small class="muted"></small></span><span class="val">${esc(val(r))}</span></button>`);
      $('.av', row).append(avatarView(r.avatar_url, r.display_name || r.username, r.accent, 36));
      $('b', row).textContent = r.display_name || r.username;
      $('small', row).textContent = `Nv ${r.level} · ${r.title || titleFor(r.level)}`;
      row.onclick = () => go('profile', { id: r.id });
      board.append(row);
    });
  };
  load();
  const t = setInterval(() => { if (!document.hidden) load(); }, 15000);
  return { leave: () => clearInterval(t) };
}

async function publicProfile(root, id) {
  const el = h('<section class="view"><button class="btn ghost sm back">‹ Ranking</button><div class="pp"><p class="muted">Cargando…</p></div></section>');
  $('.back', el).onclick = () => go('ranking');
  root.append(el);
  let d; try { d = await NET.publicProfile(id); } catch (e) { $('.pp', el).innerHTML = `<p class="bad">${esc(e.message)}</p>`; return; }
  const pr = d.profile, pp = $('.pp', el); pp.innerHTML = '';
  if (!pr) { pp.append(h('<p class="muted">Jugador no encontrado.</p>')); return; }
  const c = h(`<div class="card me" style="--ac:${esc(pr.accent)}"><div class="row"><span class="av"></span><div class="grow"><h2></h2><small class="muted"></small><p class="bio"></p></div></div>
    <div class="stats"></div><div class="favbox"></div><div class="row end acts"></div></div>`);
  $('.av', c).append(avatarView(pr.avatar_url, pr.display_name || pr.username, pr.accent, 84));
  $('h2', c).textContent = pr.display_name || pr.username;
  $('small', c).textContent = `@${pr.username} · Nivel ${pr.level} · ${pr.title || titleFor(pr.level)}`;
  $('.bio', c).textContent = pr.bio || '';
  $('.stats', c).innerHTML = [['XP', pr.xp], ['Mejor nota', fmt(Number(pr.best_grade))], ['Colección', `${pr.cards_unique}/${CARDS.length}`], ['Mejor racha', pr.best_streak], ['Simulacros', pr.exams_taken]].map(([k, v]) => `<div class="stat"><b>${esc(String(v))}</b><small>${k}</small></div>`).join('');
  if (pr.favorite_card && CARD[pr.favorite_card]) { $('.favbox', c).append(h('<small class="muted">Carta destacada</small>')); $('.favbox', c).append(cardView(pr.favorite_card)); }
  if (NET.online && pr.id !== NET.user.id) { const b = h('<button class="btn primary">Proponer intercambio</button>'); b.onclick = () => go('cards', { tab: 'trades', to: pr.username }); $('.acts', c).append(b); }
  pp.append(c);
  const dups = CARDS.filter(x => (d.cards[x.id] || 0) > 1);
  if (dups.length) { const g = h('<div class="card"><h3>Sus repetidas (intercambiables)</h3><div class="col-grid"></div></div>'); dups.forEach(x => $('.col-grid', g).append(cardView(x.id, { small: true, qty: d.cards[x.id] }))); pp.append(g); }
}
