import dayjs from 'dayjs';

import { getPlatformAdapter, platformAdapters } from '../features/platforms';
import type { PlatformChannel, UnifiedContentItem } from '../features/platforms';
import { evaluateSubmissionByRules } from '../lib/reviewEngine';
import { useRuleStore } from '../store/ruleStore';
import type { RuleConfig } from '../types/ruleConfig';
import type {
  ReviewStatus,
  RiskLevel,
  SubmissionActionSource,
  SubmissionAttackType,
  SubmissionAuditLog,
  SubmissionItem,
  SubmissionOperatorType,
} from '../types/submission';

function getPreview(text: string) {
  return text.length > 40 ? `${text.slice(0, 40)}...` : text;
}

function getMatchedAttackTypes(item: UnifiedContentItem): SubmissionAttackType[] {
  const list: SubmissionAttackType[] = [];
  if (item.riskSignals.includes('instruction_override')) list.push('instruction_override');
  if (item.riskSignals.includes('role_spoofing')) list.push('role_spoofing');
  if (item.riskSignals.includes('template_spam') || item.riskSignals.includes('thread_bumping')) {
    list.push('format_hijacking');
  }
  if (item.riskSignals.includes('ad_drainage') || item.riskSignals.includes('emotional_provocation')) {
    list.push('policy_manipulation');
  }
  return [...new Set(list)];
}

function getSecurityRiskLevel(attackTypes: SubmissionAttackType[], channel: PlatformChannel): RiskLevel {
  if (attackTypes.includes('instruction_override') || attackTypes.includes('role_spoofing')) {
    return 'high';
  }
  if (channel === 'private_message' || attackTypes.length > 0) {
    return 'medium';
  }
  return 'low';
}

function getSecurityReason(item: UnifiedContentItem, attackTypes: SubmissionAttackType[]) {
  if (item.channel === 'private_message') {
    return '私信内容按高敏感数据处理，仅用于授权审核演示，需遵循最小化采集与脱敏展示。';
  }
  if (attackTypes.includes('instruction_override')) {
    return '检测到试图覆盖审核逻辑或改变输出约束的表达。';
  }
  if (attackTypes.includes('role_spoofing')) {
    return '检测到冒充管理员、系统或官方身份的表达。';
  }
  if (attackTypes.includes('format_hijacking')) {
    return '检测到模板化刷评、顶帖或格式劫持迹象。';
  }
  if (attackTypes.includes('policy_manipulation')) {
    return '检测到导流、情绪挑动或规避平台规则的话术。';
  }
  return '未发现明显的注入或劫持特征。';
}

function createAuditLog(
  id: string,
  createdAt: string,
  action: string,
  operatorName: string,
  operatorType: SubmissionOperatorType,
  source: SubmissionActionSource,
  actionType: SubmissionAuditLog['actionType'],
  platform: SubmissionItem['platform'],
  channel: SubmissionItem['channel'],
  fromStatus?: ReviewStatus,
  toStatus?: ReviewStatus,
  note?: string,
): SubmissionAuditLog {
  return {
    id,
    operator_name: operatorName,
    operator_type: operatorType,
    action,
    actionType,
    from_status: fromStatus,
    to_status: toStatus,
    source,
    created_at: createdAt,
    note,
    dataSourcePlatform: platform,
    channel,
    sourceMode: 'mock',
    syncJobId: `sync-${platform}-20260327`,
    batchId: `batch-${platform}-${channel}`,
    authStatus: 'backend_only',
    rateLimitStatus: 'healthy',
  };
}

function buildAllItems() {
  return platformAdapters.flatMap((adapter) => adapter.createMockItems());
}

