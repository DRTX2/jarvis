# Jarvis · guía para Claude Code

Asistente personal *local-first* en español: organiza el día, enseña con técnicas respaldadas por evidencia y vigila el equipo. La meta es venderlo. Responde al usuario en español.

Estado actual, decisiones pendientes y siguiente paso: @CONTINUAR.md

## Comandos
- `npm run dev`: API en :3001 (con `--watch`, lee `.env`) y Vite en :5173 (proxy `/api`).
- `npm test`: pruebas unitarias (`node --test server/*.test.mjs`).
- `npm run test:e2e`: Playwright. Levanta su propia API demo en :3101 con SQLite en memoria y Vite en :5174, en escritorio y Pixel 7. El primer test a veces falla por arranque en frío: repite antes de investigar.
- `npm run build`: `tsc --noEmit` y `vite build`.
- `npm run check`: build + unit + e2e. Córrelo antes de dar algo por terminado.
- IA real sin tocar datos del usuario: `PORT=3201 DATABASE_PATH=/tmp/jarvis-prueba.sqlite npm start` y luego `node scripts/probe-chat.mjs "recuérdame X mañana a las 8"`.

## Mapa
- `server/app.mjs`: rutas Express, elección de proveedor (`ollama` | `claude` | `gemini` | `demo`), hosts permitidos, cuota.
- `server/ai.mjs`: `ollamaChat`, `claudeChat` (SDK `@anthropic-ai/sdk`), `geminiReply`.
- `server/assistant.mjs`: prompt de Jarvis, herramientas `propose_*`, contexto, `assistantReply` (dos pasadas cuando hay herramientas).
- `server/device.mjs`: memoria, CPU, disco, procesos y GPU (solo lectura).
- `server/store.mjs`, `server/planning-store.mjs`, `server/migrations.mjs`: SQLite (`node:sqlite`), esquema **v8**.
- `src/`: React 19 + TS. `useJarvis.ts` concentra las llamadas a la API; `components/` una vista por archivo.
- `tests/app.spec.ts`: e2e. `tests/support/server.mjs`: servidor de pruebas (demo, reloj fijo 2026-10-09).

## Reglas que no se rompen
- **No tocar `data/jarvis.sqlite`**: son datos reales del usuario. Toda migración conserva los datos y se prueba con una copia.
- Claves solo en `.env` (nunca en código ni en variables `VITE_*`). El servidor escucha solo en `127.0.0.1`; móvil solo vía `tailscale serve`.
- Toda acción de la IA es una **propuesta** que el usuario confirma. Nada se guarda sin su clic.
- La nube es opcional y se elige por mensaje; Jarvis nunca cambia solo a la nube.
- Interfaz, mensajes de error y nombres accesibles en español; los e2e buscan por rol y nombre.
- Sin dependencias nuevas sin motivo. Un atajo con límite conocido lleva `// shortcut: <límite>, <cuándo mejorarlo>`.
- Antes de tocar `claudeChat` o elegir modelo/precio de Claude, carga la skill `claude-api`: no uses la API de memoria.

## Trampas conocidas
- `qwen3.5:9b` solo hace *tool calls* fiables con `think: true` (3–15 s; ~27 s en frío). Con `think: false` las omite.
- Ollama devuelve 500 con XML de herramienta malformado; `ollamaChat` reintenta una vez.
- El modelo copia el formato de fecha del contexto: pásale ISO con segundos y offset (`localTime`).
- Imita los resúmenes del historial: `withoutSummary` los quita antes de reenviar.
- Recomendaba cerrar su propio motor: `device.mjs` etiqueta ollama/llama-server como «IA local de Jarvis».
- Procesos solo en Linux; GPU solo NVIDIA (`nvidia-smi`).

## Documentos
`README.md` (uso), `ROADMAP_PRODUCTO.md` (hitos H1–H5), `MERCADO_INICIAL.md` (mercado, precios, costos), `PLAN_JARVIS.md` (visión original), `EVALUACION_PRODUCTO_JARVIS.md`, `FUENTES_Y_BASE_CONOCIMIENTOS.md`. Conversaciones anteriores en `docs/historial/` (privado, fuera de git).

## Al cerrar una sesión de trabajo
Actualiza `CONTINUAR.md` (qué cambió, qué sigue) y, si cambió una decisión, `ROADMAP_PRODUCTO.md` o `MERCADO_INICIAL.md`. Para guardar la conversación: `node scripts/transcript.mjs <sesión.jsonl> docs/historial/<fecha>-<tema>.md`.
