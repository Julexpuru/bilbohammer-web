# BH-018 - Rediseñar el bloque de redes sociales en Inicio

Estado: todo
Tipo: feature
Prioridad: P2
Area: novedades
Owner: shared
Origen: revisión de producto de 2026-07-23
Ultima actualizacion: 2026-07-23

## Contexto

La sección de Inicio dedicada a redes sociales necesita una revisión completa de su función, jerarquía visual y contenido para que ayude a descubrir la actividad del club sin competir con las novedades, los eventos ni el resto de llamadas a la acción de la portada.

## Alcance

- Auditar el bloque actual: redes representadas, fuentes de contenido, llamadas a la acción, frecuencia de actualización, comportamiento móvil y coste de carga.
- Definir el objetivo principal del bloque: seguir perfiles, mostrar actividad reciente, destacar una red concreta o combinar estas funciones con una jerarquía clara.
- Diseñar una propuesta coherente con el sistema visual de Inicio, con estados de carga, vacío y error comprensibles.
- Priorizar enlaces oficiales accesibles y contenido fiable; evitar que un embed externo bloquee o degrade la portada.
- Implementar la propuesta aprobada, con diseño responsive y accesible.
- Medir o verificar que el nuevo bloque no empeora de forma apreciable el rendimiento de Inicio.

No entra:

- Crear ni administrar cuentas de redes sociales del club.
- Automatizar publicaciones en redes externas.
- Convertir la web en un agregador de feeds sin decisión explícita de producto.

## Criterios de aceptación

- Existe una decisión documentada sobre la función y redes que cubre el bloque.
- La sección comunica claramente qué ofrece y lleva a enlaces oficiales funcionales.
- En móvil y escritorio mantiene una lectura clara, sin desbordes ni elementos embebidos intrusivos.
- Si depende de contenido externo, un error o falta de contenido no rompe Inicio y muestra una alternativa útil.
- La implementación cumple los controles básicos de accesibilidad: navegación por teclado, textos alternativos y contraste suficiente.

## Notas técnicas

- Puntos de partida probables: componentes de `src/components/home/` relacionados con Instagram/redes y la composición de la página de Inicio.
- Antes de decidir un proveedor o embed, revisar privacidad, cookies, carga diferida y limitaciones de cada plataforma.

## Historial

- 2026-07-23: tarea creada a partir de la idea pendiente del inbox para convertirla en un rediseño funcional completo.
