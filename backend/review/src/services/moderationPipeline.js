const { REVIEW_MODE } = require('../config');
const { runRuleEngine } = require('../rules/ruleEngine');
const { runProviderRouter } = require('../llm/providerRouter');

async function runModerationPipeline(input) {
  const ruleResult = runRuleEngine(input?.text);

  if (REVIEW_MODE === 'rule_only' || !input?.text) {
    return {
      result: {
        label: ruleResult.label,
        risk_level: ruleResult.risk_level,
        confidence: ruleResult.confidence,
        action: ruleResult.action,
        reason: ruleResult.reason,
        rule_hits: ruleResult.rule_hits,
        evidence: ruleResult.evidence,
        needs_human_review: ruleResult.needs_human_review,
      },
      meta: {
        mode: 'rule_only',
        provider: 'rule_engine',
        fallback_used: false,
      },
    };
  }

  const providerResult = await runProviderRouter({
    text: input.text,
    platform: input.platform,
    plan: input.plan,
    ruleResult,
  });

  return {
    result: {
      ...providerResult.result,
      rule_hits: ruleResult.rule_hits,
      evidence:
        Array.isArray(providerResult.result.evidence) && providerResult.result.evidence.length > 0
          ? providerResult.result.evidence
          : ruleResult.evidence,
    },
    meta: providerResult.meta,
  };
}

module.exports = {
  runModerationPipeline,
};
