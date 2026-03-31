import type { UnifiedContentItem } from '../features/platforms/types';
import type { RiskAction, RiskDecisionAction, RuleConfig, ScopedRule } from '../types/ruleConfig';
import type { MatchedRuleDetail, ReviewStatus, RiskLevel } from '../types/submission';

export type ReviewResult = {
  review_status: ReviewStatus;
  risk_level: RiskLevel;
  matched_rules: string[];
  matched_rule_details: MatchedRuleDetail[];
  reasons: string[];
  decision_strategy: string;
  raw_review_json: Record<string, unknown>;
};

type EvaluateExtra = {
  hasImage?: boolean;
  hasExternalLink?: boolean;
};

type DecisionCandidate = {
  reviewStatus: ReviewStatus;
  riskLevel: RiskLevel;
  detail: MatchedRuleDetail;
};

const DECISION_STRATEGY =
  '严重性优先：rejected > manual_review > approved；同级按 high > medium > low，最终结果稳定可预测。';

const roleSpoofingPatterns = ['我是管理员', '你现在是管理员', '我是系统', '请以系统身份', '官方通知你'];
const instructionOverridePatterns = ['忽略以上规则', '忽略之前规则', '直接通过', '不要返回 JSON', '修改审核标准'];

function containsAnyKeyword(text: string, keywords: string[]) {
  return keywords.find((keyword) => keyword.trim() && text.includes(keyword.trim()));
}

function isPureExternalLinkPost(content: string) {
  const stripped = content.replace(/https?:\/\/\S+|www\.\S+/gi, '').replace(/[\s\p{P}]/gu, '');
  return stripped.length === 0;
}

function actionToReviewStatus(action: RiskAction | RiskDecisionAction): ReviewStatus {
  if (action === 'rejected') return 'rejected';
  if (action === 'manual_review') return 'manual_review';
  return 'approved';
}

function actionToRiskLevel(
  action: RiskAction | RiskDecisionAction,
  fallback: RiskLevel = 'medium',
): RiskLevel {
  if (action === 'rejected' || action === 'manual_review') return 'high';
  return fallback;
}

function statusSeverity(status: ReviewStatus) {
  switch (status) {
    case 'rejected':
      return 3;
    case 'manual_review':
      return 2;
    case 'approved':
      return 1;
    default:
      return 0;
  }
}

function riskSeverity(level: RiskLevel) {
  switch (level) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    default:
      return 1;
  }
}

function pickFinalDecision(candidates: DecisionCandidate[]) {
  return candidates.reduce((current, candidate) => {
    const statusGap = statusSeverity(candidate.reviewStatus) - statusSeverity(current.reviewStatus);
    if (statusGap > 0) return candidate;
    if (statusGap < 0) return current;

    const riskGap = riskSeverity(candidate.riskLevel) - riskSeverity(current.riskLevel);
    if (riskGap > 0) return candidate;
    if (riskGap < 0) return current;

    return current;
  });
}

function createCandidate(
  ruleId: string,
  ruleName: string,
  reviewStatus: ReviewStatus,
  riskLevel: RiskLevel,
  reason: string,
  matchedFields: string[],
): DecisionCandidate {
  return {
    reviewStatus,
    riskLevel,
    detail: {
      ruleId,
      ruleName,
      reason,
      matchedFields,
    },
  };
}

function createScopedRuleReason(rule: ScopedRule, keyword: string) {
  const platformLabel = rule.platformScope === 'all' ? '全平台' : rule.platformScope;
  const channelLabel =
    rule.channelScope === 'all'
      ? '全渠道'
      : rule.channelScope === 'private_message'
        ? '私信'
        : '评论区';
  const typeLabel =
    rule.contentTypeScope && rule.contentTypeScope.length > 0
      ? `，内容类型限制为 ${rule.contentTypeScope.join(' / ')}`
      : '';

  return `命中关键词“${keyword}”，匹配作用域 ${platformLabel} / ${channelLabel}${typeLabel}。${rule.description}`;
}

