# music-ai-server

NestJS + Prisma + PostgreSQL 后端，用于 AI 音乐生成项目实训。

| 能力 | 地址 |
| --- | --- |
| 健康检查 | `GET /health` |
| 歌曲列表 | `GET /api/songs` |
| Mock 生成 | `POST /api/generate/mock` |
| Swagger | `http://localhost:3000/docs` |
| OpenAPI JSON | `http://localhost:3000/docs-json` |

本地运行：

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run start:dev
```

本地数据库开发流程：

| 步骤 | 命令或配置 | 说明 |
| --- | --- | --- |
| 1 | `cp .env.example .env` | 创建本地环境变量文件，不提交 GitHub |
| 2 | 在 `.env` 配置 `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD` | Docker PostgreSQL 启动时使用 |
| 3 | 在 `.env` 配置 `DATABASE_URL` | NestJS / Prisma 连接本地 PostgreSQL |
| 4 | `docker compose --env-file .env up -d postgres` | 只启动本地 PostgreSQL |
| 5 | `npm run prisma:generate` | 生成 Prisma Client |
| 6 | `npm run prisma:migrate` | 本地创建或更新数据库表结构 |
| 7 | `npm run start:dev` | 本地启动 NestJS 后端 |

本地 `.env` 数据库示例：

```env
POSTGRES_DB=music_ai
POSTGRES_USER=music_ai
POSTGRES_PASSWORD=change_me
DATABASE_URL=postgresql://music_ai:change_me@localhost:5432/music_ai?schema=public
```

如果只调试 `POST /api/generate/mock` 或 `/api/ai/*`，当前接口不依赖数据库，可以先不启动 PostgreSQL。

Docker 一次性启动数据库和后端：

```bash
docker compose --env-file .env up -d --build
```

`.env` 最少需要：

| 变量 | 示例 |
| --- | --- |
| `PORT` | `3000` |
| `CORS_ORIGIN` | `http://localhost:5173` |
| `DATABASE_URL` | `postgresql://music_ai:change_me@localhost:5432/music_ai?schema=public` |
| `POSTGRES_PASSWORD` | `change_me` |

GitHub Actions 会在 `main` 分支提交后执行测试、构建、上传服务器，并通过 Docker Compose 重建服务与执行 Prisma migration。真实密钥只放 GitHub Secrets。
