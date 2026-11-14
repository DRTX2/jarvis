# Continuar Jarvis

**Última sesión:** 14/11/2026 (mantenimiento; v0.2 terminada el 21/10/2026) · **Versión:** v0.2 · **Esquema SQLite:** v8 · **Pruebas:** 68 unitarias y 46 e2e en verde

## Para retomar (5 minutos)
1. `ollama serve` (si no corre como servicio) y `ollama list`: debe aparecer `qwen3.5:9b`.
2. `npm ci` y `npx playwright install chromium`: el 14/11 la carpeta `node_modules/.bin` y el navegador de pruebas habían desaparecido (el sistema limpia cachés).
3. `npm run check`: debe quedar todo en verde antes de tocar nada.
4. `npm run dev` y abre http://127.0.0.1:5173. En **Mi perfil → Configura tu Jarvis** se ve qué falta.
5. Para seguir con Claude Code: `claude -c` en esta carpeta retoma la última conversación (Claude Code borra conversaciones de más de 30 días). La conversación completa está en `docs/historial/`.

## Dónde quedó
v0.2 está terminada: chat con IA local (Ollama) que usa tu contexto y crea propuestas confirmables (tareas, completar/reabrir/borrar/editar, recuerdos); estudio dinámico local; voz básica del navegador; panel «Mi equipo»; móvil vía Tailscale + PWA; modo híbrido con Claude por mensaje; panel «Configura tu Jarvis». Detalle en `README.md`.

Decidido el 21/10/2026: primer mercado = estudiantes y profesionales junior técnicos hispanohablantes (18+), primero con GPU (local) y después sin GPU (nube). Ver `MERCADO_INICIAL.md`.

## Decisiones tuyas que bloquean lo siguiente
1. **Nube incluida en el plan Pro:** ¿`claude-haiku-5-5` (≈0,72 USD/mes por usuario intensivo) y Opus solo con clave propia? Opus costaría ≈30 USD/mes.
2. **Núcleo abierto:** ¿se publica como código abierto lo que corre en el equipo?
3. **Siguiente entrega:** landing con lista de espera, arranque guiado «tengo una meta con fecha» o métricas de beta con consentimiento.

## Siguiente paso recomendado: H1 «se siente como Jarvis»
En este orden; cada punto se entrega y prueba por separado:
1. **Streaming de respuestas.** `ollamaChat` con `stream: true` y `/api/chat` enviando fragmentos al navegador. Meta: primer token en < 2 s. Ojo: hoy hay dos pasadas cuando hay herramientas; solo la última se transmite.
2. **Voz manos libres.** Escuchar → responder → volver a escuchar, con un botón claro para cortar.
3. **Dictado local con Whisper** (whisper.cpp o faster-whisper en la GPU) para que funcione en Firefox y móvil y el audio no salga del equipo.
4. **Briefing diario** al abrir: pendientes de hoy, repasos y estado del equipo.
5. **Notificaciones push** (service worker). Ojo: el push web pasa por los servidores de Google o Mozilla; decidir qué texto se envía.

Criterio de salida en `ROADMAP_PRODUCTO.md` §4. Después: H2 (FSRS, rutas, módulos de pensamiento), H3 (acciones en el equipo con permiso, calendario, Obsidian), H4 (instalador Tauri), H5 (beta y lanzamiento).

## Sin verificar
- **Tu base real** (`data/jarvis.sqlite`) sigue en el esquema v4 y vacía: se migrará a v8 la primera vez que arranques v0.2. Haz una copia antes.
- **Claude real:** solo se probó con respuestas simuladas. Añade `ANTHROPIC_API_KEY` y `EXTERNAL_AI_TERMS_ACCEPTED=true` en `.env` y pide una prueba real (cuesta centavos).

## Límites conocidos
Respuestas de 3–15 s sin streaming · dictado solo en Chrome/Edge (el audio lo procesa Google) · procesos solo en Linux, GPU solo NVIDIA · estudio dinámico siempre local en modo híbrido · sin avisos con la app cerrada ni modo sin conexión · sin telemetría (la beta necesitará una con consentimiento) · el modelo de 9B se equivoca a veces (la confirmación lo contiene) · falta un `apple-touch-icon` PNG para iOS.

## Archivos de esta sesión
- `CLAUDE.md`: instrucciones que Claude Code carga en cada sesión (comandos, reglas, trampas).
- `.claude/settings.json`: permisos del proyecto (pruebas sin preguntar; `.env` y `data/` protegidos).
- `docs/historial/`: la conversación en Markdown, el `.jsonl` original y una copia de la memoria de Claude. Está fuera de git porque es privado.
- `scripts/probe-chat.mjs`: prueba la IA real contra un servidor temporal. `scripts/transcript.mjs`: convierte una conversación `.jsonl` a Markdown.
