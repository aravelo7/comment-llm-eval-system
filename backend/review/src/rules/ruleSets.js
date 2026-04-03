const abuseKeywords = ['\u50bb\u903c', '\u5e9f\u7269', '\u6eda', '\u8111\u6b8b', '\u8822\u8d27', '\u50bbX', '\u50bbx'];

const promoKeywords = [
  '\u52a0\u6211\u5fae\u4fe1',
  '\u52a0\u5fae\u4fe1',
  'vx',
  'vx:',
  'v\u4fe1',
  '\u52a0v',
  '\u79c1\u804a\u6211',
  '\u79c1\u4fe1\u6211',
  '\u8054\u7cfb\u6211',
];

const conflictKeywords = [
  '\u5927\u5bb6\u4e00\u8d77\u9a82\u4ed6',
  '\u4e00\u8d77\u9a82\u4ed6',
  '\u51b2\u4e86\u4ed6',
  '\u66dd\u5149\u4ed6',
  '\u53bb\u7f51\u66b4\u4ed6',
  '\u7f51\u66b4\u4ed6',
  '\u5e26\u8282\u594f',
  '\u56f4\u653b\u4ed6',
];

const negativeFeedbackKeywords = [
  '\u592a\u70c2\u4e86',
  '\u5f88\u5dee',
  '\u592a\u5dee',
  '\u670d\u52a1\u592a\u6162',
  '\u4f53\u9a8c\u5f88\u5dee',
  '\u4e0d\u597d\u7528',
  '\u4e0d\u63a8\u8350',
  '\u5931\u671b',
  '\u5783\u573e\u4ea7\u54c1',
];

const externalLinkPatterns = [/https?:\/\/[^\s]+/i, /www\.[^\s]+\.[^\s]+/i];

const rulePriority = [
  'conflict_incitement',
  'promo_contact',
  'external_link',
  'abuse',
  'negative_feedback',
  'normal',
];

module.exports = {
  abuseKeywords,
  promoKeywords,
  conflictKeywords,
  negativeFeedbackKeywords,
  externalLinkPatterns,
  rulePriority,
};
