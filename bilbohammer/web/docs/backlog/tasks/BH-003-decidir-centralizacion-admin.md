# BH-003 - Decidir si novedades y galeria requieren centralizacion adicional en admin

Estado: todo
Tipo: decision
Prioridad: P2
Area: admin
Owner: shared
Origen: analisis del repo
Ultima actualizacion: 2026-05-09

## Contexto

Novedades y galeria ya disponen de flujos de gestion operativos en sus propias secciones. La duda no es si existen, sino si tambien deben tener un punto de entrada centralizado dentro de `/admin`.

## Alcance

- Evaluar si el modelo distribuido actual es suficiente.
- Decidir si `/admin` debe ser solo portada, indice o hub funcional.
- Si se decide centralizar, definir de forma minima que accesos directos o vistas deberian existir.

No entra:

- Implementar paneles nuevos.
- Rehacer los flujos existentes de novedades o galeria.

## Criterios de aceptacion

- Hay una decision explicita sobre el papel de `/admin`.
- Queda registrado si esta tarea se cierra como `done` o `wont_do`.
- Si procede, se generan subtareas concretas.

## Notas tecnicas

- Archivos probables: `src/app/admin/page.tsx`, navegacion admin.
- Riesgos: duplicar flujos ya existentes sin aportar valor.
- Dependencias: ninguna tecnica inmediata; depende de criterio de producto.

## Historial

- 2026-05-09: tarea creada a partir del analisis del modelo de administracion actual.
