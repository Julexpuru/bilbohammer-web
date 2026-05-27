# BH-006 - Conectar busqueda de partidas y gestion de mesas

Estado: done
Tipo: feature
Prioridad: P1
Area: juego-organizado
Owner: shared
Origen: backlog usuario
Ultima actualizacion: 2026-05-27

## Contexto

Bajo la fotografia funcional actual asumida para el backlog, la conexion principal entre busqueda o gestion de partidas y gestion de mesas puede darse por cerrada. Lo pendiente ya no es definir la union base del flujo, sino corregir detalles menores y anadir la capa de notificaciones.

## Alcance

- Definir que datos y acciones se comparten entre ambos apartados.
- Resolver el punto de union entre reserva/uso de mesas y ciclo de vida de partidas.
- Evitar duplicidades o estados contradictorios entre vistas.

No entra:

- Replantear desde cero el dominio de juego organizado.

## Criterios de aceptacion

- El usuario percibe un flujo unificado entre partidas y mesas.
- No hay pasos manuales confusos para coordinar ambos apartados.
- Quedan claras las dependencias funcionales entre oferta, propuesta, aceptacion y uso de mesa.

## Notas tecnicas

- Archivos probables: paginas y componentes de `mis-partidas`, `mesas`, calendario y APIs asociadas.
- Riesgos residuales: pequenos desajustes de estado o UX entre vistas al usar el flujo real; si aparecen, deben tratarse como estabilizacion en `BH-007`.
- Dependencias activas: ninguna para considerar cerrada la integracion base. `BH-004` pasa a ser una capa adicional sobre un flujo ya asumido como funcional.
- Estado asumido en backlog: la union principal entre ofertas, propuestas, confirmacion de partida y uso o reserva de mesa se considera suficientemente materializada para dar la tarea por cerrada.

## Historial

- 2026-05-09: tarea creada a partir del backlog funcional comunicado por el usuario.
- 2026-05-15: la tarea pasa a `in_progress` tras revisar el repo y confirmar implementacion activa del flujo de ofertas, propuestas, calendario y mis partidas.
- 2026-05-27: bajo el supuesto operativo actual de backlog, la tarea pasa a `done`; el flujo principal se considera cerrado y lo restante se reparte entre `BH-007` y `BH-004`.
