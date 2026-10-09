# Estimador de Propuestas Comerciales — Plan (hackatón, 6 h)

Un "NotebookLM" para preventa: cada oportunidad es un **notebook** donde se cargan fuentes (brief, transcripciones, PDFs), se chatea sobre ellas con citas y se generan **propuestas de esfuerzo** versionadas, calibradas con los proyectos pasados del equipo.

## 1. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Front | React + TypeScript (Vite), TanStack Query, Tailwind + shadcn/ui |
| Back | NestJS + Prisma + PostgreSQL 16 con **pgvector** (`pgvector/pgvector:pg16` en Docker) |
| LLM | OpenRouter, solo modelos `:free`. Principal: `google/gemma-4-31b-it:free` (soporta JSON + tools). Fallback: `nvidia/nemotron-3-super-120b-a12b:free`. Configurable por `.env` |
| Embeddings | **Locales** con `@huggingface/transformers` (`Xenova/multilingual-e5-small`, 384 dims). Gratis, sin rate limit, buen español. Alternativa: `liquid/lfm-2.5-embedding-350m:free` en OpenRouter (consume cuota) |
| Roles (fijos) | `PM`, `UX`, `FRONTEND`, `BACKEND`, `QA` |
| Seniority (fijo) | `JR`, `SSR`, `SR` |
| Salida | Solo esfuerzo (horas) y tiempo (jornadas / días hábiles). Sin costos |
| Histórico | 2 proyectos pasados ficticios en `seed/`. El 3.º se crea en vivo en la demo |

> ⚠️ **Rate limits de los modelos free** (verificar en la cuenta): ~20 req/min y un tope diario bajo si la cuenta no tiene créditos cargados. Por eso: embeddings locales, una sola llamada al LLM para generar la propuesta, y nunca usar el LLM para hacer cuentas. Los modelos free pueden usar los prompts para entrenamiento: está bien para la data ficticia.

## 2. Arquitectura

```
apps/web  (React)                        apps/api  (NestJS)
 ├─ Notebooks (lista)                     ├─ notebooks      CRUD
 ├─ Notebook                              ├─ sources        upload → extracción → chunking → embeddings
 │   ├─ panel Fuentes (upload/estado)     ├─ chat           RAG: top-k chunks (+ histórico) → LLM → respuesta con citas
 │   ├─ panel Chat (con citas)            ├─ proposals      generar (LLM, JSON) → validar (Zod) → calcular (código) → versionar
 │   └─ panel Propuestas (versiones,      ├─ estimation     motor determinístico (horas → jornadas FT/PT, duración)
 │       ★ formal, editor de equipo)      ├─ llm            único punto de acceso a OpenRouter (retry + fallback de modelo)
 └─ Histórico (proyectos cerrados)        └─ embeddings     transformers.js local
                                          PostgreSQL + pgvector
```

**Ingesta por tipo de fuente**
- `.md` / `.txt` / texto pegado → directo.
- `.pdf` → `pdf-parse` (guardar el nro. de página en la metadata del chunk).
- `.docx` → `mammoth`.
- Video/audio → **stretch goal**. Opción A: `gemma-4` / `nemotron-omni` (free, aceptan video/audio) para transcribir. Opción B: Whisper local con transformers.js. Para la demo, la "reunión de kickoff" ya viene como transcripción con timestamps.
- Chunking: ~800 tokens con 100 de solapamiento, respetando títulos de markdown.
- Procesamiento asíncrono simple: `Source.status = PENDING | PROCESSING | READY | ERROR` y el front hace polling. Sin colas.

## 3. Modelo de datos (Prisma, borrador)

```
Notebook         id, name, client, industry, status (ACTIVE | CLOSED), createdAt
Source           id, notebookId, type (TEXT|PDF|DOCX|VIDEO), filename, status, rawText
Chunk            id, sourceId, notebookId, content, embedding vector(384), meta jsonb (página/timestamp/título)
ChatMessage      id, notebookId, role (USER|ASSISTANT), content, citations jsonb
Proposal         id, notebookId, version, isFormal, summary, assumptions[], outOfScope[], risks[], openQuestions[],
                 pmOverheadPct, contingencyPct, createdAt
ProposalModule   id, proposalId, name, description, complexity (LOW|MEDIUM|HIGH), confidence (LOW|MEDIUM|HIGH),
                 estimatedHours jsonb {UX,FRONTEND,BACKEND,QA}, actualHours jsonb?, analogies jsonb, sourceChunkIds[]
TeamMember       id, proposalId, role, seniority, count, dedication (FT|PT)
```

- **El histórico no es una tabla aparte.** Son notebooks `CLOSED` cuya propuesta formal tiene `actualHours` cargadas. Así se reusan las mismas pantallas y el mismo RAG.
- Invariante: un notebook tiene **como máximo una** propuesta `isFormal = true` (se valida en una transacción).
- Seed: `prisma/seed.ts` lee `seed/*/estimacion.json` (notebook + propuesta formal + horas reales) y carga los `.md` como fuentes.

