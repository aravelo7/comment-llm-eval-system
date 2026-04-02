# Review Service

## 服务用途
`backend/review` 是独立的审稿服务。它接收审稿请求，根据 `user.plan` 选择模型路由：
- `free`：走 Ollama 免费模型
- `vip`：走 VIP 占位 provider

所有输出都强制为固定 JSON 结构，不返回散文式文本。
当前版本已支持“规则初筛 + LLM 复审”：
- 先执行内置规则初筛
- 生成 `rule_hits`
- 将 `rule_hits` 作为辅助证据注入模型
- 在最终结果中返回 `rule_hits`

## 启动方式
安装依赖：
```bash
npm install
```

启动服务：
```bash
npm start
```

默认监听：
```bash
http://127.0.0.1:8790
```

## Ollama 模型准备
先启动 Ollama，再拉取模型：
```bash
ollama pull qwen2.5:7b
```

默认免费模型：
- `qwen2.5:7b`

可通过环境变量覆盖：
- `OLLAMA_BASE_URL`
- `FREE_REVIEW_MODEL`
- `VIP_MODEL_NAME`
- `REVIEW_PORT`

## 接口示例
健康检查：
```bash
curl http://127.0.0.1:8790/health
```

审稿执行：
```bash
curl -X POST http://127.0.0.1:8790/review/run \
  -H "Content-Type: application/json" \
  -d '{
    "user": {"id":"u_1","email":"demo@example.com","plan":"free"},
    "submission": {
      "id":"s_1",
      "content":"这个产品真垃圾，客服像死人一样，大家别买了",
      "platform":"weibo",
      "metadata":{"sourceType":"manual_import"}
    },
    "policy": {
      "rawText":"允许普通差评，但辱骂、人身攻击、引战、广告引流要重点拦截；不确定就人工复核"
    }
  }'
```

策略测试：
```bash
curl -X POST http://127.0.0.1:8790/review/policy/test \
  -H "Content-Type: application/json" \
  -d '{
    "submission": {"content":"加我微信领优惠","platform":"weibo"},
    "policy": {"rawText":"广告引流优先拦截"}
  }'
```

## 免费 / VIP 路由说明
- `plan !== "vip"`：走 OllamaProvider
- `plan === "vip"`：走 vipPlaceholderProvider

VIP 当前只返回占位结果：
- `decision = review`
- `labels = ["vip_model_not_enabled"]`
- `needs_human_review = true`

## 规则初筛
当前内置最小规则集合包括：
- `ABUSE_WORD`
- `PROMO_CONTACT`
- `EXTERNAL_LINK`
- `CONFLICT_INCITEMENT`
- `REPETITIVE_PUNCT`

`rule_hits` 是辅助证据，不直接代替最终裁决。后续可继续扩展规则集合。

## 当前限制
- VIP 仅占位，未接真实收费模型
- 不做数据库持久化
- 不接 auth 服务，不做真实用户鉴权联动
- 如果模型输出异常，会自动回退到 `parse_failed` 的人工复核结果
- 如果规则执行异常，会自动降级为空 `rule_hits`，不影响整体审稿流程
