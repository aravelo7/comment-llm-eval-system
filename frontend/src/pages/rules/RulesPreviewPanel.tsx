import { Button, Card, Input, Space, Tag, Typography } from 'antd';

import { getReviewStatusTag, getRiskLevelTag } from '../submissions/columns';
import type { ReviewResult } from '../../lib/reviewEngine';

type RulesPreviewPanelProps = {
  previewContent: string;
  previewHint?: string;
  onChangeContent: (value: string) => void;
  onCheck: () => void;
  result: ReviewResult | null;
};

export function RulesPreviewPanel({
  previewContent,
  previewHint,
  onChangeContent,
  onCheck,
  result,
}: RulesPreviewPanelProps) {
  return (
    <Card bordered={false} className="section-card">
      <Space direction="vertical" size={6} style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          规则效果预览
        </Typography.Title>
        <Typography.Text type="secondary">
          输入一段测试投稿，立即查看在当前规则下会被如何处理。
        </Typography.Text>
      </Space>

      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Input.TextArea
          value={previewContent}
          rows={6}
          placeholder="输入一段测试投稿文本"
          onChange={(event) => onChangeContent(event.target.value)}
        />
        {previewHint ? <Typography.Text type="secondary">{previewHint}</Typography.Text> : null}
        <Button type="primary" onClick={onCheck}>
          立即检测
        </Button>

        {result ? (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Space wrap>
              {getReviewStatusTag(result.review_status)}
              {getRiskLevelTag(result.risk_level)}
            </Space>
            <div>
              <Typography.Text strong>命中的规则</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Space wrap size={[8, 8]}>
                  {result.matched_rules.map((rule) => (
                    <Tag key={rule} color="geekblue">
                      {rule}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
            <div>
              <Typography.Text strong>原因说明</Typography.Text>
              <ul className="rules-preview__reason-list">
                {result.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          </Space>
        ) : null}
      </Space>
    </Card>
  );
}
