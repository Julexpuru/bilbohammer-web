# BH-014 - Página competitiva de liga

Estado: done
Tipo: feature
Prioridad: P2
Area: eventos
Owner: shared
Origen: refinamiento de BH-010/BH-013
Ultima actualizacion: 2026-06-19

## Contexto

La liga ya tiene base de datos competitiva, envío desde Telegram, revisión web de reportes y una primera vista pública de datos competitivos. Falta cerrar el ciclo completo para que la página competitiva de una liga sea realmente operativa: envío web, corrección, detalle, auditoría, deduplicación de partidas de liga y mejoras de consulta.

La prioridad funcional es la liga estándar. `Tabla Paladín`, pachangas y rendimiento general son extensiones particulares del caso actual de Bilbohammer, no una obligación para todas las ligas futuras.

## Alcance

Entra:

- Envío web de resultados para jugadores autenticados.
- Edición/corrección de reportes antes de aprobar: fecha, rival, facciones, puntos, resultado, tipo y notas.
- Detalle de partida aprobada con jugadores, facciones, puntos, notas, origen y trazabilidad.
- Anulación o corrección controlada de partidas aprobadas.
- Reglas de duplicados para liga.
- Permisos finos: público ve clasificaciones y partidas; jugador envía reportes; organizador/admin revisa, corrige, aprueba, rechaza y anula.
- Filtros en `Partidas`: jugador, facción, tipo, ronda, fecha y liga/pachanga.
- Enlaces cruzados: jugador de clasificación a sus partidas; partida de vuelta al contexto de clasificación.
- Métricas resumen: líder de Liga, líder Paladín cuando aplique, total de partidas y última actualización.
- Tooltip de ayuda con icono de pregunta para criterios de cálculo: victoria 3, empate 1, derrota 0; Paladín por puntos de batalla, PpP, Elo/IFR.
- Tabla Paladín ordenada por `Clasif`, con vista normal simplificada y vista técnica para organizador/admin con fórmula, IFR y Elo.
- Opciones de reportes/competitivo por evento: mostrar/ocultar ronda, tipo de puntuación (`0-100` por jugador o suma exacta `20`) y mínimo de partidas para sorteos.
- Exportación de `Tabla Liga`, `Tabla Paladín` cuando aplique y `Partidas` a `.xlsx` o `.csv`.
- Datos sintéticos para validar diseño mediante fixture CSV externo e importación controlada a reportes pendientes, no mediante escritura directa de clasificaciones ni generador en la página pública.
- Auditoría clara de quién envió, revisó, corrigió o anuló cada dato.
- Protección básica contra spam/error: límites por usuario, validaciones de fecha/participantes y mensajes claros.
- Notificaciones a organizadores por reportes pendientes y al jugador cuando se apruebe o rechace su reporte.
- Vinculación controlada de participantes manuales a usuarios registrados si se registran más adelante, preferentemente por correo y con permisos de organizador/admin.
- Feedback de errores de revisión por tarjeta, sin sacar al organizador de la bandeja.

No entra de momento:

- Rehacer el diseño final de todas las tablas antes de cerrar la funcionalidad.
- Convertir cada evento competitivo en un motor configurable genérico para torneos, campañas y ligas especiales.
- Importar datos históricos reales desde Excel como migración productiva.

## Criterios de aceptacion

- Un jugador autenticado puede enviar un resultado desde la web y este queda como `CompetitiveMatchReport` pendiente.
- Un organizador/admin puede corregir un reporte pendiente antes de aprobarlo.
- Un organizador/admin ve aviso de duplicado si una partida de liga ya existe entre los mismos jugadores dentro del mismo evento.
- Una partida no puede aprobarse como `LEAGUE` si ya existe una partida de liga previa en el mismo evento entre los mismos jugadores; la corrección preventiva es cambiarla a `CASUAL`.
- Un visitante público puede consultar clasificaciones y partidas aprobadas sin iniciar sesión.
- Una partida aprobada tiene página de detalle con trazabilidad suficiente.
- Una partida aprobada puede corregirse o anularse sin perder auditoría.
- La página competitiva permite filtrar partidas por jugador, facción, tipo, ronda y fecha.
- Las tablas se pueden exportar a formato reutilizable.
- Un organizador/admin puede vincular una inscripción manual a un usuario activo por correo sin partir clasificaciones ya existentes.
- Existe un CSV sintético de referencia y un importador operativo que crea reportes pendientes para validar diseño/cálculos.
- La Tabla Paladín usa `Clasif` como métrica de ordenación y permite a organizador/admin ver y editar la fórmula aplicada con auditoría por evento.
- Un organizador/admin puede configurar si los reportes usan ronda y qué tipo de puntuación validan.
- Si el mínimo de partidas para sorteos es mayor que 0, la Tabla Liga muestra si cada jugador lo cumple; si es 0, la columna se oculta.
- Ninguna tabla competitiva muestra números con más de 2 decimales.
- Telegram respeta las opciones de reportes del evento en el flujo guiado y en modo rápido.
- Las tablas competitivas se mantienen como tablas reales también en móvil, con scroll horizontal en vez de tarjetas por fila.
- Los participantes activos del evento aparecen en `Tabla Liga` y `Tabla Paladín` aunque todavía no tengan partidas aprobadas, con métricas a 0.
- La gestión de participantes queda visible solo para organizadores/admins desde la página principal del evento, plegada por defecto y con control para mostrar/ocultar; la consulta pública se hace desde las hojas competitivas.

## Notas tecnicas

