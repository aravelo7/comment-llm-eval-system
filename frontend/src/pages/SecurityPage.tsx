import { Alert, Button, List, Space, Tag, Typography } from 'antd';

import { PageContainer, SectionCard } from '../components';
import { getPlatformAdapter, platformIntegrationConfigs } from '../features/platforms';

const platformSecurityNotices = [
  '不信任任何平台返回的 HTML，默认不渲染 contentHtml。',
  '平台接入凭证、secret、cookie、session 必须由后端托管，前端只展示状态。',
  '私信属于高敏感数据，需授权接入、最小化采集和脱敏展示。',
  '不实现绕过登录、验证码、风控或非授权抓取能力。',
];

export function SecurityPage() {
  return (
    <PageContainer
      title="安全中心"
      subtitle="展示多平台接入的安全提示、私信敏感性说明和接入边界。安全策略重点覆盖输入安全、配置安全与合规约束。"
      extra={<Button type="primary">新增安全策略</Button>}
    >
      <SectionCard title="平台接入安全提示">
        <List
          dataSource={platformIntegrationConfigs}
          renderItem={(integration) => {
            const adapter = getPlatformAdapter(integration.platform);
            return (
              <List.Item>
                <Space direction="vertical" size={6}>
                  <Space>
                    <Tag color={adapter.color}>{adapter.displayName}</Tag>
                    <Tag>{integration.mode}</Tag>
                    <Tag color={integration.enabled ? 'success' : 'default'}>
                      {integration.enabled ? '已启用' : '未启用'}
                    </Tag>
                  </Space>
                  <Typography.Text strong>{integration.riskNotice}</Typography.Text>
                  {adapter.riskHints.map((hint) => (
                    <Typography.Text type="secondary" key={hint.title}>
                      {hint.title}：{hint.description}
                    </Typography.Text>
                  ))}
                </Space>
              </List.Item>
            );
          }}
        />
      </SectionCard>

      <SectionCard title="私信敏感内容说明">
        <Alert
          type="warning"
          showIcon
          message="私信内容需授权接入、最小化采集、脱敏展示"
          description="私信审核不应仅靠内容关键词判断，还应结合行为风控、批量触达特征和授权链路。接收方名称、外链、联系方式默认不直接暴露。"
        />
      </SectionCard>

      <SectionCard title="统一安全基线">
        <List
          dataSource={platformSecurityNotices}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      </SectionCard>
    </PageContainer>
  );
}
