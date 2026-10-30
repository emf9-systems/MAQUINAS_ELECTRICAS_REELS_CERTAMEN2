// Navegación entre pantallas con #hash (el botón "atrás" del celular funciona).
const views = {};
let current = null, currentName = '', guard = null;
export const register = (name, mod) => { views[name] = mod; };
export const viewName = () => currentName;
// Un modo (ej. certamen en curso) puede pedir confirmación antes de salir.
export const setGuard = (fn) => { guard = fn; };

export function go(name, params = {}) {
  const q = new URLSearchParams(params).toString();
  const hash = '#' + name + (q ? '?' + q : '');
  if (location.hash === hash) show(name, params); else location.hash = hash;
}
async function show(name, params) {
  if (guard && !(await guard())) { history.replaceState(null, '', '#' + currentName); return; }
  guard = null;
  current?.leave?.();
  document.querySelectorAll('.overlay').forEach(o => o.remove());
  const root = document.getElementById('view');
  root.innerHTML = ''; root.scrollTop = 0; window.scrollTo(0, 0);
  currentName = name;
  document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
  current = views[name]?.render(root, params) || null;
}
export function start(def = 'home') {
  const parse = () => { const [n, q] = location.hash.slice(1).split('?'); return [views[n] ? n : def, Object.fromEntries(new URLSearchParams(q || ''))]; };
  addEventListener('hashchange', () => show(...parse()));
  show(...parse());
}
export const refreshView = () => current?.refresh?.();
