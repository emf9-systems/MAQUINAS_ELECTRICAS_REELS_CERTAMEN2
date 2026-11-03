// Preparación de Proyectos: lecciones desde cero, en el orden en que conviene estudiar
// para el certamen 1 (problema 1 = flujo de caja con VAN y PRI; problema 2 = teoría de mercado).

export const TOPICS = [
  { id: 'pp_flujo', name: 'Flujo de caja, VAN, TIR y PRI', short: 'Flujo de caja', icon: '📊', order: 1 },
  { id: 'pp_depre', name: 'Depreciación (tabla SII) y valor libro', short: 'Depreciación', icon: '📉', order: 2 },
  { id: 'pp_cuota', name: 'Cuota fija y tabla de amortización', short: 'Cuota fija', icon: '🏦', order: 3 },
  { id: 'pp_interes', name: 'Interés simple y compuesto', short: 'Interés', icon: '💰', order: 4 },
  { id: 'pp_dda', name: 'Oferta y demanda (pregunta 2 del certamen)', short: 'Oferta y demanda', icon: '⚖️', order: 5 },
  { id: 'pp_mercado', name: 'Estudio de mercado: producto, proyección, Porter, FODA, 4P', short: 'Mercado', icon: '🛒', order: 6 },
  { id: 'pp_ciclo', name: 'Ciclo del proyecto: idea, perfil, prefactibilidad…', short: 'Ciclo del proyecto', icon: '🔁', order: 7 },
  { id: 'pp_tecnico', name: 'Estudio técnico, administrativo, legal y societario', short: 'Técnico y legal', icon: '🏭', order: 8 },
];
export const TOPIC = Object.fromEntries(TOPICS.map(t => [t.id, t]));

