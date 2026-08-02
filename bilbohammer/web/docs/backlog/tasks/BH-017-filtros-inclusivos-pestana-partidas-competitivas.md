# BH-017 - Hacer inclusivos los filtros de la pestaña Partidas competitivas

Estado: done
Tipo: bug
Prioridad: P2
Area: eventos
Owner: codex
Origen: revisión funcional de 2026-07-22
Ultima actualizacion: 2026-08-02

## Contexto

En Datos competitivos, la pestaña pública `Partidas` permite revisar a posteriori todas las partidas aprobadas de la liga. Sus filtros por jugador, facción, tipo, ronda y fecha deben permitir localizar partidas empezando por cualquier criterio aislado y refinando después con otros. Se ha observado que el filtro parece exigir completar el resto de campos para devolver resultados, lo que sugiere una composición exclusiva o valores vacíos tratados como condiciones activas.

## Alcance

- Localizar los filtros de la pestaña `Partidas` y reproducir el caso.
- Aplicar cada criterio solo cuando tenga valor; los criterios informados se combinan entre sí para refinar el resultado.
- Si no hay criterios, mostrar todas las partidas aprobadas del evento.
- Validar al menos búsqueda por jugador aislada y combinación con otros criterios disponibles.

No entra:

- Alterar permisos de acceso, acciones de aprobar/rechazar/corregir ni la regla de duplicados.

## Criterios de aceptación

- Buscar solo por nombre de jugador devuelve sus partidas coincidentes.
- Cada filtro adicional reduce el conjunto sin obligar a rellenar campos ajenos.
- Con todos los filtros vacíos se muestran todas las partidas aprobadas del evento.
- Los resultados siguen limitados al evento seleccionado y excluyen partidas anuladas.

## Notas técnicas

- Punto de partida: `src/app/eventos/[slug]/competitivo/page.tsx` y los componentes cliente de la tabla de partidas.
- Antes de cambiar comportamiento hay que identificar si el problema está en la consulta, en la serialización de parámetros o en el filtrado del cliente.

## Historial

- 2026-08-02: comprobado manualmente; el comportamiento de filtros es correcto y la tarea se cierra sin cambios adicionales.

- 2026-07-22: se revisa la implementación local. Cada filtro se aplica solo si contiene valor y los criterios informados se combinan para refinar; con todos vacíos devuelve todas las partidas aprobadas. Queda pendiente reproducir la discrepancia observada en producción o contrastar el commit desplegado antes de modificar la lógica.
- 2026-07-22: tarea creada para corregir el comportamiento de filtrado observado en la pestaña pública `Partidas`.
