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

## Resolución de evento

El CSV puede incluir:

- `event_id`: ID real del evento.
- `event_slug`: slug completo de URL con ID, o slug del título si es único.

También puedes forzar el evento por CLI:

```powershell
npm run import:competitive-reports -- ruta/al/archivo.csv --event=<event-id-o-slug>
```

Para el juego se puede usar `game_id`, `game_slug` o `--game=<game-id-o-slug>`. Si no se informa, usa el juego asociado al evento.
