import { h, $, $$, esc, tex, confirmBox } from '../dom.js';
import { S, save, mission, level, topicStat } from '../state.js';
import { buildExam, buildDevExam, EXAM_FORMATS } from '../engine/pool.js';
import { mcqView, devView, showExplain } from '../components.js';
import { NET } from '../backend.js';
import { afterProgress } from '../game.js';
import { SFX, banner, confetti, coinRain, react, toast, shake } from '../fx.js';
import { go, setGuard } from '../router.js';
import { fmt, gradeCL } from '../util.js';

let timer = null;
const clock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

export function render(root, p) {
  if (p.run === 'alt') return runAlt(root, p.format || 'c1');
  if (p.run === 'dev') return runDev(root);
  const el = h(`<section class="view exam-menu">
    <h2>Simulacros de certamen</h2>
    <div class="card info"><b>¿Cómo es el certamen real?</b><p class="small">12 preguntas de alternativas en 12 minutos (1 minuto por pregunta). En el certamen 1 fueron 3 ejercicios con 4 preguntas cada uno. Nota de 1,0 a 7,0 con 60% de exigencia: necesitas 8 de 12 para el 4,0.</p></div>
    <div class="formats"></div>
    <div class="card"><h3>✍️ Simulacro de desarrollo</h3><p class="small muted">3 ejercicios × 4 resultados, 36 minutos. Escribes el desarrollo y los resultados con el teclado. Al final ves la pauta de todo.</p><button class="btn primary dev">Comenzar simulacro de desarrollo</button></div>
    <div class="card tips"><h3>Consejos para los 12 minutos</h3><ul class="small">
      <li>Lee primero el enunciado completo de cada ejercicio: las 4 preguntas suelen encadenarse (la 2 usa el resultado de la 1).</li>
      <li>Anota los datos en unidades base (W, rad/s, Ω) antes de empezar.</li>
      <li>Revisa "polos" vs "pares de polos" y si te dan potencia útil o absorbida.</li>
      <li>Las alternativas trampa salen de errores típicos: si tu número aparece, igual revisa el paso dudoso.</li></ul></div>
  </section>`);
  for (const [k, f] of Object.entries(EXAM_FORMATS)) {
    const c = h(`<div class="card format"><h3>📝 ${esc(f.name)}</h3><p class="small muted">${esc(f.desc)}</p><button class="btn primary">Comenzar (${f.minutes} min)</button></div>`);
    $('button', c).onclick = () => go('exam', { run: 'alt', format: k });
    $('.formats', el).append(c);
  }
  $('.dev', el).onclick = () => go('exam', { run: 'dev' });
  root.append(el);
  return { leave: () => clearInterval(timer) };
}

