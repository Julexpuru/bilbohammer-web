# BH-004 - Cerrar sistema de notificaciones de juego organizado

Estado: done
Tipo: feature
Prioridad: P1
Area: juego-organizado
Owner: shared
Origen: backlog usuario
Ultima actualizacion: 2026-05-27

## Contexto

La seccion de juego organizado necesita notificaciones para los flujos de busqueda y gestion de partidas. El alcance ya no es abstracto: el repo cuenta con entidades y puntos de enganche claros para propuestas, aceptacion o rechazo, partidas confirmadas y disponibilidad recurrente, por lo que la tarea pasa a ser definir y construir la capa de notificacion, no el dominio base.

La decision funcional actual es:

- Priorizar `push` como canal principal en la medida de lo posible.
- Mantener `email` como canal opcional adicional, no como unica via.
- Hacer ambos canales activables por el usuario.
- Si para soporte multidispositivo estable hace falta orientar la experiencia hacia `web app` instalable, se acepta ese enfoque.
- Dejar `Telegram` y `WhatsApp` explicitamente fuera del alcance inmediato y tratarlos como ampliaciones futuras opcionales.

## Alcance

- Identificar y cerrar los eventos que deben generar notificacion.
- Definir persistencia de notificaciones por usuario, estado de lectura y estado de entrega por canal.
- Definir controles de usuario para gestionar volumen, ruido, canales y preferencias.
- Cubrir tanto la emision como la visualizacion o gestion de las notificaciones.
- Planificar e implementar las fases 1 a 4 del sistema:
  - fase 1: notificacion interna y correo opcional para propuestas y decisiones.
  - fase 2: preferencias por usuario y recordatorios de partida.
  - fase 3: avisos de nuevas ofertas compatibles con horario y juegos habituales.
  - fase 4: push web, previsiblemente sobre base PWA o web app instalable si es la via mas solida para multidispositivo.

No entra:

- Redisenar todo el modulo de juego organizado.
- Resolver bugs ajenos al flujo de notificaciones salvo los estrictamente necesarios.
- Implementar ahora `Telegram` o `WhatsApp`.

## Decisiones funcionales cerradas

### Eventos minimos a cubrir

- `propuesta_recibida`: al creador del slot cuando alguien propone una partida sobre su oferta.
- `propuesta_aceptada`: al usuario que propuso cuando el creador acepta.
- `propuesta_rechazada`: al usuario que propuso cuando el creador rechaza manualmente.
- `propuesta_descartada_por_aceptacion_ajena`: al resto de propuestas pendientes del mismo slot cuando otra se acepta y las suyas quedan rechazadas automaticamente.
- `recordatorio_partida`: al usuario con una partida confirmada antes de `startsAt`, con antelacion configurable.
- `nueva_oferta_compatible`: al usuario que lo active cuando aparezca una oferta compatible con su horario habitual y sus juegos preferidos.
- `aviso_global`: reservado para noticias urgentes o comunicados transversales en el futuro.

### Representacion y UX minima

- Centro de notificaciones interno con contador de no leidas e historial.
- Preferencias por usuario para activar o desactivar canales y tipos de evento.
- Controles de antelacion para recordatorios de partida.
- Mecanismos anti ruido para eventos de alta frecuencia, especialmente `nueva_oferta_compatible`.

### Prioridad de canales

- `push`: prioridad funcional principal.
- `email`: canal secundario y opcional.
- `in-app`: necesario como superficie de lectura y trazabilidad aunque el canal externo falle.
- `Telegram` y `WhatsApp`: aparcados como futuro opcional.

## Criterios de aceptacion

- Existe una lista cerrada de eventos que notifican.
- El usuario puede activar o desactivar al menos `push` y `email` por tipo de evento segun el alcance de cada fase.
- El usuario dispone de una vista interna minima para revisar notificaciones y su estado basico.
- El usuario puede marcar como leidas y ocultar/borrar notificaciones visibles para que el centro no crezca indefinidamente.
- Los eventos criticos del flujo de propuestas y partidas quedan cubiertos.
- El backlog y el plan de integracion separan explicitamente las fases 1 a 4 de las integraciones futuras con mensajeria externa.

## Notas tecnicas

