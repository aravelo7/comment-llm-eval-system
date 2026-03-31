import { Alert, Space, Typography } from 'antd';

export function ContentRulesTab() {
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        内容规则能力已收敛到统一规则页
      </Typography.Title>
      <Typography.Text type="secondary">
        第一阶段收口后，内容规则、风险规则和平台/渠道作用域规则统一在“规则中心”页面维护。
      </Typography.Text>
      <Alert
        type="info"
        showIcon
        message="此组件保留为兼容占位"
        description="旧版分栏规则编辑器不再作为主入口，避免继续依赖旧的单平台示例和旧版规则执行路径。"
      />
    </Space>
  );
}
