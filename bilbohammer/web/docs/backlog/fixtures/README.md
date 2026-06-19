# Fixtures competitivos

Estos CSV sirven para validar diseño y cálculos sin importar históricos reales.

## Importar reportes competitivos

Desde `bilbohammer/web`:

```powershell
npm run import:competitive-reports -- docs/backlog/fixtures/BH-014-reportes-competitivos-sinteticos.csv
```

Ese comando solo valida el CSV y muestra qué crearía. Para escribir en la base de datos:

```powershell
npm run import:competitive-reports -- docs/backlog/fixtures/BH-014-reportes-competitivos-sinteticos.csv --apply
```

Si además quieres crear inscripciones manuales faltantes para que los jugadores aparezcan como participantes del evento:

```powershell
npm run import:competitive-reports -- docs/backlog/fixtures/BH-014-reportes-competitivos-sinteticos.csv --apply --ensure-registrations
```

Los registros se crean como `CompetitiveMatchReport` pendientes con `channel = IMPORT`. No se aprueban automáticamente y no escriben clasificaciones directamente.

## Fixture de regresión

`BH-014-reportes-competitivos-regresion.csv` está pensado para probar casos problemáticos en la bandeja de revisión:

- Segunda partida de liga entre la misma pareja, también con jugadores invertidos.
- Pachanga entre jugadores que ya tienen una partida de liga.
- Empates, empate a cero y resultados 20-0.
- Nombres con tildes y nombres largos.
- Nombre manual repetido con distinta capitalización.
- Mismo jugador informado en ambos lados, para rechazar o corregir.
- `external_message_id` duplicado para comprobar idempotencia del importador.

Uso recomendado:

```powershell
npm run import:competitive-reports -- docs/backlog/fixtures/BH-014-reportes-competitivos-regresion.csv --event=<event-id-o-slug> --apply --ensure-registrations
```

Después, aprueba primero `bh014-reg-001` y revisa que `bh014-reg-002` avise o bloquee como segunda liga de la misma pareja. `bh014-reg-003` debería poder aprobarse como pachanga.

## Reset de datos competitivos de un evento

`BH-014-reset-competitive-event.sql` borra partidas canónicas y reportes del evento indicado, manteniendo evento, usuarios, juego e inscripciones. Revísalo antes de ejecutarlo y cambia el ID si procede.

## Resolución de evento

El CSV puede incluir:

- `event_id`: ID real del evento.
- `event_slug`: slug completo de URL con ID, o slug del título si es único.

También puedes forzar el evento por CLI:

```powershell
npm run import:competitive-reports -- ruta/al/archivo.csv --event=<event-id-o-slug>
```

Para el juego se puede usar `game_id`, `game_slug` o `--game=<game-id-o-slug>`. Si no se informa, usa el juego asociado al evento.
