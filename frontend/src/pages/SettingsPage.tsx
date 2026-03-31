import { Button, Col, Descriptions, Row, Select, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import { EmptyBlock, PageContainer, SectionCard } from '../components';
import { useAuthStore } from '../features/auth/store';
import { platformIntegrationConfigs } from '../features/platforms';

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  return (
    <PageContainer
      title="系统设置"
      subtitle="配置多平台审稿系统的默认过滤器、数据保留策略和接入说明。真实平台凭证仅由后端保管。"
      extra={<Button type="primary">保存设置</Button>}
    >
      <SectionCard
        title="当前登录账号"
        extra={
          <Button
            danger
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            退出登录
          </Button>
        }
      >
        <Descriptions column={{ xs: 1, md: 2 }} bordered size="middle">
          <Descriptions.Item label="邮箱">{user?.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="昵称">{user?.nickname || '-'}</Descriptions.Item>
          <Descriptions.Item label="角色">
            {user?.role ? <Tag color="blue">{user.role}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="套餐">
            {user?.plan ? <Tag color={user.plan === 'vip' ? 'gold' : 'default'}>{user.plan}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="账号状态">
            {user?.status ? <Tag color={user.status === 'active' ? 'success' : 'error'}>{user.status}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="账号 ID">{user?.id || '-'}</Descriptions.Item>
        </Descriptions>

        {user?.plan === 'free' ? (
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            当前为 free 套餐。后续模型调用层可基于该字段切换免费 provider 与付费 provider。
          </Typography.Paragraph>
        ) : null}
      </SectionCard>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <SectionCard title="默认审核视图">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Typography.Text>默认平台过滤器</Typography.Text>
              <Select
                mode="multiple"
                allowClear
                options={platformIntegrationConfigs.map((item) => ({
                  label: item.displayName,
                  value: item.platform,
                }))}
                placeholder="默认显示全部平台"
              />
              <Typography.Text>默认渠道过滤器</Typography.Text>
              <Select
                allowClear
                options={[
                  { label: '评论区', value: 'public_comment' },
                  { label: '私信', value: 'private_message' },
                ]}
                placeholder="默认显示全部渠道"
              />
            </Space>
          </SectionCard>
        </Col>
        <Col xs={24} xl={12}>
          <SectionCard title="数据保留与同步窗口">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Typography.Text>默认数据保留策略</Typography.Text>
              <Select
                options={[
                  { label: '30 天', value: '30d' },
                  { label: '90 天', value: '90d' },
                  { label: '180 天', value: '180d' },
                ]}
                placeholder="选择保留周期"
              />
              <Typography.Text>同步窗口占位</Typography.Text>
              <Select
                options={[
                  { label: '最近 24 小时', value: '24h' },
                  { label: '最近 7 天', value: '7d' },
                  { label: '最近 30 天', value: '30d' },
                ]}
                placeholder="选择同步窗口"
              />
            </Space>
          </SectionCard>
        </Col>
      </Row>

      <SectionCard title="平台凭证说明">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="凭证存储">
            前端仅展示配置状态，不保存微博、豆瓣、贴吧的真实 secret、token、cookie 或 session。
          </Descriptions.Item>
          <Descriptions.Item label="后端要求">
            真实接入必须由后端负责凭证托管、权限校验、速率控制、审计和最小化同步。
          </Descriptions.Item>
          <Descriptions.Item label="私信接入">
            私信内容属于高敏感数据，仅允许在合规授权、最小化采集和脱敏展示前提下处理。
          </Descriptions.Item>
        </Descriptions>
      </SectionCard>

      <SectionCard title="数据最小化与脱敏说明">
        <EmptyBlock
          description="展示层默认只渲染纯文本，不信任平台返回的 HTML；私信中的接收方、联系方式和外链应默认做部分打码或禁点处理。"
          minHeight={160}
        />
      </SectionCard>
    </PageContainer>
  );
}
