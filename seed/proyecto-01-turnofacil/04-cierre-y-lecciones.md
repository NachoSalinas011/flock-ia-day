# Cierre de proyecto y lecciones aprendidas — TurnoFácil

**Cliente:** Red de Clínicas Del Valle
**Proyecto:** TurnoFácil (P-2024-07) — Industria: Salud — Año: 2024
**Estado:** Cerrado
**Stack:** React, TypeScript, NestJS, PostgreSQL, AWS
**Retrospectiva elaborada por:** Lucía Benítez (PM) y Martín Ríos (Tech Lead), con el equipo

---

## 1. Resumen ejecutivo

TurnoFácil se entregó en producción con todo el alcance comprometido más las reglas de **sobreturnos** y **bloqueo de agenda por licencias**, que surgieron a mitad del proyecto. El cliente quedó conforme con el resultado, pero el proyecto terminó con un **desvío de +11,7 %** en horas y **+7 días hábiles** de plazo.

| Indicador | Estimado | Real | Desvío |
|---|---:|---:|---:|
| Horas de desarrollo | 792 | 878 | +10,9 % |
| Horas de PM | 119 | 140 | +17,6 % |
| Contingencia | 0 | — | — |
| **Horas totales** | **911** | **1018** | **+11,7 %** |
| **Duración (días hábiles)** | **32** | **39** | **+7 días (+21,9 %)** |

Todas las horas están expresadas en horas equivalentes Ssr.

## 2. Estimado vs. real por módulo

| Módulo | Complejidad | Estimado (h) | Real (h) | Diferencia (h) | Desvío |
|---|---|---:|---:|---:|---:|
| Autenticación y gestión de usuarios | Media | 100 | 100 | 0 | 0,0 % |
| Agenda y reserva de turnos | Alta | 248 | 312 | +64 | +25,8 % |
| Gestión de pacientes | Media | 116 | 112 | −4 | −3,4 % |
| Notificaciones (email y WhatsApp) | Media | 76 | 104 | +28 | +36,8 % |
| Backoffice administrativo | Media | 148 | 150 | +2 | +1,4 % |
| Reportes y dashboard | Baja | 80 | 70 | −10 | −12,5 % |
| Infraestructura y despliegue | Baja | 24 | 30 | +6 | +25,0 % |
| **Total desarrollo** | | **792** | **878** | **+86** | **+10,9 %** |

### Detalle por módulo y rol (estimado → real)

| Módulo | UX | Frontend | Backend | QA |
|---|---|---|---|---|
| Autenticación y gestión de usuarios | 12 → 12 | 32 → 30 | 40 → 44 | 16 → 14 |
| Agenda y reserva de turnos | 32 → 36 | 80 → 96 | 96 → 128 | 40 → 52 |
| Gestión de pacientes | 16 → 14 | 40 → 38 | 40 → 42 | 20 → 18 |
| Notificaciones (email y WhatsApp) | 4 → 4 | 8 → 8 | 48 → 72 | 16 → 20 |
| Backoffice administrativo | 20 → 18 | 56 → 60 | 48 → 50 | 24 → 22 |
| Reportes y dashboard | 12 → 10 | 32 → 28 | 24 → 22 | 12 → 10 |
| Infraestructura y despliegue | 0 → 0 | 0 → 0 | 24 → 30 | 0 → 0 |

## 3. Estimado vs. real por rol

| Rol | Seniority / dedicación | Estimado (h) | Real (h) | Desvío | Días estimados | Días reales |
|---|---|---:|---:|---:|---:|---:|
| UX | Ssr PT (4 h/día) | 96 | 94 | −2,1 % | 24 | 23,5 |
| Frontend | Ssr FT (8 h/día) | 248 | 260 | +4,8 % | 31 | 32,5 |
| Backend | Sr FT (10 h eq. Ssr/día) | 320 | 388 | +21,2 % | 32 | 38,8 |
| QA | Ssr PT (4 h/día) | 128 | 136 | +6,2 % | 32 | 34 |
| PM | Ssr PT (4 h/día) | 119 | 140 | +17,6 % | 29,75 | 35 |

**Duración real:** máx(23,5; 32,5; 38,8; 34) = 38,8 → **39 días hábiles**, contra los **32** estimados. El cuello de botella fue **Backend**, que concentró el desvío de agenda (+32 h), notificaciones (+24 h) e infraestructura (+6 h). Al no haber contingencia en la propuesta, todo el desvío se trasladó directamente al plazo.

