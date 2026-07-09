# Echo AI 音乐社区数据内容文档（正式版）

| 文档项 | 内容 |
| --- | --- |
| 文档名称 | Echo AI 音乐社区数据内容文档（正式版） |
| 适用项目 | `music-ai-web` + `music-ai-server` |
| 数据库 | PostgreSQL |
| ORM | Prisma |
| 关联文档 | SRS、产品设计文档、页面设计文档、交互流程文档、API 契约文档 |
| 文档用途 | 统一项目数据对象、页面展示数据、API 返回字段、数据库持久化字段和 mock 数据准备 |

## 1. 文档说明

本数据内容文档用于说明 Echo AI 音乐社区中需要管理、展示、传输和持久化的数据内容。文档服务于前端页面开发、后端数据库设计、API 联调、mock 数据准备和后续测试验收。

本项目功能流程以 `music-example` Demo 为参考，但正式项目基于 `music-ai-web + music-ai-server` 前后端分离架构重新实现。Demo 中使用 JSON 文件、内存对象和前端 `localStorage` 保存的数据，在正式版中需要根据实际情况迁移为 PostgreSQL 数据表，或由后端统一返回。

## 2. 数据设计目标

| 目标 | 说明 |
| --- | --- |
| 支持功能复现 | 覆盖 Demo 中已有的用户、创作、作品、草稿、电台、PK、时运、专辑、二创、AI 主理人等功能 |
| 支持正式架构 | 数据存储从 JSON / localStorage 转为 PostgreSQL + Prisma |
| 支持前端开发 | 明确页面需要展示哪些数据，方便前端准备 mock |
| 支持后端开发 | 明确数据库需要保存哪些表和字段 |
| 支持接口联调 | 明确数据库字段和 API 返回字段之间的映射关系 |
| 支持测试验收 | 明确哪些数据用于验证功能是否完成 |

## 3. 字段类型说明

本文档中的字段类型用于指导后端 Prisma 建模和前后端理解数据结构，不要求前端页面直接照搬数据库字段名。

| 类型 | 含义 |
| --- | --- |
| String | 字符串 |
| Int | 整数 |
| Boolean | 布尔值，通常为 true / false |
| DateTime | 时间类型，接口返回时建议统一为 ISO 字符串 |
| Json | JSON 数据，可保存数组或结构化对象 |
| 可为空 | 该字段不是必填，数据库中可以为空，接口中也可能返回 null 或不返回 |

## 4. 数据来源与落地依据

| 来源 | 说明 |
| --- | --- |
| `music-example` Demo | 作为功能流程、页面体验和已有数据内容参考 |
| `songs.json` | 参考作品、草稿、发布状态、互动统计等数据 |
| `users.json` | 参考用户、积分、邀请码、统计信息等数据 |
| `db.json` | 参考话题挑战、PK、专辑、主理人策展等数据 |
| `localStorage` | 参考歌单、点赞标记、PK 投票标记、时运日历等前端本地数据 |
| `music-ai-server` | 正式后端脚手架，使用 NestJS + Prisma + PostgreSQL |
| API 契约文档 | 作为前后端接口字段和返回结构依据 |
| 页面设计文档 | 作为页面展示数据依据 |

## 5. 核心数据对象总览

| 数据对象 | 说明 | 主要使用页面 | 是否建议入库 |
| --- | --- | --- | --- |
| User | 用户账号、昵称、头像、角色、积分 | 登录注册、我的、后台 | 是 |
| InviteCode | 注册邀请码 | 注册、我的、后台 | 是 |
| PointsLedger | 积分流水 | 我的、AI 创作、时运、专辑制作 | 是 |
| Song | 音乐作品、草稿、电台曲、时运曲、专辑曲目 | 首页、创作、详情、我的、电台 | 是 |
| AiTask | AI 异步生成任务 | AI 创作、任务轮询、专辑制作 | 建议入库 |
| Comment | 树洞留言 / 评论 | 作品详情、后台 | 是 |
| Like | 点赞记录 | 作品详情、首页卡片 | 是 |
| Collect | 收藏记录 | 作品详情、我的歌单 | 是 |
| Playlist | 用户歌单 | 我的、收藏弹窗、播放器 | 是 |
| PlaylistSong | 歌单与作品关系 | 歌单详情、收藏作品 | 是 |
| Challenge | 话题挑战 | 发现页、AI 创作入口 | 是 |
| Battle | PK 擂台 | 发现页、PK 页面 | 是 |
| BattleVote | PK 投票记录 | PK 页面 | 是 |
| RadioTheme | 电台主题 | 电台页 | 可先固定返回，后续入库 |
| Fortune | 时运曲和日历打卡 | 发现页、时运页 | 是 |
| Album | 专辑 / 概念 EP | AI 音乐制作人、专辑详情 | 是 |
| AlbumSong | 专辑曲目关系 | 专辑详情 | 是 |
| RemixRelation | 二创 / 翻唱关系 | 作品详情、进化树 | 是 |
| HostContent | AI 主理人策展内容 | 首页、AI 主理人页 | 是 |
| Resonance | 同频推荐 / 社区共鸣 | 首页 Feed | 可后端组装，后续入库 |
| Report | 举报记录 | 作品详情、后台 | 后置扩展 |
| AdminLog | 管理员操作日志 | 管理后台 | 后置扩展 |

