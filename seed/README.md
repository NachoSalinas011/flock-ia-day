# Seed — proyectos históricos ficticios

Dos proyectos **cerrados** que sirven como base de calibración del estimador. El tercer proyecto se crea en vivo durante la demo.

| Carpeta | Proyecto | Industria | Año | Estimado | Real | Desvío |
|---|---|---|---|---|---|---|
| `proyecto-01-turnofacil` | TurnoFácil — turnos online para una red de clínicas | Salud | 2024 | 911 h / 32 días | 1018 h / 39 días | +11,7 % |
| `proyecto-02-portal-b2b` | Portal B2B para una distribuidora mayorista | Retail / Distribución | 2025 | 1356 h / 33 días | 1307 h / 32 días | −3,6 % |

## Archivos por proyecto

| Archivo | Uso |
|---|---|
| `01-brief-cliente.md` | Fuente: brief inicial del cliente |
| `02-transcripcion-kickoff.md` | Fuente: simula la transcripción del video de la reunión de kickoff (con timestamps) |
| `03-propuesta-formal.md` | Fuente: la propuesta formal enviada al cliente |
| `04-cierre-y-lecciones.md` | Fuente: retrospectiva con horas reales y lecciones aprendidas |
| `estimacion.json` | Datos estructurados para `prisma/seed.ts` (notebook + propuesta formal + horas reales) |

## Convenciones (las mismas del motor de estimación, ver `docs/PLAN.md` §4)

- Las horas están en **horas equivalentes Ssr**.
- Factores de seniority: `JR` 1.3, `SSR` 1.0, `SR` 0.8.
- Capacidad diaria de una persona = `8 (FT) o 4 (PT) / factor`.
- Duración = `max(días de UX, FRONTEND, BACKEND, QA) × (1 + contingencia)`, redondeado hacia arriba. La duración **real** se calcula sin contingencia, porque es lo que efectivamente se usó.
- PM = 15 % de overhead sobre las horas de desarrollo (redondeado). Contingencia = % sobre (dev + PM).
- Jornadas por módulo: `FT = horas / 8`, `PT = horas / 4`.

Lecciones que el estimador debería aprender de este histórico (y citar):
1. Agenda y disponibilidad con reglas de negocio → complejidad ALTA, con un ~26 % de desvío en TurnoFácil.
2. Integraciones con terceros (WhatsApp Business) y sistemas legacy (ERP SOAP) → +37 % y +39 % de desvío. Hay que aplicar un factor de ~1,4.
3. Sin contingencia, el proyecto se pasó (P1). Con un 10 % de contingencia, el desvío quedó absorbido (P2).
4. Autenticación, backoffice y reportes son módulos "conocidos": estimado ≈ real.
