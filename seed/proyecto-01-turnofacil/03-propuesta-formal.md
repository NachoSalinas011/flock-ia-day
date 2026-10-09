# Propuesta comercial — TurnoFácil

**Cliente:** Red de Clínicas Del Valle
**Proyecto:** TurnoFácil — Plataforma de turnos online (código interno P-2024-07)
**Fecha de envío:** 16 de abril de 2024
**Industria:** Salud
**Preparado por:** Lucía Benítez (PM) y Martín Ríos (Tech Lead), en nombre del equipo

---

## 1. Resumen

Proponemos desarrollar **TurnoFácil**, una plataforma web responsive para la reserva de turnos médicos online en las 4 sedes de la Red de Clínicas Del Valle. La solución incluye autogestión de turnos por parte del paciente, una agenda única compartida entre sedes, backoffice administrativo, recordatorios por email y WhatsApp y un dashboard de ocupación y ausentismo.

**Stack propuesto:** React + TypeScript (frontend), NestJS (backend), PostgreSQL (base de datos), desplegado en la cuenta de AWS del cliente.

**Esfuerzo total estimado:** **911 horas** (equivalentes Ssr).
**Duración estimada:** **32 días hábiles** (≈ 6,5 semanas).

## 2. Convenciones de la estimación

- Todas las horas se expresan en **horas equivalentes Ssr** (semi senior).
- Factores de seniority: Jr 1,3 · Ssr 1,0 · Sr 0,8. Una persona Sr resuelve en 0,8 h lo que un Ssr resuelve en 1 h.
- Dedicación: Full time (FT) = 8 h/día; Part time (PT) = 4 h/día.
- Jornadas por módulo: FT = horas / 8; PT = horas / 4.
- Gestión de proyecto (PM): 15 % de overhead sobre las horas de desarrollo.
- Contingencia: porcentaje sobre (desarrollo + PM). En esta propuesta: **0 %**.

## 3. Alcance por módulo

| # | Módulo | Complejidad | UX | Frontend | Backend | QA | Total (h) | Jornadas FT | Jornadas PT |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Autenticación y gestión de usuarios | Media | 12 | 32 | 40 | 16 | 100 | 12,5 | 25 |
| 2 | Agenda y reserva de turnos | Alta | 32 | 80 | 96 | 40 | 248 | 31 | 62 |
| 3 | Gestión de pacientes | Media | 16 | 40 | 40 | 20 | 116 | 14,5 | 29 |
| 4 | Notificaciones (email y WhatsApp) | Media | 4 | 8 | 48 | 16 | 76 | 9,5 | 19 |
| 5 | Backoffice administrativo | Media | 20 | 56 | 48 | 24 | 148 | 18,5 | 37 |
| 6 | Reportes y dashboard | Baja | 12 | 32 | 24 | 12 | 80 | 10 | 20 |
| 7 | Infraestructura y despliegue | Baja | 0 | 0 | 24 | 0 | 24 | 3 | 6 |
| | **Total desarrollo** | | **96** | **248** | **320** | **128** | **792** | **99** | **198** |

### Detalle de cada módulo

1. **Autenticación y gestión de usuarios.** Registro y login de pacientes (email + Google), login de profesionales y administradores, roles y permisos (paciente, profesional, recepción, administración, administrador de sistemas), recupero de contraseña.
2. **Agenda y reserva de turnos.** Disponibilidad por profesional, sede y especialidad, con duración de turno configurable; reserva, cancelación (hasta 2 h antes) y reprogramación; carga de turnos por recepción en nombre del paciente; control de concurrencia para evitar la doble reserva del mismo horario.
3. **Gestión de pacientes.** Ficha del paciente, cobertura médica (obra social/prepaga, plan, número de afiliado o particular), historial de turnos y registro de asistencia para medir ausentismo.
4. **Notificaciones (email y WhatsApp).** Confirmación de turno y recordatorio 24 h antes por email y WhatsApp Business API; respuesta del paciente desde WhatsApp para confirmar o cancelar.
5. **Backoffice administrativo.** ABM de sedes, profesionales, especialidades, coberturas aceptadas por profesional y horarios de atención; gestión de usuarios internos.
6. **Reportes y dashboard.** Dashboard de ocupación por sede y profesional, tasa de ausentismo por período y especialidad, exportación a Excel.
7. **Infraestructura y despliegue.** Ambientes de staging y producción en AWS, pipeline de CI/CD, backups diarios y monitoreo básico.