export const LESSONS = {
  pp_flujo: {
    example: 'pp_flujo',
    idea: `<p>El problema 1 del certamen (60 puntos) es <b>armar el flujo de caja</b> de un proyecto y decir si conviene. El flujo de caja ordena, año por año, todo lo que entra y sale de dinero. Al final cada año tiene un <b>flujo neto</b>, y esos flujos se traen a hoy con la tasa del inversionista para calcular el <b>VAN</b>.</p>
<p>La clave son los <b>escudos fiscales</b>: los intereses, la depreciación y las pérdidas del año anterior se <i>restan antes del impuesto</i> (bajan el impuesto) y después se vuelven a sumar los que no son salida de caja (depreciación y pérdida anterior). La amortización del crédito, la venta de activos a valor libro, las inversiones y los créditos van <i>después</i> del impuesto porque no son ganancia ni gasto.</p>
<p>Se arman 3 tablas en este orden: <b>depreciación</b> → <b>amortización del crédito</b> → <b>flujo de caja</b>.</p>`,
    formulas: [
      ['Utilidad antes de impuesto', '\\(UAI = I - C - Int_{LP} - Int_{CP} - D \\pm (Vta - VL) - PEA\\)'],
      ['Impuesto', '\\(Impto = 25\\%\\cdot UAI\\) (solo si UAI > 0)'],
      ['Total anual', '\\(UDI + PEA + D - Am_{LP} - Am_{CP} + VL - Inv\\)'],
      ['Flujo neto', '\\(FN = \\text{Total anual} + \\text{Crédito LP} + \\text{Crédito CP}\\)'],
      ['Año 0', '\\(FN_0 = -Inversión + Crédito_{LP}\\)'],
      ['VAN', '\\(VAN = \\sum_{t=0}^{n} \\dfrac{FN_t}{(1+i)^t}\\)'],
      ['Criterio', '\\(VAN \\ge 0\\) ⇒ recomendable'],
      ['TIR', '\\(\\sum \\dfrac{FN_t}{(1+TIR)^t} = 0\\)'],
      ['PRI', 'primer año con flujo actualizado acumulado ≥ 0'],
    ],
    method: [
      'Tabla de depreciación: cada activo con su vida útil SII (normal o acelerada), D = compra / vida útil, VL al final y Vta − VL. El terreno no se deprecia.',
      'Tabla de amortización del crédito LP en cuota fija: interés = saldo anterior × i; amortización = cuota − interés.',
      'Año 0: −inversiones + crédito LP = lo que pone el inversionista.',
      'Cada año: ingresos − costos − intereses LP y CP − depreciación (± Vta−VL el último año) − pérdida del año anterior = UAI.',
      'Si UAI > 0 se paga 25%; si es negativa no hay impuesto y esa pérdida se resta el año siguiente.',
      'Después del impuesto: + pérdida anterior + depreciación − amortizaciones + VL de activos vendidos (último año) = total anual.',
      'Si el total anual es negativo y el inversionista solo pone plata el año 0, se pide un crédito CP por ese monto (FN = 0) y se paga el año siguiente con su interés.',
      'Actualiza cada FN con (1+i)^t, acumula, y obtén VAN (último acumulado) y PRI (primer acumulado positivo).',
    ],
    traps: [
      'Olvidar sumar de vuelta la depreciación después del impuesto.',
      'Restar la amortización antes del impuesto (no es escudo fiscal; solo el interés lo es).',
      'Cobrar impuesto cuando la UAI es negativa, u olvidar arrastrar la pérdida al año siguiente.',
      'Depreciar el terreno, o seguir depreciando un activo cuando ya terminó su vida útil.',
      'Poner el valor de venta completo antes del impuesto: antes va solo Vta − VL; el VL va después.',
      'Usar la tasa del banco para el VAN: se usa la tasa de descuento del inversionista.',
      'Olvidar el año 0 en el VAN.',
    ],
  },
  pp_depre: {
    example: 'pp_dep',
    idea: `<p>Los activos (galpón, camiones, computadores…) pierden valor con el uso. La ley chilena (SII) dice <b>en cuántos años</b> se puede descontar ese valor: es la <b>vida útil</b> de la tabla del SII. Se deprecia en línea recta y con valor de salvamento 0.</p>
<p>¿Por qué importa? Porque la depreciación es un <b>escudo fiscal</b>: baja la utilidad sobre la que se paga impuesto, aunque no sale plata de la caja.</p>
<p>Al final del proyecto se venden los activos. El <b>valor libro</b> (VL) es lo que queda sin depreciar. Si se venden en más que el VL, la diferencia es ganancia y paga impuesto.</p>`,
    formulas: [
      ['Depreciación lineal', '\\(D = \\dfrac{\\text{Valor de compra}}{n}\\), con VS = 0'],
      ['Valor libro', '\\(VL = \\text{Compra} - \\sum D\\)'],
      ['Resultado de la venta', '\\(Vta - VL\\) (ganancia si > 0)'],
      ['Acelerada', '\\(n_{acel} = \\text{parte entera}(n/3)\\)'],
      ['Pesos → UF', '\\(UF = \\dfrac{\\$}{\\text{valor UF}}\\)'],
      ['Tabla SII (normal / acelerada)', 'Galpón 20/6 · Camión, camioneta, auto, muebles 7/2 · Computadores 6/2 · Maquinaria 15/5 · Instalaciones 10/3 · Herramientas pesadas 8/2'],
    ],
    method: [
      'Busca cada activo en la tabla del SII y anota la vida útil que te piden (normal o acelerada).',
      'D = compra / vida útil. Ponla en cada año hasta completar la vida útil (o hasta el fin del horizonte).',
      'El terreno no se deprecia: VL = compra.',
      'VL al final = compra − (D × años depreciados). Si la vida útil es menor que el horizonte, VL = 0.',
      'Calcula Vta − VL por activo y súmalas.',
    ],
    traps: [
      'Dividir por el horizonte del proyecto en vez de por la vida útil.',
      'Confundir la columna normal con la acelerada.',
      'Restar el valor de venta antes de depreciar (con VS = 0 no se resta nada).',
      'Olvidar que un activo que ya se depreció entero deja de depreciarse.',
    ],
  },
  pp_cuota: {
    example: 'pp_amort',
    idea: `<p>Casi todos los créditos se pagan en <b>cuotas iguales</b> (cuota fija o "payment"). Cada cuota tiene dos partes: el <b>interés</b> (lo que cobra el banco por el saldo que aún debes) y la <b>amortización</b> (lo que baja la deuda).</p>
<p>Al principio debes mucho, así que casi toda la cuota es interés. Con el tiempo el interés baja y la amortización sube. En el flujo de caja el interés es escudo fiscal (va antes del impuesto) y la amortización va después.</p>`,
    formulas: [
      ['Cuota fija (desde VP)', '\\(C = VP\\cdot\\dfrac{i(1+i)^n}{(1+i)^n - 1}\\)'],
      ['Cuota fija (desde VF)', '\\(C = VF\\cdot\\dfrac{i}{(1+i)^n - 1}\\)'],
      ['Interés del período', '\\(I_t = P_{t-1}\\cdot i\\)'],
      ['Amortización', '\\(A_t = C - I_t\\)'],
      ['Saldo', '\\(P_t = P_{t-1} - A_t\\)'],
      ['Gracia sin pagar intereses', '\\(P_g = P_0(1+i)^g\\)'],
    ],
    method: [
      'Revisa que la tasa y el número de cuotas estén en la misma unidad (mensual con meses, anual con años).',
      'Calcula la cuota con la fórmula del payment.',
      'Arma la tabla: interés = saldo anterior × i; amortización = cuota − interés; saldo nuevo = saldo − amortización.',
      'Comprueba que el saldo final quede en 0.',
      'Si hay período de gracia: si se pagan intereses la deuda no cambia; si no se pagan, crece con (1+i)^g antes de calcular la cuota.',
    ],
    traps: [
      'Calcular la cuota como deuda / n (eso es amortización constante, no cuota fija).',
      'Calcular el interés sobre la cuota en vez de sobre el saldo.',
      'Usar tasa mensual con plazo en años.',
    ],
  },
  pp_interes: {
    example: 'pp_interes',
    idea: `<p><b>Un peso hoy vale más que un peso mañana</b>: por la inflación y porque hoy lo puedes invertir y ganar intereses. Por eso el dinero de distintos años no se puede sumar directo: hay que llevarlo a un mismo momento.</p>
<p>Con <b>interés simple</b> solo se gana sobre el capital inicial. Con <b>interés compuesto</b> se gana también sobre los intereses ya ganados, y es el que mejor representa el valor del dinero en el tiempo (es el que usa el VAN).</p>`,
    formulas: [
      ['Interés simple', '\\(VF = VP(1 + i\\,n)\\)'],
      ['Interés compuesto', '\\(VF = VP(1+i)^n\\)'],
      ['Valor presente', '\\(VP = \\dfrac{VF}{(1+i)^n}\\)'],
      ['Tasa', '\\(i = \\left(\\dfrac{VF}{VP}\\right)^{1/n} - 1\\)'],
      ['Plazo', '\\(n = \\dfrac{\\log(VF/VP)}{\\log(1+i)}\\)'],
      ['Tasa de interés', '\\(i = \\dfrac{\\text{interés}}{\\text{monto inicial}}\\)'],
    ],
    method: [
      'Identifica qué te dan (VP, VF, i, n) y qué te piden.',
      'Pon la tasa y el plazo en la misma unidad (meses con tasa mensual).',
      'Usa la fórmula correspondiente y despeja.',
      'Para "¿cuánto interés?": interés = VF − VP.',
    ],
    traps: [
      'Usar la fórmula de interés simple cuando dice "capitaliza intereses" (es compuesto).',
      'Olvidar pasar los años a meses.',
      'Escribir la tasa como 5 en vez de 0,05.',
    ],
  },
  pp_dda: {
    example: null,
    idea: `<p>El problema 2 del certamen 2024 (40 puntos) fueron tres preguntas de <b>oferta y demanda</b>. Lo que tienes que dominar:</p>
<ul><li><b>Ley de la demanda</b>: si sube el precio, la gente compra menos. <b>Ley de la oferta</b>: si sube el precio, los productores quieren vender más.</li>
<li>El <b>equilibrio</b> es el precio donde lo que se ofrece es igual a lo que se demanda. Si el precio está <i>sobre</i> el equilibrio (el vendedor pide más de lo que el comprador quiere pagar) hay <b>exceso de oferta</b>: sobra producto, baja la producción o el precio. Si está <i>bajo</i> el equilibrio hay <b>escasez</b>.</li>
<li><b>Sustitutos</b> (se reemplazan: dos marcas de jugo): si la competencia sube su precio, <b>sube</b> tu demanda.</li>
<li><b>Complementarios</b> (se usan juntos: impresora y tinta): si el complemento sube de precio, <b>baja</b> tu demanda.</li>
<li>Otras variables que mueven la demanda (PP-2): ingreso del consumidor, gustos y preferencias, impuestos.</li></ul>
<p>En el certamen la respuesta es escrita: di <b>qué pasa</b> y <b>por qué</b> en una o dos líneas.</p>`,
    formulas: [
      ['Precio ↑', 'cantidad demandada ↓, cantidad ofrecida ↑'],
      ['Precio > equilibrio', 'exceso de oferta ⇒ baja la producción o el precio'],
      ['Precio < equilibrio', 'exceso de demanda (escasez) ⇒ el precio tiende a subir'],
      ['Sustituto sube de precio', 'mi demanda ↑'],
      ['Complementario sube de precio', 'mi demanda ↓'],
      ['Ingreso del consumidor ↑', 'demanda de un bien normal ↑'],
    ],
    method: [
      'Pregúntate primero: ¿cambió el PRECIO de mi producto (me muevo en la curva) o cambió OTRA variable (se mueve la curva)?',
      'Si es otro producto, clasifícalo: ¿sustituto (compite conmigo) o complementario (se usa junto al mío)?',
      'Sustituto: va en el mismo sentido (su precio sube ⇒ mi demanda sube). Complementario: sentido contrario.',
      'Escribe la respuesta con la causa: "aumenta, porque los clientes se cambian a mi producto, que ahora es relativamente más barato".',
    ],
    traps: [
      'Confundir sustituto con complementario.',
      'Decir que si el precio de oferta es mayor que lo que pagan los compradores, la producción sube (es al revés: sobra producto).',
      'Responder sin explicar el porqué.',
    ],
  },
  pp_mercado: {
    example: 'pp_regresion',
    idea: `<p>El estudio de mercado responde: ¿qué producto vendo, a quién, cuánto me van a comprar, contra quién compito y cómo lo hago llegar? Incluye la definición del producto, la demanda y la oferta (actual y futura), el comportamiento del mercado (Porter, FODA), la localización y la comercialización (4P).</p>
<p>Para <b>proyectar la demanda</b> hay métodos cualitativos (Delphi: opinión de expertos), causales (regresión \\(Y = a + bX\\)) y de series de tiempo (promedios móviles). Para saber cuántas encuestas hacer se usa la fórmula del tamaño de muestra.</p>`,
    formulas: [
      ['Recta', '\\(Y = a + bX\\)'],
      ['Pendiente', '\\(b = \\dfrac{n\\sum XY - \\sum X\\sum Y}{n\\sum X^2 - (\\sum X)^2}\\)'],
      ['Intercepto', '\\(a = \\dfrac{\\sum Y - b\\sum X}{n}\\)'],
      ['Determinación', '\\(r^2 = \\dfrac{(n\\sum XY - \\sum X\\sum Y)^2}{(n\\sum X^2 - (\\sum X)^2)(n\\sum Y^2 - (\\sum Y)^2)}\\)'],
      ['Tamaño de muestra', '\\(n = \\dfrac{k^2\\,p\\,q\\,N}{e^2(N-1) + k^2\\,p\\,q}\\)'],
      ['Valores de k', '1,65 → 90% · 1,96 → 95% · 2 → 95,5% · 2,58 → 99%'],
    ],
    method: [
      'Regresión: codifica los años (X = año − año central, como en las láminas), arma la tabla X, Y, XY, X², Y² y suma.',
      'Calcula b, luego a, y proyecta con el X del año pedido.',
      'r² cerca de 1 ⇒ la recta explica bien la demanda.',
      'Muestra: identifica N, k (del nivel de confianza), e y p (si no lo dan, 0,5). Redondea hacia arriba.',
      'Teoría: FODA = interno (F, D) y externo (O, A). Porter = 5 fuerzas. Estrategias genéricas = costos, diferenciación, enfoque.',
    ],
    traps: [
      'Usar el año real (2026) como X en vez del año codificado.',
      'Calcular a antes que b.',
      'Confundir oportunidades (externas) con fortalezas (internas).',
      'Confundir penetrar (precio bajo) con descremar (precio alto).',
    ],
  },
  pp_ciclo: {
    example: null,
    idea: `<p>Un proyecto nace de una <b>necesidad insatisfecha</b> y pasa por etapas cada vez más detalladas y caras. En cada una se decide si seguir o abandonar:</p>
<ol><li><b>Idea</b>: se detecta la necesidad o el problema.</li>
<li><b>Perfil</b>: estudio rápido (1–2 meses), general, hecho por expertos, hasta 40% de error. ¿Vale la pena estudiarlo más?</li>
<li><b>Prefactibilidad</b>: análisis detallado (4–6 meses, hasta 25% de error) de mercado, técnico, administrativo, legal, societario, tributario, financiero, ambiental y económico. Calcula la rentabilidad. <b>Es la última instancia para abandonar.</b></li>
<li><b>Factibilidad / ingeniería</b>: planos, especificaciones, suelos, contratistas (hasta 5% de error, ~6 meses). Ya no se discute si conviene; empieza la compra de activos.</li>
<li><b>Ejecución</b>: se invierte, se asumen los riesgos, se contrata (PERT/CPM).</li>
<li><b>Operación</b>: se produce y se vende.</li>
<li><b>Evaluación ex post</b>: mirada hacia atrás para aprender; genera nuevas ideas y cierra el ciclo.</li></ol>`,
    formulas: [
      ['Perfil', '1–2 meses · error 40% · ¿seguir estudiando?'],
      ['Prefactibilidad', '4–6 meses · error 25% · ¿invertir o abandonar?'],
      ['Factibilidad', '~6 meses · error 5% · cómo implementarlo'],
    ],
    method: [
      'Ordena las etapas: idea → perfil → prefactibilidad → factibilidad → ejecución → operación → ex post.',
      'Asocia cada etapa con su % de error y su decisión.',
      'Recuerda los estudios de la prefactibilidad (mercado, técnico, administrativo, legal, societario, tributario, financiero, ambiental, económico).',
    ],
    traps: [
      'Creer que en la factibilidad se decide si el proyecto es rentable (eso es en la prefactibilidad).',
      'Invertir los porcentajes de error.',
    ],
  },
  pp_tecnico: {
    example: null,
    idea: `<p>El <b>estudio técnico</b> define cómo se fabrica el producto o se entrega el servicio: procesos, diagrama de flujo, equipos, lay-out (distribución de planta), insumos, energía, turnos y personal (mano de obra <b>directa</b>, que transforma el producto, e <b>indirecta</b>: mantenimiento, supervisión, aseo). Con eso se calculan las inversiones y los costos.</p>
<p>La <b>inversión inicial</b> = activos + capital de trabajo + instalación y puesta en marcha + imprevistos.</p>
<p>Los otros estudios: <b>administrativo</b> (unidades organizativas, recursos, planes de trabajo), <b>legal</b> (leyes, permisos, costos legales), <b>societario</b> (tipo de sociedad), <b>tributario</b>, <b>financiero</b> (fuentes de financiamiento) y <b>ambiental</b>.</p>`,
    formulas: [
      ['Inversión inicial', 'activos + capital de trabajo + puesta en marcha + imprevistos'],
      ['S.A.', 'accionistas responden hasta su aporte · directorio ≥ 3 · decide por mayoría'],
      ['Ltda.', '2 a 50 socios · decide por unanimidad'],
      ['EIRL', 'una persona · RUT y patrimonio propio · responsabilidad limitada'],
      ['SpA', 'S.A. simplificada · capital de riesgo · se parte solo y se suman socios'],
    ],
    method: [
      'Técnico: proceso → equipos → lay-out → personal → inversiones y costos.',
      'Distingue mano de obra directa de indirecta.',
      'Societario: memoriza la tabla de tipos de sociedad.',
      'Legal: permisos, notaría, Conservador, aranceles, finiquitos son costos legales.',
    ],
    traps: [
      'Decir que la Ltda. decide por mayoría (es por unanimidad).',
      'Decir que el capital de trabajo no es inversión.',
    ],
  },
};

