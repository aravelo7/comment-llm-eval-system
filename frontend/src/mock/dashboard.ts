export const dashboardStats = [
  { title: '今日投稿数', value: '268', hint: '较昨日 +12%' },
  { title: '自动通过数', value: '142', hint: '命中常规规则' },
  { title: '人工复核数', value: '39', hint: '等待运营处理' },
  { title: '自动拒绝数', value: '27', hint: '违规或异常内容' },
  { title: '高风险投稿数', value: '11', hint: '需重点关注' },
  { title: '注入攻击命中数', value: '6', hint: '安全策略已拦截' },
];

export const pendingSubmissionColumns = [
  { title: '投稿标题', dataIndex: 'title', key: 'title' },
  { title: '来源插件', dataIndex: 'plugin', key: 'plugin' },
  { title: '风险等级', dataIndex: 'riskLevel', key: 'riskLevel' },
  { title: '提交时间', dataIndex: 'createdAt', key: 'createdAt' },
];

export const pendingSubmissionData = [
  {
    key: '1',
    title: '匿名树洞投稿：宿舍矛盾求助',
    plugin: 'Web 表单',
    riskLevel: '中',
    createdAt: '10:24',
  },
  {
    key: '2',
    title: '投稿包含可疑系统指令文本',
    plugin: 'Telegram Bot',
    riskLevel: '高',
    createdAt: '09:18',
  },
  {
    key: '3',
    title: '表白墙日常投稿',
    plugin: '微博私信',
    riskLevel: '低',
    createdAt: '08:42',
  },
];
