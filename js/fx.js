// Estímulos: sonidos, partículas, sacudidas, textos flotantes, vibración y reacciones.
// Todo funciona SIN archivos (sonidos sintetizados y efectos con CSS/canvas).
// PARTE 2: assets/manifest.json permite enchufar audios, GIFs de reacción e imágenes;
// si un archivo existe, se usa en lugar del efecto sintetizado.
import { S } from './state.js';
import { h } from './dom.js';

const lvl = () => S.settings.fx;              // 'zen' | 'normal' | 'max'
const on = (min) => ({ zen: 0, normal: 1, max: 2 }[lvl()] >= min);

// ---------------------------------------------------------------- media (parte 2)
export const Media = {
  m: { cards: {}, reactions: {}, sounds: {}, packs: {}, avatars: [] },
  async load() {
    try { const r = await fetch('assets/manifest.json', { cache: 'no-cache' }); if (r.ok) this.m = Object.assign(this.m, await r.json()); } catch (e) { }
  },
  card(id) { return this.m.cards?.[id] || null; },
  pack(id) { return this.m.packs?.[id] || null; },
  reaction(kind) { const a = this.m.reactions?.[kind]; return Array.isArray(a) && a.length ? a[Math.floor(Math.random() * a.length)] : null; },
  sound(name) { const a = this.m.sounds?.[name]; if (!a) return null; return Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a; },
};

// ---------------------------------------------------------------- sonido sintetizado
export const SFX = (() => {
  let ctx = null;
  const ac = () => { if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (A) ctx = new A(); } if (ctx?.state === 'suspended') ctx.resume(); return ctx; };
  const tone = (f, d = 0.12, type = 'sine', vol = 0.12, delay = 0, slide = 0) => {
    const c = ac(); if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02);
  };
  const noise = (d = 0.25, vol = 0.08, delay = 0) => {
    const c = ac(); if (!c) return;
    const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1800; s.buffer = b; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + delay);
  };
  const file = (name) => {
    const url = Media.sound(name); if (!url) return false;
    try { const a = new Audio(url); a.volume = 0.7; a.play().catch(() => { }); return true; } catch (e) { return false; }
  };
  const play = (name, synth) => { if (!S.settings.sound) return; if (!file(name)) synth(); };
  return {
    unlock: ac,
    correct: (combo = 0) => play('correct', () => { const b = 520 + Math.min(combo, 20) * 22; tone(b, 0.09, 'triangle'); tone(b * 1.25, 0.09, 'triangle', 0.12, 0.07); tone(b * 1.5, 0.14, 'triangle', 0.12, 0.14); }),
    wrong: () => play('wrong', () => { tone(180, 0.22, 'sawtooth', 0.08, 0, -60); tone(140, 0.25, 'square', 0.05, 0.08); }),
    coin: () => play('coin', () => { tone(988, 0.07, 'square', 0.06); tone(1319, 0.16, 'square', 0.06, 0.06); }),
    click: () => play('click', () => tone(700, 0.03, 'square', 0.04)),
    tick: () => play('tick', () => tone(1100, 0.03, 'square', 0.05)),
    whoosh: () => play('whoosh', () => noise(0.3, 0.07)),
    combo: (n) => play('combo', () => { for (let i = 0; i < 4; i++) tone(440 * Math.pow(2, (i * 4 + Math.min(n, 30) / 3) / 12), 0.1, 'sawtooth', 0.06, i * 0.05); }),
    levelup: () => play('levelup', () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, i * 0.09)); }),
    fanfare: () => play('fanfare', () => { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.06, i * 0.1)); }),
    shake: () => play('pack_shake', () => { for (let i = 0; i < 6; i++) tone(120 + i * 30, 0.05, 'square', 0.05, i * 0.07); }),
    burst: () => play('pack_open', () => { noise(0.5, 0.12); tone(80, 0.4, 'sine', 0.2, 0, 200); }),
    reveal: (rank) => play('reveal_' + rank, () => {
      const notes = [[660], [660, 880], [660, 880, 1100], [523, 784, 1047, 1319], [523, 659, 784, 1047, 1319, 1568]][rank - 1] || [660];
      notes.forEach((f, i) => tone(f, 0.2 + rank * 0.03, rank >= 4 ? 'square' : 'triangle', 0.09, i * 0.08));
      if (rank >= 4) noise(0.6, 0.06, 0.1);
    }),
  };
})();

