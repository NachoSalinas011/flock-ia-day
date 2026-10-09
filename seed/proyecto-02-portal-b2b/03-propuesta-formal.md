# Propuesta comercial — Portal B2B Mayorista

**Código de proyecto:** P-2025-03
**Cliente:** Distribuidora Andina S.A.
**Industria:** Retail / Distribución
**Fecha:** 13 de marzo de 2025
**Preparada por:** Lucía Benítez (PM) y Martín Ríos (Tech Lead), en nombre del equipo
**Versión:** 1.0

---

## 1. Resumen

Distribuidora Andina S.A. necesita que sus aproximadamente 1.200 comercios clientes puedan autogestionar sus pedidos, hoy recibidos por teléfono, WhatsApp y a través de los 25 vendedores, y que esos pedidos ingresen directamente al ERP sin carga manual.

Proponemos desarrollar un **portal web de autogestión de pedidos** (responsive, sin app nativa) con catálogo y listas de precios por cliente, carrito y checkout con cuenta corriente y pago online, **integración bidireccional con el ERP** (servicios SOAP), notificaciones por email, backoffice comercial y reportes de ventas.

**Stack propuesto:** React + TypeScript (frontend), NestJS (backend), PostgreSQL (base de datos), AWS (infraestructura).

**Esfuerzo total estimado: 1.356 horas** (horas equivalentes Ssr), incluyendo gestión de proyecto y 10 % de contingencia.
**Duración estimada: 33 días hábiles** (≈ 6,5–7 semanas).

## 2. Convenciones de la estimación

- Todas las horas se expresan en **horas equivalentes Ssr** (lo que tardaría un perfil semi-senior).
- Factores de seniority: **Jr 1,3 · Ssr 1,0 · Sr 0,8** (un Jr rinde 1/1,3 de un Ssr; un Sr rinde 1/0,8).
- Dedicación: **FT = 8 h/día**, **PT = 4 h/día**. Capacidad diaria por persona = 8 o 4 / factor.
- **Jornadas por módulo:** FT = horas / 8; PT = horas / 4.
- **Gestión de proyecto (PM):** 15 % sobre las horas de desarrollo.
- **Contingencia:** 10 % sobre (desarrollo + PM).
- **Duración:** máximo de días entre UX, Frontend, Backend y QA × 1,1 (contingencia), redondeado hacia arriba.

## 3. Alcance por módulo

| # | Módulo | Complejidad | UX | Frontend | Backend | QA | Total (h) | Jornadas FT | Jornadas PT |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Autenticación y gestión de usuarios | Media | 12 | 32 | 44 | 16 | 104 | 13,0 | 26,0 |
| 2 | Catálogo de productos y listas de precios | Alta | 24 | 64 | 72 | 32 | 192 | 24,0 | 48,0 |
| 3 | Carrito y checkout de pedidos | Alta | 24 | 72 | 64 | 32 | 192 | 24,0 | 48,0 |
| 4 | Integración con ERP | Alta | 0 | 0 | 120 | 32 | 152 | 19,0 | 38,0 |
| 5 | Pagos online y cuenta corriente | Media | 8 | 24 | 56 | 20 | 108 | 13,5 | 27,0 |
| 6 | Notificaciones (email) | Baja | 4 | 8 | 24 | 8 | 44 | 5,5 | 11,0 |
| 7 | Backoffice administrativo | Media | 20 | 56 | 48 | 24 | 148 | 18,5 | 37,0 |
| 8 | Reportes y dashboard de ventas | Media | 12 | 40 | 32 | 16 | 100 | 12,5 | 25,0 |
| 9 | Infraestructura y despliegue | Baja | 0 | 0 | 32 | 0 | 32 | 4,0 | 8,0 |
| | **Total desarrollo** | | **104** | **296** | **492** | **180** | **1.072** | **134,0** | **268,0** |

### Detalle de cada módulo

1. **Autenticación y gestión de usuarios.** Login de clientes empresa con multiusuario (comprador y administrador de la cuenta), vendedores internos y administradores; roles y permisos; invitación de usuarios. *Estimado a partir de TurnoFácil (100 h) más el multiusuario por empresa.*
2. **Catálogo de productos y listas de precios.** Catálogo con búsqueda y filtros sobre ~8.000 SKUs, listas de precios y descuentos por cliente, stock visible por depósito.
3. **Carrito y checkout de pedidos.** Carrito persistente, pedido mínimo por cliente, repetir pedido anterior, selección de forma de pago (cuenta corriente u online) y fecha de entrega.
4. **Integración con ERP.** Sincronización de productos, stock y precios desde el ERP cada 15 minutos y envío de pedidos confirmados al ERP. El ERP expone servicios SOAP legacy.
5. **Pagos online y cuenta corriente.** Integración con pasarela de pagos (tarjeta y transferencia); consulta de saldo y comprobantes de cuenta corriente desde el ERP.
6. **Notificaciones (email).** Emails transaccionales: confirmación de pedido, cambio de estado, invitación de usuarios.
7. **Backoffice administrativo.** Gestión de clientes, usuarios, pedidos y estados; banners y destacados del catálogo; parámetros comerciales (pedido mínimo, zonas de entrega).
8. **Reportes y dashboard de ventas.** Ventas por cliente, vendedor y categoría; productos más pedidos; exportación a Excel.
9. **Infraestructura y despliegue.** Ambientes de staging y producción en AWS, CI/CD, monitoreo y alertas de la sincronización con el ERP.

