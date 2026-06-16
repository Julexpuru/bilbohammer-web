# BH-013 - Gestión web de reportes de partidas competitivas

Estado: todo
Tipo: feature
Prioridad: P2
Area: eventos
Owner: shared
Origen: desglose de BH-010/BH-011
Ultima actualizacion: 2026-06-05

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

## Historial

- 2026-06-05: tarea creada al aclarar que la organización necesita una bandeja web separada para revisar, corregir, aprobar o rechazar los reportes que entren desde Telegram.
