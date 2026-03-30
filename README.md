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
