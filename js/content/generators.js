// Generadores de ejercicios con números al azar (el "banco infinito").
// Cada plantilla devuelve un enunciado y varias partes con: respuesta, unidad, desarrollo paso a paso
// y respuestas erróneas típicas (errores comunes) que se usan como alternativas trampa.
import { rng, fmt, T, PI, SQ3, HP, G, rpm2rad, rad2rpm, deg } from '../util.js';

const P = (q, ans, unit, steps, wrong = []) => ({ q, ans, unit, steps, wrong });
const W = (x) => fmt(x);                 // número para texto normal
const pc = (x) => x * 100;               // fracción → %

// Velocidad sincrónica con P = número de POLOS (formulario: 120·f/P = 60·f/PP)
const nSync = (f, poles) => 120 * f / poles;

export const TEMPLATES = [];
const tpl = (id, topic, title, diff, gen) => { const t = { id, topic, title, diff, gen }; TEMPLATES.push(t); return t; };

// =====================================================================
// FUNDAMENTOS
// =====================================================================
tpl('fund_rend', 'fund', 'Rendimiento, pérdidas y torque', 1, (r) => {
  const eta = r.pick([0.78, 0.8, 0.82, 0.85, 0.88, 0.9, 0.92]);
  const inHP = r.chance(0.5);
  const PuHP = r.pick([0.5, 1, 1.5, 2, 3, 5, 7.5, 10]);
  const Pu = inHP ? PuHP * HP : r.int(8, 120) * 50;
  const n = r.pick([900, 1000, 1200, 1450, 1500, 1750, 1800, 3000]);
  const V = r.pick([110, 220, 230, 240, 440]);
  const Pin = Pu / eta, Pl = Pin - Pu, w = rpm2rad(n), Tq = Pu / w, I = Pin / V;
  const PuTxt = inHP ? `${W(PuHP)} [HP]` : `${W(Pu)} [W]`;
  return {
    text: `Un motor de CC alimentado con ${V} [V] entrega una potencia útil de ${PuTxt} a ${n} [rpm] con un rendimiento de ${W(eta * 100)}%.`,
    parts: [
      P('¿Cuál es la potencia absorbida (de entrada)?', Pin, 'W', [
        inHP ? `Pasar a watts: \\(P_{útil} = ${T(PuHP)}\\cdot 746 = ${T(Pu)}\\,[W]\\)` : `\\(P_{útil} = ${T(Pu)}\\,[W]\\)`,
        `\\(\\eta = \\dfrac{P_{útil}}{P_{abs}} \\Rightarrow P_{abs} = \\dfrac{P_{útil}}{\\eta} = \\dfrac{${T(Pu)}}{${T(eta)}} = ${T(Pin)}\\,[W]\\)`,
      ], [Pu * eta, Pu * (1 + (1 - eta)), inHP ? PuHP * 735 / eta : Pu / eta * 1.1]),
      P('¿Cuánto suman las pérdidas?', Pl, 'W', [
        `\\(P_{pérdidas} = P_{abs} - P_{útil} = ${T(Pin)} - ${T(Pu)} = ${T(Pl)}\\,[W]\\)`,
      ], [Pu * (1 - eta), Pin * eta, Pu - Pu * eta]),
      P('¿Cuál es el torque útil en el eje?', Tq, 'Nm', [
        `\\(\\omega = n\\cdot\\dfrac{2\\pi}{60} = ${n}\\cdot\\dfrac{2\\pi}{60} = ${T(w)}\\,[rad/s]\\)`,
        `\\(\\tau = \\dfrac{P_{útil}}{\\omega} = \\dfrac{${T(Pu)}}{${T(w)}} = ${T(Tq)}\\,[Nm]\\)`,
      ], [Pu / n, Pin / w, Pu / (n * 2 * PI)]),
      P('¿Qué corriente absorbe de la línea?', I, 'A', [
        `\\(I = \\dfrac{P_{abs}}{V} = \\dfrac{${T(Pin)}}{${V}} = ${T(I)}\\,[A]\\)`,
      ], [Pu / V, Pin / (V * SQ3), Pin * eta / V]),
    ],
  };
});

tpl('fund_arranque', 'fund', 'Torque nominal y de arranque', 1, (r) => {
  const PuHP = r.pick([0.5, 0.75, 1, 1.5, 2, 3, 5]);
  const n = r.pick([1200, 1450, 1500, 1750, 1800, 3000, 3600]);
  const k = r.pick([1.5, 2, 2.5, 3]);
  const Pu = PuHP * HP, w = rpm2rad(n), Tn = Pu / w, Ta = k * Tn;
  return {
    text: `Un motor entrega nominalmente ${W(PuHP)} [HP] a ${n} [rpm]. Al arrancar, su torque es ${W(k)} veces el nominal.`,
    parts: [
      P('Potencia útil en watts', Pu, 'W', [`\\(P = ${T(PuHP)}\\cdot 746 = ${T(Pu)}\\,[W]\\)`], [PuHP * 735, PuHP * 1000, PuHP * 746 / 1.36]),
      P('Velocidad angular en rad/s', w, 'rad/s', [`\\(\\omega = \\dfrac{2\\pi n}{60} = \\dfrac{2\\pi\\cdot ${n}}{60} = ${T(w)}\\,[rad/s]\\)`], [n / 60, n * 2 * PI, n * PI / 60]),
      P('Torque nominal', Tn, 'Nm', [`\\(\\tau_n = \\dfrac{P}{\\omega} = \\dfrac{${T(Pu)}}{${T(w)}} = ${T(Tn)}\\,[Nm]\\)`], [Pu / n, Tn * k, Pu * 1000 / w / 1000 * 1.36]),
      P('Torque de arranque', Ta, 'Nm', [`\\(\\tau_{arr} = ${T(k)}\\cdot\\tau_n = ${T(k)}\\cdot ${T(Tn)} = ${T(Ta)}\\,[Nm]\\)`], [Tn, Tn / k, Pu / n * k]),
    ],
  };
});

tpl('fund_elevar', 'fund', 'Potencia para levantar una carga', 1, (r) => {
  const m = r.pick([20, 38, 50, 75, 100, 150, 250, 400, 500, 800]);
  const h = r.pick([3, 5, 6, 8, 10, 12, 15, 18]);
  const t = r.pick([2, 3, 4, 5, 6, 8, 10, 15, 20, 30]);
  const Pin = Math.ceil((m * G * h / t) / (r.pick([0.6, 0.7, 0.75, 0.8])) / 50) * 50;
  const E = m * G * h, Pu = E / t, Php = Pu / HP, eta = Pu / Pin;
  return {
    text: `Un motor levanta una masa de ${m} [kg] hasta ${h} [m] de altura en ${t} [s] a velocidad constante, consumiendo ${W(Pin)} [W] de la red (use g = 9,8 m/s²).`,
    parts: [
      P('Energía (trabajo) entregado a la carga', E, 'J', [`\\(E = m g h = ${m}\\cdot 9{,}8\\cdot ${h} = ${T(E)}\\,[J]\\)`], [m * h, m * G * h / t, m * 10 * h * 1.2]),
      P('Potencia útil', Pu, 'W', [`\\(P = \\dfrac{E}{t} = \\dfrac{${T(E)}}{${t}} = ${T(Pu)}\\,[W]\\)`], [E, m * h / t, E * t / 100]),
      P('Potencia útil en HP', Php, 'HP', [`\\(P = \\dfrac{${T(Pu)}}{746} = ${T(Php)}\\,[HP]\\)`], [Pu / 1000, Pu / 735, Pu * 746 / 1e6]),
      P('Rendimiento del sistema', pc(eta), '%', [`\\(\\eta = \\dfrac{P_{útil}}{P_{consumida}} = \\dfrac{${T(Pu)}}{${T(Pin)}} = ${T(pc(eta))}\\%\\)`], [pc(Pin / Pu) > 100 ? pc(1 - eta) : pc(Pin / Pu), pc(eta) * 0.9, pc(1 - eta)]),
    ],
  };
});

