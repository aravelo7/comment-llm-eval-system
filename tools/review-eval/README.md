# Review Eval

最小评测工具目录，目标是快速暴露当前审核系统最关键的问题。

运行前请先确保：

- `review` 服务已经启动
- `http://127.0.0.1:8790/health` 可访问

运行命令：

```bash
node tools/review-eval/run-review-eval.js
node tools/review-eval/summarize-review-eval.js
```

输出文件：

- `tools/review-eval/outputs/review_eval_results.json`
- `tools/review-eval/outputs/review_eval_summary.json`

当前重点指标：

- 总体准确率
- 普通负面反馈误杀为 abuse 的数量
- 高风险类漏判数量
- fallback 占比
