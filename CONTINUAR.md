# Continuar Jarvis

**Última sesión:** 14/11/2026 · **Versión:** v0.3 · **Esquema SQLite:** v9 · **Pruebas:** 73 unitarias y 48 e2e en verde · **Repositorio:** https://github.com/DRTX2/jarvis (privado)

## Para retomar (5 minutos)
1. `ollama serve` (si no corre como servicio) y `ollama list`: debe aparecer `qwen3.5:9b`.
2. `npm ci` y `npx playwright install chromium`: el sistema limpia cachés y el 14/11 faltaban los dos.
3. `npm run check`: todo en verde antes de tocar nada.
4. `npm run dev` y abre http://127.0.0.1:5173.
5. `git push` funciona por HTTPS con la cuenta DRTX2 de `gh` (sin SSH). Si cambias de cuenta activa en `gh`, el push falla.
6. Para seguir con Claude Code: `claude -c` en esta carpeta. Las conversaciones guardadas están en `docs/historial/`.

## Qué cambió el 14/11 (v0.3)
- **Recordatorios que suenan:** notificación de escritorio (`notify-send`) y Web Push cifrado a los navegadores suscritos, con «Hecho» y «En 10 min». También hay tareas repetidas (cada día, entre semana, cada semana) y un resumen si se acumulan varios avisos.
- **Organizarse hablando sin fricción:** crear, completar y reabrir desde el chat se aplica al instante con «Deshacer». Borrar, editar y recuerdos siguen como propuesta.
- **Repaso adaptativo FSRS-5** en lugar de intervalos fijos, con probabilidad de recuerdo por pregunta y un aviso diario de repasos (desde las 9:00).
- **Foco:** el panel «Mi equipo» pasó a Mi perfil, el README es corto y el detalle antiguo está en `docs/historial-de-versiones.md`.
- **Arreglos:** pruebas que dependían de `/tmp/opencode`, 3 vulnerabilidades y repositorio privado en GitHub.

## Pendiente de hacer tú
1. **Activar Jarvis siempre encendido:** copia `data/jarvis.sqlite` (está en v4 y vacía) y luego `npm run service:install`. Después, en **Mi perfil → Avisos en este dispositivo**, pulsa «Activar avisos» en cada navegador. En Brave, activa antes la mensajería push de Google.
2. **Usarlo a diario 2 semanas** con un examen o meta real. Es la prueba de producto que falta.
3. **Claude real:** la suscripción Pro de claude.ai no sirve para la API. Crea una cuenta en console.anthropic.com, carga saldo (5 USD bastan para meses con `claude-haiku-5-5`) y pon `ANTHROPIC_API_KEY` y `EXTERNAL_AI_TERMS_ACCEPTED=true` en `.env`.

## Decisiones tuyas que siguen abiertas
1. **Nube incluida en el plan Pro:** ¿`claude-haiku-5-5` (≈0,72 USD/mes por usuario intensivo) y Opus solo con clave propia?
2. **Núcleo abierto:** ¿se publica como código abierto lo que corre en el equipo?
3. **Siguiente entrega:** landing con lista de espera, arranque guiado «tengo una meta con fecha» o métricas de beta con consentimiento.
4. **Crítica pendiente** (puntos 5 a 7: barrera de instalación, medir aprendizaje, puntos técnicos): `docs/critica-2026-11-14.md`.

## Siguiente paso recomendado
Lo que queda de H1 «se siente como Jarvis», en este orden:
1. **Streaming de respuestas** (`stream: true` en `ollamaChat` y fragmentos al navegador). Meta: primer token en menos de 2 s.
2. **Voz manos libres** y **dictado local con Whisper**.
3. **Briefing diario** al abrir (los avisos de repaso ya existen; falta el resumen del día).

## Límites conocidos
- Los avisos solo salen con Jarvis encendido.
- Push en móvil requiere Tailscale y HTTPS.
- Las tareas repetidas suman días de 24 h: un cambio de horario desplaza el aviso 1 h.
- Cambiar la repetición desde el chat no está soportado (se hace en Hoy).
- Deshacer un «completar» deja el registro histórico del cierre.
- FSRS usa los pesos por defecto, no ajustados a la persona.
- Notificaciones de escritorio solo en Linux.
- Sin streaming, con respuestas de 3–15 s.
- Dictado solo en Chrome/Edge.
- GPU solo NVIDIA.
- Sin inicio de sesión (con Tailscale, entra cualquiera de tu red).
- Sin telemetría para la beta.
