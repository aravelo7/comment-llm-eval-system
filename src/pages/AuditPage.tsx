import { Button, Col, Input, Row, Select, Space, Table } from 'antd';

import { PageContainer, SectionCard } from '../components';

const columns = [
  { title: '日志 ID', dataIndex: 'id', key: 'id', width: 140 },
  { title: '动作类型', dataIndex: 'actionType', key: 'actionType', width: 160 },
  { title: '平台', dataIndex: 'dataSourcePlatform', key: 'dataSourcePlatform', width: 100 },
  { title: '渠道', dataIndex: 'channel', key: 'channel', width: 120 },
  { title: '来源模式', dataIndex: 'sourceMode', key: 'sourceMode', width: 120 },
  { title: '同步任务', dataIndex: 'syncJobId', key: 'syncJobId', width: 150 },
  { title: '批次 ID', dataIndex: 'batchId', key: 'batchId', width: 150 },
  { title: '认证状态', dataIndex: 'authStatus', key: 'authStatus', width: 120 },
  { title: '限流状态', dataIndex: 'rateLimitStatus', key: 'rateLimitStatus', width: 120 },
  { title: '操作人', dataIndex: 'importOperator', key: 'importOperator', width: 120 },
  { title: '结果', dataIndex: 'result', key: 'result', width: 100 },
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
];

const dataSource = [
  { key: '1', id: 'AUD-001', actionType: 'login', dataSourcePlatform: '-', channel: '-', sourceMode: 'mock', syncJobId: '-', batchId: '-', authStatus: 'success', rateLimitStatus: 'healthy', importOperator: 'auth-store', result: 'success', createdAt: '2026-03-27 09:20' },
  { key: '2', id: 'AUD-002', actionType: 'platform_config_change', dataSourcePlatform: 'weibo', channel: 'public_comment', sourceMode: 'mock', syncJobId: 'sync-weibo-20260327', batchId: 'batch-weibo-public_comment', authStatus: 'backend_only', rateLimitStatus: 'healthy', importOperator: 'admin.current', result: 'success', createdAt: '2026-03-27 09:30' },
  { key: '3', id: 'AUD-003', actionType: 'sync_trigger', dataSourcePlatform: 'douban', channel: 'private_message', sourceMode: 'manual_import', syncJobId: 'sync-douban-20260327', batchId: 'batch-douban-private_message', authStatus: 'backend_only', rateLimitStatus: 'watch', importOperator: 'reviewer.ops', result: 'queued', createdAt: '2026-03-27 09:42' },
  { key: '4', id: 'AUD-004', actionType: 'permission_denied', dataSourcePlatform: 'tieba', channel: 'private_message', sourceMode: 'api', syncJobId: 'sync-tieba-20260327', batchId: 'batch-tieba-private_message', authStatus: 'missing', rateLimitStatus: 'unknown', importOperator: 'gateway', result: '403', createdAt: '2026-03-27 09:56' },
];

export function AuditPage() {
  return (
    <PageContainer
      title="日志与审计"
      subtitle="查看登录、登出、平台配置变更、模式切换、同步触发、审核决策和 401/403/429 异常等审计记录。"
      extra={<Button type="primary">导出日志</Button>}
    >
      <SectionCard title="筛选栏">
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8} xl={5}>
            <Input placeholder="搜索日志 ID / 批次 ID" />
          </Col>
          <Col xs={12} md={8} xl={4}>
            <Select
              placeholder="动作类型"
              options={[
                { label: '登录', value: 'login' },
                { label: '登出', value: 'logout' },
                { label: '平台配置修改', value: 'platform_config_change' },
                { label: '同步触发', value: 'sync_trigger' },
                { label: '审核决策', value: 'moderation_decision' },
                { label: '认证失败', value: 'auth_failure' },
                { label: '权限拒绝', value: 'permission_denied' },
                { label: '数据导入', value: 'data_import' },
              ]}
            />
          </Col>
          <Col xs={12} md={8} xl={4}>
            <Select
              placeholder="平台"
              options={[
                { label: '微博', value: 'weibo' },
                { label: '豆瓣', value: 'douban' },
                { label: '贴吧', value: 'tieba' },
              ]}
            />
          </Col>
          <Col xs={12} md={8} xl={4}>
            <Select
              placeholder="渠道"
              options={[
                { label: '评论区', value: 'public_comment' },
                { label: '私信', value: 'private_message' },
              ]}
            />
          </Col>
          <Col xs={24} xl={7}>
            <Space>
              <Button type="primary">查询</Button>
              <Button>重置</Button>
            </Space>
          </Col>
        </Row>
      </SectionCard>

      <SectionCard title="审计日志表">
        <Table columns={columns} dataSource={dataSource} pagination={{ pageSize: 10 }} scroll={{ x: 1600 }} />
      </SectionCard>
    </PageContainer>
  );
}
