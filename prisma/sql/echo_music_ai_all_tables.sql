-- =============================================================================
-- Echo AI 音乐社区 - 全量建表 SQL
-- =============================================================================
-- 数据库: PostgreSQL
-- 数据表: 22 张（依据《Echo AI 音乐社区数据表一览.md》）
--
-- 表清单:
--   1.  users            User          用户表
--   2.  invite_codes     InviteCode    邀请码表
--   3.  points_ledger    PointsLedger  积分流水表
--   4.  songs            Song          作品表
--   5.  ai_tasks         AiTask        AI 异步任务表
--   6.  comments         Comment       评论表
--   7.  likes            Like          点赞表
--   8.  collects         Collect       收藏表
--   9.  playlists        Playlist      歌单表
--  10.  playlist_songs   PlaylistSong  歌单作品关系表
--  11.  host_contents    HostContent   AI 主理人内容表
--  12.  resonances       Resonance     同频推荐表
--  13.  challenges       Challenge     话题挑战表
--  14.  battles          Battle        PK 擂台表
--  15.  battle_votes     BattleVote    PK 投票表
--  16.  radio_themes     RadioTheme    电台主题表
--  17.  fortunes         Fortune       时运记录表
--  18.  albums           Album         专辑表
--  19.  album_songs      AlbumSong     专辑曲目关系表
--  20.  remix_relations  RemixRelation 二创关系表
--  21.  reports          Report        举报记录表
--  22.  admin_logs       AdminLog      管理操作日志表
--
-- 使用方式（在目标数据库中执行）:
--   psql -U postgres -d echo_music_ai -f echo_music_ai_all_tables.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. users (User)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
    "id"           TEXT         NOT NULL,
    "name"         TEXT         NOT NULL,
    "passwordHash" TEXT         NOT NULL,
    "avatarUrl"    TEXT,
    "color"        TEXT,
    "role"         TEXT         NOT NULL DEFAULT 'user',
    "points"       INTEGER      NOT NULL DEFAULT 0,
    "invitedBy"    TEXT,
    "lastCheckin"  TEXT,
    "streak"       INTEGER      NOT NULL DEFAULT 0,
    "stats"        JSONB,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 2. invite_codes (InviteCode)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "invite_codes" (
    "id"        TEXT         NOT NULL,
    "code"      TEXT         NOT NULL,
    "createdBy" TEXT         NOT NULL,
    "usedBy"    TEXT,
    "usedAt"    TIMESTAMP(3),
    "status"    TEXT         NOT NULL DEFAULT 'unused',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 3. points_ledger (PointsLedger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "points_ledger" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "delta"     INTEGER      NOT NULL,
    "reason"    TEXT         NOT NULL,
    "balance"   INTEGER,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "points_ledger_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 4. challenges (Challenge) — songs 外键依赖，需先于 songs 创建
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "challenges" (
    "id"        TEXT         NOT NULL,
    "title"     TEXT         NOT NULL,
    "desc"      TEXT,
    "emoji"     TEXT,
    "color"     TEXT,
    "createdBy" TEXT,
    "status"    TEXT         NOT NULL DEFAULT 'active',
    "active"    BOOLEAN      NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 5. albums (Album) — songs 外键依赖，需先于 songs 创建
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "albums" (
    "id"          TEXT         NOT NULL,
    "title"       TEXT         NOT NULL,
    "description" TEXT,
    "coverUrl"    TEXT,
    "theme"       TEXT,
    "authorId"    TEXT         NOT NULL,
    "authorName"  TEXT,
    "trackCount"  INTEGER      NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 6. songs (Song)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "songs" (
    "id"             TEXT         NOT NULL,
    "title"          TEXT         NOT NULL,
    "description"    TEXT,
    "prompt"         TEXT,
    "keywords"       JSONB,
    "mode"           TEXT         NOT NULL DEFAULT 'song',
    "style"          TEXT         NOT NULL,
    "tags"           JSONB,
    "lyrics"         TEXT,
    "audioUrl"       TEXT,
    "coverImg"       TEXT,
    "cover"          TEXT,
    "duration"       INTEGER,
    "status"         TEXT         NOT NULL DEFAULT 'draft',
    "published"      BOOLEAN      NOT NULL DEFAULT false,
    "isInstrumental" BOOLEAN      NOT NULL DEFAULT false,
    "forWho"         TEXT,
    "unlocked"       BOOLEAN      NOT NULL DEFAULT false,
    "authorId"       TEXT,
    "authorName"     TEXT,
    "authorColor"    TEXT,
    "originId"       TEXT,
    "challengeId"    TEXT,
    "albumId"        TEXT,
    "review"         TEXT,
    "djText"         TEXT,
    "djUrl"          TEXT,
    "likes"          INTEGER      NOT NULL DEFAULT 0,
    "plays"          INTEGER      NOT NULL DEFAULT 0,
    "coverCount"     INTEGER      NOT NULL DEFAULT 0,
    "commentCount"   INTEGER      NOT NULL DEFAULT 0,
    "hostPick"       BOOLEAN      NOT NULL DEFAULT false,
    "hostPicked"     BOOLEAN      NOT NULL DEFAULT false,
    "publishedAt"    TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 7. ai_tasks (AiTask)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ai_tasks" (
    "id"         TEXT         NOT NULL,
    "type"       TEXT         NOT NULL,
    "status"     TEXT         NOT NULL DEFAULT 'queued',
    "stage"      TEXT,
    "progress"   INTEGER      NOT NULL DEFAULT 0,
    "queueAhead" INTEGER,
    "userId"     TEXT,
    "songId"     TEXT,
    "albumId"    TEXT,
    "input"      JSONB,
    "result"     JSONB,
    "error"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_tasks_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 8. comments (Comment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "comments" (
    "id"        TEXT         NOT NULL,
    "songId"    TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "userName"  TEXT,
    "userColor" TEXT,
    "text"      TEXT         NOT NULL,
    "anon"      BOOLEAN      NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 9. likes (Like)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "likes" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "songId"    TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 10. playlists (Playlist)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "playlists" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "color"     TEXT,
    "type"      TEXT         NOT NULL DEFAULT 'custom',
    "isSystem"  BOOLEAN      NOT NULL DEFAULT false,
    "songCount" INTEGER      NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 11. collects (Collect)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "collects" (
    "id"         TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "songId"     TEXT         NOT NULL,
    "playlistId" TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "collects_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 12. playlist_songs (PlaylistSong)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "playlist_songs" (
    "id"         TEXT         NOT NULL,
    "playlistId" TEXT         NOT NULL,
    "songId"     TEXT         NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "playlist_songs_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 13. host_contents (HostContent)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "host_contents" (
    "id"            TEXT         NOT NULL,
    "type"          TEXT         NOT NULL,
    "title"         TEXT         NOT NULL,
    "content"       TEXT         NOT NULL,
    "note"          TEXT,
    "relatedSongId" TEXT,
    "color"         TEXT,
    "active"        BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "host_contents_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 14. resonances (Resonance)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "resonances" (
    "id"          TEXT         NOT NULL,
    "title"       TEXT         NOT NULL,
    "reason"      TEXT,
    "tags"        JSONB,
    "songIds"     JSONB        NOT NULL,
    "generatedBy" TEXT         NOT NULL DEFAULT 'system',
    "active"      BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "resonances_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 15. battles (Battle)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "battles" (
    "id"        TEXT         NOT NULL,
    "topic"     TEXT         NOT NULL,
    "aId"       TEXT         NOT NULL,
    "bId"       TEXT         NOT NULL,
    "aVotes"    INTEGER      NOT NULL DEFAULT 0,
    "bVotes"    INTEGER      NOT NULL DEFAULT 0,
    "createdBy" TEXT         NOT NULL,
    "status"    TEXT         NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 16. battle_votes (BattleVote)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "battle_votes" (
    "id"        TEXT         NOT NULL,
    "battleId"  TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "side"      TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "battle_votes_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 17. radio_themes (RadioTheme)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "radio_themes" (
    "id"        TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "emoji"     TEXT,
    "scene"     TEXT,
    "prompt"    TEXT         NOT NULL,
    "style"     TEXT,
    "sortOrder" INTEGER      NOT NULL DEFAULT 0,
    "active"    BOOLEAN      NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "radio_themes_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 18. fortunes (Fortune)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "fortunes" (
    "id"            TEXT         NOT NULL,
    "userId"        TEXT         NOT NULL,
    "date"          TEXT         NOT NULL,
    "keyword"       TEXT         NOT NULL,
    "mood"          JSONB        NOT NULL,
    "battery"       INTEGER      NOT NULL,
    "luckyColor"    JSONB        NOT NULL,
    "luckyNumber"   INTEGER      NOT NULL,
    "peak"          TEXT,
    "encourage"     TEXT,
    "action"        TEXT,
    "dos"           JSONB,
    "donts"         JSONB,
    "recharge"      TEXT,
    "img"           TEXT,
    "imgGenerating" BOOLEAN      NOT NULL DEFAULT false,
    "streak"        INTEGER      NOT NULL DEFAULT 0,
    "streakBadge"   JSONB,
    "songId"        TEXT,
    "songTitle"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fortunes_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 19. album_songs (AlbumSong)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "album_songs" (
    "id"        TEXT         NOT NULL,
    "albumId"   TEXT         NOT NULL,
    "songId"    TEXT         NOT NULL,
    "order"     INTEGER      NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "album_songs_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 20. remix_relations (RemixRelation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "remix_relations" (
    "id"           TEXT         NOT NULL,
    "sourceSongId" TEXT         NOT NULL,
    "newSongId"    TEXT         NOT NULL,
    "type"         TEXT         NOT NULL,
    "createdBy"    TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "remix_relations_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 21. reports (Report)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "reports" (
    "id"         TEXT         NOT NULL,
    "targetType" TEXT         NOT NULL,
    "targetId"   TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "reason"     TEXT         NOT NULL,
    "status"     TEXT         NOT NULL DEFAULT 'pending',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 22. admin_logs (AdminLog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "admin_logs" (
    "id"         TEXT         NOT NULL,
    "adminId"    TEXT         NOT NULL,
    "action"     TEXT         NOT NULL,
    "targetType" TEXT         NOT NULL,
    "targetId"   TEXT         NOT NULL,
    "detail"     JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- 唯一索引 / 普通索引
-- =============================================================================
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

-- =============================================================================
-- 外键约束
-- =============================================================================
DO $$ BEGIN
    ALTER TABLE "users" ADD CONSTRAINT "users_invitedBy_fkey"
        FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_usedBy_fkey"
        FOREIGN KEY ("usedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "albums" ADD CONSTRAINT "albums_authorId_fkey"
        FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "songs" ADD CONSTRAINT "songs_authorId_fkey"
        FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "songs" ADD CONSTRAINT "songs_challengeId_fkey"
        FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "songs" ADD CONSTRAINT "songs_albumId_fkey"
        FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_songId_fkey"
        FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_albumId_fkey"
        FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_songId_fkey"
        FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "likes" ADD CONSTRAINT "likes_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "likes" ADD CONSTRAINT "likes_songId_fkey"
        FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "playlists" ADD CONSTRAINT "playlists_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "collects" ADD CONSTRAINT "collects_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "collects" ADD CONSTRAINT "collects_songId_fkey"
        FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "collects" ADD CONSTRAINT "collects_playlistId_fkey"
        FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_playlistId_fkey"
        FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_songId_fkey"
        FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "host_contents" ADD CONSTRAINT "host_contents_relatedSongId_fkey"
        FOREIGN KEY ("relatedSongId") REFERENCES "songs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "battles" ADD CONSTRAINT "battles_aId_fkey"
        FOREIGN KEY ("aId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "battles" ADD CONSTRAINT "battles_bId_fkey"
        FOREIGN KEY ("bId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "battles" ADD CONSTRAINT "battles_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "battle_votes" ADD CONSTRAINT "battle_votes_battleId_fkey"
        FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "battle_votes" ADD CONSTRAINT "battle_votes_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "fortunes" ADD CONSTRAINT "fortunes_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "fortunes" ADD CONSTRAINT "fortunes_songId_fkey"
        FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "album_songs" ADD CONSTRAINT "album_songs_albumId_fkey"
        FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "album_songs" ADD CONSTRAINT "album_songs_songId_fkey"
        FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "remix_relations" ADD CONSTRAINT "remix_relations_sourceSongId_fkey"
        FOREIGN KEY ("sourceSongId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "remix_relations" ADD CONSTRAINT "remix_relations_newSongId_fkey"
        FOREIGN KEY ("newSongId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "remix_relations" ADD CONSTRAINT "remix_relations_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_adminId_fkey"
        FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

-- =============================================================================
-- 建表完成: 共 22 张表
-- =============================================================================