// ---------------------------------------------------------------- vibración
export const buzz = (p) => { if (S.settings.vibrate && on(1) && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { } };

// ---------------------------------------------------------------- partículas
let cv = null, cx = null, parts = [], raf = 0;
function ensureCanvas() {
  if (cv) return;
  cv = h('<canvas class="fx-canvas" aria-hidden="true"></canvas>'); document.body.append(cv); cx = cv.getContext('2d');
  const rs = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; };
  rs(); addEventListener('resize', rs);
}
function loop() {
  cx.clearRect(0, 0, cv.width, cv.height);
  const d = devicePixelRatio;
  parts = parts.filter(p => p.life > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.99; p.life -= 1; p.rot += p.vr;
    cx.save(); cx.globalAlpha = Math.min(1, p.life / 30); cx.translate(p.x * d, p.y * d); cx.rotate(p.rot);
    cx.fillStyle = p.c;
    if (p.shape === 'star') { cx.font = `${p.s * 2 * d}px sans-serif`; cx.fillText(p.ch, 0, 0); }
    else cx.fillRect(-p.s * d / 2, -p.s * d / 4, p.s * d, p.s * d / 2);
    cx.restore();
  }
  raf = parts.length ? requestAnimationFrame(loop) : 0;
}
export function confetti(x = innerWidth / 2, y = innerHeight / 2, n = 40, colors = ['#ffd166', '#ff6b4a', '#3ddc97', '#4cc9f0', '#b06cff', '#ff4fd8']) {
  if (!on(1)) return; ensureCanvas();
  const k = on(2) ? n : Math.ceil(n / 3);
  for (let i = 0; i < k; i++) {
    const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 7;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, g: 0.25, life: 60 + Math.random() * 40, s: 6 + Math.random() * 6, c: colors[i % colors.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, shape: Math.random() < 0.15 ? 'star' : 'rect', ch: '★' });
  }
  if (!raf) raf = requestAnimationFrame(loop);
}
export function coinRain(n = 20) {
  if (!on(2)) return; ensureCanvas();
  for (let i = 0; i < n; i++) parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * 200, vx: 0, vy: 2 + Math.random() * 3, g: 0.12, life: 120, s: 10, c: '#ffd166', rot: 0, vr: 0.1, shape: 'star', ch: '🪙' });
  if (!raf) raf = requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- textos y sacudidas
export function floatText(txt, x, y, cls = '') {
  if (!on(1)) return;
  const el = h(`<div class="float-text ${cls}"></div>`); el.textContent = txt;
  el.style.left = (x ?? innerWidth / 2) + 'px'; el.style.top = (y ?? innerHeight / 2) + 'px';
  document.body.append(el); setTimeout(() => el.remove(), 1100);
}
export function shake(el = document.body, strong = false) {
  if (!on(2)) return;
  el.classList.remove('shake', 'shake-strong'); void el.offsetWidth; el.classList.add(strong ? 'shake-strong' : 'shake');
  setTimeout(() => el.classList.remove('shake', 'shake-strong'), 500);
}
export function flash(color = 'rgba(61,220,151,.25)') {
  if (!on(2)) return;
  const el = h('<div class="flash"></div>'); el.style.background = color; document.body.append(el); setTimeout(() => el.remove(), 350);
}
export function banner(big, small = '', cls = '') {
  if (!on(1)) return;
  const el = h(`<div class="banner ${cls}"><b></b><span></span></div>`);
  el.querySelector('b').textContent = big; el.querySelector('span').textContent = small;
  document.body.append(el); setTimeout(() => el.remove(), 1600);
}

// Reacción (GIF/imagen de la parte 2). Si no hay archivos, muestra un emoji grande.
const EMOJI = { happy: ['🔥', '⚡', '😎', '🚀', '💯'], sad: ['💀', '😵', '🫠', '😭'], hype: ['🤯', '👑', '🌟'] };
export function react(kind) {
  if (!on(2)) return;
  const url = Media.reaction(kind);
  const el = h(`<div class="reaction ${kind}"></div>`);
  if (url) { const img = new Image(); img.src = url; img.alt = ''; el.append(img); }
  else el.textContent = EMOJI[kind][Math.floor(Math.random() * EMOJI[kind].length)];
  document.body.append(el); setTimeout(() => el.remove(), 1400);
}

export function toast(title, sub = '', icon = '✓', cls = '') {
  const box = document.getElementById('toasts');
  const el = h(`<div class="toast ${cls}"><i></i><div><b></b><small></small></div></div>`);
  el.querySelector('i').textContent = icon; el.querySelector('b').textContent = title; el.querySelector('small').textContent = sub;
  box.append(el); setTimeout(() => el.classList.add('out'), 2800); setTimeout(() => el.remove(), 3300);
}

// Combos: multiplicador de recompensa según la racha.
export const comboMult = (c) => c >= 20 ? 3 : c >= 10 ? 2 : c >= 5 ? 1.5 : 1;

// Paquete de estímulos para acierto / error (lo usan todas las secciones).
export function hit(ok, { x, y, combo = 0, xp = 0, coins = 0 } = {}) {
  if (ok) {
    SFX.correct(combo); buzz(25);
    if (xp) floatText(`+${xp} XP`, x, y, 'xp');
    if (coins) setTimeout(() => floatText(`+${coins} 🪙`, x, (y ?? innerHeight / 2) + 30, 'coin'), 120);
    if (on(2)) { flash(); confetti(x, y, 18); }
    if (combo && [5, 10, 15, 20, 30, 40, 50].includes(combo)) { SFX.combo(combo); banner(`COMBO x${combo}`, `Multiplicador ×${comboMult(combo)}`, 'combo'); react('hype'); confetti(innerWidth / 2, innerHeight / 3, 60); }
    else if (Math.random() < 0.25) react('happy');
  } else {
    SFX.wrong(); buzz([40, 40, 60]); shake(document.querySelector('#view'));
    if (on(2)) flash('rgba(255,79,109,.22)');
    if (Math.random() < 0.35) react('sad');
  }
}
