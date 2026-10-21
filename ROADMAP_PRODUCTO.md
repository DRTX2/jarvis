# Jarvis · Revisión de producto y hoja de ruta al mercado

**Rol:** Product Owner senior · **Fecha:** 21 de octubre de 2026 · **Versión revisada:** v0.2

## 1. Veredicto

Jarvis v0.1 tenía buena ingeniería (SQLite con migraciones, 57 pruebas de API, 42 de navegador, acciones siempre confirmadas) pero **no era un asistente**: el chat respondía frases fijas y la IA externa permitía 5 llamadas al día. Ningún usuario pagaría por eso, por bien hecho que esté.

v0.2 desbloquea el núcleo: **IA local real con acceso a tu contexto y capacidad de proponer acciones**. A partir de aquí el cuello de botella deja de ser técnico y pasa a ser de producto: velocidad percibida, proactividad y un motor de aprendizaje que demuestre resultados.

## 2. Posicionamiento propuesto

> **Jarvis es el asistente personal que vive en tu equipo: organiza tu día, te entrena a aprender con técnicas respaldadas por la ciencia y cuida el rendimiento de tus dispositivos, sin enviar tu vida a la nube.**

| Competidor | Qué hace mejor | Dónde gana Jarvis |
|---|---|---|
| ChatGPT / Gemini / Claude | Modelos más potentes, voz pulida | Privacidad total, contexto personal persistente, acciones sobre tus datos, sin suscripción |
| Motion / Reclaim / Todoist | Calendario y planificación automática | Aprendizaje con evidencia + conversación + equipo en un solo ciclo |
| Anki / Quizlet | Repetición espaciada madura | Genera práctica desde *tus* materiales y la conecta con tus objetivos y agenda |
| Herramientas de limpieza de PC | Acciones automáticas | Explica, prioriza y no toca nada sin permiso |

**Usuario inicial (beachhead):** estudiante o profesional técnico, hispanohablante, con PC con GPU (≥8 GB VRAM). Es un nicho, pero es exactamente quien valora privacidad y sabe instalar Ollama. Para crecer después hace falta un modo híbrido (ver §5).

## 3. Lo entregado en v0.2

| Capacidad | Estado | Límite conocido |
|---|---|---|
| Chat con IA local (Ollama, qwen3.5:9b) y contexto automático | ✅ | 3–15 s por respuesta, sin streaming |
| Acciones por chat → propuestas confirmables (crear, completar, reabrir, borrar, mover, recordar) | ✅ | Un modelo de 9B a veces se equivoca; la confirmación lo contiene |
| Estudio dinámico (generar preguntas, revisar razonamiento) con IA local | ✅ | Calidad limitada por el modelo; sin rúbrica de transferencia |
| Voz: dictado y lectura en voz alta | ✅ básico | Dictado solo Chrome/Edge y con audio procesado por el navegador |
| Estado del equipo con consejos | ✅ solo lectura | Lista de procesos solo en Linux |
| Móvil vía Tailscale + PWA instalable | ✅ documentado | Sin notificaciones push ni modo sin conexión |
| Modo híbrido y nube (Claude) con las mismas acciones confirmables | ✅ | Probado con respuestas simuladas de la API; falta una prueba con clave real |
| Panel «Configura tu Jarvis» (GPU, Ollama, modelo, nube) | ✅ | GPU solo NVIDIA |

## 4. Hoja de ruta por hitos

Cada hito termina con un criterio de salida medible. No se empieza el siguiente sin cumplirlo.

### H1 · «Se siente como Jarvis» (siguiente)
- **Streaming de respuestas** y voz manos libres (escuchar → responder → volver a escuchar).
- **Dictado local con Whisper** en la GPU: funciona en Firefox y móvil, y el audio no sale del equipo.
- **Briefing diario proactivo:** al abrir, «hoy tienes X, repasa Y, tu equipo está Z».
- **Notificaciones push** (PWA + service worker) para avisos con la app cerrada.
- *Salida:* p50 del primer token < 2 s; ≥ 90 % de propuestas aceptadas sin editar en 2 semanas de uso real.

