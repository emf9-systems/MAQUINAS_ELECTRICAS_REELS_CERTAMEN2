// Preparación de Proyectos: generadores de ejercicios con números al azar.
// Siguen las convenciones del profesor (PP-1 y certamen 2024): resultados en UF y US$ con
// 2 decimales y en pesos sin decimales, depreciación lineal según la tabla del SII con valor
// de salvamento 0, préstamos de cuota fija, impuesto 25% y flujo de caja con escudos fiscales.
import { rng, money } from '../../util.js';

const P = (q, ans, unit, steps, wrong = []) => ({ q, ans, unit, steps, wrong });
const M = (x, u = 'UF') => money(x, u, true);             // dinero dentro de fórmulas
const Mt = (x, u = 'UF') => (u === '$' ? '$' : u + ' ') + money(x, u);  // dinero en texto
const pct = (x) => String(+(x * 100).toFixed(2)).replace('.', ',') + '%';
const D = (x, d = 4) => String(+x.toFixed(d)).replace('.', '{,}');

export const TEMPLATES = [];
const tpl = (id, topic, title, diff, gen) => { TEMPLATES.push({ id, topic, title, diff, gen }); };

// ---------------------------------------------------------------- herramientas
export const pmt = (P0, i, n) => P0 * i * (1 + i) ** n / ((1 + i) ** n - 1);

// Tabla del SII (extracto que usa el curso): [nombre, vida útil normal, depreciación acelerada]
export const SII = {
  galpon: ['Galpones de madera o estructura metálica', 20, 6],
  constr: ['Construcciones con estructura de acero', 80, 26],
  edif: ['Edificios fábricas de albañilería y estructura metálica', 40, 13],
  instal: ['Instalaciones en general (eléctricas, de oficina, etc.)', 10, 3],
  camion: ['Camiones de uso general', 7, 2],
  camioneta: ['Camionetas y jeeps', 7, 2],
  auto: ['Automóviles', 7, 2],
  maq: ['Maquinarias y equipos en general', 15, 5],
  herrp: ['Herramientas pesadas', 8, 2],
  herrl: ['Herramientas livianas', 3, 1],
  aire: ['Equipos de aire y cámaras de refrigeración', 10, 3],
  muebles: ['Muebles y enseres', 7, 2],
  comp: ['Sistemas computacionales, computadores y periféricos', 6, 2],
  oficina: ['Útiles de oficina (fotocopiadora, etc.)', 3, 1],
  audio: ['Equipo de audio y video', 6, 2],
};
const ASSETS = [
  ['Galpón de estructura metálica', 'galpon', [800, 2000]],
  ['Instalaciones eléctricas', 'instal', [200, 600]],
  ['Camión', 'camion', [600, 1200]],
  ['Camioneta', 'camioneta', [400, 900]],
  ['Automóvil', 'auto', [300, 600]],
  ['Máquina CNC', 'maq', [500, 1500]],
  ['Soldadora', 'maq', [100, 400]],
  ['Compresor', 'maq', [100, 300]],
  ['Herramientas pesadas', 'herrp', [100, 400]],
  ['Equipo de refrigeración', 'aire', [200, 600]],
  ['Escritorios', 'muebles', [100, 400]],
  ['Computadores', 'comp', [200, 700]],
];

// Depreciación lineal (VS = 0). Devuelve cuota anual, años que se deprecia dentro del horizonte,
// valor libro al final del horizonte y el resultado de la venta.
export function depAsset(a, H, mode) {
  if (!a.sii) return { n: 0, d: 0, years: 0, VL: a.price, dif: a.sale - a.price };
  const n = SII[a.sii][mode === 'acel' ? 2 : 1], d = a.price / n, years = Math.min(n, H);
  const VL = a.price - d * years;
  return { n, d, years, VL, dif: a.sale - VL };
}

// Flujo de caja completo con el esquema del curso (ver PP-1, lámina 63).
// ing[t] y cost[t] para t = 1..H (índice 0 sin usar).
export function projectFlow({ H, assets, mode, ing, cost, lp, iLP, iCP, tax = 0.25, rate }) {
  const inv = assets.reduce((s, a) => s + a.price, 0);
  const LP0 = inv * lp, cuota = lp ? pmt(LP0, iLP, H) : 0;
  const loan = [{ P: LP0 }];
  for (let t = 1; t <= H; t++) { const I = loan[t - 1].P * iLP, A = cuota - I; loan.push({ P: loan[t - 1].P - A, I, A, C: cuota }); }
  const deps = assets.map(a => depAsset(a, H, mode));
  const dep = [0]; for (let t = 1; t <= H; t++) dep.push(deps.reduce((s, x) => s + (t <= x.years ? x.d : 0), 0));
  const VLsum = deps.reduce((s, x) => s + x.VL, 0), difSum = deps.reduce((s, x) => s + x.dif, 0), saleSum = assets.reduce((s, a) => s + a.sale, 0);
  const rows = [{ t: 0, inv, total: -inv, LP: LP0, CP: 0, FN: -inv + LP0 }];
  let carry = 0, cpPrev = 0;
  for (let t = 1; t <= H; t++) {
    const U = ing[t] - cost[t], intLP = loan[t].I, intCP = cpPrev * iCP, dif = t === H ? difSum : 0, pea = carry;
    const UAI = U - intLP - intCP - dep[t] + dif - pea;
    const imp = UAI > 0 ? UAI * tax : 0, UDI = UAI - imp;
    const vl = t === H ? VLsum : 0;
    const total = UDI + pea + dep[t] - loan[t].A - cpPrev + vl;
    const CP = total < 0 && t < H ? -total : 0;
    rows.push({ t, ing: ing[t], cost: cost[t], U, intLP, intCP, dep: dep[t], dif, pea, UAI, imp, UDI, amLP: loan[t].A, amCP: cpPrev, vl, total, CP, FN: total + CP });
    carry = UAI < 0 ? -UAI : 0; cpPrev = CP;
  }
  let acc = 0, PRI = null;
  for (const r of rows) { r.VA = r.FN / (1 + rate) ** r.t; acc += r.VA; r.acc = acc; if (PRI === null && r.t > 0 && acc >= 0) PRI = r.t; }
  return { inv, LP0, cuota, loan, deps, dep, VLsum, difSum, saleSum, rows, VAN: acc, PRI, H, rate, tax, iLP, iCP, lp, mode };
}

