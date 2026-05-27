# Current

Estado operativo actual del backlog.

## Foco actual

- El frente principal sigue siendo cerrar correctamente la seccion de `juego organizado`.
- Bajo la fotografia funcional actual asumida, `BH-005` y `BH-006` pueden darse por cerradas: mesas y su integracion con partidas ya no son el frente principal.
- `BH-004 - notificaciones de juego organizado` es el gran bloque funcional pendiente de validacion dentro de juego organizado. Ya cuenta con implementacion local de persistencia, preferencias, centro interno, email opcional, recordatorios, avisos compatibles, PWA basica y push web con VAPID configurado en Docker local.
- `BH-007 - bugs y glitches de juego organizado` pasa a ser la tarea activa de remate para absorber correcciones menores del modulo.

## Proximas candidatas

- `BH-004`: validar manualmente en navegador/dispositivo la activacion push, el permiso del service worker, las notificaciones de propuestas, los recordatorios y los avisos por ofertas compatibles.
- `BH-007`: ejecutar y cerrar la pasada de estabilizacion menor del modulo ahora que el flujo principal se da por funcionalmente terminado.
- `BH-008`: habilitar vista publica por QR de cada mesa con informacion base y calendario del dia.
- `BH-001`: corregir el copy desactualizado del panel admin.
- `BH-002`: definir el alcance funcional de gestion documental.
- `BH-003`: decidir si novedades y galeria necesitan centralizacion adicional en `/admin`.

## Bloqueos conocidos

- `BH-004` ya no esta bloqueada por alcance funcional ni arquitectura base. Queda pendiente validacion real de permisos push, experiencia multidispositivo y configuracion de variables definitivas en produccion.
- `BH-007` no esta bloqueada funcionalmente, pero conviene que se mantenga centrada en correcciones menores reales y no absorba nuevas features.
- `BH-008` requiere decidir el identificador estable de URL para QR (numero de mesa vs ID persistente) antes de imprimir codigos fisicos.
- `BH-002` depende de una definicion funcional previa: que tipo de documentos, quien los sube y quien los consulta.
- `BH-003` depende de una decision de producto, no de una limitacion tecnica inmediata.

## Notas

- La fotografia actual del repo muestra bastante mas avance en `juego organizado` de lo que reflejaba este backlog el 2026-05-09.
- Este estado se actualiza bajo el supuesto explicito de que todo lo principal de juego organizado, salvo notificaciones, ya esta terminado y solo restan correcciones menores.
- Con ese supuesto, `BH-004` y `BH-007` pasan a ser los dos frentes reales de cierre de juego organizado.
- En `BH-004` ya queda fijado que `Telegram` y `WhatsApp` no entran en el plan inmediato; el objetivo actual llega hasta push web y experiencia instalable si hace falta para multidispositivo.
- Para produccion de `BH-004` deben cargarse las variables VAPID y `NOTIFICATIONS_CRON_SECRET`; el valor previsto de contacto es `mailto:no-reply@bilbohammer.es`.
- Este fichero debe reflejar solo el estado actual, no el historial completo.