// =====================================================================
// MÁQUINA DE CC
// =====================================================================
tpl('cc_serie', 'cc', 'Motor CC serie', 2, (r) => {
  const V = r.pick([110, 120, 220, 230, 240, 250]);
  const Ra = r.pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.4]);
  const Rf = r.pick([0.1, 0.2, 0.3, 0.5, 0.8, 1]);
  const Ia = r.int(10, 50);
  const brush = r.chance(0.5) ? 2 : 0;
  const k = r.pick([1.5, 2, 2.5]);
  const n = r.pick([1000, 1200, 1500, 1750, 1800]);
  const Vrot = V - Ia * (Ra + Rf) - brush;
  const Pin = V * Ia, Pconv = Vrot * Ia, Pcu = Ia * Ia * (Ra + Rf), eta = Pconv / Pin;
  const Iarr = (V - brush) / (Ra + Rf);
  const Rreo = (V - brush) / (k * Ia) - (Ra + Rf);
  const w = rpm2rad(n), Tq = Pconv / w;
  const bTxt = brush ? ' Hay 2 escobillas con una caída de 1 [V] cada una.' : ' Desprecie la caída en escobillas y las inductancias.';
  const bT = brush ? ' - 2' : '';
  return {
    text: `Un motor de CC serie se alimenta con ${V} [V] y consume ${Ia} [A] girando a ${n} [rpm]. La resistencia de armadura es ${W(Ra)} [Ω] y la de campo ${W(Rf)} [Ω].${bTxt} Considere que la potencia útil es la convertida (\\(V_{rot}I_a\\)).`,
    parts: [
      P('Voltaje de rotación (fuerza contraelectromotriz)', Vrot, 'V', [
        `En serie la misma corriente pasa por armadura y campo: \\(I_a = I_f = ${Ia}\\,[A]\\)`,
        `\\(V = I_a(R_a + R_f) + V_{rot}${brush ? ' + V_{esc}' : ''} \\Rightarrow V_{rot} = ${V} - ${Ia}(${T(Ra)} + ${T(Rf)})${bT} = ${T(Vrot)}\\,[V]\\)`,
      ], [V - Ia * Ra - brush, V - Ia * (Ra + Rf), V - Ia * Rf - brush, V - brush]),
      P('Potencia absorbida de la red', Pin, 'W', [`\\(P_{abs} = V\\cdot I = ${V}\\cdot ${Ia} = ${T(Pin)}\\,[W]\\)`], [Pconv, V * Ia * 0.9, Ia * Ia * (Ra + Rf)]),
      P('Pérdidas en el cobre (armadura + campo)', Pcu, 'W', [`\\(P_{cu} = I_a^2(R_a+R_f) = ${Ia}^2(${T(Ra + Rf)}) = ${T(Pcu)}\\,[W]\\)`], [Ia * Ia * Ra, Ia * (Ra + Rf), Ia * Ia * Rf]),
      P('Rendimiento', pc(eta), '%', [`\\(\\eta = \\dfrac{V_{rot}I_a}{V I_a} = \\dfrac{${T(Pconv)}}{${T(Pin)}} = ${T(pc(eta))}\\%\\)`], [pc((V - Ia * Ra) / V), pc(1 - eta), pc(Vrot / (V + brush + 1))]),
      P('Torque desarrollado', Tq, 'Nm', [`\\(\\omega = ${T(w)}\\,[rad/s]\\)`, `\\(\\tau = \\dfrac{V_{rot} I_a}{\\omega} = \\dfrac{${T(Pconv)}}{${T(w)}} = ${T(Tq)}\\,[Nm]\\)`], [Pconv / n, Pin / w, Pconv / (n / 60)]),
      P('Corriente de arranque sin reóstato', Iarr, 'A', [
        `Al arrancar \\(\\omega = 0 \\Rightarrow V_{rot} = 0\\)`,
        `\\(I_{arr} = \\dfrac{V${bT}}{R_a+R_f} = \\dfrac{${V - brush}}{${T(Ra + Rf)}} = ${T(Iarr)}\\,[A]\\)`,
      ], [V / Ra, (V - Vrot) / (Ra + Rf), V / Rf]),
      P(`Reóstato de arranque para que \\(I_{arr}\\) no supere ${W(k)} veces la nominal`, Rreo, 'Ω', [
        `\\(I_{arr,máx} = ${T(k)}\\cdot ${Ia} = ${T(k * Ia)}\\,[A]\\)`,
        `\\(R_a+R_f+R_{reo} = \\dfrac{V${bT}}{I_{arr,máx}} = \\dfrac{${V - brush}}{${T(k * Ia)}} = ${T((V - brush) / (k * Ia))}\\,[Ω]\\)`,
        `\\(R_{reo} = ${T((V - brush) / (k * Ia))} - ${T(Ra + Rf)} = ${T(Rreo)}\\,[Ω]\\)`,
      ], [(V - brush) / (k * Ia), V / (k * Ia) - Ra, (V - brush) / Ia - (Ra + Rf)]),
    ],
  };
});

tpl('cc_shunt', 'cc', 'Motor CC shunt (derivación)', 2, (r) => {
  const V = r.pick([220, 230, 240, 250, 440, 500]);
  const Rf = r.pick([100, 120, 150, 200, 220, 250]);
  const Ra = r.pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.5]);
  const Ia = r.int(12, 60);
  const brush = r.chance(0.5) ? 2 : 0;
  const n = r.pick([900, 1000, 1150, 1200, 1500, 1750]);
  const If = V / Rf, IL = Ia + If, Vrot = V - Ia * Ra - brush;
  const Pin = V * IL, Pconv = Vrot * Ia;
  const Pu = Math.round(Pconv * r.pick([0.9, 0.92, 0.94, 0.95]) / 10) * 10;
  const w = rpm2rad(n), Tq = Pu / w, eta = Pu / Pin;
  const Prot = Pconv - Pu;                                        // mecánicas + magnéticas
  const Pcu = Ia * Ia * Ra + If * If * Rf + brush * Ia;
  const bTxt = brush ? ' Considere 2 escobillas con caída de 1 [V] cada una.' : '';
  return {
    text: `Un motor de CC shunt se conecta a ${V} [V] y consume ${W(IL)} [A] de la línea. La resistencia de armadura es ${W(Ra)} [Ω] y la del campo ${Rf} [Ω].${bTxt} Entrega ${W(Pu)} [W] útiles a ${n} [rpm].`,
    parts: [
      P('Corriente de campo', If, 'A', [`El campo está en paralelo con la fuente: \\(I_f = \\dfrac{V}{R_f} = \\dfrac{${V}}{${Rf}} = ${T(If)}\\,[A]\\)`], [IL, V / (Rf + Ra), IL - Ia * 0.9]),
      P('Corriente de armadura', Ia, 'A', [`\\(I_L = I_a + I_f \\Rightarrow I_a = ${T(IL)} - ${T(If)} = ${T(Ia)}\\,[A]\\)`], [IL, IL + If, V / Ra / 100]),
      P('Voltaje de rotación', Vrot, 'V', [`\\(V_{rot} = V - I_a R_a${brush ? ' - V_{esc}' : ''} = ${V} - ${T(Ia)}\\cdot ${T(Ra)}${brush ? ' - 2' : ''} = ${T(Vrot)}\\,[V]\\)`], [V - IL * Ra - brush, V - Ia * Ra - (brush ? 1 : 2), V - Ia * (Ra + 1)]),
      P('Torque útil', Tq, 'Nm', [`\\(\\omega = \\dfrac{2\\pi\\cdot ${n}}{60} = ${T(w)}\\,[rad/s]\\)`, `\\(\\tau_{útil} = \\dfrac{P_{útil}}{\\omega} = \\dfrac{${T(Pu)}}{${T(w)}} = ${T(Tq)}\\,[Nm]\\)`], [Pu / n, Pconv / w, Pin / w]),
      P('Rendimiento', pc(eta), '%', [`\\(P_{abs} = V I_L = ${V}\\cdot ${T(IL)} = ${T(Pin)}\\,[W]\\)`, `\\(\\eta = \\dfrac{${T(Pu)}}{${T(Pin)}} = ${T(pc(eta))}\\%\\)`], [pc(Pu / (V * Ia)), pc(Pconv / Pin), pc(1 - eta)]),
      P('Pérdidas mecánicas + magnéticas', Prot, 'W', [
        `Potencia convertida: \\(P_{conv} = V_{rot}I_a = ${T(Vrot)}\\cdot ${T(Ia)} = ${T(Pconv)}\\,[W]\\)`,
        `\\(P_{mec}+P_{mag} = P_{conv} - P_{útil} = ${T(Pconv)} - ${T(Pu)} = ${T(Prot)}\\,[W]\\)`,
        `Comprobación: \\(P_{abs} = P_{útil} + P_{mec+mag} + P_{cu} = ${T(Pu)} + ${T(Prot)} + ${T(Pcu)} = ${T(Pu + Prot + Pcu)}\\,[W]\\)`,
      ], [Pin - Pu, Pin - Pu - Ia * Ia * Ra, Pcu]),
    ],
  };
});

tpl('cc_indep', 'cc', 'Motor CC de excitación independiente', 3, (r) => {
  const Va = r.pick([120, 180, 220, 240, 250, 300]);
  const Ra = r.pick([0.02, 0.03, 0.05, 0.08, 0.1, 0.2]);
  const Ia = r.int(20, 150);
  const n = r.int(80, 120) * 10 + r.int(0, 9);
  const Va2 = Va - r.pick([20, 30, 40, 50]);
  const If = r.pick([1.5, 2, 2.5, 3, 4.3, 5]);
  const Vrot = Va - Ia * Ra, w = rpm2rad(n), K = Vrot / w, Tq = K * Ia;
  const Iarr = Va / Ra, Tarr = K * Iarr;
  const Vrot2 = Va2 - Ia * Ra, n2 = n * Vrot2 / Vrot;
  const Gfq = K / If;
  return {
    text: `Un motor de CC de excitación independiente opera con \\(V_a = ${Va}\\,[V]\\), \\(I_a = ${Ia}\\,[A]\\) y gira a ${n} [rpm] moviendo una carga de torque constante. \\(R_a = ${T(Ra)}\\,[Ω]\\); desprecie las inductancias. La corriente de campo es \\(I_f = ${T(If)}\\,[A]\\) y se mantiene constante.`,
    parts: [
      P('Voltaje de rotación con carga', Vrot, 'V', [`\\(V_{rot} = V_a - R_a I_a = ${Va} - ${T(Ra)}\\cdot ${Ia} = ${T(Vrot)}\\,[V]\\)`], [Va, Va + Ia * Ra, Ia * Ra]),
      P('Torque desarrollado', Tq, 'Nm', [`\\(\\omega = ${T(w)}\\,[rad/s]\\)`, `\\(\\tau = \\dfrac{V_{rot} I_a}{\\omega} = \\dfrac{${T(Vrot)}\\cdot ${Ia}}{${T(w)}} = ${T(Tq)}\\,[Nm]\\)`], [Vrot * Ia / n, Va * Ia / w, Vrot / w]),
      P('Corriente de arranque (sin reóstato)', Iarr, 'A', [`Al arrancar \\(V_{rot}=0\\): \\(I_{arr} = \\dfrac{V_a}{R_a} = \\dfrac{${Va}}{${T(Ra)}} = ${T(Iarr)}\\,[A]\\)`], [Vrot / Ra, Ia * 3, Va / (Ra + 1)]),
      P('Torque de arranque', Tarr, 'Nm', [`Con flujo constante \\(\\tau = K I_a\\), donde \\(K = \\dfrac{V_{rot}}{\\omega} = \\dfrac{${T(Vrot)}}{${T(w)}} = ${T(K)}\\)`, `\\(\\tau_{arr} = K\\,I_{arr} = ${T(K)}\\cdot ${T(Iarr)} = ${T(Tarr)}\\,[Nm]\\)`], [Tq * 3, Iarr * Vrot / rpm2rad(n) / 10, Tq]),
      P(`Velocidad si \\(V_a\\) baja a ${Va2} [V] con el mismo torque`, n2, 'rpm', [
        `Mismo torque y mismo flujo ⇒ misma corriente \\(I_a = ${Ia}\\,[A]\\)`,
        `\\(V_{rot,2} = ${Va2} - ${T(Ra)}\\cdot ${Ia} = ${T(Vrot2)}\\,[V]\\)`,
        `La velocidad es proporcional a \\(V_{rot}\\): \\(n_2 = n_1\\dfrac{V_{rot,2}}{V_{rot,1}} = ${n}\\cdot\\dfrac{${T(Vrot2)}}{${T(Vrot)}} = ${T(n2)}\\,[rpm]\\)`,
      ], [n * Va2 / Va * 1.02, n * Vrot / Vrot2, n - (Va - Va2)]),
      P('Constante \\(G_{fq}\\) (inductancia mutua campo–armadura)', Gfq, 'H', [`\\(V_{rot} = G_{fq} I_f \\omega \\Rightarrow G_{fq} = \\dfrac{V_{rot}}{I_f\\,\\omega} = \\dfrac{${T(Vrot)}}{${T(If)}\\cdot ${T(w)}} = ${T(Gfq)}\\,[H]\\)`], [Vrot / (If * n), K * If, Va / (If * w) * 1.1]),
    ],
  };
});

