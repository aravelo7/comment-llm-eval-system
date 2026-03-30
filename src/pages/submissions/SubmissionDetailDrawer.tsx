import {
  Alert,
  Button,
  Collapse,
  Descriptions,
  Divider,
  Drawer,
  Flex,
  List,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { getPlatformAdapter } from '../../features/platforms';
import type { ReviewStatus, SubmissionAuditLog, SubmissionItem } from '../../types/submission';
import { getAttackTypeLabel, getReviewStatusTag, getRiskLevelTag } from './columns';
import { useSubmissionTimeline } from './useSubmissionTimeline';

type SubmissionDetailDrawerProps = {
  open: boolean;
  submission: SubmissionItem | null;
  hasPrevious: boolean;
  hasNext: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onReviewAction: (id: string, status: ReviewStatus) => void;
};

const decisionMap: Record<
  SubmissionItem['decision_suggestion'],
  { label: string; color: string }
> = {
  approve: { label: '建议通过', color: 'success' },
  reject: { label: '建议拒绝', color: 'error' },
  manual_review: { label: '建议人工复核', color: 'processing' },
};

const auditLogColumns: ColumnsType<SubmissionAuditLog> = [
  { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 140 },
  { title: '动作类型', dataIndex: 'actionType', key: 'actionType', width: 160 },
  { title: '操作人', dataIndex: 'operator_name', key: 'operator_name', width: 120 },
  { title: '来源模式', dataIndex: 'sourceMode', key: 'sourceMode', width: 110 },
  { title: '平台', dataIndex: 'dataSourcePlatform', key: 'dataSourcePlatform', width: 90 },
  { title: '渠道', dataIndex: 'channel', key: 'channel', width: 120 },
  { title: '说明', dataIndex: 'note', key: 'note' },
];

function maskName(value?: string) {
  if (!value) return '-';
  if (value.length <= 2) return `${value[0]}*`;
  return `${value[0]}${'*'.repeat(Math.max(1, value.length - 2))}${value[value.length - 1]}`;
}

function maskSourceUrl(url?: string) {
  if (!url) return '-';
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '链接已脱敏';
  }
}

