import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Typography } from 'antd';

import type { ReviewStatus } from '../../types/submission';

type SubmissionBatchActionsProps = {
  selectedCount: number;
  onBatchAction: (status: ReviewStatus) => void;
};

const actionLabelMap: Record<Exclude<ReviewStatus, 'pending'>, string> = {
  approved: '批量通过',
  rejected: '批量拒绝',
  manual_review: '批量转人工',
};

export function SubmissionBatchActions({
  selectedCount,
  onBatchAction,
}: SubmissionBatchActionsProps) {
  function confirmBatchAction(status: Exclude<ReviewStatus, 'pending'>) {
    Modal.confirm({
      title: actionLabelMap[status],
      icon: <ExclamationCircleOutlined />,
      content: `本次将影响 ${selectedCount} 条投稿，是否继续？`,
      okText: '继续',
      cancelText: '取消',
      onOk: () => onBatchAction(status),
    });
  }

  return (
    <div className="submission-batch-actions">
      <Space wrap>
        <Typography.Text type="secondary">
          已选 {selectedCount} 条投稿
        </Typography.Text>
        <Button
          type="primary"
          disabled={selectedCount === 0}
          onClick={() => confirmBatchAction('approved')}
        >
          批量通过
        </Button>
        <Button
          danger
          disabled={selectedCount === 0}
          onClick={() => confirmBatchAction('rejected')}
        >
          批量拒绝
        </Button>
        <Button
          disabled={selectedCount === 0}
          onClick={() => confirmBatchAction('manual_review')}
        >
          批量转人工
        </Button>
      </Space>
    </div>
  );
}
