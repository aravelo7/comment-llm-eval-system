# comment-llm-eval-system

这是一个用于评论审核联调的最小工作台仓库，当前已经具备以下能力：

- `frontend`：Review Lab 工作台和基础审核页面
- `backend/auth`：本地最小鉴权服务
- `backend/review`：审核服务
- `rule engine`：规则初筛
- `Ollama`：本地 LLM 复审
- `fallback`：Ollama 不可用时自动降级

## 当前系统能力

当前审核链路为：

1. 前端调用 `/review/run`
2. `backend/review` 先执行规则引擎
3. 若开启 `rule_plus_llm`，再调用 Ollama 复审
4. 若 Ollama 不可用、未拉模型、超时或返回非法 JSON，则自动降级到 `rule_fallback`

当前主要服务：

- `auth`：登录、登出、会话恢复
- `review`：健康检查、规则审核、Ollama 复审、fallback
- `frontend`：Review Lab、快速审核、基础工作台
- `ollama`：本地模型服务

## 审核模式说明

- `rule_only`
  只执行规则引擎，不调用 LLM。
- `rule_plus_llm`
  先执行规则，再调用 Ollama 复审。
- `rule_fallback`
  当 Ollama 不可用、模型未拉取、接口失败或解析失败时，自动回退到规则结果。

## 本地开发模式

本地开发模式下，前端 Vite 代理默认使用：

- `/auth -> http://127.0.0.1:8787`
- `/review -> http://127.0.0.1:8790`

### 1. 启动 auth

```powershell
cd backend/auth
cmd /c npm install
cmd /c npm start
```

默认监听：

- `http://127.0.0.1:8787`

默认演示账号：

- `admin@example.com / Admin#2026Demo`
- `reviewer@example.com / Reviewer#2026Demo`

### 2. 启动 review

```powershell
cd backend/review
cmd /c npm install
cmd /c npm start
```

默认监听：

- `http://127.0.0.1:8790`

如需本地接 Ollama，可设置：

```powershell
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
$env:OLLAMA_MODEL="qwen2.5:7b"
$env:REVIEW_MODE="rule_plus_llm"
cmd /c npm start
```

### 3. 启动 frontend

```powershell
cd frontend
cmd /c npm install
cmd /c npm run dev
```

默认访问：

- `http://127.0.0.1:5173`

本地开发默认不必额外配置 `VITE_RUNTIME_ENV`。如果需要显式声明，可参考：

- [frontend/.env.example](/D:/Projects/comment-llm-eval-system/frontend/.env.example)

## Docker 模式

Docker 模式下，前端会自动通过 `VITE_RUNTIME_ENV=docker` 切换代理目标：

- `/auth -> http://auth:8787`
- `/review -> http://review:8790`

容器服务说明：

- `frontend`：Vite 开发服务器
- `auth`：鉴权服务
- `review`：审核服务
- `ollama`：本地模型服务

### 启动方式

```powershell
docker compose up --build
```

启动后默认端口：

- `frontend: 5173`
- `auth: 8787`
- `review: 8790`
- `ollama: 11434`

## Ollama 模型拉取

应用代码不会自动拉模型。首次启动后请手动执行：

```powershell
docker compose exec ollama ollama pull qwen2.5:7b
```

如果机器资源较弱，可以换更小模型，但需要同步修改：

- `docker-compose.yml` 中的 `OLLAMA_MODEL`
- 或本地环境变量 `OLLAMA_MODEL`

## 常用验证

### health

```powershell
curl http://127.0.0.1:8790/health
```

### review

```powershell
curl -X POST http://127.0.0.1:8790/review/run ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"这个产品太烂了，但是也许还能接受\",\"platform\":\"weibo\",\"plan\":\"free\"}"
```

### fallback 验证

在 Ollama 未启动、未拉模型或故意写错 `OLLAMA_BASE_URL` 时，`/review/run` 仍应返回：

- `ok: true`
- `meta.mode = "rule_fallback"`
- `meta.provider = "fallback"`
- `meta.fallback_used = true`

## Troubleshooting

- 不要混用 `localhost` 和 `127.0.0.1`。
  本地联调建议统一使用 `127.0.0.1`，避免 cookie 和代理行为不稳定。
- Docker 模式下不要把 `127.0.0.1` 当作容器间服务地址。
  在容器内，`127.0.0.1` 指向当前容器自身；容器间通信必须使用 `auth`、`review`、`ollama` 这类 service name。
- 如果 Ollama 未拉模型，review 服务可能进入 `rule_fallback`。
  先执行 `docker compose exec ollama ollama pull qwen2.5:7b`。
- 如果 `/review/run` 报代理错误，先检查：
  1. `frontend/vite.config.ts`
  2. `docker-compose.yml`
  3. `docker compose ps`

## Review Lab

登录后可访问：

- `/review-lab`

Review Lab 当前会复用 `/auth/me` 恢复的用户信息，并调用 `/review/run` 展示审核结果。

## 最小鉴权接口

当前 `backend/auth` 已实现：

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/register`
- `POST /auth/forgot-password`

说明：

- 后端使用 `cookie session`
- session cookie 为 `httpOnly`
- 前端不直接读取敏感 cookie
- 前端通过 `/auth/me` 恢复登录状态

## 合规边界

当前仓库明确不支持，也不会实现以下能力：

- 绕过登录
- 绕过验证码
- 绕过平台风控
- 非授权抓取私信
- 反爬规避脚本
- 窃取平台登录态

真实接入只能基于：

- 官方接口
- 用户授权导出
- 人工导入
- 后端受控同步

## Weibo Official Access Compliance

This repository includes a compliance-first Weibo integration boundary for authorized access only.

Supported access modes:

- `official_api`
- `manual_import`
- `web_session_import`

Public comments:

- require official OAuth consent and corresponding open-platform capability

Private messages:

- automatic ingestion is allowed only when the official platform explicitly grants direct-message read permission
- otherwise must fall back to `manual_import`

Explicitly unsupported:

- cookie extraction
- password login automation
- session replay
- CAPTCHA bypass
- risk-control bypass
- non-authorized private-message collection
- backend-side crawling of Weibo web pages
- cookie copy/paste login

### Manual import boundary

1. 用户或操作员仅从合规来源导出数据
2. 后端校验授权范围、时间范围和文件格式
3. 后端执行脱敏与审计
4. 标准化后的记录进入共享审核链路

### Web session import boundary

`web_session_import` 仅限：

1. 用户在自己的浏览器中打开微博页面
2. 用户手动运行提供的采集脚本
3. 脚本只提取当前 DOM 中已可见的评论
4. 用户将结果手动粘贴回工作台