// Tablas HTML para la pauta.
const tbl = (head, body) => `<div class="tscroll"><table class="mini"><tr>${head.map(x => `<th>${x}</th>`).join('')}</tr>${body.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</table></div>`;
const m2 = (x) => money(x);
export function depTable(F, assets) {
  const H = F.H;
  return tbl(['Activo', 'Compra', 'T', ...Array.from({ length: H }, (_, i) => i + 1), 'VL', 'Vta', 'Vta−VL'],
    [...assets.map((a, k) => { const d = F.deps[k]; return [a.name, m2(a.price), d.n || '—', ...Array.from({ length: H }, (_, i) => i < d.years ? m2(d.d) : ''), m2(d.VL), m2(a.sale), m2(d.dif)]; }),
      ['<b>Total</b>', m2(F.inv), '', ...F.dep.slice(1).map(m2), m2(F.VLsum), m2(F.saleSum), m2(F.difSum)]]);
}
export function loanTable(F) {
  return tbl(['Período', ...F.loan.map((_, t) => t)], [
    ['Principal', ...F.loan.map(l => m2(l.P))],
    ['Amortización', '', ...F.loan.slice(1).map(l => m2(l.A))],
    ['Interés', '', ...F.loan.slice(1).map(l => m2(l.I))],
    ['Cuota', '', ...F.loan.slice(1).map(l => m2(l.C))]]);
}
export function flowTable(F) {
  const R = F.rows, v = (k, s = 1) => R.map(r => r[k] === undefined || r[k] === 0 ? (r.t === 0 ? '' : '0,00') : m2(s * r[k]));
  return tbl(['', 'Año', ...R.map(r => r.t)], [
    ['+', 'Ingresos', ...v('ing')], ['−', 'Costos', ...v('cost')], ['=', 'Utilidad', ...v('U')],
    ['−', 'Intereses LP', ...v('intLP')], ['−', 'Intereses CP', ...v('intCP')], ['−', 'Depreciación', ...v('dep')],
    ['−/+', 'Dif. vta. activos − VL', ...v('dif')], ['−', 'Pérd. ejerc. anterior', ...v('pea')], ['=', 'Util. antes de impto.', ...v('UAI')],
    ['−', `Impuesto ${Math.round(F.tax * 100)}%`, ...v('imp')], ['=', 'Util. después de impto.', ...v('UDI')], ['+', 'Pérd. ejerc. anterior', ...v('pea')],
    ['+', 'Depreciación', ...v('dep')], ['−', 'Amortización LP', ...v('amLP')], ['−', 'Amortización CP', ...v('amCP')], ['+', 'Venta activos a VL', ...v('vl')],
    ['−', 'Inversiones', ...v('inv')], ['=', 'Total anual', ...v('total')], ['+', 'Crédito LP', ...v('LP')], ['+', 'Crédito CP', ...v('CP')],
    ['=', '<b>Flujo neto</b>', ...R.map(r => `<b>${m2(r.FN)}</b>`)], ['', 'Flujo actualizado', ...R.map(r => m2(r.VA))], ['', 'Flujo acumulado', ...R.map(r => m2(r.acc))]]);
}
export function assetList(assets, mode) {
  return tbl(['Activo', 'Compra', 'Venta al final', `Vida útil ${mode === 'acel' ? 'acelerada' : 'normal'} (SII)`],
    assets.map(a => [a.name, Mt(a.price), Mt(a.sale), a.sii ? SII[a.sii][mode === 'acel' ? 2 : 1] + ' años' : 'no se deprecia']));
}

