// Preparación de Proyectos: ejercicios de las clases (PP-1, PP-2) y el certamen 2024, resueltos.
import { money } from '../../util.js';
import { pmt, projectFlow, flowParts, assetList, depTable, loanTable, regression, sample } from './generators.js';

const P = (q, ans, unit, steps, wrong = []) => ({ q, ans, unit, steps, wrong });
const M = (x, u = 'UF') => money(x, u, true);
const D = (x, d = 4) => String(+x.toFixed(d)).replace('.', '{,}');
const ex = (guide, n, topic, title, text, parts, note) => ({ id: `pp_${guide.replace(/\W/g, '')}_${n}`, guide, n, topic, title, text, parts, note, fixed: true });

export const GUIDE = [];
const add = (...a) => GUIDE.push(ex(...a));

// ===================================================================== certamen 2024
{
  const assets = [
    { name: 'Terreno', sii: null, price: 1000, sale: 1000 },
    { name: 'Galpón de estructura metálica', sii: 'galpon', price: 1000, sale: 200 },
    { name: 'Camionetas', sii: 'camioneta', price: 600, sale: 100 },
    { name: 'Soldadora', sii: 'maq', price: 300, sale: 100 },
    { name: 'Camiones', sii: 'camion', price: 900, sale: 200 },
    { name: 'Computadores', sii: 'comp', price: 600, sale: 90 },
    { name: 'Escritorios', sii: 'muebles', price: 300, sale: 80 },
  ];
  const input = { H: 3, assets, mode: 'normal', ing: [0, 200, 5200, 10200], cost: [0, 1100, 1320, 1584], lp: 0.4, iLP: 0.07, iCP: 0.1, tax: 0.25, rate: 0.2 };
  const F = projectFlow(input); F.input = input;
  add('Certamen 2024', 1, 'pp_flujo', 'Problema 1: flujo de caja a 3 años', `<p>Evalúe un proyecto con estas inversiones iniciales (UF):</p>${assetList(assets, 'normal')}
<p>a) Horizonte de 3 años. b) Ingresos del año 1: UF 200, y cada año aumentan en UF 5.000. c) Costos del año 1: UF 1.100, y crecen 20% anual.
d) Préstamos de largo plazo (3 años) al 7% y de corto plazo al 10%. e) <b>El inversionista solo pondrá dinero en el año 0.</b> f) 40% se financia con un préstamo LP en cuota fija y el resto el inversionista.
g) Depreciación vida útil normal. h) Tasa de descuento del inversionista 20%. Impuesto 25%. Resultados en UF con 2 decimales.</p>`,
  flowParts(F, assets), 'La soldadora se deprecia como "maquinarias y equipos en general" (15 años), como en la tabla que trae el certamen.');
}

