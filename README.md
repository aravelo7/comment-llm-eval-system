# Bot 审核工作台

这是一个多平台 bot 审核工作台原型仓库。

当前仓库已包含：
- 多平台统一内容模型与审核工作台
- 第一阶段 mock 数据与规则演示
- 最小可用的本地鉴权后端

## 本地开发启动

后端：

```bash
node server/index.js
```

默认监听 `http://127.0.0.1:8787`。

前端：

```bash
npm run dev
```

通过 `http://127.0.0.1:5173` 访问前端。

本地开发默认前端认证模式为 `api`。鉴权请求建议保持相对路径，由 Vite 代理 `/auth` 与 `/health` 到后端。

如需保留纯前端 mock 模式，可设置：

```bash
VITE_AUTH_MODE=mock
```

## 开发环境排障

- 如果 `localhost` 曾出现 `431 Request Header Fields Too Large`，请改用 `127.0.0.1` 访问，并清理浏览器里 `localhost` 的站点数据和 cookie。
- 本地开发不要混用 `localhost` 与 `127.0.0.1`，否则基于 cookie session 的 `/auth/me` 身份恢复会不稳定。

## 最小鉴权接口

当前后端已实现：

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/register`
- `POST /auth/forgot-password`

默认演示账号：

- `admin@example.com / Admin#2026Demo`
- `reviewer@example.com / Reviewer#2026Demo`

说明：

- 后端使用 `cookie session`
- session cookie 为 `httpOnly`
- 前端不直接读取敏感 cookie
- 前端通过 `/auth/me` 恢复身份

## 当前用户模型

后端真实返回以下最小字段：

- `id`
- `email`
- `nickname`
- `role`
- `plan`
- `status`
- `createdAt`
- `updatedAt`

其中：

- `role` 用于后续权限体系扩展
- `plan` 用于后续免费模型 / 付费模型路由依据

## 当前可演示内容

- `/login`：真实登录、登出、会话恢复
- `/submissions`：多平台统一审核列表
- `/rules`：规则作用域与规则效果预览
- `/settings`：当前用户邮箱、昵称、角色、套餐、账号状态

## 当前安全边界

当前仓库明确不支持，也不会实现以下能力：

- 绕过登录
- 绕过验证码
- 绕过平台风控
- 非授权抓取私信
- 反爬规避脚本
- 窃取平台登录态

真实接入只能基于官方接口、用户授权导出、人工导入或后端受控同步。

## Weibo Official Access Compliance

This repository now includes a compliance-first `WeiboPlugin` skeleton for authorized access only.

- Supported access modes for Weibo: `official_api`, `manual_import`, `web_session_import`
- Public comments:
  Requires official OAuth consent and official API capability granted by the Weibo open platform.
- Private messages:
  May use automatic ingestion only when the official platform explicitly grants direct-message read permission.
  If that permission is unavailable, expired, or not approved, private-message ingestion must fall back to `manual_import`.
- Visible web comments:
  The project also supports `web_session_import` for Weibo public comments only.
  This mode is limited to comments already visible on the user’s currently opened page in their own browser session.

### Official-permission dependency

- `comment:read`
  Required for official comment ingestion.
- `direct_message:read`
  Required before any automatic private-message ingestion can be enabled.

### Explicitly unsupported

- Cookie extraction
- Password login automation
- Session replay
- CAPTCHA bypass
- Risk-control bypass
- Non-authorized private-message collection
- Backend-side crawling of Weibo web pages
- Cookie copy/paste login

### Manual import fallback for private messages

The compliant fallback path is:

1. The user or operator exports data only from an officially permitted source.
2. Backend services validate authorization scope, time range, and file format.
3. Backend services redact and audit the imported dataset.
4. The normalized records enter the shared review pipeline through the manual-import path.

### Web session import boundary

`web_session_import` is limited to the following workflow:

1. The authorized user opens a Weibo page in their own browser.
2. The user manually runs the provided collection script against the currently visible page.
3. The script extracts only comments already present in the current DOM.
4. The user pastes the resulting JSON back into the review workbench for import.

