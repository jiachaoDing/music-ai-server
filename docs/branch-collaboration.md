# 三人分支协作与接口清单

## 分支命名

```text
feature/nieziqi-任务
feature/xuna-任务
feature/lujunjia-任务
```

## Nieziqi（用户 / 作品 / 后台）

| 分支 | 模块路径 | 接口 |
|------|----------|------|
| `feature/nieziqi-auth-api` | `src/auth/` | POST `/api/auth/register` `login` `logout` GET `/api/auth/me` |
| `feature/nieziqi-profile-api` | `src/users/` | GET `/api/me` |
| `feature/nieziqi-song-api` | `src/songs/` | GET `/api/song/:id` GET `/api/me/songs` PATCH `/api/song/:id` |
| `feature/nieziqi-publish-api` | `src/songs/` | POST `/api/publish/:id` POST `/api/play/:id` |
| `feature/nieziqi-admin-api` | `src/admin/` | `/api/admin/users` `songs` `invite-codes` |
| `feature/nieziqi-core-db-tables` | `prisma/sql/` | 22 张表 SQL |

## Xuna（AI / 主理人 / 电台）

| 分支 | 模块路径 | 接口 |
|------|----------|------|
| `feature/xuna-ai-lyrics-api` | `src/ai/` | POST `/api/lyrics` |
| `feature/xuna-ai-generate-api` | `src/ai/` | POST `/api/generate` GET `/api/task/:id` |
| `feature/xuna-host-api` | `src/ai/` | GET `/api/host` `/api/curation` `/api/challenges` |
| `feature/xuna-radio-api` | `src/ai/` | GET `/api/radio` |
| `feature/xuna-album-api` | `src/ai/` | POST `/api/album` |
| `feature/xuna-dj-api` | `src/ai/` | POST `/api/dj/:id` GET `/api/daylyric` |

## Lujunjia（社区 / 玩法）

| 分支 | 模块路径 | 接口 |
|------|----------|------|
| `feature/lujunjia-feed-api` | `src/community/` | GET `/api/feed` `/api/resonance` |
| `feature/lujunjia-like-api` | `src/community/` | POST `/api/like/:id` `/api/collect/:id` |
| `feature/lujunjia-comments-api` | `src/community/` | GET/POST `/api/comments/:id` |
| `feature/lujunjia-playlist-api` | `src/playlists/` | `/api/playlists` CRUD |
| `feature/lujunjia-battle-api` | `src/battles/` | GET `/api/battles` POST `/api/battle` `/api/battle/:id/vote` |
| `feature/lujunjia-fortune-api` | `src/fortune/` | GET `/api/dayfortune` `/api/dayart` |
| `feature/lujunjia-tree-api` | `src/tree/` | GET `/api/tree/:id` |
| `feature/lujunjia-qr-api` | `src/qr/` | GET `/api/qr` |
| `feature/lujunjia-admin-api` | `src/admin/` | `/api/admin/comments` `/api/admin/topics` |

## 提交示例

```powershell
git checkout main
git pull
git checkout -b feature/nieziqi-profile-api
git add src/users/
git -c user.name="Nieziqi" -c user.email="1545023392@qq.com" commit -m "feat: add profile API"
git push -u origin feature/nieziqi-profile-api
```

## 启动前

```powershell
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run start:dev
```

Swagger: http://localhost:3000/docs