## 4. Motor de estimación (código, no LLM)

Convención: **todas las horas se expresan en "horas equivalentes Ssr"**.

| Seniority | Factor |
|---|---|
| JR | 1.3 |
| SSR | 1.0 |
| SR | 0.8 |

- **Jornadas de un módulo**: `jornadasFT = horas / 8`, `jornadasPT = horas / 4`.
- **Capacidad diaria de una persona** = `horasDía(FT=8, PT=4) / factor(seniority)`.
- **Días por rol** = `horasRol / Σ capacidad de ese rol`.
- **Duración del proyecto (días hábiles)** = `max(días de UX, FRONTEND, BACKEND, QA) × (1 + contingencia)`. Los roles trabajan en paralelo.
- **PM** = `pmOverheadPct` (default 15 %) sobre las horas de desarrollo y acompaña toda la duración.
- **Total** = horas dev + PM + contingencia (default 10 % sobre dev + PM). Todo redondeado al entero.
- La UI muestra **dos escenarios**: el equipo editado y el "todo FT vs. todo PT" del mismo equipo.
- Editar el equipo **recalcula al instante sin llamar al LLM**.

## 5. Generación de la propuesta (flujo con LLM)

1. **Recuperar contexto**: los top-k chunks del notebook más las propuestas formales del histórico (módulos con horas estimadas y reales, y las lecciones aprendidas).
2. **Una llamada al LLM** con `response_format: json_object`. Debe devolver: módulos `{name, description, complexity, confidence, estimatedHours por rol, analogies[{project, module, estimated, actual}], sourceChunkIds}`, más supuestos, fuera de alcance, riesgos, preguntas abiertas y un equipo sugerido.
3. **Validar con Zod**. Si falla, reintentar una vez pasando el error de validación; si vuelve a fallar, usar el modelo de fallback.
4. **Calcular** con el motor (sección 4) y **persistir** como una nueva versión.
5. **Reglas en el prompt** (salen de las lecciones del histórico): integraciones con terceros o legacy tienen complejidad mínima `MEDIUM` y se calibran con el ratio real/estimado de los proyectos pasados; no inventar módulos sin una fuente que los respalde; toda ambigüedad va a `openQuestions`.

**Chat**: RAG sobre los chunks del notebook (más el histórico si la pregunta es comparativa), con citas `[n]` que apuntan a la fuente y la página o timestamp.

## 6. API (NestJS)

```
POST   /notebooks                     GET /notebooks?status=   GET /notebooks/:id
POST   /notebooks/:id/sources         (multipart o texto)      GET /notebooks/:id/sources
DELETE /sources/:id
POST   /notebooks/:id/chat            { message } → { answer, citations }
GET    /notebooks/:id/chat
POST   /notebooks/:id/proposals/generate        → nueva versión
GET    /notebooks/:id/proposals                 (historial)
PATCH  /proposals/:id/team            → recalcula
PATCH  /proposals/:id/modules/:moduleId
POST   /proposals/:id/formal          → marca como formal (desmarca la anterior)
GET    /proposals/:id/export.md       (stretch: PDF)
```

## 7. Plan de 6 horas

| Hora | Backend | Frontend | IA / datos |
|---|---|---|---|
| 0:00–0:45 | Monorepo, Docker con pgvector, Prisma schema + migración | Vite + shadcn, layout de 3 paneles, router | Probar la API key de OpenRouter con los 2 modelos; probar embeddings locales |
| 0:45–2:00 | Ingesta (md/pdf/docx), chunking, embeddings, búsqueda vectorial | Lista de notebooks, panel Fuentes con upload y estados | Seed script con `seed/` |
| 2:00–3:15 | Chat RAG con citas; módulo `llm` con retry y fallback | Panel Chat con citas clickeables | Prompt del chat y ajuste de top-k |
| 3:15–4:30 | Generar propuesta (prompt + Zod) y motor de estimación con tests | Panel Propuestas: tabla de módulos, FT/PT, equipo editable | Prompt de estimación calibrado contra el histórico |
| 4:30–5:15 | Versionado, marcar formal, export a markdown | Historial de versiones, ★ formal, vista de analogías | Ensayar con el proyecto 3 |
| 5:15–6:00 | **Freeze**: arreglar bugs | Pulido visual | Guion de la demo y ensayo (2 veces) |

**Si el tiempo aprieta, recortar en este orden**: export → edición de módulos → chat sobre el histórico → video.

## 8. Guion de demo (3–4 min)