// Las preguntas de un flujo de caja completo (sirven para la plantilla y para el certamen 2024).
export function flowParts(F, assets) {
  const R = F.rows, H = F.H, r1 = R[1], rH = R[H];
  const other = projectFlow({ ...F.input, mode: F.mode === 'acel' ? 'normal' : 'acel' });
  const out = [];
  const T0 = depTable(F, assets), TL = loanTable(F), TF = flowTable(F);
  out.push(P('¿Cuál es la inversión total del año 0?', F.inv, 'UF', [`Se suman todos los activos (el terreno también se compra, aunque no se deprecia): \\(I_0 = ${M(F.inv)}\\) UF.`],
    [F.inv - assets.filter(a => !a.sii).reduce((s, a) => s + a.price, 0), F.inv * (1 - F.lp), F.saleSum]));
  out.push(P(`¿De cuánto es el crédito de largo plazo (${pct(F.lp)} de la inversión)?`, F.LP0, 'UF', [`\\(LP = ${pct(F.lp).replace('%', '\\%')}\\cdot ${M(F.inv)} = ${M(F.LP0)}\\) UF. El inversionista pone el resto: \\(${M(F.inv - F.LP0)}\\) UF.`],
    [F.inv - F.LP0, F.LP0 * (1 + F.iLP), F.LP0 / H]));
  out.push(P('¿Cuál es la cuota fija anual del crédito LP?', F.cuota, 'UF', [
    `\\(C = P\\cdot\\dfrac{i(1+i)^n}{(1+i)^n-1} = ${M(F.LP0)}\\cdot\\dfrac{${D(F.iLP)}\\,(1+${D(F.iLP)})^{${H}}}{(1+${D(F.iLP)})^{${H}}-1} = ${M(F.cuota)}\\) UF`, TL],
    [F.LP0 / H, F.LP0 / H + F.LP0 * F.iLP, F.LP0 * (1 + F.iLP) ** H / H]));
  out.push(P('¿Cuánto interés LP se paga el año 1?', r1.intLP, 'UF', [`\\(I_1 = P_0\\cdot i = ${M(F.LP0)}\\cdot ${D(F.iLP)} = ${M(r1.intLP)}\\) UF`, `La amortización del año 1 es \\(C - I_1 = ${M(F.cuota)} - ${M(r1.intLP)} = ${M(r1.amLP)}\\) UF.`],
    [F.cuota * F.iLP, (F.LP0 / H) * F.iLP, F.inv * F.iLP]));
  out.push(P('¿Cuál es la depreciación total del año 1?', F.dep[1], 'UF', [`Depreciación lineal con VS = 0: \\(D = \\dfrac{\\text{Compra}}{\\text{vida útil}}\\) para cada activo (el terreno no se deprecia).`, T0],
    [other.dep[1], F.inv / H, F.dep[1] + assets.filter(a => !a.sii).reduce((s, a) => s + a.price, 0) / H]));
  out.push(P(`¿Cuál es el valor libro total de los activos al final del año ${H}?`, F.VLsum, 'UF', [`\\(VL = \\text{Compra} - \\text{depreciación acumulada}\\). Los activos con vida útil menor que ${H} años quedan en 0; el terreno queda a su valor de compra.`, T0],
    [other.VLsum, F.saleSum, F.VLsum - assets.filter(a => !a.sii).reduce((s, a) => s + a.price, 0)]));
  out.push(P(`¿Cuánto suma la diferencia (venta − valor libro) en el año ${H}?`, F.difSum, 'UF', [`\\(\\sum(\\text{Vta} - VL) = ${M(F.saleSum)} - ${M(F.VLsum)} = ${M(F.difSum)}\\) UF. Va antes del impuesto (si es ganancia paga impuesto) y después se suma el VL.`],
    [F.saleSum, -F.difSum, other.difSum]));
  out.push(P('¿Cuál es la utilidad antes de impuesto del año 1?', r1.UAI, 'UF', [
    `\\(UAI_1 = (${M(r1.ing)} - ${M(r1.cost)}) - ${M(r1.intLP)} - ${M(r1.intCP)} - ${M(r1.dep)} = ${M(r1.UAI)}\\) UF`,
    r1.UAI < 0 ? 'Como es negativa, ese año no se paga impuesto y la pérdida se descuenta el año siguiente (pérdida del ejercicio anterior).' : 'Es positiva, así que paga impuesto.'],
    [r1.U, r1.U - r1.dep, r1.U - r1.intLP]));
  const tY = [...R].reverse().find(x => x.imp > 0);
  out.push(P(`¿Cuánto impuesto (${Math.round(F.tax * 100)}%) se paga el año ${tY.t}?`, tY.imp, 'UF', [
    `\\(UAI_{${tY.t}} = ${M(tY.U)} - ${M(tY.intLP)} - ${M(tY.intCP)} - ${M(tY.dep)} ${tY.dif >= 0 ? '+' : '-'} ${M(Math.abs(tY.dif))} - ${M(tY.pea)} = ${M(tY.UAI)}\\) UF`,
    `\\(\\text{Impuesto} = ${D(F.tax, 2)}\\cdot ${M(tY.UAI)} = ${M(tY.imp)}\\) UF`],
    [tY.U * F.tax, (tY.UAI + tY.pea) * F.tax, tY.UAI * 0.27]));
  if (r1.CP > 0) out.push(P('El año 1 el total anual es negativo y el inversionista solo pone dinero en el año 0. ¿De cuánto es el crédito de corto plazo?', r1.CP, 'UF', [
    `El total anual del año 1 es \\(${M(r1.total)}\\) UF. El déficit se cubre con un crédito CP: \\(CP = ${M(r1.CP)}\\) UF, que se devuelve el año 2 con ${pct(F.iCP)} de interés (\\(${M(r1.CP * F.iCP)}\\) UF, que es escudo fiscal).`, TF],
    [r1.CP * (1 + F.iCP), -r1.U, r1.CP + r1.dep]));
  else out.push(P('¿Cuál es el flujo neto del año 1?', r1.FN, 'UF', [`\\(FN_1 = UDI + \\text{depreciación} - \\text{amortización LP} = ${M(r1.UDI)} + ${M(r1.dep)} - ${M(r1.amLP)} = ${M(r1.FN)}\\) UF`, TF],
    [r1.FN - r1.dep, r1.FN + r1.amLP, r1.FN + r1.imp]));
  out.push(P(`¿Cuál es el flujo neto del año ${H}?`, rH.FN, 'UF', [`En el último año se suma la venta de activos: la diferencia Vta−VL antes del impuesto y el VL (\\(${M(F.VLsum)}\\) UF) después.`, TF],
    [rH.FN - F.VLsum, rH.FN - rH.dep, rH.FN + rH.amLP]));
  const vanLP = R.reduce((s, x) => s + x.FN / (1 + F.iLP) ** x.t, 0), sum = R.reduce((s, x) => s + x.FN, 0);
  out.push(P(`¿Cuál es el VAN a la tasa del inversionista (${pct(F.rate)})?`, F.VAN, 'UF', [
    `\\(VAN = \\sum_{t=0}^{${H}} \\dfrac{FN_t}{(1+${D(F.rate)})^t} = ${R.map(x => x.t ? `\\dfrac{${M(x.FN)}}{${D(1 + F.rate)}^{${x.t}}}` : M(x.FN)).join(' + ').replace(/\+ -/g, '- ')}\\)`,
    `\\(VAN = ${M(F.VAN)}\\) UF ⇒ ${F.VAN >= 0 ? 'como VAN ≥ 0, el proyecto es recomendable.' : 'como VAN < 0, el proyecto no es recomendable.'}`],
    [vanLP, sum, F.VAN - R[0].FN]));
  if (F.PRI) out.push(P('¿En qué año se recupera la inversión (PRI)?', F.PRI, 'años', [`El PRI es el primer período en que el flujo actualizado acumulado es positivo: ${R.map(x => `año ${x.t}: ${m2(x.acc)}`).join('; ')}. ⇒ PRI = año ${F.PRI}.`],
    [F.PRI + 1, F.PRI > 1 ? F.PRI - 1 : F.PRI + 2, H + 1]));
  return out;
}