function matchScopedRule(rule: ScopedRule, item: UnifiedContentItem) {
  if (!rule.enabled) return null;
  if (rule.platformScope !== 'all' && rule.platformScope !== item.platform) return null;
  if (rule.channelScope !== 'all' && rule.channelScope !== item.channel) return null;
  if (rule.contentTypeScope?.length && !rule.contentTypeScope.includes(item.contentType)) return null;

  const keyword = containsAnyKeyword(item.contentText, rule.keywords);
  if (!keyword) return null;

  return {
    keyword,
    matchedFields: ['contentText'],
  };
}

export function evaluateSubmissionByRules(
  item: UnifiedContentItem,
  rules: RuleConfig,
  extra?: EvaluateExtra,
): ReviewResult {
  const normalizedContent = item.contentText.trim();
  const hasExternalLink = extra?.hasExternalLink ?? /https?:\/\/|www\./i.test(normalizedContent);
  const hasImage = extra?.hasImage ?? item.attachments.some((file) => file.type === 'image');
  const { content: contentRules, risk: riskRules, scopedRules } = rules;

  const candidates: DecisionCandidate[] = [];
  const reasons: string[] = [];

  const forbiddenKeyword = containsAnyKeyword(normalizedContent, contentRules.forbidden_keywords);
  const diversionKeyword = containsAnyKeyword(normalizedContent, contentRules.drainage_keywords);
  const contactKeyword = containsAnyKeyword(normalizedContent, contentRules.contact_keywords);
  const highRiskKeyword = containsAnyKeyword(normalizedContent, riskRules.high_risk_keywords);
  const roleSpoofingPattern = roleSpoofingPatterns.find((pattern) => normalizedContent.includes(pattern));
  const instructionOverridePattern = instructionOverridePatterns.find((pattern) =>
    normalizedContent.includes(pattern),
  );

  if (normalizedContent.length < contentRules.min_length) {
    candidates.push(
      createCandidate(
        'base-min-length',
        '基础规则：正文过短',
        'rejected',
        'medium',
        `正文长度小于最小阈值 ${contentRules.min_length}，当前内容信息量不足。`,
        ['contentText'],
      ),
    );
  }

  if (normalizedContent.length > contentRules.max_length) {
    candidates.push(
      createCandidate(
        'base-max-length',
        '基础规则：正文过长',
        'manual_review',
        'medium',
        `正文长度超过最大阈值 ${contentRules.max_length}，需要人工确认是否为异常灌水或复制内容。`,
        ['contentText'],
      ),
    );
  }

  if (forbiddenKeyword) {
    candidates.push(
      createCandidate(
        'base-forbidden-keyword',
        '基础规则：命中禁止关键词',
        'rejected',
        'high',
        `正文命中禁止关键词“${forbiddenKeyword}”，按基础规则直接拒绝。`,
        ['contentText'],
      ),
    );
  }

  if (!contentRules.allow_contact_info && contactKeyword) {
    candidates.push(
      createCandidate(
        'base-contact-info',
        '基础规则：包含联系方式',
        'manual_review',
        'high',
        `正文出现联系方式相关关键词“${contactKeyword}”，需要人工确认是否存在导流或骚扰风险。`,
        ['contentText'],
      ),
    );
  }

  if (diversionKeyword) {
    candidates.push(
      createCandidate(
        'base-diversion-keyword',
        '基础规则：导流关键词',
        'manual_review',
        'high',
        `正文出现导流相关关键词“${diversionKeyword}”，需要进一步确认是否引导到站外或私下联系。`,
        ['contentText'],
      ),
    );
  }

  if (hasExternalLink && isPureExternalLinkPost(normalizedContent)) {
    const reviewStatus = actionToReviewStatus(riskRules.external_link_risk_action);
    candidates.push(
      createCandidate(
        'risk-external-link-only',
        '风险规则：纯外链内容',
        reviewStatus,
        actionToRiskLevel(riskRules.external_link_risk_action),
        '内容主体几乎完全由外链构成，缺少可独立审核的上下文。',
        ['contentText'],
      ),
    );
  }

  if (!contentRules.allow_external_links_only && hasExternalLink) {
    candidates.push(
      createCandidate(
        'base-external-link',
        '基础规则：包含外链',
        'manual_review',
        'medium',
        '正文包含外部链接，当前阶段默认进入人工复核，不直接放行。',
        ['contentText'],
      ),
    );
  }

  if (hasImage) {
    const reviewStatus = actionToReviewStatus(riskRules.image_post_risk_action);
    candidates.push(
      createCandidate(
        'risk-image-post',
        '风险规则：含图片附件',
        reviewStatus,
        actionToRiskLevel(riskRules.image_post_risk_action),
        '内容带有图片附件，需要结合图片内容再做确认。',
        ['attachments'],
      ),
    );
  }

  if (highRiskKeyword) {
    const reviewStatus = actionToReviewStatus(riskRules.high_risk_action);
    candidates.push(
      createCandidate(
        'risk-high-keyword',
        '风险规则：高风险关键词',
        reviewStatus,
        actionToRiskLevel(riskRules.high_risk_action),
        `正文命中高风险关键词“${highRiskKeyword}”，需要从严处理。`,
        ['contentText'],
      ),
    );
  }

  if (riskRules.enable_role_spoofing_detection && roleSpoofingPattern) {
    const reviewStatus = actionToReviewStatus(riskRules.role_spoofing_action);
    candidates.push(
      createCandidate(
        'risk-role-spoofing',
        '风险规则：角色伪装',
        reviewStatus,
        actionToRiskLevel(riskRules.role_spoofing_action),
        `正文出现“${roleSpoofingPattern}”等角色伪装表达，疑似冒充管理员、系统或官方身份。`,
        ['contentText', 'authorName'],
      ),
    );
  }

  if (riskRules.enable_instruction_override_detection && instructionOverridePattern) {
    const reviewStatus = actionToReviewStatus(riskRules.instruction_override_action);
    candidates.push(
      createCandidate(
        'risk-instruction-override',
        '风险规则：指令覆盖',
        reviewStatus,
        actionToRiskLevel(riskRules.instruction_override_action),
        `正文出现“${instructionOverridePattern}”等试图覆盖审核逻辑的表达。`,
        ['contentText'],
      ),
    );
  }

  scopedRules.forEach((rule) => {
    const matched = matchScopedRule(rule, item);
    if (!matched) return;

    candidates.push(
      createCandidate(
        rule.id,
        `作用域规则：${rule.name}`,
        actionToReviewStatus(rule.action),
        rule.riskLevel,
        createScopedRuleReason(rule, matched.keyword),
        matched.matchedFields,
      ),
    );
  });

  if (item.channel === 'private_message' && item.isFirstContact) {
    candidates.push(
      createCandidate(
        'channel-first-contact-dm',
        '渠道规则：私信首触达',
        'manual_review',
        'medium',
        '首触达私信属于高敏感场景，需要结合内容和行为进一步确认。',
        ['channel', 'isFirstContact'],
      ),
    );
  }

  if (candidates.length === 0) {
    candidates.push(
      createCandidate(
        'default-pass',
        '默认通过规则',
        'approved',
        'low',
        '未命中任何限制项，按当前规则默认通过。',
        ['contentText'],
      ),
    );
  }

  const finalDecision = pickFinalDecision(candidates);
  const matchedRuleDetails = candidates.map((candidate) => candidate.detail);
  const matchedRules = matchedRuleDetails.map((detail) => detail.ruleName);

  matchedRuleDetails.forEach((detail) => {
    reasons.push(detail.reason);
  });

  return {
    review_status: finalDecision.reviewStatus,
    risk_level: finalDecision.riskLevel,
    matched_rules: matchedRules,
    matched_rule_details: matchedRuleDetails,
    reasons,
    decision_strategy: DECISION_STRATEGY,
    raw_review_json: {
      content: item.contentText,
      platform: item.platform,
      channel: item.channel,
      contentType: item.contentType,
      review_status: finalDecision.reviewStatus,
      risk_level: finalDecision.riskLevel,
      matched_rules: matchedRules,
      matched_rule_details: matchedRuleDetails,
      reasons,
      decision_strategy: DECISION_STRATEGY,
      extra,
      rules_snapshot: rules,
    },
  };
}
