# BH-013 - Gestión web de reportes de partidas competitivas

Estado: in_progress
Tipo: feature
Prioridad: P2
Area: eventos
Owner: shared
Origen: desglose de BH-010/BH-011
Ultima actualizacion: 2026-06-19

## Contexto

El bot de Telegram y futuros canales web deben crear `CompetitiveMatchReport` en estado pendiente. La organización necesita una superficie web para revisar esos reportes antes de convertirlos en partidas aprobadas que alimenten clasificaciones de Liga y Paladín.

## Alcance

- Mostrar una bandeja de reportes pendientes por evento/liga.
- Permitir revisar jugador, rival, facciones/listas, resultado, puntos, fecha, canal de origen y notas.
- Permitir aprobar un reporte y crear la `CompetitiveMatch` canónica mediante el servicio común.
- Permitir rechazar un reporte con motivo visible para auditoría.
- Permitir corregir campos antes de aprobar, si el reporte tiene errores menores.
- Mostrar trazabilidad: canal `WEB`, `TELEGRAM`, `ADMIN` o `IMPORT`, usuario que envió, `externalSubmitterId` y `externalMessageId` cuando existan.

No entra:

- Recalcular clasificaciones dentro de esta pantalla; deben seguir saliendo de las consultas/proyecciones del dominio competitivo.
- Crear reglas alternativas por canal que dupliquen `src/lib/competitive-matches.ts`.
- Implementar WhatsApp.

## Criterios de aceptacion

- Un organizador/admin puede ver reportes pendientes de una liga.
- Un organizador/admin puede aprobar un reporte y este pasa a partida canónica.
- Un organizador/admin puede rechazar un reporte con motivo.
- Las acciones quedan trazables con usuario revisor y fecha.
- Los reportes procedentes de Telegram son indistinguibles funcionalmente de otros reportes salvo por su canal y metadatos.

## Notas tecnicas

- Reutilizar `approveCompetitiveMatchReport`, `rejectCompetitiveMatchReport` y `listPendingCompetitiveMatchReports` de `src/lib/competitive-matches.ts`.
- Añadir endpoints de revisión si no basta con Server Actions/API routes existentes.
- Encajar la UI dentro de la página del evento o una sección de gestión ligada al evento.
- Validar permisos con las mismas reglas de organizador/admin usadas en eventos.
- Coordinar con `BH-011`: el bot crea reportes pendientes, esta tarea los gestiona.
- Primera fase cerrada con bandeja mínima de solo lectura + aprobar/rechazar; la edición correctiva previa a aprobar queda diferida a una siguiente iteración si hace falta tocar demasiado dominio o UX.

- La corrección de reportes queda ligada a `BH-014`: antes de aprobar debe poder cambiarse tipo, fecha, rival, facciones, resultado, puntos y notas.
- Regla refinada de duplicados: no puede aprobarse como partida de liga una partida entre los mismos jugadores dentro del mismo evento si ya existe otra partida de liga previa entre ambos. En revisión debe avisarse y la corrección preventiva es cambiar el reporte a pachanga (`CASUAL`) si procede.

## Bugs pendientes

- Validar en producción que aprobar/rechazar/corregir permanece en `/eventos/[slug]/reportes`. Se ha endurecido el flujo para no usar `redirect()` en esas Server Actions y limitarse a revalidar la bandeja.

## Historial

- 2026-06-20: se endurece el bug de navegación eliminando el `redirect()` de aprobar/rechazar/corregir reportes; las acciones revalidan la bandeja y dejan al navegador en la misma página. Se añade página de opciones de reportes para configurar si se muestra la ronda.

- 2026-06-19: se reabre la tarea por bug pendiente: aprobar/rechazar reportes sigue redirigiendo a la página principal del evento en producción.

- 2026-06-18: se marca como cerrada tras completar la bandeja de revisión, aprobación/rechazo y corrección previa a aprobación mediante la continuación en `BH-014`.

- 2026-06-18: se precisa que la edición de reportes y la regla estricta de duplicados de liga se implementarán en `BH-014`.

- 2026-06-05: tarea creada al aclarar que la organización necesita una bandeja web separada para revisar, corregir, aprobar o rechazar los reportes que entren desde Telegram.
- 2026-06-16: se implementa la primera fase segura en web: página por evento para listar pendientes, acceso por admin/organizador y acciones de aprobar o rechazar reutilizando el servicio común; la edición detallada se aplaza.
