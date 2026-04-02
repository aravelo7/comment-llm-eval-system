function uniqueEvidence(list) {
  return [
    ...new Set(
      (Array.isArray(list) ? list : [])
        .filter((item) => item !== null && item !== undefined)
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function createKeywordRule(config) {
  return {
    code: config.code,
    severity: config.severity,
    message: config.message,
    run(content) {
      const text = typeof content === 'string' ? content : '';
      const hits = (Array.isArray(config.keywords) ? config.keywords : []).filter((keyword) => text.includes(keyword));
      if (hits.length === 0) {
        return null;
      }

      return {
        code: config.code,
        severity: config.severity,
        message: config.message,
        evidence: uniqueEvidence(hits),
      };
    },
  };
}

const builtins = [
  createKeywordRule({
    code: 'ABUSE_WORD',
    severity: 'medium',
    message: '\u547d\u4e2d\u4fae\u8fb1\u6027\u8bcd\u6c47',
    keywords: [
      '\u5783\u573e',
      '\u5e9f\u7269',
      '\u50bb\u903c',
      '\u6eda',
      '\u6b7b\u4eba',
      '\u6b7b\u4eba\u4e00\u6837',
      '\u8111\u6b8b',
      '\u6709\u75c5',
      '\u5f31\u667a',
      '\u667a\u969c',
    ],
  }),
  createKeywordRule({
    code: 'PROMO_CONTACT',
    severity: 'high',
    message: '\u547d\u4e2d\u7591\u4f3c\u5f15\u6d41\u6216\u8054\u7cfb\u65b9\u5f0f',
    keywords: [
      'vx',
      'vx:',
      '\u5fae\u4fe1',
      '\u52a0v',
      'qq',
      '\u8054\u7cfb\u6211',
      '\u79c1\u804a\u6211',
      'tg',
      '\u7535\u62a5\u7fa4',
    ],
  }),
  {
    code: 'EXTERNAL_LINK',
    severity: 'medium',
    message: '\u547d\u4e2d\u7591\u4f3c\u5916\u94fe\u4fe1\u606f',
    run(content) {
      const text = typeof content === 'string' ? content : '';
      const patterns = [
        /https?:\/\/[^\s]+/gi,
        /www\.[^\s]+/gi,
        /t\.cn\/[A-Za-z0-9]+/gi,
        /[A-Za-z0-9.-]+\.(com|cn)\b/gi,
      ];
      const matches = patterns.flatMap((pattern) => text.match(pattern) || []);
      if (matches.length === 0) {
        return null;
      }

      return {
        code: 'EXTERNAL_LINK',
        severity: 'medium',
        message: '\u547d\u4e2d\u7591\u4f3c\u5916\u94fe\u4fe1\u606f',
        evidence: uniqueEvidence(matches),
      };
    },
  },
  createKeywordRule({
    code: 'CONFLICT_INCITEMENT',
    severity: 'high',
    message: '\u547d\u4e2d\u7591\u4f3c\u5f15\u6218\u6216\u715d\u52a8\u6027\u8868\u8fbe',
    keywords: [
      '\u5927\u5bb6\u4e00\u8d77',
      '\u51b2\u4ed6',
      '\u7f51\u66b4',
      '\u7206\u7834',
      '\u62b5\u5236',
      '\u53bb\u9a82',
      '\u5e26\u8282\u594f',
    ],
  }),
  {
    code: 'REPETITIVE_PUNCT',
    severity: 'low',
    message: '\u547d\u4e2d\u5f3a\u60c5\u7eea\u5316\u6807\u70b9\u6a21\u5f0f',
    run(content) {
      const text = typeof content === 'string' ? content : '';
      const matches = text.match(/[!\uFF01?\uFF1F]{3,}/g) || [];
      if (matches.length === 0) {
        return null;
      }

      return {
        code: 'REPETITIVE_PUNCT',
        severity: 'low',
        message: '\u547d\u4e2d\u5f3a\u60c5\u7eea\u5316\u6807\u70b9\u6a21\u5f0f',
        evidence: uniqueEvidence(matches),
      };
    },
  },
];

module.exports = builtins;
