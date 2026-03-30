import { Button, Col, List, Row, Table, Typography } from 'antd';

import {
  EmptyBlock,
  PageContainer,
  SectionCard,
  StatCard,
} from '../components';
import {
  dashboardStats,
  pendingSubmissionColumns,
  pendingSubmissionData,
} from '../mock/dashboard';

export function DashboardPage() {
  return (
    <PageContainer
      title="控制台"
      subtitle="查看 Bot 审稿工作台的运行状态、风险态势和待办任务。"
      extra={<Button type="primary">刷新数据</Button>}
    >
      <Row gutter={[16, 16]}>
        {dashboardStats.map((item) => (
          <Col xs={24} sm={12} xl={8} xxl={4} key={item.title}>
            <StatCard title={item.title} value={item.value} hint={item.hint} />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <SectionCard title="投稿趋势图">
            <EmptyBlock description="ECharts 趋势图占位，后续接入真实统计接口。" />
          </SectionCard>
        </Col>
        <Col xs={24} xl={12}>
          <SectionCard title="风险等级分布">
            <EmptyBlock description="ECharts 风险分布占位，后续接入审稿结果聚合数据。" />
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <SectionCard
            title="待处理列表"
            extra={<Typography.Text type="secondary">最近 3 条</Typography.Text>}
          >
            <Table
              columns={pendingSubmissionColumns}
              dataSource={pendingSubmissionData}
              pagination={false}
              size="middle"
            />
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <SectionCard title="最近高风险投稿">
            <List
              dataSource={[
                '投稿含“忽略之前规则”字样，已转人工复核',
                'Webhook 来源内容包含角色伪装语句',
              ]}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </SectionCard>
        </Col>
        <Col xs={24} xl={12}>
          <SectionCard title="插件连接状态">
            <List
              dataSource={[
                '微博私信插件：在线',
                'Telegram Bot：在线',
                '邮箱接入：等待配置',
              ]}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </SectionCard>
        </Col>
      </Row>
    </PageContainer>
  );
}