tpl('cc_reostato', 'cc', 'Arranque de motor shunt con reóstato', 2, (r) => {
  const V = r.pick([220, 240, 250, 440, 500]);
  const Ra = r.pick([0.1, 0.15, 0.2, 0.25]);
  const Rr = r.pick([1, 1.5, 2, 2.5, 3]);
  const Rf = r.pick([200, 250, 400, 500]);
  const Vrot = V - r.int(8, 25);
  const eta = r.pick([0.8, 0.85, 0.88, 0.9]);
  const Iarr = V / (Ra + Rr), Ia = (V - Vrot) / Ra, If = V / Rf, IL = Ia + If, Pin = V * IL, Pu = eta * Pin;
  return {
    text: `Un motor shunt conectado a ${V} [V] produce un voltaje de rotación de ${Vrot} [V] en régimen. \\(R_a = ${T(Ra)}\\,[Ω]\\), \\(R_f = ${Rf}\\,[Ω]\\) y el reóstato de arranque es de ${W(Rr)} [Ω] (se retira una vez que el motor arranca). Rendimiento: ${W(eta * 100)}%.`,
    parts: [
      P('Corriente de arranque en la armadura', Iarr, 'A', [`Al arrancar \\(V_{rot}=0\\) y el reóstato está en serie: \\(I_{arr} = \\dfrac{V}{R_a + R_{reo}} = \\dfrac{${V}}{${T(Ra + Rr)}} = ${T(Iarr)}\\,[A]\\)`], [V / Ra, V / Rr, (V - Vrot) / (Ra + Rr)]),
      P('Corriente de armadura en régimen permanente', Ia, 'A', [`Sin reóstato: \\(I_a = \\dfrac{V - V_{rot}}{R_a} = \\dfrac{${V} - ${Vrot}}{${T(Ra)}} = ${T(Ia)}\\,[A]\\)`], [(V - Vrot) / (Ra + Rr), V / Ra, Vrot / Ra / 10]),
      P('Corriente de campo', If, 'A', [`\\(I_f = \\dfrac{V}{R_f} = \\dfrac{${V}}{${Rf}} = ${T(If)}\\,[A]\\)`], [Vrot / Rf, V / (Rf + Ra), If * 2]),
      P('Corriente absorbida de la fuente', IL, 'A', [`\\(I_L = I_a + I_f = ${T(Ia)} + ${T(If)} = ${T(IL)}\\,[A]\\)`], [Ia, Ia - If, Iarr + If]),
      P('Potencia absorbida', Pin, 'W', [`\\(P = V I_L = ${V}\\cdot ${T(IL)} = ${T(Pin)}\\,[W]\\)`], [V * Ia, Vrot * IL, Pu]),
      P('Potencia útil', Pu, 'W', [`\\(P_{útil} = \\eta P_{abs} = ${T(eta)}\\cdot ${T(Pin)} = ${T(Pu)}\\,[W]\\)`], [Pin / eta, Vrot * Ia, Pin * (1 - eta)]),
    ],
  };
});

// =====================================================================
// CONTROL DE CC
// =====================================================================
tpl('ccctrl_reg', 'ccctrl', 'Regulación de campo y de armadura', 2, (r) => {
  const P0 = r.int(4, 30) * 250, n0 = r.pick([1000, 1200, 1500, 1800]);
  const kf = r.pick([1.2, 1.25, 1.5, 2]);                   // debilitamiento de campo: n sube kf veces
  const ka = r.pick([0.5, 0.6, 0.75, 0.8]);                 // armadura: Vrot baja a ka
  const Vv = r.pick([230, 240, 250, 460]), drop = r.int(3, 9) / 100;
  const Vpc = Math.round(Vv * (1 - drop));
  const w0 = rpm2rad(n0), T0 = P0 / w0, T1 = T0 / kf, n2 = n0 * ka, P2 = P0 * ka, RV = (Vv - Vpc) / Vpc;
  return {
    text: `Un motor de CC entrega ${W(P0)} [W] a ${n0} [rpm]. Se estudian dos formas de control: (1) regulación de campo, que sube la velocidad ${W(kf)} veces; (2) regulación de armadura, que deja \\(V_{rot}\\) en el ${W(ka * 100)}% del valor inicial. Además, el rectificador que lo alimenta entrega ${Vv} [V] en vacío y ${Vpc} [V] a plena carga.`,
    parts: [
      P('Torque inicial', T0, 'Nm', [`\\(\\tau_0 = \\dfrac{P}{\\omega} = \\dfrac{${T(P0)}}{${T(w0)}} = ${T(T0)}\\,[Nm]\\)`], [P0 / n0, T0 * kf, P0 / (n0 / 60)]),
      P('Torque con regulación de campo (potencia constante)', T1, 'Nm', [`Regulación de campo = potencia constante: \\(P = \\tau\\omega\\) fijo.`, `Si \\(\\omega\\) sube ${T(kf)} veces, \\(\\tau\\) baja ${T(kf)} veces: \\(\\tau_1 = \\dfrac{${T(T0)}}{${T(kf)}} = ${T(T1)}\\,[Nm]\\)`], [T0, T0 * kf, T0 / (kf * kf)]),
      P('Velocidad con regulación de armadura (torque constante)', n2, 'rpm', [`Regulación de armadura = torque constante, \\(I_a\\) constante y solo cambia \\(V_{rot}\\).`, `\\(n \\propto V_{rot}\\): \\(n_2 = ${T(ka)}\\cdot ${n0} = ${T(n2)}\\,[rpm]\\)`], [n0, n0 / ka, n0 * ka * ka]),
      P('Potencia con regulación de armadura', P2, 'W', [`\\(P_2 = \\tau_0\\,\\omega_2 = ${T(T0)}\\cdot ${T(rpm2rad(n2))} = ${T(P2)}\\,[W]\\)`], [P0, P0 / ka, P0 * kf]),
      P('Regulación de voltaje del rectificador', pc(RV), '%', [`\\(RV = \\dfrac{V_{vacío} - V_{plena}}{V_{plena}}\\cdot 100\\% = \\dfrac{${Vv} - ${Vpc}}{${Vpc}}\\cdot 100 = ${T(pc(RV))}\\%\\)`], [pc((Vv - Vpc) / Vv), pc(Vpc / Vv), pc(RV) * 2]),
    ],
  };
});

// =====================================================================
// TRIFÁSICO
// =====================================================================
tpl('trif_motor', 'trif', 'Corrientes y potencias de un motor trifásico', 2, (r) => {
  const VL = r.pick([220, 380, 400, 440, 460]);
  const conn = r.pick(['estrella', 'triángulo']);
  const inHP = r.chance(0.4);
  const PuHP = r.pick([5, 10, 15, 20, 30, 50]);
  const Pu = inHP ? PuHP * HP : r.int(3, 60) * 500;
  const fp = r.pick([0.75, 0.8, 0.82, 0.85, 0.88, 0.9]);
  const eta = r.pick([0.82, 0.85, 0.88, 0.9, 0.92]);
  const Pin = Pu / eta, IL = Pin / (SQ3 * VL * fp), S = Pin / fp, Q = Math.sqrt(S * S - Pin * Pin);
  const If = conn === 'estrella' ? IL : IL / SQ3, Vf = conn === 'estrella' ? VL / SQ3 : VL;
  return {
    text: `Un motor trifásico de ${inHP ? W(PuHP) + ' [HP]' : W(Pu) + ' [W]'} útiles se conecta en ${conn} a una red de ${VL} [V] de línea. Factor de potencia ${W(fp)} inductivo y rendimiento ${W(eta * 100)}%.`,
    parts: [
      P('Potencia activa absorbida', Pin, 'W', [inHP ? `\\(P_{útil} = ${T(PuHP)}\\cdot 746 = ${T(Pu)}\\,[W]\\)` : `\\(P_{útil} = ${T(Pu)}\\,[W]\\)`, `\\(P = \\dfrac{P_{útil}}{\\eta} = \\dfrac{${T(Pu)}}{${T(eta)}} = ${T(Pin)}\\,[W]\\)`], [Pu * eta, Pu, Pu / fp]),
      P('Corriente de línea', IL, 'A', [`\\(P = \\sqrt3\\,V_L I_L\\,FP \\Rightarrow I_L = \\dfrac{${T(Pin)}}{\\sqrt3\\cdot ${VL}\\cdot ${T(fp)}} = ${T(IL)}\\,[A]\\)`], [Pin / (VL * fp), Pin / (3 * VL * fp), Pu / (SQ3 * VL * fp)]),
      P('Corriente por cada bobina (fase)', If, 'A', [conn === 'estrella' ? `En estrella la corriente de fase es igual a la de línea: \\(I_f = I_L = ${T(IL)}\\,[A]\\)` : `En triángulo: \\(I_f = \\dfrac{I_L}{\\sqrt3} = \\dfrac{${T(IL)}}{\\sqrt3} = ${T(If)}\\,[A]\\)`], [conn === 'estrella' ? IL / SQ3 : IL, IL * SQ3, IL / 3]),
      P('Tensión en cada bobina (fase)', Vf, 'V', [conn === 'estrella' ? `En estrella: \\(V_f = \\dfrac{V_L}{\\sqrt3} = \\dfrac{${VL}}{\\sqrt3} = ${T(Vf)}\\,[V]\\)` : `En triángulo la tensión de fase es la de línea: \\(V_f = ${VL}\\,[V]\\)`], [conn === 'estrella' ? VL : VL / SQ3, VL * SQ3, VL / 3]),
      P('Potencia aparente', S, 'VA', [`\\(S = \\dfrac{P}{FP} = \\dfrac{${T(Pin)}}{${T(fp)}} = ${T(S)}\\,[VA]\\)`], [Pin * fp, Pu / fp, SQ3 * VL * IL * fp]),
      P('Potencia reactiva', Q, 'VAR', [`\\(Q = \\sqrt{S^2 - P^2} = \\sqrt{${T(S)}^2 - ${T(Pin)}^2} = ${T(Q)}\\,[VAR]\\)`], [S - Pin, S * fp, Pin * Math.tan(Math.acos(fp)) * 1.15]),
    ],
  };
});

