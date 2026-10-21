**Sí: ya tenemos una dirección clara para Jarvis.** Mi propuesta es empezar con una web para PC y móvil, enfocada en **organización + aprendizaje**, con conversación, humor y apoyo como parte de toda la experiencia.

Este sería el **plan inicial para validar**, todavía sin programar.

## 1. La idea central

Jarvis debería conectar este ciclo:

**Tus objetivos → un plan realista → acción o estudio → seguimiento → ajustes.**

Por ejemplo:

> “Esta semana quiero entender redes y dejar de posponer mis pendientes”.

Jarvis te ayudaría a dividir ese objetivo, reservar sesiones, practicar, detectar dificultades y revisar lo conseguido. No se limitaría a responder preguntas.

## 2. Primera versión: qué incluiría

### A. Organización y disciplina
- Objetivos, tareas, fechas importantes y hábitos.
- Plan diario con pocas prioridades y tiempos realistas.
- Recordatorios configurables.
- Revisión breve al terminar el día.
- Revisión semanal para ajustar lo que no está funcionando.

**Importante:** si incumples algo, debería ayudarte a entender el motivo y reajustar, no simplemente regañarte. Disciplina no significa llenar cada minuto de obligaciones.

### B. Tutor de estudio
- Elegir un tema, objetivo y tiempo disponible.
- Comprobar conocimientos previos.
- Explicaciones adaptadas a tu nivel.
- Preguntas, ejercicios y retroalimentación.
- Registro de errores y repasos pendientes.
- Diagramas sencillos para tecnología y ciencia.

### C. Conversación y personalidad
- Conversación natural, bromas y recomendaciones.
- Tono configurable: cercano, directo, más serio o más bromista.
- Motivación relacionada con tus objetivos reales.
- Capacidad de discrepar contigo respetuosamente, no darte siempre la razón.

El apoyo sería cotidiano; **no se presentaría como psicólogo ni sustituiría ayuda profesional**.

### D. Memoria bajo tu control
Podría recordar preferencias, objetivos y progreso, pero tendrías una pantalla para **consultar, corregir y borrar** esa información.

No trataría una suposición del modelo como un hecho sobre ti.

## 3. Cómo debería enseñarte

No aplicaría todas las técnicas a todo. Cada una tendría una función:

| Técnica | Aplicación en Jarvis |
|---|---|
| **Active recall** | Preguntarte antes de mostrar la respuesta y comprobar qué recuperas sin ayudas. |
| **Repetición espaciada** | Programar repasos según tus resultados, no con fechas improvisadas por el chatbot. |
| **Feynman** | Pedirte una explicación sencilla y detectar lagunas o errores concretos. |
| **Cornell** | Organizar notas, preguntas y síntesis; después convertirlas en práctica. |
| **Mnemotecnia** | Ayudarte con vocabulario, listas o datos cuando resulte útil, sin sustituir la comprensión. |
| **Resolución de problemas** | Comprobar que puedes aplicar lo aprendido en situaciones nuevas. |

Una sesión podría seguir este flujo:

**Objetivo → diagnóstico breve → explicación → intento tuyo → retroalimentación → nuevo intento → próximo repaso.**

Dos reglas fundamentales:

- Jarvis no debería darte inmediatamente todas las respuestas.
- “Lo entendí cuando lo leí” no significa “puedo explicarlo o aplicarlo después”.

Para temas técnicos, priorizaríamos material de referencia fiable y distinguiríamos las explicaciones generales de las afirmaciones que requieren comprobar fuentes. También podrías cuestionar una corrección de Jarvis.

## 4. Cómo se sentiría usarlo

Diseñaría inicialmente cuatro espacios:

- **Hoy:** prioridades, agenda, recordatorios y repasos.
- **Conversar:** hablar con Jarvis y pedir acciones.
- **Estudiar:** temas, sesiones, ejercicios y diagramas.
- **Mi progreso:** objetivos, dificultades y avances.

El chat no sería la única interfaz. Es más fácil revisar una agenda o editar una tarea visualmente que hacerlo siempre mediante conversación.

## 5. Arquitectura: sencilla, pero fiable

Empezaría con **una sola aplicación modular**, no con muchos agentes ni microservicios.