// ===================================================================== flujo de caja completo
tpl('pp_flujo', 'pp_flujo', 'Flujo de caja, VAN y PRI', 3, (r) => {
  for (let k = 0; k < 200; k++) {
    const H = r.pick([3, 3, 4, 4, 5]);
    const mode = r.pick(['normal', 'acel']);
    const pool = r.shuffle(ASSETS.slice()).slice(0, r.int(4, 6));
    const assets = [{ name: 'Terreno', sii: null, price: r.int(5, 20) * 100 }];
    for (const [name, sii, [lo, hi]] of pool) {
      const price = r.int(lo / 50, hi / 50) * 50;
      assets.push({ name, sii, price, sale: Math.round(price * r.pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.4]) / 10) * 10 });
    }
    assets[0].sale = assets[0].price;
    const inv = assets.reduce((s, a) => s + a.price, 0);
    const I1 = Math.round(inv * r.pick([0.05, 0.2, 0.4, 0.6, 0.8]) / 50) * 50 || 200, C1 = Math.round(inv * r.pick([0.2, 0.25, 0.3]) / 50) * 50;
    const addI = r.chance(0.5), gI = addI ? Math.round(inv * r.pick([0.3, 0.5, 0.8]) / 100) * 100 : r.pick([0.2, 0.3, 0.5]);
    const gC = r.pick([0.05, 0.1, 0.15, 0.2]);
    const ing = [0], cost = [0];
    for (let t = 1; t <= H; t++) { ing.push(addI ? I1 + gI * (t - 1) : I1 * (1 + gI) ** (t - 1)); cost.push(C1 * (1 + gC) ** (t - 1)); }
    const input = { H, assets, mode, ing, cost, lp: r.pick([0.3, 0.4, 0.5, 0.6]), iLP: r.pick([0.06, 0.07, 0.08, 0.1]), iCP: r.pick([0.1, 0.12]), tax: 0.25, rate: r.pick([0.1, 0.12, 0.15, 0.2]) };
    const F = projectFlow(input); F.input = input;
    const R = F.rows;
    if (R[H].total < 0 || !R.some(x => x.imp > 0) || Math.abs(F.VAN) < 20 || F.dep[1] === 0) continue;
    if (R.some(x => x.t && Math.abs(x.FN) < 1 && !x.CP)) continue;
    const text = `<p>Evalúe un proyecto con horizonte de <b>${H} años</b>. Inversiones del año 0 (en UF):</p>${assetList(assets, mode)}
<p>Ingresos: año 1 ${Mt(I1)}, y cada año ${addI ? `aumentan en ${Mt(gI)}` : `crecen ${pct(gI)}`}. Costos: año 1 ${Mt(C1)}, y crecen ${pct(gC)} anual.
Se financia un <b>${pct(input.lp)}</b> con un crédito LP a ${H} años en cuota fija al ${pct(input.iLP)}; los créditos de corto plazo cuestan ${pct(input.iCP)}.
El inversionista solo pone dinero en el año 0. Depreciación ${mode === 'acel' ? 'acelerada' : 'vida útil normal'}, impuesto 25% y tasa de descuento del inversionista ${pct(input.rate)}. Resultados en UF con 2 decimales.</p>`;
    return { text, parts: flowParts(F, assets), flow: F };
  }
  throw new Error('pp_flujo: no se encontró un caso válido');
});

// ===================================================================== matemática financiera
tpl('pp_interes', 'pp_interes', 'Interés simple y compuesto', 1, (r) => {
  const VP = r.pick([1000, 2000, 5000, 10000, 20000, 50000]), i = r.pick([0.04, 0.05, 0.06, 0.08, 0.1, 0.12]), n = r.int(2, 6);
  const VFs = VP * (1 + i * n), VFc = VP * (1 + i) ** n;
  return {
    text: `Se pide un préstamo de ${Mt(VP, 'US$')} a ${n} años con una tasa de ${pct(i)} anual.`,
    parts: [
      P('¿Cuánto se paga al final con interés simple?', VFs, 'US$', [`\\(VF = VP(1 + i\\,n) = ${M(VP, 'US$')}(1 + ${D(i)}\\cdot ${n}) = ${M(VFs, 'US$')}\\)`], [VFc, VP * i * n, VP * (1 + i)]),
      P('¿Cuánto interés se paga con interés simple?', VFs - VP, 'US$', [`\\(I = VF - VP = ${M(VFs, 'US$')} - ${M(VP, 'US$')} = ${M(VFs - VP, 'US$')}\\)`], [VFc - VP, VP * i, VFs]),
      P('¿Cuánto se paga al final con interés compuesto?', VFc, 'US$', [`\\(VF = VP(1+i)^n = ${M(VP, 'US$')}(1+${D(i)})^{${n}} = ${M(VFc, 'US$')}\\)`], [VFs, VP * (1 + i) ** (n - 1), VP * (1 + i * n) ** 2 / (1 + i * n)]),
      P('¿Cuánto interés se paga con interés compuesto?', VFc - VP, 'US$', [`\\(I = ${M(VFc, 'US$')} - ${M(VP, 'US$')} = ${M(VFc - VP, 'US$')}\\). Es mayor que con interés simple porque se cobra "interés sobre los intereses".`], [VFs - VP, VFc, (VFc - VP) / n]),
    ],
  };
});

tpl('pp_despeje', 'pp_interes', 'VF, VP, tasa y plazo (interés compuesto)', 2, (r) => {
  const VP = r.pick([1, 2, 3, 5, 8]) * 1e6, i = r.pick([0.01, 0.012, 0.015, 0.02, 0.025]), years = r.int(2, 5), n = years * 12;
  const VF = VP * (1 + i) ** n, goal = r.pick([1, 2, 5]) * 1e6, VP2 = goal / (1 + i) ** 12;
  const k = r.pick([2, 3, 4]), months = r.pick([12, 18, 24]), i3 = k ** (1 / months) - 1;
  const i4 = r.pick([0.02, 0.03, 0.04]), n4 = Math.log(k) / Math.log(1 + i4);
  return {
    text: `Una inversión capitaliza intereses con una tasa de ${pct(i)} mensual.`,
    parts: [
      P(`Si se depositan ${Mt(VP, '$')} durante ${years} años, ¿cuánto se retira al final?`, VF, '$', [`\\(n = ${years}\\cdot 12 = ${n}\\) meses`, `\\(VF = ${M(VP, '$')}\\,(1+${D(i)})^{${n}} = ${M(VF, '$')}\\)`], [VP * (1 + i * n), VP * (1 + i) ** years, VP * (1 + 12 * i) ** years * 1.04]),
      P(`¿Cuánto hay que invertir hoy para retirar ${Mt(goal, '$')} en un año?`, VP2, '$', [`\\(VP = \\dfrac{VF}{(1+i)^n} = \\dfrac{${M(goal, '$')}}{(1+${D(i)})^{12}} = ${M(VP2, '$')}\\)`], [goal / (1 + 12 * i), goal * (1 - i) ** 12 * 0.97, goal / (1 + i)]),
      P(`¿Qué tasa mensual multiplica por ${k} una inversión en ${months} meses?`, i3 * 100, '%', [`\\(i = \\left(\\dfrac{VF}{VP}\\right)^{1/n} - 1 = ${k}^{1/${months}} - 1 = ${D(i3)} = ${D(i3 * 100, 2)}\\%\\) mensual`], [(k - 1) / months * 100, (k ** (1 / (months / 12)) - 1) * 100 / 12, Math.log(k) / months * 100 * 1.15]),
      P(`¿En cuántos meses se multiplica por ${k} una inversión al ${pct(i4)} mensual?`, n4, 'meses', [`\\(n = \\dfrac{\\log(VF/VP)}{\\log(1+i)} = \\dfrac{\\log ${k}}{\\log ${D(1 + i4)}} = ${D(n4, 2)}\\) meses`], [(k - 1) / i4, Math.log(k) / i4 * 1.3, n4 / 12]),
    ],
  };
});

