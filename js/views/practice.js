import { h, $, esc, tex } from '../dom.js';
import { S, save, mission, level, topicStat } from '../state.js';
import { TOPICS, TOPIC } from '../content/lessons.js';
import { TEMPLATES, TEMPLATE, generate } from '../content/generators.js';
import { GUIDE, GUIDE_BY_ID } from '../content/guide.js';
import { CONCEPTS } from '../content/concepts.js';
import { devView, mcqView } from '../components.js';
import { calcItem, conceptQ, guideItem, tfQ } from '../engine/pool.js';
import { NET } from '../backend.js';
import { answer, afterProgress } from '../game.js';
import { hit, banner, confetti, SFX } from '../fx.js';
import { go } from '../router.js';
import { newSeed } from '../util.js';

export function render(root, p) {
  if (p.mode === 'dev') return devMode(root, p);
  if (p.mode === 'guide') return guideMode(root, p);
  if (p.mode === 'bank') return bankMode(root, p);
  const nGuideOk = Object.values(S.guide).filter(x => x === 'ok').length;
  const el = h(`<section class="view practice">
    <h2>Practicar</h2>
    <div class="card"><h3>✍️ Desarrollo escrito por tema</h3><p class="small muted">Te damos un enunciado con números nuevos cada vez. Escribes tu desarrollo y el resultado de cada parte con el teclado; se corrige al instante (tolerancia ±2% por redondeo) y ves la pauta paso a paso.</p><div class="chips dev"></div><button class="btn primary any">Ejercicio al azar</button></div>
    <div class="card"><h3>📘 Guías del curso resueltas</h3><p class="small muted">Los 9 ejercicios de Máquinas CC y los 17 de Máquinas CA, con pauta completa. Llevas ${nGuideOk}/26.</p><div class="guides"></div></div>
    <div class="card"><h3>🔘 Banco de alternativas por tema</h3><p class="small muted">${CONCEPTS.length} preguntas teóricas + ejercicios de cálculo infinitos (${TEMPLATES.length} tipos). Sin límite de tiempo.</p><div class="chips bank"></div></div>
    <div class="card"><h3>📝 Simulacros</h3><button class="btn exam">Ir a simulacros de certamen</button></div>
  </section>`);
  for (const t of TOPICS) {
    if (TEMPLATES.some(x => x.topic === t.id)) { const b = h(`<button class="chip">${t.icon} ${esc(t.short)}</button>`); b.onclick = () => go('practice', { mode: 'dev', topic: t.id }); $('.dev', el).append(b); }
    const b2 = h(`<button class="chip">${t.icon} ${esc(t.short)}</button>`); b2.onclick = () => go('practice', { mode: 'bank', topic: t.id }); $('.bank', el).append(b2);
  }
  const all = h('<button class="chip hot">🎲 Todos los temas</button>'); all.onclick = () => go('practice', { mode: 'bank' }); $('.bank', el).prepend(all);
  $('.any', el).onclick = () => go('practice', { mode: 'dev' });
  $('.exam', el).onclick = () => go('exam');
  for (const g of ['CC', 'CA']) {
    const row = h(`<div class="guide-row"><b>Máquinas ${g}</b><div class="gbtns"></div></div>`);
    for (const ex of GUIDE.filter(x => x.guide === g)) {
      const st = S.guide[ex.id];
      const b = h(`<button class="gbtn ${st === 'ok' ? 'ok' : st ? 'tried' : ''}" title="${esc(ex.title)}">${ex.n}</button>`);
      b.onclick = () => go('practice', { mode: 'guide', id: ex.id });
      $('.gbtns', row).append(b);
    }
    $('.guides', el).append(row);
  }
  root.append(el);
}

// Recompensa común para un ejercicio de desarrollo corregido.
function rewardDev(ex, res, ev) {
  const lv = level().lv;
  let coins = 0;
  res.parts.forEach(ok => { const r = NET.reward('dev', ok, S.bestStreak); coins += r.coins; topicStat(ex.topic, ok); });
  if (res.wrote) S.xp += 10 * res.ok;                      // escribir el desarrollo vale más (XP local)
  S.devDone++; mission('dev'); mission('answer', res.total); mission('correct', res.ok);
  const all = res.ok === res.total;
  if (all) { S.streak += res.total; S.bestStreak = Math.max(S.bestStreak, S.streak); } else S.streak = 0;
  hit(res.ok >= res.total / 2, { x: ev?.clientX, y: ev?.clientY, xp: res.ok * 25 + (res.wrote ? 10 * res.ok : 0), coins, combo: all ? S.streak : 0 });
  if (all) { banner('¡PERFECTO!', `${res.total}/${res.total} resultados`); confetti(innerWidth / 2, innerHeight / 3, 90); SFX.fanfare(); }
  save(); afterProgress(lv);
}

