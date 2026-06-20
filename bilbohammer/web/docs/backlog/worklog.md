# Worklog

Registro cronologico breve de trabajo realizado o contexto consolidado.

## 2026-06-20

- Se corrige el dominio competitivo para bloquear reportes con el mismo jugador en ambos lados, se limita la salida de tablas/exportaciones a 2 decimales y se añade modo de puntuación configurable para reportes: puntos individuales 0-100 o suma exacta 20.
- Se endurece el flujo de revisión de reportes competitivos para que aprobar/rechazar/corregir no haga `redirect()` y permanezca en la bandeja tras revalidar. Se añade configuración de reportes por evento con opción admin/organizador para mostrar u ocultar la ronda.

## 2026-06-19

- Se reabre `BH-013` por bug pendiente: aprobar/rechazar reportes sigue redirigiendo a la página principal del evento en producción. Se añade fixture CSV de regresión para duplicados, pachangas, empates, nombres problemáticos e idempotencia, junto con SQL revisable para resetear datos competitivos de un evento.
- Se añade configuración competitiva persistente por evento para la fórmula Paladín, con auditoría de cambios; la tabla y la exportación recalculan `Clasif` desde partidas aprobadas usando la fórmula guardada.
- Se corrige la navegación tras aprobar/rechazar/corregir reportes competitivos para volver siempre a la bandeja de revisión; además, Paladín pasa a ordenarse por `Clasif`, oculta IFR/Elo en vista normal y añade vista técnica de cálculo para organizador/admin.
- Se añade importador operativo de CSV para reportes competitivos: `npm run import:competitive-reports` valida por defecto, `--apply` crea `CompetitiveMatchReport` pendientes y `--ensure-registrations` puede crear participantes manuales faltantes.
- Se cierra el alcance funcional actual de `BH-014`: se evita exponer un generador sintético en la página competitiva y se deja un CSV de fixture para importación futura controlada; se añade `npm test` con Vitest y pruebas unitarias de Liga, Paladín/Elo, deduplicación y empates; se reduce el ruido de las tarjetas móviles de `Partidas`.

## 2026-06-18

- Se añaden notificaciones competitivas a `BH-014`: organizadores/admins reciben aviso de reportes pendientes y el jugador que envió el reporte recibe aviso al aprobarse o rechazarse, usando las preferencias existentes.
- Se añaden a `BH-014` enlaces cruzados desde jugadores en clasificaciones/partidas hacia `Partidas` filtrada por jugador y un límite básico anti-spam de reportes por usuario/evento en el servicio competitivo común.
- Se amplía `BH-014` con estado y auditoría de partidas competitivas aprobadas: corrección/anulación desde el detalle, historial básico, y exclusión de partidas anuladas en clasificaciones, duplicados y exportaciones.
- Se amplía `BH-014` con unicidad de nombres de participantes por evento, filtros específicos en la hoja `Partidas`, métricas de líderes/última actualización, ayuda de criterios de cálculo y exportación CSV pública de hojas competitivas.
- Se añade a `BH-014` la vinculación de participantes manuales a usuarios registrados por correo desde la gestión de participantes, propagando `userId` a reportes y partidas competitivas del evento para evitar clasificaciones partidas.
- Se inicia la implementación de `BH-014`: formulario web de envío de resultados para jugadores inscritos, creación de `CompetitiveMatchReport` pendiente, aviso/bloqueo de duplicados de liga en envío/revisión y bloqueo definitivo al aprobar si ya existe una partida de liga entre los mismos jugadores en el evento.
- Se amplía `BH-014` con corrección de reportes pendientes desde revisión y página pública de detalle de partida aprobada con trazabilidad básica.
- Se crea `BH-014 - Página competitiva de liga` para capturar la siguiente fase: envío web, corrección de reportes, detalle/corrección de partidas aprobadas, duplicados de liga, filtros, exportación, auditoría, notificaciones y mejora móvil posterior a la funcionalidad.
- Se refina el criterio de `BH-010`: la liga estándar se centra en `Tabla Liga`; `Tabla Paladín`, pachangas y rendimiento general quedan como extensiones particulares del evento actual, no como requisito base de todas las ligas.

## 2026-06-16

- Se amplía `BH-010` con la primera vista web tipo hoja en `/eventos/[slug]/competitivo`: botón desde el evento, pestañas para `Tabla Liga`, `Tabla Paladín` y `Partidas`, tablas responsivas con búsqueda/ordenación mediante TanStack Table y datos calculados desde partidas aprobadas.

- Se inicia `BH-013` con una primera bandeja web de revisión por evento para reportes competitivos pendientes: acceso limitado a admin/organizadores, listado de contexto clave y acciones de aprobar o rechazar usando el servicio común; la edición previa a aprobar queda documentada para una iteración posterior.

