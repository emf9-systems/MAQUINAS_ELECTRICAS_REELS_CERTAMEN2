// Conexión con Supabase (login, perfil, economía, mercado, ranking) con respaldo local.
// - Sin config.js o sin conexión: modo "local" (todo en este navegador, sin mercado ni ranking).
// - Con Supabase pero sin sesión: modo "guest" (igual que local, puede crear cuenta).
// - Con sesión: modo "online". Monedas y cartas viven en el servidor; aquí solo hay una copia.
import { S, load, replace, save, GUEST_KEY, onSave } from './state.js';
import { PACK, CARD, MARKET_MAX, BOOST } from './data/catalog.js';
import { rollPack, DAILY_BONUS, STUDY, LEVEL_UP_COINS, EXAM_COINS, MISSIONS_PER_DAY, SELL_PRICE, addBoost, boostMult } from './economy.js';
import { gradeCL, levelFor, todayCL } from './util.js';

const CFG = window.CERT_CONFIG || {};
const listeners = new Set();
const emit = () => listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } });

const friendly = (e) => {
  const m = String(e?.message || e || '');
  if (/Invalid login/i.test(m)) return 'Usuario o contraseña incorrectos.';
  if (/already registered|already exists/i.test(m)) return 'Ese usuario ya existe. Elige otro.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera un minuto.';
  if (/signups? (are|is) disabled|signup_disabled|provider_disabled/i.test(m + (e?.code || ''))) return 'El registro está apagado en Supabase: hay que encender el proveedor Email y permitir registros.';
  if (/database error/i.test(m)) return 'El servidor no pudo crear el perfil. Revisa que schema.sql se haya ejecutado completo.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'No hay conexión con el servidor.';
  return m || 'Ocurrió un error.';
};