## 4. Causas de los desvíos

### Agenda y reserva de turnos (+25,8 %)
- Las reglas de **sobreturnos** y de **bloqueo de agenda por licencias** aparecieron a mitad del proyecto. En el kickoff se habían mencionado al pasar ("lo vemos más adelante", "lo de licencias lo vemos después") y quedaron como pendientes sin estimar.
- Cada sede manejaba los sobreturnos de forma distinta, lo que obligó a hacer la regla configurable por sede.
- La **concurrencia sobre el mismo slot** en la apertura de agendas requirió implementar locking optimista y sumar pruebas específicas (QA pasó de 40 h a 52 h).

### Notificaciones — email y WhatsApp (+36,8 %)
- Hubo **demoras en la aprobación de plantillas** de WhatsApp Business. El trámite ante Meta, que había quedado a cargo del cliente, se demoró más de lo previsto y el equipo terminó acompañando la gestión.
- El **webhook de respuestas** (confirmar/cancelar desde WhatsApp) fue más complejo de lo previsto: manejo de respuestas fuera de ventana, mensajes duplicados y reintentos.
- **No había un sandbox real del proveedor**, por lo que buena parte de las pruebas se hizo contra el número productivo con pacientes de prueba. Backend pasó de 48 h a 72 h (+50 %).

### Infraestructura y despliegue (+25,0 %)
- Hubo **ajustes de permisos IAM** en la cuenta de AWS del cliente, que tenía políticas restrictivas por auditoría. Cada cambio requería aprobación del área de sistemas.

### Módulos dentro de lo estimado
- **Autenticación**, **gestión de pacientes** y **backoffice** quedaron dentro de lo estimado (entre −3,4 % y +1,4 %).
- **Reportes y dashboard** quedó por debajo (−12,5 %) porque se usó una librería de gráficos ya conocida por el equipo.

### Riesgos subestimados en la propuesta
- La demora de WhatsApp Business figuraba como riesgo de probabilidad **baja**; en la práctica ocurrió.
- Las reglas de agenda no relevadas (sobreturnos, licencias) figuraban con impacto **bajo**; terminaron siendo la principal fuente de desvío en horas.

## 5. Lecciones aprendidas

1. Los módulos de agenda o calendario con reglas de disponibilidad deben estimarse como complejidad **ALTA** y con relevamiento detallado de excepciones (**sobreturnos, licencias, feriados**).
2. Las integraciones con APIs de terceros que requieren aprobación externa (WhatsApp Business) tuvieron un desvío del **~37 %**: aplicar un **factor de 1,4 al backend** y agregar dependencias externas como riesgo.
3. No incluir contingencia hizo que el desvío impactara directo en el plazo (**+7 días hábiles**). Incluir **al menos un 10 %**.
4. **Autenticación, backoffice ABM y reportes simples** se estimaron con precisión: son **módulos de referencia confiables**.

## 6. Recomendaciones para futuras estimaciones

- **No cerrar la estimación con temas "para ver después".** Todo lo que se menciona al pasar en el kickoff (sobreturnos, licencias, feriados, excepciones) debe relevarse antes de enviar la propuesta, o estimarse explícitamente como un ítem aparte.
- **Agendas y turnos = complejidad ALTA por defecto**, con horas de QA específicas para concurrencia (locking, reservas simultáneas).
- **Integraciones con terceros que requieren aprobación externa** (WhatsApp Business, pasarelas de pago, APIs gubernamentales): aplicar un factor ~1,4 sobre backend, no asumir que el trámite a cargo del cliente estará listo a tiempo y verificar si existe sandbox.
- **Contingencia mínima del 10 %** sobre desarrollo + PM. En este proyecto, un 10 % (≈ 91 h) habría absorbido buena parte del desvío de 107 h.
- **Infraestructura en cuenta del cliente:** relevar políticas de IAM y tiempos de aprobación en el kickoff; sumar un margen al módulo de infraestructura cuando el cliente administra la cuenta.
- **Usar como referencia** las horas de autenticación (100 h), backoffice ABM (148 → 150 h) y reportes simples (80 → 70 h) de este proyecto para módulos equivalentes.
- **Calibrar riesgos:** las dependencias externas no deben marcarse con probabilidad baja si no hay evidencia de que el trámite ya está avanzado.