- Archivos probables: `src/lib/competitive-matches.ts`, `src/app/eventos/[slug]/competitivo`, `src/app/eventos/[slug]/reportes`, nuevas rutas/API o Server Actions de reportes y partidas competitivas.
- La regla de duplicados de liga debe comparar la pareja de jugadores de forma no ordenada dentro del mismo `eventId` y solo para `kind = LEAGUE`.
- En envío y revisión debe avisarse si el resultado parece duplicado; en aprobación debe bloquearse si sigue marcado como liga.
- Para la liga estándar, la clasificación principal es `Tabla Liga`; `Tabla Paladín` y pachangas deben tratarse como extensión del evento actual, no como requisito base de todas las ligas.
- El formato móvil definitivo se deja para después de cerrar el comportamiento funcional; mientras tanto debe mantenerse usable y sin desbordes.
- Los participantes manuales usan `playerName` como identidad temporal. Si después se vinculan a un usuario registrado, la vinculación debe propagar `userId` a reportes y partidas competitivas del mismo evento que coincidan por nombre para evitar duplicar filas de clasificación.
- Los nombres de inscripción deben ser únicos por evento, incluso antes de vincular usuario, para que la identidad temporal por `playerName` sea segura.
- El servicio común bloquea reportes con el mismo jugador en ambos lados y valida la puntuación configurada antes de crear, corregir o aprobar.
- Tests unitarios cubiertos: cálculo de Liga, Paladín/Elo/IFR, deduplicación y empates. Quedan como ampliación futura pruebas de integración para permisos público/jugador/organizador/admin y auditoría de correcciones/anulaciones.
- Riesgos: correcciones posteriores a aprobación pueden invalidar clasificaciones visibles; hay que diseñarlas como cambios auditados y recalcular desde fuente canónica.
- Dependencias: `BH-013` para revisión/corrección de reportes y `BH-010` para reglas de clasificación.

## Historial

- 2026-06-20: se bloquea la aprobación de reportes con el mismo jugador en ambos lados, se limita la visualización/exportación numérica a 2 decimales y se añade modo de puntuación configurable para reportes (`0-100` individual o suma `20`).
- 2026-06-20: se añade feedback de errores por tarjeta en revisión de reportes y se alinea Telegram con las opciones del evento para puntuación y ronda.
- 2026-06-20: se añade mínimo configurable de partidas para sorteos, columna condicional en Tabla Liga, tabla real con scroll horizontal en móvil y nota de fixture visible solo para organizador/admin.
- 2026-06-20: se compacta la tabla competitiva en móvil, se añade resaltado de la última fila pulsada, se añaden participantes activos sin partidas a Liga/Paladín y se limita el panel de participantes del evento a gestión privada de organizador/admin.
- 2026-06-20: se deja la gestión de participantes plegada por defecto y se ajusta la cabecera competitiva para mostrar el nombre del evento en la miga sin repetirlo bajo el título.
- 2026-06-20: se añade configuración de presentación de reportes por evento con opción para mostrar/ocultar ronda en la bandeja de revisión.
- 2026-06-19: se persiste la fórmula Paladín por evento con auditoría; al guardarla se revalida la página y la tabla se recalcula en la siguiente lectura/exportación desde partidas aprobadas.
- 2026-06-19: se corrige el retorno de acciones de revisión para conservar la bandeja de reportes y se ajusta Paladín: `Clasif` pasa a ser la métrica de ordenación, IFR/Elo se ocultan en vista normal y quedan visibles en modo técnico para organizador/admin junto a la fórmula.
- 2026-06-19: se añade importador operativo de CSV a reportes competitivos pendientes con modo dry-run por defecto y opción de crear inscripciones manuales faltantes.
- 2026-06-19: se cierra el alcance funcional actual con fixture CSV de reportes sintéticos, reducción de ruido en tarjetas móviles de `Partidas` y pruebas unitarias de cálculo competitivo con Vitest. Se descarta exponer un generador sintético en la página web para evitar confusión operativa.
- 2026-06-18: se añaden notificaciones competitivas: aviso a organizadores/admins cuando entra un reporte pendiente y aviso al jugador cuando su reporte se aprueba o rechaza, reutilizando preferencias in-app/email/push.
- 2026-06-18: se añaden enlaces cruzados desde jugadores en clasificaciones y partidas hacia la hoja `Partidas` filtrada por jugador, y un límite básico de 5 reportes por usuario/evento cada 10 minutos en el servicio común.
- 2026-06-18: se añade estado de partida competitiva (`APPROVED`/`VOIDED`), auditoría de correcciones/anulaciones y gestión desde el detalle de partida aprobada; las clasificaciones, duplicados y exportaciones ignoran partidas anuladas.
- 2026-06-18: se fuerza unicidad de nombres de participantes por evento y se añaden filtros específicos en `Partidas`, métricas resumen, ayuda de criterios de cálculo y exportación CSV pública de hojas competitivas.
- 2026-06-18: se permite vincular participantes manuales a usuarios registrados por correo desde la gestión de participantes, propagando `userId` a reportes y partidas competitivas del evento que coincidan por nombre.

- 2026-06-18: se añade corrección de reportes pendientes desde la bandeja de revisión y detalle público de partida aprobada enlazado desde la hoja `Partidas`.

- 2026-06-18: primera implementación: envío web de resultados para jugadores inscritos, creación de reportes pendientes, aviso/bloqueo de duplicados de liga y bloqueo de aprobación si ya existe una partida de liga entre los mismos jugadores en el evento.
- 2026-06-18: tarea creada al refinar la siguiente fase de la página competitiva, priorizando ligas y precisando la regla de duplicados de liga.