```text
Web PC/móvil
     │
Backend: permisos y reglas
     ├── Datos y memoria
     ├── Tareas, hábitos y progreso
     ├── Programador de recordatorios y repasos
     └── Proveedor de IA intercambiable
```

La separación clave sería:

> **La IA interpreta y propone; la aplicación valida, guarda y ejecuta.**

Así, “te lo recordaré mañana” solo aparecería después de que el recordatorio haya quedado realmente registrado.

Además:

- La clave de la API permanecería en el backend.
- Los cambios importantes requerirían confirmación.
- Tareas y repasos seguirían disponibles aunque la IA fallara.
- Habría copias de seguridad y exportación de datos.
- Los diagramas podrían generarse con Mermaid, sin pagar generación de imágenes.
- No ejecutaríamos código generado automáticamente en tu laptop.

**Los recordatorios necesitan infraestructura activa.** Si el servidor está en tu laptop y esta se apaga, no podrá enviarlos en ese momento. Para funcionamiento continuo habrá que resolver el alojamiento, aunque sea económico.

Tu GPU no sería necesaria al usar IA externa; más adelante podemos evaluar modelos locales sin condicionar ahora toda la arquitectura.

## 6. Gemini y el presupuesto: hay un punto importante

Revisé la documentación oficial y **no daría por cerrado Gemini gratuito para tus datos personales**:

- Tiene cuotas que dependen del modelo y del proyecto.
- En servicios gratuitos, Google indica que el contenido puede utilizarse para mejorar productos y ser revisado por personas, y pide **no enviar información personal, confidencial o sensible**, con condiciones regionales distintas.
- Los términos actuales también restringen el uso a desarrollo profesional o empresarial, no consumo personal. Debemos comprobar el encaje de este proyecto.

