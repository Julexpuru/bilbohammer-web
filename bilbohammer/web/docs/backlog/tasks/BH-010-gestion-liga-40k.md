# BH-010 - Gestión integral de liga 40K desde eventos

Estado: in_progress
Tipo: feature
Prioridad: P2
Area: eventos
Owner: shared
Origen: planteamiento usuario
Ultima actualizacion: 2026-06-16

## Contexto

Se quiere estudiar y construir la gestión de la siguiente liga de Warhammer 40K desde la web, usando la página pública de eventos como punto de entrada y evitando depender de una hoja de cálculo externa como fuente principal.

El sistema actual de eventos tiene aforo y contador de reservas, pero no una lista real de inscritos gestionable por el organizador ni un flujo público para apuntarse una vez publicado el evento. Además, una liga necesita evolución acumulada, resultados de partidas, clasificaciones y varias crónicas asociadas al mismo evento.

El esquema operativo actual se apoya en tres hojas:

- `Tabla Liga`: clasificación específica de liga con puntuación simple, victoria 3 puntos, empate 1 punto y derrota 0 puntos.
- `Tabla Paladín`: clasificación global que recoge todas las partidas jugadas, tanto liga como pachanga, y calcula métricas más ricas como puntos de clasificación, puntos por partida, partidas jugadas, ganadas, empatadas, win rate, IFR, Elo y Elo ajustado.
- `Partidas`: registro base de partidas con jugador, facción, resultado, puntos, rival, tipo de partida y fecha. Esta hoja debe ser la referencia funcional para el almacenamiento persistente, porque es replicable en futuras ligas de 40K y en ligas de otros juegos.

## Alcance

- Definir inscripciones reales a eventos con lista de participantes, estados y gestión por organizador.
- Permitir a usuarios apuntarse o darse de baja desde la página pública del evento cuando el evento esté publicado y admita inscripciones.
- Representar la evolución de la liga dentro de la web: jornadas, partidas, resultados, clasificación y posible histórico.
- Separar el registro canónico de partidas de las vistas derivadas de clasificación.
- Estudiar una vista tipo tabla para sustituir o complementar la experiencia de hoja de cálculo.
- Diseñar entrada autónoma de resultados por jugadores mediante web.
- Cambiar la relación funcional evento-crónica para soportar 1:N cuando el evento sea una liga o campaña larga.
- Mantener el ciclo completo de inscripciones como conjunto de tareas a definir antes de implementar, no como un cambio implícito dentro de esta primera tarea paraguas.

No entra en esta tarea inicial:

- Implementar pagos reales sin una decision especifica de pasarela.
- Reemplazar todo el modulo de juego organizado si basta con integrarlo o extenderlo.
- Implementar bots de mensajería dentro de esta tarea. Telegram y WhatsApp quedan separados como `BH-011` y `BH-012`.

## Criterios de aceptacion

- Existe una propuesta de modelo de datos para inscripciones, partidas de liga, resultados y crónicas múltiples.
- La página de evento muestra plazas, inscritos y acción de inscripción cuando proceda.
- El organizador puede ver y gestionar participantes desde el panel de evento.
- La liga puede mostrar clasificación derivada de resultados persistidos, no de valores copiados manualmente.
- La clasificación de liga y la clasificación Paladín se comportan como vistas calculadas a partir del registro canónico de partidas.
- Los resultados enviados por jugadores quedan en estado revisable antes de impactar la clasificación si así se decide.
- La relación de crónicas permite enlazar varias publicaciones a un mismo evento y ordenarlas o etiquetarlas.
- Queda definido qué parte del ciclo de inscripciones entra en una primera fase y qué parte queda en tareas posteriores.

## Notas tecnicas

- Archivos probables: `prisma/schema.prisma`, rutas de `src/app/api/events`, páginas de `src/app/eventos`, `src/components/events/EventForm.tsx`, repositorios de novedades/crónicas y posibles rutas nuevas de integraciones.
- Decisión de primera fase: no reutilizar `Match` / `MatchParticipant` para resultados competitivos. Esos modelos quedan para juego organizado, disponibilidad, reservas de mesa y ciclo horario. La liga usa un subdominio competitivo propio que puede referenciar `Event`, `Game` y `User` sin heredar reglas de quedada.
- Modelos introducidos:
  - `EventRegistration` para inscripciones con estado, usuario, notas, fuente y datos de lista/ejército si aplica. Los estados funcionales iniciales son `INSCRITO` (pendiente de pago, se mostrará en naranja), `PAGADO` (se mostrará en verde) y `CANCELLED` (jugador retirado/cancelado).
  - `CompetitiveMatchReport` y `CompetitiveMatchReportPlayer` para reportes pendientes/revisables por canal (`WEB`, `TELEGRAM`, `ADMIN`, `IMPORT`).
  - `CompetitiveMatch` y `CompetitiveMatchPlayer` como registro canonico aprobado de partidas reutilizable por ligas y pachangas.
  - `EventChronicle` como tabla puente entre `Event` y `NewsArticle`.
