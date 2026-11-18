# Continuar Jarvis

**Última sesión:** 14/11/2026 · **Versión:** v0.5 · **Esquema SQLite:** v9 · **Pruebas:** 82 unitarias, 50 e2e y evaluación de IA en 93 % · **Repositorio:** https://github.com/DRTX2/jarvis (privado)

## Para retomar (5 minutos)
1. **Ollama:** `sudo rm /usr/local/bin/ollama` (versión vieja y rota que tapa a la buena) y `sudo systemctl enable --now ollama`. Comprueba con `ollama list` que aparece `qwen3.5:9b`.
2. `npm ci` y `npx playwright install chromium` (el sistema limpia cachés).
3. `npm run check`: todo en verde antes de tocar nada.
4. `npm run dev` y abre http://127.0.0.1:5173.
5. `git push` funciona por HTTPS con la cuenta DRTX2 de `gh`, sin SSH.
6. Claude Code: `claude -c` en esta carpeta. Conversaciones y copia de la memoria en `docs/historial/` (índice en su README, fuera de git).

## Estado: H1 «se siente como Jarvis» terminado en código
| Versión | Qué trajo |
|---|---|
| v0.2 (21/10) | IA local, acciones desde el chat, voz del navegador, modo híbrido con Claude |
| v0.3 (14/11) | Recordatorios que suenan (escritorio y push cifrado), tareas repetidas, «Deshacer» en el chat, repaso FSRS |
| v0.4 (14/11) | Respuestas en streaming (<1 s en conversación), briefing diario, conversación por voz, copias diarias |
| v0.5 (14/11) | **Dictado local con Whisper** (el audio no sale del PC; Firefox y móvil) y **evaluación de la IA** (`npm run eval`): 78 % → 93 % tras arreglar el detector de intención (tildes) |

Mediciones reales en este PC (RTX 5050, `qwen3.5:9b`):
- Primer texto: 0,5–1,8 s en conversación y 6–10 s cuando hay acción.
- Whisper: unos 5 s por frase de 5 s; la primera vez, unos 16 s de carga.
- Aciertos de acciones: 93 % (`docs/eval/`).

## Pendiente de hacer tú
1. **Arreglar Ollama** (paso 1 de arriba).
2. **Copia de seguridad y servicio:** copia `data/jarvis.sqlite` (sigue en v4 y vacía) y ejecuta `npm run service:install`. Después activa los avisos en **Mi perfil** en cada navegador.
3. **Usarlo a diario 2 semanas** con una meta real. Es el criterio de salida de H1 que falta (≥ 90 % de acciones aceptadas en uso real) y lo que más información da.
4. **Claude real (opcional):** clave de console.anthropic.com con saldo; la suscripción Pro no sirve para la API.

## Decisiones abiertas
1. **Nube del plan Pro:** ¿`claude-haiku-5-5` incluido y Opus solo con clave propia?
2. **Núcleo abierto:** ¿se publica como código abierto?
3. **Siguiente entrega:** landing con lista de espera, arranque guiado «tengo una meta con fecha» o métricas de beta.
4. **Crítica pendiente** (barrera de instalación, medir aprendizaje, puntos técnicos): `docs/critica-2026-11-14.md`.

## Siguiente trabajo técnico recomendado
1. **Ampliar la evaluación** con frases de tu uso real (añádelas a `tests/eval/acciones.json`) y correrla 3 veces para separar fallos reales de variación del modelo.
2. **H2 «tutor que demuestra resultados»:** medir el recuerdo a 7 y 30 días, preguntas desde tus apuntes y rutas con prerrequisitos.
3. **Instalador** (H4, Tauri) antes de abrir la beta a personas no técnicas.
4. ~~**Streaming también con Claude**~~ hecho el 17/11: la nube transmite el texto como el modelo local, con respaldo a mitad de respuesta (`fallbacks`) y argumentos de herramientas en streaming validados con zod.

## Límites conocidos
- **Avisos:**
  - Solo salen con Jarvis encendido.
  - Push en el móvil requiere Tailscale y HTTPS.
  - En Brave hay que activar la mensajería push de Google.
  - Notificaciones de escritorio solo en Linux.
- **Tareas repetidas:**
  - Un cambio de horario desplaza el aviso 1 h.
  - La repetición no se cambia desde el chat.
- **Deshacer y FSRS:**
  - Deshacer un «completar» deja el registro del cierre.
  - FSRS usa los pesos por defecto.
- **Velocidad:**
  - Con acciones, el primer texto tarda 6–10 s.
  - Claude no transmite en vivo.
- **Precisión de la IA:**
  - El modelo local falla ~1 de cada 15 acciones por variación entre ejecuciones; si afirma algo que no hizo, Jarvis lo avisa.
  - A veces añade un recuerdo que no se pidió (es una propuesta: no se guarda sin confirmar).
- **Whisper:**
  - Corre en CPU (en CUDA falta cuDNN).
  - La primera transcripción descarga unos 600 MB.
  - Ocupa ~1 GB de RAM mientras está cargado y se libera tras 10 min sin uso.
  - `onnxruntime-node` pesa 548 MB en `node_modules`.
- **Voz:**
  - El modo conversación por voz no tiene prueba automática (no hay micrófono en las pruebas); el dictado se probó con un micrófono simulado.
- **Plataforma:**
  - GPU solo NVIDIA.
  - Sin inicio de sesión (con Tailscale entra cualquiera de tu red).
  - Sin telemetría para la beta.
