# Jarvis · Mercado inicial: decisión y plan de validación

**Rol:** Product Owner senior · **Fecha:** 21 de octubre de 2026 · **Estado:** decisión tomada, pendiente de validar con usuarios reales

## 1. Decisión

**Primer mercado:** estudiantes universitarios y profesionales junior de carreras técnicas (sistemas, software, electrónica, ciencias e ingenierías), hispanohablantes, mayores de 18 años, que preparan algo con fecha (parciales, certificaciones, entrevistas técnicas) mientras estudian o trabajan.

| Subsegmento | Equipo | Modo de Jarvis | Rol en la beta |
|---|---|---|---|
| **A · Con GPU** | NVIDIA con ≥ 8 GB de VRAM (portátil gamer o PC de desarrollo) | IA local: gratis y privada | **Primero.** El producto ya funciona y no nos cuesta nada por usuario |
| **B · Sin GPU** | Portátil estándar | Nube (Claude) o modo híbrido | **Segundo**, cuando los costos por usuario estén validados (§5) |

**Por qué este segmento:**
1. **Dolor frecuente y con fecha:** exámenes y entrevistas generan una urgencia real, un objetivo medible y un momento claro para empezar.
2. **Encaje con lo que ya existe:** el ciclo objetivo → plan → práctica → repaso es exactamente lo que Jarvis hace mejor.
3. **Puede instalarlo:** Ollama y una terminal no asustan a este perfil; el panel «Configura tu Jarvis» cubre el resto.
4. **Poco atendido en español:** las herramientas de estudio con IA más conocidas están pensadas en inglés y en la nube.
5. **Fundador dentro del segmento:** uso diario propio y acceso directo a comunidades.

**Fuera por ahora:** usuarios no técnicos, menores de edad, equipos o empresas, y quienes buscan principalmente salud o entrenamiento físico.

## 2. Perfil y trabajos por hacer

> **Andrés, 21 años, 5.º semestre de Ingeniería de Sistemas.** Portátil con RTX 4060. Trabaja medio tiempo. Usa ChatGPT gratis, Notion y Anki a ratos. Hace planes de estudio el domingo y los abandona el miércoles. Tiene un parcial de cálculo en tres semanas y una entrevista de prácticas en dos meses.

| Cuando… | quiero… | para… |
|---|---|---|
| tengo un parcial o una entrevista en X semanas | un plan realista y práctica que me demuestre lo que sé | no llegar a estudiar la noche anterior |
| estoy saturado de pendientes | decir en una frase qué hacer y que se organice solo | dejar de perder tiempo planificando |
| estudio con IA | que me pregunte antes de darme la respuesta | aprender de verdad y no solo copiar |
| mi portátil va lento | saber qué cerrar o limpiar sin romper nada | seguir trabajando |

## 3. Propuesta de valor y mensaje

**Titular:** *Tu Jarvis personal para estudiar y organizarte. Corre en tu PC: gratis y privado.*

1. **Aprende con ciencia:** práctica de recuperación, repetición espaciada y técnica Feynman, desde tus propios apuntes.
2. **Organízate hablando:** «recuérdame repasar derivadas mañana a las 8» → propuesta lista para confirmar.
3. **Tu equipo al 100 %:** qué consume memoria y CPU, y qué hacer al respecto.

**Por qué cambiarían:**

| Usan hoy | Qué les falta | Qué ofrece Jarvis |
|---|---|---|
| ChatGPT / Gemini gratis | No recuerdan su plan ni les hacen seguimiento | Memoria, agenda y repasos conectados |
| Notion / Todoist | Todo es manual | Captura y propuestas desde el chat |
| Anki | Crear tarjetas cuesta; no hay plan | Preguntas generadas desde sus materiales, unidas a un objetivo |
| Apps de estudio con IA | En inglés, en la nube y con suscripción | En español, local y gratis en su núcleo |

## 4. Precio (hipótesis a validar en entrevistas)

| Plan | Precio | Incluye |
|---|---|---|
| **Local** | Gratis | Todo lo que corre en su equipo |
| **Tu clave** | Gratis | Modo híbrido o nube con su propia clave de Anthropic (paga él directamente) |
| **Pro estudiante** | ≈ 4 USD/mes | Nube incluida con límite, móvil sin configurar Tailscale, sincronización |
| **Pro** | ≈ 8 USD/mes | Lo anterior con límites más altos |

Validar con las cuatro preguntas de Van Westendorp (§7). El precio en Latinoamérica debe rondar lo que cuesta una suscripción de streaming.

## 5. Costos de la nube por usuario (estimación)

Supuestos por mensaje con nube: ~6.500 tokens de entrada (instrucciones, herramientas, contexto, historial y segunda pasada si hay acciones) y ~1.100 de salida (incluido el razonamiento, que se factura como salida). Uso intensivo: 20 mensajes al día, unos 600 al mes.

| Modelo | Costo por mensaje | 600 mensajes/mes | ¿Cabe en 4 USD? |
|---|---|---|---|
| `claude-opus-5-5` ($4/$20 por millón) | ≈ 0,05 USD | ≈ 30 USD | No |
| `claude-haiku-5-5` ($0,10/$0,50 por millón) | ≈ 0,0012 USD | ≈ 0,72 USD | Sí, con margen |

