// Sección de aprendizaje: una lección por tema, pensada para alguien que parte de cero.
// Cada lección: idea intuitiva → fórmulas → receta paso a paso → errores típicos →
// ejemplo resuelto (se genera con la plantilla indicada) → mini test.

export const TOPICS = [
  { id: 'fund', name: 'Fundamentos: potencia, rendimiento y torque', short: 'Fundamentos', icon: '⚡', order: 1 },
  { id: 'cc', name: 'Máquina de corriente continua', short: 'Motor CC', icon: '🔋', order: 2 },
  { id: 'ccctrl', name: 'Control de máquinas de CC', short: 'Control CC', icon: '🎛️', order: 3 },
  { id: 'trif', name: 'Motor trifásico: conexión estrella/triángulo y placa', short: 'Conexión Y/Δ', icon: '🔺', order: 4 },
  { id: 'sinc', name: 'Máquina sincrónica', short: 'Sincrónica', icon: '🔄', order: 5 },
  { id: 'ind', name: 'Inducción: velocidad y deslizamiento', short: 'Deslizamiento', icon: '🌀', order: 6 },
  { id: 'flujo', name: 'Inducción: flujo de potencias', short: 'Flujo de potencias', icon: '🌊', order: 7 },
  { id: 'circ', name: 'Inducción: circuito equivalente y torque', short: 'Circuito y torque', icon: '📈', order: 8 },
  { id: 'arr', name: 'Arranques, placa y variador de frecuencia', short: 'Arranques y VDF', icon: '🚦', order: 9 },
  { id: 'otros', name: 'Otros motores: brushless, servo, paso a paso, Dahlander', short: 'Otros motores', icon: '🤖', order: 10 },
];
export const TOPIC = Object.fromEntries(TOPICS.map(t => [t.id, t]));

