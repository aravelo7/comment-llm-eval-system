import type { SortOrder } from 'antd/es/table/interface';

import type {
  PlatformChannel,
  PlatformKey,
  PlatformSourceMode,
  UnifiedContentItem,
  RiskSignal,
} from '../features/platforms/types';

export type ReviewStatus = 'approved' | 'rejected' | 'manual_review' | 'pending';
export type RiskLevel = 'low' | 'medium' | 'high';

export type SubmissionAttackType =
  | 'instruction_override'
  | 'role_spoofing'
  | 'format_hijacking'
  | 'policy_manipulation';

export type SubmissionOperatorType = 'system' | 'admin' | 'reviewer';
export type SubmissionActionSource = 'drawer' | 'batch_action' | 'system';

export type SubmissionSecurityReview = {
  prompt_injection_risk: RiskLevel;
  contains_instruction_override: boolean;
  matched_attack_types: SubmissionAttackType[];
  reason: string;
  dataHandlingNote: string;
};

export type MatchedRuleDetail = {
  ruleId: string;
  ruleName: string;
  reason: string;
  matchedFields: string[];
};

export type SubmissionRawReviewJson = {
  quality_score: number;
  risk_level: RiskLevel;
  decision: 'approve' | 'reject' | 'manual_review';
  matched_rules: string[];
  matched_rule_details: MatchedRuleDetail[];
  reasons: string[];
  security_review: SubmissionSecurityReview;
  risk_signals: RiskSignal[];
  decision_strategy: string;
};

export type AuditActionType =
  | 'login'
  | 'logout'
  | 'platform_config_change'
  | 'sync_trigger'
  | 'moderation_decision'
  | 'auth_failure'
  | 'permission_denied'
  | 'data_import';

export type SubmissionAuditLog = {
  id: string;
  operator_name: string;
  operator_type: SubmissionOperatorType;
  action: string;
  actionType: AuditActionType;
  from_status?: ReviewStatus;
  to_status?: ReviewStatus;
  source: SubmissionActionSource;
  created_at: string;
  note?: string;
  dataSourcePlatform?: PlatformKey;
  channel?: PlatformChannel;
  sourceMode?: PlatformSourceMode;
  syncJobId?: string;
  batchId?: string;
  authStatus?: string;
  rateLimitStatus?: string;
  importOperator?: string;
};

export type SubmissionTimelineItem = {
  key: string;
  time: string;
  title: string;
  description: string;
  from_status?: ReviewStatus;
  to_status?: ReviewStatus;
  color?: 'blue' | 'green' | 'red' | 'gray' | string;
};

export type SubmissionItem = UnifiedContentItem & {
  submission_id: string;
  source_plugin_name: string;
  content_preview: string;
  review_status: ReviewStatus;
  risk_level: RiskLevel;
  quality_score: number;
  decision_suggestion: 'approve' | 'reject' | 'manual_review';
  matched_rules: string[];
  matched_rule_details: MatchedRuleDetail[];
  reasons: string[];
  raw_review_json: SubmissionRawReviewJson;
  security_review: SubmissionSecurityReview;
  audit_logs: SubmissionAuditLog[];
};

export type SubmissionSortField = 'publishTime' | 'quality_score';

export type SubmissionSearchParamsState = {
  keyword?: string;
  source_plugin_name?: string;
  platform?: PlatformKey;
  channel?: PlatformChannel;
  contentType?: string;
  review_status?: ReviewStatus;
  risk_level?: RiskLevel;
  startAt?: string;
  endAt?: string;
  page: number;
  pageSize: number;
  sortField?: SubmissionSortField;
  sortOrder?: SortOrder;
};
