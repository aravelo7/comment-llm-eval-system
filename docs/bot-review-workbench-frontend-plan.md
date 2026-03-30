# Bot 审稿工作台前端方案

## 1. 产品目标

- 面向 0 基础运营者，通过可视化配置完成插件接入、规则管理、AI 审稿、安全检测、人工复核和审计追踪。
- 采用“插件式接入层 + 可视化管理后台”形态，前端承担低代码编排和状态可视化职责。
- 优先保证可配置性、可解释性、安全可视化和后续扩展能力。

## 2. 设计原则

- 0 基础可用：所有复杂配置提供向导、模板、预设、实时校验和说明文案。
- 插件化：统一插件协议、统一状态模型、统一配置表单渲染。
- 规则可配置：规则使用“可视化表单 + JSON 高级模式”双模式。
- 安全可视化：把注入风险、异常命中、规则冲突、人工复核链路直接做成一等信息。
- 工程化：前端按领域拆模块，状态、接口、表单 schema、权限、日志埋点可独立维护。

## 3. 一级信息架构

1. 控制台
2. 投稿管理
3. 审稿详情
4. 规则中心
5. 插件中心
6. 安全中心
7. 日志与审计
8. 系统设置

## 4. 导航结构

### 全局导航

- 左侧主导航：8 个一级模块
- 顶部栏：工作区切换、全局搜索、消息中心、异常告警、用户菜单
- 右上快捷入口：新建规则、添加插件、人工复核队列、帮助中心

### 页面跳转关系

- 控制台 -> 投稿管理（按筛选条件带参跳转）
- 控制台 -> 插件中心 -> 插件详情/测试页
- 控制台 -> 安全中心 -> 风险详情
- 投稿管理 -> 审稿详情
- 审稿详情 -> 规则中心（查看命中规则）
- 审稿详情 -> 安全中心（查看攻击命中）
- 规则中心 -> 测试规则 -> 样本审稿结果页
- 插件中心 -> 插件配置向导 -> 插件测试 -> 插件日志
- 安全中心 -> 风险事件详情 -> 关联投稿详情
- 日志与审计 -> 任意实体详情页
- 系统设置 -> 模型配置 / 权限 / 通知配置等子页面

## 5. 路由设计

```ts
const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', element: 'DashboardPage' },
  { path: '/submissions', element: 'SubmissionListPage' },
  { path: '/submissions/:id', element: 'SubmissionDetailPage' },
  { path: '/rules', element: 'RuleListPage' },
  { path: '/rules/new', element: 'RuleEditorPage' },
  { path: '/rules/:id', element: 'RuleDetailPage' },
  { path: '/rules/:id/edit', element: 'RuleEditorPage' },
  { path: '/rules/test', element: 'RuleTestPage' },
  { path: '/plugins', element: 'PluginListPage' },
  { path: '/plugins/new', element: 'PluginMarketPage' },
  { path: '/plugins/:id', element: 'PluginDetailPage' },
  { path: '/plugins/:id/config', element: 'PluginConfigPage' },
  { path: '/plugins/:id/test', element: 'PluginTestPage' },
  { path: '/security', element: 'SecurityOverviewPage' },
  { path: '/security/events', element: 'SecurityEventListPage' },
  { path: '/security/events/:id', element: 'SecurityEventDetailPage' },
  { path: '/audit', element: 'AuditLogPage' },
  { path: '/audit/:id', element: 'AuditLogDetailPage' },
  { path: '/settings', element: 'SettingsLayout' },
  { path: '/settings/general', element: 'GeneralSettingsPage' },
  { path: '/settings/review-flow', element: 'ReviewFlowSettingsPage' },
  { path: '/settings/models', element: 'ModelSettingsPage' },
  { path: '/settings/members', element: 'MemberSettingsPage' },
  { path: '/settings/notifications', element: 'NotificationSettingsPage' },
  { path: '/settings/webhooks', element: 'WebhookSettingsPage' },
];
```

## 6. 页面级方案

### 6.1 控制台 Dashboard

#### 目标

- 一屏掌握运行健康度、投稿规模、风险态势、待处理任务、插件状态。

#### 布局

