# Echo AI 音乐社区 API 契约文档

|文档项| 内容                               |
|-|----------------------------------|
|文档名称| Echo AI 音乐社区 API 契约文档            |
|版本号| V3 |
|编写日期|2026-07-03|
|关联文档|Echo AI 音乐社区软件需求规格说明书（SRS）1.2|
|适用项目|`music-ai-web` + `music-ai-server`|
|文档状态|修订中|

## 1\. 文档说明

本文档用于约定 Echo AI 音乐社区前后端接口。前端可先按照本文档封装 `api` 层和 mock 数据，后端后续按照本文档实现 NestJS Controller、DTO、Service、Prisma 数据读写和 Swagger 文档。

本版 API 契约以最终 SRS 1.2 为依据，优先覆盖基础框架 / Demo 中已有的 P0 功能，包括登录注册、AI 创作、社区 Feed、作品详情、草稿发布、播放、点赞、收藏、树洞留言、歌单、电台、AI DJ、PK 擂台、时运曲、AI 音乐制作人、专辑二创、海报和管理后台等。

接口统一前缀：

```text
/api
```

统一返回格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

统一错误格式：

```json
{
  "code": 400,
  "message": "参数错误",
  "data": null
}
```

认证规则：

|类型|说明|
|-|-|
|公开接口|登录、注册、部分公开作品流、作品详情、电台展示等可不传 Token|
|受保护接口|创作、发布、点赞、收藏、留言、投票、打卡、AI 生成、个人中心等必须传 Token|
|管理接口|`/api/admin/` 必须校验管理员角色|

请求头约定：

```text
Authorization: Bearer <token>
Content-Type: application/json
```

## 2\. 通用数据结构

### 2.1 User

```json
{
  "id": "user_001",
  "nickname": "Echo Creator",
  "avatarUrl": "/avatars/default.png",
  "role": "user",
  "echoPoints": 100,
  "createdAt": "2026-07-03T10:00:00.000Z"
}
```

### 2.2 Song

```json
{
  "id": "song_001",
  "title": "夏夜回声",
  "description": "一首关于夏天、校园和毕业的温暖歌曲",
  "mode": "song",
  "style": "流行 / 治愈",
  "tags": ["校园", "毕业", "治愈"],
  "lyrics": "[Verse]\n这里是歌词内容",
  "audioUrl": "/audio/song_001.mp3",
  "coverUrl": "/covers/song_001.jpg",
  "duration": 180,
  "published": true,
  "isInstrumental": false,
  "originId": null,
  "aiReview": "像一封写给夏夜的信。",
  "author": {
    "id": "user_001",
    "nickname": "Echo Creator",
    "avatarUrl": "/avatars/default.png"
  },
  "likeCount": 12,
  "collectCount": 5,
  "commentCount": 3,
  "playCount": 28,
  "remixCount": 1,
  "createdAt": "2026-07-03T10:00:00.000Z",
  "publishedAt": "2026-07-03T10:10:00.000Z"
}
```

### 2.3 Task

```json
{
  "taskId": "task_001",
  "type": "generate",
  "status": "queued",
  "stage": "排队中",
  "progress": 20,
  "queueAhead": 2,
  "result": null,
  "error": null
}
```

任务状态枚举：

|状态|说明|
|-|-|
|queued|排队中|
|running|生成中|
|done|已完成|
|error|失败|

### 2.4 Comment

```json
{
  "id": "comment_001",
  "songId": "song_001",
  "text": "很有夏天的感觉",
  "anon": false,
  "author": {
    "id": "user_002",
    "nickname": "听歌的人",
    "avatarUrl": "/avatars/default.png"
  },
  "createdAt": "2026-07-03T10:20:00.000Z"
}
```

### 2.5 Playlist

```json
{
  "id": "playlist_001",
  "name": "我喜欢的",
  "color": "linear-gradient(135deg,#8b5cf6,#06b6d4)",
  "songCount": 12,
  "createdAt": "2026-07-03T10:00:00.000Z"
}
```

### 2.6 Album

```json
{
  "id": "album_001",
  "title": "深夜便利店",
  "description": "围绕深夜、城市和自我和解生成的概念 EP",
  "coverUrl": "/covers/album_001.jpg",
  "authorId": "user_001",
  "songs": [],
  "createdAt": "2026-07-03T10:00:00.000Z"
}
```

### 2.7 Fortune