tpl('pp_cuota', 'pp_cuota', 'Cuota fija (payment)', 1, (r) => {
  const price = r.pick([5000, 7000, 8000, 10000, 12000, 15000]), i = r.pick([0.01, 0.015, 0.02, 0.025, 0.03]), years = r.int(2, 5), n = years * 12;
  const C = pmt(price, i, n), tot = C * n;
  const goal = r.pick([3, 5, 10]) * 1e6, i2 = r.pick([0.005, 0.008, 0.01]), n2 = r.pick([24, 36, 48]), A = goal * i2 / ((1 + i2) ** n2 - 1);
  return {
    text: `Un profesional quiere comprar un auto de ${Mt(price, 'US$')} y pagarlo en ${years} años en cuotas mensuales iguales con un interés de ${pct(i)} mensual.`,
    parts: [
      P('¿Cuántas cuotas paga?', n, 'cuotas', [`\\(n = ${years}\\cdot 12 = ${n}\\) (la tasa es mensual, así que el plazo también va en meses)`], [years, n / 2, n + 12]),
      P('¿Cuál es el valor de cada cuota?', C, 'US$', [`\\(C = P\\cdot\\dfrac{i(1+i)^n}{(1+i)^n - 1} = ${M(price, 'US$')}\\cdot\\dfrac{${D(i)}(1+${D(i)})^{${n}}}{(1+${D(i)})^{${n}} - 1} = ${M(C, 'US$')}\\)`], [price / n, price * (1 + i * n) / n, pmt(price, i * 12, years) / 12]),
      P('¿Cuánto paga en total?', tot, 'US$', [`\\(${n}\\cdot ${M(C, 'US$')} = ${M(tot, 'US$')}\\)`], [price, price * (1 + i) ** n, tot - price]),
      P('¿Cuánto paga en intereses?', tot - price, 'US$', [`\\(${M(tot, 'US$')} - ${M(price, 'US$')} = ${M(tot - price, 'US$')}\\)`], [price * i * n, tot, C - price / n]),
      P(`Otra persona quiere juntar ${Mt(goal, '$')} en ${n2} meses depositando una cuota fija al ${pct(i2)} mensual. ¿Cuánto debe depositar cada mes?`, A, '$', [`\\(C = VF\\cdot\\dfrac{i}{(1+i)^n - 1} = ${M(goal, '$')}\\cdot\\dfrac{${D(i2)}}{(1+${D(i2)})^{${n2}} - 1} = ${M(A, '$')}\\)`], [goal / n2, pmt(goal, i2, n2), goal / (1 + i2) ** n2 / n2]),
    ],
  };
});

tpl('pp_amort', 'pp_cuota', 'Tabla de amortización en cuota fija', 2, (r) => {
  const P0 = r.int(10, 60) * 100, i = r.pick([0.05, 0.06, 0.07, 0.08, 0.1]), n = r.int(3, 5);
  const C = pmt(P0, i, n), I1 = P0 * i, A1 = C - I1, P1 = P0 - A1, I2 = P1 * i, A2 = C - I2;
  const F = { loan: [{ P: P0 }] }; for (let t = 1; t <= n; t++) { const I = F.loan[t - 1].P * i, A = C - I; F.loan.push({ P: F.loan[t - 1].P - A, I, A, C }); }
  const TL = loanTable(F);
  return {
    text: `Un proyecto pide un crédito de ${Mt(P0)} a ${n} años, en cuotas anuales iguales, con interés de ${pct(i)} anual.`,
    parts: [
      P('¿Cuál es la cuota anual?', C, 'UF', [`\\(C = ${M(P0)}\\cdot\\dfrac{${D(i)}(1+${D(i)})^{${n}}}{(1+${D(i)})^{${n}}-1} = ${M(C)}\\)`, TL], [P0 / n, P0 / n + I1, P0 * (1 + i) ** n / n]),
      P('¿Cuánto interés se paga el año 1?', I1, 'UF', [`\\(I_1 = P_0\\cdot i = ${M(P0)}\\cdot ${D(i)} = ${M(I1)}\\)`], [C * i, (P0 / n) * i, C - P0 / n]),
      P('¿Cuánto se amortiza (capital) el año 1?', A1, 'UF', [`\\(A_1 = C - I_1 = ${M(C)} - ${M(I1)} = ${M(A1)}\\)`], [P0 / n, C, I1]),
      P('¿Cuál es la deuda (principal) al final del año 1?', P1, 'UF', [`\\(P_1 = P_0 - A_1 = ${M(P0)} - ${M(A1)} = ${M(P1)}\\)`], [P0 - C, P0 - P0 / n, P0 - I1]),
      P('¿Cuánto interés se paga el año 2?', I2, 'UF', [`\\(I_2 = P_1\\cdot i = ${M(P1)}\\cdot ${D(i)} = ${M(I2)}\\)`, TL], [I1, P0 * i - A1, (P0 - P0 / n) * i * 1.05]),
      P('¿Cuánto se amortiza el año 2?', A2, 'UF', [`\\(A_2 = C - I_2 = ${M(C)} - ${M(I2)} = ${M(A2)}\\)`], [A1, P0 / n, C - I1 * 0.9]),
    ],
  };
});

