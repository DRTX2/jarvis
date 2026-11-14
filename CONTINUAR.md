# Continuar Jarvis

**Última sesión:** 14/11/2026 · **Versión:** v0.4 · **Esquema SQLite:** v9 · **Pruebas:** 76 unitarias y 50 e2e en verde · **Repositorio:** https://github.com/DRTX2/jarvis (privado)

## Para retomar (5 minutos)
1. **Ollama:** `sudo systemctl enable --now ollama` y `ollama list` (debe aparecer `qwen3.5:9b`). En este PC, `/usr/local/bin/ollama` es una versión vieja (0.32.3) que tapa a la buena (`/usr/bin/ollama`, 0.40.16) y falla con «llama-server binary not found»: bórrala con `sudo rm /usr/local/bin/ollama`.
2. `npm ci` y `npx playwright install chromium`: el sistema limpia cachés y el 14/11 faltaban los dos.
3. `npm run check`: todo en verde antes de tocar nada.
4. `npm run dev` y abre http://127.0.0.1:5173.
5. `git push` funciona por HTTPS con la cuenta DRTX2 de `gh` (sin SSH). Si cambias de cuenta activa en `gh`, el push falla.
6. Para seguir con Claude Code: `claude -c` en esta carpeta. Las conversaciones guardadas están en `docs/historial/`.

## Qué cambió el 14/11, segunda parte (v0.4)
- **Streaming:** las respuestas se escriben en vivo. Medido con IA real: primer texto en 0,5–1,8 s en conversación y unos 6–10 s cuando pides una acción, porque razona antes.
- **Briefing diario** en Hoy y como aviso a las 8:00: avisos de hoy, atrasados, repasos, próximo aviso y días para tu meta.
- **Conversación por voz manos libres** (botón de ondas en el chat; di «para» para terminar).
- **Copias automáticas diarias** en `data/backups/` (últimas 7).
- **Calidad con IA real:**
  - Sin intención de acción, el modelo no recibe herramientas: antes inventaba tareas.
  - Detecta «ya llamé / ya terminé».
  - Avisa si dice que guardó algo sin hacerlo.
  - El estado del equipo solo entra al contexto si preguntas por él.

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
1. **Usarlo a diario** (sigue siendo lo más importante).
2. **Dictado local con Whisper** (whisper.cpp en la GPU): voz en Firefox y móvil sin que el audio salga del equipo. Es lo único de H1 que falta.
3. **Evaluación de la IA:** un conjunto de 30–50 mensajes reales con la acción esperada, para medir el «% de acciones correctas» antes de cambiar prompts o modelo.
4. **Streaming también en la nube** (`client.messages.stream` en `claudeChat`); hoy Claude entrega la respuesta completa al final.

## Límites conocidos
- Los avisos solo salen con Jarvis encendido.
- Push en móvil requiere Tailscale y HTTPS.
- Las tareas repetidas suman días de 24 h: un cambio de horario desplaza el aviso 1 h.
- Cambiar la repetición desde el chat no está soportado (se hace en Hoy).
- Deshacer un «completar» deja el registro histórico del cierre.
- FSRS usa los pesos por defecto, no ajustados a la persona.
- Notificaciones de escritorio solo en Linux.
- Con acciones, el primer texto tarda unos 6–10 s (razonamiento). Claude no transmite en vivo.
- El modelo local a veces no llama a la herramienta (≈1 de cada 6 pedidos de acción en la prueba real): Jarvis lo avisa y hay que repetirlo.
- Conversación por voz solo en Chrome/Edge y sin probar automáticamente (Playwright no tiene micrófono).
- Dictado solo en Chrome/Edge.
- GPU solo NVIDIA.
- Sin inicio de sesión (con Tailscale, entra cualquiera de tu red).
- Sin telemetría para la beta.