### H2 · «Tutor que demuestra resultados»
- Repetición espaciada **FSRS** en lugar del calendario fijo 1-3-7-14-30.
- Mazos generados desde materiales propios, con citas comprobadas (ya existe la base).
- Evaluación de **transferencia** con rúbrica y desacuerdo del estudiante.
- Rutas por objetivo con prerrequisitos y mapa de lagunas.
- Módulos de **pensamiento**: resolución de problemas guiada (Pólya), modelado y diseño con diagramas Mermaid.
- *Salida:* recuperación sin ayudas ≥ 80 % a los 7 días en un tema real.

### H3 · «Hace las cosas por ti, con permiso»
- **Acciones de equipo con lista blanca y confirmación** (limpiar caché de paquetes, cerrar una app, liberar disco), con registro y deshacer cuando sea posible.
- Integraciones: Google Calendar, carpeta de notas Markdown (Obsidian), correo en solo lectura.
- Capa de permisos visible: qué puede leer, qué puede proponer, qué hizo.
- *Salida:* cero acciones sin confirmar; cada integración se puede revocar en un clic.

### H4 · «Producto instalable»
- App de escritorio (Tauri) que incluye el servidor, detecta o instala Ollama y elige el modelo según la VRAM.
- Asistente de inicio de 3 minutos, copias de seguridad automáticas, actualizaciones.
- Bienestar y entrenamiento físico con límites de seguridad (orientación general, sin diagnóstico).
- *Salida:* una persona no técnica lo instala y lo usa sin ayuda.

### H5 · «Mercado»
- Beta cerrada con 20–50 usuarios del nicho inicial; entrevistas y métricas.
- Política de privacidad, términos y revisión legal de protección de datos en los países de venta.
- *Salida:* retención a 4 semanas ≥ 40 % y ≥ 10 % dispuestos a pagar.

## 5. Modelo de negocio (hipótesis a validar en H5)

- **Gratis y local:** todo lo que corre en tu equipo.
- **Pro (≈ 4 USD/mes estudiante, ≈ 8 USD/mes general):** sincronización cifrada entre dispositivos, acceso móvil sin configurar Tailscale, nube incluida para equipos sin GPU. Precios, costos por usuario y validación en [MERCADO_INICIAL.md](MERCADO_INICIAL.md).

El modo híbrido es lo que abre el mercado más allá del nicho con GPU, sin renunciar a «local primero».

## 6. Métricas norte

| Métrica | Por qué |
|---|---|
| % de propuestas confirmadas sin editar | Fiabilidad de las acciones: la confianza es el producto |
| Recuperación sin ayudas a 7 y 30 días | Aprendizaje real, no tiempo de estudio |
| Prioridades del día completadas / planificadas | Utilidad de la planificación |
| p50 de latencia de respuesta | Sensación de «Jarvis» |
| Días activos por semana | Hábito, no adicción: no se optimiza tiempo en pantalla |

## 7. Lo que no haría todavía

- Ejecutar comandos libres o controlar el equipo de forma autónoma.
- Enjambres de agentes o varios modelos a la vez.
- Diagnósticos de salud física o mental, o promesas de «volverte un genio».
- Gamificación con castigos por romper rachas.

## 8. Decisiones que necesito del dueño del producto

1. ~~¿Primer mercado?~~ **Decidido (21/10/2026):** estudiantes y profesionales junior técnicos hispanohablantes; ver [MERCADO_INICIAL.md](MERCADO_INICIAL.md).
2. ~~¿Nube sí o no?~~ **Decidido (21/10/2026):** sí, híbrida y opcional, con Claude.
3. **¿Qué hito primero?** Recomiendo H1: hace que el producto *se sienta* como Jarvis, y sin eso nada más importa.