- 顶部状态卡片区
- 中部图表区
- 底部工作列表区

#### 功能清单

- 查看今日核心指标
- 按时间粒度切换趋势图
- 查看审核结果、风险等级、插件来源分布
- 查看待人工复核列表
- 查看最近高风险投稿
- 查看最近系统异常
- 查看插件连接状态
- 快速测试插件连接
- 快速跳转至人工复核和插件配置

#### 数据字段

```ts
type DashboardStats = {
  today_submission_count: number;
  today_auto_accept_count: number;
  today_manual_review_count: number;
  today_auto_reject_count: number;
  today_high_risk_count: number;
  today_injection_hit_count: number;
  plugin_online_count: number;
  plugin_offline_count: number;
};

type DashboardTrendPoint = {
  timestamp: string;
  submission_count: number;
  auto_accept_count: number;
  auto_reject_count: number;
  manual_review_count: number;
};

type PendingReviewItem = {
  submission_id: string;
  title: string;
  source_plugin_name: string;
  risk_level: 'low' | 'medium' | 'high';
  review_status: 'pending' | 'reviewing';
  created_at: string;
  assigned_to?: string;
};

type PluginHealthItem = {
  plugin_id: string;
  plugin_name: string;
  plugin_type: string;
  status: 'online' | 'offline' | 'warning';
  last_heartbeat_at: string;
  avg_latency_ms: number;
  last_error_message?: string;
};
```

### 6.2 投稿管理

#### 目标

- 统一查看所有投稿，支持搜索、筛选、批量处理、状态追踪。

#### 布局

- 顶部筛选栏
- 中部表格区
- 右侧可选快捷筛选抽屉

#### 功能清单

- 按关键词、来源插件、状态、风险等级、时间范围筛选
- 按投稿 ID / 用户 ID / 内容片段搜索
- 保存筛选视图
- 批量标记人工复核、通过、拒绝、导出
- 查看 AI 审稿结果摘要
- 跳转审稿详情

#### 数据字段

```ts
type SubmissionListItem = {
  submission_id: string;
  source_plugin_id: string;
  source_plugin_name: string;
  source_channel_type: 'weibo' | 'web_form' | 'email' | 'telegram' | 'webhook';
  external_message_id?: string;
  author_display_name?: string;
  content_preview: string;
  category?: string;
  quality_score?: number;
  risk_level: 'low' | 'medium' | 'high';
  security_risk_level: 'low' | 'medium' | 'high';
  review_status: 'pending' | 'auto_accepted' | 'auto_rejected' | 'manual_review' | 'resolved';
  final_decision?: 'accept' | 'reject' | 'manual_review';
  has_attachment: boolean;
  created_at: string;
  updated_at: string;
};

type SubmissionFilter = {
  keyword?: string;
  plugin_ids?: string[];
  source_channel_types?: string[];
  review_statuses?: string[];
  risk_levels?: string[];
  date_range?: [string, string];
  assigned_to?: string;
};
```

### 6.3 审稿详情

#### 目标

- 解释单篇投稿的完整审稿链路，让用户能快速做最终判断。

#### 布局

- 左侧内容主体区
- 右侧审稿结果与操作区
- 底部时间线区

#### 功能清单

- 查看原始投稿内容和附件
- 查看标准化后的清洗内容
- 查看 AI 审稿结果 JSON 和结构化摘要
- 查看命中规则、命中原因、风险标签
- 查看安全检测结果
- 手动 accept / reject / manual_review
- 填写人工复核备注
- 发送回执 / 重新触发审稿 / 加入样本库

#### 数据字段

```ts
type SubmissionDetail = {
  submission_id: string;
  raw_content: string;
  normalized_content: string;
  attachments: Array<{
    file_id: string;
    file_name: string;
    file_type: string;
    file_url: string;
  }>;
  ai_review_result: {
    category: string;
    quality_score: number;
    risk_level: 'low' | 'medium' | 'high';
    decision: 'accept' | 'reject' | 'manual_review';
    matched_rules: string[];
    reasons: string[];
    rewrite_version?: string;
    tags: string[];
    security_review: {
      prompt_injection_risk: 'low' | 'medium' | 'high';
      contains_instruction_override: boolean;
      matched_attack_types: string[];
      reason: string;
    };
  };
  rule_hits: Array<{
    rule_id: string;
    rule_name: string;
    rule_type: string;
    priority: number;
    hit_reason: string;
  }>;
  operator_actions: Array<{
    action_id: string;
    action_type: string;
    operator_name: string;
    note?: string;
    created_at: string;
  }>;
};
```

