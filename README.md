# Máquinas Rush · Certamen 2

Web para estudiar el **Certamen 2 de Control de Máquinas Eléctricas** (USM, Sede Viña del Mar): lecciones desde cero, las guías de ejercicios resueltas, práctica de desarrollo escrito, simulacros de 12 preguntas en 12 minutos, modo Rush tipo reels, cartas coleccionables con sobres, mercado entre jugadores y ranking.

Es una página estática (HTML + JavaScript, sin compilación) que se publica con GitHub Pages. El login, el ranking, las cartas y el mercado usan Supabase. Sin Supabase funciona igual en **modo local** (todo se guarda en el navegador, sin ranking ni mercado).

## Qué trae (parte 1: lógica completa, sin multimedia)

| Sección | Contenido |
|---|---|
| **Aprender** | 10 lecciones (fundamentos, motor CC, control CC, trifásico, sincrónica, deslizamiento, flujo de potencias, circuito equivalente y torque, arranques/VDF, otros motores). Cada una: idea intuitiva, fórmulas, receta paso a paso, errores típicos, ejemplo resuelto que se revela por partes y mini test. También el formulario completo. |
| **Practicar** | Desarrollo escrito por teclado (cuadro para el desarrollo + una casilla por resultado, corrección con ±2% de tolerancia y pauta paso a paso). Las 26 preguntas de las guías (9 CC + 17 CA) resueltas. Banco de alternativas por tema. |
| **Certamen** | Simulacros de 12 preguntas en 12 minutos: formato C1 (3 ejercicios × 4 preguntas), mixto (2 × 4 + 4 teóricas) y teórico. Simulacro de desarrollo (3 ejercicios × 4 resultados, 36 min). Nota 1,0–7,0 con 60% de exigencia y revisión completa. |
| **Rush** | Feed vertical de preguntas con combos y multiplicadores (×1,5 / ×2 / ×3), preguntas doradas, cofres, jefes con tiempo y modo Sprint de 60 s. |
| **Cartas** | 234 cartas con arte (161 decentes y 73 indecentes, varias animadas) en 5 rarezas, 4 sobres (diario gratis, básico, grande, legendario) con apertura estilo Clash Royale y pity (legendaria garantizada cada 20 sobres). Colección, venta de repetidas al juego (precio bajo) y destacar carta en el perfil. |
| **Mercado** | Venta de repetidas a precio libre (5% de comisión), compra, cancelación e intercambios de cartas y/o monedas con custodia. |
| **Ranking y perfil** | Ranking por XP, mejor nota, colección, racha y días seguidos. Perfil con foto, nombre visible, bio, título, color y carta destacada. Logros, misiones diarias y premio diario. |
| **Estímulos** | Tres niveles (Zen, Normal, Dopamina máxima): sonidos sintetizados, confeti, sacudidas, textos flotantes, banners de combo, subida de nivel, vibración y "reacciones". Los espacios para GIF, imágenes y audios ya están listos (ver [`assets/README.md`](assets/README.md)). |

### Banco de preguntas

- **25 plantillas de ejercicios** con números al azar (cada una con 4 a 9 partes, pauta paso a paso y alternativas trampa basadas en errores típicos: olvidar √3, confundir polos con pares de polos, usar rpm en vez de rad/s, multiplicar por η en vez de dividir, etc.). Generan ejercicios distintos sin fin.
- **26 ejercicios de las guías** del curso, resueltos y verificados.
- **156 preguntas teóricas** (132 de alternativas y 24 de verdadero/falso) sacadas de las presentaciones 7 a 10.

> Dos observaciones sobre el material: el formulario escribe \(P_{PCR} = s\,P_{salida}\), pero la relación correcta (y la de las láminas) es \(P_{PCR} = s\,P_{EH}\); y en la tabla de velocidades de la lámina de inducción la columna dice "pares de polos" pero los valores corresponden al número de polos. La app usa las relaciones correctas y lo explica en las lecciones.

## Decentes e indecentes

- Al crear la cuenta se pregunta si la persona es **decente** o **indecente**. Para elegir indecente hay que marcar que se tiene 18 años o más.
- **Decente**: sus sobres solo traen cartas decentes, y en el mercado e intercambios solo ve y comercia cartas decentes.
- **Indecente**: también le salen las cartas de la serie indecente (ids `h001`…) y puede comerciarlas, pero solo con otras cuentas indecentes.
- Las miniaturas indecentes aparecen con blur. Un indecente puede quitarlo en Perfil → Ajustes. Para un decente, una carta indecente (por ejemplo, la destacada de otro jugador) siempre se ve con blur.
- Un decente puede volverse indecente desde Perfil → Ajustes. **No se puede deshacer**: el servidor no tiene ninguna función para volver atrás.
- El ranking y los perfiles muestran 😇 decente o 😈 indecente.
- Todo esto lo hace cumplir el servidor (funciones `open_pack`, `create_listing`, `buy_listing`, `create_trade`, `respond_trade` y la regla RLS del mercado), no solo la página.

## Puesta en marcha

### 1. Supabase (login, ranking, cartas y mercado)

