# BH-009 - Estructura operativa para Codex

Estado: done
Tipo: docs
Prioridad: P2
Area: docs
Owner: codex
Origen: propuesta de estructura tipo Claude Code adaptada a Codex
Ultima actualizacion: 2026-05-27

## Contexto

Se quiere mejorar como Codex opera dentro del proyecto sin depender solo del chat ni mezclar reglas, backlog y scripts operativos de la web.

La propuesta original separa instrucciones, reglas, comandos, skills, agentes y hooks. Para este proyecto se adapta a una capa ligera basada en `AGENTS.md`, `docs/ai`, el backlog existente y comandos ya presentes.

## Alcance

Incluye:

- Crear instrucciones raiz para Codex.
- Crear instrucciones especificas de `web`.
- Crear reglas modulares y workflows bajo `docs/ai`.
- Documentar perfiles de agentes opcionales.
- Proteger la separacion entre scripts del producto y herramientas de Codex.

No incluye:

- Cambiar codigo de aplicacion.
- Cambiar `web/package.json`.
- Crear scripts ejecutables nuevos.
- Configurar conectores externos como Jira, Slack o bases de datos remotas.

## Criterios de aceptacion

- Existe `AGENTS.md` en la raiz del repo.
- Existe `web/AGENTS.md`.
- Existe `web/docs/ai` con reglas y workflows.
- Queda documentado que `web/scripts` no debe usarse para scripts exclusivos de Codex.
- El backlog registra esta decision.

## Notas tecnicas

- Archivos probables: `AGENTS.md`, `web/AGENTS.md`, `web/docs/ai/**`.
- Riesgos: exceso de documentacion o reglas duplicadas.
- Dependencias: mantener los documentos cortos y actualizar solo lo que tenga valor operativo.

## Historial

- 2026-05-27: tarea creada y cerrada al anadir la estructura operativa minima.