export const LESSONS = {
  fund: {
    example: 'fund_rend',
    idea: `<p>Un motor es un <b>conversor de energía</b>: recibe potencia eléctrica y entrega potencia mecánica en el eje. En el camino algo se pierde como calor, roce y magnetismo. Casi todos los ejercicios del certamen terminan en una de estas tres preguntas: <i>¿cuánto entra?</i>, <i>¿cuánto sale?</i> y <i>¿cuánto se pierde?</i></p>
<p>La potencia mecánica siempre es <b>torque × velocidad angular</b>. El torque es "la fuerza de giro" (Nm) y la velocidad angular se mide en rad/s, no en rpm.</p>`,
    formulas: [
      ['Rendimiento', '\\(\\eta = \\dfrac{P_{salida}}{P_{entrada}} = \\dfrac{P_{útil}}{P_{consumida}}\\)'],
      ['Balance', '\\(P_{consumida} = P_{útil} + P_{pérdidas}\\)'],
      ['Potencia mecánica', '\\(P = \\tau\\,\\omega\\)'],
      ['rpm → rad/s', '\\(\\omega = n\\cdot\\dfrac{2\\pi}{60}\\)'],
      ['Caballos de fuerza', '\\(1\\,[HP] = 746\\,[W]\\)'],
      ['Levantar una masa', '\\(P = \\dfrac{m g h}{t}\\)'],
      ['Triángulo de potencias', '\\(S^2 = P^2 + Q^2,\\quad FP = \\cos\\varphi = P/S\\)'],
    ],
    method: [
      'Anota los datos y pásalos a unidades base: HP → W (×746), kW → W (×1000), rpm → rad/s (×2π/60).',
      'Identifica qué potencia te dan: ¿la útil (la del eje, "entrega", "mueve una carga de") o la absorbida ("consume", "absorbe de la red")?',
      'Usa η para pasar de una a la otra: P_abs = P_útil/η, P_útil = η·P_abs.',
      'Para el torque usa SIEMPRE la potencia del eje y ω en rad/s: τ = P/ω.',
      'Revisa que el resultado tenga sentido: η < 1, P_útil < P_abs, pérdidas positivas.',
    ],
    traps: [
      'Dividir P por las rpm en vez de por los rad/s (el torque sale ~10 veces más chico).',
      'Usar 735 W por HP (eso es el CV). En el curso 1 HP = 746 W.',
      'Multiplicar por η cuando hay que dividir: si te dan la útil y piden la absorbida, el número debe CRECER.',
      'Calcular el torque con la potencia absorbida en vez de la útil.',
    ],
  },
  cc: {
    example: 'cc_shunt',
    idea: `<p>El motor de CC tiene dos circuitos: el <b>campo</b> (inductor, crea el flujo magnético) y la <b>armadura</b> (inducido, la parte que gira). Cuando la armadura gira dentro del campo, genera una tensión que se opone a la de la fuente: la <b>fuerza contraelectromotriz o voltaje de rotación</b> \\(V_{rot}\\).</p>
<p>Truco mental: la armadura es como una batería \\(V_{rot}\\) en serie con una resistencia \\(R_a\\). La fuente empuja corriente contra esa "batería". Al arrancar el motor está quieto, \\(V_{rot} = 0\\), y solo queda \\(R_a\\) (muy chica): la corriente se dispara. Por eso existen los <b>reóstatos de arranque</b>.</p>
<p>Según cómo se conecta el campo hay tres tipos: <b>serie</b> (campo en serie con la armadura), <b>shunt o derivación</b> (campo en paralelo) y <b>excitación independiente</b> (campo con su propia fuente).</p>`,
    formulas: [
      ['Armadura', '\\(V_a = R_a I_a + V_{rot}\\)'],
      ['Campo', '\\(V_f = R_f I_f\\)'],
      ['Voltaje de rotación', '\\(V_{rot} = G_{fq}\\,I_f\\,\\omega\\)'],
      ['Torque eléctrico', '\\(T_{elect} = G_{fq}\\,I_f\\,I_a\\)'],
      ['Potencia convertida', '\\(P_{conv} = V_{rot} I_a = T_{elect}\\,\\omega\\)'],
      ['Serie', '\\(V = I(R_a + R_f) + V_{esc} + V_{rot},\\quad I_a = I_f = I\\)'],
      ['Shunt', '\\(I_f = V/R_f,\\quad I_L = I_a + I_f,\\quad V = R_a I_a + V_{esc} + V_{rot}\\)'],
      ['Arranque', '\\(I_{arr} = \\dfrac{V - V_{esc}}{R_a (+R_f) + R_{reo}}\\)'],
      ['Pérdidas', '\\(P_{pérd} = P_{mec} + P_{mag} + P_{cu,R} + P_{cu,E}\\)'],
    ],
    method: [
      'Dibuja el circuito según el tipo de conexión (serie, shunt o independiente) y marca I_L, I_a e I_f.',
      'Shunt: primero I_f = V/R_f, después I_a = I_L − I_f. Serie: una sola corriente.',
      'Malla de la armadura: V_rot = V − R_a·I_a (− R_f·I si es serie) − caída de escobillas.',
      'Potencias: P_abs = V·I_L; P_conv = V_rot·I_a; P_útil = P_conv − (P_mec + P_mag).',
      'Torque = P/ω (útil o convertida según lo que pidan).',
      'Arranque: pon V_rot = 0 y despeja la corriente (o el reóstato que la limita).',
    ],
    traps: [
      'En shunt, usar la corriente de línea como si fuera la de armadura.',
      'Olvidar la caída de escobillas cuando el enunciado la da (2 escobillas × 1 V = 2 V).',
      'En serie, olvidar que R_f también limita la corriente de arranque.',
      'En el arranque con reóstato, olvidar que después se retira (en régimen ya no está).',
    ],
  },
  ccctrl: {
    example: 'ccctrl_reg',
    idea: `<p>Controlar un motor de CC es controlar dos cosas: su <b>velocidad</b> y su <b>torque</b>. Como \\(V_{rot} = G_{fq} I_f \\omega\\) y \\(T = G_{fq} I_f I_a\\), hay dos perillas:</p>
<ul><li><b>Regulación de campo (potencia constante)</b>: se mueve \\(V_f\\) (y con ella \\(I_f\\)) dejando \\(V_a\\) fija. Si debilitas el campo, el motor acelera pero pierde torque: \\(P = \\tau\\omega\\) se mantiene.</li>
<li><b>Regulación de armadura (torque constante)</b>: se deja el campo fijo y se mueve \\(V_a\\). La corriente de armadura y el torque quedan constantes; solo cambia \\(V_{rot}\\) y por lo tanto la velocidad.</li></ul>
<p>Para obtener la CC variable desde la red se usan <b>rectificadores</b>: no controlados (diodos), semicontrolados (diodos + tiristores) y controlados (tiristores), monofásicos o trifásicos, de media onda o puente, de 12 pulsos (menos armónicos) y duales (cuatro cuadrantes: el motor puede frenar e invertir el giro).</p>`,
    formulas: [
      ['Potencia constante (campo)', '\\(P = \\tau_1\\omega_1 = \\tau_2\\omega_2\\)'],
      ['Torque constante (armadura)', '\\(\\dfrac{n_2}{n_1} = \\dfrac{V_{rot,2}}{V_{rot,1}}\\)'],
      ['Regulación de voltaje', '\\(RV = \\dfrac{V_{s,vacío} - V_{s,plena}}{V_{s,plena}}\\cdot 100\\%\\)'],
    ],
    method: [
      'Pregúntate qué se mantiene constante: ¿la potencia (regulación de campo) o el torque (regulación de armadura)?',
      'Si es de campo: τ·ω = constante ⇒ lo que sube la velocidad, baja el torque.',
      'Si es de armadura: τ e I_a constantes ⇒ la velocidad sigue a V_rot.',
      'Para rectificadores, identifica: ¿diodos o tiristores? ¿monofásico o trifásico? ¿cuántos pulsos?',
    ],
    traps: [
      'Confundir cuál regulación es de potencia y cuál de torque (campo = potencia; armadura = torque).',
      'Pensar que un TRIAC sirve para CC: conduce en ambos sentidos, entrega alterna.',
      'Creer que el de 12 pulsos sube la tensión: su objetivo es reducir armónicos.',
    ],
  },
  trif: {
    example: 'trif_motor',
    idea: `<p><i>Este tema entra solo como herramienta para los motores de CA (guía CA, ejercicios 2 y 5): leer la placa, conectar el motor y calcular sus corrientes. No es materia aparte.</i></p>
<p>Un sistema trifásico son tres tensiones iguales desfasadas 120°. Las bobinas del motor se conectan de dos formas:</p>
<ul><li><b>Estrella (Y)</b>: un extremo de cada bobina va a un punto común (neutro). Cada bobina recibe la tensión de fase \\(V_L/\\sqrt3\\) y la corriente de línea es la misma que la de la bobina.</li>
<li><b>Triángulo (Δ)</b>: cada bobina va entre dos líneas. Recibe toda la tensión de línea y la corriente de línea es \\(\\sqrt3\\) veces la de la bobina.</li></ul>
<p>En la placa de un motor dice por ejemplo <b>220/380 V</b>: la tensión mayor es para <b>estrella</b> y la menor para <b>triángulo</b>. Así la bobina siempre recibe 220 V.</p>`,
    formulas: [
      ['Estrella', '\\(V_L = \\sqrt3\\,V_f,\\quad I_L = I_f\\)'],
      ['Triángulo', '\\(V_L = V_f,\\quad I_L = \\sqrt3\\,I_f\\)'],
      ['Potencia activa', '\\(P = \\sqrt3\\,V_L I_L\\cos\\varphi = 3V_f I_f\\cos\\varphi\\)'],
      ['Reactiva y aparente', '\\(Q = \\sqrt3\\,V_L I_L\\sin\\varphi,\\quad S = \\sqrt3\\,V_L I_L\\)'],
    ],
    method: [
      'Determina la conexión y calcula V_f (estrella: V_L/√3; triángulo: V_L).',
      'Si te dan potencia útil de un motor, pasa a absorbida: P = P_útil/η.',
      'Corriente de línea: I_L = P/(√3·V_L·FP).',
      'Corriente de bobina: igual a I_L en estrella; I_L/√3 en triángulo.',
      'S = P/FP y Q = √(S² − P²) (o S·sen φ).',
    ],
    traps: [
      'Usar 3 en vez de √3 en P = √3·V_L·I_L·FP (o mezclar tensiones de fase con corrientes de línea).',
      'Calcular la corriente con la potencia útil en vez de la absorbida.',
      'Calcular cos φ con la calculadora en radianes cuando el ángulo está en grados.',
      'Conectar en triángulo un motor 220/380 a una red de 380 V (se quema).',
    ],
  },
  sinc: {
    example: 'sinc_vel',
    idea: `<p>Las tres bobinas del estator, alimentadas con trifásica, crean un <b>campo magnético giratorio</b>. En la máquina <b>sincrónica</b> el rotor es un imán (permanente o electroimán con CC externa) que se "engancha" a ese campo y gira <b>exactamente a su misma velocidad</b>: la velocidad sincrónica. No hay deslizamiento.</p>
<p>La velocidad depende solo de la frecuencia y del número de polos: con más polos, el campo da la vuelta más lento. Un detalle que confunde: <b>P</b> es el número de polos y <b>PP</b> el número de pares de polos (P = 2·PP).</p>
<p>Hay dos tipos de rotor: de <b>polos salientes</b> y de <b>polos lisos</b>. Se usan en potencias grandes (150 kW a 15 MW).</p>`,
    formulas: [
      ['Velocidad', '\\(n_m = \\dfrac{120 f_e}{P} = \\dfrac{60 f_e}{PP}\\)'],
      ['Eléctrica vs mecánica', '\\(f_e = \\dfrac{P}{2}f_m,\\quad \\omega_e = \\dfrac{P}{2}\\omega_m\\)'],
      ['Cobre estator', '\\(P_{PCE} = 3I_A^2R_A\\)'],
      ['Cobre rotor', '\\(P_{PCR} = I_F^2R_F\\)'],
      ['Circuito por fase', '\\(V_\\phi = E_A + jX_S I_A + R_A I_A\\)'],
      ['Potencia máxima', '\\(P_{máx} = \\dfrac{3V_\\phi E_A}{X_S},\\quad \\tau_{máx} = \\dfrac{P_{máx}}{\\omega_m}\\)'],
    ],
    method: [
      'Revisa si te dan polos o pares de polos. Si dice "pares", multiplica por 2.',
      'Velocidad ↔ frecuencia con n = 120·f/P.',
      'Pasa a rad/s si te piden velocidad angular: ω = 2πn/60; ω_e = 2πf.',
      'Pérdidas: estator trifásico (×3), rotor con un solo devanado de CC (sin ×3).',
    ],
    traps: [
      'Confundir polos con pares de polos (la velocidad sale al doble o a la mitad).',
      'Poner ×3 en las pérdidas del campo del rotor.',
      'Decir que el motor sincrónico tiene deslizamiento: no tiene.',
    ],
  },
  ind: {
    example: 'ind_desliz',
    idea: `<p>En el motor de <b>inducción</b> (asincrónico) el rotor no tiene alimentación: el campo giratorio del estator "barre" los conductores del rotor, les induce corriente, y esas corrientes crean un campo que es arrastrado por el del estator.</p>
<p>Clave: para que haya inducción tiene que haber <b>movimiento relativo</b>. Si el rotor girara a la velocidad sincrónica, no se induciría nada y no habría torque. Por eso el rotor siempre va un poco más lento. Esa diferencia, en porcentaje, es el <b>deslizamiento s</b>.</p>
<p>s = 0 ⇒ rotor a velocidad sincrónica (vacío ideal). s = 1 ⇒ rotor detenido (arranque). Con carga nominal s suele ser 2–5%.</p>
<p>Tabla útil (P = polos): 2 polos → 3000/3600 rpm; 4 → 1500/1800; 6 → 1000/1200; 8 → 750/900 (a 50/60 Hz). <i>Ojo: en la lámina la columna dice "pares de polos", pero los valores corresponden al número de polos.</i></p>`,
    formulas: [
      ['Velocidad sincrónica', '\\(n_{sinc} = \\dfrac{120 f_e}{P} = \\dfrac{60 f_e}{PP}\\)'],
      ['Deslizamiento', '\\(s = \\dfrac{n_{sinc} - n_m}{n_{sinc}}\\cdot 100\\%\\)'],
      ['Velocidad del rotor', '\\(n_m = n_{sinc}(1 - s)\\)'],
      ['Frecuencia del rotor', '\\(f_r = s f_e = \\dfrac{P}{120}(n_{sinc} - n_m)\\)'],
    ],
    method: [
      'Calcula n_sinc con la frecuencia y los polos (cuidado con pares).',
      'Si te dan n_m, s = (n_sinc − n_m)/n_sinc. Si te dan s, n_m = n_sinc(1 − s).',
      'Si no te dicen los polos pero sí la velocidad en vacío, n_sinc es el valor de la tabla justo por encima.',
      'Frecuencia del rotor: f_r = s·f_e (es pequeña, unos pocos Hz).',
    ],
    traps: [
      'Dividir por n_m en vez de por n_sinc en la fórmula del deslizamiento.',
      'Usar s en % dentro de las fórmulas (usa 0,03, no 3).',
      'Confundir la frecuencia del rotor con la de la red.',
    ],
  },
  flujo: {
    example: 'flujo_peh',
    idea: `<p>Imagina la potencia como agua que baja por una cascada, perdiendo un poco en cada escalón:</p>
<ol><li><b>Entrada</b>: \\(P_{entrada} = \\sqrt3 V_L I_L FP\\).</li>
<li>En el estator se pierde cobre (\\(P_{PCE}\\)) y núcleo (\\(P_{núcleo}\\)). Lo que cruza al rotor es la <b>potencia del entrehierro</b> \\(P_{EH}\\).</li>
<li>En el rotor se pierde cobre \\(P_{PCR} = s\\,P_{EH}\\). Lo que queda se convierte en mecánica: \\(P_{conv} = (1-s)P_{EH}\\).</li>
<li>Se pierden roce y ventilación (\\(P_{mec}\\)). Lo que llega al eje es la <b>salida</b>.</li></ol>
<p>Lo más importante para el certamen: <b>P_EH : P_PCR : P_conv = 1 : s : (1 − s)</b>.</p>`,
    formulas: [
      ['Entrehierro', '\\(P_{EH} = P_{entrada} - P_{PCE} - P_{núcleo} = 3I_2^2\\dfrac{R_2}{s}\\)'],
      ['Cobre del rotor', '\\(P_{PCR} = 3I_2^2R_2 = s\\,P_{EH}\\)'],
      ['Convertida', '\\(P_{conv} = (1-s)P_{EH}\\)'],
      ['Salida', '\\(P_{salida} = P_{conv} - P_{mec} = \\tau_{carga}\\,\\omega_m\\)'],
      ['Torque inducido', '\\(\\tau_{ind} = \\dfrac{P_{EH}}{\\omega_{sinc}} = \\dfrac{P_{conv}}{\\omega_m}\\)'],
      ['Cobre del estator', '\\(P_{PCE} = 3I_1^2R_1\\)'],
      ['Núcleo', '\\(P_{núcleo} = 3E_1^2/R_c\\)'],
    ],
    method: [
      'Dibuja la cascada y escribe en cada escalón lo que te dan.',
      'Si tienes P_EH y s: P_PCR = s·P_EH y P_conv = (1 − s)·P_EH.',
      'Si te dan η y P_salida: P_entrada = P_salida/η; pérdidas totales = P_entrada − P_salida.',
      'P_mec = pérdidas totales − (hierro + cobre estator + cobre rotor).',
      'Factor de potencia: FP = P_entrada/(√3·V_L·I_L).',
    ],
    traps: [
      'Usar P_PCR = s·P_salida (aparece así en el formulario, pero la relación exacta es s·P_EH).',
      'Restar las pérdidas del rotor antes que las del estator.',
      'Calcular el torque inducido con ω_m y P_EH mezclados (P_EH va con ω_sinc).',
    ],
  },
  circ: {
    example: 'circ_thev',
    idea: `<p>El circuito equivalente por fase del motor de inducción se parece al de un transformador: \\(R_1 + jX_1\\) (estator), una rama de magnetización \\(jX_M\\) en paralelo, y el rotor \\(R_2/s + jX_2\\). El "truco" es que toda la carga mecánica está escondida en \\(R_2/s\\): cuando el motor va casi a la velocidad sincrónica, \\(s\\) es chico y \\(R_2/s\\) es grande.</p>
<p>Para el torque se simplifica con <b>Thevenin</b>: lo que ve el rotor es una fuente \\(V_{TH}\\) con impedancia \\(R_{TH} + jX_{TH}\\). Así se obtiene la curva torque–velocidad, el <b>torque máximo</b> y el <b>torque de arranque</b> (s = 1).</p>
<p>Dato clave: el torque máximo <b>no depende de R₂</b>, pero el deslizamiento al que ocurre sí (es proporcional). Más R₂ ⇒ el máximo se acerca al arranque ⇒ más torque de arranque.</p>`,
    formulas: [
      ['Thevenin', '\\(V_{TH} \\approx V_\\phi\\dfrac{X_M}{X_1+X_M},\\; R_{TH} \\approx R_1\\left(\\dfrac{X_M}{X_1+X_M}\\right)^2,\\; X_{TH} \\approx X_1\\)'],
      ['Torque inducido', '\\(\\tau_{ind} = \\dfrac{3V_{TH}^2\\,R_2/s}{\\omega_{sinc}\\left[(R_{TH} + R_2/s)^2 + (X_{TH}+X_2)^2\\right]}\\)'],
      ['s de torque máximo', '\\(s_{máx} = \\dfrac{R_2}{\\sqrt{R_{TH}^2 + (X_{TH}+X_2)^2}}\\)'],
      ['Torque máximo', '\\(\\tau_{máx} = \\dfrac{3V_{TH}^2}{2\\omega_{sinc}\\left[R_{TH} + \\sqrt{R_{TH}^2 + (X_{TH}+X_2)^2}\\right]}\\)'],
      ['Torque de arranque', '\\(\\tau_{arr} = \\dfrac{3V_{TH}^2 R_2}{\\omega_{sinc}\\left[(R_{TH}+R_2)^2 + (X_{TH}+X_2)^2\\right]}\\)'],
    ],
    method: [
      'Pasa la tensión de línea a fase: V_φ = V_L/√3 (motor en estrella).',
      'Corriente: Z_F = jX_M ∥ (R_2/s + jX_2); Z = R_1 + jX_1 + Z_F; I_1 = V_φ/|Z|; FP = cos(∠Z).',
      'Potencias: P_entrada = 3V_φI_1·FP; P_EH = P_entrada − 3I_1²R_1; P_conv = (1 − s)P_EH.',
      'Torque: Thevenin (V_TH, R_TH, X_TH) y las fórmulas del formulario. ω_sinc en rad/s.',
      'Si cambia R_2: s_máx cambia en la misma proporción; τ_máx no cambia; recalcula τ_arr.',
    ],
    traps: [
      'Usar la tensión de línea en vez de la de fase.',
      'Olvidar el 3 (son tres fases) en las potencias y torques.',
      'Usar ω_sinc en rpm.',
      'Sumar impedancias complejas como si fueran módulos.',
    ],
  },
  arr: {
    example: 'arr_yd',
    idea: `<p>Un motor de inducción arrancado directo a la red consume <b>4,5 a 7 veces</b> su corriente nominal, con un torque de 1,5 a 2 veces el nominal. Eso estresa la red y las máquinas, así que hay cuatro métodos:</p>
<ul><li><b>Directo</b>: el más simple. Sin reducción de corriente.</li>
<li><b>Estrella-triángulo</b>: arranca en Y (cada bobina recibe V/√3) y al llegar al 80% de la velocidad pasa a Δ. Corriente y torque de arranque bajan a <b>1/3</b>. Necesita 6 bornes, 3 contactores, relé y temporizador.</li>
<li><b>Partidor suave</b>: sube la tensión de a poco (no cambia la frecuencia). Solo controla arranque y parada. Se configura tiempo de aceleración, voltaje inicial y tiempo de desaceleración.</li>
<li><b>Variador de frecuencia (VDF)</b>: rectificador + enlace DC + inversor. Cambia la frecuencia y con ello la velocidad: \\(n_m = \\frac{120f}{P}(1-s)\\). Es el único que controla velocidad y torque, mejora el FP y ahorra energía, pero tiene la eficiencia más baja (95–97%).</li></ul>
<p><b>Placa</b>: régimen S1 (continuo), S2 (intermitente con enfriamiento), S3 (intermitente sin alcanzar a enfriarse); factor de servicio SF = sobrecarga tolerable.</p>`,
    formulas: [
      ['Estrella-triángulo', '\\(I_{arr,Y} = \\dfrac{I_{arr,Δ}}{3},\\quad \\tau_{arr,Y} = \\dfrac{\\tau_{arr,Δ}}{3}\\)'],
      ['VDF', '\\(n_m = \\dfrac{120 f_e}{P}(1-s)\\)'],
      ['Conmutación Y→Δ', '\\(n \\approx 0{,}8\\,n_{nominal}\\)'],
    ],
    method: [
      'Arranque directo: I_arr = k·I_n (k entre 4,5 y 7 si no te lo dan).',
      'Y-Δ: divide corriente y torque de arranque por 3.',
      'VDF: con el deslizamiento fijo, la velocidad es proporcional a la frecuencia.',
      'Preguntas teóricas: memoriza la tabla comparativa (control, corriente, protección, eficiencia, FP, ahorro).',
    ],
    traps: [
      'Dividir por √3 en vez de por 3 en el arranque estrella-triángulo.',
      'Decir que el partidor suave regula la velocidad (solo arranque y parada).',
      'Decir que el VDF es el más eficiente (es el menos eficiente de los cuatro, pero el que más ahorra en el proceso).',
    ],
  },
  otros: {
    example: 'otros_pap',
    idea: `<ul><li><b>Brushless (BLDC)</b>: imanes en el rotor, bobinas en el estator y conmutación electrónica (sin escobillas ni delgas). Eficiencia 90–97%, casi sin mantenimiento, alto torque, bajo ruido. Drones, autos RC, ventiladores de PC, lectores de CD.</li>
<li><b>Servomotor</b>: motor DC + engranajes + tarjeta de control + potenciómetro. No da vueltas continuas: posiciona entre 0° y 180° según el <b>ancho del pulso</b> (ej. 0,5 ms → 0°, 2,5 ms → 180°). Robótica, puertas, timones, seguidores solares.</li>
<li><b>Paso a paso (PAP)</b>: gira en pasos exactos energizando bobinas en secuencia. <b>Unipolar</b>: 5–6 terminales, control sencillo, menos torque, más grande y caro. <b>Bipolar</b>: 4 terminales, 8 transistores, más torque, más chico y barato. Secuencias: paso completo (2 bobinas, máximo torque), media onda (1 bobina, bajo consumo), medios pasos (8 pasos, suave).</li>
<li><b>Dahlander</b>: motor de inducción con 6 bobinas que se reconectan para dos velocidades en relación <b>1:2</b>. Serie + triángulo = más polos = baja velocidad; paralelo + estrella = menos polos = alta. Bajo rendimiento y FP.</li></ul>`,
    formulas: [
      ['Ángulo por paso', '\\(\\theta = \\dfrac{360^\\circ}{\\text{pasos por vuelta}}\\)'],
      ['Velocidad PAP', '\\(n = \\dfrac{f_{pasos}\\cdot 60}{\\text{pasos por vuelta}}\\,[rpm]\\)'],
      ['Servo', '\\(\\theta = \\dfrac{t - 0{,}5}{2{,}5 - 0{,}5}\\cdot 180^\\circ\\)'],
      ['Dahlander', '\\(n_{baja} = \\dfrac{n_{alta}}{2}\\)'],
    ],
    method: [
      'PAP: primero el ángulo por paso; luego pasos = ángulo deseado / ángulo por paso.',
      'Medio paso: el ángulo se divide por 2 (el doble de pasos por vuelta).',
      'Servo: interpola linealmente el ancho de pulso entre los extremos.',
      'Teoría: compara siempre de a pares (servo vs PAP, unipolar vs bipolar).',
    ],
    traps: [
      'Decir que el bipolar tiene control más sencillo (es al revés).',
      'Decir que el servo gira 360° continuo.',
      'Decir que el brushless usa escobillas.',
    ],
  },
};