export const NET = {
  sb: null, user: null, profile: null, inv: {}, mode: 'loading', uname: '',
  onChange(fn) { listeners.add(fn); },
  friendly,
  email: (u) => u.toLowerCase() + '@' + (CFG.emailDomain || 'certamen2.app'),
  get online() { return this.mode === 'online'; },

  async init() {
    load(GUEST_KEY);
    onSave(() => this.schedulePush());
    if (!CFG.url || !CFG.key || !window.supabase?.createClient) { this.mode = 'local'; emit(); return; }
    try {
      this.sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true } });
      const { data } = await this.sb.auth.getSession();
      await this.setUser(data.session?.user || null);
      this.sb.auth.onAuthStateChange((_e, s) => { if (!this.switching && (s?.user?.id || null) !== (this.user?.id || null)) this.setUser(s?.user || null); });
    } catch (e) { console.error(e); this.mode = 'local'; emit(); }
  },

  async setUser(u, fresh = false) {
    this.switching = true; this.user = u; this.uname = u?.user_metadata?.username || '';
    if (u) {
      this.mode = 'online';
      const key = GUEST_KEY + ':' + u.id;
      let local = null; try { const raw = localStorage.getItem(key); local = raw ? JSON.parse(raw) : null; } catch (e) { }
      let remote = null;
      if (!fresh) try { const { data } = await this.sb.from('progress').select('save').eq('id', u.id).maybeSingle(); remote = data?.save || null; } catch (e) { }
      const pick = remote && (!local || (remote.answered || 0) >= (local.answered || 0)) ? remote : (local || {});
      replace(pick, key);
      await this.refresh();
      if (this.profile) S.xp = Math.max(S.xp, Number(this.profile.xp)); // el servidor manda en el ranking
    } else {
      this.mode = this.sb ? 'guest' : 'local'; this.profile = null; this.inv = {};
      load(GUEST_KEY);
    }
    this.switching = false; emit();
  },

  async signIn(user, pass) {
    const r = await this.sb.auth.signInWithPassword({ email: this.email(user), password: pass });
    if (r.error) throw new Error(friendly(r.error));
    await this.setUser(r.data.user);
  },
  async signUp(user, pass, indecente = false) {
    const r = await this.sb.auth.signUp({ email: this.email(user), password: pass, options: { data: { username: user, indecente: !!indecente } } });
    if (r.error) throw new Error(friendly(r.error));
    if (!r.data.session) throw new Error('La cuenta quedó esperando confirmación por correo: en Supabase hay que desactivar "Confirm email".');
    await this.setUser(r.data.user, true);
  },
  async signOut() { await this.pushNow(); await this.sb.auth.signOut(); await this.setUser(null); },

  // ---------------------------------------------------------------- lectura del servidor
  async refresh() {
    if (!this.online) return;
    const [p, c] = await Promise.all([
      this.sb.from('profiles').select('*').eq('id', this.user.id).maybeSingle(),
      this.sb.from('user_cards').select('card_id,qty').eq('user_id', this.user.id),
    ]);
    if (p.data) this.profile = p.data;
    if (c.data) this.inv = Object.fromEntries(c.data.filter(x => x.qty > 0).map(x => [x.card_id, x.qty]));
    emit();
  },
  async rpc(fn, args = {}) {
    const { data, error } = await this.sb.rpc(fn, args);
    if (error) throw new Error(friendly(error));
    return data;
  },

  // ---------------------------------------------------------------- billetera (igual para ambos modos)
  get coins() { return this.online ? (this.profile?.coins ?? 0) : S.coins; },
  get freePacks() { return this.online ? (this.profile?.free_packs ?? 0) : S.freePacks; },
  get pity() { return this.online ? (this.profile?.pity ?? 0) : S.pity; },
  get cards() { return this.online ? this.inv : S.cards; },
  get dayStreak() { return this.online ? (this.profile?.day_streak ?? 0) : S.dayStreak; },
  get dailyReady() { const d = todayCL(); return this.online ? this.profile?.last_daily !== d : S.lastDaily !== d; },
  get name() { return this.online ? (this.profile?.display_name || this.uname) : (S.name || 'Invitado'); },
  get avatar() { return this.online ? this.profile?.avatar_url : S.avatar; },
  get accent() { return this.online ? (this.profile?.accent || '#ff6b4a') : S.accent; },
  get title() { return this.online ? this.profile?.title : S.title; },
  get favorite() { return this.online ? this.profile?.favorite_card : S.favorite; },
  get bio() { return this.online ? this.profile?.bio : S.bio; },
  get indecente() { return this.online ? !!this.profile?.indecente : !!S.indecente; },
  // Pasarse al lado indecente: no hay vuelta atrás (el servidor no tiene función para deshacerlo).
  async becomeIndecente() {
    if (this.online) { this.profile = await this.rpc('become_indecente'); emit(); return; }
    S.indecente = true; S.decided = true; save(true); emit();
  },

  // Boosts de la tienda: hora de vencimiento (ms) y multiplicador actual de XP y monedas.
  get boostUntil() {
    if (!this.online) return { xp: S.boostXp || 0, coins: S.boostCoins || 0 };
    const t = (v) => (v ? Date.parse(v) : 0);
    return { xp: t(this.profile?.boost_xp_until), coins: t(this.profile?.boost_coins_until) };
  },
  get boostToday() { return (this.online ? this.profile?.last_boost : S.lastBoost) === todayCL(); },
  get mult() { const u = this.boostUntil; return { xp: boostMult(u.xp), coins: boostMult(u.coins) }; },
  async buyBoost(id, card = null) {
    const b = BOOST[id];
    if (this.online) {
      await this.flush();   // lo ya respondido se paga con el multiplicador de antes
      this.profile = await this.rpc('buy_boost', { p_item: id, p_card: card });
      await this.refresh(); return;
    }
    if (this.boostToday) throw new Error('Ya usaste tu boost de hoy. Vuelve mañana.');
    const until = addBoost(this.boostUntil, id);
    if (b.rarity) {
      if (CARD[card]?.rarity !== b.rarity) throw new Error('Ese boost pide una carta ' + b.rarity + '.');
      if ((S.cards[card] || 0) < 1) throw new Error('No tienes esa carta.');
      S.cards[card]--; if (!S.cards[card]) { delete S.cards[card]; if (S.favorite === card) S.favorite = null; }
    } else {
      if (S.coins < b.price) throw new Error('Monedas insuficientes.');
      S.coins -= b.price;
    }
    S.boostXp = until.xp || 0; S.boostCoins = until.coins || 0; S.lastBoost = todayCL(); save(true); emit();
  },

  addLocalCoins(n) { S.coins += n; save(); },
  localLevelBonus(oldXp) { const up = levelFor(S.xp) - levelFor(oldXp); if (up > 0 && !this.online) S.coins += LEVEL_UP_COINS * up; return up; },

  async claimDaily() {
    if (this.online) { const r = await this.rpc('claim_daily'); await this.refresh(); return r; }
    const d = todayCL();
    if (S.lastDaily === d) return { ok: false, streak: S.dayStreak };
    const y = new Date(Date.now() - 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
    S.dayStreak = S.lastDaily === y ? S.dayStreak + 1 : 1; S.lastDaily = d;
    const bonus = DAILY_BONUS(S.dayStreak); S.coins += bonus; S.freePacks = Math.min(S.freePacks + 1, 5); save(true); emit();
    return { ok: true, streak: S.dayStreak, coins: bonus, free_packs: 1 };
  },

  async claimMission(coins) {
    if (this.online) { await this.rpc('claim_mission', { p_coins: coins }); await this.refresh(); return; }
    S.coins += coins; save(true); emit();
  },

  async openPack(packId, useFree = false) {
    const pk = PACK[packId];
    if (this.online) {
      const r = await this.rpc('open_pack', { p_pack: packId, p_use_free: useFree });
      await this.refresh();
      return r.cards.map(c => ({ card: c.card, rarity: c.rarity, qty: c.qty, isNew: c.new }));
    }
    if (pk.freeOnly || useFree) { if (S.freePacks < 1) throw new Error('No tienes sobres gratis.'); S.freePacks--; }
    else { if (S.coins < pk.price) throw new Error('Monedas insuficientes.'); S.coins -= pk.price; }
    const r = rollPack(packId, S.pity, Math.random, S.indecente);
    S.pity = r.pity;
    const out = r.cards.map(c => { S.cards[c.card] = (S.cards[c.card] || 0) + 1; return { ...c, qty: S.cards[c.card], isNew: S.cards[c.card] === 1 }; });
    save(true); emit();
    return out;
  },

  async sellToSystem(card, qty) {
    if (this.online) { const r = await this.rpc('sell_to_system', { p_card: card, p_qty: qty }); await this.refresh(); return r.earned; }
    if ((S.cards[card] || 0) - qty < 1) throw new Error('Solo puedes vender repetidas (siempre te queda 1).');
    S.cards[card] -= qty; const earned = SELL_PRICE(card) * qty; S.coins += earned; save(true); emit();
    return earned;
  },

  // Recompensas de estudio: se juntan y se envían en lotes al servidor.
  pending: {},
  reward(kind, ok, bestStreak = 0) {
    const m = this.mult, st = { xp: STUDY[kind].xp * m.xp, coins: STUDY[kind].coins * m.coins };
    const oldXp = S.xp;
    S.xp += ok ? st.xp : 2; S.answered++; if (ok) S.correct++;
    let coins = ok ? st.coins : 0;
    if (!this.online) { S.coins += coins; }
    const up = this.localLevelBonus(oldXp);
    if (this.online) {
      const p = this.pending[kind] || (this.pending[kind] = { c: 0, a: 0, s: 0 });
      p.a++; if (ok) p.c++; p.s = Math.max(p.s, bestStreak);
      if (this.profile && ok) this.profile.coins += coins;           // optimista; luego se corrige
      if (p.a >= 25) this.flush(); else { clearTimeout(this.flushT); this.flushT = setTimeout(() => this.flush(), 4000); }
    }
    save(); emit();
    return { xp: ok ? st.xp : 2, coins, levelUp: up > 0 || levelFor(S.xp) > levelFor(oldXp) };
  },
  async flush() {
    if (!this.online) return;
    clearTimeout(this.flushT);
    const batch = this.pending; this.pending = {};
    for (const [kind, p] of Object.entries(batch)) {
      if (!p.a) continue;
      try { await this.rpc('grant_study', { p_kind: kind, p_correct: p.c, p_answered: p.a, p_best_streak: p.s }); }
      catch (e) { console.warn('grant_study', e); }
    }
    await this.refresh();
  },

  async submitExam(mode, correct, total, seconds) {
    const grade = gradeCL(correct, total);
    S.exams.unshift({ mode, correct, total, seconds, grade, at: Date.now() }); S.exams = S.exams.slice(0, 30);
    if (mode === 'alternativas') S.bestGrade = Math.max(S.bestGrade, grade);
    if (this.online) {
      await this.flush();
      const r = await this.rpc('submit_exam', { p_mode: mode, p_correct: correct, p_total: total, p_seconds: seconds });
      S.xp += r.xp; save(true); await this.refresh();
      return r;
    }
    const last = S.exams.slice(1).find(e => e.coins > 0);
    const m = this.mult;
    const coins = seconds >= total * 8 && (!last || Date.now() - last.at > 180e3) ? EXAM_COINS(grade) * m.coins : 0;
    S.exams[0].coins = coins;
    const oldXp = S.xp; S.xp += correct * 15 * m.xp; S.coins += coins; this.localLevelBonus(oldXp);
    save(true); emit();
    return { grade, coins, xp: correct * 15 * m.xp };
  },

  // ---------------------------------------------------------------- perfil
  async updateProfile(p) {
    if (this.online) {
      const r = await this.rpc('update_profile', {
        p_display_name: p.name ?? this.profile.display_name, p_bio: p.bio ?? this.profile.bio, p_accent: p.accent ?? this.profile.accent,
        p_title: p.title ?? this.profile.title, p_favorite_card: p.favorite === undefined ? this.profile.favorite_card : p.favorite,
        p_avatar_url: p.avatar === undefined ? this.profile.avatar_url : p.avatar,
      });
      this.profile = r; emit(); return;
    }
    for (const k of ['name', 'bio', 'accent', 'title', 'favorite', 'avatar']) if (p[k] !== undefined) S[k] = p[k];
    save(true); emit();
  },
  // Sube la foto (ya recortada y comprimida) al bucket "avatars" en la carpeta del usuario.
  async uploadAvatar(blob) {
    if (!this.online) {
      const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
      await this.updateProfile({ avatar: url }); return url;
    }
    const path = `${this.user.id}/avatar-${Date.now()}.webp`;
    const up = await this.sb.storage.from('avatars').upload(path, blob, { contentType: blob.type || 'image/webp', upsert: true });
    if (up.error) throw new Error(friendly(up.error));
    const { data } = this.sb.storage.from('avatars').getPublicUrl(path);
    const old = this.profile?.avatar_url;
    await this.updateProfile({ avatar: data.publicUrl });
    // borrar la foto anterior para no acumular archivos
    const m = old && old.match(/\/avatars\/(.+)$/); if (m) this.sb.storage.from('avatars').remove([m[1]]).catch(() => { });
    return data.publicUrl;
  },

  // ---------------------------------------------------------------- ranking y perfiles públicos
  async ranking(order = 'xp') {
    if (!this.sb) return null;
    const col = { xp: 'xp', grade: 'best_grade', cards: 'cards_unique', streak: 'best_streak', days: 'day_streak' }[order] || 'xp';
    const { data, error } = await this.sb.from('profiles')
      .select('id,username,display_name,avatar_url,accent,title,level,xp,best_grade,cards_unique,best_streak,day_streak,favorite_card,indecente')
      .order(col, { ascending: false }).order('xp', { ascending: false }).limit(100);
    if (error) throw new Error(friendly(error));
    return data;
  },
  async publicProfile(id) {
    const [p, c] = await Promise.all([
      this.sb.from('profiles').select('*').eq('id', id).maybeSingle(),
      this.sb.from('user_cards').select('card_id,qty').eq('user_id', id).gt('qty', 0),
    ]);
    if (p.error) throw new Error(friendly(p.error));
    return { profile: p.data, cards: Object.fromEntries((c.data || []).map(x => [x.card_id, x.qty])) };
  },
  async findUser(username) {
    const { data } = await this.sb.from('profiles').select('id,username,display_name,avatar_url,accent,level,indecente').ilike('username', username.trim().replace(/[%_\\]/g, '\\$&')).limit(1).maybeSingle();
    return data;
  },

  // ---------------------------------------------------------------- mercado
  needOnline() { if (!this.online) throw new Error('El mercado necesita una cuenta. Entra o crea una desde tu perfil.'); },
  async listings({ rarity = '', card = '', mine = false } = {}) {
    this.needOnline();
    let q = this.sb.from('market_listings').select('id,seller,card_id,price,created_at,profiles!market_listings_seller_fkey(username,display_name,avatar_url,accent)').eq('status', 'open');
    if (mine) q = q.eq('seller', this.user.id); else q = q.neq('seller', this.user.id);
    if (card) q = q.eq('card_id', card);
    const { data, error } = await q.order('price', { ascending: true }).limit(200);
    if (error) throw new Error(friendly(error));
    return (data || []).filter(l => CARD[l.card_id] && (!rarity || CARD[l.card_id].rarity === rarity) && (this.indecente || !CARD[l.card_id].spicy));
  },
  async createListing(card, price) {
    this.needOnline();
    price = Math.round(price);
    if (!(price >= SELL_PRICE(card) && price <= MARKET_MAX)) throw new Error(`El precio debe estar entre ${SELL_PRICE(card)} y ${MARKET_MAX}.`);
    const id = await this.rpc('create_listing', { p_card: card, p_price: price }); await this.refresh(); return id;
  },
  async cancelListing(id) { this.needOnline(); await this.rpc('cancel_listing', { p_id: id }); await this.refresh(); },
  async buyListing(id) { this.needOnline(); const r = await this.rpc('buy_listing', { p_id: id }); await this.refresh(); return r; },
  async trades() {
    this.needOnline();
    const { data, error } = await this.sb.from('trades')
      .select('*, from:profiles!trades_from_user_fkey(username,display_name,avatar_url,accent), to:profiles!trades_to_user_fkey(username,display_name,avatar_url,accent)')
      .or(`from_user.eq.${this.user.id},to_user.eq.${this.user.id}`).order('created_at', { ascending: false }).limit(60);
    if (error) throw new Error(friendly(error));
    return data;
  },
  async createTrade(toId, offer, request, offerCoins, requestCoins, message) {
    this.needOnline();
    const id = await this.rpc('create_trade', { p_to: toId, p_offer: offer, p_request: request, p_offer_coins: offerCoins | 0, p_request_coins: requestCoins | 0, p_message: message || null });
    await this.refresh(); return id;
  },
  async respondTrade(id, accept) { this.needOnline(); const r = await this.rpc('respond_trade', { p_id: id, p_accept: accept }); await this.refresh(); return r; },
  async cancelTrade(id) { this.needOnline(); await this.rpc('cancel_trade', { p_id: id }); await this.refresh(); },
  subscribeMarket(fn) {
    if (!this.online) return () => { };
    const ch = this.sb.channel('mercado-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_listings' }, fn)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, fn).subscribe();
    return () => this.sb.removeChannel(ch);
  },

  // ---------------------------------------------------------------- progreso de estudio en la nube
  schedulePush() { if (!this.online || this.switching) return; clearTimeout(this.pushT); this.pushT = setTimeout(() => this.pushNow(), 3000); },
  async pushNow() {
    if (!this.online || this.switching) return;
    clearTimeout(this.pushT);
    await this.flush();
    const save = { ...S }; delete save.coins; delete save.cards; delete save.freePacks; delete save.pity;
    try { await this.sb.from('progress').upsert({ id: this.user.id, save, updated_at: new Date().toISOString() }); } catch (e) { }
  },

  // Canal en vivo: quién está conectado y avisos de cartas raras ("hype").
  lobby: { peers: [], log: [] },
  joinLobby(onEvent) {
    if (!this.sb) return;
    try {
      const key = Math.random().toString(36).slice(2);
      this.ch = this.sb.channel('lobby', { config: { presence: { key } } });
      this.ch.on('presence', { event: 'sync' }, () => { this.lobby.peers = Object.values(this.ch.presenceState()).map(v => v[0] || {}); onEvent?.('presence'); });
      this.ch.on('broadcast', { event: 'hype' }, ({ payload }) => { const t = String(payload?.t || '').slice(0, 90), a = String(payload?.a || 'Alguien').slice(0, 24); if (t) { this.lobby.log.unshift({ a, t }); this.lobby.log = this.lobby.log.slice(0, 6); onEvent?.('hype', { a, t }); } });
      this.ch.subscribe((st) => { if (st === 'SUBSCRIBED') this.presence(); });
    } catch (e) { }
  },
  presence() { try { this.ch?.track({ n: this.name.slice(0, 24), lv: levelFor(S.xp) }); } catch (e) { } },
  hype(t) { try { this.ch?.send({ type: 'broadcast', event: 'hype', payload: { a: this.name, t } }); } catch (e) { } },
};

export const missionsLeftToday = () => MISSIONS_PER_DAY;
