-- Expand the initial scaffold into the full schema.
-- This migration is intentionally defensive because some development databases
-- were already partially updated before Prisma recorded this migration.

-- Remove constraints/indexes that may exist from manual or earlier partial syncs.
ALTER TABLE IF EXISTS "admin_logs" DROP CONSTRAINT IF EXISTS "admin_logs_adminId_fkey";
ALTER TABLE IF EXISTS "ai_tasks" DROP CONSTRAINT IF EXISTS "ai_tasks_albumId_fkey";
ALTER TABLE IF EXISTS "ai_tasks" DROP CONSTRAINT IF EXISTS "ai_tasks_songId_fkey";
ALTER TABLE IF EXISTS "ai_tasks" DROP CONSTRAINT IF EXISTS "ai_tasks_userId_fkey";
ALTER TABLE IF EXISTS "album_songs" DROP CONSTRAINT IF EXISTS "album_songs_albumId_fkey";
ALTER TABLE IF EXISTS "album_songs" DROP CONSTRAINT IF EXISTS "album_songs_songId_fkey";
ALTER TABLE IF EXISTS "albums" DROP CONSTRAINT IF EXISTS "albums_authorId_fkey";
ALTER TABLE IF EXISTS "battle_votes" DROP CONSTRAINT IF EXISTS "battle_votes_battleId_fkey";
ALTER TABLE IF EXISTS "battle_votes" DROP CONSTRAINT IF EXISTS "battle_votes_userId_fkey";
ALTER TABLE IF EXISTS "battles" DROP CONSTRAINT IF EXISTS "battles_aId_fkey";
ALTER TABLE IF EXISTS "battles" DROP CONSTRAINT IF EXISTS "battles_bId_fkey";
ALTER TABLE IF EXISTS "battles" DROP CONSTRAINT IF EXISTS "battles_createdBy_fkey";
ALTER TABLE IF EXISTS "collects" DROP CONSTRAINT IF EXISTS "collects_playlistId_fkey";
ALTER TABLE IF EXISTS "collects" DROP CONSTRAINT IF EXISTS "collects_songId_fkey";
ALTER TABLE IF EXISTS "collects" DROP CONSTRAINT IF EXISTS "collects_userId_fkey";
ALTER TABLE IF EXISTS "comments" DROP CONSTRAINT IF EXISTS "comments_songId_fkey";
ALTER TABLE IF EXISTS "comments" DROP CONSTRAINT IF EXISTS "comments_userId_fkey";
ALTER TABLE IF EXISTS "fortunes" DROP CONSTRAINT IF EXISTS "fortunes_songId_fkey";
ALTER TABLE IF EXISTS "fortunes" DROP CONSTRAINT IF EXISTS "fortunes_userId_fkey";
ALTER TABLE IF EXISTS "host_contents" DROP CONSTRAINT IF EXISTS "host_contents_relatedSongId_fkey";
ALTER TABLE IF EXISTS "invite_codes" DROP CONSTRAINT IF EXISTS "invite_codes_createdBy_fkey";
ALTER TABLE IF EXISTS "invite_codes" DROP CONSTRAINT IF EXISTS "invite_codes_usedBy_fkey";
ALTER TABLE IF EXISTS "likes" DROP CONSTRAINT IF EXISTS "likes_songId_fkey";
ALTER TABLE IF EXISTS "likes" DROP CONSTRAINT IF EXISTS "likes_userId_fkey";
ALTER TABLE IF EXISTS "playlist_songs" DROP CONSTRAINT IF EXISTS "playlist_songs_playlistId_fkey";
ALTER TABLE IF EXISTS "playlist_songs" DROP CONSTRAINT IF EXISTS "playlist_songs_songId_fkey";
ALTER TABLE IF EXISTS "playlists" DROP CONSTRAINT IF EXISTS "playlists_userId_fkey";
ALTER TABLE IF EXISTS "points_ledger" DROP CONSTRAINT IF EXISTS "points_ledger_userId_fkey";
ALTER TABLE IF EXISTS "remix_relations" DROP CONSTRAINT IF EXISTS "remix_relations_createdBy_fkey";
ALTER TABLE IF EXISTS "remix_relations" DROP CONSTRAINT IF EXISTS "remix_relations_newSongId_fkey";
ALTER TABLE IF EXISTS "remix_relations" DROP CONSTRAINT IF EXISTS "remix_relations_sourceSongId_fkey";
ALTER TABLE IF EXISTS "reports" DROP CONSTRAINT IF EXISTS "reports_userId_fkey";
ALTER TABLE IF EXISTS "songs" DROP CONSTRAINT IF EXISTS "songs_albumId_fkey";
ALTER TABLE IF EXISTS "songs" DROP CONSTRAINT IF EXISTS "songs_authorId_fkey";
ALTER TABLE IF EXISTS "songs" DROP CONSTRAINT IF EXISTS "songs_challengeId_fkey";
ALTER TABLE IF EXISTS "songs" DROP CONSTRAINT IF EXISTS "songs_originId_fkey";
ALTER TABLE IF EXISTS "users" DROP CONSTRAINT IF EXISTS "users_invitedBy_fkey";

