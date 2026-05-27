# BH-008 - Vista publica de mesas por QR

Estado: todo
Tipo: feature
Prioridad: P2
Area: juego-organizado
Owner: shared
Origen: backlog usuario
Ultima actualizacion: 2026-05-26

## Contexto

Se quiere colocar un QR fisico en cada mesa para abrir una URL publica y mostrar una vista simple con informacion de esa mesa: numero, juego asignado, foto de escenografia, layout (si aplica) y agenda del dia en curso para esa mesa.

## Alcance

- Definir una URL publica por mesa apta para QR.
- Mostrar una pagina ligera, mobile-first y sin login.
- Exponer como minimo:
  - numero o nombre de mesa;
  - juego asignado;
  - imagen de escenografia (`sceneryImagePath`);
  - layout de 40k (`layoutImagePath`) cuando exista;
  - calendario del dia actual para esa mesa (franjas reservadas y partidas).
- Definir comportamiento de estados sin datos (mesa sin juego, sin imagen o sin reservas hoy).

No entra:

- Generacion masiva de imagenes QR dentro de la propia web (se puede cubrir en otra tarea).
- Redisenar completo del modulo de mesas.
- Mostrar datos personales de jugadores en la vista publica.

## Criterios de aceptacion

- Cada mesa activa tiene una URL publica estable y compartible por QR.
- La pagina carga sin autenticacion y muestra correctamente la informacion base de mesa.
- Si la mesa tiene `layoutImagePath` de 40k, se muestra accion para abrir dicho layout.
- El calendario refleja solo el dia actual en zona horaria del club y solo para la mesa consultada.
- La vista publica no expone datos sensibles de usuarios.

## Notas tecnicas

- Archivos probables:
  - `src/app/` (nueva ruta publica de mesa para QR).
  - `src/app/api/` (endpoint publico o reutilizacion segura de endpoints existentes).
  - `src/lib/organized-tables.ts` o helper nuevo para formateo/estado.
- Modelo de datos ya disponible en `ClubTable`:
  - `name`, `gameId` o `gameLabel`, `layoutImagePath`, `sceneryImagePath`.
  - reservas y partidas via `TableReservation` y `Match`.
- Riesgos:
  - usar identificadores no estables para QR y romper enlaces al renombrar mesas;
  - mezclar datos internos con la vista publica si no se filtra bien el payload.
- Dependencias:
  - coordinar con `BH-005` (pulido de mesas) y `BH-006` (integracion final con partidas) para evitar duplicar logica de estado.

## Historial

- 2026-05-26: tarea creada a partir de peticion de funcionalidad futura para QR en mesas.