// Formulario del curso (PP-1 y PP-2), para tenerlo a mano.
export const FORMULARIO = {
  title: 'Formulario Preparación de Proyectos',
  note: 'Resultados en UF y US$ con 2 decimales; en pesos sin decimales. Impuesto 25%. Valor de salvamento 0.',
  groups: [
    ['Matemática financiera', [
      ['Interés simple', 'VF = VP(1 + i\\,n)'], ['Interés compuesto', 'VF = VP(1+i)^n'], ['Valor presente', 'VP = \\dfrac{VF}{(1+i)^n}'],
      ['Tasa', 'i = \\left(\\dfrac{VF}{VP}\\right)^{1/n} - 1'], ['Plazo', 'n = \\dfrac{\\log(VF/VP)}{\\log(1+i)}'],
      ['Cuota fija (VP)', 'C = VP\\,\\dfrac{i(1+i)^n}{(1+i)^n-1}'], ['Cuota fija (VF)', 'C = VF\\,\\dfrac{i}{(1+i)^n-1}'],
      ['Tabla de amortización', 'I_t = P_{t-1}\\,i,\\quad A_t = C - I_t,\\quad P_t = P_{t-1} - A_t']]],
    ['Depreciación (SII, VS = 0)', [
      ['Línea recta', 'D = \\dfrac{\\text{Compra}}{n}'], ['Valor libro', 'VL = \\text{Compra} - \\sum D'], ['Acelerada', 'n_{acel} = \\lfloor n/3 \\rfloor'],
      ['Galpones madera/metálicos', '20 \\;/\\; 6'], ['Instalaciones en general', '10 \\;/\\; 3'], ['Camiones, camionetas, autos', '7 \\;/\\; 2'],
      ['Maquinarias y equipos en general', '15 \\;/\\; 5'], ['Herramientas pesadas / livianas', '8/2 \\;\\cdot\\; 3/1'], ['Muebles y enseres', '7 \\;/\\; 2'],
      ['Computadores y periféricos', '6 \\;/\\; 2'], ['Equipos de aire y refrigeración', '10 \\;/\\; 3']]],
    ['Flujo de caja e indicadores', [
      ['UAI', 'I - C - Int_{LP} - Int_{CP} - D \\pm (Vta - VL) - PEA'], ['Impuesto', '25\\%\\cdot UAI\\;\\;(UAI>0)'],
      ['Total anual', 'UDI + PEA + D - Am_{LP} - Am_{CP} + VL - Inv'], ['Flujo neto', 'Total + Créd_{LP} + Créd_{CP}'],
      ['VAN', '\\sum_{t=0}^{n}\\dfrac{FN_t}{(1+i)^t}\\ge 0 \\Rightarrow \\text{recomendable}'], ['TIR', 'VAN(TIR) = 0'], ['PRI', '\\text{primer } t \\text{ con } \\sum_{0}^{t}\\dfrac{FN}{(1+i)^t} \\ge 0']]],
    ['Estudio de mercado', [
      ['Regresión', 'Y = a + bX'], ['Pendiente', 'b = \\dfrac{n\\sum XY - \\sum X\\sum Y}{n\\sum X^2 - (\\sum X)^2}'], ['Intercepto', 'a = \\dfrac{\\sum Y - b\\sum X}{n}'],
      ['Determinación', 'r^2 = \\dfrac{(n\\sum XY - \\sum X\\sum Y)^2}{(n\\sum X^2-(\\sum X)^2)(n\\sum Y^2-(\\sum Y)^2)}'],
      ['Tamaño de muestra', 'n = \\dfrac{k^2 p\\,q\\,N}{e^2(N-1) + k^2 p\\,q}'], ['k', '1{,}65 (90\\%)\\;\\; 1{,}96 (95\\%)\\;\\; 2 (95{,}5\\%)\\;\\; 2{,}58 (99\\%)']]],
  ],
};
