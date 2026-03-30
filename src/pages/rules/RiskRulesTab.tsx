import { Alert, Space, Typography } from 'antd';

export function RiskRulesTab() {
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        风险规则能力已收敛到统一规则页
      </Typography.Title>
      <Typography.Text type="secondary">
        当前第一阶段演示以“规则中心”中的统一作用域规则为准，避免旧页面继续走过时逻辑。
      </Typography.Text>
      <Alert
        type="info"
        showIcon
        message="此组件保留为兼容占位"
        description="后续如需恢复分栏配置，可在统一内容模型和统一规则引擎基础上再拆分，不再回到旧链路。"
      />
    </Space>
  );
}