## 6. 页面数据需求

| 页面 | 主要数据 | 说明 |
| --- | --- | --- |
| 登录 / 注册页 | User、InviteCode | 注册需要邀请码，登录后返回用户信息和 token |
| 首页 Feed 页 | Song、HostContent、Resonance | 展示作品流、推荐、热榜和主理人策展 |
| 发现页 | Challenge、Battle、Fortune | 展示话题挑战、PK 擂台和时运入口 |
| AI 创作页 | Song、AiTask、PointsLedger、Challenge | 输入灵感、生成歌词 / 音乐、消耗积分、保存草稿 |
| 作品详情页 | Song、Comment、Like、Collect、Playlist、RemixRelation | 播放、点赞、收藏、留言、发布、二创、进化树 |
| 我的页面 | User、Song、Playlist、PointsLedger、InviteCode | 用户信息、草稿、作品、歌单、积分、邀请码 |
| 电台页 | RadioTheme、Song、AiTask | 展示电台主题并生成纯音乐 |
| 时运页 | Fortune、Song | 展示日卡、日历、时运曲、连续打卡 |
| AI 音乐制作人页 | Album、AlbumSong、Song、AiTask | 生成概念 EP 和专辑曲目 |
| PK 擂台页 | Battle、BattleVote、Song | 创建 PK、展示对战作品、投票 |
| AI 主理人页 | HostContent、Song、Challenge | 今日翻牌、策展推荐、话题和主打歌 |
| 管理后台 | User、Song、Comment、InviteCode、Challenge、Report | 用户、作品、评论、邀请码和内容管理 |

## 7. Demo 数据到正式数据的迁移关系

| Demo 数据 | 正式版处理方式 |
| --- | --- |
| `songs.json` 中的作品数据 | 迁移为 `Song` 表 |
| `users.json` 中的用户数据 | 迁移为 `User` 表 |
| `users.json.ledger` | 拆分为 `PointsLedger` 表 |
| `users.json.inviteCodes` | 拆分为 `InviteCode` 表 |
| `songs.likedBy` | 拆分为 `Like` 表 |
| `songs.collectedBy` | 拆分为 `Collect` / `PlaylistSong` 表 |
| `server.js` 内存任务对象 | 可先保留内存，正式建议迁移为 `AiTask` 表 |
| `localStorage.playlists` | 迁移为 `Playlist` / `PlaylistSong` 表 |
| `localStorage.voted_*` | 迁移为 `BattleVote` 表 |
| `localStorage.echo_checkins` | 迁移为 `Fortune` 表 |
| `db.json.challenges` | 迁移为 `Challenge` 表 |
| `db.json.battles` | 迁移为 `Battle` / `BattleVote` 表 |
| `db.json.albums` | 迁移为 `Album` / `AlbumSong` 表 |
| `db.json.curation`、`hostDaily` | 迁移为 `HostContent`，部分推荐可由后端组装 |
| Demo 电台主题常量 | 可先由后端固定返回，后续迁移为 `RadioTheme` 表 |

## 8. 数据库字段与 API 字段映射

数据库字段面向后端持久化，API 字段面向前端页面展示。两者可以不同，但必须由后端 Service 统一转换。