### 6.4 规则中心

#### 目标

- 让非技术用户通过向导配置审稿规则，同时支持高级用户使用 JSON/表达式模式。

#### 页面组成

- 规则列表页
- 规则编辑页
- 规则测试页
- 规则版本页

#### 功能清单

- 新建规则模板
- 按分类管理规则：内容分类、质量判定、安全检测、流程路由
- 拖拽排序和优先级控制
- 启用 / 停用 / 灰度发布
- 可视化条件编辑
- JSON 高级模式
- 规则冲突提示
- 示例样本测试
- 查看命中统计和版本变更

#### 数据字段

```ts
type ReviewRule = {
  rule_id: string;
  rule_name: string;
  rule_category: 'content' | 'quality' | 'security' | 'flow';
  status: 'enabled' | 'disabled' | 'draft';
  priority: number;
  match_mode: 'visual' | 'json';
  condition_schema: Record<string, unknown>;
  action_schema: Record<string, unknown>;
  version: number;
  created_by: string;
  updated_at: string;
  hit_count_7d: number;
};

type RuleTemplate = {
  template_id: string;
  template_name: string;
  scene_type: 'campus_wall' | 'tree_hole' | 'bot_submission' | 'general';
  description: string;
  default_condition_schema: Record<string, unknown>;
  default_action_schema: Record<string, unknown>;
};
```

### 6.5 插件中心

#### 目标

- 通过插件向导完成接入、授权、字段映射、测试和监控。

#### 页面组成

- 插件市场 / 插件列表
- 插件配置向导
- 插件详情
- 插件测试页

#### 功能清单

- 查看支持的插件类型
- 按模板快速创建插件
- 填写接入凭证
- 配置字段映射
- 配置回调行为和回执模板
- 测试连接、发送测试消息、查看响应
- 查看心跳、延迟、错误率
- 启用 / 停用 / 重试

#### 数据字段

```ts
type PluginDefinition = {
  plugin_type: 'weibo' | 'web_form' | 'email' | 'telegram' | 'webhook';
  display_name: string;
  icon: string;
  version: string;
  description: string;
  auth_schema: FieldSchema[];
  config_schema: FieldSchema[];
  mapping_schema: FieldSchema[];
};

type InstalledPlugin = {
  plugin_id: string;
  plugin_type: string;
  plugin_name: string;
  status: 'enabled' | 'disabled' | 'error' | 'testing';
  auth_status: 'authorized' | 'expired' | 'invalid';
  last_heartbeat_at?: string;
  success_rate_24h: number;
  avg_latency_ms: number;
  last_error_message?: string;
  created_at: string;
};

type FieldSchema = {
  key: string;
  label: string;
  component: 'input' | 'password' | 'select' | 'switch' | 'textarea' | 'json';
  required: boolean;
  help_text?: string;
  options?: Array<{ label: string; value: string }>;
  default_value?: unknown;
};
```

### 6.6 安全中心

#### 目标

- 将 Prompt Injection、角色伪装、规则篡改、异常输出劫持等风险可视化。

#### 页面组成

- 安全总览
- 风险事件列表
- 风险事件详情
- 防护策略配置

#### 功能清单

- 查看风险趋势和攻击类型分布
- 查看高风险投稿与插件来源
- 查看注入攻击命中详情
- 配置安全阈值
- 配置自动降级策略
- 查看误报 / 漏报标记

#### 数据字段

