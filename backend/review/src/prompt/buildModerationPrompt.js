function buildRuleHitSummary(ruleHits) {
  if (!Array.isArray(ruleHits) || ruleHits.length === 0) {
    return '\u65e0';
  }

  return ruleHits
    .map((item) => `${item.code}:${Array.isArray(item.evidence) && item.evidence.length > 0 ? item.evidence.join('|') : '-'}`)
    .join('; ');
}

function buildModerationPrompt(input) {
  const text = typeof input?.text === 'string' ? input.text : '';
  const platform = typeof input?.platform === 'string' ? input.platform : 'unknown';
  const ruleResult = input?.ruleResult || {};

  return [
    '\u4f60\u662f\u4e2d\u6587\u5185\u5bb9\u5ba1\u6838\u52a9\u624b\u3002\u8bf7\u57fa\u4e8e\u539f\u6587\u548c\u89c4\u5219\u521d\u7b5b\u7ed3\u679c\uff0c\u8f93\u51fa\u6700\u7ec8\u5ba1\u6838 JSON\u3002',
    '\u5206\u7c7b\u96c6\u5408\u53ea\u5141\u8bb8: normal, negative_feedback, abuse, promo_contact, external_link, conflict_incitement, gray_area\u3002',
    '\u89c4\u5219\u8981\u6c42:',
    '1. \u666e\u901a\u8d1f\u9762\u53cd\u9988\u4e0d\u8981\u8bef\u5224\u4e3a abuse\u3002',
    '2. \u8054\u7cfb\u65b9\u5f0f\u5bfc\u6d41\u5224 promo_contact\u3002',
    '3. \u5916\u94fe\u5224 external_link\u3002',
    '4. \u51b2\u7a81\u717d\u52a8\u5224 conflict_incitement\u3002',
    '5. \u4e0d\u786e\u5b9a\u65f6\u53ef\u5224 gray_area\u3002',
    '\u4ec5\u8f93\u51fa JSON\uff0c\u4e0d\u8981 Markdown\uff0c\u4e0d\u8981\u89e3\u91ca\u6587\u5b57\u3002',
    'evidence \u5fc5\u987b\u6458\u81ea\u539f\u6587\u3002',
    '\u8f93\u51fa\u5b57\u6bb5: label, risk_level, action, confidence, reason, evidence, needs_human_review\u3002',
    `\u5e73\u53f0: ${platform}`,
    `\u89c4\u5219\u521d\u7b5b\u6807\u7b7e: ${ruleResult.pre_label || ruleResult.label || 'normal'}`,
    `\u89c4\u5219\u521d\u7b5b\u539f\u56e0: ${ruleResult.reason || '\u672a\u547d\u4e2d\u89c4\u5219'}`,
    `\u89c4\u5219\u547d\u4e2d: ${buildRuleHitSummary(ruleResult.rule_hits)}`,
    `\u539f\u6587: ${text}`,
  ].join('\n');
}

module.exports = {
  buildModerationPrompt,
};