| 数据库字段 | API 返回字段 | 说明 |
| --- | --- | --- |
| `User.name` | `nickname` | 用户昵称 |
| `User.points` | `echoPoints` | 回声积分余额 |
| `Song.coverImg` | `coverUrl` | 作品封面 |
| `Song.review` | `aiReview` | AI 乐评 |
| `Song.likes` 或 `Like` 统计 | `likeCount` | 点赞数 |
| `Song.plays` | `playCount` | 播放数 |
| `Song.coverCount` 或 `RemixRelation` 统计 | `remixCount` | 二创 / 翻唱数 |
| `Comment` 统计 | `commentCount` | 评论数 |
| `Collect` / `PlaylistSong` 统计 | `collectCount` | 收藏数 |
| `PointsLedger.delta` | `delta` | 积分变动 |
| `Album.title` | `title` | 专辑名称 |
| `Album.description` | `description` | 专辑简介 |
| `Album.trackCount` | `trackCount` | 专辑曲目数 |
| `Challenge.desc` | `prompt` 或 `desc` | 话题引导文案 |
| `Battle.aId/bId` | `songA/songB` | 后端查询作品后组装对象 |

## 9. 用户与账号数据

### 9.1 User 用户

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 用户 ID |
| name | String | 用户昵称 |
| passwordHash | String | 加密后的密码 |
| avatarUrl | String（可为空） | 头像地址 |
| color | String（可为空） | 头像底色或渐变色 |
| role | String | `user/admin` |
| points | Int | 回声积分余额 |
| invitedBy | String（可为空） | 邀请人 ID |
| lastCheckin | String（可为空） | 最近打卡日期 |
| streak | Int | 连续打卡天数 |
| stats | Json（可为空） | 用户统计 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 9.2 InviteCode 邀请码

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 邀请码 ID |
| code | String | 邀请码内容 |
| createdBy | String | 创建者 ID |
| usedBy | String（可为空） | 使用者 ID |
| usedAt | DateTime（可为空） | 使用时间 |
| status | String | `unused/used/disabled` |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 9.3 PointsLedger 积分流水

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 流水 ID |
| userId | String | 用户 ID |
| delta | Int | 积分变化，正数增加，负数消耗 |
| reason | String | 变化原因 |
| balance | Int（可为空） | 变化后的积分余额 |
| relatedId | String（可为空） | 关联作品、任务或活动 ID |
| createdAt | DateTime | 创建时间 |

常见积分变化：

| 场景 | 积分变化 |
| --- | --- |
| 注册赠送 | +N |
| 每日打卡 | +N |
| 生成歌曲 | -2 |
| 生成封面 | -1 |
| 电台纯音乐 | -1 |
| 二创 / 翻唱 | -1 |
| AI 音乐制作人专辑 | -5 |
| 时运曲 | -1 |

## 10. 作品与创作数据

### 10.1 Song 作品

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 作品 ID |
| title | String | 歌名，发布前可修改 |
| description | String（可为空） | 作品简介 |
| prompt | String（可为空） | 用户原始灵感 |
| keywords | Json（可为空） | 关键词 |
| mode | String | 创作模式 |
| style | String | 音乐风格 |
| tags | Json（可为空） | 标签数组 |
| lyrics | String（可为空） | 歌词 |
| audioUrl | String（可为空） | 音频地址 |
| coverImg | String（可为空） | 封面图地址 |
| cover | String（可为空） | 渐变色 fallback |
| duration | Int（可为空） | 时长，单位秒 |
| status | String | `generating/draft/published/private/failed/hidden/removed` |
| published | Boolean | 是否公开发布 |
| isInstrumental | Boolean | 是否纯音乐 |
| forWho | String（可为空） | 为 TA 写歌对象 |
| unlocked | Boolean | 为 TA 写歌是否解锁 |
| authorId | String | 作者 ID |
| authorName | String（可为空） | 作者昵称快照 |
| authorColor | String（可为空） | 作者颜色快照 |
| originId | String（可为空） | 二创来源作品 ID |
| challengeId | String（可为空） | 来源话题挑战 ID |
| albumId | String（可为空） | 所属专辑 ID |
| review | String（可为空） | AI 乐评 |
| djText | String（可为空） | AI DJ 播报文案 |
| djUrl | String（可为空） | AI DJ 播报音频 |
| likes | Int | 点赞数冗余 |
| plays | Int | 播放数冗余 |
| coverCount | Int | 二创 / 翻唱数量冗余 |
| commentCount | Int | 评论数量冗余 |
| hostPick | Boolean | 是否为主理人主打歌 |
| hostPicked | Boolean | 是否被主理人翻牌 |
| publishedAt | DateTime（可为空） | 发布时间 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 10.2 作品模式