export function buildSubmissionDataFromItems(
  records: UnifiedContentItem[],
  rules: RuleConfig = useRuleStore.getState().getRules(),
): SubmissionItem[] {
  return records.map((record, index) => {
    const manualImportReview =
      record.platformMetadata.manualImportReview &&
      typeof record.platformMetadata.manualImportReview === 'object'
        ? (record.platformMetadata.manualImportReview as {
            decision?: 'approve' | 'rejected' | 'manual_review';
            riskLevel?: RiskLevel;
            score?: number;
            comment?: string;
            needsHumanReview?: boolean;
          })
        : null;
    const baseReview = evaluateSubmissionByRules(record, rules, {
      hasImage: record.attachments.some((item) => item.type === 'image'),
      hasExternalLink: /https?:\/\/|www\./i.test(record.contentText),
    });

    const attackTypes = getMatchedAttackTypes(record);
    const securityRiskLevel = getSecurityRiskLevel(attackTypes, record.channel);
    const securityReview = {
      prompt_injection_risk: securityRiskLevel,
      contains_instruction_override: record.riskSignals.includes('instruction_override'),
      matched_attack_types: attackTypes,
      reason: getSecurityReason(record, attackTypes),
      dataHandlingNote:
        record.channel === 'private_message'
          ? '私信内容仅用于授权审核演示。展示时应最小化、脱敏，并避免直接点击外链。'
          : '评论区内容默认只展示纯文本，不渲染平台返回的 HTML。',
    } as const;

    let mergedStatus =
      securityRiskLevel === 'high' && baseReview.review_status === 'approved'
        ? 'manual_review'
        : baseReview.review_status;
    let mergedRiskLevel =
      securityRiskLevel === 'high'
        ? 'high'
        : baseReview.risk_level === 'low' && securityRiskLevel === 'medium'
          ? 'medium'
          : baseReview.risk_level;
    let qualityScore = Math.max(
      18,
      94 - baseReview.matched_rules.length * 7 - (record.channel === 'private_message' ? 8 : 0),
    );

    if (manualImportReview) {
      mergedStatus =
        manualImportReview.decision === 'approve'
          ? 'approved'
          : manualImportReview.decision === 'rejected'
            ? 'rejected'
            : 'manual_review';
      mergedRiskLevel = manualImportReview.riskLevel || mergedRiskLevel;
      qualityScore = manualImportReview.score || qualityScore;
    }

    const baseTime = dayjs(record.publishTime);
    const adapter = getPlatformAdapter(record.platform);
    const importSourceMode =
      typeof record.platformMetadata.sourceMode === 'string' ? record.platformMetadata.sourceMode : 'mock';
    const ingestionLabel =
      typeof record.platformMetadata.ingestionLabel === 'string'
        ? record.platformMetadata.ingestionLabel
        : `${adapter.displayName}${record.channel === 'private_message' ? '私信' : '评论区'}接入`;

    return {
      ...record,
      submission_id: `SUB-${record.platform.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
      source_plugin_name: ingestionLabel,
      content_preview: getPreview(record.contentText),
      review_status: mergedStatus,
      moderationStatus: mergedStatus,
      moderationReason: manualImportReview?.comment || baseReview.reasons[0],
      risk_level: mergedRiskLevel,
      quality_score: qualityScore,
      decision_suggestion:
        mergedStatus === 'rejected'
          ? 'reject'
          : mergedStatus === 'manual_review'
            ? 'manual_review'
            : 'approve',
      matched_rules: baseReview.matched_rules,
      matched_rule_details: baseReview.matched_rule_details,
      reasons: manualImportReview?.comment ? [manualImportReview.comment, ...baseReview.reasons] : baseReview.reasons,
      reviewTrace: [
        {
          step: 'normalize',
          detail: `通过 ${adapter.displayName} adapter 归一化为统一内容模型`,
          createdAt: baseTime.format('YYYY-MM-DD HH:mm'),
        },
        {
          step: 'rule-evaluate',
          detail: `按 ${record.platform}/${record.channel} 作用域执行统一规则评估`,
          createdAt: baseTime.add(1, 'minute').format('YYYY-MM-DD HH:mm'),
        },
      ],
      raw_review_json: {
        quality_score: qualityScore,
        risk_level: mergedRiskLevel,
        decision:
          mergedStatus === 'rejected'
            ? 'reject'
            : mergedStatus === 'manual_review'
              ? 'manual_review'
              : 'approve',
        matched_rules: baseReview.matched_rules,
        matched_rule_details: baseReview.matched_rule_details,
        reasons: baseReview.reasons,
        security_review: securityReview,
        risk_signals: record.riskSignals,
        decision_strategy: baseReview.decision_strategy,
      },
      security_review: securityReview,
      audit_logs: [
        createAuditLog(
          `log-${index + 1}-1`,
          baseTime.format('YYYY-MM-DD HH:mm'),
          '平台数据接入',
          'platform-ingest',
          'system',
          'system',
          'data_import',
          record.platform,
          record.channel,
          undefined,
          'pending',
          `通过 ${importSourceMode} 接入生成统一内容模型。`,
        ),
        createAuditLog(
          `log-${index + 1}-2`,
          baseTime.add(1, 'minute').format('YYYY-MM-DD HH:mm'),
          '规则评估完成',
          'rule-engine',
          'system',
          'system',
          'moderation_decision',
          record.platform,
          record.channel,
          'pending',
          mergedStatus,
          `命中规则：${baseReview.matched_rules.join('、')}`,
        ),
        createAuditLog(
          `log-${index + 1}-3`,
          baseTime.add(2, 'minute').format('YYYY-MM-DD HH:mm'),
          '安全检查完成',
          'security-detector',
          'system',
          'system',
          'moderation_decision',
          record.platform,
          record.channel,
          mergedStatus,
          mergedStatus,
          securityReview.reason,
        ),
      ],
    };
  });
}

export function buildSubmissionMockData(
  rules: RuleConfig = useRuleStore.getState().getRules(),
): SubmissionItem[] {
  return buildSubmissionDataFromItems(buildAllItems(), rules);
}

export const submissionMockData = buildSubmissionMockData();
