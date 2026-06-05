# BH-012 - Bot de WhatsApp para reportar partidas

Estado: todo
Tipo: feature
Prioridad: P3
Area: eventos
Owner: shared
Origen: desglose de BH-010
Ultima actualizacion: 2026-06-04

## Contexto

Como ampliacion de la gestion de ligas, se quiere estudiar un bot de WhatsApp para que los jugadores reporten partidas. Debe plantearse como integracion oficial con WhatsApp Business Platform / Cloud API, no como automatizacion de una cuenta personal.

## Alcance

- Validar requisitos operativos de Meta Business, numero de WhatsApp, permisos y costes.
- Configurar una app de Meta y WhatsApp Cloud API si se decide avanzar.
- Recibir mensajes entrantes mediante webhook.
- Asociar numeros de telefono con usuarios o participantes de Bilbohammer.
- Reutilizar el mismo servicio interno de reporte de partidas que la web y Telegram.

No entra:

- Automatizar WhatsApp Web o una cuenta personal.
- Implementar mensajeria masiva sin revisar politicas y plantillas.
- Hacer esta integracion antes de tener estabilizado el modelo comun de partidas.

## Criterios de aceptacion

- Hay una decision documentada sobre viabilidad, coste y numero a usar.
- Existe endpoint seguro para verificacion y recepcion de webhooks de Meta.
- Los mensajes entrantes pueden vincularse a un jugador conocido.
- Los resultados llegan al panel web con trazabilidad del canal `whatsapp`.
- El flujo respeta las limitaciones de plantillas, ventanas de conversacion y permisos de WhatsApp Business Platform.

## Notas tecnicas

- Proceso previsto:
  1. Definir el formato canonico de reporte de partida en `BH-010`.
  2. Confirmar si Bilbohammer dispone o quiere disponer de Meta Business y numero apto para Cloud API.
  3. Crear o configurar app en Meta for Developers con producto WhatsApp.
  4. Obtener `phone_number_id`, `whatsapp_business_account_id` y token de acceso.
  5. Crear ruta `GET/POST /api/integrations/whatsapp/webhook` para verificacion y recepcion.
  6. Validar firma `X-Hub-Signature-256` o mecanismo equivalente recomendado por Meta.
  7. Implementar vinculacion de telefono con usuario/participante.
  8. Implementar flujo conversacional para recoger liga/evento, rival, resultado, puntos, faccion y fecha.
  9. Persistir como reporte pendiente y responder por WhatsApp si la ventana de conversacion lo permite.
  10. Documentar costes, limites y mantenimiento operativo.
- Variables probables: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`.
- Riesgos: complejidad de alta en Meta, coste recurrente, restricciones de plantillas, uso de numero no compatible, mayor dificultad de pruebas locales.
- Dependencias: `BH-010` para modelo de partidas y endpoint interno de reporte; decision externa sobre Meta Business y numero.

## Historial

- 2026-06-04: tarea creada como desglose independiente de bots para liga.
