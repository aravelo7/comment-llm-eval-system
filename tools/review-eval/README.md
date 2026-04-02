# Review Eval Tools

这个目录提供一套最小可运行的审稿回归验证工具，目标是做工程回归检查和样本巡检，不替代学术评测框架。

## 目录用途

- `dataset/review_samples.json`：mock 审稿样本集
- `dev-review-eval.js`：一键启动依赖服务、等待就绪、检查模型并串联评测
- `run-review-eval.js`：批量调用 `/review/run` 并落盘结果
- `summarize-review-eval.js`：读取输出文件并打印汇总，同时生成 Markdown 报告
- `outputs/`：保存最新结果、时间戳结果和汇总报告

## 如何启动 review 服务

单独启动 review 服务时，在 [`backend/review`](D:/Projects/comment-llm-eval-system/backend/review) 目录执行：

```bash
npm install
npm start
```

默认服务地址：

```bash
http://127.0.0.1:8790
```

## 一键启动并跑评测

在仓库根目录执行：

```bash
node tools/review-eval/dev-review-eval.js --plan=free
```

这个脚本会按顺序执行：

1. 检查 `docker compose` 或 `docker-compose` 是否可用
2. 启动 `review` 和 `ollama`
3. 轮询等待 `http://127.0.0.1:8790/health`
4. 轮询等待 `http://127.0.0.1:11434/api/tags`
5. 检查默认模型 `qwen2.5:7b` 是否存在
6. 执行批量评测
7. 执行汇总并生成 Markdown 报告

如果你已经在 [`backend/review`](D:/Projects/comment-llm-eval-system/backend/review) 下，也可以直接执行：

```bash
npm run review:dev-eval
```

VIP 占位路由：

```bash
node tools/review-eval/dev-review-eval.js --plan=vip
```

或：

```bash
npm run review:dev-eval:vip
```

## 常用参数

跳过 `docker compose up`，但仍执行健康检查：

```bash
node tools/review-eval/dev-review-eval.js --plan=free --skip-compose
```

跳过模型存在性检查：

```bash
node tools/review-eval/dev-review-eval.js --plan=free --skip-model-check
```

覆盖地址：

```bash
node tools/review-eval/dev-review-eval.js --plan=free --base-url=http://127.0.0.1:8790 --ollama-url=http://127.0.0.1:11434
```

指定模型：

```bash
node tools/review-eval/dev-review-eval.js --plan=free --model=qwen2.5:7b
```

## 当模型未拉取时会发生什么

默认会检查 Ollama 已安装模型列表。

如果未检测到目标模型，会输出明确提示：

```bash
ollama pull qwen2.5:7b
```

脚本不会自动下载模型，也不会无限等待。评测仍会继续执行，因为当前 free 路由在模型不可用时可能返回 fallback 结构化结果。

## 直接执行批量评测

如只想执行现有批量评测逻辑：

```bash
node tools/review-eval/run-review-eval.js --plan=free
node tools/review-eval/run-review-eval.js --plan=vip
```

在 [`backend/review`](D:/Projects/comment-llm-eval-system/backend/review) 下：

```bash
npm run review:eval
npm run review:eval:vip
```

## 汇总与报告

默认读取 latest：

```bash
node tools/review-eval/summarize-review-eval.js
```

也可以指定文件：

```bash
node tools/review-eval/summarize-review-eval.js tools/review-eval/outputs/review_eval_latest.json
```

在 [`backend/review`](D:/Projects/comment-llm-eval-system/backend/review) 下：

```bash
npm run review:eval:summary
```

## 输出文件位置

执行完成后默认会生成：

- [`tools/review-eval/outputs/review_eval_latest.json`](D:/Projects/comment-llm-eval-system/tools/review-eval/outputs/review_eval_latest.json)
- `tools/review-eval/outputs/review_eval_free_*.json`
- `tools/review-eval/outputs/review_eval_vip_*.json`
- [`tools/review-eval/outputs/review_eval_summary_latest.json`](D:/Projects/comment-llm-eval-system/tools/review-eval/outputs/review_eval_summary_latest.json)
- [`tools/review-eval/outputs/review_eval_report_latest.md`](D:/Projects/comment-llm-eval-system/tools/review-eval/outputs/review_eval_report_latest.md)
- `tools/review-eval/outputs/review_eval_report_*.md`

## 断言边界

当前断言属于工程回归检查，不是严格准确率评测。它主要检查：

- 接口是否可用
- 返回结构是否稳定
- 决策是否落在允许区间
- 关键规则码是否命中
- `needs_human_review` 是否落在允许区间

如果更换 prompt、规则或模型后出现波动，这套工具的目标是尽快暴露回归风险，而不是给出学术意义上的精确分数。
