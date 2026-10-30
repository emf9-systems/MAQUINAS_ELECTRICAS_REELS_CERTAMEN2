// Modo Rush: feed vertical tipo reels con combos, preguntas doradas, cofres y jefes.
import { h, $, $$ } from '../dom.js';
import { S, save } from '../state.js';
import { conceptQ, tfQ, calcItem, guideItem } from '../engine/pool.js';
import { mcqView } from '../components.js';
import { answer, hud } from '../game.js';
import { SFX, banner, confetti, react, comboMult, floatText, toast, shake } from '../fx.js';
import { go } from '../router.js';

let io = null, timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));

export function render(root, p) {
  if (p.mode === 'sprint') return sprint(root);
  let n = 0, boost = 0;
  const el = h(`<section class="view rush">
    <div class="rush-hud"><button class="btn ghost sm out">✕</button><div class="combo"><b class="cnum">${S.streak}</b><small>combo</small></div><div class="mult">×<b>${comboMult(S.streak)}</b></div><div class="fire"></div><button class="btn sm sprint">⏱️ Sprint 60 s</button></div>
    <div class="feed"></div></section>`);
  const feed = $('.feed', el);
  $('.out', el).onclick = () => go('home');
  $('.sprint', el).onclick = () => go('rush', { mode: 'sprint' });
  const paintHud = () => {
    $('.cnum', el).textContent = S.streak; $('.mult b', el).textContent = comboMult(S.streak) * (boost ? 2 : 1);
    el.classList.toggle('fever', S.streak >= 10); el.classList.toggle('inferno', S.streak >= 20);
  };

  const shell = (cls = '') => h(`<article class="reel ${cls}"><div class="reel-in"></div><div class="swipe">desliza ↓</div></article>`);
  const nextQuestion = () => {
    const r = Math.random();
    return r < 0.35 ? conceptQ() : r < 0.5 ? tfQ() : r < 0.65 ? guideItem() : calcItem();
  };
  const goNext = (reel) => { const nx = reel.nextElementSibling; if (nx) nx.scrollIntoView({ behavior: 'smooth' }); };

  const questionReel = (kind = 'normal') => {
    const golden = kind === 'normal' && Math.random() < 0.1;
    const boss = kind === 'boss';
    const reel = shell(golden ? 'golden' : boss ? 'boss' : '');
    const inner = $('.reel-in', reel);
    if (golden) inner.append(h('<div class="badge gold">✨ PREGUNTA DORADA · ×2</div>'));
    let bossT = null;
    const item = boss ? calcItem() : nextQuestion();
    if (boss) {
      inner.append(h('<div class="badge boss">👹 JEFE · 30 s · ×3</div>'));
      inner.append(h('<div class="bossbar"><i></i></div>'));
    }
    const v = mcqView(item, {
      onAnswer: (ok, _e, ev) => {
        clearTimeout(bossT);
        const mult = (golden ? 2 : 1) * (boss ? 3 : 1) * (boost && ok ? 2 : 1);
        if (boost) boost--;
        answer('rush', ok, { ev, topic: item.topic, mult });
        if (boss && ok) { banner('¡JEFE DERROTADO!', '×3 XP'); confetti(innerWidth / 2, innerHeight / 2, 120); react('hype'); }
        paintHud(); hud(true);
        later(() => goNext(reel), ok ? 1100 : 2600);
      },
    });
    inner.append(v);
    reel.onActive = () => {
      if (!boss || reel.started) return; reel.started = true;
      const bar = $('.bossbar i', reel); bar.style.transition = 'width 30s linear'; requestAnimationFrame(() => bar.style.width = '0%');
      bossT = setTimeout(() => { if (v.dataset.done) return; v.dataset.done = '1'; $$('.opt', v).forEach((b, j) => { b.disabled = true; if (j === item.correct) b.classList.add('right'); }); answer('rush', false, { topic: item.topic }); toast('¡Se acabó el tiempo!', 'El jefe ganó esta vez', '⏱️', 'bad'); paintHud(); later(() => goNext(reel), 2200); }, 30000);
    };
    return reel;
  };

  const chestReel = () => {
    const reel = shell('chest-reel');
    const inner = $('.reel-in', reel);
    inner.append(h('<div class="chest-wrap"><div class="chest">🎁</div><p>¡Cofre! Tócalo para abrirlo</p></div>'));
    $('.chest', reel).onclick = (e) => {
      if (reel.opened) return; reel.opened = true;
      SFX.burst(); shake($('.chest', reel), true); confetti(e.clientX, e.clientY, 80);
      const roll = Math.random();
      let txt;
      if (roll < 0.5) { boost = 3; txt = '×2 XP en las próximas 3 respuestas'; }
      else { const xp = [30, 50, 80, 120][Math.floor(Math.random() * 4)]; S.xp += xp; txt = `+${xp} XP`; floatText(`+${xp} XP`, e.clientX, e.clientY, 'xp'); }
      $('p', reel).textContent = txt; $('.chest', reel).textContent = '✨';
      save(); paintHud(); hud(true);
      later(() => goNext(reel), 1500);
    };
    return reel;
  };

  const add = (k = 4) => {
    for (let i = 0; i < k; i++) {
      n++;
      const reel = n % 15 === 0 ? questionReel('boss') : n % 7 === 0 ? chestReel() : questionReel();
      feed.append(reel); io.observe(reel);
    }
  };
  io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) {
      e.target.classList.add('active'); e.target.onActive?.();
      if (e.target === feed.lastElementChild || e.target === feed.lastElementChild?.previousElementSibling) add(4);
    } else e.target.classList.remove('active');
  }, { root: feed, threshold: 0.6 });
  add(4);
  paintHud();
  root.append(el);
  document.body.classList.add('rush-on');
  return { leave: () => { io?.disconnect(); timers.forEach(clearTimeout); timers = []; document.body.classList.remove('rush-on'); } };
}

