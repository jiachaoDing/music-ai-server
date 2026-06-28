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

数据库与部署：

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