// ===================================================================== PP-1: matemática financiera
add('Clases', 1, 'pp_interes', 'Préstamo a interés simple y compuesto', 'Se ha obtenido un préstamo de US$1.000 con una tasa del 6% anual. ¿Cuánto se debe pagar en dos años más y cuánto se paga en intereses? Compare interés simple y compuesto.', [
  P('VF con interés simple', 1120, 'US$', ['\\(VF = 1.000(1 + 0{,}06\\cdot 2) = 1.120{,}00\\)'], [1123.6, 1060, 1200]),
  P('Intereses con interés simple', 120, 'US$', ['\\(1.120 - 1.000 = 120{,}00\\)'], [123.6, 60, 1120]),
  P('VF con interés compuesto', 1123.6, 'US$', ['\\(VF = 1.000(1{,}06)^2 = 1.123{,}60\\)'], [1120, 1060, 1191.02]),
  P('Intereses con interés compuesto', 123.6, 'US$', ['\\(1.123{,}60 - 1.000 = 123{,}60\\). Es mayor que con interés simple.'], [120, 60, 1123.6]),
]);
add('Clases', 2, 'pp_interes', 'Interés compuesto: VF, VP, tasa y plazo', 'Una inversión capitaliza intereses con una tasa del 1,5% mensual.', [
  P('Se depositan $5.000.000 por 4 años. ¿Cuánto se retira al final?', 5e6 * 1.015 ** 48, '$', ['\\(VF = 5.000.000\\,(1{,}015)^{4\\cdot 12} = ' + M(5e6 * 1.015 ** 48, '$') + '\\)'], [5e6 * (1 + 0.015 * 48), 5e6 * 1.015 ** 4, 5e6 * 1.18 ** 4]),
  P('¿Cuánto hay que invertir para retirar $1.000.000 en un año?', 1e6 / 1.015 ** 12, '$', ['\\(VP = \\dfrac{1.000.000}{(1{,}015)^{12}} = ' + M(1e6 / 1.015 ** 12, '$') + '\\)'], [1e6 / 1.18, 1e6 / 1.015, 1e6 * 0.985 ** 12 * 0.98]),
  P('¿Qué tasa mensual triplica una inversión en un año?', (3 ** (1 / 12) - 1) * 100, '%', ['\\(i = 3^{1/12} - 1 = 0{,}0959 = 9{,}59\\%\\) mensual'], [200 / 12, 25, 3 / 12 * 100]),
  P('¿En cuánto tiempo se triplica una inversión al 3% mensual?', Math.log(3) / Math.log(1.03), 'meses', ['\\(n = \\dfrac{\\log 3}{\\log 1{,}03} = 37{,}17\\) meses'], [2 / 0.03, 100, 37.17 / 12]),
]);
{
  const C = pmt(7000, 0.03, 48);
  add('Clases', 3, 'pp_cuota', 'Cuota fija: el auto deportivo', 'Un profesional quiere comprar un automóvil de US$7.000 y pagarlo en 4 años en cuotas mensuales iguales, con un interés del 3% mensual.', [
    P('Número de cuotas', 48, 'cuotas', ['\\(n = 4\\cdot 12 = 48\\)'], [4, 36, 12]),
    P('Valor de la cuota', C, 'US$', [`\\(C = 7.000\\cdot\\dfrac{0{,}03(1{,}03)^{48}}{(1{,}03)^{48} - 1} = ${M(C, 'US$')}\\)`], [7000 / 48, 7000 * 1.03 / 48, pmt(7000, 0.36, 4) / 12]),
    P('Total pagado', C * 48, 'US$', [`\\(48\\cdot ${M(C, 'US$')} = ${M(C * 48, 'US$')}\\)`], [7000, 7000 * 1.03 ** 48, C * 4]),
    P('Intereses pagados', C * 48 - 7000, 'US$', [`\\(${M(C * 48, 'US$')} - 7.000 = ${M(C * 48 - 7000, 'US$')}\\)`], [7000 * 0.03 * 48, C * 48, 7000 * 0.03]),
  ]);
}
add('Clases', 4, 'pp_depre', 'Depreciación del camión de don Cuasimodo', 'Don Cuasimodo compra un camión de US$10.000. La vida útil es de 10 años y al término de la vida útil legal el valor libro es 0.', [
  P('Depreciación anual en línea recta', 1000, 'US$', ['\\(D = \\dfrac{10.000}{10} = 1.000{,}00\\)'], [3333.33, 10000 / 7, 100]),
  P('Vida útil acelerada (parte entera de n/3)', 3, 'años', ['\\(\\lfloor 10/3 \\rfloor = 3\\) años'], [2, 5, 4]),
  P('Depreciación anual acelerada', 10000 / 3, 'US$', ['\\(D = \\dfrac{10.000}{3} = 3.333{,}33\\) (el último año se ajusta por los decimales)'], [1000, 2500, 5000]),
  P('Valor libro después de 4 años (línea recta normal)', 6000, 'US$', ['\\(VL = 10.000 - 4\\cdot 1.000 = 6.000{,}00\\)'], [4000, 0, 10000 / 3]),
]);
{
  const assets = [
    { name: 'Terreno', sii: null, price: 1000, sale: 1000 }, { name: 'Construcción de un galpón', sii: 'galpon', price: 1500, sale: 600 },
    { name: 'Camionetas', sii: 'camioneta', price: 1000, sale: 400 }, { name: 'Computadores', sii: 'comp', price: 1000, sale: 200 }, { name: 'Escritorios', sii: 'muebles', price: 500, sale: 100 }];
  const F = projectFlow({ H: 4, assets, mode: 'acel', ing: Array(5).fill(0), cost: Array(5).fill(0), lp: 0.75, iLP: 0.05, iCP: 0, rate: 0.1 });
  add('Clases', 5, 'pp_depre', 'Tablas de depreciación y amortización (horizonte 4 años)', `<p>Proyecto a 4 años con depreciación acelerada. Activos (UF):</p>${assetList(assets, 'acel')}<p>Se financia un 75% con un crédito a 4 años en cuota fija al 5% anual.</p>`, [
    P('Depreciación total del año 1', F.dep[1], 'UF', [depTable(F, assets)], [F.inv / 4, 250, 1000]),
    P('Depreciación total del año 3', F.dep[3], 'UF', ['Las camionetas, computadores y escritorios (2 años) ya terminaron de depreciarse; solo queda el galpón (6 años).'], [1500, 750, 0.0001 + 500]),
    P('Valor libro total al final del año 4', F.VLsum, 'UF', ['Terreno 1.000 + galpón 1.500 − 4·250 = 500 ⇒ 1.500,00'], [2300, 500, 1000]),
    P('Diferencia total (venta − VL)', F.difSum, 'UF', ['\\(2.300 - 1.500 = 800{,}00\\)'], [2300, -800, 1300]),
    P('Cuota anual del crédito', F.cuota, 'UF', [`\\(C = 3.750\\cdot\\dfrac{0{,}05(1{,}05)^4}{(1{,}05)^4 - 1} = ${M(F.cuota)}\\)`, loanTable(F)], [3750 / 4, 3750 / 4 + 187.5, 1250]),
    P('Interés del año 1', F.loan[1].I, 'UF', ['\\(3.750\\cdot 0{,}05 = 187{,}50\\)'], [52.88, 250, 1057.54 * 0.05]),
    P('Saldo de la deuda al final del año 1', F.loan[1].P, 'UF', [`\\(3.750 - (1.057{,}54 - 187{,}50) = ${M(F.loan[1].P)}\\)`], [3750 - 1057.54, 2812.5, 3750 - 187.5]),
  ]);
}
{
  const UF = 24537.42;
  const items = [['terreno', 3e6, 3e6, null], ['camioneta', 12e6, 3.5e6, 'camioneta'], ['compresor', 450e3, 150e3, 'maq'], ['soldadora', 140e3, 80e3, 'maq'], ['oxicorte', 130e3, 50e3, 'maq'], ['muebles', 230e3, 50e3, 'muebles'], ['computadoras', 320e3, 80e3, 'comp']];
  const assets = items.map(([name, p, s, sii]) => ({ name, sii, price: +(p / UF).toFixed(2), sale: +(s / UF).toFixed(2) }));
  const F = projectFlow({ H: 5, assets, mode: 'acel', ing: Array(6).fill(0), cost: Array(6).fill(0), lp: 0.55, iLP: 0.08, iCP: 0, rate: 0.1 });
  add('Clases', 6, 'pp_depre', 'Activos en pesos pasados a UF (horizonte 5 años)', `Valor de la UF = $24.537,42. Activos (compra / venta): terreno $3.000.000 / $3.000.000; camioneta $12.000.000 / $3.500.000; compresor $450.000 / $150.000; soldadora $140.000 / $80.000; oxicorte $130.000 / $50.000; muebles $230.000 / $50.000; computadoras $320.000 / $80.000. Depreciación acelerada, horizonte 5 años, 55% financiado con crédito a 5 años en cuota fija al 8%.`, [
    P('Camioneta en UF', 12e6 / UF, 'UF', ['\\(\\dfrac{12.000.000}{24.537{,}42} = 489{,}05\\)'], [12e6 / UF * 1.1, 142.64, 12e6 / 1000 / 24.53]),
    P('Compresor en UF', 450e3 / UF, 'UF', ['\\(\\dfrac{450.000}{24.537{,}42} = 18{,}34\\)'], [6.11, 18.34 * 1.2, 45]),
    P('Inversión total en UF', F.inv, 'UF', ['Suma de todos los activos en UF.', depTable(F, assets)], [F.inv - assets[0].price, F.saleSum, F.inv * 0.55]),
    P('Crédito (55%)', F.LP0, 'UF', [`\\(0{,}55\\cdot ${M(F.inv)} = ${M(F.LP0)}\\)`], [F.inv * 0.45, F.LP0 * 1.08, F.LP0 / 5]),
    P('Cuota anual', F.cuota, 'UF', [`\\(C = ${M(F.LP0)}\\cdot\\dfrac{0{,}08(1{,}08)^5}{(1{,}08)^5 - 1} = ${M(F.cuota)}\\)`, loanTable(F)], [F.LP0 / 5, F.LP0 / 5 + F.LP0 * 0.08, F.cuota * 1.08]),
    P('Depreciación total del año 1', F.dep[1], 'UF', ['Camioneta 2 años, muebles y computadoras 2 años, compresor/soldadora/oxicorte 5 años (maquinaria acelerada).', depTable(F, assets)], [F.dep[3], F.inv / 5, F.dep[1] + assets[0].price / 5]),
  ]);
}

