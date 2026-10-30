// Guías de ejercicios del curso (Máquinas CC y CA), resueltas paso a paso.
// Los números se calculan aquí mismo para que la solución sea exacta.
import { T, fmt, PI, SQ3, HP, G, rpm2rad } from '../util.js';
import { inductionModel, thevenin } from './generators.js';

const P = (q, ans, unit, steps, wrong = []) => ({ q, ans, unit, steps, wrong });
const W = fmt;
const pc = (x) => x * 100;
const ex = (guide, n, topic, title, text, parts, note) => ({ id: `guia_${guide}_${n}`, guide, n, topic, title, text, parts, note, fixed: true });

export const GUIDE = [];
const add = (...a) => GUIDE.push(ex(...a));

// ===================================================================== CC
{
  const Pu = 4048, eta = 0.85, Pin = Pu / eta;
  add('CC', 1, 'fund', 'Potencia absorbida', 'Determine la potencia nominal absorbida por un motor eléctrico de CC que a plena carga tiene un rendimiento del 85% y es capaz de mover una carga de 4048 [W].', [
    P('Potencia absorbida', Pin, 'W', [`\\(\\eta = \\dfrac{P_{útil}}{P_{abs}}\\Rightarrow P_{abs} = \\dfrac{4048}{0{,}85} = ${T(Pin)}\\,[W]\\)`], [Pu * eta, Pu * 1.15, Pu]),
    P('Pérdidas', Pin - Pu, 'W', [`\\(P_{pérd} = ${T(Pin)} - 4048 = ${T(Pin - Pu)}\\,[W]\\)`], [Pu * 0.15, Pin * 0.15 * 1.3, Pu - Pu * eta]),
  ]);
}
{
  const Pu = 1.5 * HP, w = 157, Tq = Pu / w;
  add('CC', 2, 'fund', 'Torque desde HP y rad/s', 'La potencia útil nominal de un motor de CC es de 1,5 [HP] y su velocidad es 157 [rad/s]. Calcule el torque de este motor.', [
    P('Potencia en watts', Pu, 'W', ['\\(P = 1{,}5\\cdot 746 = 1119\\,[W]\\)'], [1.5 * 735, 1500, 1.5 * 1000 / 1.36]),
    P('Torque', Tq, 'Nm', [`\\(\\tau = \\dfrac{P}{\\omega} = \\dfrac{1119}{157} = ${T(Tq)}\\,[Nm]\\)`, 'Ojo: aquí la velocidad ya viene en rad/s, no hay que convertir.'], [1.5 / 157, Pu / rpm2rad(157), 1500 / 157]),
  ]);
}
{
  const Pu = HP, w = rpm2rad(1800), Tn = Pu / w;
  add('CC', 3, 'fund', 'Torque de arranque', 'Un motor de CC entrega, nominalmente, 1 [HP] de potencia a 1800 [rpm]. Calcule el torque que ejerce el motor al momento del arranque sabiendo que es tres veces más grande que el nominal.', [
    P('Velocidad angular', w, 'rad/s', ['\\(\\omega = \\dfrac{2\\pi\\cdot 1800}{60} = 60\\pi = ' + T(w) + '\\,[rad/s]\\)'], [30, 1800 * 2 * PI, 1800 / 60]),
    P('Torque nominal', Tn, 'Nm', [`\\(\\tau_n = \\dfrac{746}{${T(w)}} = ${T(Tn)}\\,[Nm]\\)`], [746 / 1800, 3 * Tn, 746 / 30]),
    P('Torque de arranque', 3 * Tn, 'Nm', [`\\(\\tau_{arr} = 3\\tau_n = ${T(3 * Tn)}\\,[Nm]\\)`], [Tn, 3 * 746 / 1800, Tn / 3]),
  ]);
}
{
  const Ra = 0.2, Rf = 1, Ia = 25, Vrot = 200, V = Vrot + Ia * (Ra + Rf), Pin = V * Ia, Pconv = Vrot * Ia, eta = 5000 / Pin, Iarr = V / (Ra + Rf);
  add('CC', 4, 'cc', 'Motor serie de 5 kW', 'Un motor de corriente continua de 5 [kW], en conexión serie, tiene una resistencia del inducido (armadura) de 0,2 [Ω], una resistencia del inductor (campo) de 1 [Ω], una corriente del inducido de 25 [A] y un \\(V_{rot} = 200\\,[V]\\). Las inductancias son despreciables. Determine su rendimiento y la corriente de arranque.', [
    P('Tensión de alimentación', V, 'V', ['En serie: \\(V = V_{rot} + I_a(R_a + R_f)\\)', `\\(V = 200 + 25(0{,}2 + 1) = ${T(V)}\\,[V]\\)`], [205, 200, 225]),
    P('Potencia absorbida', Pin, 'W', [`\\(P_{abs} = V I = ${T(V)}\\cdot 25 = ${T(Pin)}\\,[W]\\)`], [5000, 200 * 25 * 1.2, 5125]),
    P('Rendimiento', pc(eta), '%', [`\\(P_{útil} = 5000\\,[W]\\) (coincide con \\(V_{rot}I_a = 200\\cdot 25\\))`, `\\(\\eta = \\dfrac{5000}{${T(Pin)}} = ${T(pc(eta))}\\%\\)`], [pc(5000 / 5125), pc(200 / 205), pc(1 - eta)]),
    P('Corriente de arranque', Iarr, 'A', ['Al arrancar \\(V_{rot} = 0\\)', `\\(I_{arr} = \\dfrac{V}{R_a+R_f} = \\dfrac{${T(V)}}{1{,}2} = ${T(Iarr)}\\,[A]\\)`], [V / Ra, V / Rf, 200 / 1.2]),
  ]);
}
{
  const Pin = 8000, V = 500, E = 496, Rf = 250, IL = Pin / V, If = V / Rf, Ia = IL - If, Ra = (V - E) / Ia;
  const Pu = 0.83 * Pin, w = rpm2rad(1000), Tq = Pu / w, Pcu = Ia * Ia * Ra + If * If * Rf, Prot = 0.17 * Pin - Pcu;
  add('CC', 5, 'cc', 'Motor shunt de 8 kW', 'Un motor de CC shunt consume 8 [kW] al alimentarlo con 500 [V] y arrastra una carga a 1000 [rpm]. La fuerza contraelectromotriz es 496 [V], la resistencia del devanado de excitación es 250 [Ω] y sus pérdidas totales son el 17% de la potencia absorbida. Inductancias despreciables.', [
    P('Corriente de línea', IL, 'A', ['\\(I_L = \\dfrac{P}{V} = \\dfrac{8000}{500} = 16\\,[A]\\)'], [8000 / 496, 2, 18]),
    P('Corriente de campo', If, 'A', ['\\(I_f = \\dfrac{500}{250} = 2\\,[A]\\)'], [496 / 250, 16, 14]),
    P('Corriente de armadura', Ia, 'A', ['\\(I_a = I_L - I_f = 16 - 2 = 14\\,[A]\\)'], [16, 18, 2]),
    P('a) Resistencia del inducido', Ra, 'Ω', [`\\(R_a = \\dfrac{V - E}{I_a} = \\dfrac{500 - 496}{14} = ${T(Ra)}\\,[Ω]\\)`], [4 / 16, 4 / 2, 496 / 14 / 100]),
    P('b) Torque útil', Tq, 'Nm', [`\\(P_{útil} = 0{,}83\\cdot 8000 = 6640\\,[W]\\)`, `\\(\\omega = \\dfrac{2\\pi\\cdot 1000}{60} = ${T(w)}\\,[rad/s]\\)`, `\\(\\tau = \\dfrac{6640}{${T(w)}} = ${T(Tq)}\\,[Nm]\\)`], [8000 / w, 6640 / 1000, 496 * 14 / w]),
    P('c) Pérdidas mecánicas + magnéticas', Prot, 'W', [`Pérdidas totales: \\(0{,}17\\cdot 8000 = 1360\\,[W]\\)`, `Cobre armadura: \\(I_a^2R_a = 14^2\\cdot ${T(Ra)} = ${T(Ia * Ia * Ra)}\\,[W]\\)`, `Cobre campo: \\(I_f^2R_f = 2^2\\cdot 250 = 1000\\,[W]\\)`, `\\(P_{mec}+P_{mag} = 1360 - ${T(Ia * Ia * Ra)} - 1000 = ${T(Prot)}\\,[W]\\)`], [1360, 1360 - 1000, 1360 - Ia * Ia * Ra]),
  ]);
}
{
  const V = 500, Vr = 480, Ra = 0.1, Rf = 500, Rr = 1.5, Iarr = V / (Ra + Rr), Ia = (V - Vr) / Ra, If = V / Rf, IL = Ia + If, Pin = V * IL, Pu = 0.8 * Pin;
  add('CC', 6, 'cc', 'Motor shunt con reóstato', 'Un motor en derivación conectado a 500 [V] produce un voltaje de rotación de 480 [V]. La resistencia de armadura es 0,1 [Ω], la de campo 500 [Ω] y la del reóstato 1,5 [Ω]. Inductancias despreciables. El reóstato solo actúa durante el arranque.', [
    P('a) Corriente de arranque en la armadura', Iarr, 'A', [`\\(I_{arr} = \\dfrac{500}{0{,}1 + 1{,}5} = ${T(Iarr)}\\,[A]\\)`], [5000, 500 / 1.5, 20 / 1.6]),
    P('b) Corriente de armadura en régimen', Ia, 'A', ['Ya sin reóstato: \\(I_a = \\dfrac{500 - 480}{0{,}1} = 200\\,[A]\\)'], [12.5, 312.5, 4800]),
    P('c) Corriente de campo', If, 'A', ['\\(I_f = \\dfrac{500}{500} = 1\\,[A]\\)'], [0.96, 2, 200]),
    P('d) Corriente absorbida', IL, 'A', ['\\(I = I_a + I_f = 200 + 1 = 201\\,[A]\\)'], [200, 199, 313.5]),
    P('e) Potencia absorbida', Pin, 'W', ['\\(P = 500\\cdot 201 = 100500\\,[W]\\)'], [100000, 480 * 201, 80400]),
    P('f) Potencia útil (η = 80%)', Pu, 'W', ['\\(P_{útil} = 0{,}8\\cdot 100500 = 80400\\,[W]\\)'], [100500, 125625, 80000]),
  ]);
}
{
  const Pu = 7360, n = 1500, V = 220, I = 40, Rac = 0.1, Rf = 0.2, Vb = 2;
  const Vrot = V - I * (Rac + Rf) - Vb, w = rpm2rad(n), Tq = Pu / w, eta = Pu / (V * I), Rreo = (V - Vb) / (1.5 * I) - (Rac + Rf);
  add('CC', 7, 'cc', 'Motor serie con escobillas', 'Un motor de CC serie entrega a plena carga 7360 [W] a 1500 [rpm], alimentado con 220 [V] y 40 [A]. La armadura y la bobina de conmutación suman 0,1 [Ω] y la bobina de campo 0,2 [Ω]; cada escobilla (carbón) tiene una caída de 1 [V] y hay 2 escobillas.', [
    P('a) Voltaje de rotación', Vrot, 'V', ['\\(V = I(R_{a+c} + R_f) + 2V_{esc} + V_{rot}\\)', `\\(V_{rot} = 220 - 40(0{,}1 + 0{,}2) - 2 = ${T(Vrot)}\\,[V]\\)`], [208, 207, 216]),
    P('b) Torque útil', Tq, 'Nm', [`\\(\\omega = \\dfrac{2\\pi\\cdot 1500}{60} = ${T(w)}\\,[rad/s]\\)`, `\\(\\tau = \\dfrac{7360}{${T(w)}} = ${T(Tq)}\\,[Nm]\\)`], [7360 / 1500, 8800 / w, Vrot * I / w]),
    P('c) Rendimiento', pc(eta), '%', [`\\(\\eta = \\dfrac{7360}{220\\cdot 40} = \\dfrac{7360}{8800} = ${T(pc(eta))}\\%\\)`], [pc(Vrot / V), pc(Vrot * I / 8800), pc(1 - eta)]),
    P('d) Reóstato de arranque (I ≤ 1,5·In)', Rreo, 'Ω', ['\\(I_{arr,máx} = 1{,}5\\cdot 40 = 60\\,[A]\\), y al arrancar \\(V_{rot} = 0\\)', `\\(220 = 60(0{,}3 + R_{reo}) + 2 \\Rightarrow R_{reo} = \\dfrac{218}{60} - 0{,}3 = ${T(Rreo)}\\,[Ω]\\)`, 'Si se desprecian las escobillas da ≈ 3,37 Ω (también se suele aceptar).'], [220 / 60, 220 / 60 - 0.3 + 0.5, 218 / 40 - 0.3]),
  ], 'En d) la solución considera la caída de las escobillas (2 V).');
}
{
  const Ra = 0.25, Rf = 200, Vb = 2, V = 240, I = 35, Pu = 7360, n = 1200;
  const If = V / Rf, Ia = I - If, Vrot = V - Ia * Ra - Vb, w = rpm2rad(n), Tq = Pu / w;
  add('CC', 8, 'cc', 'Motor shunt con escobillas', 'Un motor de CC shunt tiene resistencia de armadura y conmutación de 0,25 [Ω], campo de 200 [Ω] y caída de 1 [V] por escobilla (2 escobillas). Conectado a 240 [V] consume 35 [A] y entrega 7,36 [kW] a 1200 [rpm].', [
    P('a) Corriente de campo', If, 'A', ['\\(I_f = \\dfrac{240}{200} = 1{,}2\\,[A]\\)'], [35, 1.175, 240 / 200.25]),
    P('b) Corriente de armadura', Ia, 'A', ['\\(I_a = 35 - 1{,}2 = 33{,}8\\,[A]\\)'], [35, 36.2, 34]),
    P('c) Voltaje de rotación', Vrot, 'V', [`\\(V_{rot} = 240 - 33{,}8\\cdot 0{,}25 - 2 = ${T(Vrot)}\\,[V]\\)`], [240 - 35 * 0.25 - 2, 240 - 33.8 * 0.25, 240 - 33.8 * 0.25 - 1]),
    P('d) Torque útil', Tq, 'Nm', [`\\(\\omega = \\dfrac{2\\pi\\cdot 1200}{60} = ${T(w)}\\,[rad/s]\\)`, `\\(\\tau = \\dfrac{7360}{${T(w)}} = ${T(Tq)}\\,[Nm]\\)`], [7360 / 1200, 240 * 35 / w, Vrot * Ia / w]),
  ]);
}
{
  const Va = 250, Ia = 120, n = 1103, Ra = 0.03, Vrot = Va - Ia * Ra, w = rpm2rad(n), K = Vrot / w, Tq = K * Ia;
  const Iarr = Va / Ra, Tarr = K * Iarr, Vrot2 = 200 - Ia * Ra, n2 = n * Vrot2 / Vrot, Gfq = 230 / (4.3 * rpm2rad(1200));
  add('CC', 9, 'cc', 'Excitación independiente', 'El motor de excitación independiente gira nominalmente a 1200 [rpm]. Opera con tensión de armadura de 250 [V], corriente de armadura 120 [A] y velocidad 1103 [rpm], moviendo una carga de torque constante. \\(R_a = 0{,}03\\,[Ω]\\); desprecie las bobinas.', [
    P('a) Voltaje de rotación en vacío', 250, 'V', ['En vacío \\(I_a \\approx 0\\), así que \\(V_{rot} \\approx V_a = 250\\,[V]\\)'], [246.4, 253.6, 230]),
    P('a) Voltaje de rotación con carga', Vrot, 'V', [`\\(V_{rot} = 250 - 0{,}03\\cdot 120 = ${T(Vrot)}\\,[V]\\)`], [250, 253.6, 3.6]),
    P('b) Torque desarrollado', Tq, 'Nm', [`\\(\\omega = \\dfrac{2\\pi\\cdot 1103}{60} = ${T(w)}\\,[rad/s]\\)`, `\\(\\tau = \\dfrac{V_{rot}I_a}{\\omega} = \\dfrac{${T(Vrot)}\\cdot 120}{${T(w)}} = ${T(Tq)}\\,[Nm]\\)`], [Vrot * Ia / 1103, 250 * 120 / w, Vrot * Ia / rpm2rad(1200)]),
    P('c) Corriente de arranque', Iarr, 'A', [`\\(I_{arr} = \\dfrac{250}{0{,}03} = ${T(Iarr)}\\,[A]\\)`], [Vrot / Ra, 120 * 3, 250 / 0.3]),
    P('c) Torque de arranque', Tarr, 'Nm', [`\\(K = \\dfrac{V_{rot}}{\\omega} = ${T(K)}\\)`, `\\(\\tau_{arr} = K I_{arr} = ${T(K)}\\cdot ${T(Iarr)} = ${T(Tarr)}\\,[Nm]\\)`], [Tq, Tarr / 10, 250 * Iarr / w]),
    P('d) Velocidad con Va = 200 V e igual torque', n2, 'rpm', ['Igual torque ⇒ igual \\(I_a = 120\\,[A]\\)', `\\(V_{rot,2} = 200 - 3{,}6 = 196{,}4\\,[V]\\)`, `\\(n_2 = 1103\\cdot\\dfrac{196{,}4}{${T(Vrot)}} = ${T(n2)}\\,[rpm]\\)`], [1103 * 200 / 250, 960, 1200 * 196.4 / 246.4]),
    P('e) Constante Gfq (If = 4,3 A, Vrot = 230 V)', Gfq, 'H', [`Se usa la velocidad nominal, 1200 [rpm] = ${T(rpm2rad(1200))} [rad/s]`, `\\(G_{fq} = \\dfrac{V_{rot}}{I_f\\,\\omega} = \\dfrac{230}{4{,}3\\cdot ${T(rpm2rad(1200))}} = ${T(Gfq)}\\,[H]\\)`], [230 / (4.3 * w), 230 / 4.3 / 1200, 230 / 4.3 / 100]),
  ], 'En e) el enunciado no dice la velocidad; se asume la nominal (1200 rpm). Con 1103 rpm daría ≈ 0,463 H.');
}