1. Mostrar el histórico: 2 proyectos cerrados, con estimado vs. real y lecciones aprendidas.
2. Crear el notebook del proyecto 3 y cargar su brief y la transcripción del kickoff.
3. Chat: "¿Qué integraciones con terceros menciona el cliente?" → respuesta con citas.
4. Generar la propuesta: módulos, horas por rol, jornadas FT/PT, duración, y analogías del tipo *"Notificaciones: 76 h estimadas en TurnoFácil, 104 h reales"*.
5. Cambiar el equipo (por ejemplo, sumar un BE Jr o pasar QA a FT) y ver cómo se recalcula al instante.
6. Regenerar o editar, marcar como formal, mostrar el historial de versiones y exportar.

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Rate limit o caída del modelo free | Fallback de modelo, cachear la última propuesta, grabar un video de backup de la demo |
| JSON inválido de modelos chicos | Zod + 1 reintento con el error + fallback |
| Horas "inventadas" por el LLM | Analogías obligatorias del histórico; los cálculos los hace el código |
| Primera carga lenta del modelo de embeddings | Precargarlo al iniciar la API (`onModuleInit`) |

## 10. Pestaña "Módulos identificados" (agregada)

- **Diagrama C4 nivel 2** con los módulos dentro de cada contenedor (vista técnica y funcional a la vez), actores, sistemas externos y relaciones. Interactivo (React Flow): clic en un módulo → panel con horas, analogías, dependencias y **los fragmentos de las fuentes que lo originaron**.
- Codificación visual: color por complejidad, borde punteado si la confianza es baja, barra según horas, ícono en integraciones externas, **overlay de riesgo histórico** (analogía con desvío > 20 %; en proyectos cerrados, su propio desvío real).
- **Cobertura y trazabilidad**: oraciones de las fuentes sin módulo similar (embeddings locales, umbral 0,86) y matriz módulo × fuente.
- **Comparar versiones**: módulos nuevos, eliminados, renombrados o modificados y deltas de horas y duración. También se marcan sobre el diagrama.
- **Export**: PNG del diagrama y C4 en Mermaid (también incluido en el export Markdown).
- La arquitectura sale de la misma llamada al LLM que genera la propuesta, así que no gasta cuota extra.

## 11. Próximo entregable

- **Dependencias y fases**: sugerir MVP / fase 2 a partir de las dependencias entre módulos y mostrar un cronograma tipo Gantt (patrón ya previsto en el Flock Design System).

## 12. Tres opciones por oportunidad (agregado)

Cada generación (versión) produce **un catálogo de módulos** y **tres opciones** para que el cliente elija:

| Opción | Regla (código, no LLM) |
|---|---|
| **MVP** | Solo módulos `MUST`, en su versión reducida si la tienen |
| **Equilibrada** | `MUST` + los `SHOULD` que entran en la **fecha objetivo** (días hábiles), probando versión completa y reducida; si los `MUST` no entran, se reducen primero |
| **Completa** | Todo, de punta a punta, incluidos los `COULD` (deseables) |

- Una sola llamada al LLM: devuelve prioridad (`MUST/SHOULD/COULD`), versión reducida opcional por módulo, un equipo por opción y la fecha objetivo si las fuentes la mencionan (si no, se estima en el 65 % de la duración de la Completa).
- Cada opción tiene su equipo, % de PM y contingencia editables, con recálculo inmediato. Los módulos se pueden agregar, quitar o pasar a versión reducida por opción.
- Cambiar la fecha objetivo (o el equipo + "Ajustar alcance a la fecha") reajusta la Equilibrada.
- La **propuesta formal** es la opción que elige el cliente (una por oportunidad).
- Pestaña **Comparativa**: tarjetas por opción (esfuerzo, duración FT/PT, equipo, si entra en la fecha) y matriz módulo × opción editable.
- Los proyectos cerrados del histórico tienen una única opción (la vendida).

## 13. Pendientes de la revisión de código y arquitectura

**Mejoras menores**
- Insights: evitar recalcular embeddings de los módulos dos veces por pedido; invalidar solo al cambiar módulos o fuentes; LRU para `unitEmbeddings`; deduplicar oraciones en `coveragePct`.
- Validar en `updateModule` que la versión reducida sea más barata que la completa y unificar límites de horas (DTO 5000 vs zod 2000).
- Avisar en la respuesta cuando las fuentes se truncan a 60k caracteres (hoy solo queda en el log); priorizar n chunks por fuente.
- Código muerto: endpoint `c4.mmd` y `api.proposals.c4Mermaid`, edición de `priority` sin UI (o replanificar al cambiarla), README de plantilla, script `test:e2e` sin config, `SourceType.VIDEO`.
- Mapear errores de Prisma (P2025 → 404, P2002 → 409).

**Post-hackatón**
- `dependsOn` por id (tabla `ModuleDependency`) y cálculo de fases/camino crítico en `estimation/schedule-planner.ts` (backend), base del Gantt.
- Horas por rol como columnas o tabla en vez de JSON; validar `analogies`/`architecture` al leer.
- `sourceChunkIds` con FK (tabla `ProposalModuleChunk`) o borrado lógico de fuentes con propuestas.
- Límites entre módulos: `closedNotebookIds` vía `NotebooksService`; `ProposalsService.findCurrent` para el chat; extraer helpers y un `ProposalBuilder` puro.
- Multiusuario: auth + `ownerId` en `Notebook`, cola (pg-boss) para ingesta y generación, caché del LLM en tabla con TTL, CORS acotado.
- Selección de versión y opción en la URL (`?v=&tier=`).