1. Crea un proyecto en [supabase.com](https://supabase.com) (el plan gratis basta).
2. **Authentication → Sign In / Providers → Email**: deja el proveedor encendido y **desactiva "Confirm email"**. Los usuarios entran con usuario y contraseña; por dentro se usa un correo ficticio `usuario@certamen2.app`, así que no se envían correos (y una contraseña olvidada no se puede recuperar por correo).
3. **SQL Editor**: pega el contenido completo de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Luego pega [`supabase/seed.sql`](supabase/seed.sql) y **Run**. Ambos se pueden volver a ejecutar sin perder datos.
4. **Project Settings → API**: copia la *Project URL* y la *anon / publishable key* en [`js/config.js`](js/config.js).
5. (Opcional) **Database → Replication**: verifica que `market_listings` y `trades` estén en la publicación `supabase_realtime` (el script intenta agregarlas) para que el mercado se actualice solo.

El bucket `avatars` para las fotos de perfil se crea con el script (público, máx. 1 MB, solo imágenes). La app recorta y comprime la foto a 256×256 WebP antes de subirla, y cada usuario solo puede escribir en su propia carpeta.

### 2. Publicar con GitHub Pages

Settings → Pages → *Deploy from a branch* → rama principal, carpeta `/ (root)`. El archivo `.nojekyll` ya está incluido.

### 3. Probar en tu computador

```bash
python3 -m http.server 8000     # y abre http://localhost:8000
npm test                         # pruebas de los generadores, guías, economía y lector de números
bash tests/sql/run.sh            # (opcional, Linux con PostgreSQL 16) prueba schema.sql completo
```

## Seguridad (por qué no se puede hacer trampa con monedas o cartas)

- Todas las tablas tienen **RLS**. El navegador solo puede **leer**; la única escritura directa es su propio progreso de estudio.
- Todo lo que mueve monedas o cartas pasa por **funciones RPC `security definer`** que validan, bloquean las filas (`FOR UPDATE`) y hacen todo en **una transacción**: abrir sobres (el azar ocurre en el servidor), vender al juego, publicar/comprar/cancelar en el mercado y crear/aceptar/rechazar/cancelar intercambios.
- Una carta publicada o ofrecida queda **en custodia** (sale del inventario) hasta que se vende, se cancela o se resuelve el intercambio: no se puede vender dos veces. Solo se comercian **repetidas** (siempre te queda 1 copia).
- Cada movimiento queda registrado en `coin_ledger`.
- Las recompensas por estudiar no se pueden verificar pregunta a pregunta (las preguntas se generan en el navegador), así que el servidor pone **topes**: máximo 30 respuestas por envío, 1500 monedas y 20000 XP por día por estudio, 3 misiones diarias de hasta 80 monedas, y monedas por certamen solo si el intento duró lo razonable y no se repite antes de 3 minutos. Un tramposo puede ganar algo más rápido, pero no inflar la economía sin límite.

## Estructura

```
index.html              HUD, navegación y contenedor de vistas
css/app.css             estilos (móvil primero)
js/config.js            URL y key pública de Supabase
js/app.js               arranque y HUD
js/router.js            navegación con #hash
js/state.js             progreso local, misiones, logros, niveles
js/backend.js           Supabase (auth, RPC, mercado, ranking, fotos) + modo local
js/economy.js           reglas de sobres y recompensas (copia en JS de las del SQL)
js/game.js              recompensas, combos y celebraciones de cada respuesta
js/fx.js                sonidos, partículas, banners, vibración y ganchos de multimedia
js/components.js        pregunta de alternativas, ejercicio de desarrollo, carta, avatar
js/data/catalog.js      cartas, rarezas y sobres (fuente única → scripts/gen-seed.mjs)
js/content/lessons.js   lecciones
js/content/generators.js plantillas de ejercicios con números al azar
js/content/guide.js     guías CC y CA resueltas
js/content/concepts.js  preguntas teóricas
js/engine/              armado de alternativas, simulacros y bancos por tema
js/views/               pantallas (inicio, aprender, practicar, certamen, rush, cartas, mercado, perfil/ranking)
supabase/schema.sql     tablas, RLS, funciones y storage
supabase/seed.sql       catálogo (generado)
assets/                 multimedia de la parte 2 (manifest.json)
vendor/katex/           KaTeX 0.16.9 para las fórmulas (sin depender de CDN)
tests/                  pruebas automáticas
```

### Cómo actualizar las cartas

1. Ordena las imágenes en `DECENTES/<Rareza>/` e `INDECENTES CULIAOS/<Rareza>/` (Comun, Rara, Epica, Legendaria, Mitica). Las reacciones van en `DECENTES/Uso general en la App/`.
2. Ejecuta `python3 scripts/build-cards.py "<carpeta MONAS CLAUDE>"` y luego `npm run seed`. Necesita Python con Pillow.
3. Pega `supabase/seed.sql` en el SQL Editor de Supabase.

El script convierte todo a WebP: imagen completa de 520 px como máximo, animada si era GIF, más una miniatura fija de 260 px. Los ids se asignan en orden alfabético, así que conviene **agregar** archivos nuevos y no renombrar los que ya existen. Los nombres y series revisados a mano están en `scripts/card-names.txt` y mandan sobre lo que el script adivina del nombre del archivo.

### Cómo agregar contenido

- **Pregunta teórica**: una línea en `js/content/concepts.js` → `[tema, pregunta, [correcta, trampa, trampa, trampa], explicación]`.
- **Tipo de ejercicio**: una plantilla `tpl(...)` en `js/content/generators.js` que devuelve el enunciado y sus partes (`P(pregunta, respuesta, unidad, pasos, errores típicos)`). `npm test` revisa 200 versiones de cada una.
- **Cartas**: ver "Cómo actualizar las cartas".
