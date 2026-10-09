# Cierre de proyecto y lecciones aprendidas — Portal B2B Mayorista

**Código de proyecto:** P-2025-03
**Cliente:** Distribuidora Andina S.A.
**Industria:** Retail / Distribución
**Estado:** CERRADO
**Fecha de la retrospectiva:** junio de 2025
**Participantes:** Lucía Benítez (PM), Martín Ríos (Tech Lead) y el resto del equipo del proyecto

---

## 1. Resumen ejecutivo

El portal se puso en producción antes del inicio de la temporada alta del cliente, como se había comprometido.

| Indicador | Estimado | Real | Desvío |
|---|---:|---:|---:|
| Horas de desarrollo (UX + FE + BE + QA) | 1.072 | 1.142 | +6,5 % |
| Horas de PM | 161 | 165 | +2,5 % |
| Contingencia | 123 | — | — |
| **Horas totales** | **1.356** | **1.307** | **−3,6 %** |
| **Duración (días hábiles)** | **33** | **32** | **−1 día** |

El desarrollo consumió 70 horas más de lo estimado, concentradas casi por completo en la **integración con el ERP**. Ese desvío quedó **absorbido por la contingencia del 10 %**: desarrollo + PM reales sumaron 1.307 h, 74 h por encima del subtotal estimado de 1.233 h y dentro de las 123 h de contingencia. El total real quedó un 3,6 % por debajo del total presupuestado.

## 2. Estimado vs. real por módulo

| Módulo | Complejidad | Estimado (h) | Real (h) | Desvío |
|---|---|---:|---:|---:|
| Autenticación y gestión de usuarios | Media | 104 | 104 | 0,0 % |
| Catálogo de productos y listas de precios | Alta | 192 | 198 | +3,1 % |
| Carrito y checkout de pedidos | Alta | 192 | 200 | +4,2 % |
| **Integración con ERP** | **Alta** | **152** | **212** | **+39,5 %** |
| Pagos online y cuenta corriente | Media | 108 | 112 | +3,7 % |
| Notificaciones (email) | Baja | 44 | 42 | −4,5 % |
| Backoffice administrativo | Media | 148 | 138 | −6,8 % |
| Reportes y dashboard de ventas | Media | 100 | 108 | +8,0 % |
| Infraestructura y despliegue | Baja | 32 | 28 | −12,5 % |
| **Total desarrollo** | | **1.072** | **1.142** | **+6,5 %** |

### Detalle por módulo y rol (estimado → real)

| Módulo | UX | Frontend | Backend | QA |
|---|---|---|---|---|
| Autenticación y gestión de usuarios | 12 → 12 | 32 → 30 | 44 → 46 | 16 → 16 |
| Catálogo de productos y listas de precios | 24 → 22 | 64 → 70 | 72 → 76 | 32 → 30 |
| Carrito y checkout de pedidos | 24 → 26 | 72 → 74 | 64 → 66 | 32 → 34 |
| Integración con ERP | 0 → 0 | 0 → 0 | 120 → 168 | 32 → 44 |
| Pagos online y cuenta corriente | 8 → 8 | 24 → 22 | 56 → 60 | 20 → 22 |
| Notificaciones (email) | 4 → 4 | 8 → 8 | 24 → 22 | 8 → 8 |
| Backoffice administrativo | 20 → 18 | 56 → 52 | 48 → 46 | 24 → 22 |
| Reportes y dashboard de ventas | 12 → 12 | 40 → 44 | 32 → 36 | 16 → 16 |
| Infraestructura y despliegue | 0 → 0 | 0 → 0 | 32 → 28 | 0 → 0 |

## 3. Estimado vs. real por rol

| Rol | Estimado (h) | Real (h) | Desvío |
|---|---:|---:|---:|
| UX | 104 | 102 | −1,9 % |
| Frontend | 296 | 300 | +1,4 % |
| Backend | 492 | 548 | +11,4 % |
| QA | 180 | 192 | +6,7 % |
| PM | 161 | 165 | +2,5 % |
| **Total** | **1.233** | **1.307** | **+6,0 %** |
| Contingencia presupuestada | 123 | — | — |
| **Total con contingencia** | **1.356** | **1.307** | **−3,6 %** |

