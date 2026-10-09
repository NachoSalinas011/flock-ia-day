# Cierre del proyecto — Turnero clínico

## Estimado vs. real
| Módulo | Estimado (h) | Real (h) | Desvío | Causa |
|---|---|---|---|---|
| Autenticación y gestión de usuarios | 124 | 130 | +5 % | Política de contraseñas y bloqueo por intentos tardíos |
| Agenda y disponibilidad | 188 | 240 | +28 % | Cambio de grilla 30→20 min, superposición y husos |
| Reserva y cancelación de turnos | 144 | 154 | +7 % | Doble reserva del mismo paciente |
| Notificaciones por email | 60 | 52 | −13 % | Proveedor conocido |
| Panel de administración | 92 | 100 | +9 % | Columnas extra en el CSV (obra social) |

## Duración
Planificada: ~3 meses · Real: se estiró por el rediseño de la grilla de agenda.

## Lecciones aprendidas
- Cerrar el modelo de turnos (duración de slot, feriados, no superposición) en el kickoff; si no, agenda se desvía ~30 %.
- Login con roles cierra cerca de lo estimado; el desvío aparece en políticas de seguridad pedidas tarde.
- Email transaccional con proveedor conocido no pide tanta contingencia; WhatsApp sí, y se dejó afuera a propósito.
