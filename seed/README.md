# Seed — proyectos históricos

Los proyectos **cerrados** (con horas reales) son la base con la que se calibran las nuevas propuestas. Se cargan desde esta carpeta con:

```bash
npm run db:seed
```

- Cada subcarpeta es un proyecto. Las que empiezan con `_` se ignoran (por ejemplo `_plantilla`).
- El seed **valida todo antes de cargar**. Si algo está mal, no carga nada y te dice qué archivo y qué campo corregir.
- Es idempotente: si volvés a correrlo, reemplaza cada proyecto, identificado por `project.code`.

Para empezar, copiá la plantilla: `cp -r seed/_plantilla seed/proyecto-mi-proyecto`.

## Archivos de cada proyecto

| Archivo | Obligatorio | Para qué se usa |
|---|---|---|
| `estimacion.json` | **Sí** | Datos estructurados: módulos, horas estimadas y reales, equipo, lecciones. Es lo que usa el estimador para calibrar |
| Cualquier `.md`, `.txt`, `.pdf` o `.docx` | No, pero recomendado | Se indexan como fuentes del proyecto. Sirven para el chat ("¿cómo resolvimos X en el proyecto Y?") y para vincular cada módulo con su origen |

Documentos recomendados (se cargan en orden alfabético):

1. `01-brief-cliente.md`: qué pidió el cliente.
2. `02-transcripcion-kickoff.md`: minuta o transcripción de reuniones.
3. `03-propuesta-formal.md`: la propuesta que se envió.
4. `04-cierre-y-lecciones.md`: estimado vs. real, causas de los desvíos y lecciones. **Es el más valioso para el chat.**

## Estructura de `estimacion.json`

### `project` (obligatorio)
| Campo | Tipo | Obligatorio | Ejemplo |
|---|---|---|---|
| `code` | texto, **único** | Sí | `"P-2025-07"` |
| `name` | texto | Sí | `"Portal de autogestión"` |
| `client` | texto | No | `"Distribuidora Andina"` |
| `industry` | texto | No | `"Retail"` |
| `year` | número | No | `2025` |
| `summary` | texto | No | Qué se construyó, en 2 o 3 oraciones |

### `parameters` (opcional)
| Campo | Default | Qué es |
|---|---|---|
| `pmOverheadPct` | `15` | % de gestión de proyecto sobre las horas de desarrollo |
| `contingencyPct` | `10` | % de contingencia sobre desarrollo + PM que se vendió |

### `team` (obligatorio, al menos 1)
El equipo **que se vendió**. Con él se calcula la duración planificada.

| Campo | Valores |
|---|---|
| `role` | `PM`, `UX`, `FRONTEND`, `BACKEND`, `QA` |
| `seniority` | `JR`, `SSR`, `SR` |
| `count` | número de personas (default `1`) |
| `dedication` | `FT` (8 h/día) o `PT` (4 h/día) |

### `modules` (obligatorio, al menos 1)
| Campo | Obligatorio | Qué es |
|---|---|---|
| `name` | Sí | Nombre del módulo. Usá nombres descriptivos y consistentes entre proyectos ("Autenticación y gestión de usuarios"): así el estimador encuentra las analogías |
| `description` | Recomendado | Qué incluía, con funcionalidades concretas |
| `complexity` | Sí | `LOW`, `MEDIUM` o `HIGH` |
| `estimatedHours` | Sí | `{ "UX": 0, "FRONTEND": 0, "BACKEND": 0, "QA": 0 }`: horas **vendidas**, sin PM ni contingencia |
| `actualHours` | **Muy recomendado** | Mismo formato, con las horas **reales**. Sin esto el módulo no aporta calibración (no se sabe si se desvió) |
| `notes` | Recomendado | Por qué se desvió o no ("el ERP no tenía ambiente de testing"). El LLM las lee |
| `container` | No | `key` del contenedor de `architecture` donde vive el módulo |
| `integrations` | No | `key`s de `architecture.externalSystems` que usa |
| `dependsOn` | No | Nombres **exactos** de otros módulos de este proyecto |

> **Horas en "equivalente Ssr":** cargá las horas como si las hubiera hecho un Ssr. Si las horas reales las hizo un Sr, el motor ya ajusta la duración con los factores de seniority (Jr 1,3 · Ssr 1,0 · Sr 0,8). Si no lo sabés, cargá las horas tal cual: la diferencia es menor.

### `lessons` (recomendado)
Lista de textos con las lecciones aprendidas. El estimador las aplica en las nuevas propuestas (por ejemplo: *"Las integraciones con sistemas legacy se desviaron un 40 %: aplicar un factor 1,4"*).

### `architecture` (opcional)
Solo hace falta para ver el diagrama C4 del proyecto histórico. Si no la cargás, se infiere una arquitectura web + API + base de datos.

| Lista | Campos |
|---|---|
| `actors` | `key`, `name`, `description`, `uses` (keys de contenedores) |
| `containers` | `key`, `name`, `technology`, `kind` (`WEB`, `MOBILE`, `API`, `WORKER`, `DATABASE`), `description`, `calls` (keys de contenedores) |
| `externalSystems` | `key`, `name`, `description` |

## Qué datos aportan más a la calibración

1. **Horas reales por módulo y por rol** (`actualHours`).
2. **Notas con la causa del desvío** (`notes`).
3. **Lecciones** (`lessons`).
4. **Nombres y descripciones de módulos** comparables entre proyectos.
5. El documento de cierre (`04-cierre-y-lecciones.md`) para el chat.
