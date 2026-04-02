import { Alert, Card, Collapse, Descriptions, Empty, List, Space, Tag, Typography } from 'antd';

import type { ReviewLabResult } from '../../api/review';

type ReviewResultCardProps = {
  result: ReviewLabResult | null;
  compact?: boolean;
  emptyText?: string;
};

function getDecisionColor(decision: ReviewLabResult['decision']) {
  if (decision === 'approve') {
    return 'success';
  }

  if (decision === 'reject') {
    return 'error';
  }

  return 'processing';
}

export function ReviewResultCard({ result, compact = false, emptyText = '尚未执行审稿' }: ReviewResultCardProps) {
  if (!result) {
    return <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const rawJson = JSON.stringify(result, null, 2);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="submission_id">{result.submission_id}</Descriptions.Item>
        <Descriptions.Item label="decision">
          <Tag color={getDecisionColor(result.decision)}>{result.decision}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="risk_score">{result.risk_score}</Descriptions.Item>
        <Descriptions.Item label="confidence">{result.confidence}</Descriptions.Item>
        <Descriptions.Item label="needs_human_review">{String(result.needs_human_review)}</Descriptions.Item>
        <Descriptions.Item label="model_tier">{result.model_tier}</Descriptions.Item>
        <Descriptions.Item label="model_name">{result.model_name}</Descriptions.Item>
        <Descriptions.Item label="reason">{result.reason || '-'}</Descriptions.Item>
      </Descriptions>

      <Card size="small" title="labels">
        <List
          size="small"
          dataSource={result.labels}
          locale={{ emptyText: '空' }}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      </Card>

      <Card size="small" title="evidence">
        <List
          size="small"
          dataSource={result.evidence}
          locale={{ emptyText: '空' }}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      </Card>

      <Card size="small" title="规则初筛命中">
        <List
          size="small"
          dataSource={result.rule_hits}
          locale={{ emptyText: '空' }}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag>{item.code}</Tag>
                  <Tag color={item.severity === 'high' ? 'red' : item.severity === 'medium' ? 'orange' : 'default'}>
                    {item.severity}
                  </Tag>
                </Space>
                <Typography.Text>{item.message}</Typography.Text>
                <Typography.Text type="secondary">
                  evidence: {item.evidence.length > 0 ? item.evidence.join(' / ') : '空'}
                </Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      {compact ? (
        <Collapse
          items={[
            {
              key: 'raw-json',
              label: '原始 JSON',
              children: <pre className="submission-detail__json">{rawJson}</pre>,
            },
          ]}
        />
      ) : (
        <Card size="small" title="原始 JSON">
          <pre className="submission-detail__json">{rawJson}</pre>
        </Card>
      )}

      {result.decision === 'review' && result.needs_human_review ? (
        <Alert
          type="warning"
          showIcon
          message="当前结果建议进入人工复核"
          description="模型认为当前内容存在边界不确定性或风险信号，建议结合规则和上下文继续复审。"
        />
      ) : null}
    </Space>
  );
}
