import { Alert, Card, Collapse, Descriptions, Empty, List, Space, Tag, Typography } from 'antd';

import type { ReviewLabResult } from '../../api/review';

type ReviewResultCardProps = {
  result: ReviewLabResult | null;
  compact?: boolean;
  emptyText?: string;
};

function getActionColor(action: ReviewLabResult['action']) {
  if (action === 'allow') {
    return 'success';
  }

  if (action === 'block') {
    return 'error';
  }

  return 'processing';
}

export function ReviewResultCard({ result, compact = false, emptyText = 'No review result yet' }: ReviewResultCardProps) {
  if (!result) {
    return <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const rawJson = JSON.stringify(result, null, 2);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="label">{result.label}</Descriptions.Item>
        <Descriptions.Item label="risk_level">
          <Tag color={result.risk_level === 'high' ? 'red' : result.risk_level === 'medium' ? 'orange' : 'green'}>
            {result.risk_level}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="action">
          <Tag color={getActionColor(result.action)}>{result.action}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="confidence">{result.confidence}</Descriptions.Item>
        <Descriptions.Item label="needs_human_review">{String(result.needs_human_review)}</Descriptions.Item>
        <Descriptions.Item label="reason">{result.reason || '-'}</Descriptions.Item>
      </Descriptions>

      <Card size="small" title="evidence">
        <List
          size="small"
          dataSource={result.evidence}
          locale={{ emptyText: 'empty' }}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      </Card>

      <Card size="small" title="rule_hits">
        <List
          size="small"
          dataSource={result.rule_hits}
          locale={{ emptyText: 'empty' }}
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
                  evidence: {item.evidence.length > 0 ? item.evidence.join(' / ') : 'empty'}
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
              label: 'raw JSON',
              children: <pre className="submission-detail__json">{rawJson}</pre>,
            },
          ]}
        />
      ) : (
        <Card size="small" title="raw JSON">
          <pre className="submission-detail__json">{rawJson}</pre>
        </Card>
      )}

      {result.action === 'review' && result.needs_human_review ? (
        <Alert
          type="warning"
          showIcon
          message="Human review recommended"
          description="The mock backend marked this content as borderline and suggests manual review."
        />
      ) : null}
    </Space>
  );
}