- Se ajusta el bot de `BH-011` para validar facciones contra el catálogo compartido de `src/lib/games.ts` en `w40k`, `aos` y `tow`: el flujo guiado muestra lista numerada y el modo rápido exige nombres canónicos.

- Se implementa el flujo guiado de `BH-011`: sesiones persistidas en `TelegramBotSession`, soporte de botones/callbacks de Telegram, selección de liga/evento como primer paso, pachangas solo dentro de un marco con inscripción, validación de usuarios inscritos, facciones obligatorias para ambos jugadores, puntos como enteros no negativos sin asumir WTC y confirmación antes de crear `CompetitiveMatchReport`.
- Se completa la primera pasada de usabilidad del flujo guiado de `BH-011`: cancelación consistente, botón `Empezar de nuevo` y edición desde el resumen final para liga, rival, facciones, resultado, puntos y fecha.

## 2026-06-05

- Se mejora `BH-011` con botón `Conectar Telegram` en `Mi Perfil`: genera el código temporal, abre Telegram mediante deep link cuando está disponible y muestra el comando `/start` como alternativa copiable.
- Se registran pendientes de `BH-011` para pulir el bot: flujo guiado de `/resultado`, textos finales, validaciones de liga/rival/duplicados y aclaración de que cada jugador vincula su propio Telegram.
- Se crea `BH-013 - Gestión web de reportes de partidas competitivas` para la bandeja de revisión, corrección, aprobación y rechazo de reportes pendientes.

## 2026-06-04

- Se implementa la primera fase de `BH-010`: subdominio competitivo nuevo en Prisma, migración `20260604120000_competitive_matches_base`, inscripciones de evento, reportes pendientes/aprobados, partidas canónicas, jugadores por partida y crónicas múltiples por evento mediante `EventChronicle`.
- Se añade `src/lib/competitive-matches.ts` como servicio común para crear reportes, aprobarlos/rechazarlos y calcular proyecciones de `Tabla Liga` y `Tabla Paladín`; `BH-011` queda orientada a reutilizar este servicio desde Telegram.
- Se ajusta `BH-010` con el Apps Script real de Elo/IFR: Elo inicial 1500, K 32, lambda IFR 5, deduplicación por pareja+fecha y `Elo Ajustado = Elo + IFR - 1500`. Las inscripciones quedan con estados `INSCRITO`, `PAGADO` y `CANCELLED`.
- Se completa el flujo mínimo de inscripción web de `BH-010`: panel de participantes en evento público, autoinscripción/cancelación, restricción de eventos solo socios y gestión de participantes por organizador/admin. La facción/lista queda como dato opcional en inscripción.
- Se amplía el ciclo de eventos de `BH-010` con `registrationClosesAt`, estados `PREPARATION` y `IN_PROGRESS`, estado público calculado por fechas y cierre automático de nuevas inscripciones al llegar al cierre configurado o, si no existe, al inicio del evento.
- Se endurece el dominio competitivo de `BH-010`: las partidas/reportes base no pueden persistirse incompletos y `factionLabel`/`score` son obligatorios por jugador.
- Se inicia `BH-011` con primera fase de Telegram: webhook seguro, generación de código temporal de vinculación, uso de `Account(provider = "telegram")`, comando `/resultado` multilínea y creación de `CompetitiveMatchReport` pendiente por el canal `TELEGRAM`.
- Se inicializa CodeGraph en el repo para mantener indice estructural disponible durante iteraciones de trabajo.
- Se crea `BH-010 - gestión integral de liga 40K desde eventos` para capturar el frente futuro de inscripciones reales, evolución/clasificación de liga, envío autónomo de resultados por web o bots y relación evento-crónicas 1:N.
- Se amplía `BH-010` con el esquema real de hojas: `Tabla Liga`, `Tabla Paladín` y `Partidas`; el registro de partidas queda como fuente canónica y las clasificaciones como vistas calculadas.
- Se crean `BH-011` y `BH-012` para separar bot de Telegram y bot de WhatsApp como tareas independientes.

## 2026-05-27

- Se marca `BH-004 - notificaciones de juego organizado` como `done` al considerar completo el bloque funcional principal, dejando las correcciones menores futuras para incidencias concretas o tareas separadas.
- Se marca `BH-007 - bugs y glitches de juego organizado` como `done`; la estabilizacion general del modulo queda cerrada y el foco futuro pasa a proximas tareas o incidencias especificas.

- Se crea `BH-009 - estructura operativa para Codex` para adaptar una propuesta tipo Claude Code al flujo real de este proyecto.
- Se anaden `AGENTS.md`, `web/AGENTS.md` y `web/docs/ai/` con reglas, workflows y perfiles de agentes opcionales.
- Se fija explicitamente que `web/scripts` queda reservado para scripts de producto, datos, migraciones u operacion de la web; no para helpers exclusivos de Codex.