DROP INDEX IF EXISTS "ai_tasks_songId_idx";
DROP INDEX IF EXISTS "battle_votes_userId_idx";
DROP INDEX IF EXISTS "battles_aId_idx";
DROP INDEX IF EXISTS "battles_bId_idx";
DROP INDEX IF EXISTS "battles_status_idx";
DROP INDEX IF EXISTS "challenges_status_idx";
DROP INDEX IF EXISTS "collects_playlistId_idx";
DROP INDEX IF EXISTS "collects_songId_idx";
DROP INDEX IF EXISTS "comments_userId_idx";
DROP INDEX IF EXISTS "fortunes_songId_idx";
DROP INDEX IF EXISTS "invite_codes_createdBy_idx";
DROP INDEX IF EXISTS "likes_songId_idx";
DROP INDEX IF EXISTS "playlist_songs_songId_idx";
DROP INDEX IF EXISTS "songs_challengeId_idx";
DROP INDEX IF EXISTS "songs_createdAt_idx";
DROP INDEX IF EXISTS "songs_originId_idx";

-- AlterTable: songs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'lyric'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'lyrics'
  ) THEN
    ALTER TABLE "songs" RENAME COLUMN "lyric" TO "lyrics";
  END IF;
END $$;

ALTER TABLE "songs" ALTER COLUMN "prompt" DROP NOT NULL;
ALTER TABLE "songs" ALTER COLUMN "status" SET DEFAULT 'draft';
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "keywords" JSONB;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'song';
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "tags" JSONB;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "coverImg" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "cover" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "duration" INTEGER;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "isInstrumental" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "forWho" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "unlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "songs" ALTER COLUMN "unlocked" SET DEFAULT false;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
ALTER TABLE "songs" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "authorName" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "authorColor" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "originId" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "challengeId" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "albumId" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "review" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "djText" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "djUrl" TEXT;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "likes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "plays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "coverCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "commentCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "hostPick" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "hostPicked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "color" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "points" INTEGER NOT NULL DEFAULT 0,
    "invitedBy" TEXT,
    "lastCheckin" TEXT,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "stats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invite_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'unused',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "points_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "balance" INTEGER,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "points_ledger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_tasks" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "stage" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "queueAhead" INTEGER,
    "userId" TEXT,
    "songId" TEXT,
    "albumId" TEXT,
    "input" JSONB,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "comments" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userColor" TEXT,
    "text" TEXT NOT NULL,
    "anon" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "collects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "playlistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "collects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "playlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "songCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "playlist_songs" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "playlist_songs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "host_contents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "note" TEXT,
    "relatedSongId" TEXT,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "host_contents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "resonances" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "tags" JSONB,
    "songIds" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL DEFAULT 'system',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "resonances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "challenges" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "emoji" TEXT,
    "color" TEXT,
    "createdBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "battles" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "aId" TEXT NOT NULL,
    "bId" TEXT NOT NULL,
    "aVotes" INTEGER NOT NULL DEFAULT 0,
    "bVotes" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "battle_votes" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "battle_votes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "radio_themes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "scene" TEXT,
    "prompt" TEXT NOT NULL,
    "style" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "radio_themes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fortunes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "mood" JSONB NOT NULL,
    "battery" INTEGER NOT NULL,
    "luckyColor" JSONB NOT NULL,
    "luckyNumber" INTEGER NOT NULL,
    "peak" TEXT,
    "encourage" TEXT,
    "action" TEXT,
    "dos" JSONB,
    "donts" JSONB,
    "recharge" TEXT,
    "img" TEXT,
    "imgGenerating" BOOLEAN NOT NULL DEFAULT false,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "streakBadge" JSONB,
    "songId" TEXT,
    "songTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fortunes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "albums" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "theme" TEXT,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT,
    "trackCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "album_songs" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "album_songs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "remix_relations" (
    "id" TEXT NOT NULL,
    "sourceSongId" TEXT NOT NULL,
    "newSongId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "remix_relations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reports" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "admin_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_name_key" ON "users"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "invite_codes_code_key" ON "invite_codes"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "invite_codes_usedBy_key" ON "invite_codes"("usedBy");
CREATE INDEX IF NOT EXISTS "points_ledger_userId_idx" ON "points_ledger"("userId");
CREATE INDEX IF NOT EXISTS "songs_authorId_idx" ON "songs"("authorId");
CREATE INDEX IF NOT EXISTS "songs_status_idx" ON "songs"("status");
CREATE INDEX IF NOT EXISTS "ai_tasks_userId_idx" ON "ai_tasks"("userId");
CREATE INDEX IF NOT EXISTS "ai_tasks_status_idx" ON "ai_tasks"("status");
CREATE INDEX IF NOT EXISTS "comments_songId_idx" ON "comments"("songId");
CREATE UNIQUE INDEX IF NOT EXISTS "likes_userId_songId_key" ON "likes"("userId", "songId");
CREATE INDEX IF NOT EXISTS "collects_userId_idx" ON "collects"("userId");
CREATE INDEX IF NOT EXISTS "playlists_userId_idx" ON "playlists"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "playlist_songs_playlistId_songId_key" ON "playlist_songs"("playlistId", "songId");
CREATE UNIQUE INDEX IF NOT EXISTS "battle_votes_battleId_userId_key" ON "battle_votes"("battleId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "fortunes_userId_date_key" ON "fortunes"("userId", "date");
CREATE INDEX IF NOT EXISTS "albums_authorId_idx" ON "albums"("authorId");
CREATE UNIQUE INDEX IF NOT EXISTS "album_songs_albumId_songId_key" ON "album_songs"("albumId", "songId");
CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_usedBy_fkey" FOREIGN KEY ("usedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "songs" ADD CONSTRAINT "songs_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "songs" ADD CONSTRAINT "songs_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "songs" ADD CONSTRAINT "songs_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "likes" ADD CONSTRAINT "likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "likes" ADD CONSTRAINT "likes_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collects" ADD CONSTRAINT "collects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collects" ADD CONSTRAINT "collects_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collects" ADD CONSTRAINT "collects_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_contents" ADD CONSTRAINT "host_contents_relatedSongId_fkey" FOREIGN KEY ("relatedSongId") REFERENCES "songs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "battles" ADD CONSTRAINT "battles_aId_fkey" FOREIGN KEY ("aId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "battles" ADD CONSTRAINT "battles_bId_fkey" FOREIGN KEY ("bId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "battles" ADD CONSTRAINT "battles_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "battle_votes" ADD CONSTRAINT "battle_votes_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "battle_votes" ADD CONSTRAINT "battle_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fortunes" ADD CONSTRAINT "fortunes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fortunes" ADD CONSTRAINT "fortunes_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "albums" ADD CONSTRAINT "albums_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "album_songs" ADD CONSTRAINT "album_songs_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "album_songs" ADD CONSTRAINT "album_songs_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "remix_relations" ADD CONSTRAINT "remix_relations_sourceSongId_fkey" FOREIGN KEY ("sourceSongId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "remix_relations" ADD CONSTRAINT "remix_relations_newSongId_fkey" FOREIGN KEY ("newSongId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "remix_relations" ADD CONSTRAINT "remix_relations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
