# BH-015 - Validar cálculo de Paladín con Liga y Pachanga

Estado: done
Tipo: bug
Prioridad: P2
Area: eventos
Owner: codex
Origen: revisión funcional de 2026-07-22
Ultima actualizacion: 2026-07-22

## Contexto

La Tabla Paladín debe reflejar el rendimiento conjunto de partidas de Liga y Pachanga aprobadas del mismo evento. La implementación actual parece cumplirlo porque la consulta no filtra por tipo de partida, pero hay que consolidar esa regla y protegerla con pruebas para evitar una regresión futura.

## Alcance

- Confirmar y documentar que Paladín incluye partidas `LEAGUE` y `CASUAL` aprobadas del evento.
- Añadir o ampliar pruebas unitarias con ambos tipos de partida que validen puntos, partidas jugadas, Elo/IFR y `Clasif`.
- Revisar que la exportación de Paladín use exactamente el mismo conjunto de datos.

No entra:

- Cambiar la regla de la Tabla Liga, que sigue limitada a partidas de liga.
- Incluir partidas anuladas o de otros eventos.

## Criterios de aceptación

- Una partida de Liga y una Pachanga aprobadas del mismo evento cuentan ambas en Paladín.
- Una partida anulada no cuenta.
- La tabla y su exportación producen resultados consistentes.

## Notas técnicas

- Punto de partida: `listPaladinStandings` y `calculatePaladinStandings` en `src/lib/competitive-matches.ts`.
- La consulta actual filtra por evento, juego y estado `APPROVED`, sin filtrar `kind`; esta tarea debe convertir ese comportamiento esperado en una prueba explícita.

## Historial

- 2026-07-22: se añade prueba de regresión con una partida `LEAGUE` y otra `CASUAL`; ambas suman correctamente en Paladín. La exportación reutiliza `listPaladinStandings`, por lo que parte del mismo conjunto de partidas aprobadas.
- 2026-07-22: tarea creada tras confirmar que el comportamiento actual incluye Liga y Pachanga, pendiente de blindarlo con regresión.
