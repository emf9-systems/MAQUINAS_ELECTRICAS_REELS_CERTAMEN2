import { h, $, $$, esc, tex } from '../dom.js';
import { S, save, mission } from '../state.js';
import { TOPICS, TOPIC, LESSONS } from '../content/lessons.js';
import { generate } from '../content/generators.js';
import { topicQuiz } from '../engine/pool.js';
import { mcqView, stepsView } from '../components.js';
import { answer, afterProgress } from '../game.js';
import { level } from '../state.js';
import { go } from '../router.js';
import { fmt, newSeed } from '../util.js';
import { unitTxt } from '../engine/mcq.js';
import { banner, confetti, SFX } from '../fx.js';
import { CONCEPTS } from '../content/concepts.js';
import { TEMPLATES } from '../content/generators.js';
import { GUIDE } from '../content/guide.js';

export function render(root, params) {
  if (params.topic && LESSONS[params.topic]) return lesson(root, params.topic);
  const el = h(`<section class="view learn">
    <h2>Aprender</h2>
    <p class="muted">Ruta recomendada: sigue el orden. Cada lección explica la idea, las fórmulas del formulario, una receta paso a paso, los errores típicos, un ejemplo resuelto y un mini test. Al aprobar el mini test (3 de 5) la lección queda completa.</p>
    <div class="path"></div>
    <div class="card"><h3>📄 Formulario del certamen</h3><p class="small muted">Todas las fórmulas del formulario oficial, agrupadas por máquina.</p><button class="btn formulario">Ver formulario</button></div>
  </section>`);
  const path = $('.path', el);
  TOPICS.forEach((t, i) => {
    const st = S.lessons[t.id] || {};
    const nQ = CONCEPTS.filter(c => c.topic === t.id).length, nT = TEMPLATES.filter(x => x.topic === t.id).length, nG = GUIDE.filter(g => g.topic === t.id).length;
    const b = h(`<button class="lesson-node ${st.done ? 'done' : ''}"><span class="num">${st.done ? '✓' : i + 1}</span><span class="ic">${t.icon}</span><span class="grow"><b>${esc(t.name)}</b><small class="muted">${nQ} preguntas teóricas · ${nT} tipos de ejercicio${nG ? ` · ${nG} de la guía` : ''}</small></span><span>›</span></button>`);
    b.onclick = () => go('learn', { topic: t.id });
    path.append(b);
  });
  $('.formulario', el).onclick = () => formulario(root);
  root.append(el);
}

function lesson(root, id) {
  const t = TOPIC[id], L = LESSONS[id];
  const el = h(`<section class="view lesson">
    <button class="btn ghost sm back">‹ Lecciones</button>
    <h2>${t.icon} ${esc(t.name)}</h2>
    <div class="card"><h3>💡 La idea</h3><div class="idea"></div></div>
    <div class="card"><h3>🧮 Fórmulas</h3><table class="ftable"></table></div>
    <div class="card"><h3>🪜 Receta paso a paso</h3><ol class="method"></ol></div>
    <div class="card warn"><h3>⚠️ Errores típicos</h3><ul class="traps"></ul></div>
    <div class="card"><h3>🧪 Ejemplo resuelto</h3><p class="small muted">Lee el enunciado, intenta cada parte en tu cuaderno y después revela el paso.</p><div class="example"></div><div class="row"><button class="btn other">Otro ejemplo</button><button class="btn primary try">Resolverlo yo (desarrollo)</button></div></div>
    <div class="card"><h3>✅ Mini test (5 preguntas)</h3><div class="quiz"></div></div>
  </section>`);
  $('.back', el).onclick = () => go('learn');
  $('.idea', el).innerHTML = L.idea;
  for (const [n, f] of L.formulas) $('.ftable', el).append(h(`<tr><th>${esc(n)}</th><td>${f}</td></tr>`));
  for (const m of L.method) $('.method', el).append(h(`<li>${esc(m)}</li>`));
  for (const m of L.traps) $('.traps', el).append(h(`<li>${esc(m)}</li>`));
  const S0 = S.lessons[id] || (S.lessons[id] = {}); S0.seen = true; save();

  const exBox = $('.example', el);
  const drawExample = () => {
    exBox.innerHTML = '';
    const ex = generate(L.example, newSeed());
    exBox.append(h(`<p class="context">${ex.text}</p>`));
    ex.parts.forEach((p, i) => {
      const row = h(`<div class="wpart"><p><b>${i + 1}.</b> ${p.q}</p><button class="btn sm">Revelar</button><div class="sol" hidden></div></div>`);
      $('button', row).onclick = (e) => { e.target.remove(); const s = $('.sol', row); s.hidden = false; s.append(stepsView(p.steps, true)); s.append(h(`<p class="answer">= <b>${fmt(p.ans)}${unitTxt(p.unit)}</b></p>`)); tex(s); };
      exBox.append(row);
    });
    tex(exBox);
  };
  drawExample();
  $('.other', el).onclick = drawExample;
  $('.try', el).onclick = () => go('practice', { mode: 'dev', tpl: L.example });

  // mini test
  const qz = $('.quiz', el);
  const drawQuiz = () => {
    qz.innerHTML = '';
    const qs = topicQuiz(id, 5); let i = 0, ok = 0;
    const next = () => {
      qz.innerHTML = '';
      if (i >= qs.length) {
        const pass = ok >= 3;
        qz.append(h(`<div class="result ${pass ? 'ok' : 'bad'}"><b>${ok}/5</b> ${pass ? '¡Lección completada!' : 'Repasa la receta y los errores típicos, y vuelve a intentarlo.'}</div>`));
        if (pass && !S0.done) { const lv = level().lv; S0.done = true; mission('lesson'); answer('lesson', true); banner('¡LECCIÓN COMPLETA!', t.short); confetti(innerWidth / 2, innerHeight / 2, 80); SFX.fanfare(); afterProgress(lv); }
        S0.quiz = Math.max(S0.quiz || 0, ok); save();
        const again = h('<button class="btn">Otro mini test</button>'); again.onclick = drawQuiz; qz.append(again);
        return;
      }
      qz.append(h(`<small class="muted">Pregunta ${i + 1} de 5</small>`));
      const v = mcqView(qs[i], { onAnswer: (good, _el, ev) => { if (good) ok++; answer('mcq', good, { ev, topic: id }); const n = h('<button class="btn primary">Siguiente ›</button>'); n.onclick = () => { i++; next(); }; qz.append(n); } });
      qz.append(v);
    };
    next();
  };
  drawQuiz();
  root.append(el);
  tex(el);
}

