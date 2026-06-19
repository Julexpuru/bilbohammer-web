-- Reset acotado de datos competitivos de un evento.
-- Sustituye el ID si necesitas limpiar otro evento.
-- No borra el evento, usuarios, juegos ni inscripciones.

BEGIN;

WITH target_event AS (
  SELECT 'cmpzhic5l000pn53sc6hwy9k6'::text AS id
),
deleted_matches AS (
  DELETE FROM "CompetitiveMatch"
  WHERE "eventId" = (SELECT id FROM target_event)
  RETURNING id
),
deleted_reports AS (
  DELETE FROM "CompetitiveMatchReport"
  WHERE "eventId" = (SELECT id FROM target_event)
  RETURNING id
)
SELECT
  (SELECT count(*) FROM deleted_matches) AS deleted_matches,
  (SELECT count(*) FROM deleted_reports) AS deleted_reports;

-- Si quieres reiniciar también la fórmula Paladín del evento, ejecuta además:
-- DELETE FROM "CompetitiveEventSettingsAuditLog" WHERE "eventId" = 'cmpzhic5l000pn53sc6hwy9k6';
-- DELETE FROM "CompetitiveEventSettings" WHERE "eventId" = 'cmpzhic5l000pn53sc6hwy9k6';

COMMIT;