```json
{
  "id": "fortune_001",
  "userId": "user_001",
  "date": "2026-07-03",
  "keyword": "松弛",
  "mood": {
    "emoji": "🌤",
    "name": "晴后微光",
    "color": "linear-gradient(135deg,#f59e0b,#fbbf24)",
    "stylePrompt": "治愈, Lo-fi, 轻松"
  },
  "battery": 82,
  "luckyColor": {
    "name": "薄荷绿",
    "hex": "#86efac"
  },
  "luckyNumber": 7,
  "peak": "20:00-22:00",
  "encourage": "今天适合慢慢把事情理顺。",
  "action": "整理一个待完成的小任务",
  "dos": ["听一首轻快的歌", "早点休息"],
  "donts": ["过度纠结", "临时改计划"],
  "recharge": "散步十分钟",
  "img": "/images/fortune_001.jpg",
  "imgGenerating": false,
  "streak": 3,
  "streakBadge": {
    "name": "初心萌芽",
    "emoji": "🌱",
    "nextName": "一周自洽",
    "nextEmoji": "🌤",
    "daysToNext": 4
  },
  "songId": null,
  "songTitle": null,
  "createdAt": "2026-07-03T08:00:00.000Z"
}
```

字段说明：

|字段|类型|说明|
|-|-|-|
|id|string|时运记录 ID|
|userId|string|用户 ID|
|date|string|日期，格式 `YYYY-MM-DD`|
|keyword|string|今日关键词|
|mood.emoji|string|基调 emoji|
|mood.name|string|基调色名称，如"晴后微光"|
|mood.color|string|基调渐变色 CSS 值，用于日卡头部背景|
|mood.stylePrompt|string|对应的音乐风格 prompt，用于生成时运曲|
|battery|number|社交电量，0-100|
|luckyColor.name|string|幸运色名称|
|luckyColor.hex|string|幸运色十六进制值|
|luckyNumber|number|幸运数字|
|peak|string|能量高峰时间段，如 "20:00-22:00"|
|encourage|string|鼓励语|
|action|string|今日行动建议|
|dos|string\[]|宜做事项列表|
|donts|string\[]|忌做事项列表|
|recharge|string|充电小事建议|
|img|string|治愈插画 URL，未生成时为空字符串|
|imgGenerating|boolean|插画是否正在异步生成中|
|streak|number|连续签到天数|
|streakBadge.name|string|当前徽章名称，未达到最低档时为空|
|streakBadge.emoji|string|当前徽章 emoji|
|streakBadge.nextName|string|下一级徽章名称，已达到最高级时为空|
|streakBadge.nextEmoji|string|下一级徽章 emoji|
|streakBadge.daysToNext|number|距离下一级还需天数|
|songId|string|null|
|songTitle|string|null|

## 3\. 用户认证与个人中心 API

### 3.1 用户注册

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/auth/register`|
|权限|公开|
|优先级|P0|

请求体：

```json
{
  "nickname": "Echo Creator",
  "password": "123456",
  "inviteCode": "ECHO2026"
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "jwt-token",
    "user": {}
  }
}
```

### 3.2 验证邀请码

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/invite-code/validate`|
|权限|公开|
|优先级|P0|

查询参数：

|参数|类型|必填|说明|
|-|-|-|-|
|code|string|是|待验证的邀请码|

响应（有效）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "valid": true,
    "used": false
  }
}
```

响应（已被使用）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "valid": false,
    "used": true,
    "reason": "该邀请码已被使用"
  }
}
```

响应（不存在）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "valid": false,
    "used": false,
    "reason": "邀请码不存在"
  }
}
```

### 3.3 用户登录

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/auth/login`|
|权限|公开|
|优先级|P0|

请求体：

```json
{
  "nickname": "Echo Creator",
  "password": "123456"
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "jwt-token",
    "user": {}
  }
}
```

### 3.4 获取当前用户

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/me`|
|权限|登录|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user": {},
    "echoPoints": 100,
    "inviteCodes": [],
    "pointsLedger": [],
    "playlists": []
  }
}
```

### 3.5 获取我的作品

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/me/songs`|
|权限|登录|
|优先级|P0|

查询参数：

|参数|类型|说明|
|-|-|-|
|published|boolean|可选，筛选公开或草稿/私密作品|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": []
  }
}
```

### 3.6 退出登录

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/auth/logout`|
|权限|登录|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 3.7 获取积分流水

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/me/points-ledger`|
|权限|登录|
|优先级|P0|

查询参数：

|参数|类型|必填|说明|
|-|-|-|-|
|page|number|否|页码，默认 1|
|pageSize|number|否|每页数量，默认 20|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "ledger_001",
        "delta": 10,
        "reason": "每日打卡奖励",
        "balance": 110,
        "createdAt": "2026-07-03T08:00:00.000Z"
      },
      {
        "id": "ledger_002",
        "delta": -2,
        "reason": "生成歌曲「夏夜回声」",
        "balance": 108,
        "createdAt": "2026-07-03T09:00:00.000Z"
      }
    ],
    "total": 35,
    "page": 1,
    "pageSize": 20
  }
}
```

字段说明：

|字段|类型|说明|
|-|-|-|
|delta|number|变动量，正数为获取，负数为消耗|
|reason|string|变动原因描述|
|balance|number|变动后的积分余额|

## 4\. 首页、社区 Feed 与主理人策展 API

### 4.1 获取社区作品流

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/feed`|
|权限|公开|
|优先级|P0|

查询参数：

