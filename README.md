# Estimador de Propuestas Comerciales

"NotebookLM" para preventa: cargás las fuentes de una oportunidad (brief, minutas, transcripciones, PDFs), las consultás con un chat con citas y generás **tres propuestas de esfuerzo** (MVP, Equilibrada y Completa) calibradas con los proyectos históricos del equipo.

## Funcionalidades

- **Oportunidades**: fuentes en md, txt, pdf o docx (hasta 5 archivos de 15 MB por subida), indexadas localmente para RAG. Se pueden eliminar desde el encabezado, con confirmación.
- **Chat** con citas a las fuentes propias y a los proyectos históricos.
- **Comparativa**: una generación del LLM arma un catálogo de módulos y, con él, tres opciones:
  - **MVP**: lo indispensable (módulos MUST, en versión reducida si la tienen).
  - **Equilibrada**: lo máximo que entra en la **fecha objetivo** (detectada en las fuentes o estimada).
  - **Completa**: todo, incluidos los deseables.
  Cada opción tiene su equipo editable; esfuerzo, jornadas FT/PT y duración se recalculan al instante. La matriz de alcance permite incluir, quitar o reducir módulos por opción.
- **Propuesta**: detalle de cada opción, elección de la opción formal (la que vende) y export a Markdown.
- **Módulos identificados**: diagrama C4 (nivel 2 con los módulos dentro de los contenedores), modo diferencias entre opciones o versiones, cobertura de requisitos y trazabilidad módulo ↔ fuente, export a PDF.
- **Histórico**: proyectos cerrados con estimado vs. real; se cargan desde `seed/`, a mano o importados desde Jira.

## Stack

- `apps/web`: React 19 + TypeScript (Vite, TanStack Query, Tailwind con el Flock Design System, React Flow).
- `apps/api`: NestJS 11 + Prisma 6 + PostgreSQL 16 con pgvector.
- LLM: OpenRouter, solo modelos `:free`. Embeddings locales (`multilingual-e5-small`, sin cuota).

## Levantar

```bash
cp .env.example .env        # completar OPENROUTER_API_KEY
npm install
npm run db:up               # Postgres + pgvector en Docker (puerto 5433)
npm run db:migrate
npm run db:seed             # carga los proyectos históricos de seed/
npm run dev                 # API :3000 (Swagger en /api/docs) + web :5173
```

Tests y chequeos:

```bash
cd apps/api && npx jest && npx tsc --noEmit -p tsconfig.json && npx eslint src
cd apps/web && npx tsc -b && npx eslint src
```

## Variables de entorno

| Variable | Uso |
|---|---|
| `OPENROUTER_API_KEY` | API key de OpenRouter |
| `LLM_MODEL` / `LLM_FALLBACK_MODEL` | Modelos `:free` (OpenRouter prueba el segundo si el primero falla) |
| `DATABASE_URL` | Postgres del docker compose |
| `LLM_MOCK=true` | Respuestas de ejemplo sin llamar al modelo (para desarrollar la UI) |
| `LLM_CACHE=false` | Desactiva la caché de respuestas en `apps/api/.cache/llm` |
| `API_HOST` | Interfaz donde escucha la API (default `127.0.0.1`, solo local; `0.0.0.0` para exponerla en la red) |
| `WEB_ORIGIN` | Orígenes permitidos por CORS, separados por coma (default `http://localhost:5173`) |

**Cuota:** las cuentas free tienen ~50 pedidos/día. Generar propuestas y el chat gastan 1 pedido cada uno; las respuestas válidas se cachean (misma pregunta y mismas fuentes = 0 pedidos). "Nueva versión" vuelve a consultar al modelo. Cuota restante: `curl -s https://openrouter.ai/api/v1/key -H "Authorization: Bearer $OPENROUTER_API_KEY"`.

## Cómo se estima

- El LLM identifica los módulos en las fuentes, propone horas por rol (UX, FE, BE, QA) en **horas equivalentes Ssr**, su prioridad, una versión reducida y analogías con el histórico, aplicando las lecciones aprendidas.
- Las cuentas las hace código determinístico (`apps/api/src/estimation/`), con tests:
  - Seniority: Jr 1,3 · Ssr 1,0 · Sr 0,8 (afecta la capacidad del equipo, no el esfuerzo).
  - Jornadas: FT = 8 h, PT = 4 h.
  - PM = % sobre desarrollo (default 15 %); contingencia = % sobre desarrollo + PM (default 10 %).
  - Duración = máximo de días entre roles (cuello de botella) × (1 + contingencia), en días hábiles.

## Seguridad

- La API escucha solo en localhost y CORS acepta solo el front: nadie en la misma red puede usarla ni gastar la cuota.
- Las fuentes son datos, nunca instrucciones: se delimitan en el prompt y se neutralizan las etiquetas que podrían cerrar esos bloques.
- El chat no carga imágenes ni links que devuelva el modelo.
- La ingesta tiene topes de tamaño, páginas, expansión de DOCX, texto y fragmentos por fuente, y procesa de a una fuente.
- Sin autenticación: pensado para uso local de una persona.

## Proyectos históricos

- **Desde archivos**: una carpeta por proyecto en `seed/` con `estimacion.json` y documentos. Formato, campos y plantilla en [`seed/README.md`](seed/README.md) y `seed/_plantilla/`. `npm run db:seed` valida todo antes de cargar.
- **Desde Jira**: `scripts/jira-to-seed.py` convierte una exportación del tablero (épicas = módulos, story points = estimado) en proyectos del seed. Como Jira no tiene horas cargadas, el esfuerzo real se estima con la **velocidad del equipo** (capacidad de cada sprint repartida según los story points cerrados). La configuración (equipo, roles, horas por story point, anonimización) va en `.jira-import/config.json`:
  ```bash
  python3 -I scripts/jira-to-seed.py .jira-import seed && npm run db:seed
  ```
  El script anonimiza el cliente y las personas, y reemplaza links, emails y menciones. Requiere Python ≥ 3.12. `.jira-import/` y `seed/jira-*/` tienen datos de clientes y están en `.gitignore`.

## Próximos pasos

- Cerrar una oportunidad desde la UI cargando las horas reales.
- Importación de Jira dentro de la app (API REST con token) en lugar del script.
- Dependencias entre módulos y fases (Gantt).
- Multiusuario: autenticación, dueño por oportunidad y caché del LLM en base de datos.
