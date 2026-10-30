// Ayudas mínimas de DOM (sin frameworks).
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
export { esc } from './util.js';

// Fórmulas con KaTeX (si no cargó el CDN, se ve el texto LaTeX tal cual).
export function tex(el) {
  if (!el || !window.renderMathInElement) return;
  try {
    window.renderMathInElement(el, {
      delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
      throwOnError: false,
    });
  } catch (e) { /* fórmula mal escrita: se deja como texto */ }
}

export function overlay(content, { dismiss = true, cls = '' } = {}) {
  const ov = h(`<div class="overlay ${cls}" role="dialog" aria-modal="true"></div>`);
  ov.append(content);
  if (dismiss) ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  document.body.append(ov);
  tex(ov);
  return ov;
}

export function confirmBox(title, body, okText = 'Confirmar') {
  return new Promise((res) => {
    const box = h(`<div class="box"><h3></h3><p class="muted"></p><div class="row end"><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok></button></div></div>`);
    box.querySelector('h3').textContent = title;
    box.querySelector('p').textContent = body;
    box.querySelector('[data-ok]').textContent = okText;
    const ov = overlay(box);
    box.querySelector('[data-no]').onclick = () => { ov.remove(); res(false); };
    box.querySelector('[data-ok]').onclick = () => { ov.remove(); res(true); };
  });
}

export function promptBox(title, body, { value = '', type = 'text', placeholder = '', okText = 'Aceptar' } = {}) {
  return new Promise((res) => {
    const box = h(`<form class="box"><h3></h3><p class="muted small"></p><input class="input" required><div class="row end"><button type="button" class="btn ghost" data-no>Cancelar</button><button class="btn primary" type="submit"></button></div></form>`);
    box.querySelector('h3').textContent = title;
    box.querySelector('p').textContent = body;
    const inp = box.querySelector('input'); inp.type = type; inp.value = value; inp.placeholder = placeholder;
    box.querySelector('[type=submit]').textContent = okText;
    const ov = overlay(box);
    box.querySelector('[data-no]').onclick = () => { ov.remove(); res(null); };
    box.onsubmit = (e) => { e.preventDefault(); ov.remove(); res(inp.value); };
    setTimeout(() => inp.focus(), 30);
  });
}