|参数|类型|说明|
|-|-|-|
|sort|string|`new` 最新 / `hot` 热榜|
|page|number|页码|
|pageSize|number|每页数量|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "total": 20
  }
}
```

### 4.2 获取同频推荐

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/resonance`|
|权限|公开|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "intro": "今天也有新的声音在悄悄发生",
    "moodTags": ["松弛", "夜晚", "治愈"],
    "list": []
  }
}
```

### 4.3 获取 AI 主理人策展内容

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/curation`|
|权限|公开|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "hostNote": "今晚适合听一点柔软的声音。",
    "featuredSong": {},
    "recommendations": []
  }
}
```

### 4.4 获取 AI 主理人主页

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/host`|
|权限|公开|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "name": "Echo 主理人",
    "avatarUrl": "/images/host.png",
    "bio": "负责推荐灵感、策展作品和维护社区氛围",
    "todayPick": {},
    "topics": [],
    "featuredSongs": []
  }
}
```

## 5\. AI 创作 API

### 5.1 AI 生成歌词

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/lyrics`|
|权限|登录|
|优先级|P0|

请求体：

```json
{
  "mode": "song",
  "prompt": "深夜加班后走在回家路上的释然",
  "styles": ["流行", "治愈"],
  "forWho": "",
  "image": ""
}
```

`mode` 枚举：

|值|说明|
|-|-|
|song|常规创作|
|meme|梗歌制造机|
|emotion|情绪炼歌|
|photo|看图写歌|
|foryou|为 TA 写歌|
|radio|电台纯音乐|
|remix|翻唱 / 二创|
|fortune|时运曲生成|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "title": "夜路微光",
    "styles": ["流行", "治愈"],
    "lyrics": "[Verse]\n走过便利店的灯\n[Chorus]\n我把疲惫唱成风",
    "tags": ["夜晚", "治愈"]
  }
}
```

字段说明：

|字段|类型|说明|
|-|-|-|
|styles|string\[]|AI 匹配的风格标签数组，取自 12 种预定义风格（流行、国风、抒情、电子、摇滚、民谣、说唱、爵士、治愈、欢快、伤感、Lo-fi），前端用于回填 Chip 选中状态|

### 5.2 提交 AI 音乐生成任务

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/generate`|
|权限|登录|
|优先级|P0|

请求体：

```json
{
  "title": "夜路微光",
  "style": "流行 / 治愈",
  "lyrics": "[Verse]\n歌词内容",
  "mode": "song",
  "prompt": "深夜加班后走在回家路上的释然",
  "isInstrumental": false,
  "originId": null
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_generate_001"
  }
}
```

### 5.3 查询异步任务状态

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/task/:id`|
|权限|登录|
|优先级|P0|

响应（排队中）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_generate_001",
    "type": "generate",
    "status": "queued",
    "stage": "排队中（前面还有 2 个）",
    "progress": 10,
    "queueAhead": 2,
    "result": null,
    "error": null
  }
}
```

响应（生成中）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_generate_001",
    "type": "generate",
    "status": "running",
    "stage": "🎹 正在作曲编曲演唱…大约30~60秒",
    "progress": 50,
    "queueAhead": 0,
    "result": null,
    "error": null
  }
}
```

响应（完成）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_generate_001",
    "type": "generate",
    "status": "done",
    "stage": "生成完成",
    "progress": 100,
    "queueAhead": 0,
    "result": {
      "song": {
        "id": "song_001",
        "title": "夜路微光",
        "audioUrl": "/audio/song_001.mp3",
        "coverUrl": "/covers/song_001.jpg",
        "duration": 180,
        "published": false,
        "mode": "song"
      }
    },
    "error": null
  }
}
```

响应（失败）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_generate_001",
    "type": "generate",
    "status": "error",
    "stage": "生成失败",
    "progress": 0,
    "queueAhead": 0,
    "result": null,
    "error": {
      "code": 600,
      "message": "AI 服务暂时不可用，请稍后重试"
    }
  }
}
```

## 6\. 作品、播放与发布 API

### 6.1 获取作品详情

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/song/:id`|
|权限|公开；私密作品仅作者可访问|
|优先级|P0|

响应（普通作品）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "song": {
      "id": "song_001",
      "title": "夏夜回声",
      "mode": "song",
      "published": true,
      "audioUrl": "/audio/song_001.mp3",
      "...": "其他字段同 Song 数据结构"
    }
  }
}
```

响应（为TA写歌，未解锁）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "song": {
      "id": "song_foryou_001",
      "title": "写给夏天的你",
      "mode": "foryou",
      "forWho": "夏天",
      "published": true,
      "locked": true,
      "audioUrl": null,
      "previewAudioUrl": "/audio/song_foryou_001_preview.mp3",
      "unlockCondition": {
        "type": "likes",
        "required": 5,
        "current": 2
      },
      "likeCount": 2,
      "...": "其他字段同 Song 数据结构"
    }
  }
}
```

