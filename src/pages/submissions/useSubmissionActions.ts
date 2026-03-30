import { App } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';

import type { PlatformSourceMode } from '../../features/platforms/types';
import type {
  ReviewStatus,
  SubmissionActionSource,
  SubmissionAuditLog,
  SubmissionItem,
  SubmissionOperatorType,
} from '../../types/submission';

type UseSubmissionActionsOptions = {
  initialData: SubmissionItem[];
};

type UpdateStatusOptions = {
  operatorName: string;
  operatorType: SubmissionOperatorType;
  source: SubmissionActionSource;
  note?: string;
};

const platformSourceModes: readonly PlatformSourceMode[] = [
  'mock',
  'api',
  'official_api',
  'manual_import',
  'web_session_import',
];

function isPlatformSourceMode(value: unknown): value is PlatformSourceMode {
  return typeof value === 'string' && platformSourceModes.includes(value as PlatformSourceMode);
}

const reviewStatusLabelMap: Record<ReviewStatus, string> = {
  approved: '已通过',
  rejected: '已拒绝',
  manual_review: '人工复核',
  pending: '待处理',
};

function getActionMessage(status: ReviewStatus, count = 1) {
  if (count === 1) {
    return `投稿状态已更新为 ${reviewStatusLabelMap[status]}`;
  }
  return `已批量更新 ${count} 条投稿为 ${reviewStatusLabelMap[status]}`;
}

function getActionName(status: ReviewStatus) {
  if (status === 'approved') return '通过';
  if (status === 'rejected') return '拒绝';
  if (status === 'manual_review') return '转人工复核';
  return '状态更新';
}

function createActionLog(
  submissionId: string,
  fromStatus: ReviewStatus,
  toStatus: ReviewStatus,
  item: SubmissionItem,
  options: UpdateStatusOptions,
  indexHint: number,
): SubmissionAuditLog {
  const sourceMode = isPlatformSourceMode(item.platformMetadata.sourceMode)
    ? item.platformMetadata.sourceMode
    : 'mock';

  return {
    id: `${submissionId}-audit-${Date.now()}-${indexHint}`,
    operator_name: options.operatorName,
    operator_type: options.operatorType,
    action: getActionName(toStatus),
    actionType: 'moderation_decision',
    from_status: fromStatus,
    to_status: toStatus,
    source: options.source,
    created_at: dayjs().format('YYYY-MM-DD HH:mm'),
    note: options.note,
    dataSourcePlatform: item.platform,
    channel: item.channel,
    sourceMode,
    syncJobId: `sync-${item.platform}-20260327`,
    batchId: `batch-${item.platform}-${item.channel}`,
    authStatus: 'backend_only',
    rateLimitStatus: 'healthy',
  };
}

export function useSubmissionActions({
  initialData,
}: UseSubmissionActionsOptions) {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>(initialData);
  const { message } = App.useApp();

  useEffect(() => {
    setSubmissions(initialData);
  }, [initialData]);

  function updateSubmissionStatus(
    id: string,
    status: ReviewStatus,
    options: UpdateStatusOptions,
  ) {
    let changed = false;

    setSubmissions((current) =>
      current.map((item, index) => {
        if (item.id !== id || item.review_status === status) {
          return item;
        }
        changed = true;
        return {
          ...item,
          review_status: status,
          moderationStatus: status,
          audit_logs: [
            ...item.audit_logs,
            createActionLog(item.id, item.review_status, status, item, options, index),
          ],
        };
      }),
    );

    if (changed) {
      void message.success(getActionMessage(status));
    }
  }

  function updateMultipleSubmissionStatus(
    ids: string[],
    status: ReviewStatus,
    options: UpdateStatusOptions,
  ) {
    if (ids.length === 0) return 0;

    let affectedCount = 0;

    setSubmissions((current) =>
      current.map((item, index) => {
        if (!ids.includes(item.id) || item.review_status === status) {
          return item;
        }
        affectedCount += 1;
        return {
          ...item,
          review_status: status,
          moderationStatus: status,
          audit_logs: [
            ...item.audit_logs,
            createActionLog(item.id, item.review_status, status, item, options, index),
          ],
        };
      }),
    );

    if (affectedCount > 0) {
      void message.success(getActionMessage(status, affectedCount));
    }

    return affectedCount;
  }

  const stats = useMemo(() => {
    return {
      total: submissions.length,
      pending: submissions.filter((item) => item.review_status === 'pending').length,
      manualReview: submissions.filter((item) => item.review_status === 'manual_review').length,
      approved: submissions.filter((item) => item.review_status === 'approved').length,
      rejected: submissions.filter((item) => item.review_status === 'rejected').length,
    };
  }, [submissions]);

  return {
    submissions,
    stats,
    updateSubmissionStatus,
    updateMultipleSubmissionStatus,
  };
}
