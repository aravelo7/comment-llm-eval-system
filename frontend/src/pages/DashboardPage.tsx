import { Button, Col, List, Row, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { ReviewLabResult } from '../api/review';
import { PageContainer, SectionCard, StatCard } from '../components';
import { useAuthStore } from '../features/auth/store';
import { ReviewLabPanel } from '../features/review-lab';

export function DashboardPage() {
  const initialize = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const initialized = useAuthStore((state) => state.initialized);
  const [latestResult, setLatestResult] = useState<ReviewLabResult | null>(null);
  const [latestExecutedAt, setLatestExecutedAt] = useState<string | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const authReady = initialized && status === 'authenticated' && user;
  const modelTierText = user?.plan === 'vip' ? 'vip placeholder' : 'free';
  const overviewStats = useMemo(
    () => [
      {
        title: '当前计划',
        value: user?.plan || '-',
        hint: '计划信息来自 /auth/me，不允许手动修改',
      },
      {
        title: '模型层级',
        value: modelTierText,
        hint: user?.plan === 'vip' ? 'VIP 路由当前仍为占位模型' : '当前走 free 模型路由',
      },
      {
        title: '最近一次 action',
        value: latestResult?.action || '未执行',
        hint: latestExecutedAt ? `最近执行：${latestExecutedAt}` : '在首页直接发起一次审稿测试',
      },
      {
        title: '最近一次 risk_level',
        value: latestResult ? latestResult.risk_level : '-',
        hint: latestResult ? `confidence ${latestResult.confidence}` : '执行后自动更新',
      },
    ],
    [latestExecutedAt, latestResult, modelTierText, user?.plan],
  );

  return (
    <PageContainer
      title="首页"
      subtitle="登录后可直接在工作台首页发起智能审稿，查看结构化结果，并快速跳转到规则、提交列表和联调页。"
      extra={<Button type="primary">工作台在线</Button>}
    >
      <Row gutter={[16, 16]}>
        {overviewStats.map((item) => (
          <Col xs={24} sm={12} xl={8} xxl={6} key={item.title}>
            <StatCard title={item.title} value={item.value} hint={item.hint} />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <SectionCard title="欢迎信息" extra={authReady ? <Tag color="green">已登录</Tag> : <Tag>未登录</Tag>}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Typography.Text>
                当前用户：<Typography.Text strong>{user?.email || '未登录'}</Typography.Text>
              </Typography.Text>
              <Typography.Text>
                角色：<Typography.Text strong>{user?.role || '-'}</Typography.Text>
              </Typography.Text>
              <Typography.Text>
                套餐：<Typography.Text strong>{user?.plan || '-'}</Typography.Text>
              </Typography.Text>
              <Typography.Text type="secondary">
                {user?.plan === 'vip'
                  ? '当前模型层级显示为 vip placeholder，结果结构仍保持稳定。'
                  : '当前模型层级显示为 free，可直接在首页完成智能审稿。'}
              </Typography.Text>
            </Space>
          </SectionCard>
        </Col>
        <Col xs={24} xl={16}>
          <SectionCard title="快捷入口">
            <List
              dataSource={[
                { title: '提交列表', description: '查看已导入的待审核数据和处理状态', path: '/submissions' },
                { title: '规则中心', description: '查看当前规则配置与示例', path: '/rules' },
                { title: '审稿联调', description: '进入完整调试页，适合更细的联调验证', path: '/review-lab' },
                { title: '系统设置', description: '查看当前账号、计划和系统配置', path: '/settings' },
              ]}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="link" key={item.path}>
                      <Link to={item.path}>进入</Link>
                    </Button>,
                  ]}
                >
                  <List.Item.Meta title={item.title} description={item.description} />
                </List.Item>
              )}
            />
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <ReviewLabPanel
            variant="compact"
            showUserCard={false}
            sourceType="dashboard"
            onResultChange={({ result, executedAt }) => {
              setLatestResult(result);
              setLatestExecutedAt(executedAt);
            }}
          />
        </Col>
        <Col xs={24} xl={10}>
          <SectionCard title="最近一次审稿状态">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Typography.Text>
                最近执行时间：<Typography.Text strong>{latestExecutedAt || '尚未执行'}</Typography.Text>
              </Typography.Text>
              <Typography.Text>
                最近一次 action：<Typography.Text strong>{latestResult?.action || '-'}</Typography.Text>
              </Typography.Text>
              <Typography.Text>
                最近一次 risk_level：<Typography.Text strong>{latestResult ? latestResult.risk_level : '-'}</Typography.Text>
              </Typography.Text>
              <Typography.Text type="secondary">
                首页版更适合快速审稿；如需更完整说明和联调视图，请进入“审稿联调”页面。
              </Typography.Text>
            </Space>
          </SectionCard>
        </Col>
      </Row>
    </PageContainer>
  );
}