响应（为TA写歌，已解锁）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "song": {
      "id": "song_foryou_001",
      "title": "写给夏天的你",
      "mode": "foryou",
      "forWho": "夏天",
      "published": true,
      "locked": false,
      "audioUrl": "/audio/song_foryou_001.mp3",
      "previewAudioUrl": null,
      "unlockCondition": {
        "type": "likes",
        "required": 5,
        "current": 5
      },
      "likeCount": 5,
      "...": "其他字段同 Song 数据结构"
    }
  }
}
```

为TA写歌专属字段：

|字段|类型|说明|
|-|-|-|
|forWho|string|用户填写的"写给谁"|
|locked|boolean|是否仍处于锁定状态|
|previewAudioUrl|string|null|
|audioUrl|string|null|
|unlockCondition.type|string|解锁条件类型，固定为 `"likes"`|
|unlockCondition.required|number|解锁所需点赞数|
|unlockCondition.current|number|当前已获得点赞数|

### 6.2 更新作品信息

|项目|内容|
|-|-|
|方法|PATCH|
|路径|`/api/song/:id`|
|权限|作者|
|优先级|P0|

请求体：

```json
{
  "title": "新的歌名",
  "description": "新的简介",
  "lyrics": "修改后的歌词",
  "tags": ["治愈", "夜晚"],
  "coverUrl": "/covers/new.jpg"
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "song": {}
  }
}
```

### 6.3 发布或转为私密

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/publish/:id`|
|权限|作者|
|优先级|P0|

请求体：

```json
{
  "published": true,
  "copyrightConfirmed": true
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "song": {}
  }
}
```

### 6.4 记录播放

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/play/:id`|
|权限|公开|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "playCount": 29
  }
}
```

### 6.5 获取翻唱进化树

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/tree/:id`|
|权限|公开|
|优先级|P0|

说明：返回以指定作品为根节点的翻唱进化树，`currentId` 表示当前查看的作品 ID（用于前端高亮）。

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "root": {
      "id": "song_001",
      "title": "夏夜回声",
      "coverUrl": "/covers/song_001.jpg",
      "author": {
        "id": "user_001",
        "nickname": "Echo Creator",
        "avatarUrl": "/avatars/default.png"
      },
      "mode": "song",
      "createdAt": "2026-07-01T10:00:00.000Z"
    },
    "remixes": [
      {
        "id": "song_002",
        "title": "夏夜回声（电子版）",
        "coverUrl": "/covers/song_002.jpg",
        "author": {
          "id": "user_002",
          "nickname": "Remixer",
          "avatarUrl": "/avatars/default.png"
        },
        "mode": "remix",
        "createdAt": "2026-07-02T10:00:00.000Z",
        "children": [
          {
            "id": "song_003",
            "title": "夏夜回声（电子版 Remix）",
            "coverUrl": "/covers/song_003.jpg",
            "author": {
              "id": "user_003",
              "nickname": "二次创作者",
              "avatarUrl": "/avatars/default.png"
            },
            "mode": "remix",
            "createdAt": "2026-07-03T10:00:00.000Z",
            "children": []
          }
        ]
      }
    ],
    "currentId": "song_002"
  }
}
```

数据结构说明：

|字段|类型|说明|
|-|-|-|
|root|object|进化树的根节点（原作品），必定存在|
|root.id|string|作品 ID|
|root.title|string|作品标题|
|root.coverUrl|string|封面图 URL|
|root.author|object|作者信息|
|root.mode|string|作品模式|
|root.createdAt|string|创建时间|
|remixes|array|根节点的直接翻唱/二创子节点列表|
|remixes\[].children|array|该翻唱作品的进一步翻唱子节点列表（递归嵌套，无翻唱时为空数组）|
|currentId|string|当前正在查看的作品 ID，前端用于高亮该节点|

## 7\. 社区互动与歌单 API

### 7.1 点赞作品

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/like/:id`|
|权限|登录|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "liked": true,
    "likeCount": 13
  }
}
```

说明：基础框架中点赞后不可取消，重复点赞返回提示。

> 特别说明：当点赞达到为TA写歌的解锁条件时，响应中额外返回 `unlocked: true` 字段：
>
> ```json
> {
>   "code": 0,
>   "message": "success",
>   "data": {
>     "liked": true,
>     "likeCount": 5,
>     "unlocked": true
>   }
> }
> ```

### 7.2 收藏作品

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/collect/:id`|
|权限|登录|
|优先级|P0|

请求体：

```json
{
  "playlistId": "playlist_001"
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "collected": true,
    "collectCount": 6
  }
}
```

### 7.3 获取作品树洞留言

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/comments/:id`|
|权限|公开|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": []
  }
}
```

### 7.4 发表树洞留言

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/comments/:id`|
|权限|登录|
|优先级|P0|

请求体：

```json
{
  "text": "这首歌很适合晚上听",
  "anon": false
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "comment": {}
  }
}
```