// Sprint: cuántas aciertas en 60 segundos.
function sprint(root) {
  let ok = 0, n = 0, t;
  const end = Date.now() + 60e3;
  const el = h(`<section class="view rush sprint-mode"><div class="rush-hud"><button class="btn ghost sm out">✕</button><div class="combo"><b class="cnum">0</b><small>aciertos</small></div><div class="timebar"><i></i></div><b class="secs">60</b></div><div class="sq"></div></section>`);
  $('.out', el).onclick = () => go('rush');
  const bar = $('.timebar i', el); requestAnimationFrame(() => { bar.style.transition = 'width 60s linear'; bar.style.width = '0%'; });
  const draw = () => {
    const box = $('.sq', el); box.innerHTML = '';
    const item = Math.random() < 0.55 ? conceptQ() : tfQ();
    box.append(mcqView(item, { reveal: false, onAnswer: (good, _e, ev) => { n++; if (good) ok++; answer('rush', good, { ev, topic: item.topic }); $('.cnum', el).textContent = ok; later(draw, good ? 250 : 900); } }));
  };
  t = setInterval(() => {
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000)); $('.secs', el).textContent = left;
    if (left <= 5 && left > 0) SFX.tick();
    if (left <= 0) {
      clearInterval(t); timers.forEach(clearTimeout);
      const best = S.sprintBest || 0; const rec = ok > best; if (rec) S.sprintBest = ok; save();
      const box = $('.sq', el); box.innerHTML = '';
      box.append(h(`<div class="card gradebox ${rec ? 'g-ok' : ''}"><small>Sprint terminado</small><b>${ok}</b><span>aciertos de ${n} · récord: ${Math.max(ok, best)}</span>${rec ? '<span class="tag gold">¡NUEVO RÉCORD!</span>' : ''}<div class="row"><button class="btn primary again">Otra vez</button><button class="btn back">Volver al Rush</button></div></div>`));
      if (rec) { banner('¡NUEVO RÉCORD!', ok + ' aciertos'); confetti(innerWidth / 2, innerHeight / 3, 100); SFX.fanfare(); }
      $('.again', box).onclick = () => go('rush', { mode: 'sprint' });
      $('.back', box).onclick = () => go('rush');
    }
  }, 250);
  draw();
  root.append(el);
  return { leave: () => { clearInterval(t); timers.forEach(clearTimeout); timers = []; } };
}