| mode | 名称 | 说明 |
| --- | --- | --- |
| song | 常规创作 | 输入灵感生成完整歌曲 |
| meme | 梗歌制造机 | 把热梗、吐槽生成歌曲 |
| emotion | 情绪炼歌 | 根据情绪或日记生成歌曲 |
| photo | 看图写歌 | 根据图片生成歌曲 |
| foryou | 为 TA 写歌 | 给指定对象生成专属歌曲 |
| radio | 电台纯音乐 | 根据电台主题生成纯音乐 |
| remix | 翻唱 / 二创 | 基于已有作品二次创作 |
| fortune | 时运曲 | 根据每日时运生成歌曲 |
| album | 专辑曲目 | AI 音乐制作人生成的 EP 曲目 |

### 10.3 作品状态

| 状态 | 说明 |
| --- | --- |
| generating | 生成中 |
| draft | 草稿 |
| published | 已公开发布 |
| private | 私密作品 |
| failed | 生成失败 |
| hidden | 后台隐藏 |
| removed | 已删除或下架 |

### 10.4 AiTask 异步任务

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 任务 ID |
| type | String | `generate/album/remix/fortune/radio/dj` |
| status | String | `queued/running/done/error` |
| stage | String（可为空） | 当前阶段文案 |
| progress | Int | 进度百分比 |
| queueAhead | Int（可为空） | 前方排队数 |
| userId | String（可为空） | 发起用户 ID |
| songId | String（可为空） | 生成后的作品 ID |
| albumId | String（可为空） | 生成后的专辑 ID |
| input | Json（可为空） | 请求参数快照 |
| result | Json（可为空） | 生成结果 |
| error | String（可为空） | 失败原因 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

## 11. 社区互动数据

### 11.1 Comment 评论 / 树洞留言

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 评论 ID |
| songId | String | 作品 ID |
| userId | String | 评论用户 ID |
| userName | String（可为空） | 用户昵称快照 |
| userColor | String（可为空） | 用户颜色快照 |
| text | String | 评论内容 |
| anon | Boolean | 是否匿名 |
| deletedAt | DateTime（可为空） | 删除时间 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 11.2 Like 点赞

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 点赞记录 ID |
| userId | String | 用户 ID |
| songId | String | 作品 ID |
| createdAt | DateTime | 创建时间 |

约束：同一用户对同一作品只能点赞一次。

### 11.3 Collect 收藏

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 收藏记录 ID |
| userId | String | 用户 ID |
| songId | String | 作品 ID |
| playlistId | String（可为空） | 收藏到的歌单 ID |
| createdAt | DateTime | 创建时间 |

## 12. 歌单数据

### 12.1 Playlist 歌单

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 歌单 ID |
| userId | String | 所属用户 ID |
| name | String | 歌单名称 |
| color | String（可为空） | 歌单渐变色 |
| type | String | `liked/custom` |
| isSystem | Boolean | 是否系统歌单 |
| songCount | Int | 歌曲数量冗余 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 12.2 PlaylistSong 歌单作品关系

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 关系 ID |
| playlistId | String | 歌单 ID |
| songId | String | 作品 ID |
| createdAt | DateTime | 添加时间 |

约束：同一歌单中同一作品只能出现一次。

## 13. AI 主理人与推荐数据

### 13.1 HostContent AI 主理人内容

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 内容 ID |
| type | String | `curation/pick/topic/inspiration/announcement` |
| title | String | 标题 |
| content | String | 内容 |
| note | String（可为空） | 主理人笔记 |
| relatedSongId | String（可为空） | 关联作品 ID |
| color | String（可为空） | 展示色 |
| active | Boolean | 是否启用 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 13.2 Resonance 同频推荐

第一阶段可不建表，直接由后端根据作品标签、风格、热度和主理人策展内容组装返回。如果需要后台维护推荐内容，再建立该表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 推荐 ID |
| title | String | 推荐标题 |
| reason | String（可为空） | 推荐原因 |
| tags | Json（可为空） | 推荐标签 |
| songIds | Json | 推荐作品 ID 数组 |
| generatedBy | String | `host/system/admin` |
| active | Boolean | 是否启用 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

## 14. 发现页、话题挑战和 PK 数据

### 14.1 Challenge 话题挑战

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 挑战 ID |
| title | String | 挑战标题 |
| desc | String（可为空） | 引导文案 |
| emoji | String（可为空） | 图标 |
| color | String（可为空） | 渐变色 |
| createdBy | String（可为空） | 创建者 |
| status | String | `active/closed/hidden` |
| active | Boolean | 是否启用 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 14.2 Battle PK 擂台

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 擂台 ID |
| topic | String | 对决主题 |
| aId | String | A 方作品 ID |
| bId | String | B 方作品 ID |
| aVotes | Int | A 方票数 |
| bVotes | Int | B 方票数 |
| createdBy | String | 创建者 ID |
| status | String | `active/closed/hidden` |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 14.3 BattleVote 投票记录

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 投票 ID |
| battleId | String | 擂台 ID |
| userId | String | 投票用户 ID |
| side | String | `A/B` |
| createdAt | DateTime | 创建时间 |

