# Jarvis · historial detallado de versiones (v0.1 a v0.2)

> README anterior al 14/11/2026, conservado completo como referencia técnica. El README actual resume el uso.

## v0.2: IA local, acciones por chat, voz y estado del equipo

- **IA local por defecto (Ollama):** conversación real sin cuota ni consentimiento por mensaje, porque nada sale del equipo. Usa automáticamente tu contexto: pendientes, plan de hoy, recuerdos, objetivos, repasos y estado del equipo. Requiere `ollama pull qwen3.5:9b` (o otro modelo con herramientas en `OLLAMA_MODEL`). Si Ollama está apagado, el chat lo dice; tareas y estudio siguen funcionando.
- **Acciones desde el chat:** «recuérdame llamar a mamá el viernes a las 7», «ya terminé X», «mueve Y al sábado», «prefiero estudiar de noche». Jarvis crea **propuestas** (tarea, completar/reabrir/borrar/editar, recuerdo) que se abren para revisar y confirmar; nunca guarda sin tu clic. Las fechas se muestran en tu zona horaria antes de confirmar.
- **Estudio dinámico con IA local:** generar preguntas desde tus materiales y pedir revisión de tu razonamiento ya no requiere Gemini.
- **Voz:** dictado con el micrófono (Chrome/Edge; el navegador procesa el audio, en Chrome en servidores de Google) que envía al terminar de hablar, y lectura de respuestas en voz alta. En el móvil, el micrófono del teclado también sirve.
- **Mi equipo (Hoy):** memoria, CPU, disco y lo que más consume, con consejos por reglas y «Pedir consejo a Jarvis». Solo lectura: Jarvis no cierra procesos ni ejecuta comandos.
- **Modo híbrido con la nube (opcional):** añade `ANTHROPIC_API_KEY` y `EXTERNAL_AI_TERMS_ACCEPTED=true` en `.env`. Con IA local, el botón de nube del chat envía a Claude (`claude-opus-5-5` por defecto, configurable en `CLAUDE_MODEL`) solo los mensajes que elijas, con las mismas acciones confirmables; la app muestra qué se envía y cuántos mensajes llevas (límite `AI_MAX_DAILY_REQUESTS`). Sin GPU, `AI_PROVIDER=claude` usa la nube para todo. Si Ollama falla, el error sugiere activar la nube; nunca cambia sola. Se activan las alternativas automáticas de Anthropic (`fallbacks: "default"`) si un modelo declina por seguridad.
- **Móvil (opcional):** instala [Tailscale](https://tailscale.com) en PC y móvil, luego `npm run build`, `JARVIS_ALLOWED_HOSTS=<tu-pc>.<tu-red>.ts.net npm start` y `tailscale serve --bg 3001`. Abre la URL `https://…ts.net` en el móvil e instálala como app (manifiesto PWA incluido). El servidor sigue escuchando solo en `127.0.0.1`; **no abras el puerto a internet**.

Respuestas: 3–15 s en una RTX 5050 (más la primera vez, al cargar el modelo). La IA local puede equivocarse; por eso toda acción pasa por confirmación. Revisión de producto y hoja de ruta: [ROADMAP_PRODUCTO.md](../ROADMAP_PRODUCTO.md). Mercado inicial y plan de validación: [MERCADO_INICIAL.md](../MERCADO_INICIAL.md). En **Mi perfil → Configura tu Jarvis** verás qué falta (GPU, Ollama, modelo, nube) y el comando para arreglarlo.

## Objetivo → ruta → material → práctica (SQLite v8)

1. **Hoy → Mis objetivos y rutas de aprendizaje:** define el resultado que quieres demostrar, tema, fecha opcional, minutos por sesión y entre 1 y 12 pasos. Vincula materiales y preguntas existentes. Guardar aprueba la ruta; no crea tareas automáticamente. Cada paso requiere confirmar su tarea y crea como máximo una. La tarea queda disponible para el plan diario. Editar o borrar un objetivo no modifica ni elimina tareas ya creadas. Máximo inicial: 30 objetivos. Las ediciones tienen control de versión.
2. **Estudiar → Crear o revisar material de estudio:** elige hasta tres fuentes aportadas y revisa sus extractos (primeros 4.000 caracteres de cada material). Puedes cargar explícitamente las selecciones y el resultado esperado de tu ruta. Solo el consentimiento permite enviarlos a Gemini, usando la cuota compartida existente. Las propuestas basadas en fuentes requieren citas literales del extracto; se rechazan citas inventadas. Aprobar conserva la procedencia y una copia del extracto, sin certificar exactitud. La propuesta caduca en 24 horas y no se aprueba si una fuente fue borrada o cambió. Las propuestas con fuentes se almacenan para validar su aprobación, pero su formulario aún no se recupera tras recargar. Editar una explicación puede invalidar su interpretación aunque la cita siga siendo literal.
3. **Estudiar → Objetivo de práctica:** prepara una cola antes de iniciarla. Primero prioriza vencidos, luego dificultades del último intento de la versión actual, luego preguntas sin practicar; otras se marcan como práctica adelantada. Hasta seis preguntas y 10 min estimados por pregunta, sin exceder el presupuesto declarado. Es selección por reglas, no un tutor adaptativo que diagnostique dominio. Inicia y guarda cada intento para registrar evidencia; continuar avanza al siguiente pendiente. La cola se conserva por pestaña, mientras los intentos y los borradores de pregunta guardados explícitamente persisten en SQLite. Si cambia una pregunta, debes preparar otra sesión. Completar tareas o una cola no certifica aprendizaje ni marca automáticamente los pasos como completados.
4. **Mi perfil / Conversar → Memoria:** procedencia, fecha de creación (solo donde se conoce), versión, última actualización y vigencia opcional por día UTC. Las propuestas de chat aprobadas conservan su mensaje de origen local. Busca y elige hasta diez recuerdos para cada mensaje; se ordenan por coincidencias de palabras, sin selección automática ni búsqueda semántica. Los vencidos no se comparten. Cambiar una selección renueva el consentimiento y se comprueban sus versiones al enviar desde la interfaz. Cada respuesta externa registra los títulos y versiones compartidos, no qué influyó realmente en el razonamiento. Borrar elimina el recuerdo y su propuesta aprobada asociada; no borra copias en mensajes, exportaciones, backups o retenciones del proveedor.

**Ejemplo de uso:** aporta una nota de C# → crea un objetivo y ruta en Hoy → genera y aprueba preguntas con esa nota (si activaste Gemini) → edita la ruta para vincularlas → crea tareas de los pasos y planifícalas → prepara práctica en Estudiar → guarda los intentos y revisa las dificultades.

No se activó Gemini ni se enviaron datos reales a cuentas externas durante el desarrollo. Objetivos, tareas y selección de práctica funcionan localmente. Quedan pendientes rutas generadas adaptativamente, prerrequisitos, evaluación automática de transferencia, hábitos recurrentes, conectores web, importación masiva de notas y acceso móvil remoto seguro. La aplicación sigue limitada a loopback.

## Captura, fechas y materiales (SQLite v7)

- **Hoy → Captura y sigue:** escribe un pendiente y pulsa Enter. Se crea localmente con valores visibles, sin gastar IA; los detalles se pueden editar después.
- **Avisos:** selector de fecha/hora local también en propuestas del chat, zona horaria visible y revisión antes → después. No se adivinan fechas del mensaje. Las horas inexistentes o repetidas por cambios de horario se rechazan; las fechas existentes sin modificar conservan su instante original.
- **Borradores:** mensaje, nueva tarea/edición, captura y propuestas de tareas/recuerdos se conservan en `sessionStorage`, por pestaña y navegador, al navegar o recargar. No incluyen consentimiento ni se envían al servidor. Guardar o descartar los limpia; cerrar un formulario de tarea conserva su borrador. No son backups, no se sincronizan ni están incluidos en exportaciones. El estudio mantiene su guardado explícito en SQLite.
- **Estudiar → Aportar y consultar mis materiales:** entrada revisada de `.md`/`.txt`, texto y enlace de referencia con tema y procedencia. Límite inicial: 100 materiales, 16.000 caracteres por material y 48 KB por archivo. Persisten en SQLite y se pueden buscar, consultar, exportar y borrar con confirmación. Son texto no ejecutable. Ningún enlace se descarga ni material se adjunta automáticamente. Desde v8 se pueden seleccionar extractos para generar ejercicios con consentimiento. No hay recuperación semántica ni rastreo web.

La evaluación anterior está conservada en [EVALUACION_PRODUCTO_JARVIS.md](../EVALUACION_PRODUCTO_JARVIS.md). El criterio sobre notas personales, documentación y fuentes comunitarias está en [FUENTES_Y_BASE_CONOCIMIENTOS.md](../FUENTES_Y_BASE_CONOCIMIENTOS.md).

Antes de arrancar, detén el servidor y respalda `data/jarvis.sqlite`. La migración automática actual es **v8**, conservando los datos anteriores. No se han importado ni modificado tus notas personales. La exportación incluye objetivos, vínculos a tareas, fuentes y memoria; no los borradores de `sessionStorage`.

## Actualización: memoria y cambios desde el chat

### Nuevas acciones confirmadas (SQLite v6)

- Cambiar o quitar **fecha/aviso** al revisar una propuesta; desde v7 se usa un selector local, no se exige escribir ISO. Las fechas ambiguas del mensaje no se interpretan ni se guardan automáticamente. Los avisos siguen siendo internos.
- Seleccionar una tarea y **completar, reabrir o borrar** mediante una propuesta local, sin consumir cuota ni enviar datos a Gemini. Borrar requiere confirmación explícita y conserva los títulos en planes y actividad histórica. Se rechazan propuestas si la tarea cambió o desapareció. Repetir una confirmación no vuelve a ejecutar la acción.
- **Proponer recuerdo con este mensaje**: revisión editable y aprobación antes de incorporarlo a memoria. En demo copia el texto (hasta 500 caracteres); Gemini requiere consentimiento y comparte la cuota diaria de cinco llamadas, incluidos fallos.
- **Propuestas pendientes**: recupera tareas, acciones y recuerdos después de recargar o reiniciar. Caducan a las 24 horas. La propuesta original persiste en SQLite; desde v7, las ediciones del formulario se conservan además por pestaña. Caducar la oculta y bloquea su aprobación, no elimina su registro de SQLite o de las exportaciones; puedes descartarla antes de caducar.

Estas acciones se incorporaron en v6; la migración actual es v8. Las funciones locales siguen disponibles sin activar Gemini.

La migración a **v6** conserva tareas, recuerdos y propuestas anteriores.

- **Mi perfil → Memoria que tú controlas:** añadir, consultar, corregir y borrar recuerdos explícitos (hasta 50, con título y texto). Guardar es aprobación local; la IA no extrae recuerdos automáticamente.
- **Conversar → Recuerdos para este mensaje:** selección explícita de hasta diez, desactivada por defecto, con consentimiento por mensaje. Borrar un recuerdo lo excluye de futuros envíos, pero no elimina copias que puedan existir en mensajes anteriores, exportaciones, backups o el proveedor.
- **Conversar → Tarea para la propuesta:** selecciona exactamente una tarea, describe el cambio y revisa la propuesta. Solo la confirmación aplica título, área, prioridad, duración y aviso; mantiene el estado completado salvo que elijas completar o reabrir. En demo la edición es manual; con Gemini se propone a partir del mensaje y la tarea seleccionada. Si la tarea cambió o fue borrada desde la propuesta, se rechaza para evitar sobrescribir cambios. Confirmar repetidamente no reaplica la modificación.
- Recuerdos y propuestas se incluyen en la exportación. La búsqueda semántica y extracción automática de recuerdos siguen pendientes.

La IA externa sigue apagada por defecto; guardar, aprobar y descartar localmente no requieren cuota. Proponer con Gemini sí consume cuota. No se han utilizado claves compartidas ni enviado datos reales a Gemini.

Una primera base funcional de la visión de [PLAN_JARVIS.md](../PLAN_JARVIS.md), no el producto completo. Organización y estudio son el núcleo; conversación y humor acompañan ambos. Inglés, entrenamiento físico, voz e integraciones **siguen en el plan para más adelante**.

## Arrancar

Requiere **Node.js 24 o superior** y npm. SQLite viene con Node: no necesitas instalar una base de datos ni crear una cuenta externa.

```bash
npm install
npm run dev
```

Abre **http://127.0.0.1:5173**. La API se ejecuta en `127.0.0.1:3001`. Ambos procesos se detienen con `Ctrl+C`.

No necesitas `.env`, tarjeta ni clave de IA. Por defecto usa **Ollama local** (`http://127.0.0.1:11434`, modelo `qwen3.5:9b`). Sin GPU u Ollama, define `AI_PROVIDER=demo` en `.env` para respuestas predefinidas.

### Versión compilada

```bash
npm run build
npm start
```

Abre **http://127.0.0.1:3001**. El backend sirve también la web compilada.

## Qué funciona

- Web adaptable a escritorio y tamaños de pantalla móvil, con navegación por teclado.
- Crear, editar, priorizar, completar, reabrir y eliminar tareas.
- Duración estimada editable por tarea, entre 5 y 240 minutos.
- Plan diario de hasta tres pendientes: disponibilidad, compromisos fijos, descansos, propuesta y aprobación explícita.
- Cierre diario editable con reflexión, energía opcional y actividad registrada al guardar.
- Vista **Mi semana**: actividad de lunes a domingo, cierres anteriores y observaciones locales por reglas simples.
- Avisos internos de tareas con fecha; reconocimiento persistente y sin repetir avisos ya vistos.
- Perfil editable: nombre, objetivo semanal y tono preferido guardado.
- Chat demo con historial local, ayuda básica con pendientes, estudio y una broma.
- Tres preguntas de fundamentos web, pistas, intento antes de revelar, referencias MDN y autoevaluación.
- Ciclo de estudio con recuperación activa, Feynman, segundo intento, transferencia, sesiones retomables y registro de dificultades; repasos con calendario simple.
- Exportar perfil, todas las conversaciones, tareas, intentos, planes, cierres y finalizaciones como JSON.
- Adaptador Gemini opcional, desactivado por defecto, con autorización por mensaje y límite de solicitudes.

## Límites que debes conocer

1. **No hay notificaciones push ni avisos con la app cerrada.** Se consultan avisos al abrir la app y cada 15 segundos mientras la pestaña está visible y el servidor activo. Al volver a abrirla, los avisos pendientes siguen disponibles.
2. **La IA ofrece revisión orientativa, no una evaluación certificada.** Tú comparas tu respuesta y valoras el intento. Las observaciones de IA, valoraciones y número de intentos no certifican dominio.
3. **No hay memoria inteligente ni autonomía.** Una conversación normal no ejecuta acciones. Crear una tarea desde una propuesta exige confirmación; no se mueven eventos, navega por la web ni ejecuta código. El perfil es información explícita; el tono se guarda para futuras mejoras y no cambia sustancialmente las respuestas demo.
4. **No hay cuentas, autenticación, HTTPS, sincronización ni PWA.** El servidor se limita a `127.0.0.1` y rechaza hosts externos. Aunque la interfaz es adaptable, acceder desde un teléfono físico o publicar en internet requiere diseñar acceso seguro y despliegue; no abras este servidor directamente a internet.
5. **No hay diagramas generados, documentos propios, rutinas físicas ni tutor de inglés todavía.** La voz es básica (dictado del navegador y lectura en voz alta). Se conserva su prioridad en el plan y se muestran como próximos módulos, no como botones falsamente funcionales.
6. **No hay cifrado de SQLite ni borrado global desde la interfaz.** Usa protección de tu equipo. Puedes borrar el historial del chat y tareas individuales; la exportación contiene datos personales.

## Planificar y revisar tu día

1. Añade pendientes e indica una duración aproximada.
2. En **Hoy → Planificar mi día**, elige una ventana, hasta tres tareas y los compromisos dentro de esa ventana.
3. Genera la propuesta: respeta prioridades y descansos, y muestra lo que no cabe. **Todavía no guarda nada**.
4. Aprueba el plan. Puedes reemplazarlo con otra propuesta; si una tarea o el plan cambió mientras tanto, se requiere generar una nueva.
5. Completa tareas desde su bloque o desde la lista. Al terminar, guarda un **Cierre del día** y consulta **Mi semana**.

La planificación usa una sola ventana por día, sin cruzar medianoche. No divide tareas automáticamente, no consulta calendarios externos y no crea avisos al aprobar. Los horarios son orientativos, no tiempo trabajado. Se conserva el último plan aprobado, no un historial de todas sus revisiones.

La zona horaria del dispositivo se guarda con cada día planificado o revisado. Las ventanas con horas inexistentes, repetidas o cambios de horario se rechazan con una explicación. Puedes consultar fechas anteriores y escribir sus cierres, pero no crearles planes retroactivos ni cerrar días futuros. La lista de pendientes siempre muestra su estado actual.

Una finalización cuenta una vez por tarea y día, y una vez por tarea en el total semanal, aunque la reabras. Reabrir no borra el hecho histórico de haberla completado. El cierre conserva una foto de la actividad al guardarlo y avisa si hay actividad posterior; no se actualiza silenciosamente. Las observaciones semanales no son diagnósticos ni evaluaciones de aprendizaje y no llaman a una IA.

### Actualizar desde la primera versión

Antes de arrancar esta versión, detén el servidor y conserva una copia de `data/jarvis.sqlite` si ya tienes datos. La migración a SQLite v4 es automática y transaccional. Conserva los registros anteriores; las tareas antiguas reciben una estimación editable de 25 minutos, pero **no se inventan fechas de finalización históricas**. Una base de una versión más nueva se rechaza sin rebajar su esquema.

## Datos, copias y privacidad

Los datos se guardan en `data/jarvis.sqlite`. Ese directorio, `.env`, las dependencias y artefactos de pruebas están excluidos de Git. No se cargan fuentes externas, publicidad ni analítica.

- El historial muestra los últimos 60 mensajes, pero la exportación incluye todo lo guardado.
- Las respuestas y autoevaluaciones de estudio se guardan, además de los intervalos.
- Eliminar una tarea no elimina su título de planes aprobados ni de finalizaciones históricas. Los cierres también permanecen guardados; todavía no hay borrado de estos registros desde la interfaz.
- Para una copia completa, **detén el servidor** y copia `data/jarvis.sqlite` a un lugar seguro.
- Para restaurar, detén el servidor y sustituye ese archivo por tu copia. No sobrescribas datos actuales sin guardarlos primero.
- La exportación JSON sirve para consultar o conservar tu información; **todavía no tiene importador**.
- Borrar el chat solo borra su historial local, no los intentos, tareas ni contadores de consumo. Tampoco implica borrar información retenida por un proveedor externo si lo activaste.

## Gemini: opcional y protegido por defecto

Antes de activar: revisa elegibilidad, condiciones de uso, país, privacidad, modelo disponible y [precios actuales](https://ai.google.dev/gemini-api/docs/pricing). El plan explica por qué no hay que asumir que la cuota gratuita es adecuada para datos personales.

Si decides usarlo, crea `.env` a partir de `.env.example` y configura:

```dotenv
AI_PROVIDER=gemini
EXTERNAL_AI_ENABLED=true
EXTERNAL_AI_TERMS_ACCEPTED=true
GEMINI_API_KEY=tu_clave_privada
GEMINI_MODEL=un_modelo_disponible_en_tu_proyecto
AI_MAX_DAILY_REQUESTS=5
```

Reinicia el servidor. **No pegues claves en el código ni en el chat.** Con una autorización ausente o sin clave, la app permanece en modo demo.

- Cada mensaje requiere marcar su consentimiento en la interfaz.
- Por defecto solo se envía el mensaje actual. En Conversar puedes autorizar contexto adicional: los últimos 8 mensajes Gemini (hasta 1200 caracteres cada uno), perfil y hasta 15 pendientes. Cambiar la selección requiere renovar el consentimiento. No se adjuntan planes, cierres ni intentos de estudio.
- El límite cuenta intentos de solicitud, incluidos fallos y tiempos de espera, por día UTC. Borrar el chat no reinicia el límite.
- Es un límite de llamadas, **no una garantía de gasto monetario exacto**. Revisa también la facturación del proveedor; no confíes en alertas de presupuesto como si fueran cortes automáticos.
- No se activa un proveedor más caro como alternativa silenciosa.
- El adaptador se verifica con un proveedor simulado en pruebas; no se ha comprobado una llamada real con tu cuenta o clave.

## Pruebas

```bash
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

O ejecuta `npm run check` después de instalar Chromium. Las pruebas de API utilizan bases temporales o en memoria. Las pruebas de navegador utilizan otra base en memoria y los puertos `3101` y `5174`: no borran tus datos personales.

Se comprueban persistencia, migración, disponibilidad, solapamientos, descansos, zonas horarias, conflictos al aprobar, cierres, resumen semanal, parches parciales, avisos, chat, exportación, intervalos, restricciones de origen, consentimiento y cuotas. Los recorridos de navegador cubren escritorio, móvil emulado y recuperación de errores de conexión; esto **no certifica compatibilidad con Safari/iOS ni push móvil**. El servidor de pruebas tiene reloj fijo y una ruta de reinicio exclusiva del entorno de pruebas, ausente de la aplicación normal.

En algunas distribuciones Linux, Playwright puede necesitar bibliotecas del sistema. No es necesario instalar un navegador para utilizar la app; solo para ejecutar sus pruebas de navegador.

## Estructura

```text
src/
  components/     Hoy, planificador, cierres, Mi semana, Estudiar, Conversar y Mi perfil
  useJarvis.ts    Estado, comunicación y errores
  api.ts          Cliente de API
  theme.css       Paleta azul, cian suave y acento arena
server/
  app.mjs         API y validación
  store.mjs       Persistencia SQLite
  migrations.mjs  Migraciones transaccionales de esquema
  planning.mjs    Validación, horarios y generación determinista de propuestas
  planning-store.mjs  Planes, cierres e historial de actividad
  ai.mjs          Demo local y adaptador Gemini
  study.mjs       Contenido inicial y reglas de repaso
  coach.mjs       Sesiones de estudio y propuestas de tareas confirmables
scripts/
  dev.mjs         Arranque de API y web sin intérprete shell
tests/
  app.spec.ts     Recorridos de navegador
```

Diseño: un espacio de trabajo tranquilo, no un panel de estadísticas ni una imitación cinematográfica. Tipografía de sistema para controles y Georgia para títulos; sin descargas de fuentes ni animaciones permanentes.

## Próxima iteración recomendada

1. Elegir proveedor compatible y decidir privacidad y presupuesto con datos reales.
2. Refinar planificación con varias ventanas y borrado de registros históricos, según tu uso real.
3. Generar diagramas seguros y ampliar un tema de estudio con material revisado.
4. Diseñar autenticación, HTTPS, despliegue y un canal de avisos antes de uso remoto.
5. Elegir una expansión: inglés por texto, hábitos o calendario; entrenamiento y voz después de su descubrimiento específico.

No todos los requisitos P0/P1 del documento de producto están implementados. Esta entrega es un punto de partida verificable y ampliable.

## Conversación contextual y estudio dinámico

**Si una clave se compartió en un chat, revócala y genera otra.** No la reutilices ni la incluyas en capturas, commits o mensajes. Configura la nueva solo en `.env`, excluido de Git; nunca en variables `VITE_*`. No se ha utilizado ninguna clave compartida ni comprobado una llamada real con tu cuenta.

En **Conversar**, elige el contexto mínimo necesario y autoriza cada envío. El historial acotado da continuidad, pero no es memoria permanente ni autoriza acciones. Puedes escribir una petición y pulsar **Proponer tarea con este mensaje**: en demo copia tu texto y con Gemini estructura una propuesta. Edita título, área, prioridad y minutos; solo **Confirmar creación de tarea** crea el pendiente. No se infieren fechas ni avisos. Confirmar dos veces no duplica tareas. Las propuestas caducan a las 24 horas; puedes descartarlas. Las aprobadas y pendientes se incluyen en la exportación y no desaparecen al borrar el chat.

En **Estudiar**, puedes generar una pregunta sobre un tema y objetivo, o pedir cambios de la seleccionada. La propuesta no se guarda hasta aprobarla; puedes editar su JSON o descartarla. Se admiten hasta 100 preguntas. Las modificaciones guardan la versión anterior, conservan los intentos y reinician el calendario de esa pregunta. Los intentos nuevos conservan una copia del material usado. La migración a SQLite v4 conserva tus datos anteriores; guarda una copia antes de actualizar.

Después de responder y revelar la explicación, puedes pedir una revisión orientativa a Gemini: aspectos logrados, lagunas, pistas, una pregunta de transferencia y limitaciones. Se guarda como evidencia separada; **no asigna notas ni modifica tu repaso automáticamente**. Generaciones y revisiones usan la misma cuota diaria del chat, incluidos fallos. El contenido generado no tiene fuentes verificadas: no se inventan enlaces ni se presenta como verdad certificada.

No hay generación autónoma en segundo plano, rutas completas de aprendizaje ni búsqueda de fuentes todavía. La expansión de la biblioteca es a petición y con aprobación. Borrado de material/versiones/revisiones desde la interfaz sigue pendiente; se incluye en la exportación.

### Ciclo de estudio, incluso sin IA

- Elige **recuperación activa**, **autoexplicación tipo Feynman** o **transferencia**. Registra tu confianza antes de comparar; no se convierte en una nota.
- Intenta responder sin consultar. Una pista queda registrada como ayuda, incluso si después la ocultas.
- Compara con la explicación y sus criterios. Clasifica tu dificultad: recuerdo, comprensión, aplicación o dependencia de ayudas.
- Oculta la solución y reconstruye la explicación. Después aplica la idea a un caso nuevo; también puedes responder a la pregunta de transferencia de Gemini en ese campo.
- **Lo recordé** requiere segundo intento y aplicación. Con ayudas o dificultades declaradas se programa un repaso corto de 10 minutos; sin ellas se aplica el calendario existente de 1, 3, 7, 14 y 30 días. Son reglas conservadoras de autoevaluación, no FSRS ni una medición objetiva de dominio.
- **Guardar progreso para continuar** conserva explícitamente tu sesión local, por pregunta y versión, sin gastar cuota. Al cerrar un repaso, sus respuestas y técnica pasan al historial y se elimina el borrador actual. Los borradores antiguos se conservan si cambia el material, pero no se mezclan con su nueva versión.
- Busca temas en la biblioteca, prioriza los repasos vencidos y alterna otra pregunta pendiente; cuando existe, se elige otro tema. El intercalado es una opción, no una exigencia para todas las materias.

No se vigila si consultaste fuentes externas ni se demuestra aprendizaje por escribir más texto. La revisión de IA sigue siendo discutible; contrasta el contenido con fuentes fiables. Guardar antes de cambiar de pregunta o pantalla evita perder cambios no guardados.

### Solo cuota gratuita

Usa un proyecto de Gemini sin facturación vinculada y un modelo que tenga cuota gratuita disponible para tu cuenta/país. Comprueba esto en Google AI Studio antes de activar el proveedor. Jarvis no puede verificar tu facturación ni convertir un modelo de pago en gratuito. `.env.example` propone **5 solicitudes diarias**, compartidas por chat, propuestas y estudio; no hay proveedor alternativo ni aumento automático de cuota. Cuando el proveedor agota su cuota, se muestra el error y permanecen disponibles las técnicas, sesiones y tareas locales. No se ha activado ni utilizado tu cuenta externa.
