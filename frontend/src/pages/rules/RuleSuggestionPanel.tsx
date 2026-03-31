import { BulbOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Space, Typography } from 'antd';

import type { ExampleAdjustmentSuggestion } from '../../types/rules';

type RuleSuggestionPanelProps<TValues extends object> = {
  exampleTitle?: string;
  suggestion: ExampleAdjustmentSuggestion<TValues> | null;
  onApply: () => void;
};

export function RuleSuggestionPanel<TValues extends object>({
  exampleTitle,
  suggestion,
  onApply,
}: RuleSuggestionPanelProps<TValues>) {
  return (
    <Card bordered={false} className="section-card">
      <Space direction="vertical" size={6} style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          例子驱动调规则
        </Typography.Title>
        <Typography.Text type="secondary">
          先看系统为什么这么判断，再决定要不要调整规则。
        </Typography.Text>
      </Space>

      {suggestion ? (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space align="start">
            <BulbOutlined style={{ color: '#faad14', marginTop: 4 }} />
            <div>
              <Typography.Text strong>{exampleTitle}</Typography.Text>
              <div>
                <Typography.Text>{suggestion.title}</Typography.Text>
              </div>
            </div>
          </Space>
          <Typography.Text type="secondary">{suggestion.description}</Typography.Text>
          <Button type="primary" onClick={onApply}>
            {suggestion.applyLabel}
          </Button>
        </Space>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="点击左侧例子的“用这个例子调整规则”后，这里会给出更容易理解的建议。"
        />
      )}
    </Card>
  );
}
