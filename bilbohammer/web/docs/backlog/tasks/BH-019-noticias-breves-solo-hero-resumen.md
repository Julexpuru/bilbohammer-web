# BH-019 - Permitir publicar noticias breves solo con hero y resumen

Estado: todo
Tipo: bug
Prioridad: P1
Area: novedades
Owner: codex
Origen: corrección solicitada el 2026-07-23
Ultima actualizacion: 2026-08-02

## Contexto

Algunas comunicaciones del club son suficientemente breves para publicarse como una tarjeta de novedades con imagen hero y resumen, sin requerir cuerpo de artículo. El flujo de publicación debe admitirlas sin generar una página de detalle vacía o un error de validación.

## Alcance

- Permitir guardar y publicar una noticia con título, categoría, resumen y hero, aunque el cuerpo esté vacío.
- Tratar estas publicaciones como contenido breve en los listados de novedades.
- Ajustar la navegación de la tarjeta para que no lleve a una página de detalle vacía; si procede, la tarjeta no debe enlazar a detalle.
- Conservar la validación actual para los campos mínimos y el comportamiento normal de noticias con cuerpo.

## Criterios de aceptación

- Un usuario con permiso editorial puede publicar una noticia breve sin rellenar cuerpo.
- La tarjeta muestra correctamente título, resumen, hero y metadatos disponibles.
- La publicación breve no expone una página de detalle vacía ni enlaces rotos.
- Las noticias completas mantienen su flujo de edición, publicación y detalle actual.

## Notas técnicas

- Revisar el editor, la validación de creación/edición y los componentes de tarjeta/detalle de `novedades`.
- Definir si la ausencia de cuerpo se detecta por contenido vacío normalizado o requiere una marca explícita, preservando compatibilidad con artículos existentes.

## Historial

- 2026-08-02: se eleva a P1 para abordar la publicación de comunicaciones breves como próximo frente de novedades.

- 2026-07-23: tarea creada como corrección menor para comunicaciones breves basadas solo en hero y resumen.
