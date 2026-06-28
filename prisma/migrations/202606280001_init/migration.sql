CREATE TABLE "songs" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "style" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ready',
  "audioUrl" TEXT,
  "lyric" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);
