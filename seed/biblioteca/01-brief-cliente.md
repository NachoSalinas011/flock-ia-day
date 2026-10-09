# Brief — Biblioteca de archivos

## Contexto
Estudio Jurídico Norte guarda expedientes en discos compartidos y mails. Cuesta encontrar la última versión de un PDF y no hay control de quién vio un archivo sensible.

## Objetivos
- Repositorio interno con login.
- Subir PDF, DOCX e imágenes a almacenamiento en la nube.
- Navegar por carpetas, previsualizar y controlar quién ve o edita.

## Funcionalidades pedidas
- Login, invitaciones al estudio y roles abogado / asistente / admin.
- Upload con límite de tamaño, tipos permitidos y versionado.
- Explorador de carpetas: buscar, mover, renombrar, papelera.
- Preview de PDF e imágenes; metadatos de expediente, cliente y etiquetas.
- Permisos por carpeta y auditoría de accesos.

## Restricciones
- OCR de expedientes queda fuera.
- No exponer links públicos a internet; solo usuarios del estudio.
- Storage en Amazon S3. Stack: React, NestJS, PostgreSQL.
