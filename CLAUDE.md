# Jarvis · guía para Claude Code

Asistente personal *local-first* en español: organiza el día, enseña con técnicas respaldadas por evidencia y vigila el equipo. La meta es venderlo. Responde al usuario en español.

Estado actual, decisiones pendientes y siguiente paso: @CONTINUAR.md

## Comandos
- `npm run dev`: API en :3001 (con `--watch`, lee `.env`) y Vite en :5173 (proxy `/api`).
- `npm test`: pruebas unitarias (`node --test server/*.test.mjs`).
- `npm run test:e2e`: Playwright. Levanta su propia API demo en :3101 con SQLite en memoria y Vite en :5174, en escritorio y Pixel 7. El primer test a veces falla por arranque en frío: repite antes de investigar.
- `npm run build`: `tsc --noEmit` y `vite build`.
- `npm run check`: build + unit + e2e. Córrelo antes de dar algo por terminado.
- `npm run eval`: evaluación de acciones con la IA real (40 casos en `tests/eval/acciones.json`, reloj fijo, base en memoria). Informe en `docs/eval/`. Córrelo antes y después de tocar el prompt, las herramientas o el modelo, y compara.
- `npm run service:install`: instala Jarvis como servicio systemd del usuario (avisos con la app cerrada). Arranca sobre `data/`: no lo ejecutes tú.
- IA real sin tocar datos del usuario: `PORT=3201 DATABASE_PATH=/tmp/jarvis-prueba.sqlite npm start` y luego `node scripts/probe-chat.mjs "recuérdame X mañana a las 8"`.

## Mapa
- `server/app.mjs`: rutas Express, elección de proveedor (`ollama` | `claude` | `gemini` | `demo`), hosts permitidos, cuota.
- `server/ai.mjs`: `ollamaChat`, `claudeChat` (SDK `@anthropic-ai/sdk`), `geminiReply`.
- `server/assistant.mjs`: prompt de Jarvis, herramientas `propose_*` (crear/completar/reabrir se aplican al instante con deshacer; borrar/editar/recuerdos son propuestas), contexto, `assistantReply` (dos pasadas cuando hay herramientas).
- `server/reminders.mjs`: avisos cada 30 s por escritorio (`notify-send`) y Web Push cifrado (`web-push`, claves VAPID en `settings`), posponer, tareas repetidas.
- `server/study.mjs`: repaso adaptativo FSRS-5 (estabilidad y dificultad por pregunta).
- `server/briefing.mjs`: «tu día en 30 segundos» por reglas (Hoy y aviso de las 8:00). `server/backup.mjs`: copia diaria `VACUUM INTO data/backups/`, últimas 7.
- `server/stt.mjs`: dictado local con Whisper (`@huggingface/transformers`, ONNX en CPU, modelo en `data/models`, se libera tras 10 min). Ruta `POST /api/transcribe` (PCM 16 bits mono 16 kHz). `src/localDictation.ts` graba y corta por silencio; si `health.stt` es null, el chat usa el dictado del navegador.
- Chat en streaming: `/api/chat` con `stream: true` responde NDJSON (`status`, `delta`, `reset`, `done`, `error`); `ollamaChat({ onDelta })` lee el stream de Ollama; `streamChat` en `useJarvis.ts` lo consume.
- `server/device.mjs`: memoria, CPU, disco, procesos y GPU (solo lectura).
- `server/store.mjs`, `server/planning-store.mjs`, `server/migrations.mjs`: SQLite (`node:sqlite`), esquema **v9**.
- `src/`: React 19 + TS. `useJarvis.ts` concentra las llamadas a la API; `components/` una vista por archivo.
- `tests/app.spec.ts`: e2e. `tests/support/server.mjs`: servidor de pruebas (demo, reloj fijo 2026-10-09).

