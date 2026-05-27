# Backlog Bilbohammer

Este directorio centraliza ideas, tareas pendientes y registro de trabajo para Bilbohammer.

## Objetivo

Tener una fuente persistente dentro del repo para:

- Capturar ideas rapidas sin perderlas.
- Convertir ideas en tareas claras y priorizadas.
- Dejar visible que se esta haciendo ahora.
- Registrar que se ha tocado en cada sesion de trabajo.

## Estructura

- `inbox.md`: captura rapida de ideas, bugs, deudas o dudas sin refinar.
- `current.md`: foco actual del proyecto y proximos movimientos.
- `worklog.md`: registro cronologico breve de lo que se ha hecho o tocado.
- `tasks/`: una tarea por fichero, con ID unico.
- `tasks/_template.md`: plantilla base para nuevas tareas.

## Flujo de trabajo

1. Cualquier idea nueva entra primero en `inbox.md`.
2. Cuando una idea ya esta clara, se convierte en un fichero dentro de `tasks/`.
3. Si una tarea pasa a ser prioritaria, se refleja tambien en `current.md`.
4. Al cerrar una sesion de trabajo relevante, se anade una entrada corta en `worklog.md`.
5. Cada tarea mantiene su propio historial breve para que el contexto no dependa del chat.

## Protocolo rapido para peticiones futuras

1. Revisar `current.md` para no duplicar tareas ya activas.
2. Revisar `inbox.md` por si la idea ya esta capturada.
3. Revisar `tasks/` y tomar el siguiente ID `BH-XXX`.
4. Crear tarea con `tasks/_template.md` y registrar la conversion en `inbox.md`.
5. Si cambia la prioridad del momento, actualizar `current.md`.

## Estados

- `idea`: detectado pero aun sin refinar.
- `todo`: listo para abordarse.
- `in_progress`: en curso.
- `blocked`: parado por dependencia, decision o falta de datos.
- `done`: completado.
- `wont_do`: descartado de forma explicita.

## Tipos

- `feature`
- `bug`
- `refactor`
- `docs`
- `infra`
- `decision`

## Prioridades

- `P1`: importante o bloqueante.
- `P2`: importante pero no bloqueante.
- `P3`: mejora o seguimiento.

## Areas

- `auth`
- `novedades`
- `eventos`
- `galeria`
- `perfil`
- `socios`
- `admin`
- `juego-organizado`
- `uploads`
- `infra`
- `docs`

## Ownership

- `user`: accion o decision principal del usuario.
- `codex`: trabajo ejecutable por Codex.
- `shared`: requiere trabajo o decision de ambas partes.

## Convenciones

- IDs de tarea: `BH-XXX`.
- Un fichero por tarea: `BH-XXX-nombre-corto.md`.
- Las decisiones importantes deben quedar escritas en la tarea o en `current.md`.
- Si algo aparece durante una implementacion pero queda fuera de alcance, se apunta en `inbox.md` o se crea una tarea nueva.

## Regla practica

Si una decision o pendiente importa mas alla de la conversacion actual, debe quedar escrito aqui.
