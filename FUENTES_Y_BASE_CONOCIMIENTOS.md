# Fuentes para Jarvis: criterio y siguientes entregas

## Alcance de esta entrega

Primero se redujo fricción: captura rápida, calendario de avisos, borradores por pestaña y revisión de cambios. Desde v8 la biblioteca local se conecta a objetivos, rutas y generación de ejercicios con fuentes seleccionadas. **No es todavía recuperación semántica (RAG), importación de vaults ni un conector web.**

En Estudiar → Aportar y consultar mis materiales puedes seleccionar un `.md`/`.txt`, pegar texto y registrar un enlace con procedencia. Seleccionar prepara una vista editable; solo Guardar material revisado lo incorpora a SQLite. No hay llamadas externas ni lectura automática de carpetas. El contenido se trata como texto, no como instrucciones o código.

## Notas personales

Se revisó únicamente la estructura de `~/Desktop/notes`: hay temas de programación, arquitectura, .NET, DevOps, testing, seguridad y recursos de aprendizaje, junto con carpetas privadas. No se leyó ni importó el contenido del vault y no se modificó ningún archivo externo.

Estrategia recomendada:

1. Aportar una selección pequeña de notas técnicas y corregir su procedencia.
2. Añadir después importación por carpeta seleccionada con previsualización, exclusiones y aprobación por archivo.
3. Excluir por defecto carpetas privadas, diarios, registros de trabajo, `.git`, `.obsidian`, copias y adjuntos; ninguna exclusión garantiza por sí sola que una nota técnica no contenga secretos.
4. Detectar duplicados por huella de contenido y conservar versiones sin sobrescribir el original.
5. Ofrecer eliminación e indicar qué copias exportadas pueden subsistir.

## Fuentes propuestas (sin conectores activados)

| Fuente | Utilidad | Tratamiento |
|---|---|---|
| Documentación oficial de lenguajes y herramientas | Semántica, APIs, ejemplos y cambios de versión | Preferente; guardar URL, versión y fecha de consulta. |
| Microsoft Learn / Azure / .NET | C#, nube y herramientas | Referencia oficial; diferenciar producto y versión. |
| Documentación AWS | Servicios y operación en nube | Referencia oficial; distinguir región, límites y costes. |
| roadmap.sh | Orientación y mapa de habilidades | Guía de ruta, no prueba de dominio ni fuente única. |
| Stack Overflow | Casos concretos y errores | Material comunitario: revisar fecha, versiones, contexto y atribución. |
| Reddit | Experiencias y alternativas | Opiniones y pistas para investigar, no autoridad técnica. |
| C# Corner | Tutoriales y ejemplos | Fuente secundaria; contrastar con documentación y ejecución segura de ejemplos. |
| Write & Improve | Práctica de escritura en inglés | Fase del tutor de inglés; no asumir que permite API o importación automática. |
| Notas propias | Contexto personal y experiencia | Material aportado, revisable y potencialmente desactualizado. |

No se ha verificado aquí la disponibilidad actual de APIs, licencias, condiciones de extracción o permisos de estas plataformas. Antes de automatizar: revisar esos puntos; no sortear autenticación, restricciones o límites. La entrada manual permite empezar sin prometer integraciones inexistentes.

## Próximo ciclo de producto

Objetivo concreto → ruta editable → material seleccionado → práctica → evidencia → ajuste del plan.

La vinculación manual de materiales y preguntas a objetivos, la selección explícita de extractos y su consentimiento están implementados en v8. La generación con fuentes valida citas literales y conserva las instantáneas usadas; no valida que la interpretación sea verdadera. Queda pendiente seleccionar pasajes relevantes de documentos largos, evaluar transferencia con evidencia, permitir impugnación estructurada y adaptar la ruta a resultados. No convertir automáticamente una respuesta comunitaria en verdad ni el contenido de una nota en una orden ejecutable.

No es necesario empezar con embeddings, múltiples agentes o una base vectorial. Primero validar selección y búsqueda local, permisos, trazabilidad y utilidad real. Mantener la cuota gratuita y no añadir proveedores pagos ni tareas externas en segundo plano.
