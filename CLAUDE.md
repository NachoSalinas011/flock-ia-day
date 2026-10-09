# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Estimador de propuestas comerciales (hackatón): un "NotebookLM" de preventa. Cada **oportunidad** (notebook) tiene fuentes (md/txt/pdf/docx) indexadas para RAG, un chat con citas y **propuestas de esfuerzo** calibradas con **proyectos históricos cerrados** (horas estimadas vs. reales). Producto en español rioplatense; identificadores de código en inglés.

## Comandos

Monorepo con npm workspaces (`apps/api` = `@estimador/api`, `apps/web` = `@estimador/web`). La `.env` vive en la raíz y la API la lee vía `dotenv -e ../../.env`.

```bash
npm run db:up                 # Postgres 16 + pgvector en Docker (puerto 5433)
npm run db:migrate            # prisma migrate dev
npm run db:seed               # nest build + carga los históricos de seed/ (valida todo antes de escribir)
npm run dev                   # API :3000 (Swagger /api/docs) + web :5173 (Vite proxea /api)

# API (cd apps/api)
npx jest                                        # tests (motor de estimación, planner, días hábiles)
npx jest src/estimation/scope-planner.spec.ts   # un archivo
npx jest -t "balanced reduces MUST"             # un test por nombre
npx tsc --noEmit -p tsconfig.json && npx eslint src
npm run prisma -- studio                        # cualquier comando prisma con la .env de la raíz

# Web (cd apps/web)
npx tsc -b && npx eslint src

# Jira → histórico (datos crudos en .jira-import/, gitignoreado)
python3 -I scripts/jira-to-seed.py .jira-import seed && npm run db:seed
```

## Restricción clave: cuota del LLM

OpenRouter con modelos `:free` (~50 pedidos/día). **No llames a `POST /notebooks/:id/proposals/generate` ni a `POST /notebooks/:id/chat` para probar** salvo que sea necesario: cada uno gasta un pedido. Alternativas: `LLM_MOCK=true` en `.env` (respuestas canned, requiere reiniciar la API), o la caché en disco `apps/api/.cache/llm` (clave = hash de los mensajes; solo se cachean respuestas que pasan la validación). `fresh: true` en generate saltea la lectura de caché. Cambiar un prompt invalida la caché.

## Arquitectura

### Backend (`apps/api/src`, NestJS + Prisma)
Capas estrictas **Controller → Service → Repository → Prisma**; solo los repositories tocan `PrismaService` (excepciones: `seed/seed.ts`, `RetrievalService.closedNotebookIds`). DTOs con class-validator (`ValidationPipe` con whitelist + forbidNonWhitelisted); respuestas armadas por `*Mapper`. Prisma usa un único `prisma/schema.prisma`; la columna `Chunk.embedding` es `vector(384)` y se escribe/consulta con SQL crudo en `sources.repository.ts`.

- **`llm/`**: único punto de acceso a OpenRouter (lista de modelos con fallback, caché, mock, reintento ante respuesta vacía). No mandar `response_format` (rompe a Nemotron); la salida se parsea y valida con zod.
- **`embeddings/`**: `transformers.js` local (`multilingual-e5-small`, prefijos `query:`/`passage:`), sin cuota.
- **`sources/`**: ingesta asíncrona (fire-and-forget; al iniciar la API se marcan como ERROR las que quedaron PENDING/PROCESSING), chunking por secciones markdown, búsqueda vectorial en `RetrievalService`.
- **`proposals/`**: el corazón.
  - Una generación = **una** llamada al LLM (`proposal-generator.service.ts` + `proposal.prompt.ts` + `proposal.schema.ts`) que devuelve un **catálogo de módulos** (prioridad MUST/SHOULD/COULD, variante reducida opcional, horas por rol, analogías con el histórico, citas a chunks, arquitectura C4, equipo por opción, fecha objetivo).
  - Con ese catálogo, código determinístico arma **tres opciones** (`ProposalOption`: MVP / BALANCED "Equilibrada" / COMPLETE) en `estimation/scope-planner.ts`: MVP = MUST reducidos; Equilibrada = MUST + SHOULD que entran en la fecha objetivo; Completa = todo.
  - Las horas por rol viven en columnas JSON (`estimatedHours`, `reducedHours`, `actualHours` con forma `{UX, FRONTEND, BACKEND, QA}`); la inclusión de cada módulo en cada opción está en `ProposalOptionModule` (FULL/REDUCED). El equipo (`TeamMember`) es por opción.
  - Los totales **no se persisten**: `ProposalMapper` los recalcula en cada lectura con `estimation/estimation.engine.ts`.
  - `proposal-insights.service.ts`: trazabilidad módulo↔fuente y "requisitos sin cubrir" por similitud de oraciones (umbrales calibrados para e5-small: 0,85 / 0,86).
  - Las escrituras sobre una opción se serializan con `SELECT … FOR UPDATE` en `proposals.repository.ts`.
- **`estimation/`**: funciones puras con tests. Convenciones que no se deducen fácilmente:
  - Horas en **equivalente Ssr**; factores de seniority Jr 1,3 · Ssr 1,0 · Sr 0,8 afectan la capacidad, no el esfuerzo.
  - Duración = `ceil(max(días por rol UX/FE/BE/QA) × (1 + contingencia))`; PM = % sobre desarrollo; contingencia = % sobre desarrollo + PM; jornadas FT = 8 h, PT = 4 h.
  - Fechas: todo en UTC solo-fecha (`business-days.ts`); "hoy" es el día local guardado como medianoche UTC.
- **Histórico** = notebooks `CLOSED` con una única opción formal (COMPLETE) y `actualHours`. `loadHistory` en el generator los manda al LLM como calibración. Se cargan solo con el seed.

### Frontend (`apps/web/src`, React 19 + TanStack Query + Tailwind v4)
- Capas: `lib/api.ts` (cliente) → `hooks/` (TanStack Query) → `features/` → `pages/`. Estilo: comillas simples, sin punto y coma (no correr prettier con config default).
- Design system Flock: tokens como CSS vars en `index.css` (`--brand`, `--surface`, estados `--state-*`), clases utilitarias `.btn`, `.chip`, `.card`, `.data-table`; dark mode con `html.dark`.
- `NotebookPage` mantiene la selección compartida (versión + opción) con `useSelectedProposal` y la mutación de generar (para que sobreviva al cambio de pestaña). Las mutaciones devuelven la propuesta completa y reemplazan el caché (`useProposalMutation`).
- Pestañas: Comparativa (`features/comparison`), Propuesta, Módulos identificados (`features/modules`: C4 con React Flow, layout determinístico en `c4Layout.ts`, modo diferencias, PDF con `@react-pdf/renderer`) y Chat.
- `lib/moduleDiff.ts` compara opciones/versiones en el cliente (match por id dentro de la misma versión; por nombre/analogía entre versiones).

## Datos

- `seed/<proyecto>/estimacion.json` + documentos = un histórico; formato documentado en `seed/README.md`, plantilla en `seed/_plantilla/` (las carpetas con `_` se ignoran). El seed es idempotente por `project.code`.
- `seed/jira-*/` y `.jira-import/` contienen datos reales (anonimizados) de un cliente: están en `.gitignore`, no commitearlos.
- Los tests del motor usan `apps/api/src/estimation/__fixtures__/`, no `seed/`.