- La diferencia funcional de `Partidas` queda reflejada con `CompetitiveMatchKind`: `LEAGUE` equivale a partidas que puntúan en Liga; `CASUAL` cubre pachangas u otras partidas que pueden alimentar Paladín.
- `Tabla Liga` y `Tabla Paladín` deberían implementarse como consultas o proyecciones calculadas, no como tablas editadas a mano.
- Primera capa de dominio en `src/lib/competitive-matches.ts`: alta de reporte, aprobación a partida canónica, rechazo, listado de reportes pendientes, clasificación de Liga y proyección Paladín desde partidas aprobadas.
- Primera vista tipo hoja implementada en `/eventos/[slug]/competitivo`: pestañas `Tabla Liga`, `Tabla Paladín` y `Partidas`, acceso inicial para organizadores/admin y tablas calculadas desde partidas aprobadas.
- Para validar diseño con datos sintéticos más adelante, la importación desde Excel o generadores debe entrar como reportes pendientes o fixtures controlados, no como escritura directa sobre clasificaciones calculadas.
- La formula de Elo/IFR importada del Apps Script queda fijada con `ELO_INICIAL = 1500`, `K = 32`, lambda IFR `5`, deduplicacion de partidas por pareja de jugadores y fecha, `IFR = media suavizada de ratings de rivales pre-actualizacion`, y `Elo Ajustado = Elo + IFR - 1500`.
- Flujo mínimo de inscripciones implementado:
  - La página pública del evento muestra participantes y plazas activas.
  - Un usuario autenticado puede apuntarse y cancelar su plaza si el evento admite inscripciones.
  - Los eventos `isMembersOnly` solo permiten autoinscripción a roles `SOCIO`, `JUNTA` o `ADMIN`.
  - Organizador/admin puede añadir participantes, buscar socios, editar nombre/facción/estado y eliminar registros.
  - La facción/lista durante la inscripción es opcional; la facción sí es obligatoria al reportar partidas.
- Ciclo de vida de eventos ampliado:
  - `registrationClosesAt` guarda el cierre opcional de inscripciones y debe ser anterior a `startsAt`.
  - `PREPARATION` representa el tramo entre cierre de inscripciones e inicio del evento.
  - `IN_PROGRESS` representa el tramo entre `startsAt` y `endsAt`.
  - La visualización pública calcula `PREPARATION`, `IN_PROGRESS` y `FINALIZED` por fechas, preservando estados manuales de control como `DRAFT`, `FINALIZED`, `POSTPONED` y `CANCELLED`.
  - Si hay cierre de inscripciones, no se aceptan nuevas altas públicas después de ese momento; si no lo hay, la inscripción pública se cierra al comenzar el evento.
- El campo `Event.capacityCurrent` debería pasar a ser derivado de inscripciones confirmadas o mantenerse solo como dato manual legacy.
- `Tabla Paladín`: `P. de Clasificación` es la suma de puntos de batalla de cada partida (`score`, escala 20-0) y `PpP` es la media de esos puntos por partida.
- Regla de dominio actual: los reportes y partidas competitivas deben estar completos. No se aceptan partidas sin jugador/rival, facción, resultado, puntos, tipo y fecha. Los campos opcionales podrán añadirse más adelante, pero no se permite persistir una partida base incompleta.
- Pendiente de definición antes de cerrar la tarea: ciclo completo de inscripciones, permisos de organizador, edición/corrección de reportes, y si las jornadas necesitan entidad propia o basta `roundNumber`.
- Pendiente de implementación UI/API: revisar si el flujo mínimo de inscripción cubre todos los datos administrativos que se quieran pedir en alta pública, por ejemplo lista/ejército obligatorio, pago externo o campos específicos por juego.
- Riesgos: reglas de puntuación de 40K cambiantes, duplicidad entre partidas de juego organizado y partidas de liga, spam o errores en resultados enviados por jugadores, y complejidad operativa de WhatsApp.
- Dependencias: decisión funcional sobre reglas de liga, estados de inscripción, aprobación de resultados, identidad de jugadores y criterios exactos de cálculo Paladín.

## Historial

- 2026-06-16: se crea la primera vista web de hojas competitivas por evento, con tablas navegables para Liga, Paladín y partidas aprobadas.
- 2026-06-04: primera fase implementada con migración Prisma `20260604120000_competitive_matches_base` y servicio común `src/lib/competitive-matches.ts`; se decide subdominio competitivo nuevo en vez de extender `Match`.
- 2026-06-04: se incorporan al modelo los estados de inscripción `INSCRITO`, `PAGADO` y `CANCELLED`, y se replica la fórmula de Elo/IFR del Apps Script en la proyección Paladín.
- 2026-06-04: se aclara que `P. de Clasificación` y `PpP` de Paladín salen de la suma/media de puntos de batalla por partida, no de victoria 3/empate 1/derrota 0.
- 2026-06-04: se implementa el flujo mínimo de inscripción web con panel en evento público y endpoints `/api/events/[id]/registrations`.
- 2026-06-04: se añaden `PREPARATION`, `IN_PROGRESS` y `registrationClosesAt` para diferenciar cierre de inscripciones, preparación previa y evento en curso.
- 2026-06-04: se fija que una partida/reporte competitivo base debe estar completo; `factionLabel` y `score` pasan a ser obligatorios por jugador.
- 2026-06-04: se amplía con el contexto de las hojas actuales: `Tabla Liga`, `Tabla Paladín` y `Partidas`; se separan los bots a tareas independientes.
- 2026-06-04: tarea creada a partir del planteamiento de gestionar la siguiente liga de 40K desde la web.
