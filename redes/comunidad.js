// Redes Reels · pestaña Comunidad.
// Conecta Redes Reels con la misma cuenta de Supabase que Máquinas Rush (misma web, mismo origen):
// el login es el mismo, y aquí se ven el perfil, el ranking, la colección de cartas y los sobres.
// Lo que se gana estudiando Redes se envía con las mismas RPC del servidor (grant_study y submit_exam),
// así que respeta los mismos topes anti-trampa. Redes conserva su propio progreso local (niveles,
// stickers de reacción, XP del juego); la XP, las monedas y las cartas de la CUENTA viven en el servidor.
import { CARDS, CARD, RARITY, PACKS, cardsFor } from '../js/data/catalog.js';

const CFG = window.CERT_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n || 0).toLocaleString('es-CL');
const todayCL = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
const art = (c, small) => '../' + (small ? c.thumb : c.art);
const isUrl = (u) => typeof u === 'string' && /^https:\/\//.test(u);

const friendly = (e) => {
  const m = String(e?.message || e || '');
  if (/Invalid login/i.test(m)) return 'Usuario o contraseña incorrectos.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera un minuto.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'No hay conexión con el servidor.';
  return m || 'Ocurrió un error.';
};

const RC = {
  sb: null, user: null, profile: null, inv: {}, mode: 'loading', err: '',
  pending: {}, flushT: 0, sent: { xp: 0, coins: 0 }, rankOrder: 'xp', rank: null, tab: 'perfil', busy: false,

  get online() { return this.mode === 'online'; },

  async init() {
    if (!CFG.url || !CFG.key || !window.supabase?.createClient) { this.mode = 'off'; this.render(); return; }
    try {
      // Sin storageKey propio: así usa la misma sesión que Máquinas Rush (mismo origen).
      this.sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true } });
      const { data } = await this.sb.auth.getSession();
      await this.setUser(data.session?.user || null);
      this.sb.auth.onAuthStateChange((_e, s) => { if ((s?.user?.id || null) !== (this.user?.id || null)) this.setUser(s?.user || null); });
    } catch (e) { console.error(e); this.mode = 'off'; this.err = friendly(e); this.render(); }
    addEventListener('pagehide', () => this.flush());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.flush(); });
  },

  async setUser(u) {
    this.user = u; this.profile = null; this.inv = {};
    this.mode = u ? 'online' : 'guest';
    if (u) await this.refresh(); else this.render();
    this.hud();
  },

  async refresh() {
    if (!this.online) return;
    const [p, c] = await Promise.all([
      this.sb.from('profiles').select('*').eq('id', this.user.id).maybeSingle(),
      this.sb.from('user_cards').select('card_id,qty').eq('user_id', this.user.id),
    ]);
    if (p.data) this.profile = p.data;
    if (c.data) this.inv = Object.fromEntries(c.data.filter((x) => x.qty > 0).map((x) => [x.card_id, x.qty]));
    this.render(); this.hud();
  },

  async rpc(fn, args = {}) {
    const { data, error } = await this.sb.rpc(fn, args);
    if (error) throw new Error(friendly(error));
    return data;
  },

  // ---------------------------------------------------------------- recompensas desde Redes
  // kind: 'mcq' (alternativas, V/F, speed, jefes) o 'dev' (desarrollo autocorregido).
  study(kind, ok, streak = 0) {
    if (!this.online) return;
    const p = this.pending[kind] || (this.pending[kind] = { c: 0, a: 0, s: 0 });
    p.a++; if (ok) p.c++; p.s = Math.max(p.s, streak || 0);
    if (p.a >= 25) this.flush();
    else { clearTimeout(this.flushT); this.flushT = setTimeout(() => this.flush(), 4000); }
  },
  async flush() {
    if (!this.online) return;
    clearTimeout(this.flushT);
    const batch = this.pending; this.pending = {};
    const lvBefore = this.profile?.level || 0;
    let any = false;
    for (const [kind, p] of Object.entries(batch)) {
      if (!p.a) continue;
      try {
        const r = await this.rpc('grant_study', { p_kind: kind, p_correct: p.c, p_answered: p.a, p_best_streak: p.s });
        this.sent.xp += r?.xp || 0; this.sent.coins += r?.coins || 0; any = true;
      } catch (e) { console.warn('grant_study', e); }
    }
    if (!any) return;
    await this.refresh();
    if (this.profile && lvBefore && this.profile.level > lvBefore && window.banner) {
      window.banner('🌐', 'Tu cuenta subió a nivel ' + this.profile.level, '+' + 100 * (this.profile.level - lvBefore) + ' monedas de cuenta para sobres');
    }
  },
  // Simulacro de 70 min: se envía como "desarrollo" (no toca la mejor nota de alternativas de Máquinas).
  async exam(points, seconds) {
    if (!this.online) return null;
    await this.flush();
    try {
      const total = 20, correct = Math.max(0, Math.min(total, Math.round(points / 5)));
      const r = await this.rpc('submit_exam', { p_mode: 'desarrollo', p_correct: correct, p_total: total, p_seconds: Math.max(0, Math.round(seconds || 0)) });
      this.sent.xp += r?.xp || 0; this.sent.coins += r?.coins || 0;
      await this.refresh();
      if (window.banner) window.banner('🌐', 'Simulacro enviado a tu cuenta', '+' + (r?.xp || 0) + ' XP · +' + (r?.coins || 0) + ' monedas');
      return r;
    } catch (e) { console.warn('submit_exam', e); return null; }
  },

  // ---------------------------------------------------------------- acciones
  async signIn(user, pass) {
    const email = user.trim().toLowerCase() + '@' + (CFG.emailDomain || 'certamen2.app');
    const r = await this.sb.auth.signInWithPassword({ email, password: pass });
    if (r.error) throw new Error(friendly(r.error));
    await this.setUser(r.data.user);
  },
  async signOut() { await this.flush(); await this.sb.auth.signOut(); await this.setUser(null); },
  async claimDaily() { const r = await this.rpc('claim_daily'); await this.refresh(); return r; },
  async openPack(id, useFree) { const r = await this.rpc('open_pack', { p_pack: id, p_use_free: !!useFree }); await this.refresh(); return r.cards; },
  async ranking(order) {
    const col = { xp: 'xp', cards: 'cards_unique', streak: 'best_streak', days: 'day_streak', grade: 'best_grade' }[order] || 'xp';
    const { data, error } = await this.sb.from('profiles')
      .select('id,username,display_name,avatar_url,accent,title,level,xp,best_grade,cards_unique,best_streak,day_streak,indecente')
      .order(col, { ascending: false }).order('xp', { ascending: false }).limit(100);
    if (error) throw new Error(friendly(error));
    return data;
  },

  // ---------------------------------------------------------------- interfaz
  hud() {
    const chip = $('#h-acc'); if (!chip) return;
    chip.onclick = () => { if (typeof showPane === 'function') showPane('com'); };
    if (this.online && this.profile) { chip.hidden = false; chip.innerHTML = '🌐 <b>NV ' + this.profile.level + '</b> · ' + fmt(this.profile.coins) + ' 💰'; }
    else chip.hidden = true;
  },
  avatar(p, size = 44) {
    const name = p.display_name || p.username || '?';
    const ini = esc(String(name).trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?');
    const ac = /^#[0-9a-fA-F]{6}$/.test(p.accent || '') ? p.accent : '#ff6b4a';
    return '<span class="cm-av" style="--ac:' + ac + ';width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * .42) + 'px">'
      + (isUrl(p.avatar_url) ? '<img src="' + esc(p.avatar_url) + '" alt="" onerror="this.remove()">' : '') + '<i>' + ini + '</i></span>';
  },
  cardHTML(c, qty, k) {
    const r = RARITY[c.rarity]; const blur = c.spicy ? ' cm-blur' : '';
    return '<button type="button" class="cm-card' + blur + '" data-card="' + c.id + '" style="--rc:' + r.color + '"' + (k != null ? ' data-k="' + k + '"' : '') + '>'
      + '<img loading="lazy" src="' + art(c, true) + '" alt=""><span class="cm-rar">' + esc(r.name) + '</span>'
      + (qty > 1 ? '<span class="cm-q">×' + qty + '</span>' : '') + '<span class="cm-nm">' + esc(c.name) + '</span></button>';
  },

  render() {
    const root = $('#p-com'); if (!root) return;
    if (this.mode === 'loading') { root.innerHTML = '<div class="sec"><h2>Comunidad</h2><p class="note">Conectando con el servidor…</p></div>'; return; }
    if (this.mode === 'off') {
      root.innerHTML = '<div class="sec"><h2>Comunidad</h2><p class="note">No se pudo conectar con el servidor de cuentas' + (this.err ? ' (' + esc(this.err) + ')' : '') + '. Redes Reels sigue funcionando normal; tu progreso se guarda en este navegador.</p></div>';
      return;
    }
    if (this.mode === 'guest') return this.renderLogin(root);
    const p = this.profile;
    if (!p) { root.innerHTML = '<div class="sec"><h2>Comunidad</h2><p class="note">Cargando tu perfil…</p></div>'; return; }
    const tabs = [['perfil', 'Perfil'], ['ranking', 'Ranking'], ['coleccion', 'Colección'], ['sobres', 'Sobres']];
    root.innerHTML = '<div class="sec"><h2>Comunidad <small>misma cuenta que Máquinas Rush</small></h2>'
      + '<div class="cm-me">' + this.avatar(p, 56) + '<div style="min-width:0"><b class="cm-name">' + esc(p.display_name || p.username) + ' ' + (p.indecente ? '😈' : '😇') + '</b>'
      + '<span class="note">@' + esc(p.username) + (p.title ? ' · ' + esc(p.title) : '') + '</span>'
      + '<div class="chips"><span class="chip l">NV <b>' + p.level + '</b></span><span class="chip">XP <b>' + fmt(p.xp) + '</b></span><span class="chip">💰 <b>' + fmt(p.coins) + '</b></span><span class="chip t">🎁 <b>' + p.free_packs + '</b></span></div></div></div>'
      + '<div class="filt cm-tabs">' + tabs.map(([k, n]) => '<button type="button" data-t="' + k + '" aria-pressed="' + (this.tab === k) + '">' + n + '</button>').join('') + '</div>'
      + '<div id="cm-body"></div></div>';
    root.querySelectorAll('.cm-tabs button').forEach((b) => b.onclick = () => { this.tab = b.dataset.t; this.render(); });
    const body = $('#cm-body', root);
    ({ perfil: () => this.renderPerfil(body), ranking: () => this.renderRanking(body), coleccion: () => this.renderCol(body), sobres: () => this.renderPacks(body) })[this.tab]();
  },

  renderLogin(root) {
    root.innerHTML = '<div class="sec"><h2>Comunidad</h2>'
      + '<p class="note">Entra con tu cuenta de <b>Máquinas Rush</b>. Es la misma cuenta: lo que estudies aquí suma XP y monedas al ranking compartido, y las cartas y los sobres son los mismos.</p>'
      + '<form class="cm-form" id="cm-login" autocomplete="on"><label>Usuario<input id="cm-u" name="username" autocomplete="username" required minlength="3" maxlength="20"></label>'
      + '<label>Contraseña<input id="cm-p" name="password" type="password" autocomplete="current-password" required></label>'
      + '<p class="note cm-err" id="cm-err" hidden></p><button class="btn" type="submit" style="--c:var(--eth)">Entrar</button></form>'
      + '<p class="note">¿No tienes cuenta? <a class="cm-link" href="../#profile">Créala en Máquinas Rush</a> (ahí eliges el tipo de cuenta) y vuelve. Sin cuenta, Redes Reels funciona igual y guarda tu progreso en este navegador.</p></div>';
    $('#cm-login', root).onsubmit = async (e) => {
      e.preventDefault(); const er = $('#cm-err', root); er.hidden = true;
      const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Entrando…';
      try { await this.signIn($('#cm-u', root).value, $('#cm-p', root).value); }
      catch (x) { er.textContent = x.message; er.hidden = false; btn.disabled = false; btn.textContent = 'Entrar'; }
    };
  },

  renderPerfil(body) {
    const p = this.profile; const own = Object.keys(this.inv).length; const total = cardsFor(p.indecente).length;
    const daily = p.last_daily !== todayCL();
    body.innerHTML = '<div class="statgrid"><div class="stat"><b>' + fmt(p.correct_total) + '</b><span>correctas</span></div><div class="stat"><b>' + own + '/' + total + '</b><span>cartas</span></div><div class="stat"><b>' + p.day_streak + '</b><span>días seguidos</span></div></div>'
      + '<p class="note">Desde que abriste Redes en esta sesión, enviaste <b>+' + fmt(this.sent.xp) + ' XP</b> y <b>+' + fmt(this.sent.coins) + ' monedas</b> a tu cuenta. Cada respuesta de alternativas vale como pregunta de práctica; el desarrollo que marcas como «La clavé» vale como desarrollo; los simulacros de 70 min suman al guardar la nota.</p>'
      + (daily ? '<button class="bigbtn" type="button" id="cm-daily" style="--c:var(--xp);border-color:var(--xp)"><span class="ic">🎁</span><div><b>Reclamar premio diario</b><span>Monedas según tu racha + 1 sobre gratis. Es el mismo premio de Máquinas Rush.</span></div></button>' : '<p class="note">✓ Premio diario ya reclamado hoy.</p>')
      + '<div class="row"><a class="btn ghost cm-a" href="../#profile">Editar perfil en Máquinas Rush</a><button class="btn ghost" type="button" id="cm-out">Cerrar sesión</button></div>';
    const d = $('#cm-daily', body);
    if (d) d.onclick = async () => { d.disabled = true; try { const r = await this.claimDaily(); if (r?.ok && window.banner) window.banner('🎁', 'Premio diario', '+' + r.coins + ' monedas · racha ' + r.streak + ' · +1 sobre gratis'); } catch (e) { alert0(e.message); d.disabled = false; } };
    $('#cm-out', body).onclick = () => this.signOut();
  },

  async renderRanking(body) {
    const ords = [['xp', 'XP'], ['cards', 'Colección'], ['streak', 'Racha'], ['days', 'Días']];
    body.innerHTML = '<div class="seg cm-ord">' + ords.map(([k, n]) => '<button type="button" data-o="' + k + '" aria-pressed="' + (this.rankOrder === k) + '">' + n + '</button>').join('') + '</div><div id="cm-rk"><p class="note">Cargando ranking…</p></div>';
    body.querySelectorAll('.cm-ord button').forEach((b) => b.onclick = () => { this.rankOrder = b.dataset.o; this.renderRanking(body); });
    const box = $('#cm-rk', body);
    try {
      const rows = await this.ranking(this.rankOrder);
      if (!body.isConnected) return;
      const val = (r) => ({ xp: fmt(r.xp) + ' XP', cards: r.cards_unique + ' cartas', streak: 'combo ' + r.best_streak, days: r.day_streak + ' días' })[this.rankOrder];
      box.innerHTML = rows.length ? '<ol class="cm-rank">' + rows.map((r, i) => '<li class="' + (r.id === this.user.id ? 'me' : '') + '"><span class="cm-pos">' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) + '</span>' + this.avatar(r, 36)
        + '<span class="cm-who"><b>' + esc(r.display_name || r.username) + ' ' + (r.indecente ? '😈' : '😇') + '</b><small>@' + esc(r.username) + ' · NV ' + r.level + '</small></span><span class="cm-val">' + val(r) + '</span></li>').join('') + '</ol>'
        : '<p class="note">Todavía no hay jugadores.</p>';
    } catch (e) { box.innerHTML = '<p class="note">' + esc(e.message) + '</p>'; }
  },

  renderCol(body) {
    const pool = cardsFor(this.profile.indecente);
    const own = pool.filter((c) => this.inv[c.id]);
    body.innerHTML = '<p class="note">' + own.length + ' de ' + pool.length + ' cartas. Son las mismas de Máquinas Rush: la venta, el mercado y los intercambios se hacen allá.</p>'
      + (own.length ? '<div class="cm-grid">' + own.map((c) => this.cardHTML(c, this.inv[c.id])).join('') + '</div>' : '<p class="note">Aún no tienes cartas. Abre un sobre en la pestaña Sobres.</p>')
      + '<a class="btn ghost cm-a" href="../#cards" style="margin-top:10px">Ir a Cartas y Mercado en Máquinas Rush</a>';
    body.querySelectorAll('.cm-card').forEach((b) => b.onclick = () => this.showCard(CARD[b.dataset.card]));
  },
  showCard(c) {
    if (!c || typeof openModal !== 'function') return;
    const r = RARITY[c.rarity]; const blur = c.spicy && !this.profile?.indecente;
    const m = openModal('<h3>' + esc(c.name) + '</h3><span class="rbadge" style="--rc2:' + r.color + '">' + esc(r.name) + '</span><img class="big' + (blur ? ' cm-blur-img' : '') + '" src="' + art(c) + '" alt=""><p class="note">' + esc(c.set) + ' · tienes ' + (this.inv[c.id] || 0) + '</p><button class="btn" type="button" id="cm-x">Cerrar</button>', r.color);
    m.querySelector('#cm-x').onclick = closeModal;
  },

  renderPacks(body) {
    const p = this.profile;
    body.innerHTML = '<p class="note">Sobres de la cuenta compartida: se pagan con las monedas de la cuenta (💰 ' + fmt(p.coins) + '), no con las 🪙 de Redes. El azar ocurre en el servidor. Tienes ' + p.free_packs + ' sobre(s) gratis.</p><div class="packs">'
      + PACKS.map((k) => {
        const free = k.freeOnly; const can = free ? p.free_packs > 0 : p.coins >= k.price;
        return '<div class="pack" style="--pc:' + (free ? 'var(--xp)' : k.id === 'legendario' ? 'var(--rl)' : k.id === 'grande' ? 'var(--re)' : 'var(--rr)') + '"><div class="art">' + esc(k.name.replace('Sobre ', '').toUpperCase()) + '</div><div><b>' + esc(k.name) + '</b><span class="note">' + esc(k.desc) + '</span><div class="odds">' + k.n + ' cartas</div></div>'
          + '<button class="buy" type="button" data-p="' + k.id + '"' + (can ? '' : ' disabled') + '>' + (free ? 'Gratis' : fmt(k.price) + ' 💰') + '</button></div>';
      }).join('') + '</div>'
      + (p.free_packs > 0 ? '<p class="note">Con un sobre gratis también puedes abrir el sobre básico sin pagar.</p><button class="btn ghost" type="button" id="cm-freebasic">Abrir sobre básico gratis</button>' : '');
    const open = async (id, useFree, btn) => {
      if (this.busy) return; this.busy = true; if (btn) btn.disabled = true;
      try { const got = await this.openPack(id, useFree); this.reveal(got); }
      catch (e) { alert0(e.message); }
      finally { this.busy = false; }
    };
    body.querySelectorAll('.buy').forEach((b) => b.onclick = () => open(b.dataset.p, PACKS.find((k) => k.id === b.dataset.p).freeOnly, b));
    const fb = $('#cm-freebasic', body); if (fb) fb.onclick = () => open('basico', true, fb);
  },
  reveal(got) {
    if (typeof openModal !== 'function') return;
    const cards = got.map((g) => ({ c: CARD[g.card], g })).filter((x) => x.c);
    const m = openModal('<h3 style="text-align:center">Sobre abierto</h3><p class="note" style="text-align:center">Toca cada carta para darla vuelta</p><div class="reveal">'
      + cards.map(({ c, g }, k) => {
        const r = RARITY[c.rarity]; const blur = c.spicy && !this.profile?.indecente;
        return '<div class="rcard cm-rc" data-k="' + k + '" style="--rc2:' + r.color + '"><div class="in"><div class="bk">?</div><div class="fc"><img src="' + art(c, true) + '" alt=""' + (blur ? ' class="cm-blur-img"' : '') + '><div>' + esc(c.name) + ' · ' + esc(r.name) + '</div></div></div><div class="dup">' + (g.new ? '¡NUEVA!' : 'repetida ×' + g.qty) + '</div></div>';
      }).join('') + '</div><button class="btn" type="button" id="cm-ok">Listo</button>', 'var(--xp)');
    const best = Math.max(...cards.map(({ c }) => RARITY[c.rarity].rank));
    m.querySelectorAll('.cm-rc').forEach((el, i) => {
      const flip = () => { if (el.classList.contains('open')) return; el.classList.add('open'); const r = RARITY[cards[i].c.rarity].rank; if (typeof rarFx === 'function') rarFx(r >= 5 ? 'L' : r === 4 ? 'L' : r === 3 ? 'E' : r === 2 ? 'R' : 'C'); };
      el.onclick = flip; setTimeout(flip, 500 + i * 450);
    });
    if (best >= 4 && typeof confetti === 'function') setTimeout(() => confetti(200), 600 + cards.length * 450);
    m.querySelector('#cm-ok').onclick = () => { closeModal(); this.render(); };
  },
};

// Aviso simple dentro de la página (alert() no siempre se muestra).
function alert0(msg) { if (window.banner) window.banner('⚠️', 'No se pudo', msg); else console.warn(msg); }

window.RC = RC;
RC.init();
