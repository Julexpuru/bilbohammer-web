# BH-005 - Pulir y completar el apartado de mesas

Estado: done
Tipo: feature
Prioridad: P1
Area: juego-organizado
Owner: codex
Origen: backlog usuario
Ultima actualizacion: 2026-05-27

## Contexto

Bajo la fotografia funcional actual asumida para el backlog, el apartado de mesas puede considerarse ya suficientemente cerrado dentro de juego organizado. Lo que queda pendiente no es un pulido estructural del modulo, sino correcciones menores o ajustes puntuales que deben caer en `BH-007`.

## Alcance

- Revisar el estado funcional actual del apartado de mesas.
- Completar las partes inacabadas.
- Mejorar la consistencia visual y operativa donde ahora se note provisional o incompleto.

No entra:

- Integrar completamente mesas con el resto del flujo si eso requiere decisiones de `BH-006`.

## Criterios de aceptacion

- El apartado de mesas deja de sentirse incompleto.
- Sus flujos principales funcionan sin pasos ambiguos ni UI claramente provisional.
- Queda preparado para su conexion con el resto de juego organizado.

## Notas tecnicas

- Archivos probables: `TableMap.tsx`, rutas y paginas de `mesas`, posibles helpers asociados.
- Riesgos residuales: que aparezcan pequenos ajustes de UX o coherencia al usarlo junto con el flujo final de partidas; esos ajustes ya no justifican mantener esta tarea abierta.
- Dependencias: ninguna activa; la integracion principal se considera absorbida por `BH-006`.
- Estado asumido en backlog: el apartado de mesas ya no se trata como un frente independiente pendiente, sino como una pieza funcionalmente cerrada salvo correcciones menores.

## Historial

- 2026-05-09: tarea creada a partir del backlog funcional comunicado por el usuario.
- 2026-05-15: se revisa el repo y la tarea sigue pendiente de empuje especifico; no muestra avance equivalente al flujo de partidas y propuestas.
- 2026-05-27: bajo el supuesto operativo actual de backlog, la tarea pasa a `done`; cualquier ajuste menor restante del modulo de mesas se canaliza a `BH-007`.