### 7.5 获取我的歌单

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/playlists`|
|权限|登录|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "playlist_liked",
        "name": "我喜欢的",
        "type": "liked",
        "color": "linear-gradient(135deg,#ef4444,#ec4899)",
        "songCount": 12,
        "isSystem": true,
        "createdAt": "2026-07-03T10:00:00.000Z"
      },
      {
        "id": "playlist_001",
        "name": "夜晚歌单",
        "type": "custom",
        "color": "linear-gradient(135deg,#8b5cf6,#06b6d4)",
        "songCount": 8,
        "isSystem": false,
        "createdAt": "2026-07-03T10:00:00.000Z"
      }
    ]
  }
}
```

说明：

|字段|类型|说明|
|-|-|-|
|type|string|`liked` 表示"我喜欢的"自动歌单，`custom` 表示用户手动创建的歌单|
|isSystem|boolean|`true` 表示系统自动歌单，不可删除、不可重命名|

### 7.6 创建歌单

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/playlists`|
|权限|登录|
|优先级|P0|

请求体：

```json
{
  "name": "夜晚歌单"
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "playlist": {}
  }
}
```

### 7.7 更新歌单

|项目|内容|
|-|-|
|方法|PATCH|
|路径|`/api/playlists/:id`|
|权限|登录|
|优先级|P0|

请求体：

```json
{
  "name": "新的歌单名"
}
```

### 7.8 删除歌单

|项目|内容|
|-|-|
|方法|DELETE|
|路径|`/api/playlists/:id`|
|权限|登录|
|优先级|P0|

### 7.9 获取歌单详情

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/playlists/:id`|
|权限|登录|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "playlist": {},
    "songs": []
  }
}
```

## 8\. 发现页、话题挑战与 PK 擂台 API

### 8.1 获取话题挑战

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/challenges`|
|权限|公开|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "challenge_001",
        "title": "把毕业写成一首歌",
        "prompt": "用一首歌描述毕业后最想念的瞬间",
        "style": "校园流行"
      }
    ]
  }
}
```

### 8.2 获取 PK 擂台列表

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/battles`|
|权限|公开|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "battle_001",
        "topic": "哪首更适合深夜听？",
        "songA": {},
        "songB": {},
        "votesA": 12,
        "votesB": 9,
        "status": "active"
      }
    ]
  }
}
```

### 8.3 创建 PK 擂台

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/battle`|
|权限|登录|
|优先级|P0|

请求体：

```json
{
  "topic": "哪首更适合深夜听？",
  "songAId": "song_001",
  "songBId": "song_002"
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "battle": {}
  }
}
```

### 8.4 PK 投票

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/battle/:id/vote`|
|权限|登录|
|优先级|P0|

请求体：

```json
{
  "side": "A"
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "voted": true,
    "votesA": 13,
    "votesB": 9
  }
}
```

## 9\. 电台与 AI DJ API

### 9.1 获取电台数据

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/radio`|
|权限|公开|
|优先级|P0|

说明：返回当前时间段的推荐主题、问候语和全量 14 个心情主题列表。前端每 60 秒轮换展示 6 个主题（"此刻推荐"固定首位 + 5 个随机主题），也可通过重新请求本接口实现"换一批"。

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "greeting": "晚上好，适合听一点城市夜景。AI 即兴生成专属纯音乐",
    "live": true,
    "current": {
      "id": "radio_city",
      "emoji": "🌃",
      "name": "城市夜景",
      "prompt": "synthwave, city night, neon, retro, cruising",
      "isNowRecommend": true
    },
    "themes": [
      { "id": "radio_rain", "emoji": "🌧", "name": "深夜雨声", "prompt": "Lo-fi, rainy night, calm, chill, study beats" },
      { "id": "radio_coffee", "emoji": "☕️", "name": "清晨咖啡", "prompt": "warm jazz, morning coffee, relaxing, soft piano" },
      { "id": "radio_work", "emoji": "💻", "name": "专注工作", "prompt": "ambient, focus, minimal, steady, concentration" },
      { "id": "radio_space", "emoji": "🪐", "name": "宇宙漫游", "prompt": "cinematic space ambient, dreamy, ethereal, synth" },
      { "id": "radio_heal", "emoji": "🌿", "name": "解压治愈", "prompt": "healing, soft pad, meditation, peaceful, nature" },
      { "id": "radio_fire", "emoji": "🔥", "name": "燃起来", "prompt": "epic electronic, energetic, workout, driving beat" },
      { "id": "radio_forest", "emoji": "🌲", "name": "雨后森林", "prompt": "forest ambient, birdsong, calm, organic, natural" },
      { "id": "radio_city", "emoji": "🌃", "name": "城市夜景", "prompt": "synthwave, city night, neon, retro, cruising" },
      { "id": "radio_lazy", "emoji": "🛋", "name": "午后慵懒", "prompt": "bossa nova, lazy afternoon, warm, mellow, cozy" },
      { "id": "radio_sunset", "emoji": "🌅", "name": "海边日落", "prompt": "tropical chill, sunset, beach, soft guitar, breezy" },
      { "id": "radio_retro", "emoji": "📼", "name": "复古胶片", "prompt": "vintage lo-fi, vinyl, nostalgic, warm tape, retro" },
      { "id": "radio_sleep", "emoji": "😴", "name": "安睡入眠", "prompt": "sleep ambient, soft drone, gentle, dreamy, slow" },
      { "id": "radio_fireplace", "emoji": "🪵", "name": "雪夜炉火", "prompt": "cozy piano, winter night, fireplace, warm, intimate" },
      { "id": "radio_energy", "emoji": "🌈", "name": "元气满满", "prompt": "happy ukulele, upbeat, sunny, cheerful, light pop" }
    ],
    "timeSlots": {
      "0-5": "radio_sleep",
      "5-9": "radio_coffee",
      "9-12": "radio_energy",
      "12-14": "radio_lazy",
      "14-18": "radio_work",
      "18-21": "radio_sunset",
      "21-23": "radio_city",
      "23-24": "radio_rain"
    }
  }
}
```

字段说明：

|字段|类型|说明|
|-|-|-|
|greeting|string|根据当前时间生成的问候语|
|live|boolean|LIVE 标识，固定为 `true`，前端展示闪烁指示灯|
|current|object|"此刻推荐"主题，根据 `timeSlots` 映射当前时段自动确定|
|current.isNowRecommend|boolean|固定为 `true`，前端据此展示"此刻推荐"标签|
|themes|array|全量 14 个心情主题，每个主题含 `id`、`emoji`、`name`、`prompt`|
|timeSlots|object|时段到主题 ID 的映射，用于前端判断当前时段对应的推荐主题|

### 9.2 生成电台纯音乐

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/generate`|
|权限|登录|
|优先级|P0|