- Archivos probables: rutas API de `juego-organizado`, componentes de `mis-partidas`, posibles modelos de datos y UI de preferencias.
- Riesgos: exceso de ruido, estados duplicados o notificaciones inconsistentes.
- Dependencias activas: ninguna para considerar cerrado el bloque funcional principal.
- Variables necesarias para push web:
  - `VAPID_PUBLIC_KEY`
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`
  - `NOTIFICATIONS_CRON_SECRET`
- En produccion, `VAPID_SUBJECT` debe usar un contacto controlado por el proyecto. Valor previsto: `mailto:no-reply@bilbohammer.es`.
- `VAPID_PUBLIC_KEY` y `NEXT_PUBLIC_VAPID_PUBLIC_KEY` deben tener el mismo valor publico; `VAPID_PRIVATE_KEY` no debe exponerse al cliente.
- La validacion real en movil ha mostrado que Android/Chrome/Brave pueden conceder permiso de notificaciones y aun asi fallar en `PushManager.subscribe()` con `AbortError` o `Registration failed - push service error` si el canal FCM del dispositivo/red esta bloqueado o atascado.
- Ese fallo no se puede resolver solo desde la web cuando tambien ocurre en demos externas de Web Push. La UI debe tratarlo como incidencia del entorno y ofrecer recuperacion guiada: reintento, limpieza de suscripcion local/servidor y mensaje contextual para probar cambio WiFi/datos, VPN, DNS privado o reinicio del navegador.
- Estado observado en repo: ya existen eventos funcionales claros sobre los que notificar, como propuesta enviada, propuesta aceptada o rechazada, partida cancelada y cambios en el ciclo de vida de ofertas y partidas.
- La capa funcional de notificacion ya se considera implementada en su alcance principal: persistencia, entrega, lectura, preferencias, correo opcional, recordatorios, avisos compatibles y push web.
- Puntos de enganche ya identificados en el repo:
  - creacion de propuesta en `src/app/api/juego-organizado/slots/[id]/join/route.ts`.
  - aceptacion y rechazo en `src/lib/organized-slot-proposal-actions.ts`.
  - disponibilidad recurrente y horario habitual en `src/app/api/juego-organizado/recurring-availability/route.ts` y `src/components/juego-organizado/MyAvailabilityPlanner.tsx`.
- El modelo `Notification` actual parece representar avisos globales simples, no notificaciones por usuario ni por canal, asi que previsiblemente hara falta un modelo nuevo o una ampliacion importante del esquema.
- Ya existe base para correo saliente mediante `nodemailer`, por lo que `email` es tecnicamente viable desde el stack actual.
- Ya existe base de `push web` con service worker, manifest, suscripciones por dispositivo, VAPID y recuperacion manual de suscripcion.
- Recomendacion de arquitectura: los flujos de negocio no deberian enviar push o correo directamente dentro de la transaccion principal; deberian registrar un evento o notificacion pendiente y dejar la entrega a una capa asincrona con reintentos e idempotencia.

## Viabilidad y enfoque

### Push web

- Es viable, pero requiere trabajo nuevo de plataforma.
- Si para experiencia robusta en movil y multidispositivo conviene convertirlo en `web app` instalable, ese enfoque queda aceptado.
- La parte mas delicada no es el navegador de escritorio, sino asegurar una experiencia clara de instalacion, permisos y suscripcion en movil.

### Correo

- Es viable con el stack actual y debe quedar como opcion activable por el usuario.
- No se prioriza como canal principal, pero sirve bien como redundancia y como primera entrega externa si `push` tarda mas.

### Mensajeria externa

- `Telegram` y `WhatsApp` no forman parte del plan inmediato.
- Se mantienen como posibles ampliaciones futuras cuando el sistema base de notificaciones ya exista y este estabilizado.

## Orden objetivo de desarrollo

1. Fase 1: notificacion interna y correo opcional para `propuesta_recibida`, `propuesta_aceptada`, `propuesta_rechazada` y `propuesta_descartada_por_aceptacion_ajena`.
2. Fase 2: preferencias por usuario y recordatorios configurables previos a partidas confirmadas.
3. Fase 3: avisos por nuevas ofertas compatibles con horario habitual y juegos preferidos, con control de ruido.
4. Fase 4: push web y soporte instalable si hace falta para una experiencia multidispositivo coherente.

## Historial

- 2026-05-09: tarea creada a partir del backlog funcional comunicado por el usuario.
- 2026-05-15: se revisa el repo y se confirma que ya hay base funcional suficiente para definir el sistema de notificaciones con mas precision.
- 2026-05-27: se cierra el enfoque funcional actual: prioridad para `push`, `email` opcional, eventos minimos definidos, rechazo automatico del resto de propuestas cuando una se acepta y separacion explicita entre fases 1 a 4 y futuras integraciones con `Telegram` o `WhatsApp`.
- 2026-05-27: la tarea pasa a `in_progress` con una primera iteracion funcional de fase 1 ya implementada: persistencia por usuario, preferencias basicas, centro interno en navegacion, email opcional para propuestas y enganche en propuesta enviada, aceptada, rechazada y descartada por aceptacion ajena.
- 2026-05-27: se amplia la implementacion con recordatorios de partida, avisos por ofertas compatibles, soporte PWA basico, service worker, suscripciones push por dispositivo, entrega push via `web-push` y endpoint cron para disparar recordatorios. Las migraciones de notificaciones se aplican correctamente en la BD Docker local.
- 2026-05-27: se generan y configuran claves VAPID para entorno local, se documentan las variables necesarias en `.env.example` y se valida que el contenedor Docker de `web` ya las recibe. Queda pendiente validacion manual de permisos push reales en navegador/dispositivo.
- 2026-05-27: tras pruebas en produccion se corrigen puntos de estabilizacion: estado push por dispositivo real, panel movil dentro del viewport, notificacion al cancelar partidas confirmadas, borrado/ocultacion de notificaciones, vista de ajustes separada y accion `Reparar` para resincronizar service worker y suscripcion push cuando Android/FCM queda en estado atascado.
- 2026-05-27: la tarea pasa a `done` bajo el criterio de que el bloque funcional principal de notificaciones queda completo; cualquier correccion menor nueva se registrara como incidencia concreta o tarea separada.
