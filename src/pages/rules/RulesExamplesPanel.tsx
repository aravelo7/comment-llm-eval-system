import { Button, Card, List, Space, Tag, Typography } from 'antd';

import { getReviewStatusTag, getRiskLevelTag } from '../submissions/columns';
import type { RuleExample } from '../../mock/mockRuleExamples';
import type { ReviewResult } from '../../lib/reviewEngine';

type RulesExamplesPanelProps = {
  examples: RuleExample[];
  evaluations: Record<string, ReviewResult>;
  onAdjustExample: (example: RuleExample) => void;
  onUseInPreview: (example: RuleExample) => void;
};

export function RulesExamplesPanel({
  examples,
  evaluations,
  onAdjustExample,
  onUseInPreview,
}: RulesExamplesPanelProps) {
  return (
    <Card bordered={false} className="section-card">
      <Space direction="vertical" size={6} style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          典型投稿例子
        </Typography.Title>
        <Typography.Text type="secondary">
          用常见投稿场景理解当前规则，点击后可以直接拿来测试或调整规则。
        </Typography.Text>
      </Space>

      <List
        itemLayout="vertical"
        dataSource={examples}
        renderItem={(example) => {
          const result = evaluations[example.id];

          return (
            <List.Item
              actions={[
                <Button key="preview" type="link" onClick={() => onUseInPreview(example)}>
                  带入预览
                </Button>,
                <Button key="adjust" type="link" onClick={() => onAdjustExample(example)}>
                  用这个例子调整规则
                </Button>,
              ]}
            >
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space wrap>
                  <Typography.Text strong>{example.title}</Typography.Text>
                  <Tag>{example.category}</Tag>
                  {result ? getReviewStatusTag(result.review_status) : null}
                  {result ? getRiskLevelTag(result.risk_level) : null}
                </Space>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  {example.content}
                </Typography.Paragraph>
                {result ? (
                  <Space wrap size={[8, 8]}>
                    {result.matched_rules.map((rule) => (
                      <Tag key={rule} color="geekblue">
                        {rule}
                      </Tag>
                    ))}
                  </Space>
                ) : null}
              </Space>
            </List.Item>
          );
        }}
      />
    </Card>
  );
}