export function SubmissionDetailDrawer({
  open,
  submission,
  hasPrevious,
  hasNext,
  onClose,
  onPrevious,
  onNext,
  onReviewAction,
}: SubmissionDetailDrawerProps) {
  const { timelineItems } = useSubmissionTimeline(submission);
  const metadataFields = submission ? getPlatformAdapter(submission.platform).getMetadataDisplay(submission) : [];

  return (
    <Drawer
      title="投稿详情"
      placement="right"
      width={760}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onPrevious} disabled={!hasPrevious}>
            上一条
          </Button>
          <Button onClick={onNext} disabled={!hasNext}>
            下一条
          </Button>
          <Button type="text" onClick={onClose}>
            关闭
          </Button>
        </Space>
      }
    >
      {!submission ? null : (
        <Flex vertical gap={16}>
          <Descriptions title="基础信息" bordered size="small" column={1}>
            <Descriptions.Item label="投稿 ID">{submission.submission_id}</Descriptions.Item>
            <Descriptions.Item label="平台">
              <Tag color={getPlatformAdapter(submission.platform).color}>
                {getPlatformAdapter(submission.platform).displayName}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="渠道">
              <Tag color={submission.channel === 'private_message' ? 'purple' : 'cyan'}>
                {submission.channel === 'private_message' ? '私信' : '评论区'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="内容类型">{submission.contentType}</Descriptions.Item>
            <Descriptions.Item label="作者">{submission.authorName}</Descriptions.Item>
            <Descriptions.Item label="接入来源">{submission.source_plugin_name}</Descriptions.Item>
            <Descriptions.Item label="发布时间">{submission.publishTime}</Descriptions.Item>
            <Descriptions.Item label="当前状态">
              {getReviewStatusTag(submission.review_status)}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Typography.Title level={5}>正文</Typography.Title>
            <Typography.Paragraph className="submission-detail__content">
              {submission.contentText}
            </Typography.Paragraph>
            {submission.contentHtml ? (
              <Alert
                type="warning"
                showIcon
                message="检测到平台原始 HTML"
                description="当前工作台不会渲染 contentHtml，仅展示纯文本内容，避免 XSS 风险。"
              />
            ) : null}
          </div>

          <Descriptions title="统一审核结果" bordered size="small" column={1}>
            <Descriptions.Item label="风险等级">
              {getRiskLevelTag(submission.risk_level)}
            </Descriptions.Item>
            <Descriptions.Item label="建议动作">
              <Tag color={decisionMap[submission.decision_suggestion].color}>
                {decisionMap[submission.decision_suggestion].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="质量分">{submission.quality_score}</Descriptions.Item>
            <Descriptions.Item label="规则决策策略">
              {submission.raw_review_json.decision_strategy}
            </Descriptions.Item>
            <Descriptions.Item label="风险信号">
              <Space wrap>
                {submission.riskSignals.length > 0 ? (
                  submission.riskSignals.map((signal) => <Tag key={signal}>{signal}</Tag>)
                ) : (
                  <Tag>无</Tag>
                )}
              </Space>
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Typography.Title level={5}>命中规则</Typography.Title>
            <List
              size="small"
              dataSource={submission.matched_rule_details}
              locale={{ emptyText: '当前样本没有命中额外规则。' }}
              renderItem={(rule) => (
                <List.Item>
                  <Flex vertical gap={4} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color="geekblue">{rule.ruleName}</Tag>
                      {rule.matchedFields.map((field) => (
                        <Tag key={`${rule.ruleId}-${field}`}>{field}</Tag>
                      ))}
                    </Space>
                    <Typography.Text>{rule.reason}</Typography.Text>
                  </Flex>
                </List.Item>
              )}
            />
          </div>

          <div>
            <Typography.Title level={5}>审核原因</Typography.Title>
            <List
              size="small"
              dataSource={submission.reasons}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </div>

          {submission.channel === 'private_message' ? (
            <Descriptions title="私信上下文" bordered size="small" column={1}>
              <Descriptions.Item label="会话 ID">{submission.conversationId || '-'}</Descriptions.Item>
              <Descriptions.Item label="消息 ID">{submission.messageId || '-'}</Descriptions.Item>
              <Descriptions.Item label="方向">
                {submission.direction === 'inbound' ? '接收' : '发送'}
              </Descriptions.Item>
              <Descriptions.Item label="接收方">{maskName(submission.receiverName)}</Descriptions.Item>
              <Descriptions.Item label="对端账号">{maskName(submission.targetAuthorName)}</Descriptions.Item>
              <Descriptions.Item label="首触达">{submission.isFirstContact ? '是' : '否'}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Descriptions title="评论区上下文" bordered size="small" column={1}>
              <Descriptions.Item label="主题 ID">{submission.threadId || submission.postId || '-'}</Descriptions.Item>
              <Descriptions.Item label="评论 ID">{submission.commentId || '-'}</Descriptions.Item>
              <Descriptions.Item label="父级 ID">{submission.parentId || '-'}</Descriptions.Item>
              <Descriptions.Item label="来源链接">{maskSourceUrl(submission.sourceUrl)}</Descriptions.Item>
            </Descriptions>
          )}

          <Descriptions title="平台差异字段" bordered size="small" column={1}>
            {metadataFields.length > 0 ? (
              metadataFields.map((field) => (
                <Descriptions.Item key={field.label} label={field.label}>
                  {field.value}
                </Descriptions.Item>
              ))
            ) : (
              <Descriptions.Item label="说明">当前样本没有额外的白名单平台字段。</Descriptions.Item>
            )}
          </Descriptions>

          <Descriptions title="安全检查" bordered size="small" column={1}>
            <Descriptions.Item label="注入风险等级">
              {getRiskLevelTag(submission.security_review.prompt_injection_risk)}
            </Descriptions.Item>
            <Descriptions.Item label="命中攻击类型">
              {submission.security_review.matched_attack_types.length > 0 ? (
                <Space size={[8, 8]} wrap>
                  {submission.security_review.matched_attack_types.map((type) => (
                    <Tag key={type} color="volcano">
                      {getAttackTypeLabel(type)}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Tag>未命中</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="处理说明">{submission.security_review.reason}</Descriptions.Item>
            <Descriptions.Item label="数据处理提示">
              {submission.security_review.dataHandlingNote}
            </Descriptions.Item>
          </Descriptions>

          <Alert
            type={submission.channel === 'private_message' ? 'warning' : 'info'}
            showIcon
            message={submission.channel === 'private_message' ? '私信内容属于高敏感数据' : '评论区内容按纯文本展示'}
            description={
              submission.channel === 'private_message'
                ? '私信接入仅适用于合法授权、最小化采集和脱敏展示的演示场景；链接和联系方式不应直接点击。'
                : '平台返回的 HTML 或富文本默认不可信，当前工作台不直接渲染。'
            }
          />

          <div>
            <Typography.Title level={5}>审核时间线</Typography.Title>
            <Timeline
              items={timelineItems.map((item) => ({
                color: item.color,
                children: (
                  <div>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <div className="submission-detail__timeline-time">{item.time}</div>
                    <div>{item.description}</div>
                    {item.from_status || item.to_status ? (
                      <div className="submission-detail__timeline-change">
                        {`${item.from_status ?? '-'} -> ${item.to_status ?? '-'}`}
                      </div>
                    ) : null}
                  </div>
                ),
              }))}
            />
          </div>

          <div>
            <Typography.Title level={5}>审计日志</Typography.Title>
            <Table<SubmissionAuditLog>
              rowKey="id"
              size="small"
              columns={auditLogColumns}
              dataSource={[...submission.audit_logs].reverse()}
              pagination={false}
              scroll={{ x: 1100 }}
            />
          </div>

          <Collapse
            items={[
              {
                key: 'raw-review-json',
                label: '原始审核 JSON',
                children: (
                  <pre className="submission-detail__json">
                    {JSON.stringify(submission.raw_review_json, null, 2)}
                  </pre>
                ),
              },
            ]}
          />

          <Divider className="submission-detail__divider" />

          <div>
            <Typography.Title level={5}>操作区</Typography.Title>
            <Space wrap>
              <Button
                type="primary"
                disabled={submission.review_status === 'approved'}
                onClick={() => onReviewAction(submission.id, 'approved')}
              >
                通过
              </Button>
              <Button
                danger
                disabled={submission.review_status === 'rejected'}
                onClick={() => onReviewAction(submission.id, 'rejected')}
              >
                拒绝
              </Button>
              <Button
                disabled={submission.review_status === 'manual_review'}
                onClick={() => onReviewAction(submission.id, 'manual_review')}
              >
                转人工
              </Button>
            </Space>
          </div>
        </Flex>
      )}
    </Drawer>
  );
}
