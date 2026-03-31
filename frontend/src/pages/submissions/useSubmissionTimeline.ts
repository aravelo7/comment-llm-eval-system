import dayjs from 'dayjs';
import { useMemo } from 'react';

import type { SubmissionItem, SubmissionTimelineItem } from '../../types/submission';

function createSystemTimeline(submission: SubmissionItem): SubmissionTimelineItem[] {
  const baseTime = dayjs(submission.publishTime);

  return [
    {
      key: 'received',
      time: baseTime.format('YYYY-MM-DD HH:mm'),
      title: '平台数据接入',
      description: `${submission.source_plugin_name} 已完成标准化，平台 ${submission.platform}，渠道 ${submission.channel}。`,
      to_status: 'pending',
      color: 'blue',
    },
    {
      key: 'rule-screening',
      time: baseTime.add(1, 'minute').format('YYYY-MM-DD HH:mm'),
      title: '统一规则评估',
      description: `命中 ${submission.matched_rules[0] ?? '默认通过规则'}。`,
      from_status: 'pending',
      to_status: submission.review_status,
      color: 'blue',
    },
    {
      key: 'security',
      time: baseTime.add(2, 'minute').format('YYYY-MM-DD HH:mm'),
      title: '安全检查完成',
      description: submission.security_review.reason,
      from_status: submission.review_status,
      to_status: submission.review_status,
      color: submission.security_review.prompt_injection_risk === 'high' ? 'red' : 'green',
    },
  ];
}

export function useSubmissionTimeline(submission: SubmissionItem | null) {
  const timelineItems = useMemo<SubmissionTimelineItem[]>(() => {
    if (!submission) {
      return [];
    }

    const systemEvents = createSystemTimeline(submission);
    const actionEvents = submission.audit_logs
      .filter((log) => log.actionType === 'moderation_decision')
      .map((log) => ({
        key: log.id,
        time: log.created_at,
        title: log.action,
        description: `${log.operator_name} 通过 ${log.source} 执行了操作。${log.note ? ` ${log.note}` : ''}`,
        from_status: log.from_status,
        to_status: log.to_status,
        color: log.to_status === 'rejected' ? 'red' : log.to_status === 'approved' ? 'green' : 'blue',
      }));

    return [...systemEvents, ...actionEvents].sort(
      (left, right) => dayjs(left.time).valueOf() - dayjs(right.time).valueOf(),
    );
  }, [submission]);

  return { timelineItems };
}