function runAlt(root, format) {
  const E = buildExam(format);
  const ans = new Array(E.qs.length).fill(null), flag = new Array(E.qs.length).fill(false);
  const t0 = Date.now(), end = t0 + E.minutes * 60e3;
  let cur = 0, done = false;
  const el = h(`<section class="view exam-run">
    <div class="exam-bar"><b class="clock">${E.minutes}:00</b><div class="dots"></div><button class="btn sm gold submit">Entregar</button></div>
    <div class="qbox"></div>
    <div class="row"><button class="btn prev">‹</button><button class="btn flag">🚩 Marcar</button><span class="grow"></span><button class="btn primary next">›</button></div>
  </section>`);
  const dots = $('.dots', el);
  E.qs.forEach((_, i) => { const d = h(`<button class="dot">${i + 1}</button>`); d.onclick = () => show(i); dots.append(d); });
  const paint = () => $$('.dot', dots).forEach((d, i) => { d.classList.toggle('ans', ans[i] !== null); d.classList.toggle('flag', flag[i]); d.classList.toggle('cur', i === cur); });
  const show = (i) => {
    cur = i; const q = E.qs[i], box = $('.qbox', el); box.innerHTML = '';
    const head = q.group === 'teoria' ? 'Pregunta teórica' : `Ejercicio ${q.group + 1} · pregunta ${E.qs.filter((x, j) => x.group === q.group && j <= i).length} de 4`;
    box.append(h(`<small class="muted">${head} · ${i + 1}/12</small>`));
    box.append(mcqView(q, { exam: true, selected: ans[i], onPick: (k) => { ans[i] = k; SFX.click(); paint(); } }));
    $('.flag', el).classList.toggle('on', flag[i]);
    paint();
  };
  $('.prev', el).onclick = () => show(Math.max(0, cur - 1));
  $('.next', el).onclick = () => show(Math.min(E.qs.length - 1, cur + 1));
  $('.flag', el).onclick = () => { flag[cur] = !flag[cur]; $('.flag', el).classList.toggle('on', flag[cur]); paint(); };
  $('.submit', el).onclick = async () => {
    const blank = ans.filter(a => a === null).length;
    if (await confirmBox('¿Entregar el certamen?', blank ? `Te quedan ${blank} preguntas sin responder.` : 'Respondiste todas las preguntas.', 'Entregar')) finish();
  };
  setGuard(async () => done || await confirmBox('¿Salir del certamen?', 'Si sales, el intento se pierde.', 'Salir'));
  const tick = () => {
    const left = end - Date.now();
    $('.clock', el).textContent = clock(left);
    $('.clock', el).classList.toggle('hurry', left < 60e3);
    if (left < 10e3 && left > 0) SFX.tick();
    if (left <= 0) finish();
  };
  timer = setInterval(tick, 1000);
  const finish = async () => {
    if (done) return; done = true; clearInterval(timer); setGuard(null);
    const secs = Math.round((Date.now() - t0) / 1000);
    const okv = E.qs.map((q, i) => ans[i] === q.correct);
    const nOk = okv.filter(Boolean).length;
    E.qs.forEach((q, i) => topicStat(q.topic, okv[i]));
    const lv = level().lv;
    mission('exam'); mission('answer', 12); mission('correct', nOk);
    let r = { grade: gradeCL(nOk, 12), coins: 0, xp: nOk * 15 };
    try { r = await NET.submitExam('alternativas', nOk, 12, secs); } catch (e) { toast('No se guardó en el servidor', e.message, '!', 'bad'); }
    save(); afterProgress(lv);
    results(root, E, ans, okv, r, secs);
  };
  root.append(el); show(0);
  return { leave: () => { clearInterval(timer); } };
}

function celebrate(grade, coins) {
  if (grade >= 6) { SFX.fanfare(); banner(grade >= 7 ? '¡NOTA MÁXIMA!' : '¡EXCELENTE!', `Nota ${fmt(grade)}`); confetti(innerWidth / 2, innerHeight / 3, 150); coinRain(30); react('hype'); }
  else if (grade >= 4) { SFX.levelup(); banner('¡APROBADO!', `Nota ${fmt(grade)}`); confetti(innerWidth / 2, innerHeight / 3, 70); react('happy'); }
  else { SFX.wrong(); shake(document.querySelector('#view'), true); react('sad'); }
  if (coins) setTimeout(() => SFX.coin(), 600);
}

