// Piezas reutilizables: pregunta de alternativas, ejercicio de desarrollo, carta y avatar.
import { h, $, $$, esc, tex, overlay } from './dom.js';
import { parseNum, fmt, rng } from './util.js';
import { checkNumeric, unitTxt } from './engine/mcq.js';
import { CARD, RARITY } from './data/catalog.js';
import { Media } from './fx.js';
import { S } from './state.js';
import { NET } from './backend.js';
import { TOPIC } from './content/lessons.js';

const LETTERS = 'ABCD';

// ---------------------------------------------------------------- alternativas
// item: { q, options[], correct, context?, steps?[], exp?, topic, title? }
// opts: { onAnswer(ok, el, ev), reveal: true, exam: false (en examen no se muestra si acertó) }
export function mcqView(item, opts = {}) {
  const el = h(`<div class="mcq">
    ${item.topic ? `<div class="tags"><span class="tag">${esc(TOPIC[item.topic]?.short || '')}</span>${item.title ? `<span class="tag ghost">${esc(item.title)}</span>` : ''}</div>` : ''}
    ${item.context ? `<p class="context">${item.context}</p>` : ''}
    <p class="q">${item.q}</p>
    <div class="opts"></div>
    <div class="explain" hidden></div>
  </div>`);
  const box = $('.opts', el);
  item.options.forEach((o, i) => {
    const b = h(`<button class="opt" type="button"><span class="letter">${LETTERS[i]}</span><span class="otext"></span></button>`);
    $('.otext', b).innerHTML = /\\\(/.test(o) ? o : esc(o);
    if (opts.selected === i) b.classList.add('picked');
    b.onclick = (ev) => {
      if (el.dataset.done && !opts.exam) return;
      if (opts.exam) { $$('.opt', box).forEach(x => x.classList.remove('picked')); b.classList.add('picked'); opts.onPick?.(i); return; }
      el.dataset.done = '1';
      const ok = i === item.correct;
      $$('.opt', box).forEach((x, j) => { x.disabled = true; if (j === item.correct) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      if (opts.reveal !== false) showExplain(el, item, ok);
      opts.onAnswer?.(ok, el, ev);
    };
    box.append(b);
  });
  tex(el);
  return el;
}
export function showExplain(el, item, ok) {
  const ex = $('.explain', el); ex.hidden = false;
  ex.innerHTML = `<b class="${ok ? 'ok' : 'bad'}">${ok ? '¡Correcto!' : 'Incorrecto.'}</b> `;
  if (item.exp) ex.append(h(`<span>${esc(item.exp)}</span>`));
  if (item.steps?.length) ex.append(stepsView(item.steps, !ok));
  tex(ex);
}
export function stepsView(steps, open = true) {
  const d = h(`<details class="steps" ${open ? 'open' : ''}><summary>Ver desarrollo paso a paso</summary><ol></ol></details>`);
  steps.forEach(s => $('ol', d).append(h(`<li>${s}</li>`)));
  return d;
}

// Pregunta teórica → item de alternativas barajado.
export function conceptItem(c, seed = Math.random() * 1e9) {
  const r = rng(seed >>> 0);
  const order = r.shuffle([0, 1, 2, 3]);
  return { kind: 'concept', topic: c.topic, q: esc(c.q), options: order.map(i => c.opts[i]), correct: order.indexOf(0), exp: c.exp, id: c.id };
}
export function tfItem(t) {
  return { kind: 'tf', topic: t.topic, q: '¿Verdadero o falso? ' + esc(t.q), options: ['Verdadero', 'Falso'], correct: t.ans ? 0 : 1, exp: t.exp, id: t.id };
}

// ---------------------------------------------------------------- desarrollo escrito
// Muestra un ejercicio con: cuadro para escribir el desarrollo y una casilla de resultado por parte.
// opts: { onDone({ok, total, parts:[bool], text}), exam: false, onChange(state) }
export function devView(ex, opts = {}) {
  const el = h(`<div class="dev">
    <div class="tags"><span class="tag">${esc(TOPIC[ex.topic]?.short || '')}</span><span class="tag ghost">${esc(ex.title)}</span>${ex.fixed ? `<span class="tag gold">Guía ${ex.guide} · Ej. ${ex.n}</span>` : ''}</div>
    <p class="context">${ex.text}</p>
    ${ex.note ? `<p class="small muted">Nota: ${esc(ex.note)}</p>` : ''}
    <label class="lbl">Tu desarrollo (escríbelo como en la hoja: datos, fórmulas y despejes)
      <textarea class="input devtext" rows="5" placeholder="Ej: If = V/Rf = 240/200 = 1,2 A&#10;Ia = IL − If = 35 − 1,2 = 33,8 A&#10;…"></textarea></label>
    <div class="parts"></div>
    ${opts.exam ? '' : '<div class="row end"><button class="btn primary check">Revisar mis resultados</button></div>'}
    <div class="devres" hidden></div>
  </div>`);
  const parts = $('.parts', el);
  ex.parts.forEach((p, i) => {
    const row = h(`<div class="part"><div class="pq"><b>${i + 1}.</b> ${p.q}</div>
      <div class="pin"><input class="input num" inputmode="decimal" autocomplete="off" placeholder="Resultado"><span class="unit">${esc(p.unit || '')}</span><span class="mark"></span></div>
      <div class="psol" hidden></div></div>`);
    if (opts.values?.[i] !== undefined) $('input', row).value = opts.values[i];
    $('input', row).addEventListener('input', () => opts.onChange?.(read()));
    parts.append(row);
  });
  if (opts.text) $('.devtext', el).value = opts.text;
  $('.devtext', el).addEventListener('input', () => opts.onChange?.(read()));
  const read = () => ({ text: $('.devtext', el).value, values: $$('.part input', el).map(i => i.value) });
  const grade = () => {
    const st = read();
    const res = ex.parts.map((p, i) => checkNumeric(p, parseNum(st.values[i])));
    $$('.part', el).forEach((row, i) => {
      const ok = res[i], p = ex.parts[i];
      row.classList.toggle('ok', ok); row.classList.toggle('bad', !ok);
      $('.mark', row).textContent = ok ? '✓' : '✗';
      $('input', row).disabled = true;
      const sol = $('.psol', row); sol.hidden = false;
      sol.innerHTML = `<div class="small">Respuesta: <b>${fmt(p.ans)}${unitTxt(p.unit)}</b>${ok ? '' : st.values[i] ? ` · tú: ${esc(st.values[i])}` : ' · sin respuesta'}</div>`;
      sol.append(stepsView(p.steps, !ok));
    });
    $('.devtext', el).readOnly = true;
    const nOk = res.filter(Boolean).length;
    const box = $('.devres', el); box.hidden = false;
    const wrote = st.text.trim().length >= 20;
    box.innerHTML = `<b>${nOk}/${res.length} resultados correctos.</b> ${wrote ? 'Compara tu desarrollo con la pauta de cada parte.' : '<span class="muted">Tip: escribir el desarrollo te da el doble de XP y es lo que te piden en la prueba.</span>'}
      <div class="selfcheck">¿Tu desarrollo coincide con la pauta? <button class="btn sm" data-v="2">Sí</button><button class="btn sm" data-v="1">En parte</button><button class="btn sm" data-v="0">No</button></div>`;
    $$('.selfcheck button', box).forEach(b => b.onclick = () => { $$('.selfcheck button', box).forEach(x => x.disabled = true); b.classList.add('primary'); opts.onSelf?.(+b.dataset.v); });
    tex(el);
    const out = { ok: nOk, total: res.length, parts: res, text: st.text, wrote };
    opts.onDone?.(out);
    return out;
  };
  const chk = $('.check', el); if (chk) chk.onclick = () => { chk.remove(); grade(); };
  tex(el);
  el.grade = grade; el.read = read;
  return el;
}

// ---------------------------------------------------------------- cartas
// Las miniaturas usan la imagen fija (liviana); la carta grande usa la animada.
// Cartas indecentes: con blur para las cuentas decentes (siempre) y para las indecentes en miniatura,
// salvo que hayan desactivado el blur en Ajustes.
export const spicyBlur = (c, small) => c.spicy && (!NET.indecente || (small && !S.settings.unblur));
export function cardView(id, { qty = null, small = false, locked = false, flip = false, isNew = false } = {}) {
  const c = CARD[id]; const r = RARITY[c.rarity];
  const art = Media.card(id) || (small ? c.thumb : c.art);
  const blur = spicyBlur(c, small);
  const el = h(`<div class="card-tcg r-${c.rarity} ${small ? 'small' : ''} ${locked ? 'locked' : ''} ${flip ? 'face-down' : ''} ${c.spicy ? 'spicy' : ''} ${blur ? 'spicy-blur' : ''}" style="--rc:${r.color}" data-id="${id}">
    <div class="inner">
      <div class="front">
        <div class="art">${art ? `<img src="${esc(art)}" alt="" loading="lazy">` : `<div class="placeholder"><span>${String(c.n).padStart(3, '0')}</span><small>arte pendiente</small></div>`}</div>
        <div class="meta"><b class="cname">${esc(locked ? '???' : c.name)}</b><small>${esc(c.set)} · ${r.name}</small></div>
        ${qty !== null && qty > 0 ? `<span class="qty">×${qty}</span>` : ''}
        ${isNew ? '<span class="new">¡NUEVA!</span>' : ''}
        ${c.spicy ? '<span class="spicy-tag" title="Carta indecente">🔞</span>' : ''}
      </div>
      <div class="back"><span>⚡</span></div>
    </div>
  </div>`);
  return el;
}

// ---------------------------------------------------------------- avatar
export function avatarView(url, name = '?', accent = '#ff6b4a', size = 40) {
  const el = h(`<span class="avatar" style="--ac:${esc(accent)};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px"></span>`);
  if (url) { const img = new Image(); img.src = url; img.alt = ''; img.onerror = () => { img.remove(); el.textContent = initials(name); }; el.append(img); }
  else el.textContent = initials(name);
  return el;
}
const initials = (n) => String(n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

// Recorta al centro y comprime la foto a 256×256 WebP (≈20–40 KB).
export async function squareImage(file, size = 256) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas'); c.width = c.height = size;
  c.getContext('2d').drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
  const blob = await new Promise(res => c.toBlob(res, 'image/webp', 0.85));
  if (blob && blob.type === 'image/webp') return blob;
  return await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
}

// ---------------------------------------------------------------- decente / indecente
// Pregunta antes de crear la cuenta (o desde Ajustes). Devuelve true (indecente), false (decente) o null (cerró).
// upgrade=true: la cuenta ya es decente y se está pasando al lado indecente.
export function decencyDialog({ upgrade = false } = {}) {
  return new Promise((resolve) => {
    const box = h(`<div class="box decency">
      <h2>${upgrade ? '😈 ¿Pasarte al lado indecente?' : 'Antes de empezar: ¿decente o indecente?'}</h2>
      <p>Las cartas vienen en dos series. Las <b>decentes</b> son para todos. Las <b>indecentes</b> son monas <b>sugerentes</b> (ropa reveladora, poses provocativas).</p>
      <div class="dec-opts">
        ${upgrade ? '' : `<button class="dec-opt dec-good" type="button"><span>😇</span><b>Soy decente</b><small>Sobres, mercado e intercambios solo con cartas decentes. Puedes cambiar después en tu perfil.</small></button>`}
        <div class="dec-opt dec-bad"><span>😈</span><b>Soy indecente</b><small>También te salen cartas indecentes en los sobres y puedes comerciarlas. Sus miniaturas tienen blur (lo puedes quitar en Ajustes).</small>
          <label class="check"><input type="checkbox" class="age"> Tengo 18 años o más y quiero ver este contenido.</label>
          <p class="small warn">⚠️ Esta elección <b>no se puede deshacer</b>, y el ranking muestra quién es indecente.</p>
          <button class="btn bad-btn go-bad" type="button" disabled>Sí, soy indecente</button></div>
      </div>
      <div class="row end"><button class="btn ghost sm cancel" type="button">${upgrade ? 'Mejor no' : 'Volver'}</button></div></div>`);
    const ov = overlay(box, { dismiss: false });
    const done = (v) => { ov.remove(); resolve(v); };
    const age = $('.age', box), go = $('.go-bad', box);
    age.onchange = () => { go.disabled = !age.checked; };
    go.onclick = () => done(true);
    const good = $('.dec-good', box); if (good) good.onclick = () => done(false);
    $('.cancel', box).onclick = () => done(null);
  });
}

// Etiqueta para el ranking y los perfiles.
export const decencyBadge = (ind) => ind ? '<span class="dbadge ind" title="Indecente">😈 indecente</span>' : '<span class="dbadge dec" title="Decente">😇 decente</span>';