tpl('pp_gracia', 'pp_cuota', 'Crédito con período de gracia', 3, (r) => {
  const P0 = r.pick([1, 2, 3, 5]) * 1e6, i = r.pick([0.08, 0.1, 0.12]), g = r.int(1, 2), n = r.int(3, 4);
  const Ig = P0 * i, Cpay = pmt(P0, i, n), Pcap = P0 * (1 + i) ** g, Ccap = pmt(Pcap, i, n);
  return {
    text: `Se pide un préstamo de ${Mt(P0, '$')} con interés de ${pct(i)} anual. Se dan ${g} año${g > 1 ? 's' : ''} de gracia y después se paga en ${n} cuotas anuales iguales.`,
    parts: [
      P('Si durante la gracia se pagan los intereses, ¿cuánto se paga cada año de gracia?', Ig, '$', [`En la gracia no se paga capital. Si se pagan los intereses, la deuda se mantiene: \\(I = ${M(P0, '$')}\\cdot ${D(i)} = ${M(Ig, '$')}\\)`], [P0 / n, Cpay, Ig * g]),
      P('Con ese caso (intereses pagados en la gracia), ¿cuál es la cuota posterior?', Cpay, '$', [`La deuda sigue siendo \\(${M(P0, '$')}\\): \\(C = ${M(P0, '$')}\\cdot\\dfrac{${D(i)}(1+${D(i)})^{${n}}}{(1+${D(i)})^{${n}}-1} = ${M(Cpay, '$')}\\)`], [Ccap, P0 / n, pmt(P0, i, n + g)]),
      P('Si en la gracia NO se pagan intereses, ¿cuánto se debe al terminar la gracia?', Pcap, '$', [`Los intereses se suman a la deuda: \\(P_g = ${M(P0, '$')}(1+${D(i)})^{${g}} = ${M(Pcap, '$')}\\)`], [P0, P0 * (1 + i * g) * 1.02, P0 + Ig]),
      P('En ese caso (intereses capitalizados), ¿cuál es la cuota posterior?', Ccap, '$', [`\\(C = ${M(Pcap, '$')}\\cdot\\dfrac{${D(i)}(1+${D(i)})^{${n}}}{(1+${D(i)})^{${n}}-1} = ${M(Ccap, '$')}\\)`], [Cpay, Pcap / n, pmt(Pcap, i, n + g)]),
    ],
  };
});

// ===================================================================== depreciación
tpl('pp_dep', 'pp_depre', 'Depreciación y valor libro', 2, (r) => {
  for (let k = 0; k < 50; k++) {
    const H = r.int(3, 5), mode = r.pick(['normal', 'acel']);
    const pool = r.shuffle(ASSETS.slice()).slice(0, 4);
    const assets = [{ name: 'Terreno', sii: null, price: r.int(5, 15) * 100 }];
    for (const [name, sii, [lo, hi]] of pool) { const price = r.int(lo / 50, hi / 50) * 50; assets.push({ name, sii, price, sale: Math.round(price * r.pick([0.1, 0.2, 0.3, 0.4]) / 10) * 10 }); }
    assets[0].sale = assets[0].price;
    const F = projectFlow({ H, assets, mode, ing: Array(H + 1).fill(0), cost: Array(H + 1).fill(0), lp: 0, iLP: 0, iCP: 0, rate: 0.1 });
    const other = projectFlow({ H, assets, mode: mode === 'acel' ? 'normal' : 'acel', ing: Array(H + 1).fill(0), cost: Array(H + 1).fill(0), lp: 0, iLP: 0, iCP: 0, rate: 0.1 });
    const a = assets[1], d = F.deps[1], T0 = depTable(F, assets);
    if (F.dep[H] === 0 || F.difSum === 0 || F.dep[1] === F.dep[H]) continue;
    return {
      text: `<p>Un proyecto de ${H} años compra los siguientes activos (en UF). Use depreciación ${mode === 'acel' ? '<b>acelerada</b>' : '<b>vida útil normal</b>'} del SII, lineal y con valor de salvamento 0.</p>${assetList(assets, mode)}`,
      parts: [
        P(`¿Cuánto se deprecia por año ${a.name.toLowerCase().startsWith('e') || a.name.endsWith('s') ? 'los' : 'el/la'} ${a.name.toLowerCase()}?`, d.d, 'UF', [`\\(D = \\dfrac{${M(a.price)}}{${d.n}} = ${M(d.d)}\\) UF por año (durante ${d.n} años)`], [a.price / H, a.price / SII[a.sii][mode === 'acel' ? 1 : 2], (a.price - a.sale) / d.n]),
        P('¿Cuál es la depreciación total del año 1?', F.dep[1], 'UF', ['Se suma la depreciación de cada activo; el terreno no se deprecia.', T0], [other.dep[1], F.inv / H, F.dep[H]]),
        P(`¿Cuál es la depreciación total del año ${H}?`, F.dep[H], 'UF', [`Los activos cuya vida útil ya terminó dejan de depreciarse.`, T0], [F.dep[1], other.dep[H], F.dep[1] - F.dep[H]]),
        P(`¿Cuál es el valor libro total al final del año ${H}?`, F.VLsum, 'UF', [`\\(VL = \\text{Compra} - \\text{dep. acumulada}\\) (el terreno queda a su valor de compra).`, T0], [other.VLsum, F.saleSum, F.VLsum - assets[0].price]),
        P(`¿Cuánto suma la diferencia (venta − VL) en el año ${H}?`, F.difSum, 'UF', [`\\(\\sum(Vta - VL) = ${M(F.saleSum)} - ${M(F.VLsum)} = ${M(F.difSum)}\\)`, 'Si es positiva es una ganancia que paga impuesto; si es negativa es una pérdida que lo reduce.'], [F.saleSum, -F.difSum, other.difSum]),
      ],
    };
  }
  throw new Error('pp_dep');
});