## 4. Totales

| Concepto | Horas |
|---|---:|
| Desarrollo (UX + Frontend + Backend + QA) | 1.072 |
| Gestión de proyecto (15 % de 1.072) | 161 |
| Subtotal (desarrollo + PM) | 1.233 |
| Contingencia (10 % de 1.233) | 123 |
| **Total** | **1.356** |

Distribución por rol: UX 104 h · Frontend 296 h · Backend 492 h · QA 180 h · PM 161 h.

## 5. Equipo propuesto

| Rol | Seniority | Cantidad | Dedicación | Capacidad diaria (h eq. Ssr) |
|---|---|---:|---|---:|
| PM | Sr | 1 | PT | 5,0 |
| UX | Ssr | 1 | PT | 4,0 |
| Frontend | Ssr | 1 | FT | 8,0 |
| Frontend | Jr | 1 | PT | 3,1 |
| Backend | Sr | 1 | FT | 10,0 |
| Backend | Ssr | 1 | FT | 8,0 |
| QA | Jr | 1 | FT | 6,2 |

### Días por rol

| Rol | Horas | Capacidad diaria del rol | Días hábiles |
|---|---:|---|---:|
| UX | 104 | 4 / 1,0 = 4,0 | 26,0 |
| Frontend | 296 | 8 / 1,0 + 4 / 1,3 ≈ 11,08 | 26,7 |
| Backend | 492 | 8 / 0,8 + 8 / 1,0 = 18,0 | 27,3 |
| QA | 180 | 8 / 1,3 ≈ 6,15 | 29,3 |

El PM trabaja en paralelo durante todo el proyecto y no condiciona la duración.

## 6. Duración estimada

- Rol crítico: **QA**, con 29,3 días hábiles (29,25 sin redondear).
- Con 10 % de contingencia: 29,25 × 1,1 = 32,2 → **33 días hábiles**.
- Equivale a **≈ 6,5–7 semanas** de calendario, compatible con salir a producción antes de la temporada alta, siempre que el proyecto inicie en la fecha acordada y se cumplan los supuestos.

## 7. Supuestos

1. **Acceso al ambiente de testing del ERP** desde el inicio del proyecto, con datos representativos y conectividad (VPN o IP habilitada) hacia los servicios SOAP.
2. Distribuidora Andina entrega la **documentación vigente de los servicios SOAP** (WSDL, ejemplos y códigos de error) durante la primera semana.
3. Los códigos de producto son consistentes entre el ERP y el catálogo comercial, salvo excepciones puntuales que el cliente informará.
4. El ERP es la fuente de verdad de productos, precios, listas, descuentos, stock y saldo de cuenta corriente.
5. La sincronización de productos, precios y stock es periódica (cada 15 minutos); no se requiere tiempo real.
6. El cliente provee la cuenta y credenciales de sandbox de la pasarela de pagos.
7. Los reportes se construyen sobre los pedidos ingresados por el portal.
8. Hay un referente del cliente disponible para validaciones con una respuesta en un plazo máximo de 48 h.

## 8. Fuera de alcance

- Aplicación mobile nativa (el portal es web responsive).
- Logística y ruteo de entregas.
- Facturación electrónica (sigue saliendo del ERP).
- Notificaciones por WhatsApp o SMS.
- Migración de datos históricos de pedidos.

## 9. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Integración con el ERP legacy (SOAP):** documentación desactualizada, ambiente de testing aún no disponible, posibles inconsistencias de códigos de producto | Alta | Alto | **Riesgo principal del proyecto.** Contingencia del 10 % (123 h); supuesto explícito de acceso al ambiente de testing; prueba de conectividad temprana con los servicios críticos; priorizar la integración en las primeras semanas |
| Capacidad del ERP ante consultas frecuentes | Media | Medio | Sincronización cada 15 minutos en lugar de tiempo real; envío de pedidos con reintentos |
| Cambios de alcance en reportes | Media | Bajo | Gestión de cambios; ajustes menores absorbidos por la contingencia |
| Plazo ajustado frente a la temporada alta | Media | Alto | Seguimiento semanal con el cliente; QA en paralelo desde la primera semana |

## 10. Referencias

Para esta estimación usamos como antecedente el proyecto **TurnoFácil** (2024, sector salud: turnos online para una red de clínicas), desarrollado por el equipo:

- **Autenticación:** el módulo de TurnoFácil (100 h) es la base; se suma el multiusuario por empresa → 104 h.
- **Backoffice:** se reutilizan componentes del backoffice administrativo de TurnoFácil.
- **Notificaciones:** en TurnoFácil incluían WhatsApp, que se desvió +37 %. Aquí el alcance es solo email, por lo que se estima con complejidad baja.
- **Infraestructura:** se reutilizan los pipelines de CI/CD de TurnoFácil.
- **Integraciones con terceros:** la experiencia de TurnoFácil (proyecto sin contingencia que terminó por encima de lo estimado) motiva incluir el 10 % de contingencia en esta propuesta.

## 11. Próximos pasos

1. Validación de la propuesta por parte de Distribuidora Andina.
2. Confirmación de la fecha de disponibilidad del ambiente de testing del ERP.
3. Kickoff técnico y comienzo del desarrollo.
