import { Button, Space, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SortOrder } from 'antd/es/table/interface';

import { getPlatformAdapter } from '../../features/platforms';
import type {
  ReviewStatus,
  RiskLevel,
  SubmissionAttackType,
  SubmissionItem,
  SubmissionSortField,
} from '../../types/submission';

const reviewStatusMap: Record<ReviewStatus, { label: string; color: string }> = {
  approved: { label: '已通过', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
  manual_review: { label: '人工复核', color: 'processing' },
  pending: { label: '待处理', color: 'default' },
};

const riskLevelMap: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: '低风险', color: 'default' },
  medium: { label: '中风险', color: 'orange' },
  high: { label: '高风险', color: 'red' },
};

const attackTypeMap: Record<SubmissionAttackType, string> = {
  instruction_override: '指令覆盖',
  role_spoofing: '角色伪装',
  format_hijacking: '格式劫持',
  policy_manipulation: '策略操纵',
};

function getPlatformTag(record: SubmissionItem) {
  const adapter = getPlatformAdapter(record.platform);
  return <Tag color={adapter.color}>{adapter.displayName}</Tag>;
}

function getChannelTag(record: SubmissionItem) {
  const isPrivateMessage = record.channel === 'private_message';
  return (
    <Tag color={isPrivateMessage ? 'purple' : 'cyan'}>
      {isPrivateMessage ? '私信' : '评论区'}
    </Tag>
  );
}

export function getReviewStatusTag(status: ReviewStatus) {
  const config = reviewStatusMap[status];
  return <Tag color={config.color}>{config.label}</Tag>;
}

export function getRiskLevelTag(level: RiskLevel) {
  const config = riskLevelMap[level];
  return <Tag color={config.color}>{config.label}</Tag>;
}

export function getAttackTypeLabel(type: SubmissionAttackType) {
  return attackTypeMap[type];
}

type CreateSubmissionColumnsOptions = {
  onViewDetail: (record: SubmissionItem) => void;
  sortField?: SubmissionSortField;
  sortOrder?: SortOrder;
};

export function createSubmissionColumns({
  onViewDetail,
  sortField,
  sortOrder,
}: CreateSubmissionColumnsOptions): ColumnsType<SubmissionItem> {
  return [
    {
      title: '投稿 ID',
      dataIndex: 'submission_id',
      key: 'submission_id',
      width: 156,
      fixed: 'left',
    },
    {
      title: '平台',
      key: 'platform',
      width: 120,
      render: (_, record) => getPlatformTag(record),
    },
    {
      title: '渠道',
      key: 'channel',
      width: 100,
      render: (_, record) => getChannelTag(record),
    },
    {
      title: '内容类型',
      dataIndex: 'contentType',
      key: 'contentType',
      width: 150,
    },
    {
      title: '接入来源',
      dataIndex: 'source_plugin_name',
      key: 'source_plugin_name',
      width: 170,
    },
    {
      title: '作者',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 120,
    },
    {
      title: '内容摘要',
      dataIndex: 'content_preview',
      key: 'content_preview',
      ellipsis: true,
      render: (value: string) => (
        <Tooltip title={value}>
          <span>{value}</span>
        </Tooltip>
      ),
    },
    {
      title: '审核状态',
      dataIndex: 'review_status',
      key: 'review_status',
      width: 120,
      render: (value: ReviewStatus) => getReviewStatusTag(value),
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 110,
      render: (value: RiskLevel) => getRiskLevelTag(value),
    },
    {
      title: '质量分',
      dataIndex: 'quality_score',
      key: 'quality_score',
      width: 100,
      sorter: true,
      sortOrder: sortField === 'quality_score' ? sortOrder : null,
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      key: 'publishTime',
      width: 170,
      sorter: true,
      sortOrder: sortField === 'publishTime' ? sortOrder : null,
    },
    {
      title: '操作',
      key: 'actions',
      width: 112,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => onViewDetail(record)}>
            查看详情
          </Button>
        </Space>
      ),
    },
  ];
}
