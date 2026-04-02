const safeParseReviewJson = require('./safeParseReviewJson');
const { getProvider } = require('./llm/provider');
const { getModelRoute } = require('../utils/modelRoute');
const { runPrecheck } = require('./rules');

function normalizeDecision(decision) {
  return ['approve', 'reject', 'review'].includes(decision) ? decision : 'review';
}

function normalizeRuleHits(ruleHits) {
  return (Array.isArray(ruleHits) ? ruleHits : [])
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      code: String(item.code || ''),
      severity: ['low', 'medium', 'high'].includes(item.severity) ? item.severity : 'low',
      message: String(item.message || ''),
      evidence: Array.isArray(item.evidence) ? [...new Set(item.evidence.map(String).filter(Boolean))] : [],
    }))
    .filter((item) => item.code && item.message);
}

function normalizeResult(result, extras) {
  const ruleHits = normalizeRuleHits(extras.rule_hits);
  const hasExternalLinkHit = ruleHits.some((item) => item.code === 'EXTERNAL_LINK');
  let decision = normalizeDecision(result.decision);
  let riskScore = typeof result.risk_score === 'number' ? Math.max(0, Math.min(100, Math.round(result.risk_score))) : 50;
  let confidence = typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.2;
  const labels = Array.isArray(result.labels) ? result.labels.map(String) : [];
  const evidence = Array.isArray(result.evidence) ? result.evidence.map(String) : [];
  let needsHumanReview =
    typeof result.needs_human_review === 'boolean'
      ? result.needs_human_review
      : decision === 'review';

  if (hasExternalLinkHit && decision === 'approve') {
    decision = 'review';
    riskScore = Math.max(riskScore, 40);
    confidence = Math.min(confidence, 0.6);
    needsHumanReview = true;
  }

  return {
    submission_id: extras.submission_id,
    decision,
    risk_score: riskScore,
    confidence,
    labels,
    reason: typeof result.reason === 'string' ? result.reason : '',
    evidence,
    needs_human_review: needsHumanReview,
    model_tier: extras.model_tier,
    model_name: extras.model_name,
    rule_hits: ruleHits,
  };
}

async function runReview({ user, submission, policy }) {
  const route = getModelRoute(user || {});
  const provider = getProvider(route.provider);

  let precheck = {
    rule_hits: [],
    summary: { total: 0, high: 0, medium: 0, low: 0 },
  };

  try {
    precheck = runPrecheck(submission && submission.content);
  } catch {
    precheck = {
      rule_hits: [],
      summary: { total: 0, high: 0, medium: 0, low: 0 },
    };
  }

  const reviewed = await provider.review({
    user,
    submission,
    policy,
    rule_hits: precheck.rule_hits,
    rule_summary: precheck.summary,
    safeParseReviewJson,
  });

  return normalizeResult(reviewed.parsed || {}, {
    submission_id: submission && submission.id ? String(submission.id) : '',
    model_tier: route.model_tier,
    model_name: reviewed.model_name || '',
    rule_hits: precheck.rule_hits,
  });
}

module.exports = {
  runReview,
};
