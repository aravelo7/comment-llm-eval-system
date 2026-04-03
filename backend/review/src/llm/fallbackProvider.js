function buildDefaultFallbackResult() {
  return {
    label: 'gray_area',
    risk_level: 'medium',
    confidence: 0.6,
    action: 'review',
    reason: 'LLM unavailable, fallback to conservative default',
    evidence: [],
    needs_human_review: true,
    rule_hits: [],
  };
}

function runFallbackProvider(input) {
  const ruleResult = input?.ruleResult;

  if (ruleResult) {
    return {
      result: {
        label: ruleResult.label,
        risk_level: ruleResult.risk_level,
        confidence: ruleResult.confidence,
        action: ruleResult.action,
        reason: ruleResult.reason,
        evidence: Array.isArray(ruleResult.evidence) ? ruleResult.evidence : [],
        needs_human_review: Boolean(ruleResult.needs_human_review),
        rule_hits: Array.isArray(ruleResult.rule_hits) ? ruleResult.rule_hits : [],
      },
      meta: {
        mode: 'rule_fallback',
        provider: 'fallback',
        fallback_used: true,
      },
    };
  }

  return {
    result: buildDefaultFallbackResult(),
    meta: {
      mode: 'rule_fallback',
      provider: 'fallback',
      fallback_used: true,
    },
  };
}

module.exports = {
  runFallbackProvider,
};
