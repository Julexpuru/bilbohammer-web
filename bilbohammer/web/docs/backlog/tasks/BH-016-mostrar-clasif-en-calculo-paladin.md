# BH-016 - Mostrar Clasif como última columna al ver el cálculo de Paladín

Estado: done
Tipo: bug
Prioridad: P2
Area: eventos
Owner: codex
Origen: revisión funcional de 2026-07-22
Ultima actualizacion: 2026-07-22

## Contexto

En la hoja Paladín, el botón `Mostrar cálculo` es visible solo para admin/organizador. Al activarlo debe facilitar la comprobación del criterio de ordenación de la clasificación. Actualmente la vista técnica añade columnas de cálculo, pero termina en `Elo ajustado`; se solicita que la última columna sea `Clasif`, el valor por el que realmente se ordena la tabla.

## Alcance

- Ajustar el orden de columnas de la vista técnica de Paladín para que `Clasif` sea la última.
- Mantener visibles las métricas técnicas necesarias (IFR, Elo y Elo ajustado).
- Conservar la restricción de acceso de la vista técnica a admin/organizador.

## Criterios de aceptación

- Sin cálculo, la tabla conserva su presentación simplificada.
- Con cálculo activo, la última columna es `Clasif` y contiene el valor usado para ordenar.
- IFR deja de ocupar la posición final y sigue disponible como métrica técnica.
- El botón y el panel técnico no se exponen a visitantes ni jugadores sin permisos de gestión.

## Notas técnicas

- Punto de partida: `paladinCalculationColumns` en `src/app/eventos/[slug]/competitivo/page.tsx`.

## Historial

- 2026-07-22: se reordena la vista técnica para que `Clasif` sea la última columna, conservando IFR, Elo y Elo ajustado como métricas de auditoría previas.
- 2026-07-22: tarea creada a partir de observación de la vista técnica de Paladín.