请求体示例：

```json
{
  "title": "城市夜景电台",
  "style": "Lo-fi / 电子",
  "lyrics": "",
  "mode": "radio",
  "prompt": "city night, lo-fi, neon, soft beat",
  "isInstrumental": true
}
```

说明：电台音乐复用 AI 音乐生成任务，`mode=radio`，`isInstrumental=true`。

### 9.3 生成 AI DJ 播报

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/dj/:id`|
|权限|登录|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "text": "接下来这首歌，像一盏开在深夜路口的灯。",
    "audioUrl": "/audio/dj_song_001.mp3"
  }
}
```

## 10\. 时运曲与日历打卡 API

### 10.1 获取或生成今日时运

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/dayfortune`|
|权限|登录|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "fortune": {}
  }
}
```

### 10.2 获取时运日历

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/fortunes`|
|权限|登录|
|优先级|P0|

查询参数：

|参数|类型|说明|
|-|-|-|
|month|string|月份，格式 `YYYY-MM`|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "month": "2026-07",
    "streak": 3,
    "list": []
  }
}
```

### 10.3 获取每日治愈插画

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/dayart`|
|权限|登录|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "imageUrl": "/images/fortune_001.jpg"
  }
}
```

### 10.4 生成时运曲歌词

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/daylyric`|
|权限|登录|
|优先级|P0|

查询参数：

|参数|类型|必填|说明|
|-|-|-|-|
|type|string|是|`vocal` 演唱版 / `instrumental` 纯音乐版|

响应（演唱版）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "title": "今日微光",
    "lyrics": "[Verse]\n今天的风很轻\n阳光穿过窗帘的缝隙\n[Chorus]\n我把松弛写成旋律\n唱给这个午后听",
    "style": "治愈 / Lo-fi",
    "styles": ["治愈", "Lo-fi"],
    "mode": "fortune",
    "isInstrumental": false
  }
}
```

响应（纯音乐版）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "title": "今日微光（纯音乐）",
    "lyrics": "",
    "style": "治愈 / Lo-fi",
    "styles": ["治愈", "Lo-fi"],
    "mode": "fortune",
    "isInstrumental": true
  }
}
```

说明：前端拿到此响应后，可将 `title`、`lyrics`、`style`、`mode`、`isInstrumental` 直接传给 `/api/generate` 发起时运曲生成任务。

## 11\. AI 音乐制作人、专辑与二创 API

### 11.1 提交 AI 音乐制作人专辑任务

|项目| 内容            |
|-|---------------|
|方法| POST          |
|路径| `/api/albums` |
|权限| 登录            |
|优先级| P0            |

请求体：

```json
{
  "theme": "深夜便利店",
  "trackCount": 4
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_album_001"
  }
}
```

说明：专辑制作任务同样通过 `/api/task/:id` 查询进度。

专辑制作任务提交后，同样通过 `GET /api/task/:id`（见 5.3）查询进度与结果。专辑任务的响应格式如下：

响应（制作中）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_album_001",
    "type": "album",
    "status": "running",
    "stage": "✍️ 正在创作第 2 首歌词…（共 4 首）",
    "progress": 35,
    "queueAhead": 0,
    "result": {
      "songs": [
        {
          "id": "song_album_001_1",
          "title": "凌晨两点的货架",
          "status": "done",
          "duration": 195
        },
        {
          "id": null,
          "title": "加热便当",
          "status": "generating",
          "duration": null
        }
      ]
    },
    "error": null
  }
}
```

