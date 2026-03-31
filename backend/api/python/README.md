# Python 多平台占位目录

本目录提供“微博 / 豆瓣 / 贴吧 + 评论区 / 私信”的最小统一结构，占位目标如下：

- `crawler/common/models.py`
  统一内容模型 dataclass，对齐前端统一内容模型。
- `crawler/*/normalizer.py`
  平台原始数据到统一模型的映射入口。
- `crawler/*/fetcher.py`
  合规接入占位，只能接官方 API、授权导出或后端受控同步。
- `scripts/import_mock_platform_data.py`
  写入一份统一格式的 mock normalized 数据。

明确不做：

- 绕过登录
- 绕过验证码
- 绕过风控
- 非授权抓取私信
- 伪装浏览器规避检测

建议后续真实落地方式：

1. 后端服务持有平台凭证与授权状态。
2. 通过官方接口、用户授权导出或人工导入形成 raw 数据。
3. 各平台 normalizer 输出统一 JSONL / parquet。
4. 后续 `build_dataset`、`run_eval`、`generate_report` 统一读取 normalized 目录。
