import { Col, List, Row, Space, Tag, Typography } from 'antd';

import { EmptyBlock, PageContainer, SectionCard } from '../components';
import { PlatformCard } from '../features/platforms/components';
import { getPlatformAdapter, platformIntegrationConfigs } from '../features/platforms';

export function PluginsPage() {
  return (
    <PageContainer
      title="平台接入管理"
      subtitle="统一管理微博、豆瓣、贴吧的接入模式、授权状态与渠道支持情况。前端仅展示配置状态，不保存真实凭证。"
    >
      <SectionCard title="平台接入卡片">
        <Row gutter={[16, 16]}>
          {platformIntegrationConfigs.map((integration) => (
            <Col xs={24} md={12} xl={8} key={integration.platform}>
              <PlatformCard integration={integration} />
            </Col>
          ))}
        </Row>
      </SectionCard>

      <SectionCard title="平台风险提示">
        <List
          dataSource={platformIntegrationConfigs.flatMap((integration) =>
            getPlatformAdapter(integration.platform).riskHints.map((hint) => ({
              platform: integration.displayName,
              ...hint,
            })),
          )}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical" size={2}>
                <Space>
                  <Tag>{item.platform}</Tag>
                  <Tag color={item.severity === 'high' ? 'red' : 'gold'}>{item.severity}</Tag>
                </Space>
                <Typography.Text strong>{item.title}</Typography.Text>
                <Typography.Text type="secondary">{item.description}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </SectionCard>

      <SectionCard title="能力边界说明">
        <EmptyBlock
          description="本页只负责平台接入管理和模式切换占位。真实 secret、token、cookie、session 必须由后端托管；微博私信若无官方开放权限则只能走 manual import，不实现任何绕过登录、验证码、风控或非授权私信抓取能力。"
          minHeight={120}
        />
      </SectionCard>
    </PageContainer>
  );
}