tpl('pp_uf', 'pp_depre', 'Pasar pesos a UF y depreciar', 1, (r) => {
  const UF = r.pick([24537.42, 36789.36, 37850.12, 39120.55]);
  const items = r.shuffle([['Camioneta', 'camioneta', 12e6], ['Compresor', 'maq', 450e3], ['Computadores', 'comp', 320e3], ['Muebles', 'muebles', 230e3], ['Soldadora', 'maq', 140e3]]).slice(0, 2);
  const [a, b] = items.map(([n, s, p]) => ({ n, s, p: Math.round(p * r.pick([0.8, 1, 1.2, 1.5]) / 1e4) * 1e4 }));
  const ua = a.p / UF, ub = b.p / UF, mode = r.pick(['normal', 'acel']), na = SII[a.s][mode === 'acel' ? 2 : 1], nb = SII[b.s][mode === 'acel' ? 2 : 1];
  return {
    text: `Valor de la UF = $${money(UF, 'UF')}. Se compra: ${a.n.toLowerCase()} por ${Mt(a.p, '$')} y ${b.n.toLowerCase()} por ${Mt(b.p, '$')}. Use depreciación ${mode === 'acel' ? 'acelerada' : 'vida útil normal'} (SII). Resultados en UF con 2 decimales.`,
    parts: [
      P(`Valor de ${a.n.toLowerCase()} en UF`, ua, 'UF', [`\\(\\dfrac{${M(a.p, '$')}}{${M(UF)}} = ${M(ua)}\\) UF`], [a.p / UF * 1.1, a.p / 1000 / UF * 1000 * 0.9, a.p / (UF * 1.2)]),
      P(`Valor de ${b.n.toLowerCase()} en UF`, ub, 'UF', [`\\(\\dfrac{${M(b.p, '$')}}{${M(UF)}} = ${M(ub)}\\) UF`], [ub * 1.1, ub * 0.9, ub * 1.25]),
      P(`Depreciación anual de ${a.n.toLowerCase()} (vida útil ${na} años)`, ua / na, 'UF', [`\\(\\dfrac{${M(ua)}}{${na}} = ${M(ua / na)}\\) UF`], [ua / SII[a.s][mode === 'acel' ? 1 : 2], ua / (na + 1), ua * 0.1]),
      P(`Depreciación anual de ${b.n.toLowerCase()} (vida útil ${nb} años)`, ub / nb, 'UF', [`\\(\\dfrac{${M(ub)}}{${nb}} = ${M(ub / nb)}\\) UF`], [ub / SII[b.s][mode === 'acel' ? 1 : 2], ub / (nb + 1), ub * 0.1]),
    ],
  };
});

// ===================================================================== VAN, TIR y PRI
export function irr(flows) {
  let lo = -0.9, hi = 5; const f = (i) => flows.reduce((s, x, t) => s + x / (1 + i) ** t, 0);
  if (f(lo) * f(hi) > 0) return NaN;
  for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; }
  return (lo + hi) / 2;
}
tpl('pp_van', 'pp_flujo', 'VAN, TIR y PRI desde los flujos netos', 2, (r) => {
  for (let k = 0; k < 100; k++) {
    const n = r.int(3, 5), I0 = r.int(20, 80) * 100, rate = r.pick([0.07, 0.1, 0.12, 0.15, 0.2]);
    const flows = [-I0]; for (let t = 1; t <= n; t++) flows.push(Math.round(I0 * r.pick([0.2, 0.3, 0.35, 0.4, 0.5]) / 10) * 10);
    const va = flows.map((x, t) => x / (1 + rate) ** t); let acc = 0; const accs = va.map(x => acc += x);
    const VAN = acc, PRI = accs.findIndex((x, t) => t > 0 && x >= 0), TIR = irr(flows);
    if (Math.abs(VAN) < 50 || !isFinite(TIR) || PRI < 0) continue;
    const sum = flows.reduce((s, x) => s + x, 0);
    return {
      text: `Un proyecto entrega los siguientes flujos netos (UF): ${flows.map((x, t) => `año ${t}: ${money(x)}`).join('; ')}. La alternativa del inversionista le da ${pct(rate)} anual.`,
      parts: [
        P('¿Cuál es el flujo actualizado del año 1?', va[1], 'UF', [`\\(\\dfrac{${M(flows[1])}}{1+${D(rate)}} = ${M(va[1])}\\)`], [flows[1] * (1 - rate), flows[1] / (1 + rate) ** 2, flows[1]]),
        P('¿Cuál es el VAN?', VAN, 'UF', [`\\(VAN = ${flows.map((x, t) => t ? `\\dfrac{${M(x)}}{${D(1 + rate)}^{${t}}}` : M(x)).join(' + ').replace(/\+ -/g, '- ')} = ${M(VAN)}\\)`, VAN >= 0 ? 'VAN ≥ 0 ⇒ recomendable.' : 'VAN < 0 ⇒ no recomendable.'], [sum, VAN - flows[0], flows.reduce((s, x, t) => s + x / (1 + rate * t), 0)]),
        P('¿Cuál es el flujo actualizado acumulado del último año?', accs[n], 'UF', ['Es lo mismo que el VAN: la suma de todos los flujos actualizados.'], [sum, accs[n] - flows[0], accs[n - 1]]),
        P('¿En qué año se recupera la inversión (PRI)?', PRI, 'años', [`Acumulado actualizado: ${accs.map((x, t) => `año ${t}: ${money(x)}`).join('; ')}. Es positivo por primera vez el año ${PRI}.`], [PRI + 1, PRI > 1 ? PRI - 1 : PRI + 2, n + 1]),
        P('¿Cuál es la TIR?', TIR * 100, '%', [`La TIR es la tasa que hace VAN = 0: \\(\\sum \\dfrac{FN_t}{(1+TIR)^t} = 0\\). Se busca por tanteo (o con la calculadora): \\(TIR = ${D(TIR * 100, 2)}\\%\\).`, TIR > rate ? `Como TIR > ${pct(rate)}, el VAN a esa tasa es positivo.` : `Como TIR < ${pct(rate)}, el VAN a esa tasa es negativo.`], [rate * 100, sum / I0 * 100, TIR * 100 * 1.3]),
      ],
    };
  }
  throw new Error('pp_van');
});

