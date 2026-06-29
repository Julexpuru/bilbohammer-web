# Current

Estado operativo actual del backlog.

## Foco actual

- `BH-011 - bot de Telegram para reportar partidas` pasa a ser el frente activo inmediato: flujo guiado ya implementado, pendiente de pruebas reales y ajuste de textos/presentación.
- `BH-010 - gestión integral de liga 40K desde eventos` queda mayoritariamente completada en primera fase: modelo competitivo, inscripciones con cierre, preparación previa, reportes revisables, partidas aprobadas y proyecciones calculadas. Visualización y refinado de tablas se retomarán después de pulir el envío de partidas.
- El frente principal de `juego organizado` se considera cerrado en alcance funcional principal.
- Bajo la fotografia funcional actual asumida, `BH-005` y `BH-006` pueden darse por cerradas: mesas y su integracion con partidas ya no son el frente principal.
- `BH-004 - notificaciones de juego organizado` queda cerrada como bloque funcional principal. Ya cuenta con persistencia, preferencias, centro interno, email opcional, recordatorios, avisos compatibles, PWA basica, push web con VAPID, estado push por dispositivo, borrado de notificaciones visibles y recuperacion manual de suscripcion push.
- `BH-007 - bugs y glitches de juego organizado` queda cerrada como pasada de estabilizacion general. Cualquier correccion menor nueva debe registrarse como incidencia concreta o tarea separada si merece seguimiento.
- `BH-013 - gestión web de reportes de partidas competitivas` queda cerrada; nuevas incidencias del flujo de revisión deben registrarse como tareas separadas.

## Proximas candidatas

- `BH-008`: habilitar vista publica por QR de cada mesa con informacion base y calendario del dia.
- `BH-001`: corregir el copy desactualizado del panel admin.
- `BH-002`: definir el alcance funcional de gestion documental.
- `BH-003`: decidir si novedades y galeria necesitan centralizacion adicional en `/admin`.
- Revisar el `inbox` para decidir si toca convertir placeholders, secciones de juegos, redes sociales, bloque de socios, limpieza de datos de prueba o revision global en tareas concretas.

## Bloqueos conocidos

- `BH-008` requiere decidir el identificador estable de URL para QR (numero de mesa vs ID persistente) antes de imprimir codigos fisicos.
- `BH-002` depende de una definicion funcional previa: que tipo de documentos, quien los sube y quien los consulta.
- `BH-003` depende de una decision de producto, no de una limitacion tecnica inmediata.

## Notas

- La fotografia actual del repo muestra bastante mas avance en `juego organizado` de lo que reflejaba este backlog el 2026-05-09.
- Este estado se actualiza bajo el supuesto explicito de que todo lo principal de juego organizado, incluidas notificaciones y estabilizacion menor general, queda cerrado.
- Las correcciones menores que se detecten a partir de ahora no reabren automaticamente `BH-004` ni `BH-007`; deben registrarse como incidencias concretas, tareas nuevas o entradas de `inbox` segun su entidad.
- En `BH-004` ya queda fijado que `Telegram` y `WhatsApp` no entran en el plan inmediato; el objetivo actual llega hasta push web y experiencia instalable si hace falta para multidispositivo.
- Para mantener push en produccion deben cargarse las variables VAPID y `NOTIFICATIONS_CRON_SECRET`; el valor previsto de contacto es `mailto:no-reply@bilbohammer.es`.
- Este fichero debe reflejar solo el estado actual, no el historial completo.
