# BH-001 - Corregir estado reflejado en el panel admin

Estado: done
Tipo: docs
Prioridad: P2
Area: admin
Owner: codex
Origen: analisis del repo
Ultima actualizacion: 2026-08-02

## Contexto

La página raíz `/admin` era un placeholder sin uso real que mostraba módulos como pendientes aunque ya existían flujos operativos. Los módulos de gestión sí necesitan vivir bajo el espacio común `/admin/*`, pero no se prevé una función propia para un panel general.

## Alcance

- Eliminar la página raíz `/admin` sin afectar las rutas hijas.
- Mantener la gestión de usuarios y documental bajo `/admin/*` como espacio común de rutas.

No entra:

- Redisenar todo el panel admin.
- Crear nuevas herramientas administrativas.

## Criterios de aceptacion

- `/admin` ya no presenta un dashboard sin propósito funcional.
- Las rutas `/admin/gestion-usuarios` y `/admin/gestion-documental` siguen funcionando y accesibles desde la navegación de club.
- El cambio no altera permisos ni la navegación de los módulos.

## Notas tecnicas

- Archivo afectado: `src/app/admin/page.tsx`.
- Riesgos: bajos; no existían enlaces internos hacia la ruta raíz.
- Dependencias: ninguna.

## Historial

- 2026-08-02: se elimina el placeholder de `/admin`. Se conserva `/admin/*` como espacio común de rutas administrativas, sin crear un panel general sin función definida.

- 2026-05-09: tarea creada a partir del analisis del dashboard admin.
- 2026-05-15: se revisa `/admin` y sigue mostrando como pendientes modulos ya operativos, por lo que la tarea continua vigente sin cambios funcionales.