// ===================================================================== estudio de mercado
export function regression(years, Y) {
  const n = years.length, base = years[Math.floor((n - 1) / 2)];
  const X = years.map(y => y - base);
  const sX = X.reduce((a, b) => a + b, 0), sY = Y.reduce((a, b) => a + b, 0), sXY = X.reduce((s, x, k) => s + x * Y[k], 0), sX2 = X.reduce((s, x) => s + x * x, 0), sY2 = Y.reduce((s, y) => s + y * y, 0);
  const b = (n * sXY - sX * sY) / (n * sX2 - sX ** 2), a = (sY - b * sX) / n;
  const r2 = (n * sXY - sX * sY) ** 2 / ((n * sX2 - sX ** 2) * (n * sY2 - sY ** 2));
  return { n, base, X, sX, sY, sXY, sX2, sY2, b, a, r2 };
}
tpl('pp_regresion', 'pp_mercado', 'Proyección de demanda con regresión lineal', 2, (r) => {
  const y0 = r.int(2015, 2020), n = 6, years = Array.from({ length: n }, (_, k) => y0 + k);
  const start = r.int(15, 60), slope = r.int(5, 15), Y = years.map((_, k) => Math.max(1, start + slope * k + r.int(-4, 4)));
  const R = regression(years, Y), fut = y0 + n + r.int(1, 4), Xf = fut - R.base, Df = R.a + R.b * Xf;
  const row = years.map((y, k) => `${y}: ${Y[k]}`).join(' · ');
  return {
    text: `La demanda histórica de un producto (unidades) fue: ${row}. Codifique los años con X = año − ${R.base} (así X = 0 en ${R.base}) y ajuste \\(Y = a + bX\\) por mínimos cuadrados.`,
    parts: [
      P('¿Cuánto vale ΣXY?', R.sXY, '', [`X = ${R.X.join(', ')}`, `\\(\\sum XY = ${R.X.map((x, k) => `(${x})(${Y[k]})`).join(' + ')} = ${R.sXY}\\)`, `Además \\(\\sum X = ${R.sX}\\), \\(\\sum Y = ${R.sY}\\), \\(\\sum X^2 = ${R.sX2}\\), \\(\\sum Y^2 = ${R.sY2}\\).`], [R.sXY + R.sY, R.sX * R.sY, R.sXY * 2]),
      P('¿Cuál es la pendiente b?', R.b, '', [`\\(b = \\dfrac{n\\sum XY - \\sum X\\sum Y}{n\\sum X^2 - (\\sum X)^2} = \\dfrac{${n}\\cdot ${R.sXY} - ${R.sX}\\cdot ${R.sY}}{${n}\\cdot ${R.sX2} - ${R.sX}^2} = ${D(R.b)}\\)`], [R.sXY / R.sX2, R.a, (R.sXY - R.sX * R.sY) / (R.sX2 - R.sX ** 2)]),
      P('¿Cuál es el intercepto a?', R.a, '', [`\\(a = \\dfrac{\\sum Y - b\\sum X}{n} = \\dfrac{${R.sY} - ${D(R.b)}\\cdot ${R.sX}}{${n}} = ${D(R.a)}\\)`], [R.sY / n, R.b, (R.sY + R.b * R.sX) / n]),
      P(`¿Qué demanda se estima para ${fut}?`, Df, 'unidades', [`\\(X = ${fut} - ${R.base} = ${Xf}\\)`, `\\(Y = ${D(R.a)} + ${D(R.b)}\\cdot ${Xf} = ${D(Df, 2)}\\) unidades (se trabaja en unidades enteras: ≈ ${Math.floor(Df)}).`], [R.a + R.b * (fut - y0), R.a + R.b * (Xf - 1), R.b * Xf]),
      P('¿Cuál es el coeficiente de determinación r² (en %)?', R.r2 * 100, '%', [`\\(r^2 = \\dfrac{(n\\sum XY - \\sum X\\sum Y)^2}{(n\\sum X^2 - (\\sum X)^2)(n\\sum Y^2 - (\\sum Y)^2)} = ${D(R.r2)}\\)`, `El ${D(R.r2 * 100, 2)}% de la variación de la demanda se explica por el tiempo.`], [Math.sqrt(R.r2) * 100 * 0.97, R.r2 * 90, R.r2 * 100 - 8]),
    ],
  };
});

export const sample = (N, k, e, p) => k * k * p * (1 - p) * N / (e * e * (N - 1) + k * k * p * (1 - p));
tpl('pp_muestra', 'pp_mercado', 'Tamaño de muestra de una encuesta', 1, (r) => {
  const N = r.pick([2000, 5000, 10000, 20000, 50000, 100000]), [k, conf] = r.pick([[1.65, '90%'], [1.96, '95%'], [2, '95,5%'], [2.58, '99%']]);
  const e = r.pick([0.03, 0.04, 0.05, 0.06]), p = r.pick([0.5, 0.5, 0.2, 0.3, 0.4]);
  const n = sample(N, k, e, p), n50 = sample(N, k, e, 0.5), ninf = k * k * p * (1 - p) / (e * e);
  return {
    text: `Se hará una encuesta a una población de N = ${N.toLocaleString('es-CL')} personas, con ${conf} de confianza, error muestral ${pct(e)} y una proporción esperada p = ${String(p).replace('.', ',')}.`,
    parts: [
      P('¿Qué valor de k corresponde a ese nivel de confianza?', k, '', [`Tabla del curso: 90% → 1,65; 95% → 1,96; 95,5% → 2; 99% → 2,58. Para ${conf}: k = ${String(k).replace('.', ',')}.`], [k === 2 ? 1.96 : 2, 1.28, 2.58 === k ? 1.96 : 2.58]),
      P('¿Cuánto vale p·q?', p * (1 - p), '', [`\\(q = 1 - p = ${D(1 - p, 2)}\\Rightarrow p\\,q = ${D(p * (1 - p), 4)}\\)`], [p, 1 - p, p * p + 0.01]),
      P('¿Cuál es el tamaño de la muestra?', n, 'encuestas', [`\\(n = \\dfrac{k^2\\,p\\,q\\,N}{e^2(N-1) + k^2\\,p\\,q} = \\dfrac{${D(k, 2)}^2\\cdot ${D(p * (1 - p))}\\cdot ${N}}{${D(e, 2)}^2(${N}-1) + ${D(k, 2)}^2\\cdot ${D(p * (1 - p))}} = ${D(n, 2)}\\)`, `Se redondea hacia arriba: ${Math.ceil(n)} encuestas.`], [ninf * 1.02 === n ? n * 1.2 : ninf, n50 === n ? n * 0.8 : n50, n * 1.3]),
      P('Si se usara p = q = 0,5 (la opción más segura), ¿cuántas encuestas serían?', n50, 'encuestas', [`\\(p\\,q = 0{,}25\\) es el máximo posible, por eso da la muestra más grande: \\(n = ${D(n50, 2)}\\)`], [n === n50 ? n50 * 0.75 : n, n50 * 1.25, ninf]),
    ],
  };
});

export const TEMPLATE = Object.fromEntries(TEMPLATES.map(t => [t.id, t]));