```ts
type SecurityOverview = {
  total_events_24h: number;
  high_risk_events_24h: number;
  injection_hits_24h: number;
  override_hits_24h: number;
  spoof_hits_24h: number;
  format_hijack_hits_24h: number;
  policy_manipulation_hits_24h: number;
};

type SecurityEvent = {
  event_id: string;
  submission_id?: string;
  plugin_id?: string;
  attack_type: 'instruction_override' | 'role_spoofing' | 'format_hijacking' | 'policy_manipulation';
  risk_level: 'low' | 'medium' | 'high';
  hit_text_preview: string;
  detector_name: string;
  detector_version: string;
  auto_action: 'manual_review' | 'block' | 'log_only';
  created_at: string;
};

type SecurityPolicy = {
  policy_id: string;
  policy_name: string;
  enabled: boolean;
  target_attack_types: string[];
  threshold: 'low' | 'medium' | 'high';
  auto_action: 'manual_review' | 'block' | 'log_only';
};
```

### 6.7 日志与审计

#### 目标

- 提供全链路可追踪能力，满足运营排障和审计要求。

#### 功能清单

- 查看操作日志、系统日志、插件日志、审稿日志
- 按实体检索：投稿、规则、插件、用户
- 查看请求响应快照
- 导出审计记录

#### 数据字段

```ts
type AuditLogItem = {
  log_id: string;
  log_type: 'operation' | 'system' | 'plugin' | 'review' | 'security';
  entity_type: 'submission' | 'rule' | 'plugin' | 'user' | 'system';
  entity_id: string;
  action: string;
  operator_name?: string;
  result: 'success' | 'failed' | 'partial';
  request_id?: string;
  message: string;
  created_at: string;
};
```

### 6.8 系统设置

#### 目标

- 管理系统级配置，不干扰业务配置。

#### 子页面

- 基础设置
- 审稿流程设置
- 模型设置
- 成员与权限
- 通知设置
- Webhook 与回执模板

#### 关键字段

```ts
type GeneralSettings = {
  workspace_name: string;
  timezone: string;
  locale: string;
  data_retention_days: number;
};

type ReviewFlowSettings = {
  auto_accept_enabled: boolean;
  auto_reject_enabled: boolean;
  manual_review_required_on_high_risk: boolean;
  default_timeout_seconds: number;
};

type ModelSettings = {
  provider_name: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  fallback_model_name?: string;
};
```

## 7. 推荐前端技术栈

- 核心框架：React 18 + TypeScript
- 构建工具：Vite
- UI 组件：Ant Design 5
- 状态管理：Zustand
- 数据请求：TanStack Query + Axios
- 路由：React Router 6
- 图表：AntV G2Plot 或 ECharts
- 表单：Ant Design Form + React Hook Form 二选一
- 样式：Less 或 CSS Modules，结合 Ant Design Token
- 低代码表单 schema：Zod + 自定义 schema renderer
- 代码规范：ESLint + Prettier + Stylelint
- 测试：Vitest + React Testing Library + Playwright

## 8. React + TypeScript + Ant Design 落地思路

### 目录结构

```txt
src/
  app/
    router/
    providers/
    layouts/
  pages/
    dashboard/
    submissions/
    rules/
    plugins/
    security/
    audit/
    settings/
  features/
    review/
    plugin-runtime/
    rule-builder/
    security-detection/
    audit-log/
  components/
    business/
    charts/
    tables/
    forms/
    feedback/
  services/
    api/
    adapters/
  stores/
  schemas/
  types/
  utils/
```

### 页面实现策略

- 列表页统一使用 `PageHeader + FilterBar + Table + BatchActionBar` 模式。
- 详情页统一使用 `Description + Timeline + SideActionPanel` 模式。
- 配置页统一使用 `StepWizard + SchemaFormRenderer + LivePreview` 模式。
- 风险页面统一使用 `RiskBadge + AttackTypeTag + EvidenceCard + ActionPanel` 模式。

### 低代码关键点

- 插件配置表单由后端返回 `config_schema`，前端通过 `SchemaFormRenderer` 渲染。
- 规则编辑支持“可视化模式”和“JSON 模式”，使用同一份规则 schema。
- 所有高风险操作提供预览区，避免用户改完即生效。
- 新手模式默认只展示必要字段，高级模式再开放 JSON、表达式、版本管理。

## 9. 推荐组件拆分

### 布局组件

- `AppLayout`
- `SideNav`
- `TopBar`
- `WorkspaceSwitcher`
- `GlobalSearch`