tpl('trif_carga', 'trif', 'Carga trifásica equilibrada (fasores)', 2, (r) => {
  const Z = r.pick([8, 10, 12, 13, 15, 20, 24, 30]);
  const th = r.pick([20, 25, 30, 35, 36.87, 40, 45, 53.13, 60]);
  const VL = r.pick([208, 220, 240, 380, 400]);
  const conn = r.pick(['estrella', 'triángulo']);
  const Vf = conn === 'estrella' ? VL / SQ3 : VL;
  const If = Vf / Z, IL = conn === 'estrella' ? If : If * SQ3;
  const fp = Math.cos(th * PI / 180), Pt = 3 * Vf * If * fp, Q = 3 * Vf * If * Math.sin(th * PI / 180), S = 3 * Vf * If;
  return {
    text: `Una carga trifásica equilibrada de \\(Z = ${T(Z)}\\angle ${T(th)}^\\circ\\,[Ω]\\) por fase se conecta en ${conn} a un sistema de ${VL} [V] de línea (RMS).`,
    parts: [
      P('Corriente de fase', If, 'A', [conn === 'estrella' ? `\\(V_f = \\dfrac{${VL}}{\\sqrt3} = ${T(Vf)}\\,[V]\\)` : `En triángulo \\(V_f = V_L = ${VL}\\,[V]\\)`, `\\(I_f = \\dfrac{V_f}{|Z|} = \\dfrac{${T(Vf)}}{${T(Z)}} = ${T(If)}\\,[A]\\)`], [VL / Z, If * SQ3, If / SQ3]),
      P('Corriente de línea', IL, 'A', [conn === 'estrella' ? `En estrella \\(I_L = I_f = ${T(IL)}\\,[A]\\)` : `En triángulo \\(I_L = \\sqrt3\\,I_f = ${T(IL)}\\,[A]\\)`], [conn === 'estrella' ? IL * SQ3 : If, IL * 3, VL / Z * 3]),
      P('Factor de potencia', fp, '', [`\\(FP = \\cos(${T(th)}^\\circ) = ${T(fp)}\\) (inductivo, porque el ángulo de Z es positivo)`], [Math.sin(th * PI / 180), Math.abs(Math.cos(th)), 1 - fp]),
      P('Potencia activa total', Pt, 'W', [`\\(P = 3V_f I_f\\cos\\theta = 3\\cdot ${T(Vf)}\\cdot ${T(If)}\\cdot ${T(fp)} = ${T(Pt)}\\,[W]\\)`], [S, Q, Pt / 3]),
      P('Potencia reactiva total', Q, 'VAR', [`\\(Q = 3V_f I_f\\sin\\theta = ${T(Q)}\\,[VAR]\\)`], [Pt, S - Pt, Q / 3]),
      P('Potencia aparente total', S, 'VA', [`\\(S = 3V_f I_f = 3\\cdot ${T(Vf)}\\cdot ${T(If)} = ${T(S)}\\,[VA]\\)`], [Pt + Q, S / SQ3, VL * IL]),
    ],
  };
});

tpl('trif_placa', 'trif', 'Placa 220/380 V: estrella o triángulo', 1, (r) => {
  const Pu = r.int(4, 60) * 500, fp = r.pick([0.8, 0.82, 0.85, 0.87, 0.9]), eta = r.pick([0.85, 0.88, 0.9, 0.92]);
  const Pin = Pu / eta, ID = Pin / (SQ3 * 220 * fp), IY = Pin / (SQ3 * 380 * fp);
  return {
    text: `La placa de un motor de inducción trifásico indica 220/380 [V], FP ${W(fp)}, rendimiento ${W(eta * 100)}% y potencia útil ${W(Pu)} [W]. Recuerde: la tensión mayor de la placa corresponde a la conexión en ESTRELLA.`,
    parts: [
      P('Potencia absorbida', Pin, 'W', [`\\(P = \\dfrac{${T(Pu)}}{${T(eta)}} = ${T(Pin)}\\,[W]\\)`], [Pu * eta, Pu, Pu / fp]),
      P('Corriente de línea conectado en triángulo (red de 220 V)', ID, 'A', [`\\(I_L = \\dfrac{P}{\\sqrt3\\cdot 220\\cdot FP} = \\dfrac{${T(Pin)}}{\\sqrt3\\cdot 220\\cdot ${T(fp)}} = ${T(ID)}\\,[A]\\)`], [IY, ID / SQ3, Pin / (220 * fp)]),
      P('Corriente de línea conectado en estrella (red de 380 V)', IY, 'A', [`\\(I_L = \\dfrac{${T(Pin)}}{\\sqrt3\\cdot 380\\cdot ${T(fp)}} = ${T(IY)}\\,[A]\\)`], [ID, IY * SQ3, Pin / (380 * fp)]),
      P('Corriente por bobina en triángulo', ID / SQ3, 'A', [`\\(I_f = \\dfrac{I_L}{\\sqrt3} = \\dfrac{${T(ID)}}{\\sqrt3} = ${T(ID / SQ3)}\\,[A]\\)`, `Fíjate: es (casi) igual a la corriente por bobina en estrella, ${T(IY)} [A]. La bobina trabaja igual en ambos casos.`], [ID, ID * SQ3, IY / SQ3]),
    ],
  };
});

// =====================================================================
// MÁQUINA SINCRÓNICA
// =====================================================================
tpl('sinc_vel', 'sinc', 'Velocidad y frecuencia en la máquina sincrónica', 1, (r) => {
  const poles = r.pick([2, 4, 6, 8, 10, 12]);
  const n = r.pick([600, 720, 750, 900, 1000, 1200, 1500, 1800, 3000, 3600].filter(x => [50, 60].includes(x * poles / 120)) .concat([]));
  const nn = n || 120 * 50 / poles;
  const fe = nn * poles / 120, wm = rpm2rad(nn), we = 2 * PI * fe;
  const f2 = fe === 50 ? 60 : 50, n2 = 120 * f2 / poles;
  return {
    text: `El rotor de un generador sincrónico de ${poles} polos gira a ${nn} [rpm].`,
    parts: [
      P('Velocidad mecánica en rad/s', wm, 'rad/s', [`\\(\\omega_m = \\dfrac{2\\pi\\cdot ${nn}}{60} = ${T(wm)}\\,[rad/s]\\)`], [nn / 60, nn * 2 * PI, we]),
      P('Frecuencia eléctrica generada', fe, 'Hz', [`\\(n_m = \\dfrac{120 f_e}{P} \\Rightarrow f_e = \\dfrac{P\\,n_m}{120} = \\dfrac{${poles}\\cdot ${nn}}{120} = ${T(fe)}\\,[Hz]\\)`], [nn * poles / 60, nn / 60, nn * poles / 240]),
      P('Frecuencia eléctrica en rad/s', we, 'rad/s', [`\\(\\omega_e = 2\\pi f_e = 2\\pi\\cdot ${T(fe)} = ${T(we)}\\,[rad/s]\\)`, `También \\(\\omega_e = \\dfrac{P}{2}\\omega_m\\)`], [wm, fe, wm * poles]),
      P(`Velocidad necesaria para generar ${f2} [Hz]`, n2, 'rpm', [`\\(n_m = \\dfrac{120\\cdot ${f2}}{${poles}} = ${T(n2)}\\,[rpm]\\)`], [60 * f2 / poles, 120 * f2 / (poles / 2), nn * f2 / fe * 2]),
    ],
  };
});

tpl('sinc_perd', 'sinc', 'Pérdidas y potencia máxima del motor sincrónico', 2, (r) => {
  const Ia = r.int(10, 80), Ra = r.pick([0.05, 0.1, 0.15, 0.2, 0.3]);
  const If = r.pick([2, 3, 4, 5, 8]), Rf = r.pick([10, 15, 20, 30, 40]);
  const V = r.pick([220, 254, 277, 380]), EA = Math.round(V * r.pick([0.9, 1, 1.1, 1.2])), Xs = r.pick([2, 2.5, 3, 4, 5]);
  const poles = r.pick([4, 6, 8]), f = r.pick([50, 60]);
  const pce = 3 * Ia * Ia * Ra, pcr = If * If * Rf, Pmax = 3 * V * EA / Xs, wm = rpm2rad(nSync(f, poles)), Tmax = Pmax / wm;
  return {
    text: `Un motor sincrónico trifásico de ${poles} polos y ${f} [Hz] tiene \\(V_{\\phi} = ${V}\\,[V]\\), \\(E_A = ${EA}\\,[V]\\), \\(X_S = ${T(Xs)}\\,[Ω]\\), \\(R_A = ${T(Ra)}\\,[Ω]\\). Su armadura lleva \\(I_A = ${Ia}\\,[A]\\) y su campo \\(I_F = ${If}\\,[A]\\) con \\(R_F = ${Rf}\\,[Ω]\\).`,
    parts: [
      P('Pérdidas en el cobre del estator', pce, 'W', [`\\(P_{PCE} = 3I_A^2R_A = 3\\cdot ${Ia}^2\\cdot ${T(Ra)} = ${T(pce)}\\,[W]\\)`], [Ia * Ia * Ra, 3 * Ia * Ra, SQ3 * Ia * Ia * Ra]),
      P('Pérdidas en el cobre del rotor', pcr, 'W', [`El campo es un solo devanado de CC: \\(P_{PCR} = I_F^2R_F = ${If}^2\\cdot ${Rf} = ${T(pcr)}\\,[W]\\)`], [3 * pcr, If * Rf, pcr / 3]),
      P('Velocidad del rotor', nSync(f, poles), 'rpm', [`Gira exactamente a la velocidad sincrónica: \\(n_m = \\dfrac{120 f}{P} = \\dfrac{120\\cdot ${f}}{${poles}} = ${T(nSync(f, poles))}\\,[rpm]\\)`], [60 * f / poles, nSync(f, poles) * 0.97, 120 * f / (poles / 2)]),
      P('Potencia máxima', Pmax, 'W', [`\\(P_{máx} = \\dfrac{3 V_{\\phi} E_A}{X_S} = \\dfrac{3\\cdot ${V}\\cdot ${EA}}{${T(Xs)}} = ${T(Pmax)}\\,[W]\\)`], [V * EA / Xs, 3 * V * EA * Xs / 100, SQ3 * V * EA / Xs]),
      P('Torque máximo', Tmax, 'Nm', [`\\(\\tau_{máx} = \\dfrac{P_{máx}}{\\omega_m} = \\dfrac{${T(Pmax)}}{${T(wm)}} = ${T(Tmax)}\\,[Nm]\\)`], [Pmax / nSync(f, poles), Tmax / 3, Pmax / (2 * PI * f)]),
    ],
  };
});