function devMode(root, p) {
  const el = h(`<section class="view"><button class="btn ghost sm back">‹ Practicar</button><div class="ex"></div><div class="row end nextrow" hidden><button class="btn primary next">Otro ejercicio ›</button></div></section>`);
  $('.back', el).onclick = () => go('practice');
  const draw = () => {
    const list = p.tpl ? [TEMPLATE[p.tpl]] : TEMPLATES.filter(t => !p.topic || t.topic === p.topic);
    const t = list[Math.floor(Math.random() * list.length)];
    const ex = generate(t.id, newSeed());
    const box = $('.ex', el); box.innerHTML = '';
    let lastEv = null; box.addEventListener('pointerdown', e => lastEv = e);
    box.append(devView(ex, { onDone: (res) => { rewardDev(ex, res, lastEv); $('.nextrow', el).hidden = false; } }));
    $('.nextrow', el).hidden = true;
  };
  $('.next', el).onclick = () => { draw(); window.scrollTo(0, 0); };
  draw();
  root.append(el);
}

function guideMode(root, p) {
  const ex = GUIDE_BY_ID[p.id];
  const idx = GUIDE.indexOf(ex);
  const el = h(`<section class="view"><button class="btn ghost sm back">‹ Practicar</button><div class="ex"></div>
    <div class="row"><button class="btn prev">‹ Anterior</button><span class="grow"></span><button class="btn primary nxt">Siguiente ›</button></div></section>`);
  $('.back', el).onclick = () => go('practice');
  let lastEv = null; el.addEventListener('pointerdown', e => lastEv = e);
  $('.ex', el).append(devView(ex, {
    onDone: (res) => {
      const was = S.guide[ex.id];
      S.guide[ex.id] = res.ok === res.total ? 'ok' : (was === 'ok' ? 'ok' : 'tried');
      if (res.ok === res.total && was !== 'ok') mission('guide');
      rewardDev(ex, res, lastEv);
    },
  }));
  const prev = GUIDE[idx - 1], next = GUIDE[idx + 1];
  if (prev) $('.prev', el).onclick = () => go('practice', { mode: 'guide', id: prev.id }); else $('.prev', el).disabled = true;
  if (next) $('.nxt', el).onclick = () => go('practice', { mode: 'guide', id: next.id }); else $('.nxt', el).disabled = true;
  root.append(el);
}

function bankMode(root, p) {
  const topic = p.topic || null;
  const el = h(`<section class="view"><button class="btn ghost sm back">‹ Practicar</button>
    <h2>${topic ? TOPIC[topic].icon + ' ' + esc(TOPIC[topic].short) : '🎲 Todos los temas'}</h2>
    <div class="row small muted"><span class="grow score">0/0</span><span>Racha: <b class="st">0</b></span></div>
    <div class="q"></div></section>`);
  $('.back', el).onclick = () => go('practice');
  let ok = 0, n = 0;
  const draw = () => {
    const r = Math.random();
    const item = r < 0.4 ? conceptQ(topic) : r < 0.5 ? tfQ(topic) : r < 0.65 ? guideItem(topic) : (TEMPLATES.some(t => !topic || t.topic === topic) ? calcItem(topic) : conceptQ(topic));
    const box = $('.q', el); box.innerHTML = '';
    box.append(mcqView(item, {
      onAnswer: (good, _e, ev) => {
        n++; if (good) ok++;
        answer('mcq', good, { ev, topic: item.topic });
        $('.score', el).textContent = `${ok}/${n} correctas`; $('.st', el).textContent = S.streak;
        const b = h('<button class="btn primary">Siguiente ›</button>'); b.onclick = draw; box.append(b); b.focus();
      },
    }));
    window.scrollTo(0, 0);
  };
  draw();
  root.append(el);
}