响应（完成）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_album_001",
    "type": "album",
    "status": "done",
    "stage": "专辑制作完成",
    "progress": 100,
    "queueAhead": 0,
    "result": {
      "album": {
        "id": "album_001",
        "title": "深夜便利店",
        "description": "围绕深夜、城市和自我和解，这是一张关于孤独与温暖的概念 EP。",
        "coverUrl": "/covers/album_001.jpg",
        "trackCount": 4,
        "createdAt": "2026-07-03T10:05:00.000Z"
      },
      "songs": [
        {
          "id": "song_album_001_1",
          "title": "凌晨两点的货架",
          "audioUrl": "/audio/song_album_001_1.mp3",
          "coverUrl": "/covers/song_album_001_1.jpg",
          "duration": 195,
          "order": 1
        },
        {
          "id": "song_album_001_2",
          "title": "加热便当",
          "audioUrl": "/audio/song_album_001_2.mp3",
          "coverUrl": "/covers/song_album_001_2.jpg",
          "duration": 210,
          "order": 2
        },
        {
          "id": "song_album_001_3",
          "title": "自动门",
          "audioUrl": "/audio/song_album_001_3.mp3",
          "coverUrl": "/covers/song_album_001_3.jpg",
          "duration": 178,
          "order": 3
        },
        {
          "id": "song_album_001_4",
          "title": "天亮前",
          "audioUrl": "/audio/song_album_001_4.mp3",
          "coverUrl": "/covers/song_album_001_4.jpg",
          "duration": 240,
          "order": 4
        }
      ]
    },
    "error": null
  }
}
```

字段说明：

|字段|类型|说明|
|-|-|-|
|result.album.id|string|专辑 ID|
|result.album.title|string|专辑名称|
|result.album.description|string|专辑简介|
|result.album.coverUrl|string|专辑封面图 URL（4 宫格拼图）|
|result.album.trackCount|number|专辑曲目总数|
|result.album.createdAt|string|专辑创建时间|
|result.songs|array|专辑包含的曲目列表，按 order 排序|
|result.songs[].id|string|曲目作品 ID|
|result.songs[].title|string|曲目标题|
|result.songs[].audioUrl|string|音频 URL|
|result.songs[].coverUrl|string|单曲封面 URL|
|result.songs[].duration|number|时长（秒）|
|result.songs[].order|number|曲目在专辑中的序号|

### 11.2 获取专辑详情

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/albums/:id`|
|权限|公开|
|优先级|P0|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "album": {},
    "songs": []
  }
}
```

### 11.3 创建翻唱 / 二创

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/song/:id/remix`|
|权限|登录|
|优先级|P0|

请求体：

```json
{
  "style": "电子",
  "lyrics": "可选，用户修改后的歌词",
  "prompt": "把这首歌改成电子风格"
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_remix_001"
  }
}
```

## 12\. 海报与二维码 API

### 12.1 生成二维码

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/qr`|
|权限|公开|
|优先级|P0|

查询参数：

|参数|类型|说明|
|-|-|-|
|text|string|二维码内容，通常是歌曲详情页 URL|

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "qrUrl": "/qr/song_001.png"
  }
}
```

说明：歌曲海报和时运卡海报主要由前端 Canvas 渲染，后端只需提供二维码、作品数据和时运数据。

## 13\. 管理后台 API

### 13.1 获取用户列表

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/admin/users`|
|权限|管理员|
|优先级|P0|

### 13.2 获取作品列表

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/admin/songs`|
|权限|管理员|
|优先级|P0|

### 13.3 管理作品状态

|项目|内容|
|-|-|
|方法|PATCH|
|路径|`/api/admin/songs/:id/status`|
|权限|管理员|
|优先级|P0|

请求体：

```json
{
  "status": "hidden",
  "reason": "内容不适合展示"
}
```

### 13.4 删除作品

|项目|内容|
|-|-|
|方法|DELETE|
|路径|`/api/admin/songs/:id`|
|权限|管理员|
|优先级|P0|

请求体（可选）：

```json
{
  "reason": "内容违规"
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "deleted": true,
    "songId": "song_001"
  }
}
```