function results(root, E, ans, okv, r, secs) {
  root.innerHTML = '';
  const nOk = okv.filter(Boolean).length;
  const el = h(`<section class="view exam-res">
    <div class="card gradebox ${r.grade >= 4 ? 'g-ok' : 'g-bad'}"><small>Tu nota</small><b>${fmt(r.grade).replace(/^(\d)$/, '$1,0')}</b>
      <span>${nOk}/12 correctas · ${clock(secs * 1000)} min</span><span class="small">+${r.xp} XP ${r.coins ? `· +${r.coins} 🪙` : '· (sin monedas: intento muy rápido o muy seguido)'}</span></div>
    <div class="row"><button class="btn primary again">Otro simulacro</button><button class="btn home">Inicio</button></div>
    <h3>Revisión</h3><div class="review"></div></section>`);
  E.qs.forEach((q, i) => {
    const c = h(`<div class="card rev ${okv[i] ? 'rev-ok' : 'rev-bad'}"><small class="muted">${i + 1}. ${okv[i] ? '✓ Correcta' : ans[i] === null ? '— Sin responder' : '✗ Incorrecta'}</small></div>`);
    const v = mcqView(q, { reveal: false }); $$('.opt', v).forEach((b, j) => { b.disabled = true; if (j === q.correct) b.classList.add('right'); if (j === ans[i] && j !== q.correct) b.classList.add('wrong'); });
    showExplain(v, q, okv[i]); if (okv[i]) $('details', v)?.removeAttribute('open');
    c.append(v); $('.review', el).append(c);
  });
  $('.again', el).onclick = () => go('exam');
  $('.home', el).onclick = () => go('home');
  root.append(el); tex(el); celebrate(r.grade, r.coins);
}

function runDev(root) {
  const E = buildDevExam();
  const t0 = Date.now(), end = t0 + E.minutes * 60e3;
  let done = false;
  const el = h(`<section class="view exam-run"><div class="exam-bar"><b class="clock">${E.minutes}:00</b><span class="grow small muted">Simulacro de desarrollo · 3 ejercicios</span><button class="btn sm gold submit">Entregar</button></div><div class="exs"></div>
    <div class="row end"><button class="btn gold submit2">Entregar certamen</button></div></section>`);
  const views = E.exs.map((ex, i) => { const v = devView(ex, { exam: true }); const c = h(`<div class="card"><h3>Ejercicio ${i + 1}</h3></div>`); c.append(v); $('.exs', el).append(c); return v; });
  const ask = async () => { if (await confirmBox('¿Entregar el certamen?', 'Se corregirán los 12 resultados.', 'Entregar')) finish(); };
  $('.submit', el).onclick = ask; $('.submit2', el).onclick = ask;
  setGuard(async () => done || await confirmBox('¿Salir del certamen?', 'Si sales, el intento se pierde.', 'Salir'));
  timer = setInterval(() => { const left = end - Date.now(); $('.clock', el).textContent = clock(left); $('.clock', el).classList.toggle('hurry', left < 120e3); if (left <= 0) finish(); }, 1000);
  const finish = async () => {
    if (done) return; done = true; clearInterval(timer); setGuard(null);
    const res = views.map(v => v.grade());
    const nOk = res.reduce((a, r) => a + r.ok, 0), total = res.reduce((a, r) => a + r.total, 0);
    E.exs.forEach((ex, i) => res[i].parts.forEach(ok => topicStat(ex.topic, ok)));
    const secs = Math.round((Date.now() - t0) / 1000), lv = level().lv;
    mission('exam'); mission('dev', 3); S.devDone += 3;
    let r = { grade: gradeCL(nOk, total), coins: 0, xp: nOk * 15 };
    try { r = await NET.submitExam('desarrollo', nOk, total, secs); } catch (e) { toast('No se guardó en el servidor', e.message, '!', 'bad'); }
    save(); afterProgress(lv);
    const box = h(`<div class="card gradebox ${r.grade >= 4 ? 'g-ok' : 'g-bad'}"><small>Tu nota</small><b>${fmt(r.grade).replace(/^(\d)$/, '$1,0')}</b><span>${nOk}/${total} resultados · ${clock(secs * 1000)} min</span><span class="small">+${r.xp} XP ${r.coins ? `· +${r.coins} 🪙` : ''}</span><div class="row"><button class="btn primary">Volver a simulacros</button></div></div>`);
    $('button', box).onclick = () => go('exam');
    $('.exam-bar', el).replaceWith(box); $('.submit2', el).remove();
    window.scrollTo(0, 0); celebrate(r.grade, r.coins);
  };
  root.append(el);
  return { leave: () => clearInterval(timer) };
}
