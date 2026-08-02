# BH-020 - Fusión segura de usuarios duplicados

Estado: todo
Tipo: feature
Prioridad: P1
Area: auth
Owner: codex
Origen: incidencia de producción
Última actualización: 2026-08-02

## Contexto

Un mismo socio puede acabar con varias cuentas al usar correos o proveedores OAuth distintos. Desactivar una cuenta conserva la información, pero no resuelve por sí solo qué identidad debe conservar inscripciones, cuentas externas y actividad histórica.

## Alcance

- Añadir una acción administrativa explícita para elegir el usuario canónico y fusionar un duplicado en él.
- Reasignar de forma transaccional las relaciones compatibles, incluidas cuentas OAuth, inscripciones de eventos y datos competitivos.
- Detectar y resolver antes de ejecutar los conflictos de relaciones únicas.
- Desactivar el duplicado al terminar y dejar una trazabilidad de la operación.

No incluye el borrado físico automático de usuarios ni la deduplicación basada solamente en coincidencias de nombre.

## Criterios de aceptación

- Un administrador puede revisar qué datos se trasladarán antes de confirmar.
- No se pierde una inscripción ni una cuenta OAuth al fusionar usuarios.
- Si hay un conflicto que no puede resolverse automáticamente, la operación se cancela sin cambios parciales.
- El usuario canónico puede iniciar sesión con las identidades OAuth trasladadas.

## Notas técnicas

- Archivos probables: `src/app/admin/gestion-usuarios`, `src/app/api/admin/users`, `src/lib/auth.ts`, `prisma/schema.prisma`.
- Riesgos: claves únicas por evento/usuario, cuentas OAuth por proveedor, sesiones JWT preexistentes y relaciones de actividad con políticas `Cascade` o `SetNull`.
- Dependencias: diseñar primero una previsualización de conflictos y una política explícita para datos duplicados.

## Historial

- 2026-08-02: tarea creada tras una incidencia de usuario duplicado en una liga competitiva.