### 13.5 获取评论 / 树洞留言列表

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/admin/comments`|
|权限|管理员|
|优先级|P0|

### 13.6 删除评论 / 树洞留言

|项目|内容|
|-|-|
|方法|DELETE|
|路径|`/api/admin/comments/:id`|
|权限|管理员|
|优先级|P0|

### 13.7 获取邀请码列表

|项目|内容|
|-|-|
|方法|GET|
|路径|`/api/admin/invite-codes`|
|权限|管理员|
|优先级|P0|

### 13.8 生成邀请码

|项目|内容|
|-|-|
|方法|POST|
|路径|`/api/admin/invite-codes`|
|权限|管理员|
|优先级|P0|

请求体：

```json
{
  "count": 5
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "codes": ["ECHO001", "ECHO002"]
  }
}
```

### 13.9 管理话题 / 挑战

|项目| 内容                          |
|-|-----------------------------|
|方法| GET / POST / PATCH / DELETE |
|路径| `/api/admin/challenges`     |
|权限| 管理员                         |
|优先级| P0                          |

## 14\. P2 后置扩展 API

以下接口属于后置扩展，不作为当前 P0 复现范围：

|接口|方法|说明|优先级|
|-|-|-|-|
|`/api/songs/search`|GET|搜索作品|P2|
|`/api/songs/filter`|GET|按风格、时间、热度筛选作品|P2|
|`/api/reports`|POST|举报作品或评论|P2|
|`/api/admin/reports`|GET|管理员查看举报|P2|
|`/api/admin/announcements`|CRUD|社区公告管理|P2|

## 15\. 错误码约定

|code|含义|
|-|-|
|0|成功|
|400|参数错误|
|401|未登录或 Token 过期|
|403|无权限|
|404|数据不存在|
|409|数据冲突，例如重复点赞、重复投票|
|429|请求过于频繁或积分不足|
|500|服务器错误|
|600|AI 服务调用失败|

## 16\. 前端 Mock 与联调建议

前端在后端 API 未全部完成前，可以按本文档建立 mock 数据和 `api` 封装层。

建议目录：

```text
src/api
src/mock
src/types
```

建议原则：

|原则|说明|
|-|-|
|先定类型|先根据本文档定义 TypeScript 类型|
|页面不写死数据|页面统一通过 `api` 函数拿数据|
|mock 与真实接口同结构|后端完成后只替换请求实现，不大改页面|
|先跑通 P0 闭环|登录、Feed、AI 创作、任务轮询、详情、发布、互动、电台、时运、PK 优先|
|Swagger 同步维护|后端实现接口时同步补全 Swagger 注解|

## 17\. P0 接口总览

|模块| 接口                                                                                                                                                                                                                                                                                                                                                                    |
|-|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|Auth| `POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/logout`                                                                                                                                                                                                                                                                                              |
|Invite| `GET /api/invite-code/validate`                                                                                                                                                                                                                                                                                                                                       |
|Me| `GET /api/me`、`GET /api/me/songs`、`GET /api/me/points-ledger`                                                                                                                                                                                                                                                                                                         |
|Feed| `GET /api/feed`、`GET /api/resonance`、`GET /api/curation`                                                                                                                                                                                                                                                                                                              |
|Host| `GET /api/host`                                                                                                                                                                                                                                                                                                                                                       |
|AI Creation| `POST /api/lyrics`、`POST /api/generate`、`GET /api/task/:id`                                                                                                                                                                                                                                                                                                           |
|Song| `GET /api/song/:id`、`PATCH /api/song/:id`、`POST /api/publish/:id`、`POST /api/play/:id`、`GET /api/tree/:id`                                                                                                                                                                                                                                                            |
|Interaction| `POST /api/like/:id`、`POST /api/collect/:id`、`GET /api/comments/:id`、`POST /api/comments/:id`                                                                                                                                                                                                                                                                         |
|Playlist| `GET /api/playlists`、`POST /api/playlists`、`GET /api/playlists/:id`、`PATCH /api/playlists/:id`、`DELETE /api/playlists/:id`                                                                                                                                                                                                                                            |
|Discover| `GET /api/challenges`                                                                                                                                                                                                                                                                                                                                                 |
|Battle| `GET /api/battles`、`POST /api/battle`、`POST /api/battle/:id/vote`                                                                                                                                                                                                                                                                                                     |
|Radio| `GET /api/radio`                                                                                                                                                                                                                                                                                                                                                      |
|AI DJ| `POST /api/dj/:id`                                                                                                                                                                                                                                                                                                                                                    |
|Fortune| `GET /api/dayfortune`、`GET /api/fortunes`、`GET /api/dayart`、`GET /api/daylyric`                                                                                                                                                                                                                                                                                       |
|Album/EP| `POST /api/albums`、`GET /api/albums/:id`                                                                                                                                                                                                                                                                                                                              |
|Remix| `POST /api/song/:id/remix`                                                                                                                                                                                                                                                                                                                                            |
|Poster/QR| `GET /api/qr`                                                                                                                                                                                                                                                                                                                                                         |
|Admin| `GET /api/admin/users`、`GET /api/admin/songs`、`PATCH /api/admin/songs/:id/status`、`DELETE /api/admin/songs/:id`、`GET /api/admin/comments`、`DELETE /api/admin/comments/:id`、`GET /api/admin/invite-codes`、`POST /api/admin/invite-codes`、`GET /api/admin/challenges`、`POST /api/admin/challenges`、`PATCH /api/admin/challenges/:id`、`DELETE /api/admin/challenges/:id` |