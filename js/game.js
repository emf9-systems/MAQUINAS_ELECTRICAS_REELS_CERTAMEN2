// El "motor de dopamina": cada respuesta pasa por aquí para dar XP, monedas, combos,
// misiones, logros y efectos de forma consistente en toda la app.
import { S, save, mission, checkAch, level, titleFor, topicStat } from './state.js';
import { NET } from './backend.js';
import { hit, toast, banner, confetti, SFX, coinRain, react, comboMult } from './fx.js';
import { h } from './dom.js';

let hudFn = () => { };
export const setHud = (fn) => { hudFn = fn; };
export const hud = (bump) => hudFn(bump);

// kind: 'mcq' | 'rush' | 'dev' | 'lesson'
export function answer(kind, ok, { ev = null, topic = null, mult = 1 } = {}) {
  const x = ev?.clientX, y = ev?.clientY;
  if (ok) { S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); } else S.streak = 0;
  if (topic) topicStat(topic, ok);
  const before = level().lv;
  const r = NET.reward(kind, ok, S.bestStreak);
  // Bonus local por combo / pregunta dorada (solo visual + XP local; el servidor aplica sus propios topes)
  const cm = comboMult(S.streak) * mult;
  const xp = Math.round(r.xp * (ok ? cm : 1));
  if (ok && cm > 1) S.xp += xp - r.xp;
  hit(ok, { x, y, combo: ok ? S.streak : 0, xp: ok ? xp : 0, coins: r.coins });
  mission('answer'); if (ok) mission('correct');
  if (kind === 'rush') mission('combo', S.streak, true);
  afterProgress(before);
  save();
  return { ...r, xp };
}

export function afterProgress(beforeLv) {
  const lv = level().lv;
  if (lv > beforeLv) levelUp(lv);
  for (const a of checkAch()) { toast('Logro: ' + a.t, a.d, '🏆', 'gold'); SFX.fanfare(); }
  for (const m of S.missions) if (m.done && !m.notified) { m.notified = true; toast('¡Misión cumplida!', m.t + ' · cobra tu premio en Inicio', '🎯', 'gold'); }
  hud(true);
}

export function levelUp(lv) {
  SFX.levelup(); confetti(innerWidth / 2, innerHeight / 2, 120); coinRain(25); react('hype');
  const el = h(`<div class="levelup"><small>¡SUBISTE DE NIVEL!</small><b>${lv}</b><span>${titleFor(lv)}</span><em>+100 🪙</em></div>`);
  document.body.append(el); setTimeout(() => el.remove(), 2600);
  NET.hype?.(`subió a nivel ${lv} ⚡`);
}

export function rarityHype(rarity, name) {
  if (rarity === 'legendaria' || rarity === 'mitica') {
    banner(rarity === 'mitica' ? '¡¡MÍTICA!!' : '¡LEGENDARIA!', name, 'r-' + rarity);
    NET.hype?.(`sacó una carta ${rarity === 'mitica' ? 'MÍTICA' : 'legendaria'}: ${name}`);
  }
}