// =====================================================================
// INDUCCIÓN: VELOCIDAD Y DESLIZAMIENTO
// =====================================================================
tpl('ind_desliz', 'ind', 'Velocidad sincrónica, deslizamiento y frecuencia del rotor', 1, (r) => {
  const f = r.pick([50, 60]);
  const pp = r.pick([1, 2, 3, 4]);
  const poles = 2 * pp, ns = nSync(f, poles);
  const s = r.pick([0.02, 0.025, 0.03, 0.035, 0.04, 0.05]);
  const nm = Math.round(ns * (1 - s));
  const sr = (ns - nm) / ns, fr = sr * f, usePP = r.chance(0.5);
  return {
    text: `Un motor de inducción trifásico de ${usePP ? pp + ' pares de polos' : poles + ' polos'}, ${f} [Hz], gira a ${nm} [rpm] con carga nominal.`,
    parts: [
      P('Velocidad sincrónica', ns, 'rpm', [usePP ? `\\(P = 2\\cdot PP = ${poles}\\) polos` : `\\(PP = P/2 = ${pp}\\) pares de polos`, `\\(n_{sinc} = \\dfrac{120 f}{P} = \\dfrac{60 f}{PP} = \\dfrac{120\\cdot ${f}}{${poles}} = ${T(ns)}\\,[rpm]\\)`], [120 * f / pp, 60 * f / poles, nm]),
      P('Deslizamiento', pc(sr), '%', [`\\(s = \\dfrac{n_{sinc} - n_m}{n_{sinc}}\\cdot 100\\% = \\dfrac{${T(ns)} - ${nm}}{${T(ns)}}\\cdot 100 = ${T(pc(sr))}\\%\\)`], [pc((ns - nm) / nm), pc((120 * f / pp - nm) / (120 * f / pp)), pc(sr) * 10]),
      P('Frecuencia de las corrientes del rotor', fr, 'Hz', [`\\(f_r = s\\,f_e = ${T(sr)}\\cdot ${f} = ${T(fr)}\\,[Hz]\\)`], [f, f * (1 - sr), pc(sr) * f]),
      P('Velocidad del rotor en rad/s', rpm2rad(nm), 'rad/s', [`\\(\\omega_m = \\dfrac{2\\pi\\cdot ${nm}}{60} = ${T(rpm2rad(nm))}\\,[rad/s]\\)`], [nm / 60, rpm2rad(ns), nm * 2 * PI]),
    ],
  };
});

tpl('ind_polos', 'ind', 'Encontrar los polos desde la velocidad', 2, (r) => {
  const f = r.pick([50, 60]), poles = r.pick([2, 4, 6, 8, 10, 12]);
  const ns = nSync(f, poles), s = r.pick([0.02, 0.025, 0.03, 0.04, 0.05]);
  const nfull = Math.round(ns * (1 - s));
  const n0 = Math.round(ns * 0.997);
  const sr = (ns - nfull) / ns;
  return {
    text: `Un motor de inducción trifásico trabaja casi a ${n0} [rpm] sin carga y a ${nfull} [rpm] a plena carga, alimentado a ${f} [Hz].`,
    parts: [
      P('¿Cuántos polos tiene?', poles, 'polos', [`En vacío el rotor gira casi a la velocidad sincrónica, así que \\(n_{sinc}\\) es el valor de la tabla más cercano por arriba: ${T(ns)} [rpm].`, `\\(P = \\dfrac{120 f}{n_{sinc}} = \\dfrac{120\\cdot ${f}}{${T(ns)}} = ${poles}\\) polos`], [poles / 2, poles * 2, poles + 2]),
      P('Velocidad sincrónica', ns, 'rpm', [`\\(n_{sinc} = ${T(ns)}\\,[rpm]\\)`], [n0, nfull, ns * 2]),
      P('Deslizamiento a plena carga', pc(sr), '%', [`\\(s = \\dfrac{${T(ns)} - ${nfull}}{${T(ns)}}\\cdot 100 = ${T(pc(sr))}\\%\\)`], [pc((n0 - nfull) / n0), pc((ns - nfull) / nfull), pc(sr) / 2]),
      P('Frecuencia de las corrientes del rotor', sr * f, 'Hz', [`\\(f_r = s f_e = ${T(sr)}\\cdot ${f} = ${T(sr * f)}\\,[Hz]\\)`], [f, f * (1 - sr), pc(sr)]),
    ],
  };
});

tpl('ind_carga', 'ind', 'Velocidad del eje desde el torque de la carga', 2, (r) => {
  const f = r.pick([50, 60]), poles = r.pick([2, 4, 6]);
  const ns = nSync(f, poles), s = r.pick([0.025, 0.03, 0.035, 0.04, 0.05]);
  const nm = ns * (1 - s), w = rpm2rad(nm);
  const Pin = r.int(4, 40) * 100 + 200, eta = r.pick([0.78, 0.8, 0.82, 0.85, 0.88]);
  const Pu = Pin * eta, Tq = Math.round(Pu / w * 10) / 10;
  const w2 = Pu / Tq, n2 = rad2rpm(w2), s2 = (ns - n2) / ns;
  return {
    text: `Un motor de inducción trifásico de ${f} [Hz] y ${poles} polos mueve una carga de ${W(Tq)} [Nm]. Consume de la red ${W(Pin)} [W] y su rendimiento es ${W(eta)}.`,
    parts: [
      P('Potencia útil', Pu, 'W', [`\\(P_{útil} = \\eta P_{abs} = ${T(eta)}\\cdot ${T(Pin)} = ${T(Pu)}\\,[W]\\)`], [Pin / eta, Pin, Pin * (1 - eta)]),
      P('Velocidad angular del eje', w2, 'rad/s', [`\\(\\omega = \\dfrac{P_{útil}}{\\tau} = \\dfrac{${T(Pu)}}{${T(Tq)}} = ${T(w2)}\\,[rad/s]\\)`], [Pin / Tq, rpm2rad(ns), Pu / Tq / (2 * PI)]),
      P('Velocidad del eje en rpm', n2, 'rpm', [`\\(n = \\dfrac{60\\,\\omega}{2\\pi} = ${T(n2)}\\,[rpm]\\)`], [w2 * 60, ns, rad2rpm(Pin / Tq)]),
      P('Deslizamiento', pc(s2), '%', [`\\(n_{sinc} = \\dfrac{120\\cdot ${f}}{${poles}} = ${T(ns)}\\,[rpm]\\)`, `\\(s = \\dfrac{${T(ns)} - ${T(n2)}}{${T(ns)}}\\cdot 100 = ${T(pc(s2))}\\%\\)`], [pc((ns - n2) / n2), pc(1 - eta), pc(s2) * 2]),
    ],
  };
});

// =====================================================================
// INDUCCIÓN: FLUJO DE POTENCIAS
// =====================================================================
tpl('flujo_peh', 'flujo', 'Potencia en el entrehierro y pérdidas del rotor', 2, (r) => {
  const pp = r.pick([1, 2, 3]), f = r.pick([50, 60]), poles = 2 * pp;
  const PEH = r.int(10, 150) * 250, s = r.pick([0.02, 0.025, 0.03, 0.04, 0.05]);
  const kst = r.pick([1.2, 1.5, 2]);
  const ns = nSync(f, poles), nm = ns * (1 - s), Pcr = s * PEH, Pconv = (1 - s) * PEH;
  const PstP = kst * Pcr, Pin = PEH + PstP, eta = Pconv / Pin, tind = PEH / rpm2rad(ns);
  return {
    text: `Un motor de inducción trifásico con ${pp} ${pp === 1 ? 'par' : 'pares'} de polos, ${f} [Hz], tiene una potencia en el entrehierro de ${W(PEH)} [W] con deslizamiento de ${W(s * 100)}%. Las pérdidas del estator (cobre + núcleo) valen ${W(kst)} veces las del cobre del rotor. Desprecie las pérdidas mecánicas.`,
    parts: [
      P('Velocidad mecánica del rotor', nm, 'rpm', [`\\(n_{sinc} = \\dfrac{60 f}{PP} = \\dfrac{60\\cdot ${f}}{${pp}} = ${T(ns)}\\,[rpm]\\)`, `\\(n_m = n_{sinc}(1-s) = ${T(ns)}(1 - ${T(s)}) = ${T(nm)}\\,[rpm]\\)`], [ns, nm / 2, 120 * f / pp * (1 - s)]),
      P('Pérdidas en el cobre del rotor', Pcr, 'W', [`\\(P_{PCR} = s\\,P_{EH} = ${T(s)}\\cdot ${T(PEH)} = ${T(Pcr)}\\,[W]\\)`], [(1 - s) * PEH, s * Pconv, PEH / s / 100]),
      P('Potencia convertida (mecánica)', Pconv, 'W', [`\\(P_{conv} = (1-s)P_{EH} = ${T(1 - s)}\\cdot ${T(PEH)} = ${T(Pconv)}\\,[W]\\)`], [PEH, Pcr, PEH * (1 + s)]),
      P('Potencia de entrada', Pin, 'W', [`\\(P_{PCE} + P_{núcleo} = ${T(kst)}\\cdot ${T(Pcr)} = ${T(PstP)}\\,[W]\\)`, `\\(P_{entrada} = P_{EH} + P_{PCE} + P_{núcleo} = ${T(PEH)} + ${T(PstP)} = ${T(Pin)}\\,[W]\\)`], [PEH, PEH + Pcr, Pconv + PstP]),
      P('Rendimiento', pc(eta), '%', [`\\(\\eta = \\dfrac{P_{salida}}{P_{entrada}} = \\dfrac{${T(Pconv)}}{${T(Pin)}} = ${T(pc(eta))}\\%\\)`], [pc(PEH / Pin), pc(1 - s), pc(Pconv / PEH)]),
      P('Torque inducido', tind, 'Nm', [`\\(\\tau_{ind} = \\dfrac{P_{EH}}{\\omega_{sinc}} = \\dfrac{${T(PEH)}}{${T(rpm2rad(ns))}} = ${T(tind)}\\,[Nm]\\)`, `(es lo mismo que \\(P_{conv}/\\omega_m\\))`], [PEH / rpm2rad(nm) * (1 + s) * 1.03, Pconv / rpm2rad(ns), PEH / ns]),
    ],
  };
});

