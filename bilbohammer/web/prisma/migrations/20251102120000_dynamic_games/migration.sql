-- Create new Game catalog
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "legacyEnumKey" TEXT,
    "iconImagePath" TEXT,
    "heroImagePath" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");
CREATE UNIQUE INDEX "Game_legacyEnumKey_key" ON "Game"("legacyEnumKey");

-- Populate catalog with existing enum values
INSERT INTO "Game" ("id", "name", "slug", "legacyEnumKey", "iconImagePath", "heroImagePath", "sortOrder", "isDefault", "isActive")
VALUES
    ('w40k', 'Warhammer 40,000', 'w40k', 'W40K', '/assets/icons/games/w40k.png', '/assets/icons/games/w40k.png', 10, false, true),
    ('aos', 'Age of Sigmar', 'aos', 'AOS', '/assets/icons/games/aos.png', '/assets/icons/games/aos.png', 20, false, true),
    ('tow', 'The Old World', 'tow', 'TOW', '/assets/icons/games/tow.png', '/assets/icons/games/tow.png', 30, false, true),
    ('esdla', 'El Senor de los Anillos', 'esdla', 'ESDLA', '/assets/icons/games/esdla.png', '/assets/icons/games/esdla.png', 40, false, true),
    ('bb', 'Blood Bowl', 'bb', 'BB', '/assets/icons/games/bloodbowl.png', '/assets/icons/games/bloodbowl.png', 50, false, true),
    ('marvel', 'Marvel Crisis Protocol', 'marvel', 'MARVEL', '/assets/icons/games/mcp.png', '/assets/icons/games/mcp.png', 60, false, true),
    ('rol', 'Rol', 'rol', 'ROL', '/assets/icons/games/rol.png', '/assets/icons/games/rol.png', 70, false, true),
    ('magic', 'Magic', 'magic', 'MAGIC', '/assets/icons/games/magic.png', '/assets/icons/games/magic.png', 80, false, true),
    ('boardgames', 'Juegos de mesa', 'boardgames', 'JUEGOS_DE_MESA', '/assets/icons/games/juegosdemesa.png', '/assets/icons/games/juegosdemesa.png', 90, false, true),
    ('otros', 'Otros', 'otros', 'OTROS', '/assets/icons/games/otros.png', '/assets/icons/games/otros.png', 100, true, true);

-- Join table between users and games
CREATE TABLE "UserGame" (
    "userId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGame_pkey" PRIMARY KEY ("userId", "gameId")
);

CREATE INDEX "UserGame_gameId_idx" ON "UserGame"("gameId");

-- Transition Event.game enum column to FK
ALTER TABLE "Event" ADD COLUMN "gameId" TEXT;

-- Backfill Event.gameId from legacy enum column
UPDATE "Event"
SET "gameId" = CASE "game"
    WHEN 'W40K' THEN 'w40k'
    WHEN 'AOS' THEN 'aos'
    WHEN 'TOW' THEN 'tow'
    WHEN 'ESDLA' THEN 'esdla'
    WHEN 'BB' THEN 'bb'
    WHEN 'MARVEL' THEN 'marvel'
    WHEN 'ROL' THEN 'rol'
    WHEN 'MAGIC' THEN 'magic'
    WHEN 'JUEGOS_DE_MESA' THEN 'boardgames'
    WHEN 'OTROS' THEN 'otros'
    ELSE NULL
END
WHERE "game" IS NOT NULL;

-- Backfill UserGame records from legacy enum array
WITH user_games AS (
    SELECT
        u."id" AS "userId",
        CASE game_enum
            WHEN 'W40K' THEN 'w40k'
            WHEN 'AOS' THEN 'aos'
            WHEN 'TOW' THEN 'tow'
            WHEN 'ESDLA' THEN 'esdla'
            WHEN 'BB' THEN 'bb'
            WHEN 'MARVEL' THEN 'marvel'
            WHEN 'ROL' THEN 'rol'
            WHEN 'MAGIC' THEN 'magic'
            WHEN 'JUEGOS_DE_MESA' THEN 'boardgames'
            WHEN 'OTROS' THEN 'otros'
            ELSE NULL
        END AS "gameId"
    FROM "User" AS u
    CROSS JOIN LATERAL UNNEST(COALESCE(u."juegos", ARRAY[]::"Juego"[])) AS game_enum
)
INSERT INTO "UserGame" ("userId", "gameId")
SELECT DISTINCT "userId", "gameId"
FROM user_games
WHERE "gameId" IS NOT NULL;

-- Remove legacy enum columns
ALTER TABLE "User" DROP COLUMN "juegos";
ALTER TABLE "Event" DROP COLUMN "game";

DROP TYPE "Juego";

-- Add foreign keys
ALTER TABLE "UserGame"
    ADD CONSTRAINT "UserGame_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserGame"
    ADD CONSTRAINT "UserGame_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Event"
    ADD CONSTRAINT "Event_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GameInfo_gameId_fkey'
  ) THEN
    ALTER TABLE "GameInfo"
      ADD CONSTRAINT "GameInfo_gameId_fkey"
      FOREIGN KEY ("gameId")
      REFERENCES "Game"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;
