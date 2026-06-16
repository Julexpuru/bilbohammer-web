# BH-011 - Bot de Telegram para reportar partidas

Estado: in_progress
Tipo: feature
Prioridad: P2
Area: eventos
Owner: shared
Origen: desglose de BH-010
Ultima actualizacion: 2026-06-16

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
  5. Implementar vinculación de cuenta: código temporal desde la web o comando `/start <código>`.
  6. Implementar flujo de alta de resultado: seleccionar liga/evento, rival, resultado, puntos, facción y fecha.
  7. Persistir como reporte pendiente y responder con resumen.
- Añadir logs, idempotencia básica y pruebas de payload.
- Variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` y `TELEGRAM_WEBHOOK_SECRET`.
- Primera fase implementada:
  - `POST /api/me/telegram-link-token` genera un código temporal para una sesión web autenticada.
  - El perfil de usuario muestra un botón `Conectar Telegram` que genera el enlace y evita usar la consola del navegador.
  - `/start <código>` vincula el `telegram_id` con el usuario mediante `Account(provider = "telegram")`.
  - `POST /api/integrations/telegram/webhook` valida `X-Telegram-Bot-Api-Secret-Token`.
  - `/resultado` acepta un formato multilínea explícito y crea `CompetitiveMatchReport` pendiente con `channel = TELEGRAM`.
  - Se guarda `externalSubmitterId` con el ID de Telegram y `externalMessageId` como `chat_id:message_id` para trazabilidad e idempotencia.
- Flujo guiado implementado:
  - `/resultado` inicia conversación persistida en `TelegramBotSession`.
  - El primer paso es elegir liga/evento. Las pachangas solo pueden registrarse dentro de un marco donde el jugador esté inscrito.
  - Si el usuario solo está inscrito en una liga activa, se selecciona automáticamente.
  - Tras elegir marco, el bot pregunta si la partida cuenta para clasificación de liga o es pachanga registrada.
  - Rival, usuario que reporta y rival deben estar inscritos o pagados en el mismo evento.
  - Se piden facción/lista del usuario y del rival; si existe facción en la inscripción, se ofrece como opción rápida.
  - Los puntos se validan como enteros no negativos, sin forzar escala WTC ni suma 20 porque el sistema de puntuación depende de la liga.
  - El bot muestra resumen y exige confirmación antes de crear el reporte pendiente.
  - El resumen permite confirmar, cancelar, empezar de nuevo y editar liga, rival, facciones, resultado, puntos o fecha.
  - Todos los pasos del flujo guiado ofrecen cancelación o aceptan `/cancelar`.
  - El webhook soporta `callback_query`; al configurar Telegram hay que incluir `message` y `callback_query` en `allowed_updates`.
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
  - Revisar textos finales y presentación de mensajes/botones con pruebas reales.
  - Revisar si conviene almacenar sistema de puntuación por liga para futuras validaciones específicas.
  - Añadir limpieza programada de sesiones caducadas si el volumen lo justifica.
  - Coordinarse con `BH-013` para que los reportes pendientes tengan revisión web.

## Historial

- 2026-06-04: primera fase implementada con vinculación por código temporal, webhook seguro y comando `/resultado` que crea reportes pendientes mediante `createCompetitiveMatchReport`.
- 2026-06-05: se añade botón `Conectar Telegram` en `Mi Perfil` para generar el enlace de vinculación sin consola del navegador.
- 2026-06-05: queda registrado que cada jugador debe vincular su propio Telegram; el bot recibe mensajes de usuarios individuales y crea reportes pendientes con trazabilidad, no envía partidas desde la web como gestor central.
- 2026-06-05: quedan pendientes el flujo guiado de `/resultado`, textos finales del bot, validaciones de inscritos/rivales y coordinación con bandeja web de reportes.
- 2026-06-16: se implementa flujo guiado con sesiones persistidas, botones de Telegram, selección de liga/evento primero, validación de inscritos, facciones obligatorias para ambos jugadores, puntos sin asumir formato WTC y confirmación antes de guardar.
- 2026-06-16: se añade edición desde el resumen final, botón `Empezar de nuevo` y cancelación consistente en el flujo guiado.
- 2026-06-04: se fija que Telegram reutilizará `src/lib/competitive-matches.ts` y creará reportes pendientes, no partidas aprobadas directamente.
- 2026-06-04: tarea creada como desglose independiente de bots para liga.