tpl('flujo_balance', 'flujo', 'Balance de potencias completo (placa y pérdidas)', 3, (r) => {
  const pp = r.pick([2, 3]), f = 50, V = r.pick([220, 380, 400]);
  const Pout = r.int(8, 60) * 1000, s = r.pick([0.02, 0.025, 0.03]);
  const Pfe = Math.round(Pout * r.real(0.02, 0.035, 0.001) / 50) * 50;
  const Pc1 = Math.round(Pout * r.real(0.025, 0.04, 0.001) / 50) * 50;
  const Pmec0 = Math.round(Pout * r.real(0.015, 0.03, 0.001) / 50) * 50;
  const PEH0 = (Pout + Pmec0) / (1 - s), Pc2 = Math.round(s * PEH0 / 10) * 10;
  const eta = Math.round(Pout / (PEH0 + Pc1 + Pfe) * 1000) / 1000;
  const Pin = Pout / eta, Ptot = Pin - Pout, PEH = Pin - Pc1 - Pfe, Pmec = Ptot - Pfe - Pc1 - Pc2;
  const fp = r.pick([0.82, 0.85, 0.87, 0.88]), I = Pin / (SQ3 * V * fp);
  const Ir = Math.round(I), fpr = Pin / (SQ3 * V * Ir);
  const nm = 60 * f / pp * (1 - s);
  return {
    text: `Un motor de inducción trifásico de ${W(Pout)} [W], ${f} [Hz], ${V} [V] y ${pp} pares de polos trabaja a carga nominal con rendimiento de ${W(eta * 100)}%, consume ${Ir} [A] de la red y tiene deslizamiento de ${W(s * 100)}%. Pérdidas: hierro ${W(Pfe)} [W], cobre del estator ${W(Pc1)} [W], cobre del rotor ${W(Pc2)} [W].`,
    parts: [
      P('Potencia de entrada', Pin, 'W', [`\\(P_{entrada} = \\dfrac{P_{salida}}{\\eta} = \\dfrac{${T(Pout)}}{${T(eta)}} = ${T(Pin)}\\,[W]\\)`], [Pout * eta, Pout + Pfe + Pc1 + Pc2, SQ3 * V * Ir]),
      P('Pérdidas totales', Ptot, 'W', [`\\(P_{pérd} = P_{entrada} - P_{salida} = ${T(Pin)} - ${T(Pout)} = ${T(Ptot)}\\,[W]\\)`], [Pfe + Pc1 + Pc2, Pout * (1 - eta), Ptot - Pmec * 2]),
      P('Potencia en el entrehierro', PEH, 'W', [`\\(P_{EH} = P_{entrada} - P_{PCE} - P_{núcleo} = ${T(Pin)} - ${T(Pc1)} - ${T(Pfe)} = ${T(PEH)}\\,[W]\\)`], [Pin - Pc1 - Pfe - Pc2, Pout + Pc2, Pin - Pc1]),
      P('Pérdidas mecánicas (roce y ventilación)', Pmec, 'W', [`\\(P_{mec} = P_{pérd} - P_{hierro} - P_{PCE} - P_{PCR} = ${T(Ptot)} - ${T(Pfe)} - ${T(Pc1)} - ${T(Pc2)} = ${T(Pmec)}\\,[W]\\)`], [Ptot - Pfe - Pc1, Ptot, PEH - Pout]),
      P('Velocidad nominal', nm, 'rpm', [`\\(n_{sinc} = \\dfrac{60\\cdot ${f}}{${pp}} = ${T(60 * f / pp)}\\,[rpm]\\)`, `\\(n = ${T(60 * f / pp)}(1 - ${T(s)}) = ${T(nm)}\\,[rpm]\\)`], [60 * f / pp, 120 * f / pp * (1 - s), 60 * f / (2 * pp) * (1 - s)]),
      P('Factor de potencia', fpr, '', [`\\(FP = \\dfrac{P}{\\sqrt3 V_L I_L} = \\dfrac{${T(Pin)}}{\\sqrt3\\cdot ${V}\\cdot ${Ir}} = ${T(fpr)}\\)`], [Pout / (SQ3 * V * Ir), Pin / (V * Ir) / 2, Pin / (3 * V * Ir) * 1.3]),
    ],
  };
});

tpl('flujo_rotor', 'flujo', 'Frecuencia del rotor y pérdidas del cobre', 2, (r) => {
  const f = r.pick([50, 60]), pp = r.pick([1, 2, 3]);
  const fr = r.pick([1, 1.5, 2, 2.5, 3]);
  const PEH = r.int(10, 200) * 1000;
  const s = fr / f, ns = 60 * f / pp, nm = ns * (1 - s), Pcr = s * PEH, Pconv = PEH - Pcr;
  return {
    text: `El rotor de un motor trifásico de inducción de ${f} [Hz] y ${pp} ${pp === 1 ? 'par' : 'pares'} de polos recibe ${W(PEH / 1000)} [kW] desde el estator (potencia en el entrehierro) y sus corrientes tienen una frecuencia de ${W(fr)} [Hz].`,
    parts: [
      P('Deslizamiento', pc(s), '%', [`\\(f_r = s f_e \\Rightarrow s = \\dfrac{f_r}{f_e} = \\dfrac{${T(fr)}}{${f}} = ${T(s)} = ${T(pc(s))}\\%\\)`], [pc(fr / 60 === s ? fr / 50 : fr / 60), pc(1 - s), fr]),
      P('Velocidad del rotor', nm, 'rpm', [`\\(n_{sinc} = \\dfrac{60\\cdot ${f}}{${pp}} = ${T(ns)}\\,[rpm]\\)`, `\\(n_m = ${T(ns)}(1 - ${T(s)}) = ${T(nm)}\\,[rpm]\\)`], [ns, ns * s, 120 * f / pp * (1 - s)]),
      P('Pérdidas en el cobre del rotor', Pcr, 'W', [`\\(P_{PCR} = s P_{EH} = ${T(s)}\\cdot ${T(PEH)} = ${T(Pcr)}\\,[W]\\)`], [Pconv, PEH * fr / 100, Pcr * pp]),
      P('Potencia convertida', Pconv, 'W', [`\\(P_{conv} = (1-s)P_{EH} = ${T(Pconv)}\\,[W]\\)`], [PEH, Pcr, PEH * (1 + s)]),
    ],
  };
});

// =====================================================================
// INDUCCIÓN: CIRCUITO EQUIVALENTE Y TORQUE
// =====================================================================
const cx = (re, im = 0) => ({ re, im });
const cadd = (a, b) => cx(a.re + b.re, a.im + b.im);
const cmul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
const cabs = (a) => Math.hypot(a.re, a.im);
const carg = (a) => Math.atan2(a.im, a.re);

export function inductionModel({ V, R1, R2, X1, X2, XM, s, f, poles }) {
  const Vf = V / SQ3;
  const Z2 = cx(R2 / s, X2), ZM = cx(0, XM);
  const ZF = cdiv(cmul(ZM, Z2), cadd(ZM, Z2));
  const Z = cadd(cx(R1, X1), ZF);
  const I1 = Vf / cabs(Z), fp = Math.cos(carg(Z));
  const Pin = 3 * Vf * I1 * fp, Pce = 3 * I1 * I1 * R1, PEH = 3 * I1 * I1 * ZF.re;
  const ns = nSync(f, poles), ws = rpm2rad(ns), nm = ns * (1 - s);
  return { Vf, ZF, Z, I1, fp, Pin, Pce, PEH, ns, ws, nm, wm: rpm2rad(nm), Pcr: s * PEH, Pconv: (1 - s) * PEH, phi: deg(carg(Z)) };
}
export function thevenin({ V, R1, R2, X1, X2, XM, f, poles }) {
  const Vf = V / SQ3, k = XM / (X1 + XM);
  const VTH = Vf * k, RTH = R1 * k * k, XTH = X1, ws = rpm2rad(nSync(f, poles));
  const smax = R2 / Math.hypot(RTH, XTH + X2);
  const tmax = 3 * VTH * VTH / (2 * ws * (RTH + Math.hypot(RTH, XTH + X2)));
  const tarr = 3 * VTH * VTH * R2 / (ws * ((RTH + R2) ** 2 + (XTH + X2) ** 2));
  const tind = (s) => 3 * VTH * VTH * R2 / s / (ws * ((RTH + R2 / s) ** 2 + (XTH + X2) ** 2));
  return { Vf, k, VTH, RTH, XTH, ws, smax, tmax, tarr, tind, ns: nSync(f, poles) };
}