// ===================================================================== CA
{
  const wm = rpm2rad(1200), fe = 6 * 1200 / 120, we = 2 * PI * fe;
  add('CA', 1, 'sinc', 'Generador sincrónico de 6 polos', 'El rotor de un generador sincrónico de 6 polos gira a 1200 [rpm].', [
    P('a) Velocidad mecánica en rad/s', wm, 'rad/s', [`\\(\\omega_m = \\dfrac{2\\pi\\cdot 1200}{60} = 40\\pi = ${T(wm)}\\,[rad/s]\\)`], [20, 1200 * 2 * PI, we]),
    P('b) Frecuencia en Hz', fe, 'Hz', ['\\(f_e = \\dfrac{P\\,n}{120} = \\dfrac{6\\cdot 1200}{120} = 60\\,[Hz]\\)'], [20, 120, 50]),
    P('b) Frecuencia en rad/s', we, 'rad/s', [`\\(\\omega_e = 2\\pi\\cdot 60 = ${T(we)}\\,[rad/s]\\)`], [wm, 60, wm * 6]),
    P('c) Velocidad para 50 Hz', 1000, 'rpm', ['\\(n = \\dfrac{120\\cdot 50}{6} = 1000\\,[rpm]\\)'], [500, 2000, 1200]),
  ]);
}
{
  const Pin = 30000 / 0.9, ID = Pin / (SQ3 * 220 * 0.85), IY = Pin / (SQ3 * 380 * 0.85);
  add('CA', 2, 'trif', 'Motor 220/380 V en delta y estrella', 'Un motor de inducción trifásico tiene: 220/380 [V], FP 0,85, rendimiento 90% y potencia útil 30 [kW].', [
    P('Potencia absorbida', Pin, 'W', [`\\(P = \\dfrac{30000}{0{,}9} = ${T(Pin)}\\,[W]\\)`], [27000, 30000, 30000 / 0.85]),
    P('a) Corriente de línea en delta (220 V)', ID, 'A', ['En delta se usa la tensión menor de la placa: 220 [V]', `\\(I_L = \\dfrac{${T(Pin)}}{\\sqrt3\\cdot 220\\cdot 0{,}85} = ${T(ID)}\\,[A]\\)`], [IY, Pin / (220 * 0.85), 30000 / (SQ3 * 220 * 0.85)]),
    P('b) Corriente de línea en estrella (380 V)', IY, 'A', [`\\(I_L = \\dfrac{${T(Pin)}}{\\sqrt3\\cdot 380\\cdot 0{,}85} = ${T(IY)}\\,[A]\\)`], [ID, IY / SQ3, Pin / (380 * 0.85)]),
    P('c) Corriente por bobina en delta', ID / SQ3, 'A', [`\\(I_f = \\dfrac{${T(ID)}}{\\sqrt3} = ${T(ID / SQ3)}\\,[A]\\)`, `En estrella \\(I_f = I_L = ${T(IY)}\\,[A]\\): prácticamente igual.`], [ID, ID * SQ3, IY / SQ3]),
  ]);
}
{
  const Pu = 1200 * 0.82, w = Pu / 6.5, n = w * 60 / (2 * PI), s = (1500 - n) / 1500;
  add('CA', 3, 'ind', 'Velocidad desde el torque', 'Un motor de inducción trifásico de 220 [V]/50 [Hz] y 4 polos mueve una carga de 6,5 [Nm]. Consume de la red 1,2 [kW] y su rendimiento es 0,82. Determine la velocidad del eje y el deslizamiento.', [
    P('Potencia útil', Pu, 'W', ['\\(P_{útil} = 0{,}82\\cdot 1200 = 984\\,[W]\\)'], [1200, 1463, 216]),
    P('Velocidad angular', w, 'rad/s', [`\\(\\omega = \\dfrac{984}{6{,}5} = ${T(w)}\\,[rad/s]\\)`], [1200 / 6.5, rpm2rad(1500), 984 / 6.5 / 2 / PI]),
    P('Velocidad del eje', n, 'rpm', [`\\(n = \\dfrac{60\\cdot ${T(w)}}{2\\pi} = ${T(n)}\\,[rpm]\\)`], [1500, w * 60, 1200 / 6.5 * 60 / 2 / PI]),
    P('Deslizamiento', pc(s), '%', ['\\(n_{sinc} = \\dfrac{120\\cdot 50}{4} = 1500\\,[rpm]\\)', `\\(s = \\dfrac{1500 - ${T(n)}}{1500}\\cdot 100 = ${T(pc(s))}\\%\\)`], [pc(1 - 0.82), pc((3000 - n) / 3000), pc(s) * 2]),
  ]);
}
{
  const E = 4500 * 60, Pu = 500 * G * 18 / 30, eta = Pu / 4500, Pu2 = 0.8 * 4500, n = 1500 * 0.97, Tq = Pu2 / rpm2rad(n);
  add('CA', 4, 'fund', 'Ascensor', 'Un motor de inducción trifásico mueve la cabina de un ascensor de 500 [kg]. En la subida en vacío consume 4,5 [kW] y tarda 30 [s] en recorrer 6 pisos de 3 [m] cada uno.', [
    P('a) Energía consumida al subir 12 pisos', E, 'J', ['12 pisos tardan el doble: 60 [s]', `\\(E = P\\,t = 4500\\cdot 60 = ${T(E)}\\,[J]\\) (= 0,075 kWh)`], [4500 * 30, 500 * G * 36, E / 2]),
    P('b) Rendimiento en la subida', pc(eta), '%', [`\\(P_{útil} = \\dfrac{m g h}{t} = \\dfrac{500\\cdot 9{,}8\\cdot 18}{30} = ${T(Pu)}\\,[W]\\)`, `\\(\\eta = \\dfrac{${T(Pu)}}{4500} = ${T(pc(eta))}\\%\\)`], [pc(500 * 18 / 30 / 4500 * 10 / 9.8 * 9.8 / 10 * 1.5), pc(Pu / 4500 / 2), pc(1 - eta)]),
    P('c) Torque con η = 80% y s = 3%', Tq, 'Nm', [`\\(P_{útil} = 0{,}8\\cdot 4500 = 3600\\,[W]\\)`, `\\(n = 1500(1 - 0{,}03) = 1455\\,[rpm] \\Rightarrow \\omega = ${T(rpm2rad(n))}\\,[rad/s]\\)`, `\\(\\tau = \\dfrac{3600}{${T(rpm2rad(n))}} = ${T(Tq)}\\,[Nm]\\)`], [3600 / rpm2rad(1500), 4500 / rpm2rad(n), 3600 / 1455]),
  ], 'Se usa g = 9,8 m/s². Con 9,81 los resultados cambian menos del 0,2% y también se aceptan.');
}
{
  const Pin = 50 * HP / 0.85, IL = Pin / (SQ3 * 380 * 0.8), S = Pin / 0.8, Q = S * 0.6;
  add('CA', 5, 'trif', 'Motor de 50 HP en estrella', 'Un motor trifásico de 50 [HP] se conecta a 380 [V], con FP 0,8 inductivo y rendimiento 85%. Suponga conexión estrella.', [
    P('Potencia activa absorbida', Pin, 'W', [`\\(P = \\dfrac{50\\cdot 746}{0{,}85} = ${T(Pin)}\\,[W]\\)`], [37300, 37300 * 0.85, 37300 / 0.8]),
    P('a) Corriente de fase', IL, 'A', [`\\(I_L = \\dfrac{${T(Pin)}}{\\sqrt3\\cdot 380\\cdot 0{,}8} = ${T(IL)}\\,[A]\\)`, 'En estrella \\(I_f = I_L\\)'], [IL / SQ3, Pin / (380 * 0.8), 37300 / (SQ3 * 380 * 0.8)]),
    P('b) Potencia aparente', S, 'VA', [`\\(S = \\dfrac{P}{FP} = ${T(S)}\\,[VA]\\)`], [Pin * 0.8, 37300 / 0.8, Pin + Q]),
    P('b) Potencia reactiva', Q, 'VAR', [`\\(Q = S\\sin\\varphi = ${T(S)}\\cdot 0{,}6 = ${T(Q)}\\,[VAR]\\)`], [S * 0.8, S - Pin, Pin * 0.6]),
  ]);
}
{
  const s = (1800 - 1760) / 1800;
  add('CA', 6, 'ind', 'Deslizamiento desde la placa', 'La placa de un motor de inducción de 2 pares de polos, 60 [Hz], 37,3 [kW] y 460 [V] indica 1760 [rpm] a carga nominal.', [
    P('Velocidad sincrónica', 1800, 'rpm', ['\\(n_{sinc} = \\dfrac{60\\cdot 60}{2} = 1800\\,[rpm]\\)'], [3600, 900, 1760]),
    P('a) Deslizamiento', pc(s), '%', [`\\(s = \\dfrac{1800 - 1760}{1800} = ${T(pc(s))}\\%\\)`], [pc(40 / 1760), pc(1840 / 3600 / 10), pc(s) * 2]),
    P('b) Frecuencia del rotor', s * 60, 'Hz', [`\\(f_r = s f_e = ${T(s)}\\cdot 60 = ${T(s * 60)}\\,[Hz]\\)`], [60, 60 * (1 - s), pc(s)]),
  ]);
}
{
  add('CA', 7, 'ind', 'Polos desde la velocidad', 'Un motor trifásico de inducción trabaja casi a 900 [rpm] sin carga y a 873 [rpm] a plena carga, alimentado a 60 [Hz].', [
    P('a) Número de polos', 8, 'polos', ['\\(n_{sinc} \\approx 900\\,[rpm]\\)', '\\(P = \\dfrac{120\\cdot 60}{900} = 8\\) polos (4 pares)'], [4, 16, 6]),
    P('b) Deslizamiento a plena carga', 3, '%', ['\\(s = \\dfrac{900 - 873}{900} = 0{,}03 = 3\\%\\)'], [pc(27 / 873), 2.7, 6]),
    P('c) Frecuencia del rotor', 1.8, 'Hz', ['\\(f_r = 0{,}03\\cdot 60 = 1{,}8\\,[Hz]\\)'], [58.2, 3, 1.5]),
  ]);
}
{
  const PEH = 7500, s = 0.02, Pcr = s * PEH, Pst = 1.5 * Pcr, Pin = PEH + Pst, Pconv = PEH - Pcr, eta = Pconv / Pin;
  add('CA', 8, 'flujo', 'Potencia en el entrehierro de 7,5 kW', 'Un motor de inducción trifásico con 2 pares de polos tiene una potencia de entrehierro de 7,5 [kW] a 50 [Hz] y deslizamiento 2%. Además \\(P_{CU1} + P_H = 1{,}5\\,P_{CU2}\\).', [
    P('a) Velocidad del rotor', 1470, 'rpm', ['\\(n_{sinc} = \\dfrac{60\\cdot 50}{2} = 1500\\,[rpm]\\)', '\\(n = 1500(1 - 0{,}02) = 1470\\,[rpm]\\)'], [1500, 2940, 735]),
    P('b) Pérdidas en el cobre del rotor', Pcr, 'W', ['\\(P_{CU2} = s P_{EH} = 0{,}02\\cdot 7500 = 150\\,[W]\\)'], [7350, 225, 147]),
    P('c) Potencia de entrada', Pin, 'W', ['\\(P_{CU1} + P_H = 1{,}5\\cdot 150 = 225\\,[W]\\)', `\\(P_{entrada} = 7500 + 225 = ${T(Pin)}\\,[W]\\)`], [7500, 7650, 7350]),
    P('c) Rendimiento', pc(eta), '%', [`\\(P_{salida} \\approx P_{conv} = 7500 - 150 = 7350\\,[W]\\) (sin pérdidas mecánicas dadas)`, `\\(\\eta = \\dfrac{7350}{${T(Pin)}} = ${T(pc(eta))}\\%\\)`], [pc(7500 / 7725), 98, pc(7350 / 7500)]),
  ]);
}
{
  const d = { V: 460, R1: 0.294, R2: 0.144, X1: 0.503, X2: 0.209, XM: 13.25, s: 0.02, f: 50, poles: 6 };
  const m = inductionModel(d), Pout = m.Pconv - 1000, tl = Pout / m.wm;
  add('CA', 9, 'circ', 'Circuito equivalente (460 V, 3 pares de polos)', 'Motor de inducción trifásico en estrella, 460 [V], 7,5 [kW], 50 [Hz] y 3 pares de polos. Constantes por fase referidas al estator: \\(R_1 = 0{,}294\\), \\(R_2 = 0{,}144\\), \\(X_1 = 0{,}503\\), \\(X_2 = 0{,}209\\), \\(X_M = 13{,}25\\,[Ω]\\). Pérdidas por fricción, ventilación y núcleo constantes de 1 [kW]. Calcule para s = 2%.', [
    P('a) Velocidad del eje', m.nm, 'rpm', ['\\(n_{sinc} = \\dfrac{60\\cdot 50}{3} = 1000\\,[rpm]\\)', '\\(n = 1000(1-0{,}02) = 980\\,[rpm]\\)'], [1000, 1470, 490]),
    P('b) Corriente del estator', m.I1, 'A', [`\\(V_\\phi = 460/\\sqrt3 = ${T(m.Vf)}\\,[V]\\)`, `\\(Z_F = \\dfrac{j13{,}25\\,(7{,}2 + j0{,}209)}{7{,}2 + j13{,}459} = ${T(m.ZF.re)} + j${T(m.ZF.im)}\\,[Ω]\\)`, `\\(Z_{tot} = 0{,}294 + j0{,}503 + Z_F = ${T(Math.hypot(m.Z.re, m.Z.im))}\\angle ${T(m.phi)}^\\circ\\,[Ω]\\)`, `\\(I_1 = \\dfrac{${T(m.Vf)}}{${T(Math.hypot(m.Z.re, m.Z.im))}} = ${T(m.I1)}\\,[A]\\)`], [460 / Math.hypot(m.Z.re, m.Z.im), m.I1 * SQ3, m.Vf / 7.6]),
    P('c) Factor de potencia', m.fp, '', [`\\(FP = \\cos(${T(m.phi)}^\\circ) = ${T(m.fp)}\\) inductivo`], [Math.sin(m.phi * PI / 180), 0.8, 0.9]),
    P('d) Potencia convertida', m.Pconv, 'W', [`\\(P_{entrada} = 3V_\\phi I_1 FP = ${T(m.Pin)}\\,[W]\\)`, `\\(P_{EH} = P_{entrada} - 3I_1^2R_1 = ${T(m.Pin)} - ${T(m.Pce)} = ${T(m.PEH)}\\,[W]\\)`, `\\(P_{conv} = (1 - 0{,}02)\\,P_{EH} = ${T(m.Pconv)}\\,[W]\\)`], [m.PEH, Pout, m.Pin]),
    P('d) Potencia de salida', Pout, 'W', [`\\(P_{salida} = ${T(m.Pconv)} - 1000 = ${T(Pout)}\\,[W]\\)`], [m.Pconv, 7500, m.PEH - 1000]),
    P('e) Torque inducido', m.PEH / m.ws, 'Nm', [`\\(\\tau_{ind} = \\dfrac{P_{EH}}{\\omega_{sinc}} = \\dfrac{${T(m.PEH)}}{${T(m.ws)}} = ${T(m.PEH / m.ws)}\\,[Nm]\\)`], [tl, m.PEH / m.wm, m.Pin / m.ws]),
    P('e) Torque de carga', tl, 'Nm', [`\\(\\tau_{carga} = \\dfrac{P_{salida}}{\\omega_m} = \\dfrac{${T(Pout)}}{${T(m.wm)}} = ${T(tl)}\\,[Nm]\\)`], [m.PEH / m.ws, Pout / m.ws, 7500 / m.wm]),
    P('f) Rendimiento', pc(Pout / m.Pin), '%', [`\\(\\eta = \\dfrac{${T(Pout)}}{${T(m.Pin)}} = ${T(pc(Pout / m.Pin))}\\%\\)`], [pc(m.Pconv / m.Pin), 98, pc(7500 / m.Pin)]),
  ], 'Los datos de placa (7,5 kW) no calzan con el resultado a s = 2%: se respeta el enunciado y se calcula con el circuito.');
}
{
  const d = { V: 380, R1: 0.641, R2: 0.33, X1: 1.1, X2: 0.465, XM: 25, f: 50, poles: 4 };
  const t = thevenin(d), t2 = thevenin({ ...d, R2: 0.66 });
  add('CA', 10, 'circ', 'Torque máximo y de arranque (50 HP)', 'Motor de inducción de 4 polos, 50 [HP], 380 [V], 50 [Hz], en estrella, con \\(R_1 = 0{,}641\\), \\(R_2 = 0{,}33\\), \\(X_1 = 1{,}1\\), \\(X_2 = 0{,}465\\), \\(X_M = 25\\,[Ω]\\). Pérdidas rotacionales 1,3 [kW]; s = 2,4%.', [
    P('Voltaje de Thevenin', t.VTH, 'V', [`\\(V_{TH} = \\dfrac{380}{\\sqrt3}\\cdot\\dfrac{25}{26{,}1} = ${T(t.VTH)}\\,[V]\\)`], [380 * t.k, t.Vf, t.VTH * SQ3]),
    P('Resistencia de Thevenin', t.RTH, 'Ω', [`\\(R_{TH} = 0{,}641\\left(\\dfrac{25}{26{,}1}\\right)^2 = ${T(t.RTH)}\\,[Ω]\\)`], [0.641, 0.641 * t.k, 0.33]),
    P('a) Deslizamiento de torque máximo', pc(t.smax), '%', [`\\(s_{máx} = \\dfrac{0{,}33}{\\sqrt{${T(t.RTH)}^2 + 1{,}565^2}} = ${T(t.smax)}\\)`], [2.4, pc(0.33 / 1.565), pc(t.smax * 2)]),
    P('a) Velocidad de torque máximo', 1500 * (1 - t.smax), 'rpm', [`\\(n = 1500(1 - ${T(t.smax)}) = ${T(1500 * (1 - t.smax))}\\,[rpm]\\)`], [1500 * 0.976, 1500 * t.smax, 1500]),
    P('a) Torque máximo', t.tmax, 'Nm', [`\\(\\omega_{sinc} = 50\\pi = ${T(t.ws)}\\,[rad/s]\\)`, `\\(\\tau_{máx} = \\dfrac{3\\cdot ${T(t.VTH)}^2}{2\\cdot ${T(t.ws)}\\left(${T(t.RTH)} + \\sqrt{${T(t.RTH)}^2 + 1{,}565^2}\\right)} = ${T(t.tmax)}\\,[Nm]\\)`], [t.tmax * 2, t.tarr, t.tmax / 3]),
    P('b) Torque de arranque', t.tarr, 'Nm', [`\\(\\tau_{arr} = \\dfrac{3\\cdot ${T(t.VTH)}^2\\cdot 0{,}33}{${T(t.ws)}\\left[(${T(t.RTH)} + 0{,}33)^2 + 1{,}565^2\\right]} = ${T(t.tarr)}\\,[Nm]\\)`], [t.tmax, t2.tarr, t.tarr * 3]),
    P('c) Velocidad de torque máximo con R2 doble', 1500 * (1 - t2.smax), 'rpm', [`\\(s'_{máx} = 2\\cdot ${T(t.smax)} = ${T(t2.smax)}\\)`, `\\(n = 1500(1 - ${T(t2.smax)}) = ${T(1500 * (1 - t2.smax))}\\,[rpm]\\)`, 'El torque máximo sigue siendo el mismo.'], [1500 * (1 - t.smax), 750, 1500 * t2.smax]),
    P('c) Nuevo torque de arranque', t2.tarr, 'Nm', [`\\(\\tau'_{arr} = \\dfrac{3\\cdot ${T(t.VTH)}^2\\cdot 0{,}66}{${T(t.ws)}\\left[(${T(t.RTH)} + 0{,}66)^2 + 1{,}565^2\\right]} = ${T(t2.tarr)}\\,[Nm]\\)`], [2 * t.tarr, t.tarr, t.tmax]),
  ], 'Se usan las aproximaciones de Thevenin del formulario. Con el Thevenin exacto los valores cambian menos de 0,5%.');
}
{
  const Pin = 45000 / 0.91, Pl = Pin - 45000, PEH = Pin - 1300 - 1200, Pmec = Pl - 1200 - 1300 - 950, fp = Pin / (SQ3 * 220 * 148);
  add('CA', 11, 'flujo', 'Balance de un motor de 45 kW', 'Motor trifásico de inducción de 45 [kW], 50 [Hz], 220 [V], 3 pares de polos. A carga nominal: rendimiento 91%, corriente 148 [A], deslizamiento 2%. Pérdidas: hierro 1,2 [kW], cobre del estator 1,3 [kW], cobre del rotor 0,95 [kW].', [
    P('a) Potencia de entrada', Pin, 'W', [`\\(P_{entrada} = \\dfrac{45000}{0{,}91} = ${T(Pin)}\\,[W]\\)`], [45000 * 0.91, 45000 + 3450, SQ3 * 220 * 148]),
    P('b) Pérdidas totales', Pl, 'W', [`\\(P_{pérd} = ${T(Pin)} - 45000 = ${T(Pl)}\\,[W]\\)`], [3450, 45000 * 0.09, 4050]),
    P('c) Potencia en el entrehierro', PEH, 'W', [`\\(P_{EH} = ${T(Pin)} - 1300 - 1200 = ${T(PEH)}\\,[W]\\)`], [Pin - 1300, PEH - 950, 45000 + 950]),
    P('d) Pérdidas mecánicas', Pmec, 'W', [`\\(P_{mec} = ${T(Pl)} - 1200 - 1300 - 950 = ${T(Pmec)}\\,[W]\\)`], [Pl - 2500, Pl, 950]),
    P('e) Velocidad nominal', 980, 'rpm', ['\\(n_{sinc} = \\dfrac{60\\cdot 50}{3} = 1000\\,[rpm]\\); \\(n = 1000\\cdot 0{,}98 = 980\\,[rpm]\\)'], [1000, 1960, 490]),
    P('f) Factor de potencia', fp, '', [`\\(FP = \\dfrac{${T(Pin)}}{\\sqrt3\\cdot 220\\cdot 148} = ${T(fp)}\\)`], [45000 / (SQ3 * 220 * 148), Pin / (220 * 148) / 2, 0.91]),
  ]);
}
{
  const s = 3 / 50;
  add('CA', 12, 'flujo', 'Rotor que consume 120 kW a 3 Hz', 'El rotor de un motor trifásico de inducción de 50 [Hz] y 2 pares de polos consume 120 [kW] a 3 [Hz].', [
    P('Deslizamiento', pc(s), '%', ['\\(s = \\dfrac{f_r}{f_e} = \\dfrac{3}{50} = 0{,}06 = 6\\%\\)'], [3, 5, 94]),
    P('a) Velocidad del rotor', 1500 * (1 - s), 'rpm', ['\\(n = 1500(1 - 0{,}06) = 1410\\,[rpm]\\)'], [1500, 2820, 1455]),
    P('b) Pérdidas en el cobre del rotor', s * 120000, 'W', ['Los 120 kW que recibe el rotor son la potencia del entrehierro.', '\\(P_{PCR} = s P_{EH} = 0{,}06\\cdot 120000 = 7200\\,[W]\\)'], [112800, 3600, 7200 * 2]),
  ]);
}
{
  const IL = 5000 / (SQ3 * 380 * 0.85), S = 5000 / 0.85, Q = Math.sqrt(S * S - 25e6);
  add('CA', 13, 'trif', 'Motor de 5 kW en estrella', 'Un motor trifásico en estrella se conecta a 380 [V] de línea. Su potencia activa es 5 [kW] con FP 0,85.', [
    P('a) Corriente de línea', IL, 'A', [`\\(I_L = \\dfrac{5000}{\\sqrt3\\cdot 380\\cdot 0{,}85} = ${T(IL)}\\,[A]\\)`], [5000 / (380 * 0.85), IL * SQ3, 5000 / (3 * 380 * 0.85)]),
    P('b) Corriente de fase', IL, 'A', ['En estrella \\(I_f = I_L\\)'], [IL / SQ3, IL * SQ3, IL / 3]),
    P('c) Tensión de fase', 380 / SQ3, 'V', [`\\(V_f = \\dfrac{380}{\\sqrt3} = ${T(380 / SQ3)}\\,[V]\\)`], [380, 380 * SQ3, 380 / 3]),
    P('d) Potencia reactiva', Q, 'VAR', [`\\(S = 5000/0{,}85 = ${T(S)}\\,[VA]\\); \\(Q = \\sqrt{S^2 - P^2} = ${T(Q)}\\,[VAR]\\)`], [S - 5000, 5000 * 0.85, S]),
    P('e) Potencia aparente', S, 'VA', [`\\(S = ${T(S)}\\,[VA]\\)`], [5000 * 0.85, 5000 + Q, 5000]),
  ]);
}
{
  const Pu = 38 * G * 8 / 2;
  add('CA', 14, 'fund', 'Potencia para levantar bloques', 'Determine la potencia en HP de un motor que levanta bloques de 38 [kg] hasta una altura de 8 [m] en 2 [s] a velocidad constante.', [
    P('Potencia en watts', Pu, 'W', [`\\(P = \\dfrac{m g h}{t} = \\dfrac{38\\cdot 9{,}8\\cdot 8}{2} = ${T(Pu)}\\,[W]\\)`], [38 * 8 / 2, 38 * G * 8, 38 * 10 * 8]),
    P('Potencia en HP', Pu / HP, 'HP', [`\\(P = \\dfrac{${T(Pu)}}{746} = ${T(Pu / HP)} \\approx 2\\,[HP]\\)`], [Pu / 1000, Pu / 735 * 1.1, 4]),
  ]);
}
{
  const If = 10, IL = 10 * SQ3, fp = Math.cos(35 * PI / 180), P3 = 3 * 240 * 10 * fp, Q = 3 * 240 * 10 * Math.sin(35 * PI / 180);
  add('CA', 15, 'trif', 'Carga 24∠35° en triángulo', 'Una carga trifásica de impedancia \\(24\\angle 35^\\circ\\,[Ω]\\) se conecta en triángulo a un sistema de 240 [V RMS], secuencia ABC.', [
    P('a) Corriente de fase', If, 'A', ['En triángulo \\(V_f = V_L = 240\\,[V]\\)', '\\(I_f = \\dfrac{240}{24} = 10\\,[A]\\)'], [IL, 10 / SQ3, 240 / SQ3 / 24]),
    P('a) Corriente de línea', IL, 'A', [`\\(I_L = \\sqrt3\\cdot 10 = ${T(IL)}\\,[A]\\)`], [10, 30, 10 / SQ3]),
    P('b) Factor de potencia', fp, '', [`\\(FP = \\cos 35^\\circ = ${T(fp)}\\) inductivo`], [Math.sin(35 * PI / 180), Math.abs(Math.cos(35)), 0.85]),
    P('c) Potencia activa', P3, 'W', [`\\(P = 3\\cdot 240\\cdot 10\\cdot ${T(fp)} = ${T(P3)}\\,[W]\\)`], [7200, Q, P3 / 3]),
    P('c) Potencia reactiva', Q, 'VAR', [`\\(Q = 3\\cdot 240\\cdot 10\\cdot\\sin 35^\\circ = ${T(Q)}\\,[VAR]\\)`], [P3, 7200, Q / 3]),
    P('c) Potencia aparente', 7200, 'VA', ['\\(S = 3\\cdot 240\\cdot 10 = 7200\\,[VA]\\)'], [P3 + Q, 2400, 7200 * SQ3]),
  ]);
}
{
  const Vf = 380 / SQ3, I = Vf / 13;
  add('CA', 16, 'trif', 'Carga 13∠20° en estrella, secuencia negativa', 'Se conecta una impedancia equilibrada de \\(13\\angle 20^\\circ\\,[Ω]\\) en estrella a un sistema de 380 [V RMS], secuencia TSR (negativa). Determine los fasores de tensión de fase y de corriente de línea.', [
    P('Módulo de la tensión de fase', Vf, 'V', [`\\(|V_f| = \\dfrac{380}{\\sqrt3} = ${T(Vf)}\\,[V]\\)`, 'Tomando \\(V_{AN}\\) como referencia y secuencia negativa: \\(V_{AN} = 219{,}4\\angle 0^\\circ\\), \\(V_{BN} = 219{,}4\\angle +120^\\circ\\), \\(V_{CN} = 219{,}4\\angle -120^\\circ\\,[V]\\)'], [380, 380 * SQ3, 380 / 3]),
    P('Módulo de las corrientes de línea', I, 'A', [`\\(|I| = \\dfrac{${T(Vf)}}{13} = ${T(I)}\\,[A]\\)`, `\\(I_A = ${T(I)}\\angle -20^\\circ\\), \\(I_B = ${T(I)}\\angle 100^\\circ\\), \\(I_C = ${T(I)}\\angle -140^\\circ\\,[A]\\)`, 'En el diagrama fasorial cada corriente queda 20° atrasada respecto de su tensión.'], [380 / 13, I * SQ3, I / SQ3]),
    P('Ángulo de la corriente \\(I_B\\) (grados)', 100, '°', ['\\(\\angle I_B = 120^\\circ - 20^\\circ = 100^\\circ\\)'], [140, 120, 80]),
    P('Potencia activa total', 3 * Vf * I * Math.cos(20 * PI / 180), 'W', [`\\(P = 3\\cdot ${T(Vf)}\\cdot ${T(I)}\\cdot\\cos 20^\\circ = ${T(3 * Vf * I * Math.cos(20 * PI / 180))}\\,[W]\\)`], [3 * Vf * I, 3 * Vf * I * Math.sin(20 * PI / 180), Vf * I]),
  ], 'La referencia angular es una elección: si tu profesor toma otra fase como referencia, todos los ángulos se desplazan igual.');
}
{
  const P3 = SQ3 * 240 * 39.1 * 0.5;
  add('CA', 17, 'trif', 'Potencia con FP 0,5', 'Una carga trifásica equilibrada se conecta en delta a 240 [V RMS], secuencia CBA. La corriente de línea es 39,1 [A] y FP = 0,5. Determine la potencia total.', [
    P('Potencia activa total', P3, 'W', [`\\(P = \\sqrt3\\,V_L I_L\\,FP = \\sqrt3\\cdot 240\\cdot 39{,}1\\cdot 0{,}5 = ${T(P3)}\\,[W]\\)`, 'La secuencia no cambia la potencia.'], [240 * 39.1 * 0.5, 3 * 240 * 39.1 * 0.5, SQ3 * 240 * 39.1]),
    P('Potencia aparente', P3 / 0.5, 'VA', [`\\(S = P/FP = ${T(P3 / 0.5)}\\,[VA]\\)`], [P3, P3 * 0.5, 240 * 39.1]),
  ]);
}

export const GUIDE_BY_ID = Object.fromEntries(GUIDE.map(g => [g.id, g]));