This mode does not:

- crawl additional pages
- access private messages
- upload cookies or passwords
- bypass login, CAPTCHA, or platform risk controls

## 微博私信 manual_import 导入

功能说明：
- 新增了合规的“微博私信导入”入口，路径为 `/imports/weibo/manual`
- 仅支持 `manual_import`
- 用户上传 `.json` 或 `.csv` 私信导出文件后，后端执行校验、脱敏、审计、标准化，并自动接入现有审核列表

合规边界：
- 仅处理用户有权处理并主动上传的数据
- 不支持自动抓取私信
- 不支持 cookie 提取、密码托管、模拟登录、CAPTCHA bypass、risk-control bypass
- 日志中不记录私信正文原文，只记录批次号、计数、状态、错误摘要

支持文件格式：
- `data/samples/weibo_manual_import.json`
- `data/samples/weibo_manual_import.csv`

导入步骤：
1. 登录工作台
2. 进入“微博私信导入”
3. 勾选三项授权确认
4. 上传 `.json` 或 `.csv` 文件
5. 导入完成后点击“进入消息审核列表”查看该批次消息与审核结果

本地测试方式：
1. 启动后端：在 `backend/auth` 下执行 `node index.js`
2. 启动前端：在 `frontend` 下执行 `npm run dev`
3. 使用 `admin@example.com / Admin#2026Demo` 或 `reviewer@example.com / Reviewer#2026Demo` 登录
4. 打开 `/imports/weibo/manual`
5. 上传样例文件并查看 `/submissions?jobId=<批次ID>&platform=weibo&channel=private_message`

删除 / 清理方式：
- 在“微博私信导入”页点击“删除该批次”
- 系统会级联清理该批次的任务、会话、消息、审核结果与审计记录

## 微博官方连接（official_api 占位）

当前能力：
- 已提供“连接微博账号”的 OAuth 闭环占位实现
- 当前版本只保存连接状态，不自动读取私信
- 若未获 `direct_message:read` 权限，会自动回退到 `manual_import`

环境变量：
- `WEIBO_OAUTH_ENABLED=false`
- `WEIBO_APP_KEY=`
- `WEIBO_APP_SECRET=`
- `WEIBO_REDIRECT_URI=`

本地测试：
1. 未配置环境变量时，打开 `/imports/weibo/manual`
2. 页面顶部会显示“官方 OAuth 未配置”
3. manual_import 区域仍可继续上传样例 JSON/CSV 文件

如已配置 OAuth：
1. 将 `WEIBO_OAUTH_ENABLED` 设为 `true`
2. 配置 `WEIBO_APP_KEY`、`WEIBO_APP_SECRET`、`WEIBO_REDIRECT_URI`
3. `WEIBO_REDIRECT_URI` 需指向后端回调：`http://127.0.0.1:8787/api/weibo/oauth/callback`
4. 在导入页点击“连接微博账号”
5. 授权回调完成后，页面会显示连接状态
6. 如果未返回 `direct_message:read`，页面会明确提示继续使用 `manual_import`

明确不支持：
- 密码登录自动化
- cookie 提取
- session replay
- CAPTCHA bypass
- risk-control bypass
- 非授权私信同步或读取

## Review Service

仓库现已新增独立 `backend/review` 审稿服务：

- `GET /health`
- `POST /review/run`
- `POST /review/policy/test`

模型路由：
- `plan !== "vip"`：走 Ollama 免费模型
- `plan === "vip"`：走 VIP 占位 provider

当前默认免费模型为 `qwen2.5:7b`，通过 Ollama 提供。
VIP 当前仅保留路由占位，不接真实收费模型。

本地启动：
1. 进入 `backend/review`
2. 执行 `npm install`
3. 执行 `npm start`

Docker Compose 已补充：
- `review`
- `ollama`

前端联调页：
- 登录后可访问 `/review-lab`
- 页面会自动复用 `/auth/me` 恢复的当前用户信息
- 执行审稿时仅透传 `user.id`、`user.email`、`user.plan`