// Formulario completo (transcrito del PDF "Formulario C2")
const FORM = [
  ['Máquina de corriente continua', [
    ['Voltaje de armadura', 'V_a = R_a I_a + V_{rot}'], ['Voltaje de campo', 'V_f = R_f I_f'], ['Voltaje del rotor', 'V_{rot} = G_{fq} I_f \\omega'],
    ['Torque eléctrico', 'T_{elect} = G_{fq} I_f I_a'], ['Rendimiento', '\\eta = \\dfrac{P_{salida}}{P_{entrada}} = \\dfrac{P_{útil}}{P_{consumida}}'],
    ['Potencias', 'P_{consumida} = P_{útil} + P_{pérdidas}'], ['Pérdidas', 'P_{pérdidas} = P_{mec} + P_{mag} + P_{cu,R} + P_{cu,E}']]],
  ['Máquina sincrónica', [
    ['Cobre del estator', 'P_{PCE} = 3I_a^2R_a'], ['Cobre del rotor', 'P_{PCR} = I_f^2R_f'], ['Velocidad mecánica', 'n_m = \\dfrac{60 f_{e}}{PP} = \\dfrac{120 f_{e}}{P}']]],
  ['Máquina asincrónica (inducción)', [
    ['Velocidad sincrónica', 'n_{sinc} = \\dfrac{120 f_e}{P} = \\dfrac{60 f_e}{PP}'], ['Deslizamiento', 's = \\dfrac{n_{sinc} - n_m}{n_{sinc}}\\cdot 100\\%'],
    ['Frecuencia del rotor', 'f_r = s f_e = \\dfrac{P}{120}(n_{sinc} - n_m)'], ['Cobre del estator', 'P_{PCE} = 3I_1^2R_1'], ['Núcleo', 'P_{núcleo} = \\dfrac{3E_1^2}{R_c}'],
    ['Entrehierro', 'P_{EH} = 3I_2^2\\dfrac{R_2}{s} = P_{entrada} - P_{PCE} - P_{núcleo}'], ['Cobre del rotor', 'P_{PCR} = 3I_2^2R_2 = s\\,P_{EH}'],
    ['Thevenin', 'V_{TH} \\approx V\\dfrac{X_M}{X_1+X_M},\\; R_{TH} \\approx R_1\\left(\\dfrac{X_M}{X_1+X_M}\\right)^2,\\; X_{TH}\\approx X_1'],
    ['Potencia convertida', 'P_{conv} = 3I_2^2R_2\\dfrac{1-s}{s} = (1-s)P_{EH}'], ['Potencia de salida', 'P_{salida} = \\tau_m\\,\\omega_m'],
    ['Torque inducido', '\\tau_{ind} = \\dfrac{P_{conv}}{\\omega_m} = \\dfrac{P_{EH}}{\\omega_{sinc}} = \\dfrac{3V_{TH}^2 R_2/s}{\\omega_{sinc}\\left[(R_{TH}+R_2/s)^2 + (X_{TH}+X_2)^2\\right]}'],
    ['s de torque máximo', 's_{máx} = \\dfrac{R_2}{\\sqrt{R_{TH}^2 + (X_{TH}+X_2)^2}}'], ['Torque máximo', '\\tau_{máx} = \\dfrac{3V_{TH}^2}{2\\omega_{sinc}\\left[R_{TH} + \\sqrt{R_{TH}^2 + (X_{TH}+X_2)^2}\\right]}'],
    ['Triángulo de potencia', 'S^2 = P^2 + Q^2,\\quad FP = \\cos\\varphi = \\dfrac{P}{S}'], ['Balance', 'P_{entrada} = P_{EH} + P_{cobre} + P_{núcleo},\\quad P_{EH} = P_{mec} + P_{salida} + P_{PCR}']]],
];
function formulario(root) {
  root.innerHTML = '';
  const el = h(`<section class="view"><button class="btn ghost sm back">‹ Aprender</button><h2>Formulario Certamen 2</h2>
    <p class="small muted">Nota: el formulario original escribe \\(P_{PCR} = s\\,P_{salida}\\); la relación exacta (y la que usan las láminas) es \\(P_{PCR} = s\\,P_{EH}\\). P = número de polos, PP = pares de polos.</p></section>`);
  for (const [title, rows] of FORM) {
    const c = h(`<div class="card"><h3>${esc(title)}</h3><table class="ftable"></table></div>`);
    for (const [n, f] of rows) $('table', c).append(h(`<tr><th>${esc(n)}</th><td>\\(${f}\\)</td></tr>`));
    el.append(c);
  }
  $('.back', el).onclick = () => go('learn');
  root.append(el); tex(el);
}
