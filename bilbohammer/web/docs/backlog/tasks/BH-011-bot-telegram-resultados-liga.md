# BH-011 - Bot de Telegram para reportar partidas

Estado: in_progress
Tipo: feature
Prioridad: P2
Area: eventos
Owner: shared
Origen: desglose de BH-010
Ultima actualizacion: 2026-06-04

## Contexto

Como ampliación de la gestión de ligas, se quiere permitir que los jugadores reporten partidas desde Telegram. Esta tarea debe apoyarse en un endpoint común de reporte de partidas, no duplicar reglas de negocio dentro del bot.

## Alcance

- Crear un bot de Telegram mediante BotFather y configurar webhook contra la web.
- Asociar usuarios de Telegram con usuarios o participantes de Bilbohammer.
- Permitir reportar una partida guiada por comandos, botones o conversación paso a paso.
- Guardar el reporte como partida pendiente de validación o como resultado confirmado según la decisión funcional.
- Enviar confirmaciones y errores claros al jugador.

No entra:

- Implementar WhatsApp.
- Calcular clasificaciones dentro del bot.
- Saltarse la validación de identidad del jugador.

## Criterios de aceptacion

- Existe un endpoint seguro para recibir webhooks de Telegram.
- El bot puede identificar al jugador que envía el resultado.
- El bot reutiliza el servicio interno de reporte de partidas.
- Los resultados llegan al panel web con trazabilidad del canal `telegram`.
- El organizador puede revisar o corregir reportes dudosos.

## Notas tecnicas

- Proceso previsto:
  1. Reutilizar `createCompetitiveMatchReport` de `src/lib/competitive-matches.ts` como entrada única de resultados.
  2. Crear bot con BotFather y guardar token en variables de entorno.
  3. Crear ruta `POST /api/integrations/telegram/webhook` con validación de token/secreto.
  4. Configurar `setWebhook` en Telegram apuntando al endpoint público.
  5. Implementar vinculacion de cuenta: codigo temporal desde la web o comando `/start <codigo>`.
  6. Implementar flujo de alta de resultado: seleccionar liga/evento, rival, resultado, puntos, facción y fecha.
  7. Persistir como reporte pendiente y responder con resumen.
- Añadir logs, idempotencia básica y pruebas de payload.
- Variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` y `TELEGRAM_WEBHOOK_SECRET`.
- Primera fase implementada:
  - `POST /api/me/telegram-link-token` genera un código temporal para una sesión web autenticada.
  - `/start <código>` vincula el `telegram_id` con el usuario mediante `Account(provider = "telegram")`.
  - `POST /api/integrations/telegram/webhook` valida `X-Telegram-Bot-Api-Secret-Token`.
  - `/resultado` acepta un formato multilínea explícito y crea `CompetitiveMatchReport` pendiente con `channel = TELEGRAM`.
  - Se guarda `externalSubmitterId` con el ID de Telegram y `externalMessageId` como `chat_id:message_id` para trazabilidad e idempotencia.
- Formato inicial de `/resultado`:

```text
/resultado
evento: <id o slug del evento>
tipo: liga
fecha: 2026-06-04
jugador: Tu nombre | Facción | victoria | 20
rival: Rival | Facción rival | derrota | 0
notas: opcional
```

- El bot no debe crear `CompetitiveMatch` directamente; solo crea `CompetitiveMatchReport` y deja la aprobación al flujo común.
- Riesgos: mensajes duplicados por reintentos de webhook, usuarios no vinculados, resultados enviados por la persona equivocada, cambios de nick de Telegram.
- Dependencias: `BH-010` para modelo de partidas y endpoint interno de reporte.
- Pendiente:
  - Crear una UI cómoda para mostrar el código de vinculación al usuario.
  - Configurar BotFather y `setWebhook` en el entorno público.
  - Diseñar conversación guiada con botones si el formato multilinea resulta demasiado rígido.
  - Exponer panel web de revisión/corrección de reportes pendientes.

## Historial

- 2026-06-04: primera fase implementada con vinculación por código temporal, webhook seguro y comando `/resultado` que crea reportes pendientes mediante `createCompetitiveMatchReport`.
- 2026-06-04: se fija que Telegram reutilizará `src/lib/competitive-matches.ts` y creará reportes pendientes, no partidas aprobadas directamente.
- 2026-06-04: tarea creada como desglose independiente de bots para liga.
