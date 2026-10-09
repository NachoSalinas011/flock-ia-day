# Cierre del proyecto — Biblioteca de archivos

## Estimado vs. real
| Módulo | Estimado (h) | Real (h) | Desvío | Causa |
|---|---|---|---|---|
| Autenticación y gestión de usuarios | 100 | 102 | +2 % | Flujo de aceptación de invitaciones |
| Carga y almacenamiento de archivos | 152 | 200 | +32 % | Prefirmadas, CORS, >100 MB y versionado no briefado |
| Explorador de archivos y carpetas | 136 | 168 | +24 % | Drag & drop entre carpetas |
| Preview y metadatos | 92 | 90 | −2 % | Visor PDF simple; DOCX solo descarga |
| Permisos y compartir | 132 | 172 | +30 % | Herencia padre→hijo y auditoría pedida en UAT |

## Duración
Planificada: según equipo FT/PT del JSON · Real: se estiró por S3/versionado y ACL.

## Lecciones aprendidas
- Uploads a S3 con versionado y archivos grandes se desvían ~40 % si el contrato de storage no está cerrado en la propuesta.
- Autenticación y gestión de usuarios cierra cerca: ancla para calibrar login en proyectos web.
- Permisos heredados por carpeta son HIGH; no estimarlos como un ABM de roles.
- El explorador se desvía por interacción (drag & drop, papelera), no por el modelo de datos.
