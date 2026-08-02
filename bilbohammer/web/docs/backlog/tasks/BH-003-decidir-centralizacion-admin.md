# BH-003 - Decidir si novedades y galeria requieren centralizacion adicional en admin

Estado: done
Tipo: decision
Prioridad: P2
Area: admin
Owner: shared
Origen: analisis del repo
Ultima actualizacion: 2026-08-02

## Contexto

Novedades y galería ya disponen de flujos de gestión operativos en sus propias secciones. Se decide no centralizarlos en `/admin`: esa ruta se reserva para agrupar módulos administrativos que lo necesitan, no como portada o hub general.

## Alcance

- Mantener el modelo distribuido actual de Novedades y Galería.
- Usar `/admin/*` únicamente para módulos administrativos específicos, como usuarios y gestión documental.

No entra:

- Implementar paneles nuevos.
- Rehacer los flujos existentes de novedades o galeria.

## Criterios de aceptacion

- Hay una decisión explícita sobre el papel de `/admin`.
- Novedades y Galería conservan sus flujos propios, sin duplicación administrativa.

## Notas tecnicas

- Riesgo evitado: duplicar flujos ya existentes sin aportar valor.
- Dependencias: ninguna tecnica inmediata; depende de criterio de producto.

## Historial

- 2026-08-02: se decide no crear un hub ni centralizar Novedades y Galería. La página raíz `/admin` se elimina; las rutas hijas administrativas se mantienen bajo el prefijo común.

- 2026-05-09: tarea creada a partir del analisis del modelo de administracion actual.
