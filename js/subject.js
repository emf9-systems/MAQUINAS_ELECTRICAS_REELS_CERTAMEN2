// Materia activa. Cada materia es como una app distinta dentro de la misma web: cambia
// lecciones, bancos de preguntas, ejercicios y simulacros, pero la cuenta, la XP, las
// monedas, el ranking y las cartas son los mismos.
export const SUBJECTS = [
  { id: 'pp', name: 'Preparación de Proyectos', short: 'Proyectos', icon: '📊', exam: 'Certamen 1', when: 'martes 3-11 · 16:05', app: 'Proyectos Rush' },
  { id: 'maq', name: 'Control de Máquinas Eléctricas', short: 'Máquinas', icon: '⚙️', exam: 'Certamen 2', when: 'lunes 2-11 · 12:30', app: 'Máquinas Rush' },
];
const KEY = 'materia';

function stored() {
  if (typeof window === 'undefined') return 'maq';            // Node (tests): el banco de Máquinas
  try {
    const q = new URLSearchParams(location.search).get(KEY);
    if (q && SUBJECTS.some(s => s.id === q)) { localStorage.setItem(KEY, q); return q; }
    return localStorage.getItem(KEY) || SUBJECTS[0].id;
  } catch { return SUBJECTS[0].id; }
}

export const SUBJECT = SUBJECTS.find(s => s.id === stored()) || SUBJECTS[0];

// Cambiar de materia recarga la página para armar todo con el contenido nuevo.
export function setSubject(id) {
  try { localStorage.setItem(KEY, id); } catch { }
  const u = new URL(location.href); u.searchParams.delete(KEY); u.hash = '#home';
  history.replaceState(null, '', u.toString()); location.reload();
}

// Reemplaza en su lugar el contenido de un arreglo u objeto exportado (así los módulos que
// ya lo importaron ven el contenido de la materia activa).
export function swapArray(target, src) { target.splice(0, target.length, ...src); }
export function swapObject(target, src) { for (const k of Object.keys(target)) delete target[k]; Object.assign(target, src); }