## 4. Totales

| Concepto | Horas |
|---|---:|
| Desarrollo (UX + Frontend + Backend + QA) | 792 |
| Gestión de proyecto (PM, 15 % sobre desarrollo) | 119 |
| Contingencia (0 %) | 0 |
| **Total** | **911** |

Distribución por rol: UX 96 h · Frontend 248 h · Backend 320 h · QA 128 h · PM 119 h.

## 5. Equipo propuesto

| Rol | Seniority | Cantidad | Dedicación | Horas asignadas (eq. Ssr) | Capacidad diaria (h eq. Ssr) | Días hábiles del rol |
|---|---|---:|---|---:|---:|---:|
| PM | Ssr | 1 | PT | 119 | 4 / 1,0 = 4 | 29,75 |
| UX | Ssr | 1 | PT | 96 | 4 / 1,0 = 4 | 24 |
| Frontend | Ssr | 1 | FT | 248 | 8 / 1,0 = 8 | 31 |
| Backend | Sr | 1 | FT | 320 | 8 / 0,8 = 10 | 32 |
| QA | Ssr | 1 | PT | 128 | 4 / 1,0 = 4 | 32 |

## 6. Duración estimada

La duración se calcula como el máximo de días entre los roles UX, Frontend, Backend y QA, multiplicado por (1 + contingencia):

- máx(24; 31; 32; 32) = **32 días**
- 32 × (1 + 0 %) = **32 días hábiles ≈ 6,5 semanas**

El camino crítico lo marcan **Backend** y **QA** (32 días cada uno). Esto permite cumplir con el plazo deseado de aproximadamente dos meses y llegar al lanzamiento antes de la temporada de invierno.

## 7. Supuestos

- El cliente provee acceso a su cuenta de AWS con los permisos necesarios dentro de la primera semana.
- El cliente gestiona la cuenta de **WhatsApp Business API** (verificación de la empresa ante Meta y número habilitado) y la tiene operativa antes del inicio del desarrollo del módulo de notificaciones.
- Las reglas de disponibilidad relevadas en el kickoff (horario por profesional, sede y especialidad, duración de turno por especialidad, cancelación hasta 2 h antes) son las definitivas.
- La carga inicial de profesionales, sedes, especialidades y coberturas la realiza el cliente desde el backoffice.
- Un referente del cliente valida entregables con un tiempo de respuesta no mayor a 48 h hábiles.
- Las horas se expresan en equivalentes Ssr; la composición del equipo puede ajustarse manteniendo la capacidad total.

## 8. Fuera de alcance

- Aplicación mobile nativa (iOS / Android).
- Integración con el sistema de historia clínica.
- Facturación a obras sociales y prepagas, y validación online de afiliados.
- Notificaciones por SMS.
- Pagos online de consultas particulares.
- Migración de turnos históricos del sistema de escritorio actual.

## 9. Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Demora en la habilitación de WhatsApp Business API y aprobación de plantillas por parte de Meta | Baja | Medio | El cliente inicia el trámite en la semana del kickoff. El email funciona como canal de respaldo. |
| Picos de concurrencia en la apertura de agendas | Media | Medio | Control de concurrencia en la reserva y pruebas de carga básicas. |
| Reglas de agenda no relevadas (sobreturnos, licencias) | Baja | Bajo | Se revisan con Dirección Médica durante el sprint de UX. |
| Restricciones de permisos en la cuenta AWS del cliente | Baja | Bajo | Definir los permisos necesarios en la primera semana. |

## 10. Próximos pasos

1. Aprobación de la propuesta por parte de la Red de Clínicas Del Valle.
2. Habilitación de accesos a AWS e inicio del trámite de WhatsApp Business API.
3. Inicio del proyecto y primer sprint de UX con relevamiento en las sedes Centro y Norte.