**Implicación:** el plan Pro solo es viable si la nube *incluida* usa `claude-haiku-5-5` y Opus queda para quien trae su clave (o un modo experto con límite estricto). Hoy el código usa `claude-opus-5-5` por defecto porque, en el modo «Tu clave», paga el propio usuario y lo puede cambiar en `CLAUDE_MODEL`. Hay que medir el consumo real en la beta antes de fijar precios.

## 6. Canales

1. **GitHub con el núcleo local abierto:** credibilidad técnica y distribución en este segmento.
2. **Vídeos cortos de demostración** (TikTok, Reels, Shorts y YouTube en español): «le hablo a mi PC y me organiza el parcial». Voz y «Jarvis» son muy demostrables.
3. **Comunidades:** servidores de Discord de programación en español, subreddits hispanohablantes de programación, X y LinkedIn tech.
4. **Universidades:** semilleros de investigación, ramas estudiantiles IEEE/ACM y monitores de cursos.

## 7. Plan de validación (6 semanas)

| Semanas | Actividad | Meta |
|---|---|---|
| 1–2 | 12–15 entrevistas de problema + landing con lista de espera | 100 registros; ≥ 20 % de visitas desde comunidades se registran |
| 3–4 | Beta cerrada: 20 personas (12 con GPU, 8 sin GPU usando su clave o una nuestra con Haiku) | ≥ 70 % se activa el primer día |
| 5–6 | Medición y entrevistas de salida | Ver criterios abajo |

**Activación («momento ajá»):** el primer día, la persona confirma una propuesta creada desde el chat **y** completa una sesión de estudio.

**Criterios para seguir:**

| Señal | Seguir | Replantear |
|---|---|---|
| Retención a 4 semanas | ≥ 40 % | < 20 % |
| Propuestas confirmadas sin editar | ≥ 80 % | < 60 % |
| Recuperación sin ayudas a 7 días | ≥ 70 % | < 50 % |
| Dispuestos a pagar ≥ 4 USD/mes | ≥ 10 % | < 5 % → núcleo abierto y otro modelo de ingresos |

### Filtro para entrevistas
Mayor de 18 años, carrera técnica o perfil junior, algo importante que preparar en las próximas 6 semanas y habla hispana. Anotar equipo y GPU.

### Guion de entrevista (sin presentar el producto)
1. Cuéntame la última vez que preparaste un examen o una entrevista importante. ¿Cómo te organizaste?
2. ¿Qué fue lo más difícil? ¿Qué hiciste para resolverlo?
3. ¿Qué herramientas usas hoy para estudiar y organizarte? ¿Pagas por alguna? ¿Cuánto?
4. ¿Cuándo fue la última vez que abandonaste un plan de estudio? ¿Qué pasó?
5. ¿Usas IA para estudiar? ¿Para qué exactamente? ¿Qué no te convence?
6. ¿Hay algo que no le contarías a ChatGPT? ¿Por qué?
7. Si mañana desapareciera tu herramienta principal, ¿qué harías?
8. Precio: ¿a partir de qué precio te parecería tan barato que dudarías de la calidad? ¿Barato pero razonable? ¿Caro pero lo pagarías? ¿Demasiado caro?
9. ¿Te puedo avisar cuando abra la beta? *(un «sí» con su correo vale más que un «me encanta»)*

## 8. Implicaciones para el producto (en orden)

1. ✅ **Panel «Configura tu Jarvis»**: detecta GPU, Ollama, modelo y nube, y da el comando exacto que falta. Hecho en esta iteración.
2. **Onboarding «tengo una meta con fecha»**: objetivo → plan → primera sesión en menos de 10 minutos.
3. **Métricas de beta con consentimiento**: hoy no hay analítica (es una promesa del producto). Para medir la beta hace falta un registro local, opt-in y exportable.
4. **Landing con lista de espera.**
5. **Nube incluida con `claude-haiku-5-5`** y límites por plan, si el §5 se confirma.
6. **Instalador** (H4) antes de abrir el subsegmento B a personas menos técnicas.

## 9. Riesgos del mercado elegido

| Riesgo | Mitigación |
|---|---|
| Pocas personas con GPU suficiente | Modo híbrido y nube con Haiku para el subsegmento B |
| Las grandes plataformas añaden modos de estudio | Diferenciarse en privacidad local, seguimiento del plan y español |
| Costo de nube mayor que el precio | Haiku por defecto en el plan incluido, límites diarios y medición desde la beta |
| Menores en el público universitario | Beta solo para mayores de 18 |
| Datos personales | Política de privacidad y consentimiento conforme a la ley del país donde operes (por ejemplo, LOPDP en Ecuador, Ley 1581 en Colombia, LFPDPPP en México o RGPD en España) |

## 10. Decisiones que siguen abiertas

1. **Precio y nube incluida:** ¿aceptas Haiku 5.5 como modelo de la nube incluida y Opus solo con tu clave?
2. **Núcleo abierto:** ¿publicamos el núcleo local como código abierto para ganar distribución?
3. **Siguiente entrega:** ¿landing con lista de espera, onboarding «meta con fecha» o métricas de beta?