约束：同一用户对同一擂台只能投一次。

## 15. 电台与 AI DJ 数据

### 15.1 RadioTheme 电台主题

第一阶段可不建表，由后端固定返回 `/api/radio` 数据。后续需要后台配置电台主题时再入库。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 电台主题 ID |
| name | String | 主题名称 |
| emoji | String（可为空） | 图标 |
| scene | String（可为空） | 场景描述 |
| prompt | String | 生成纯音乐用 prompt |
| style | String（可为空） | 推荐风格 |
| sortOrder | Int | 排序 |
| active | Boolean | 是否启用 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 15.2 AI DJ 数据

AI DJ 数据主要挂在 `Song` 表中：

| 字段 | 所属表 | 说明 |
| --- | --- | --- |
| djText | Song | AI DJ 播报文案 |
| djUrl | Song | AI DJ 播报音频 |

## 16. 时运曲与日历数据

### 16.1 Fortune 时运记录

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 时运记录 ID |
| userId | String | 用户 ID |
| date | String | 日期，`YYYY-MM-DD` |
| keyword | String | 今日关键词 |
| mood | Json | 今日基调 |
| battery | Int | 社交电量 |
| luckyColor | Json | 幸运色 |
| luckyNumber | Int | 幸运数字 |
| peak | String（可为空） | 能量高峰 |
| encourage | String（可为空） | 鼓励语 |
| action | String（可为空） | 今日行动 |
| dos | Json（可为空） | 宜做事项 |
| donts | Json（可为空） | 忌做事项 |
| recharge | String（可为空） | 充电小事 |
| img | String（可为空） | 治愈插画 |
| imgGenerating | Boolean | 插画是否生成中 |
| streak | Int | 连续打卡天数 |
| streakBadge | Json（可为空） | 连续打卡徽章 |
| songId | String（可为空） | 生成的时运曲 ID |
| songTitle | String（可为空） | 时运曲标题 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

约束：同一用户同一天只能有一条时运记录。

## 17. 专辑与二创数据

### 17.1 Album 专辑

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 专辑 ID |
| title | String | 专辑名称 |
| description | String（可为空） | 专辑简介 |
| coverUrl | String（可为空） | 专辑封面 |
| theme | String（可为空） | 用户输入主题 |
| authorId | String | 作者 ID |
| authorName | String（可为空） | 作者昵称快照 |
| trackCount | Int | 曲目数量 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 17.2 AlbumSong 专辑曲目关系

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 关系 ID |
| albumId | String | 专辑 ID |
| songId | String | 作品 ID |
| order | Int | 曲目顺序 |
| createdAt | DateTime | 创建时间 |

### 17.3 RemixRelation 二创关系

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 关系 ID |
| sourceSongId | String | 原作品 ID |
| newSongId | String | 新作品 ID |
| type | String | `remix/cover` |
| createdBy | String（可为空） | 创建者 ID |
| createdAt | DateTime | 创建时间 |

## 18. 管理后台数据

| 管理模块 | 数据来源 | 可管理内容 |
| --- | --- | --- |
| 用户管理 | User | 查看用户、角色、注册时间、积分 |
| 作品管理 | Song | 查看、隐藏、恢复、删除作品 |
| 评论管理 | Comment | 查看、删除树洞留言 |
| 邀请码管理 | InviteCode | 生成、禁用、查看邀请码 |
| 话题挑战管理 | Challenge | 新增、编辑、隐藏、关闭挑战 |
| 举报管理 | Report | 查看和处理举报 |

### 18.1 Report 举报记录

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 举报 ID |
| targetType | String | `song/comment/user` |
| targetId | String | 被举报对象 ID |
| userId | String | 举报用户 ID |
| reason | String | 举报原因 |
| status | String | `pending/resolved/rejected` |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 18.2 AdminLog 管理操作日志

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 日志 ID |
| adminId | String | 管理员 ID |
| action | String | 操作类型 |
| targetType | String | 操作对象类型 |
| targetId | String | 操作对象 ID |
| detail | Json（可为空） | 操作详情 |
| createdAt | DateTime | 创建时间 |

