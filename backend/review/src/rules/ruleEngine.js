const {
  abuseKeywords,
  promoKeywords,
  conflictKeywords,
  negativeFeedbackKeywords,
  externalLinkPatterns,
  rulePriority,
} = require('./ruleSets');

const RULE_CONFIG = {
  normal: {
    code: 'NORMAL',
    severity: 'low',
    reason: '\u672a\u547d\u4e2d\u89c4\u5219',
    risk_level: 'low',
    action: 'allow',
    confidence: 0.85,
    needs_human_review: false,
  },
  negative_feedback: {
    code: 'NEGATIVE_FEEDBACK',
    severity: 'low',
    reason: '\u547d\u4e2d\u666e\u901a\u8d1f\u9762\u53cd\u9988\u89c4\u5219',
    risk_level: 'low',
    action: 'allow',
    confidence: 0.85,
    needs_human_review: false,
  },
  abuse: {
    code: 'ABUSE',
    severity: 'medium',
    reason: '\u547d\u4e2d\u8fb1\u9a82\u653b\u51fb\u89c4\u5219',
    risk_level: 'medium',
    action: 'review',
    confidence: 0.9,
    needs_human_review: true,
  },
  promo_contact: {
    code: 'PROMO_CONTACT',
    severity: 'high',
    reason: '\u547d\u4e2d\u8054\u7cfb\u65b9\u5f0f\u5bfc\u6d41\u89c4\u5219',
    risk_level: 'high',
    action: 'block',
    confidence: 0.95,
    needs_human_review: false,
  },
  external_link: {
    code: 'EXTERNAL_LINK',
    severity: 'high',
    reason: '\u547d\u4e2d\u5916\u94fe\u89c4\u5219',
    risk_level: 'high',
    action: 'block',
    confidence: 0.95,
    needs_human_review: false,
  },
  conflict_incitement: {
    code: 'CONFLICT_INCITEMENT',
    severity: 'high',
    reason: '\u547d\u4e2d\u717d\u52a8\u51b2\u7a81\u89c4\u5219',
    risk_level: 'high',
    action: 'block',
    confidence: 0.95,
    needs_human_review: false,
  },
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function collectKeywordMatches(text, keywords) {
  return unique(keywords.filter((keyword) => text.includes(keyword)));
}

function collectKeywordMatchesCaseInsensitive(text, keywords) {
  const lowerText = text.toLowerCase();
  const matches = [];

  keywords.forEach((keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    const startIndex = lowerText.indexOf(lowerKeyword);

    if (startIndex >= 0) {
      matches.push(text.slice(startIndex, startIndex + keyword.length));
    }
  });

  return unique(matches);
}

function collectPatternMatches(text, patterns) {
  const matches = [];

  patterns.forEach((pattern) => {
    const found = text.match(pattern);
    if (found && found[0]) {
      matches.push(found[0]);
    }
  });

  return unique(matches);
}

function buildRuleHit(label, matched) {
  const config = RULE_CONFIG[label];

  return {
    code: config.code,
    severity: config.severity,
    message: config.reason,
    matched,
    evidence: matched,
  };
}

function buildStableResult(label, matched) {
  const config = RULE_CONFIG[label];
  const evidence = unique(matched);

  return {
    rule_hits: label === 'normal' ? [] : [buildRuleHit(label, evidence)],
    pre_label: label,
    pre_risk: config.risk_level,
    action: config.action,
    reason: config.reason,
    evidence,
    needs_human_review: config.needs_human_review,
    confidence: config.confidence,
    label,
    risk_level: config.risk_level,
  };
}

function runRuleEngine(text) {
  const safeText = typeof text === 'string' ? text.trim() : '';

  if (!safeText) {
    return buildStableResult('normal', []);
  }

  const hitsByLabel = {
    conflict_incitement: collectKeywordMatches(safeText, conflictKeywords),
    promo_contact: collectKeywordMatchesCaseInsensitive(safeText, promoKeywords),
    external_link: collectPatternMatches(safeText, externalLinkPatterns),
    abuse: collectKeywordMatches(safeText, abuseKeywords),
    negative_feedback: collectKeywordMatches(safeText, negativeFeedbackKeywords),
  };

  const selectedLabel = rulePriority.find((label) => label === 'normal' || hitsByLabel[label].length > 0) || 'normal';
  const matched = selectedLabel === 'normal' ? [] : hitsByLabel[selectedLabel];

  return buildStableResult(selectedLabel, matched);
}

module.exports = {
  runRuleEngine,
};