## Reglas que no se rompen
- **No tocar `data/jarvis.sqlite`**: son datos reales del usuario. Toda migración conserva los datos y se prueba con una copia.
- Claves solo en `.env` (nunca en código ni en variables `VITE_*`). El servidor escucha solo en `127.0.0.1`; móvil solo vía `tailscale serve`.
- Acciones de la IA: solo lo reversible y de bajo riesgo (crear, completar, reabrir tareas) se aplica al instante y siempre con «Deshacer». Borrar, editar y guardar recuerdos son **propuestas** que el usuario confirma.
- La nube es opcional y se elige por mensaje; Jarvis nunca cambia solo a la nube.
- Interfaz, mensajes de error y nombres accesibles en español; los e2e buscan por rol y nombre.
- Sin dependencias nuevas sin motivo. Un atajo con límite conocido lleva `// shortcut: <límite>, <cuándo mejorarlo>`.
- Antes de tocar `claudeChat` o elegir modelo/precio de Claude, carga la skill `claude-api`: no uses la API de memoria.

## Trampas conocidas
- `qwen3.5:9b` solo hace *tool calls* fiables con `think: true` (3–15 s; ~27 s en frío). Con `think: false` las omite.
- Ollama devuelve 500 con XML de herramienta malformado; `ollamaChat` reintenta una vez.
- El modelo copia el formato de fecha del contexto: pásale ISO con segundos y offset (`localTime`).
- Imita los resúmenes del historial: `withoutSummary` los quita antes de reenviar.
- La intención se detecta sin tildes (`plain()`): «apúntame» no coincidía con `apunt`, así que el modelo no recibía las herramientas. El pasado («ya llamé») usa `PAST` con tilde.
- Sin intención de acción (regex `ACTION`), el modelo local recibe el mensaje **sin herramientas y sin razonar**: primer texto en ~1 s y no inventa tareas desde el contexto. Con intención: herramientas + `think: true` (~6–10 s). Si afirma «he creado…» sin llamar a la herramienta, `assistantReply` añade un aviso honesto.
- El estado del equipo solo entra al contexto si el mensaje habla del equipo (regex `DEVICE`); si no, el modelo lo menciona en cada respuesta.
- No se puede escribir en `data/` desde Claude Code (permisos): para probar Whisper usa `createTranscriber({ cacheDir: './node_modules/@huggingface/transformers/.cache' })` en un script temporal. Whisper en CUDA falla (falta cuDNN); en CPU tarda unos 5 s por frase.
- Para Ollama sin sudo en este PC: `OLLAMA_MODELS=<dir con blobs enlazados a /var/lib/ollama/blobs y manifests copiados> /usr/bin/ollama serve` (el `/usr/local/bin/ollama` está roto).
- `pgrep -f`/`pkill -f "node server/index.mjs"` dentro de un comando bash mata a la propia shell (exit 144): busca el PID con `ss -ltnp | grep :PUERTO`.
- Recomendaba cerrar su propio motor: `device.mjs` etiqueta ollama/llama-server como «IA local de Jarvis».
- Procesos solo en Linux; GPU solo NVIDIA (`nvidia-smi`).
- El Chromium de Playwright siempre deniega notificaciones: los e2e de avisos comprueban el panel, no el push real.
- Push en Brave requiere activar los servicios push de Google; en Linux los avisos de escritorio no dependen del navegador.

## Documentos
`README.md` (uso, corto), `docs/historial-de-versiones.md` (detalle técnico v0.1–v0.2), `docs/critica-2026-11-14.md` (crítica pendiente de tratar), `ROADMAP_PRODUCTO.md` (hitos H1–H5), `MERCADO_INICIAL.md` (mercado, precios, costos), `PLAN_JARVIS.md` (visión original), `EVALUACION_PRODUCTO_JARVIS.md`, `FUENTES_Y_BASE_CONOCIMIENTOS.md`. Conversaciones anteriores en `docs/historial/` (privado, fuera de git).

## Al cerrar una sesión de trabajo
Actualiza `CONTINUAR.md` (qué cambió, qué sigue) y, si cambió una decisión, `ROADMAP_PRODUCTO.md` o `MERCADO_INICIAL.md`. Guarda la conversación con `node scripts/transcript.mjs <sesión.jsonl> docs/historial/conversaciones/<fecha>-<tema>.md`, copia la memoria a `docs/historial/memoria-claude/` y actualiza el índice `docs/historial/README.md`.