Fuentes: [precios](https://ai.google.dev/gemini-api/docs/pricing), [términos](https://ai.google.dev/gemini-api/terms), [cuotas](https://ai.google.dev/gemini-api/docs/rate-limits).

**Mi recomendación:** mantener el proveedor intercambiable, usar datos ficticios durante las pruebas y resolver esas condiciones antes de conectar tu agenda y conversaciones reales.

Para acercarnos a coste cero:
- Texto antes que voz continua.
- IA solo cuando aporte valor; recordatorios y cálculos normales sin IA.
- Enviar únicamente el contexto necesario, no todo tu historial.
- Mostrar consumo y establecer límites desde la aplicación.
- No activar funciones de pago ni cambiar a un proveedor de pago silenciosamente.

## 7. Orden de construcción

| Etapa | Resultado esperado |
|---|---|
| **1. Base personal** | Conversación, perfil editable, tareas, plan diario y recordatorios con límites claros. |
| **2. Tutor útil** | Sesiones completas, ejercicios, retroalimentación, repasos y diagramas. |
| **3. Conexión y seguimiento** | Integrar estudio con agenda, revisiones semanales y recomendaciones basadas en resultados. |
| **4. Expansión** | Inglés especializado, entrenamiento físico, voz y conexiones con otras herramientas. |

Inglés podría aprovechar después el mismo motor de aprendizaje. El entrenamiento físico necesitaría su propio diseño y límites de seguridad, no solo otro prompt.

## 8. Cómo sabremos que funciona

Antes de ampliar funciones, comprobaríamos que:

- Las tareas se guardan correctamente y sobreviven a reinicios.
- Las fechas ambiguas se aclaran y se respeta tu zona horaria.
- Los recordatorios no se duplican al reintentar y los fallos quedan visibles.
- Una sesión detecta errores y adapta la práctica.
- El progreso mide **retención y aplicación**, no solo minutos estudiados.
- Puedes controlar memoria, notificaciones y consumo.
- Jarvis te resulta útil durante una prueba real de dos semanas.

**El objetivo de la primera versión no sería “hacer de todo”, sino ayudarte de verdad a organizarte y aprender mejor.**

Para concretar tecnologías y cerrar este primer alcance, dime:

1. **¿Qué lenguajes o frameworks manejas y con cuáles te gustaría construirlo?**
2. **¿Tu teléfono es Android o iPhone?**
3. **¿En qué país lo usarías?** Esto importa para las condiciones del proveedor de IA.

---

# Anexo: pendientes y evolución del producto

**Perspectiva:** Product Owner senior.  
**Fecha:** 7 de octubre de 2026.  
**Estado:** propuesta de backlog para validar, no compromiso de implementar todas las funcionalidades. La respuesta original se conserva íntegra arriba; este anexo concreta decisiones pendientes y oportunidades de mejora.

## 9. Principios para decidir qué construir

1. **Resultados antes que cantidad de funciones.** Jarvis debe ayudarte a cumplir prioridades y aprender; conversar más tiempo con la app no es un éxito por sí mismo.
2. **Fiabilidad antes que personalidad.** Un asistente simpático que pierde tareas o inventa recordatorios destruye la confianza.
3. **Una experiencia conectada.** Agenda, tutor y conversación deben compartir objetivos y progreso, sin convertirse en productos separados.
4. **Autonomía gradual y revocable.** Jarvis empieza sugiriendo. Solo ejecuta acciones dentro de permisos explícitos, con confirmación cuando corresponda y posibilidad de deshacer las acciones reversibles.
5. **Proactividad con consentimiento.** Tú decides cuándo, cómo y con qué frecuencia puede intervenir.
6. **Personalización explicable.** Una recomendación debe indicar qué observaciones la motivan y permitir corregirlas.
7. **Complejidad justificada.** No incorporar múltiples agentes, búsquedas vectoriales o infraestructura adicional hasta demostrar una necesidad concreta.
8. **Bienestar y control.** Evitar culpa, dependencia emocional, rachas punitivas y planificación que ignore descanso o circunstancias reales.

### Propuesta de valor

> Un asistente que convierte tus objetivos en acciones y aprendizaje verificable, con acompañamiento cercano y sin quitarte el control de tus decisiones o de tus datos.

## 10. Decisiones pendientes antes de implementar

| ID | Pendiente | Decisión que necesitamos | Por qué importa |
|---|---|---|---|
| D01 | Tecnologías | Lenguajes y frameworks conocidos; preferencias de frontend y backend. | Evitar elegir una arquitectura difícil de mantener para ti. |
| D02 | Dispositivo móvil | Android o iPhone, navegador habitual y disposición a instalar una PWA. | Notificaciones, instalación y capacidades disponibles varían. |
| D03 | País y proveedor de IA | País de uso, elegibilidad y condiciones aplicables al proyecto. | No conectar datos reales a un servicio incompatible con el uso previsto. |
| D04 | Presupuesto operativo | Qué significa «casi cero» en una cifra mensual y qué ocurre al alcanzar el límite. | Definir si la app debe detener llamadas, esperar o funcionar sin IA. |
| D05 | Disponibilidad | ¿Necesitas recordatorios cuando la laptop esté apagada y desde fuera de casa? | Determina si el alojamiento activo es requisito del piloto o una etapa posterior. |
| D06 | Rutina real | Zona horaria, compromisos fijos, horas disponibles, descanso y objetivos próximos. | Un plan útil depende de tu capacidad real, no de una agenda idealizada. |
| D07 | Primer caso de estudio | Un tema concreto, nivel actual, material de referencia y objetivo observable. | Probar el tutor en un ámbito acotado antes de afirmar que sirve para cualquier tema. |
| D08 | Proactividad | Canales permitidos, horarios de silencio, frecuencia máxima y situaciones que justifican intervenir. | Evitar que el asistente se convierta en otra fuente de distracción. |
| D09 | Personalidad y acompañamiento | Grado de humor, franqueza y exigencia; temas o estilos que prefieres evitar. | Motivar sin infantilizar, presionar o resultar invasivo. |
| D10 | Política de memoria | Qué puede recordar, qué requiere aprobación y cuánto tiempo conservar cada clase de información. | Separar memoria útil de acumulación innecesaria de datos personales. |
| D11 | Integraciones | Herramientas que ya utilizas: calendario, notas, tareas o plataformas educativas. | Reutilizar tus hábitos cuando aporte más valor que sustituirlos. |
| D12 | Capacidad de desarrollo | Tiempo semanal disponible y si el producto será solo personal al principio. | Ajustar alcance; no fijar fechas de entrega sin conocer la capacidad. |

**Regla de desbloqueo:** se puede diseñar y probar con datos ficticios mientras estas decisiones se resuelven, pero no prometer recordatorios continuos ni enviar datos personales reales sin cerrar sus requisitos.

## 11. Alcance recomendado del primer piloto

La visión inicial es amplia. Para ejecutarla sin dispersión, el primer piloto debería completar dos recorridos de principio a fin:

### Recorrido A: organizar y cerrar un día

1. Capturar pendientes por formulario o conversación.
2. Elegir hasta tres prioridades principales.
3. Proponer un plan compatible con los compromisos conocidos.
4. Registrar recordatorios mediante un canal probado en tu dispositivo.
5. Marcar avances y realizar una revisión breve.
6. Reprogramar conscientemente, sin arrastrar pendientes de manera automática e ilimitada.

### Recorrido B: estudiar y volver a comprobar lo aprendido

1. Elegir un tema acotado y un objetivo.
2. Realizar un diagnóstico breve.
3. Practicar antes de recibir la solución completa.
4. Recibir una corrección vinculada al material de referencia.
5. Guardar errores y próximos repasos.
6. Volver días después y comprobar recuperación sin ayudas y aplicación a un problema distinto.

### Límites del piloto

- Una cuenta personal; sin funciones de equipos ni lanzamiento público.
- Interacción principalmente por texto.
- Perfil y recuerdos explícitos, editables; no inferencia psicológica automática.
- Un canal de notificación al principio, con limitaciones de entrega visibles.
- Material de estudio acotado y seleccionado; sin ingesta masiva ni búsquedas automáticas permanentes.
- Diagramas básicos de flujo, secuencia y conceptos cuando aporten valor.
- Sin control autónomo del ordenador, envíos a terceros ni ejecución libre de código.
- Sin integrar a la vez inglés oral, entrenamiento físico y muchas aplicaciones externas.

## 12. Backlog priorizado

### Cómo interpretar las prioridades

- **P0 — Condición de confianza:** requisito antes de usar datos reales o depender del sistema.
- **P1 — Núcleo del piloto:** imprescindible para los dos recorridos principales.
- **P2 — Siguiente mejora:** candidato después de observar uso y resultados del piloto.
- **P3 — Evolución:** explorar cuando exista una necesidad demostrada y capacidad de mantenerla.

Las prioridades no implican fechas. El esfuerzo es relativo: **B = bajo, M = medio, A = alto**. Son estimaciones preliminares de desarrollo, pruebas y mantenimiento; deben revisarse al elegir tecnologías y precisar el alcance.

### 12.1 P0: confianza, privacidad y funcionamiento

| ID | Funcionalidad | Valor y criterio de aceptación principal | Dependencias | Esfuerzo |
|---|---|---|---|---|
| F01 | Acceso privado y gestión de secretos | Si se publica en la nube, solo tú accedes; las claves no aparecen en el navegador ni en registros públicos. | D01, despliegue. | M |
| F02 | Política de datos y proveedor compatible | Queda claro qué se guarda y qué se envía; no se transmiten categorías de datos no permitidas por el proveedor o por ti. | D03, D10. | M |
| F03 | Acciones validadas y permisos | La IA no ejecuta operaciones arbitrarias. Fechas ambiguas se aclaran y acciones importantes requieren aprobación. | Modelo de acciones y reglas del backend. | M |
| F04 | Persistencia, exportación y recuperación | Una tarea sobrevive a reinicios; una copia puede restaurarse y la información puede exportarse. El alcance del borrado se explica, incluidos límites de retención externos. | Almacenamiento y política de retención. | M |
| F05 | Control de consumo y errores | Se muestra consumo estimado, se bloquean nuevas llamadas según el límite configurado y una caída de IA no elimina tareas ni avances. | D04, medición de uso. | M |
| F06 | Recordatorios verificables | Cada programación tiene fecha y zona horaria; los reintentos no generan avisos duplicados y se distinguen los estados de programado, intento de envío y fallo. | D02, D05, D08, canal y programador activo. | A |
| F07 | Contenido externo tratado como datos | Un documento o página no puede conceder permisos ni cambiar las reglas del asistente. Diagramas y contenido generado se renderizan de forma segura. | Validación, límites de herramientas y renderizado. | M |

**Aclaraciones:** una respuesta correcta de la IA no sustituye permisos del backend; una alerta de presupuesto del proveedor no equivale a un corte de gasto; un intento de envío de notificación no demuestra que la hayas recibido o leído. El diseño debe respetar esas diferencias.

### 12.2 P1: núcleo personal y educativo

| ID | Funcionalidad | Valor y criterio de aceptación principal | Dependencias | Esfuerzo |
|---|---|---|---|---|
| F08 | Inicio guiado y perfil mínimo | Configuras zona horaria, objetivos, disponibilidad y tono sin completar un cuestionario interminable. Todo es editable. | D06, D09, D10. | B–M |
| F09 | Captura y gestión de tareas | Creas, corriges, completas y reprogramas pendientes por chat o interfaz; el estado guardado coincide en ambas vistas. | F03, F04. | M |
| F10 | Plan diario realista | Las prioridades se conectan con objetivos y disponibilidad; los conflictos visibles no se ocultan y tú apruebas ajustes. | F08, F09. | M |
| F11 | Conversación con contexto relevante | Jarvis usa solo el contexto necesario y distingue hechos guardados, preferencias y sugerencias; no afirma haber hecho una acción fallida. | F02, F03, F05. | M |
| F12 | Memoria explícita y revisable | Puedes aprobar, consultar, corregir o borrar recuerdos; la conversación temporal no se transforma silenciosamente en memoria permanente. | F02, F04, F08. | M |
| F13 | Sesión de estudio completa | Hay objetivo, intento tuyo, corrección, nuevo intento y cierre; puedes suspender y retomar la sesión. | D07, F04, F05. | A |
| F14 | Repasos programados | El próximo repaso se calcula con reglas reproducibles a partir del desempeño y puede consultarse sin llamar a la IA. | F13, historial de intentos. | M |
| F15 | Registro de errores y correcciones discutibles | Se separan fallo de comprensión, falta de recuerdo y uso de ayudas; puedes cuestionar la evaluación y no se presenta como infalible. | F13, material de referencia y rúbricas. | M |
| F16 | Diagramas educativos básicos | Jarvis genera un diagrama editable y explica sus relaciones; si falla la sintaxis, muestra una alternativa textual sin bloquear la sesión. | F07, F13. | M |
| F17 | Cierre diario y revisión semanal simple | Ves avances, obstáculos y una propuesta de ajuste que puedes rechazar; el resumen no inventa causas ni resultados. | F09, F10, F13. | M |

### 12.3 P2: módulos y mejoras después del piloto

| ID | Módulo o mejora | Valor esperado y validación principal | Dependencias | Esfuerzo |
|---|---|---|---|---|
| F18 | Hábitos y recuperación tras interrupciones | Favorecer constancia sin castigar descansos: poder pausar, retomar y reducir un hábito sin «perderlo todo». | F17, preferencias de seguimiento. | M |
| F19 | Planificación por energía declarada | Ajustar la carga si tú indicas cansancio o poca disponibilidad; no deducir condiciones de salud desde mensajes. | F10, consentimiento para este registro. | M |
| F20 | Calendario externo | Evitar doble captura. Empezar por un proveedor y un alcance limitado; mostrar conflictos y confirmar escrituras importantes. | D11, autorización del servicio, F03. | A |
| F21 | Biblioteca de material propio | Estudiar desde apuntes, documentos y enlaces con referencias localizables; informar cuando una respuesta no está sustentada por el material. | F02, F07, F13, límites de carga y almacenamiento. | A |
| F22 | Inglés por texto | Diagnóstico orientativo, conversación contextual, correcciones explicadas y repaso de errores recurrentes; no presentar un nivel estimado como certificación. | F13–F15, objetivo de inglés. | M |
| F23 | Rutas de aprendizaje y prerrequisitos | Dividir una meta en habilidades y comprobar conocimientos previos; permitir modificar la ruta y demostrar dominio mediante ejercicios. | F13–F15, contenido curado. | A |
| F24 | Notas Cornell y recursos mnemotécnicos | Convertir notas en preguntas de recuperación y utilizar ayudas de memoria solo cuando aporten valor; el usuario revisa las preguntas generadas. | F13, F21. | M |
| F25 | Práctica intercalada y problemas de transferencia | Alternar tipos de problemas cuando proceda y distinguir resolver uno conocido de aplicar la idea a uno nuevo. | F13, F15, banco de ejercicios revisado. | M–A |
| F26 | Proactividad contextual con límites | Sugerir acciones ante vencimientos o revisiones pactadas, respetando silencios, máximo de avisos y pausa global. | D08, F06, F17. | M |
| F27 | Funcionamiento parcial sin conexión | Consultar información seleccionada y capturar pendientes sin red; sincronizar sin pérdidas y señalar que la IA externa no está disponible. | Política de caché local, sincronización y privacidad. | A |
| F28 | Observaciones explicables | Mostrar patrones útiles con ejemplos y periodo observado; distinguir correlación de causa y permitir marcar una observación como incorrecta. | Historial suficiente, F17, consentimiento. | M–A |

### 12.4 P3: expansión especializada

| ID | Módulo o mejora | Valor esperado y límites | Dependencias | Esfuerzo |
|---|---|---|---|---|
| F29 | Inglés oral y voz opcional | Practicar escucha y conversación; pedir consentimiento para audio y definir retención, costes y limitaciones de evaluación de pronunciación. | F22, proveedor compatible, presupuesto. | A |
| F30 | Entrenamiento físico | Planificación y registro adaptados a experiencia, objetivos y equipo; orientación general, sin diagnóstico ni tratamiento de lesiones. Diseñar advertencias y escalamiento ante señales de riesgo. | Descubrimiento específico, límites del proveedor y revisión de seguridad. | A |
| F31 | Laboratorio de programación y ciencia | Ejercicios verificables y simulaciones seleccionadas. Si se ejecuta código, hacerlo en un entorno aislado con límites, nunca libremente en tu equipo. | F23, contenido revisado, infraestructura segura. | A |
| F32 | Mapas de conocimiento interactivos | Visualizar conexiones, prerrequisitos y evidencias de dominio; no etiquetar conocimientos como aprendidos solo porque se visitó una explicación. | F23 y un modelo de progreso validado. | A |
| F33 | IA local o sistema híbrido | Evaluar privacidad y autonomía con modelos que realmente rindan en tu equipo; comparar calidad, latencia, memoria y mantenimiento antes de sustituir la API. | Casos de prueba del tutor y conversación; pruebas con el hardware real. | A |
| F34 | Integraciones con notas y herramientas de desarrollo | Conectar únicamente servicios que reduzcan fricción en tu rutina; permisos mínimos y revocables. | D11, F03, APIs disponibles. | M–A por integración |
| F35 | Producto para otras personas | Considerar múltiples cuentas, aislamiento de datos, soporte, costes por usuario y obligaciones aplicables solo si decides abrir el producto. | Validación previa del uso personal y nueva definición de alcance. | A |

## 13. Historias de usuario y ejemplos de aceptación

Estas historias sirven para transformar el plan en funcionalidades comprobables cuando se inicie el desarrollo.

### HU01 — Capturar un recordatorio sin ambigüedad

**Como usuario**, quiero pedir «recuérdame entregar el trabajo el viernes a las 18:00» y comprobar que quedó registrado.

- Se utiliza mi zona horaria y se aclara cualquier ambigüedad de fecha.
- Se muestra fecha, hora, canal y estado del recordatorio guardado.
- Si falla el guardado, Jarvis lo informa; no responde como si se hubiera completado.
- Puedo editarlo o cancelarlo.
- Si el canal no está habilitado o el servidor no estará activo, se muestra la limitación.

### HU02 — Replanificar sin perder el control

**Como usuario**, quiero ajustar el día cuando una actividad tarda más de lo previsto.

- Jarvis conserva compromisos fijos y hace visibles los conflictos.
- Propone qué mover o reducir y explica el motivo.
- No modifica silenciosamente compromisos externos.
- Puedo aprobar una alternativa, editarla o mantener el plan actual.

### HU03 — Estudiar sin una falsa sensación de dominio

**Como estudiante**, quiero saber si puedo aplicar un concepto, no solo reconocer su explicación.

- Se define una habilidad observable al iniciar la sesión.
- Primero intento responder o resolver; puedo pedir pistas graduales.
- La retroalimentación identifica el error y permite corregirlo.
- Un ejercicio posterior comprueba aplicación en otro contexto.
- Se guarda si resolví con ayudas o sin ellas; no se confunde esa evidencia.

### HU04 — Cuestionar una corrección

**Como estudiante**, quiero señalar que una evaluación de Jarvis puede estar equivocada.

- Puedo solicitar la explicación, la rúbrica y la referencia utilizada cuando exista.
- Si el material no permite decidir, la app lo reconoce en lugar de inventar certeza.
- Una corrección revisada actualiza el registro correspondiente sin perder trazabilidad.

### HU05 — Controlar mi memoria y privacidad

**Como usuario**, quiero saber qué recuerda Jarvis y qué información sale de mi aplicación.

- Puedo revisar y editar el perfil y los recuerdos persistentes.
- Puedo utilizar una conversación que no cree recuerdos duraderos.
- La app distingue entre no guardar memoria, no guardar historial y no enviar información externa: no son la misma promesa.
- Se explica el alcance de la eliminación y las limitaciones de retención del proveedor.

### HU06 — Continuar cuando se agota la cuota

**Como usuario**, quiero que un límite de IA no me impida consultar pendientes o registrar avances.

- Puedo gestionar tareas y consultar repasos ya generados sin una nueva llamada al modelo.
- La app explica cuándo falló una función dependiente de IA y conserva el trabajo.
- Los reintentos tienen límites; no generan un ciclo de llamadas o cargos.
- No se cambia a un modelo o proveedor más caro sin mi autorización.

## 14. Métricas de producto: medir utilidad, no dependencia

Las metas numéricas se fijarán después de una línea base. Un piloto personal pequeño no permite atribuir causalidad ni demostrar que una técnica funciona para todas las personas.

| Área | Señal útil | Qué no debemos confundir con éxito |
|---|---|---|
| Organización | Proporción de prioridades elegidas que completas y calidad percibida del plan. | Crear muchas tareas o tachar pendientes triviales. |
| Aprendizaje | Recuperación sin ayudas tras un intervalo y resolución de problemas nuevos. | Leer mucho, acumular tarjetas o acertar justo después de ver la solución. |
| Disciplina sostenible | Capacidad de retomar después de una interrupción y carga que puedes sostener. | Rachas perfectas o culpa por descansar. |
| Confianza | Acciones correctas, fallos visibles y recordatorios sin duplicación. | Respuestas convincentes sin comprobar el estado real. |
| Proactividad | Avisos considerados útiles frente a avisos ignorados, pospuestos o silenciados. | Enviar más notificaciones. |
| Personalización | Recomendaciones relevantes que puedes explicar y corregir. | Acumular datos sensibles o inferir rasgos no declarados. |
| Coste | Consumo estimado por sesión útil, gasto observado y llamadas evitables. | Usar siempre el modelo más potente. |
| Bienestar | Sensación declarada de control y menor fricción para actuar. | Tiempo de permanencia en el chat o dependencia de sus consejos. |

La medida principal propuesta es **avance útil y sostenible en prioridades personales**, acompañada de evidencias separadas de aprendizaje, confianza y coste. No la reduciría inicialmente a una puntuación única y opaca.

## 15. Hoja de ruta basada en hitos, no en fechas inventadas

### Hito A — Decisiones y prototipo seguro

- Resolver las decisiones que condicionan plataforma, proveedor, privacidad y recordatorios.
- Diseñar los dos recorridos principales y probarlos con ejemplos ficticios.
- Definir permisos, estados de error y coste máximo aceptable.

**Salida:** sabemos qué construir, con qué límites y cómo comprobarlo. Todavía no se usa información sensible real.

### Hito B — Organizador personal fiable

- Completar captura de tareas, plan diario, recordatorios y revisión.
- Probar reinicios, reintentos, fechas ambiguas, cambios de zona horaria y fallos de conexión.
- Si se promete continuidad fuera de la laptop, validar el despliegue activo y el canal de avisos en tu teléfono.

**Salida:** puedes utilizar el recorrido diario sin depender de una conversación que simule acciones.

### Hito C — Tutor para un tema concreto

- Completar sesión, corrección, registro de errores y repaso posterior.
- Revisar ejercicios y respuestas con material de referencia.
- Probar explicaciones erróneas, respuestas parcialmente correctas y desacuerdo con el evaluador.

**Salida:** el tutor demuestra utilidad y sus límites en un ámbito definido, no una promesa de dominio universal.

### Hito D — Piloto conectado de dos semanas

- Vincular sesiones de estudio con el plan diario.
- Registrar fricciones, fallos, utilidad de avisos y consumo.
- Revisar juntos qué mantener, simplificar o retirar.

**Salida:** evidencia suficiente para elegir las siguientes mejoras, no obligación de implementar todo el backlog.

### Hito E — Una expansión cada vez

Elegir el módulo con mayor valor observado: inglés, calendario, biblioteca propia, hábitos u otro. No abrir simultáneamente todas las líneas de desarrollo.

## 16. Riesgos y decisiones de producto asociadas

| Riesgo | Decisión preventiva |
|---|---|
| Alcance demasiado grande | Mantener dos recorridos principales y posponer módulos independientes. |
| Tutor que enseña errores con seguridad | Material de referencia, ejercicios revisados, posibilidad de cuestionar y expresión explícita de incertidumbre. |
| Progreso exagerado | Evaluar con intervalos, intentos sin ayudas y problemas nuevos; las valoraciones de IA son evidencia limitada. |
| Recordatorios que parecen fiables pero no llegan | Infraestructura y canal probados, estados visibles y explicación de límites; no sustituir sistemas críticos. |
| Uso indebido de datos personales | Resolver condiciones del proveedor antes del uso real, minimizar datos y permitir control y exportación. |
| Costes inesperados | Medición, límites desde la app, reintentos acotados y funciones útiles sin IA. |
| Asistente invasivo o culpabilizador | Horarios de silencio, pausa global, tono configurable y ausencia de castigos por interrupciones. |
| Dependencia emocional o decisional | Mantener tu autonomía, fomentar contraste de recomendaciones y no presentar a Jarvis como sustituto de relaciones o profesionales. |
| Integraciones frágiles | Incorporar una por vez, permisos mínimos y comportamiento definido cuando el servicio externo falla. |
| Alojamiento gratuito insuficiente | Validar persistencia, disponibilidad y cuotas reales; no asumir que «gratis» garantiza ejecución continua. |
| Pérdida de información al sincronizar | Definir conflictos, respaldos y pruebas de restauración antes de ampliar acceso sin conexión. |
| Consejos físicos o emocionales de alto riesgo | Limitar alcance, no diagnosticar y orientar a apoyo profesional cuando corresponda. |

## 17. Mejoras que no priorizaría todavía

- Escucha permanente y activación por palabra clave.
- Control autónomo de tu ordenador o de cuentas externas.
- Enjambres de agentes o selección compleja de muchos modelos.
- Personalidad antropomórfica diseñada para generar dependencia.
- Gamificación agresiva, rankings o castigos por romper rachas.
- Diagnósticos médicos o psicológicos, prescripción de tratamientos o promesas de «volverte un genio».
- Ingesta masiva de información y búsquedas continuas sin un objetivo concreto.
- Funciones sociales, monetización y equipos antes de validar el uso personal.
- Un panel lleno de estadísticas sin acciones claras derivadas de ellas.

**No son prohibiciones permanentes:** salvo los límites de seguridad, son decisiones para proteger foco, coste y calidad. Algunas podrán reconsiderarse si existe una necesidad clara.

## 18. Siguiente decisión recomendada

Cerrar D01–D05 y escoger el primer tema de estudio de D07. Después, convertir F01–F17 en un backlog de implementación pequeño, con dependencias explícitas y pruebas por recorrido.

**Criterio final de Product Owner:** Jarvis mejora si te ayuda a actuar, aprender y decidir con más claridad; no si acumula más módulos, te manda más mensajes o te mantiene más tiempo conectado.
