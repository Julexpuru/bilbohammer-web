-- Create table to store administrative edits performed through the user management panel
CREATE TABLE "UserChangeLog" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "adminId" INTEGER,
    "adminEmail" TEXT,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "UserChangeLog"
ADD CONSTRAINT "UserChangeLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserChangeLog"
ADD CONSTRAINT "UserChangeLog_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "UserChangeLog_createdAt_idx" ON "UserChangeLog" ("createdAt" DESC);
CREATE INDEX "UserChangeLog_userId_idx" ON "UserChangeLog" ("userId");
