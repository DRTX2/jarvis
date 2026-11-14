# Jarvis

Tu asistente personal en español que vive en tu PC: te recuerda las cosas a tiempo, te ayuda a estudiar con repasos que se adaptan a lo que olvidas y organiza tu día cuando se lo pides hablando. Tus datos se quedan en tu equipo.

## Qué hace

- **Recordatorios que suenan.** Escribe o dicta «recuérdame llamar a mamá el viernes a las 7» o «repasar derivadas todos los días a las 8». El aviso llega como notificación del sistema en tu PC y, si lo activas, en el móvil u otros navegadores, aunque la app esté cerrada. Desde el aviso marcas **Hecho** o lo pospones **10 minutos**. Las tareas pueden repetirse cada día, entre semana o cada semana.
- **Organízate hablando.** Crear, completar y reabrir tareas se aplica al instante y puedes **deshacerlo** con un clic. Borrar, editar o guardar datos sobre ti te lo pide confirmar.
- **Estudia con repaso adaptativo.** Cada pregunta tiene su propio ritmo (algoritmo FSRS): si la recuerdas, el siguiente repaso se aleja; si la olvidas, vuelve en 10 minutos. Jarvis te avisa una vez al día cuando hay preguntas por repasar y muestra la probabilidad estimada de que recuerdes cada una.
- **Tu día en 30 segundos.** Al abrir **Hoy** (y cada mañana a las 8 como aviso): qué te toca hoy, qué quedó atrasado, cuántas preguntas repasar y cuántos días faltan para tu meta. Se calcula al instante, sin IA.
- **Respuestas que se escriben en vivo.** En una conversación normal el texto empieza a aparecer en menos de 1 s; cuando pides una acción, Jarvis razona unos segundos antes para no equivocarse.
- **Voz privada:** el dictado se transcribe **en tu PC con Whisper** (`whisper-large-v3-turbo`): el audio no sale del equipo y funciona en Chrome, Edge, Firefox, Safari y el móvil. La grabación termina sola cuando dejas de hablar. Con el botón de ondas tienes **conversación manos libres**: hablas, Jarvis responde en voz alta y vuelve a escucharte. Di «para» para terminar. La primera vez descarga el modelo (~600 MB) en `data/models`.
- **Plan del día, objetivos y materiales propios**, en la pestaña **Hoy** y en **Estudiar**.

## Empezar

Necesitas Node.js 24 y, para la IA local, [Ollama](https://ollama.com) con una GPU de unos 8 GB.

```bash
sudo systemctl enable --now ollama   # una vez: Ollama arranca solo
ollama pull qwen3.5:9b   # una vez
npm ci
npm run dev              # abre http://127.0.0.1:5173
```

Sin GPU, crea un archivo `.env` con `AI_PROVIDER=demo` para probar sin IA, o usa la nube (más abajo). En **Mi perfil → Configura tu Jarvis** verás qué falta y el comando para arreglarlo.

### Que los avisos suenen siempre

Los avisos salen mientras Jarvis está encendido. Para que arranque solo al iniciar sesión (Linux con systemd, sin sudo):

```bash
npm run service:install   # luego abre http://127.0.0.1:3001
```

Después ve a **Mi perfil → Avisos en este dispositivo → Activar avisos** en cada navegador donde quieras recibirlos. En Brave hay que activar antes «Usar los servicios de Google para la mensajería push» (Configuración → Privacidad).

### Desde el móvil

Instala [Tailscale](https://tailscale.com) en el PC y en el móvil y luego:

```bash
JARVIS_ALLOWED_HOSTS=<tu-pc>.<tu-red>.ts.net npm start
tailscale serve --bg 3001
```

Abre la dirección `https://…ts.net` en el móvil, instálala como app y activa los avisos. **No abras el puerto 3001 a internet.**

### Nube opcional (Claude)

Para equipos sin GPU o preguntas difíciles. Necesitas una clave de API de [console.anthropic.com](https://console.anthropic.com) con saldo prepagado. **La suscripción Claude Pro de claude.ai no sirve:** la API se factura aparte. En `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
EXTERNAL_AI_TERMS_ACCEPTED=true
CLAUDE_MODEL=claude-haiku-5-5   # ≈0,001 USD por mensaje; claude-opus-5-5 ≈0,05 USD
```

Con la IA local activa, el botón ☁ del chat envía a la nube solo los mensajes que elijas. Con `AI_PROVIDER=claude` todo el chat usa la nube. `AI_MAX_DAILY_REQUESTS` limita los mensajes diarios (máximo 100). Todas las opciones están en `.env.example`.

## Tus datos

- Todo vive en `data/jarvis.sqlite`. Jarvis guarda una **copia automática diaria** en `data/backups/` (las últimas 7). Para restaurar, detén Jarvis y copia la que quieras sobre `data/jarvis.sqlite`. **Mi perfil → Exportar** descarga un JSON (todavía no hay importador).
- Sin analítica ni publicidad. Solo salen del equipo los mensajes que envíes a la nube y los avisos push, que viajan cifrados de extremo a extremo: el servicio push de tu navegador no puede leerlos.
- El servidor solo escucha en `127.0.0.1`. Con `tailscale serve`, cualquier dispositivo de tu red Tailscale puede abrir Jarvis: no hay inicio de sesión.

## Desarrollo

| Comando | Qué hace |
|---|---|
| `npm run dev` | API en :3001 y web en :5173, con recarga |
| `npm test` | Pruebas de la API (bases temporales; no tocan tus datos) |
| `npm run test:e2e` | Pruebas de navegador (requieren `npx playwright install chromium` una vez) |
| `npm run check` | Build, pruebas de API y de navegador |
| `npm start` | Versión compilada en :3001 (antes `npm run build`) |
| `npm run eval` | Evalúa con la IA real 40 mensajes con su acción esperada; informe en `docs/eval/` (requiere Ollama) |

Guía para trabajar con Claude Code: [CLAUDE.md](CLAUDE.md). Estado y siguiente paso: [CONTINUAR.md](CONTINUAR.md). Producto y mercado: [ROADMAP_PRODUCTO.md](ROADMAP_PRODUCTO.md) y [MERCADO_INICIAL.md](MERCADO_INICIAL.md). El detalle técnico de cada versión anterior está en [docs/historial-de-versiones.md](docs/historial-de-versiones.md).

Jarvis puede equivocarse. No sustituye asesoramiento médico, legal ni financiero.