## 19. Mock 数据准备

前端开发前建议准备以下 mock 文件：

```text
src/mock/users.ts
src/mock/songs.ts
src/mock/comments.ts
src/mock/playlists.ts
src/mock/challenges.ts
src/mock/battles.ts
src/mock/radio.ts
src/mock/fortunes.ts
src/mock/albums.ts
src/mock/host.ts
src/mock/resonance.ts
```

| 数据 | 建议数量 | 用途 |
| --- | --- | --- |
| User | 3-5 个 | 展示不同作者和管理员 |
| Song | 12-20 首 | 首页、热榜、详情、歌单、PK |
| Comment | 每首 2-5 条 | 作品详情树洞留言 |
| Playlist | 3-5 个 | 我的页面和收藏弹窗 |
| Challenge | 3-6 个 | 发现页话题挑战 |
| Battle | 3-5 个 | PK 擂台 |
| RadioTheme | 14 个 | 电台页主题展示 |
| Fortune | 14-30 条 | 日历和时运曲展示 |
| Album | 2-3 张 | 专辑制作结果展示 |
| HostContent | 5-8 条 | 主理人主页和首页策展 |
| Resonance | 3-5 条 | 首页同频推荐 |

## 20. 数据约束与规则

| 规则 | 说明 |
| --- | --- |
| 未登录不可创作和互动 | 创作、点赞、收藏、留言、打卡、投票必须登录 |
| 草稿仅作者可见 | `draft/private` 状态作品不能进入公共 Feed |
| 歌名可编辑 | 作品生成后、发布前作者可以修改标题、简介、标签、封面 |
| 点赞不可重复 | 同一用户对同一作品只能点赞一次 |
| 收藏不可重复 | 同一用户在同一歌单中不能重复收藏同一作品 |
| PK 投票不可重复 | 同一用户对同一擂台只能投一次 |
| 邀请码注册 | 注册时必须使用有效邀请码 |
| AI Key 不进前端 | AI Key 只能保存在后端环境变量 |
| 统计字段可冗余 | `likes/plays/commentCount/coverCount` 可在 Song 表中冗余保存 |
| 删除建议软删除 | 评论、作品下架等建议使用 `deletedAt` 或 `status` |
| 时间格式统一 | 数据库存 DateTime，接口返回 ISO 字符串 |

## 21. 数据落地优先级

| 优先级 | 数据对象 | 原因 |
| --- | --- | --- |
| 1 | User、InviteCode | 登录注册必须 |
| 2 | Song、AiTask | AI 创作、草稿、发布、详情核心闭环 |
| 3 | Comment、Like、Collect | 作品互动需要 |
| 4 | Playlist、PlaylistSong | 歌单和收藏需要 |
| 5 | PointsLedger | 积分消耗和记录需要 |
| 6 | Challenge、Battle、BattleVote | 发现页和 PK 需要 |
| 7 | Fortune | 时运曲和日历打卡需要 |
| 8 | Album、AlbumSong、RemixRelation | 专辑和二创需要 |
| 9 | HostContent、RadioTheme、Resonance | 主理人、电台、同频推荐增强 |
| 10 | Report、AdminLog | 后台扩展和安全管理 |

## 22. 测试验收数据说明

测试时建议至少准备：

| 数据 | 验收用途 |
| --- | --- |
| 普通用户 2 个、管理员 1 个 | 验证登录、权限、后台 |
| 公开作品、草稿作品、私密作品各若干 | 验证 Feed、我的作品、草稿权限 |
| 带评论、点赞、收藏的作品 | 验证作品详情和互动 |
| 电台主题 14 个 | 验证电台页展示 |
| PK 擂台 3 个 | 验证投票和重复投票限制 |
| 时运记录 14 天以上 | 验证日历和连续打卡 |
| 专辑 2 张 | 验证专辑详情和曲目列表 |
| 主理人内容 5 条以上 | 验证首页策展和主理人页 |

## 23. 总结

本数据内容文档用于统一 Echo AI 音乐社区正式版的数据口径。功能流程参考 `music-example` Demo，但正式项目需要按照 `music-ai-web + music-ai-server` 前后端分离架构，将 Demo 中的 JSON 文件、内存对象和 localStorage 数据迁移为 PostgreSQL + Prisma 可持久化的数据模型。

前端开发时以 API 返回字段和 mock 数据为准；后端开发时以数据库表和字段设计为准；联调时由后端 Service 负责数据库字段到 API 字段的转换。