El desvío se concentró en **Backend (+56 h)** y **QA (+12 h)**, y prácticamente todo corresponde a la integración con el ERP (+48 h de backend y +12 h de QA en ese módulo).

## 4. Causas de los desvíos

- **Integración con ERP (+39,5 %, 152 → 212 h).** Los servicios SOAP estaban mal documentados (el PDF de 2019 no reflejaba varias customizaciones posteriores), el **ambiente de testing del ERP no estaba disponible al inicio** del proyecto y hubo **inconsistencias de códigos de producto** (artículos con código interno y comercial distinto, y altas duplicadas) que obligaron a desarrollar una **tabla de mapeo** de códigos entre el portal y el ERP. Todo lo anterior se había identificado como riesgo en el kickoff y en la propuesta.
- **Reportes y dashboard (+8,0 %).** Levemente por encima: el cliente pidió filtros adicionales durante el desarrollo.
- **Carrito y checkout (+4,2 %), Pagos (+3,7 %), Catálogo (+3,1 %).** Dentro de lo estimado. En pagos, la pasarela tenía SDK y sandbox bien documentados. En catálogo, la búsqueda se resolvió con full-text search de PostgreSQL, sin motor externo.
- **Autenticación (0,0 %).** Se estimó usando TurnoFácil como referencia (100 h) más el multiusuario por empresa; quedó exactamente en lo estimado.
- **Backoffice (−6,8 %).** Por debajo de lo estimado gracias a la reutilización de componentes del backoffice de TurnoFácil.
- **Notificaciones (−4,5 %).** Solo email, sin WhatsApp: mucho más simple que en TurnoFácil.
- **Infraestructura (−12,5 %).** Se reutilizaron los pipelines de TurnoFácil.

## 5. Duración

- Estimada: **33 días hábiles** (rol crítico QA, 29,25 días × 1,1 de contingencia).
- Real: **32 días hábiles**, un día antes de lo previsto.
- El atraso inicial de la integración con el ERP (por la falta de ambiente de testing) se compensó adelantando catálogo, carrito y backoffice contra datos simulados, y trabajando la integración en paralelo cuando el ambiente estuvo disponible.

## 6. Lecciones aprendidas

1. Las integraciones con sistemas legacy (SOAP, sin documentación ni ambiente de testing) tuvieron un desvío del ~39 %, en línea con WhatsApp en TurnoFácil (+37 %). Factor recomendado: **1,4 sobre backend y QA del módulo**.
2. El **10 % de contingencia** absorbió por completo el desvío de la integración con el ERP: mantenerlo como default.
3. **Reutilizar** autenticación, backoffice y pipelines de proyectos anteriores mantuvo esos módulos dentro de lo estimado.
4. **Pasarelas de pago con SDK y sandbox maduros** no requieren factor de riesgo adicional.
5. Pedir **acceso al ambiente de testing** de los sistemas del cliente como condición previa al inicio (supuesto en la propuesta).

## 7. Recomendaciones para futuras estimaciones

- **Aplicar un factor de 1,4** a las horas de backend y QA de cualquier módulo de integración con sistemas legacy o terceros (ERP SOAP, mensajería tipo WhatsApp Business, etc.), sobre todo si no hay documentación vigente o ambiente de testing. Con ese factor, la integración con el ERP se habría estimado en 168 h de backend y 44,8 h de QA, prácticamente lo que se consumió (168 h y 44 h).
- **Mantener la contingencia del 10 %** sobre (desarrollo + PM) como valor por defecto. En TurnoFácil, sin contingencia, el proyecto se pasó; acá absorbió el desvío.
- **Considerar "conocidos"** los módulos de autenticación, backoffice, notificaciones por email, reportes e infraestructura: tomar como referencia los valores reales de este proyecto y de TurnoFácil, con complejidad baja o media.
- **No aplicar factor de riesgo** a pasarelas de pago con SDK y sandbox maduros.
- **Incluir siempre como supuesto** el acceso al ambiente de testing y a la documentación vigente de los sistemas del cliente desde el día uno, y validar conectividad en la primera semana.
- **Relevar códigos y datos maestros** (por ejemplo, códigos de producto duplicados) durante la preventa: si hay inconsistencias, presupuestar explícitamente una tabla de mapeo.
- **Reportes:** prever un margen para filtros adicionales que el cliente suele pedir al ver los primeros datos reales.