const circuitData = (r) => {
  const V = r.pick([380, 400, 440, 460]), f = r.pick([50, 60]), poles = r.pick([4, 6]);
  return {
    V, f, poles,
    R1: r.pick([0.2, 0.25, 0.294, 0.3, 0.4, 0.5, 0.641]),
    R2: r.pick([0.12, 0.144, 0.15, 0.2, 0.25, 0.33]),
    X1: r.pick([0.4, 0.503, 0.6, 0.8, 1.1]),
    X2: r.pick([0.2, 0.209, 0.3, 0.4, 0.465]),
    XM: r.pick([12, 13.25, 15, 20, 25, 30]),
    s: r.pick([0.02, 0.025, 0.03, 0.035, 0.04]),
    loss: r.pick([500, 800, 1000, 1200, 1500]),
  };
};
const circuitText = (d) => `Un motor de inducción trifásico en estrella de ${d.V} [V], ${d.f} [Hz] y ${d.poles} polos tiene, por fase y referidos al estator: \\(R_1 = ${T(d.R1)}\\), \\(R_2 = ${T(d.R2)}\\), \\(X_1 = ${T(d.X1)}\\), \\(X_2 = ${T(d.X2)}\\), \\(X_M = ${T(d.XM)}\\,[Ω]\\).`;

tpl('circ_eq', 'circ', 'Circuito equivalente: corriente, potencias y torque', 3, (r) => {
  const d = circuitData(r), m = inductionModel(d);
  const Pout = m.Pconv - d.loss, tl = Pout / m.wm, eta = Pout / m.Pin;
  const ZFtxt = `${T(m.ZF.re)} + j${T(m.ZF.im)}`;
  return {
    text: circuitText(d) + ` Las pérdidas mecánicas y del núcleo son constantes e iguales a ${W(d.loss)} [W]. Calcule para un deslizamiento de ${W(d.s * 100)}%.`,
    parts: [
      P('Velocidad mecánica del eje', m.nm, 'rpm', [`\\(n_{sinc} = \\dfrac{120\\cdot ${d.f}}{${d.poles}} = ${T(m.ns)}\\,[rpm]\\)`, `\\(n_m = ${T(m.ns)}(1-${T(d.s)}) = ${T(m.nm)}\\,[rpm]\\)`], [m.ns, m.ns * d.s, 60 * d.f / d.poles * (1 - d.s)]),
      P('Corriente del estator', m.I1, 'A', [
        `\\(V_\\phi = \\dfrac{${d.V}}{\\sqrt3} = ${T(m.Vf)}\\,[V]\\)`,
        `Rama del rotor: \\(Z_2 = \\dfrac{R_2}{s} + jX_2 = ${T(d.R2 / d.s)} + j${T(d.X2)}\\,[Ω]\\)`,
        `Paralelo con \\(jX_M\\): \\(Z_F = \\dfrac{jX_M\\,Z_2}{jX_M + Z_2} = ${ZFtxt}\\,[Ω]\\)`,
        `\\(Z_{tot} = R_1 + jX_1 + Z_F = ${T(m.Z.re)} + j${T(m.Z.im)} = ${T(cabs(m.Z))}\\angle ${T(m.phi)}^\\circ\\,[Ω]\\)`,
        `\\(I_1 = \\dfrac{V_\\phi}{|Z_{tot}|} = \\dfrac{${T(m.Vf)}}{${T(cabs(m.Z))}} = ${T(m.I1)}\\,[A]\\)`,
      ], [d.V / cabs(m.Z), m.Vf / (d.R1 + d.R2 / d.s), m.I1 * SQ3]),
      P('Factor de potencia', m.fp, '', [`\\(FP = \\cos(${T(m.phi)}^\\circ) = ${T(m.fp)}\\) inductivo`], [Math.sin(carg(m.Z)), m.fp * 0.9, 1 - m.fp + 0.5]),
      P('Potencia en el entrehierro', m.PEH, 'W', [`\\(P_{entrada} = 3V_\\phi I_1 FP = ${T(m.Pin)}\\,[W]\\)`, `\\(P_{PCE} = 3I_1^2R_1 = ${T(m.Pce)}\\,[W]\\)`, `\\(P_{EH} = P_{entrada} - P_{PCE} = ${T(m.PEH)}\\,[W]\\) (equivale a \\(3I_1^2 R_F\\))`], [m.Pin, m.Pconv, m.PEH / 3]),
      P('Potencia convertida', m.Pconv, 'W', [`\\(P_{conv} = (1-s)P_{EH} = ${T(1 - d.s)}\\cdot ${T(m.PEH)} = ${T(m.Pconv)}\\,[W]\\)`], [m.PEH, Pout, m.Pcr]),
      P('Potencia de salida', Pout, 'W', [`\\(P_{salida} = P_{conv} - P_{pérd.rot} = ${T(m.Pconv)} - ${W(d.loss)} = ${T(Pout)}\\,[W]\\)`], [m.Pconv, m.PEH - d.loss, m.Pin - d.loss]),
      P('Torque inducido', m.PEH / m.ws, 'Nm', [`\\(\\tau_{ind} = \\dfrac{P_{EH}}{\\omega_{sinc}} = \\dfrac{${T(m.PEH)}}{${T(m.ws)}} = ${T(m.PEH / m.ws)}\\,[Nm]\\)`], [m.PEH / m.wm, Pout / m.ws, m.PEH / m.ns]),
      P('Torque de carga', tl, 'Nm', [`\\(\\tau_{carga} = \\dfrac{P_{salida}}{\\omega_m} = \\dfrac{${T(Pout)}}{${T(m.wm)}} = ${T(tl)}\\,[Nm]\\)`], [m.PEH / m.ws, Pout / m.ws, Pout / m.nm]),
      P('Rendimiento', pc(eta), '%', [`\\(\\eta = \\dfrac{P_{salida}}{P_{entrada}} = \\dfrac{${T(Pout)}}{${T(m.Pin)}} = ${T(pc(eta))}\\%\\)`], [pc(m.Pconv / m.Pin), pc(Pout / m.PEH), pc(1 - d.s)]),
    ],
  };
});

tpl('circ_thev', 'circ', 'Thevenin: torque máximo y de arranque', 3, (r) => {
  let d = circuitData(r);
  while (thevenin({ ...d, R2: 2 * d.R2 }).smax > 0.9) d = circuitData(r);   // que el nuevo máximo siga en 0 < s < 1
  const t = thevenin(d), t2 = thevenin({ ...d, R2: 2 * d.R2 });
  const nmax = t.ns * (1 - t.smax), nmax2 = t2.ns * (1 - t2.smax);
  const rad = Math.hypot(t.RTH, t.XTH + d.X2);
  return {
    text: circuitText(d) + ' Use el equivalente de Thevenin del formulario (aproximación \\(X_{TH} \\approx X_1\\)).',
    parts: [
      P('Voltaje de Thevenin por fase', t.VTH, 'V', [`\\(V_\\phi = \\dfrac{${d.V}}{\\sqrt3} = ${T(t.Vf)}\\,[V]\\)`, `\\(V_{TH} \\approx V_\\phi\\dfrac{X_M}{X_1+X_M} = ${T(t.Vf)}\\cdot\\dfrac{${T(d.XM)}}{${T(d.X1 + d.XM)}} = ${T(t.VTH)}\\,[V]\\)`], [d.V * t.k, t.Vf, t.Vf * t.k * t.k]),
      P('Resistencia de Thevenin', t.RTH, 'Ω', [`\\(R_{TH} \\approx R_1\\left(\\dfrac{X_M}{X_1+X_M}\\right)^2 = ${T(d.R1)}\\cdot ${T(t.k)}^2 = ${T(t.RTH)}\\,[Ω]\\)`], [d.R1 * t.k, d.R1, d.R1 / t.k]),
      P('Deslizamiento de torque máximo', pc(t.smax), '%', [`\\(s_{máx} = \\dfrac{R_2}{\\sqrt{R_{TH}^2 + (X_{TH}+X_2)^2}} = \\dfrac{${T(d.R2)}}{${T(rad)}} = ${T(t.smax)}\\)`], [pc(d.R2 / (t.RTH + d.X1 + d.X2)), pc(d.R2 / (d.X1 + d.X2 + d.XM)), pc(t.smax) * 2]),
      P('Velocidad a la que ocurre el torque máximo', nmax, 'rpm', [`\\(n = n_{sinc}(1-s_{máx}) = ${T(t.ns)}(1-${T(t.smax)}) = ${T(nmax)}\\,[rpm]\\)`], [t.ns * t.smax, t.ns, t.ns * (1 - t.smax / 2)]),
      P('Torque máximo', t.tmax, 'Nm', [`\\(\\omega_{sinc} = ${T(t.ws)}\\,[rad/s]\\)`, `\\(\\tau_{máx} = \\dfrac{3V_{TH}^2}{2\\omega_{sinc}\\left[R_{TH} + \\sqrt{R_{TH}^2 + (X_{TH}+X_2)^2}\\right]} = \\dfrac{3\\cdot ${T(t.VTH)}^2}{2\\cdot ${T(t.ws)}\\,(${T(t.RTH)} + ${T(rad)})} = ${T(t.tmax)}\\,[Nm]\\)`], [t.tmax * 2, t.VTH ** 2 / (2 * t.ws * (t.RTH + rad)), 3 * t.VTH ** 2 / (2 * t.ns * (t.RTH + rad))]),
      P('Torque de arranque', t.tarr, 'Nm', [`Con \\(s = 1\\): \\(\\tau_{arr} = \\dfrac{3V_{TH}^2 R_2}{\\omega_{sinc}\\left[(R_{TH}+R_2)^2 + (X_{TH}+X_2)^2\\right]} = ${T(t.tarr)}\\,[Nm]\\)`], [t.tmax, t.tarr / 3, 3 * t.VTH ** 2 * d.R2 / (t.ws * ((t.RTH + d.R2) ** 2))]),
      P('Velocidad de torque máximo si se duplica \\(R_2\\)', nmax2, 'rpm', [`\\(s_{máx}\\) es proporcional a \\(R_2\\): \\(s'_{máx} = 2\\cdot ${T(t.smax)} = ${T(t2.smax)}\\)`, `\\(n = ${T(t.ns)}(1 - ${T(t2.smax)}) = ${T(nmax2)}\\,[rpm]\\)`, `El torque máximo NO cambia (no depende de \\(R_2\\)).`], [nmax, nmax / 2, t.ns * (1 - t.smax / 2)]),
      P('Nuevo torque de arranque con \\(R_2\\) duplicada', t2.tarr, 'Nm', [`\\(\\tau'_{arr} = \\dfrac{3V_{TH}^2 (2R_2)}{\\omega_{sinc}\\left[(R_{TH}+2R_2)^2 + (X_{TH}+X_2)^2\\right]} = ${T(t2.tarr)}\\,[Nm]\\)`], [2 * t.tarr, t.tarr, t.tmax]),
    ],
  };
});

