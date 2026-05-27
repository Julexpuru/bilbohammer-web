DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."TableReservation"
    WHERE "matchId" IS NOT NULL
    GROUP BY "matchId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'No se puede aplicar la restriccion: existe mas de una reserva para la misma partida.';
  END IF;
END $$;

DROP INDEX IF EXISTS "TableReservation_matchId_idx";
CREATE UNIQUE INDEX "TableReservation_matchId_key" ON "public"."TableReservation"("matchId");
