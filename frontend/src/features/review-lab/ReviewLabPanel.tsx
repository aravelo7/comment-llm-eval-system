import { Alert, App, Button, Descriptions, Input, Select, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { runReview, type ReviewLabResult } from '../../api/review';
import { SectionCard } from '../../components';
import { useAuthStore } from '../auth/store';
import { ReviewResultCard } from './ReviewResultCard';

const defaultSubmissionContent = '这个产品真垃圾，客服像死人一样，大家别买了';
const defaultPolicyText = '允许普通差评，但辱骂、人身攻击、引战、广告引流要重点拦截；不确定就人工复核';
const defaultPlatform = 'weibo';
const platformOptions = [
  { label: 'weibo', value: 'weibo' },
  { label: 'xiaohongshu', value: 'xiaohongshu' },
  { label: 'zhihu', value: 'zhihu' },
  { label: 'douban', value: 'douban' },
  { label: 'tieba', value: 'tieba' },
  { label: 'bilibili', value: 'bilibili' },
];

type ReviewLabPanelProps = {
  variant?: 'compact' | 'full';
  showUserCard?: boolean;
  sourceType?: 'frontend_lab' | 'dashboard';
  onResultChange?: (payload: { result: ReviewLabResult | null; executedAt: string | null }) => void;
};

export function ReviewLabPanel({
  variant = 'full',
  showUserCard = true,
  sourceType = 'frontend_lab',
  onResultChange,
}: ReviewLabPanelProps) {
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
  const [executedAt, setExecutedAt] = useState<string | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    onResultChange?.({ result, executedAt });
  }, [executedAt, onResultChange, result]);

  const authLoading = !initialized || status === 'idle' || status === 'loading';
  const authReady = Boolean(user && status === 'authenticated');
  const compact = variant === 'compact';
  const executeDisabled = authLoading || !authReady || submitting || !content.trim() || !policyText.trim();

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
          id: compact ? 'dashboard_submission' : 'lab_submission',
          content: content.trim(),
          platform: platform.trim() || defaultPlatform,
          metadata: {
            sourceType,
          },
        },
        policy: {
          rawText: policyText.trim(),
        },
      });

      const currentTime = new Date().toLocaleString('zh-CN');
      setResult(response.result);
      setExecutedAt(currentTime);
      void message.success('审稿执行完成');
    } catch (error) {
      const safeMessage = error instanceof Error ? error.message : '审稿请求失败';
      setRequestError(safeMessage);
      setResult(null);
      setExecutedAt(null);
      void message.error(safeMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const userStatusView = useMemo(() => {
    if (authLoading) {
      return <Alert type="info" showIcon message="正在加载当前登录用户信息" />;
    }

    if (authReady && user) {
      return (
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="id">{user.id}</Descriptions.Item>
          <Descriptions.Item label="email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="plan">
            <Tag color={user.plan === 'vip' ? 'gold' : 'blue'}>{user.plan}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="role">{user.role || '-'}</Descriptions.Item>
        </Descriptions>
      );
    }

    return (
      <Alert
        type="warning"
        showIcon
        message="当前未登录，无法发起审稿测试"
        description="请先通过现有登录页完成登录。未登录时执行按钮会保持禁用。"
      />
    );
  }, [authLoading, authReady, user]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {showUserCard ? <SectionCard title="当前登录用户">{userStatusView}</SectionCard> : null}

      <SectionCard
        title={compact ? '智能审稿' : '联调输入'}
        extra={
          executedAt ? (
            <Typography.Text type="secondary">最近执行：{executedAt}</Typography.Text>
          ) : null
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>待审核文本</Typography.Text>
            <Input.TextArea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              autoSize={{ minRows: compact ? 4 : 5, maxRows: compact ? 8 : 10 }}
              placeholder="输入待审核内容"
            />
          </div>

          <div>
            <Typography.Text strong>审稿策略 policy</Typography.Text>
            <Input.TextArea
              value={policyText}
              onChange={(event) => setPolicyText(event.target.value)}
              autoSize={{ minRows: compact ? 4 : 5, maxRows: compact ? 8 : 10 }}
              placeholder="输入审稿策略"
            />
          </div>

          <div>
            <Typography.Text strong>平台 platform</Typography.Text>
            <Select
              value={platform}
              onChange={setPlatform}
              style={{ width: '100%' }}
              options={platformOptions}
              showSearch
              optionFilterProp="label"
            />
          </div>

          <Space wrap>
            <Button type="primary" onClick={() => void handleRunReview()} disabled={executeDisabled} loading={submitting}>
              {submitting ? '审稿中...' : compact ? '快速审稿' : '执行审稿'}
            </Button>
            <Button onClick={handleFillExample}>填充示例</Button>
          </Space>

          {requestError ? <Alert type="error" showIcon message={requestError} /> : null}
        </Space>
      </SectionCard>

      <SectionCard title={compact ? '本次审稿结果' : '结构化审稿结果'}>
        <ReviewResultCard result={result} compact={compact} />
      </SectionCard>
    </Space>
  );
}
