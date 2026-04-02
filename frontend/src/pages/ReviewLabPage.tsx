import { Alert, App, Button, Card, Descriptions, Input, List, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { PageContainer, SectionCard } from '../components';
import { runReview, type ReviewLabResult } from '../api/review';
import { useAuthStore } from '../features/auth/store';

const defaultSubmissionContent = '这个产品真垃圾，客服像死人一样，大家别买了';
const defaultPolicyText = '允许普通差评，但辱骂、人身攻击、引战、广告引流要重点拦截；不确定就人工复核';
const defaultPlatform = 'weibo';

export function ReviewLabPage() {
  const { message } = App.useApp();
  const initialize = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const initialized = useAuthStore((state) => state.initialized);

  const [content, setContent] = useState(defaultSubmissionContent);
  const [policyText, setPolicyText] = useState(defaultPolicyText);
  const [platform, setPlatform] = useState(defaultPlatform);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReviewLabResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const authLoading = !initialized || status === 'idle' || status === 'loading';
  const authReady = Boolean(user && status === 'authenticated');
  const executeDisabled = authLoading || !authReady || submitting || !content.trim() || !policyText.trim();

  const rawJson = useMemo(() => (result ? JSON.stringify(result, null, 2) : ''), [result]);

  function handleFillExample() {
    setContent(defaultSubmissionContent);
    setPolicyText(defaultPolicyText);
    setPlatform(defaultPlatform);
  }

  async function handleRunReview() {
    if (!user) {
      setRequestError('当前未登录，无法发起审稿测试');
      return;
    }

    setSubmitting(true);
    setRequestError(null);

    try {
      const response = await runReview({
        user: {
          id: user.id,
          email: user.email,
          plan: user.plan,
        },
        submission: {
          id: 'lab_submission',
          content: content.trim(),
          platform: platform.trim() || defaultPlatform,
          metadata: {
            sourceType: 'frontend_lab',
          },
        },
        policy: {
          rawText: policyText.trim(),
        },
      });

      setResult(response.result);
      void message.success('审稿执行完成');
    } catch (error) {
      const safeMessage = error instanceof Error ? error.message : '审稿请求失败';
      setRequestError(safeMessage);
      setResult(null);
      void message.error(safeMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer
      title="LLM 审稿联调"
      subtitle="当前页面会自动读取 /auth/me 恢复的登录用户信息，并将 user.id / user.email / user.plan 透传给 review 服务。"
    >
      <SectionCard title="当前登录用户">
        {authLoading ? (
          <Alert type="info" showIcon message="正在加载当前登录用户信息" />
        ) : authReady && user ? (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="id">{user.id}</Descriptions.Item>
            <Descriptions.Item label="email">{user.email}</Descriptions.Item>
            <Descriptions.Item label="plan">
              <Tag color={user.plan === 'vip' ? 'gold' : 'blue'}>{user.plan}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="role">{user.role || '-'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Alert
            type="warning"
            showIcon
            message="当前未登录，无法发起审稿测试"
            description="请先通过现有登录页完成登录。未登录时执行按钮会保持禁用。"
          />
        )}
      </SectionCard>

      <SectionCard title="联调输入">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>待审核文本</Typography.Text>
            <Input.TextArea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              autoSize={{ minRows: 5, maxRows: 10 }}
              placeholder="输入待审核内容"
            />
          </div>

          <div>
            <Typography.Text strong>审稿策略 policy</Typography.Text>
            <Input.TextArea
              value={policyText}
              onChange={(event) => setPolicyText(event.target.value)}
              autoSize={{ minRows: 5, maxRows: 10 }}
              placeholder="输入审稿策略"
            />
          </div>

          <div>
            <Typography.Text strong>平台 platform</Typography.Text>
            <Input
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              placeholder="例如 weibo"
            />
          </div>

          <Space wrap>
            <Button type="primary" onClick={() => void handleRunReview()} disabled={executeDisabled} loading={submitting}>
              {submitting ? '审稿中...' : '执行审稿'}
            </Button>
            <Button onClick={handleFillExample}>填充示例</Button>
          </Space>

          {requestError ? <Alert type="error" showIcon message={requestError} /> : null}
        </Space>
      </SectionCard>

      <SectionCard title="结构化审稿结果">
        {!result ? (
          <Alert type="info" showIcon message="尚未执行审稿" />
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="submission_id">{result.submission_id}</Descriptions.Item>
              <Descriptions.Item label="decision">
                <Tag color={result.decision === 'approve' ? 'success' : result.decision === 'reject' ? 'error' : 'processing'}>
                  {result.decision}
                </Tag>
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

            <div>
              <Typography.Text strong>原始 JSON 结果</Typography.Text>
              <Input.TextArea value={rawJson} readOnly autoSize={{ minRows: 10, maxRows: 18 }} />
            </div>
          </Space>
        )}
      </SectionCard>
    </PageContainer>
  );
}