// ===================================================================== PP-2: estudio de mercado
for (const [n, y0, Y, futs, note] of [[7, 2008, [20, 30, 38, 47, 61, 69], [2016, 2018, 2021], null], [8, 2009, [18, 30, 40, 45, 55, 70], [2016, 2018, 2021], 'La lámina 38 muestra 57,57 para 2016; con la recta de la misma lámina el valor correcto es el de esta pauta.']]) {
  const years = Y.map((_, k) => y0 + k), R = regression(years, Y);
  add('Clases', n, 'pp_mercado', `Regresión lineal: demanda ${years[0]}–${years.at(-1)}`, `Demanda (unidades): ${years.map((y, k) => `${y}: ${Y[k]}`).join(' · ')}. Determine la demanda esperada para ${futs.join(', ')} con \\(Y = a + bX\\) (X = año − ${R.base}) y calcule r².`, [
    P('Pendiente b', R.b, '', [`\\(\\sum X = ${R.sX},\\;\\sum Y = ${R.sY},\\;\\sum XY = ${R.sXY},\\;\\sum X^2 = ${R.sX2},\\;\\sum Y^2 = ${R.sY2}\\)`, `\\(b = \\dfrac{6\\cdot ${R.sXY} - ${R.sX}\\cdot ${R.sY}}{6\\cdot ${R.sX2} - ${R.sX}^2} = ${D(R.b)}\\)`], [R.sXY / R.sX2, R.a, R.b * 1.2]),
    P('Intercepto a', R.a, '', [`\\(a = \\dfrac{${R.sY} - ${D(R.b)}\\cdot ${R.sX}}{6} = ${D(R.a)}\\)`], [R.sY / 6, R.b, R.a * 1.15]),
    ...futs.map(f => P(`Demanda ${f}`, R.a + R.b * (f - R.base), 'unidades', [`\\(Y = ${D(R.a)} + ${D(R.b)}\\cdot ${f - R.base} = ${D(R.a + R.b * (f - R.base), 2)}\\)`], [R.a + R.b * (f - y0), R.a + R.b * (f - R.base - 1), R.b * (f - R.base)])),
    P('r² (en %)', R.r2 * 100, '%', [`\\(r^2 = ${D(R.r2)}\\)`], [Math.sqrt(R.r2) * 100 * 0.95, R.r2 * 90, R.r2 * 100 - 6]),
  ], note);
}
{
  const X = [1, 2, 3, 4, 5, 6, 7, 8], Y = [35, 42, 48, 51, 54, 60, 71, 75], n = 8;
  const sX = 36, sY = Y.reduce((a, b) => a + b, 0), sXY = X.reduce((s, x, k) => s + x * Y[k], 0), sX2 = 204;
  const b = (n * sXY - sX * sY) / (n * sX2 - sX ** 2), a = (sY - b * sX) / n;
  add('Clases', 9, 'pp_mercado', 'Tendencia lineal 1994–2001', 'Demanda: 1994: 35 · 1995: 42 · 1996: 48 · 1997: 51 · 1998: 54 · 1999: 60 · 2000: 71 · 2001: 75. Use X = 1 para 1994, …, X = 8 para 2001 y ajuste Y′ = a + bX.', [
    P('ΣXY', sXY, '', [`\\(\\sum XY = 1\\cdot 35 + 2\\cdot 42 + \\dots + 8\\cdot 75 = ${sXY}\\)`, `\\(\\sum X = 36,\\;\\sum Y = ${sY},\\;\\sum X^2 = 204\\)`], [sX * sY / 8, sXY * 1.1, sY * 8]),
    P('Pendiente b', b, '', [`\\(b = \\dfrac{8\\cdot ${sXY} - 36\\cdot ${sY}}{8\\cdot 204 - 36^2} = ${D(b)}\\)`], [sXY / sX2, a, b * 1.3]),
    P('Intercepto a', a, '', [`\\(a = \\dfrac{${sY} - ${D(b)}\\cdot 36}{8} = ${D(a)}\\)`], [sY / 8, b * 5, a * 1.15]),
    P('Demanda estimada para 2002 (X = 9)', a + 9 * b, 'unidades', [`\\(Y = ${D(a)} + ${D(b)}\\cdot 9 = ${D(a + 9 * b, 2)}\\)`], [a + 8 * b, 75, a + 10 * b]),
  ]);
}
add('Clases', 10, 'pp_mercado', 'Tamaño de muestra (ejemplos de la PP-2)', 'Use \\(n = \\dfrac{k^2 p q N}{e^2(N-1) + k^2 p q}\\).', [
  P('Encuesta de satisfacción: N = 10.000 autos vendidos, 95,5% de confianza (k = 2), e = 5%, p = q = 0,5. ¿Cuántas encuestas?', sample(10000, 2, 0.05, 0.5), 'encuestas', [`\\(n = \\dfrac{4\\cdot 0{,}25\\cdot 10.000}{0{,}0025\\cdot 9.999 + 1} = ${D(sample(10000, 2, 0.05, 0.5), 2)} \\approx 385\\)`], [400, 100, 1000]),
  P('Programa de TV: N = 40 millones, p = 0,2, k = 2, e = 5%. ¿Cuántas personas?', sample(40e6, 2, 0.05, 0.2), 'encuestas', [`\\(n \\approx \\dfrac{4\\cdot 0{,}16\\cdot N}{0{,}0025\\,N} = ${D(sample(40e6, 2, 0.05, 0.2), 2)} \\approx 256\\)`], [400, 385, 160]),
  P('Mismo programa con p = q = 0,5', sample(40e6, 2, 0.05, 0.5), 'encuestas', ['\\(\\dfrac{4\\cdot 0{,}25}{0{,}0025} = 400\\)'], [256, 385, 1000]),
  P('Mismo programa con p = 0,2 y 99% de confianza (k = 2,58)', sample(40e6, 2.58, 0.05, 0.2), 'encuestas', [`\\(\\dfrac{2{,}58^2\\cdot 0{,}16}{0{,}0025} = ${D(sample(40e6, 2.58, 0.05, 0.2), 2)}\\)`], [256, 400, 660]),
]);

export const GUIDE_BY_ID = Object.fromEntries(GUIDE.map(g => [g.id, g]));
