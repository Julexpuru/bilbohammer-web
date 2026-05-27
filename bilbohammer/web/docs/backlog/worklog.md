# Worklog

Registro cronologico breve de trabajo realizado o contexto consolidado.

## 2026-05-27

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
