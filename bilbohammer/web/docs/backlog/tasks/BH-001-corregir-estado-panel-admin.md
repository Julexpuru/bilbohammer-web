# BH-001 - Corregir estado reflejado en el panel admin

Estado: todo
Tipo: docs
Prioridad: P2
Area: admin
Owner: codex
Origen: analisis del repo
Ultima actualizacion: 2026-05-15

## Contexto

La pagina `/admin` muestra modulos como "pendiente" aunque parte de ellos ya existe y esta operativa. Eso convierte el dashboard en una fuente poco fiable sobre el estado real del producto.

## Alcance

- Revisar el copy de la pagina `/admin`.
- Reflejar con fidelidad que modulos existen ya.
- Evitar presentar como pendiente la gestion de usuarios si ya esta disponible.

No entra:

- Redisenar todo el panel admin.
- Crear nuevas herramientas administrativas.

## Criterios de aceptacion

- La pagina `/admin` no indica como pendiente funcionalidades ya implementadas.
- El texto del dashboard coincide con el estado real del proyecto.
- El cambio no altera permisos ni navegacion.

## Notas tecnicas

- Archivos probables: `src/app/admin/page.tsx`
- Riesgos: muy bajos; es principalmente correccion de copy.
- Dependencias: ninguna.

## Historial

- 2026-05-09: tarea creada a partir del analisis del dashboard admin.
- 2026-05-15: se revisa `/admin` y sigue mostrando como pendientes modulos ya operativos, por lo que la tarea continua vigente sin cambios funcionales.