### 通用业务组件

- `MetricCard`
- `StatusTag`
- `RiskBadge`
- `PluginStatusBadge`
- `DecisionTag`
- `EmptyGuideCard`
- `JsonPreviewPanel`

### 列表与筛选组件

- `SubmissionFilterBar`
- `RuleFilterBar`
- `PluginFilterBar`
- `AuditFilterBar`
- `BatchActionToolbar`

### 表单与低代码组件

- `SchemaFormRenderer`
- `FieldMappingEditor`
- `RuleConditionBuilder`
- `RuleActionBuilder`
- `PluginConfigWizard`
- `JsonModeEditor`
- `PresetTemplatePicker`

### 图表组件

- `SubmissionTrendChart`
- `DecisionPieChart`
- `RiskBarChart`
- `PluginSourceChart`
- `SecurityTrendChart`

### 详情组件

- `SubmissionContentCard`
- `ReviewResultCard`
- `RuleHitList`
- `SecurityReviewCard`
- `ReviewTimeline`
- `OperatorActionPanel`

## 10. 状态管理建议

- 服务端状态统一走 TanStack Query。
- 页面级筛选、表格列、向导步骤使用 Zustand。
- 表单草稿本地缓存到 `localStorage`，避免误关闭丢失。
- 全局状态仅保留用户信息、工作区、主题、权限和实时告警。

## 11. 插件化前端协议建议

### 插件前端接入模型

- `plugin_definition`：定义插件能力和表单 schema
- `plugin_instance`：实际安装实例
- `plugin_runtime_status`：运行期健康状态
- `plugin_test_result`：测试连接和消息拉取结果

### 前端渲染原则

- 不为每种插件单写页面，统一走 schema 驱动配置。
- 插件差异体现在字段、验证规则、测试动作和说明文案。
- 插件市场页展示“推荐模板”，降低首次接入门槛。

## 12. 安全可视化设计重点

- 风险颜色分层明确：`low=blue`、`medium=gold`、`high=red`
- 审稿详情页把安全结果固定在右侧，不埋在折叠区
- 所有命中攻击类型均提供“证据文本 + 命中规则 + 自动动作”
- 高风险投稿不可直接批量通过
- 手工通过高风险投稿时必须填写理由并写入审计日志

## 13. 0 基础用户体验设计

- 首次进入显示 3 步上手向导：添加插件、配置规则、开始收稿
- 规则中心提供场景模板：校园墙、树洞、表白墙、通用 Bot
- 配置项旁边提供“为什么需要这个字段”
- 空状态页面不只显示空文案，还给出下一步入口
- 复杂字段提供预设值和一键填充示例
- 所有关键页面保留“测试一下”按钮

## 14. 首期开发优先级

### P0

- 登录后主框架
- 控制台
- 投稿管理列表 + 详情
- 规则中心列表 + 编辑 + 测试
- 插件中心列表 + 配置向导 + 测试
- 安全中心总览 + 风险事件列表

### P1

- 日志与审计
- 系统设置
- 规则版本管理
- 插件市场模板

### P2

- 多工作区
- 可视化流程编排
- 拖拽式规则链路图
- 实时告警中心

## 15. 建议的接口分层

- `GET /dashboard/overview`
- `GET /submissions`
- `GET /submissions/:id`
- `POST /submissions/:id/review-action`
- `GET /rules`
- `POST /rules`
- `PUT /rules/:id`
- `POST /rules/test`
- `GET /plugins`
- `GET /plugin-definitions`
- `POST /plugins`
- `POST /plugins/:id/test`
- `GET /security/events`
- `GET /audit/logs`
- `GET /settings/*`

## 16. 结论

- 这个前端方案的核心不是“做一个后台”，而是把插件接入、规则配置、安全检测和人工复核做成可理解、可测试、可追踪的低代码工作台。
- 如果进入实现阶段，建议先按 P0 做一个 Vite + React + Ant Design 骨架，并优先把 `SchemaFormRenderer`、`RuleConditionBuilder`、`SubmissionDetail`、`SecurityReviewCard` 这四个核心能力做出来。
