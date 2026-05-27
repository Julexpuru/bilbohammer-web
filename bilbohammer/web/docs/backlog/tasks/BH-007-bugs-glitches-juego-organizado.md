# BH-007 - Corregir bugs y glitches de juego organizado

Estado: in_progress
Tipo: bug
Prioridad: P1
Area: juego-organizado
Owner: codex
Origen: backlog usuario
Ultima actualizacion: 2026-05-27

## Contexto

Bajo la fotografia funcional actual asumida para el backlog, juego organizado ya estaria funcionalmente cerrado en todo lo principal salvo notificaciones y pequenas correcciones. Eso convierte esta tarea en el contenedor activo para la pasada de estabilizacion y remate menor del modulo.

## Alcance

- Detectar y corregir bugs funcionales.
- Corregir glitches visuales o de interaccion.
- Revisar coherencia del conjunto y de los flujos cruzados.
- Registrar explicitamente cualquier incidencia menor que no compense resolver de inmediato.

No entra:

- Nuevas features fuera del alcance de juego organizado.

## Criterios de aceptacion

- Los flujos principales de juego organizado se pueden usar de extremo a extremo sin fallos evidentes.
- Los glitches conocidos quedan corregidos o registrados de forma explicita.
- Si quedan incidencias menores, se documentan como tareas separadas o como remates pendientes claramente listados.

## Notas tecnicas

- Archivos probables: todo el modulo `juego-organizado` y APIs relacionadas.
- Riesgos: mezclar correcciones menores reales con trabajo de nueva funcionalidad y volver difuso el cierre.
- Dependencias: ya no depende de esperar a `BH-005` ni `BH-006`; puede avanzar en paralelo a `BH-004` mientras notificaciones siga como frente separado.
- Estado asumido en backlog: esta pasa a ser la tarea activa para absorber las correcciones menores restantes del modulo ahora que el flujo principal se da por terminado.

## Historial

- 2026-05-09: tarea creada a partir del backlog funcional comunicado por el usuario.
- 2026-05-15: se mantiene en `todo`; el flujo principal de juego organizado aun esta moviendose y no conviene tratar esta tarea como cerrable todavia.
- 2026-05-27: bajo el supuesto operativo actual de backlog, la tarea pasa a `in_progress` para recoger las correcciones menores restantes del modulo mientras `BH-004` cubre la capa de notificaciones.
