# Estimador de Propuestas Comerciales

"NotebookLM" para preventa: cargás las fuentes de una oportunidad (brief, minutas, transcripciones, PDFs), las consultás con un chat con citas y generás propuestas de esfuerzo versionadas, calibradas con los proyectos históricos del equipo.

Plan y decisiones: [`docs/PLAN.md`](docs/PLAN.md) · Datos de ejemplo: [`seed/`](seed/README.md)

## Stack
- `apps/web`: React + TypeScript (Vite, TanStack Query, Tailwind con el Flock Design System)
- `apps/api`: NestJS + Prisma + PostgreSQL con pgvector
- LLM: OpenRouter, solo modelos `:free` · Embeddings: locales (`multilingual-e5-small`, sin cuota)

## Levantar
```bash
cp .env.example .env        # completar OPENROUTER_API_KEY
npm install
npm run db:up               # Postgres + pgvector en Docker (puerto 5433)
npm run db:migrate
npm run db:seed             # carga los proyectos históricos de seed/ (ver seed/README.md)
npm run dev                 # API :3000 (Swagger en /api/docs) + web :5173
```

## Cuota de modelos free
Las cuentas free de OpenRouter tienen ~50 pedidos/día. Para cuidarla:
- Las respuestas válidas se cachean en `apps/api/.cache/llm` (misma pregunta y mismas fuentes = 0 pedidos). `LLM_CACHE=false` lo desactiva.
- `LLM_MOCK=true` en `.env` usa respuestas de ejemplo sin llamar al modelo (para desarrollar la UI).
- Ver cuota restante: `curl -s https://openrouter.ai/api/v1/key -H "Authorization: Bearer $OPENROUTER_API_KEY"`.

## Cómo se estima
El LLM identifica módulos a partir de las fuentes, propone horas por rol (UX/FE/BE/QA, en horas equivalentes Ssr) y cita analogías del histórico. Las cuentas (PM %, contingencia, jornadas FT 8 h / PT 4 h, factores de seniority Jr 1,3 · Ssr 1,0 · Sr 0,8, duración por cuello de botella) las hace código determinístico en `apps/api/src/estimation/estimation.engine.ts`, con tests que reproducen las propuestas del histórico.
