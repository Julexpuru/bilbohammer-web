# BH-002 - Definir alcance funcional de gestion documental

Estado: blocked
Tipo: decision
Prioridad: P1
Area: admin
Owner: shared
Origen: analisis del repo
Ultima actualizacion: 2026-05-09

## Contexto

Existe la ruta `/admin/gestion-documental`, pero actualmente solo muestra un placeholder. Sabemos que deberia alojar actas, archivos y recursos internos, pero el alcance no esta especificado.

## Alcance

- Definir que tipos de documentos se van a gestionar.
- Definir quien puede subir, editar, descargar y eliminar.
- Definir si hace falta versionado, categorias, busqueda o visibilidad por roles.
- Definir si el almacenamiento reutiliza la infraestructura actual de uploads.

No entra:

- Implementacion tecnica de la funcionalidad.
- Maquetacion final del modulo.

## Criterios de aceptacion

- Existe una definicion funcional minima del modulo.
- Queda claro que usuarios intervienen y que acciones puede hacer cada uno.
- Queda decidido si esta tarea se descompone en varias subtareas posteriores.

## Notas tecnicas

- Archivos probables: `src/app/admin/gestion-documental/page.tsx`, rutas API nuevas, posible reutilizacion de `uploads/`.
- Riesgos: si no se define bien el alcance, el modulo puede crecer de forma caotica.
- Dependencias: decision funcional previa.

## Historial

- 2026-05-09: tarea creada; marcada como `blocked` hasta definir alcance funcional.