- Se revisa y amplía `BH-004 - notificaciones de juego organizado` con una definicion funcional bastante mas concreta.
- Se fija `push` como canal prioritario, `email` como canal opcional activable y `Telegram` o `WhatsApp` como ampliaciones futuras fuera del plan inmediato.
- Se cierra que al aceptar una propuesta deben notificarse tambien las propuestas descartadas automaticamente del mismo slot.
- Se registra en backlog que el objetivo actual de notificaciones cubre fases 1 a 4: notificacion interna, correo opcional, preferencias y recordatorios, avisos por compatibilidad y push web.
- Se actualiza `current.md` para reflejar que `BH-004` ya no esta bloqueada por falta de definicion funcional base, sino por la futura concrecion tecnica de persistencia, entrega y UI minima.
- Bajo el supuesto operativo de que el resto de juego organizado ya esta funcionalmente terminado salvo correcciones menores, `BH-005` y `BH-006` pasan a `done` y `BH-007` pasa a `in_progress` como bolsa activa de estabilizacion menor.
- Arranca la implementacion de `BH-004` con una primera iteracion real de fase 1: nuevos modelos Prisma para notificaciones por usuario, preferencias y entregas externas; helpers de notificacion; APIs en `/api/me`; centro de notificaciones en la navegacion; y enganche del flujo de propuestas enviadas, aceptadas, rechazadas y descartadas por aceptacion ajena.
- Se amplia `BH-004` con fases posteriores: recordatorios configurables de partidas, avisos por ofertas compatibles con horario habitual, PWA manifest, service worker, API de suscripcion push, envio push con `web-push` y endpoint `/api/notifications/dispatch-reminders`. Las migraciones `20260527170000_user_notifications_phase1` y `20260527183000_notifications_push_reminders` quedan aplicadas en la BD Docker local.
- Se generan claves VAPID locales, se configuran en `web/.env`, se documentan las variables en `.env.example` con `mailto:no-reply@bilbohammer.es` para produccion y se recrea el contenedor `web` para que la API pueda validar push. Queda pendiente la prueba manual del permiso push real desde navegador/dispositivo.
- Se estabiliza la primera prueba de notificaciones en produccion: el centro de notificaciones queda adaptado a movil, los ajustes sustituyen a la lista en vez de extenderla, se anade borrado/ocultacion de notificaciones visibles, se notifica la cancelacion de partidas confirmadas y se corrige el estado `Push en este dispositivo` para usar la suscripcion local real.
- Se documenta la limitacion observada en Android/FCM: si una demo externa de Web Push tambien falla con `AbortError` o `Registration failed - push service error`, el bloqueo esta en dispositivo/red/navegador y no en Bilbohammer. La UI incorpora mensaje contextual y accion `Reparar` para limpiar service worker/suscripcion y reintentar tras cambiar WiFi/datos, VPN o DNS privado.

## 2026-05-26

- Se confirma que el backlog operativo vive en `web/docs/backlog/` y no en una carpeta `docs` de raiz de proyecto.
- Se crea `BH-008 - vista publica de mesas por QR` para capturar la peticion de APIficar informacion de mesas con pagina simple por URL fisica.
- Se actualizan `inbox.md` y `current.md` para reflejar la nueva tarea y su encaje respecto a `BH-005` y `BH-006`.
- Se anade una referencia explicita en `web/docs/README.md` para localizar rapidamente el backlog desde futuras sesiones.
- Se incorpora en `backlog/README.md` un protocolo rapido para gestionar peticiones futuras sin perder trazabilidad.

## 2026-05-15

- Se revisa el backlog local frente al estado real del repo para alinear documentacion y trabajo en curso.
- Se confirma que el frente activo real es `BH-006 - conectar busqueda de partidas y gestion de mesas`, aunque hasta ahora no estuviera marcado como `in_progress`.
- El repo ya contiene implementacion relevante del flujo de juego organizado: propuestas de slot, aceptacion o rechazo de propuestas, calendario unificado, pagina de mis partidas, disponibilidad recurrente, publicacion semanal, cancelacion de partidas y limpieza de historico.
- Se constata que `BH-005 - pulir el apartado de mesas` todavia no muestra avance equivalente en el arbol de cambios actual.
- Se constata que `BH-001 - corregir el estado reflejado en el panel admin` sigue pendiente porque `/admin` continua mostrando copy desactualizada.

## 2026-05-09

- Se crea la estructura inicial de backlog en `web/docs/backlog/`.
- Se fijan convenciones para ideas, tareas, foco actual y registro de trabajo.
- Se crean las primeras tareas semilla a partir del analisis del panel admin y gestion documental.
- Se incorpora `juego organizado` como frente principal pendiente y se descompone en tareas de notificaciones, mesas, integracion y correccion de bugs.
- Se registran en `inbox` varias lineas futuras: placeholders, secciones de juegos, redes sociales, bloque de socios en inicio, limpieza de datos de prueba y revision final global.