// =====================================================================
// ARRANQUES
// =====================================================================
tpl('arr_yd', 'arr', 'Arranque directo vs estrella-triángulo', 1, (r) => {
  const In = r.int(10, 120), k = r.pick([4.5, 5, 6, 7]), kt = r.pick([1.5, 1.8, 2]);
  const Tn = r.int(20, 300), ns = r.pick([1000, 1500, 1800, 3000]), s = r.pick([0.02, 0.03, 0.04]);
  const Idir = k * In, Iyd = Idir / 3, Tdir = kt * Tn, Tyd = Tdir / 3, nsw = 0.8 * ns * (1 - s);
  return {
    text: `Un motor de inducción tiene corriente nominal ${In} [A] y torque nominal ${Tn} [Nm]. Con arranque directo en triángulo, la corriente de arranque es ${W(k)} veces la nominal y el torque de arranque ${W(kt)} veces el nominal. Su velocidad nominal es ${W(ns * (1 - s))} [rpm].`,
    parts: [
      P('Corriente de arranque directo', Idir, 'A', [`\\(I_{arr} = ${T(k)}\\cdot ${In} = ${T(Idir)}\\,[A]\\)`], [In, Idir / 3, Idir / SQ3]),
      P('Corriente de arranque con estrella-triángulo', Iyd, 'A', [`El arranque Y-Δ reduce la corriente a 1/3 de la del arranque directo en triángulo:`, `\\(I_{Y} = \\dfrac{${T(Idir)}}{3} = ${T(Iyd)}\\,[A]\\)`], [Idir / SQ3, Idir, In / 3]),
      P('Torque de arranque con estrella-triángulo', Tyd, 'Nm', [`El torque también cae a 1/3: \\(\\tau_Y = \\dfrac{${T(kt)}\\cdot ${Tn}}{3} = ${T(Tyd)}\\,[Nm]\\)`], [Tdir, Tdir / SQ3, Tn / 3]),
      P('Velocidad a la que se conmuta de estrella a triángulo', nsw, 'rpm', [`Se conmuta al 80% de la velocidad nominal: \\(0{,}8\\cdot ${T(ns * (1 - s))} = ${T(nsw)}\\,[rpm]\\)`], [ns * (1 - s), 0.5 * ns, 0.8 * ns]),
    ],
  };
});

tpl('arr_vdf', 'arr', 'Variador de frecuencia: velocidad vs frecuencia', 2, (r) => {
  const poles = r.pick([2, 4, 6]), s = r.pick([0.02, 0.03, 0.04, 0.05]);
  const f1 = r.pick([20, 25, 30, 35, 40, 45]), f2 = r.pick([55, 60, 65, 70]);
  const n1 = 120 * f1 / poles * (1 - s), n2 = 120 * f2 / poles * (1 - s);
  const nt = Math.round(r.pick([0.4, 0.5, 0.6, 0.7]) * 120 * 50 / poles);
  const ft = nt * poles / (120 * (1 - s));
  return {
    text: `Un motor de inducción de ${poles} polos se controla con un variador de frecuencia (VDF). Suponga que el deslizamiento se mantiene en ${W(s * 100)}%.`,
    parts: [
      P(`Velocidad del eje con el VDF a ${f1} [Hz]`, n1, 'rpm', [`\\(n_m = \\dfrac{120 f_e}{P}(1-s) = \\dfrac{120\\cdot ${f1}}{${poles}}(1-${T(s)}) = ${T(n1)}\\,[rpm]\\)`], [120 * f1 / poles, 60 * f1 / poles * (1 - s), n1 * 2]),
      P(`Velocidad del eje con el VDF a ${f2} [Hz]`, n2, 'rpm', [`\\(n_m = \\dfrac{120\\cdot ${f2}}{${poles}}(1-${T(s)}) = ${T(n2)}\\,[rpm]\\)`], [120 * f2 / poles, n2 / 2, 60 * f2 / poles]),
      P(`Frecuencia que debe entregar el VDF para que el eje gire a ${nt} [rpm]`, ft, 'Hz', [`\\(f_e = \\dfrac{P\\,n_m}{120(1-s)} = \\dfrac{${poles}\\cdot ${nt}}{120\\cdot ${T(1 - s)}} = ${T(ft)}\\,[Hz]\\)`], [nt * poles / 120, nt * poles / 60, nt / 60]),
      P(`Frecuencia de las corrientes del rotor a ${f1} [Hz]`, s * f1, 'Hz', [`\\(f_r = s f_e = ${T(s)}\\cdot ${f1} = ${T(s * f1)}\\,[Hz]\\)`], [f1, f1 * (1 - s), pc(s) * f1 / 10]),
    ],
  };
});

// =====================================================================
// OTROS MOTORES
// =====================================================================
tpl('otros_pap', 'otros', 'Motor paso a paso y servomotor', 1, (r) => {
  const steps = r.pick([24, 48, 100, 200, 400]);
  const ang = 360 / steps, fsteps = r.pick([50, 100, 200, 400, 500, 800]);
  const nrpm = fsteps * 60 / steps;
  const target = r.pick([45, 90, 135, 180, 270, 360]);
  const pw = r.pick([0.75, 1, 1.25, 1.5, 1.75, 2, 2.25]);
  const servoAng = (pw - 0.5) / 2 * 180;
  return {
    text: `Un motor paso a paso da ${steps} pasos por vuelta en paso completo (full step). Además, un servomotor recibe pulsos entre 0,5 [ms] (0°) y 2,5 [ms] (180°), con relación lineal.`,
    parts: [
      P('Ángulo por paso completo', ang, '°', [`\\(\\theta_{paso} = \\dfrac{360^\\circ}{${steps}} = ${T(ang)}^\\circ\\)`], [360 / (steps / 2), ang * 2, steps / 360]),
      P(`Pasos para girar ${target}°`, target / ang, 'pasos', [`\\(N = \\dfrac{${target}^\\circ}{${T(ang)}^\\circ} = ${T(target / ang)}\\) pasos`], [target / ang / 2, target / ang * 2, target * ang]),
      P(`Velocidad si recibe ${fsteps} pasos por segundo`, nrpm, 'rpm', [`\\(n = \\dfrac{${fsteps}\\,[pasos/s]\\cdot 60}{${steps}\\,[pasos/vuelta]} = ${T(nrpm)}\\,[rpm]\\)`], [fsteps / steps, fsteps * 60, nrpm * 2]),
      P('Ángulo del medio paso (half step)', ang / 2, '°', [`En medios pasos se intercala una posición entre cada paso: \\(${T(ang)}/2 = ${T(ang / 2)}^\\circ\\)`], [ang, ang * 2, ang / 4]),
      P(`Ángulo del servo con un pulso de ${W(pw)} [ms]`, servoAng, '°', [`\\(\\theta = \\dfrac{t - 0{,}5}{2{,}5 - 0{,}5}\\cdot 180^\\circ = \\dfrac{${T(pw)} - 0{,}5}{2}\\cdot 180 = ${T(servoAng)}^\\circ\\)`], [pw / 2.5 * 180, pw * 90, 180 - servoAng]),
    ],
  };
});

tpl('otros_dahl', 'otros', 'Motor Dahlander (dos velocidades)', 1, (r) => {
  const f = r.pick([50, 60]), pl = r.pick([2, 4, 6]);
  const s = r.pick([0.03, 0.04, 0.05]);
  const nsH = nSync(f, pl), nsL = nSync(f, pl * 2);
  return {
    text: `Un motor Dahlander de ${f} [Hz] tiene ${pl} polos en su conexión de alta velocidad (bobinas en paralelo, doble estrella) y el doble de polos en baja velocidad (bobinas en serie, triángulo). Deslizamiento: ${W(s * 100)}%.`,
    parts: [
      P('Velocidad sincrónica en alta', nsH, 'rpm', [`\\(n_{sinc} = \\dfrac{120\\cdot ${f}}{${pl}} = ${T(nsH)}\\,[rpm]\\)`], [nsL, nsH * 2, 60 * f / pl * 3]),
      P('Velocidad sincrónica en baja', nsL, 'rpm', [`Doble de polos ⇒ mitad de velocidad (relación 1:2): \\(n = \\dfrac{120\\cdot ${f}}{${pl * 2}} = ${T(nsL)}\\,[rpm]\\)`], [nsH, nsL / 2, nsH / 3]),
      P('Velocidad real del eje en alta', nsH * (1 - s), 'rpm', [`\\(n = ${T(nsH)}(1-${T(s)}) = ${T(nsH * (1 - s))}\\,[rpm]\\)`], [nsH, nsH * s, nsL * (1 - s)]),
      P('Velocidad real del eje en baja', nsL * (1 - s), 'rpm', [`\\(n = ${T(nsL)}(1-${T(s)}) = ${T(nsL * (1 - s))}\\,[rpm]\\)`], [nsL, nsH * (1 - s), nsL * s]),
    ],
  };
});

export const TEMPLATE = Object.fromEntries(TEMPLATES.map(t => [t.id, t]));

// Instancia un ejercicio a partir de una plantilla y una semilla (reproducible).
export function generate(tplId, seed) {
  const t = TEMPLATE[tplId];
  const r = rng(seed);
  const ex = t.gen(r);
  return { id: `${tplId}#${seed}`, tpl: tplId, seed, topic: t.topic, title: t.title, diff: t.diff, ...ex };
}
