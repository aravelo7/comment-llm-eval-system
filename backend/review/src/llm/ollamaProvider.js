const axios = require('axios');
const { OLLAMA_BASE_URL, OLLAMA_MODEL } = require('../config');
const { buildModerationPrompt } = require('../prompt/buildModerationPrompt');

const ALLOWED_LABELS = new Set([
  'normal',
  'negative_feedback',
  'abuse',
  'promo_contact',
  'external_link',
  'conflict_incitement',
  'gray_area',
]);

const DEFAULTS_BY_LABEL = {
  normal: { risk_level: 'low', action: 'allow', confidence: 0.85, needs_human_review: false },
  negative_feedback: { risk_level: 'low', action: 'allow', confidence: 0.85, needs_human_review: false },
  abuse: { risk_level: 'medium', action: 'review', confidence: 0.9, needs_human_review: true },
  promo_contact: { risk_level: 'high', action: 'block', confidence: 0.95, needs_human_review: false },
  external_link: { risk_level: 'high', action: 'block', confidence: 0.95, needs_human_review: false },
  conflict_incitement: { risk_level: 'high', action: 'block', confidence: 0.95, needs_human_review: false },
  gray_area: { risk_level: 'medium', action: 'review', confidence: 0.75, needs_human_review: true },
};

function stripCodeFence(text) {
  const trimmed = String(text || '').trim();

  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  return trimmed;
}

function normalizeEvidence(value, fallbackEvidence) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
  }

  if (Array.isArray(fallbackEvidence)) {
    return fallbackEvidence;
  }

  return [];
}

function normalizeLlmResult(parsed, ruleResult) {
  const label = typeof parsed?.label === 'string' ? parsed.label.trim() : '';

  if (!ALLOWED_LABELS.has(label)) {
    throw new Error('invalid_llm_label');
  }

  const defaults = DEFAULTS_BY_LABEL[label];
  const evidence = normalizeEvidence(parsed?.evidence, ruleResult?.evidence);

  return {
    label,
    risk_level:
      parsed?.risk_level === 'low' || parsed?.risk_level === 'medium' || parsed?.risk_level === 'high'
        ? parsed.risk_level
        : defaults.risk_level,
    confidence:
      typeof parsed?.confidence === 'number' && Number.isFinite(parsed.confidence)
        ? parsed.confidence
        : defaults.confidence,
    action: parsed?.action === 'allow' || parsed?.action === 'review' || parsed?.action === 'block' ? parsed.action : defaults.action,
    reason:
      typeof parsed?.reason === 'string' && parsed.reason.trim()
        ? parsed.reason.trim()
        : ruleResult?.reason || 'llm moderation result',
    evidence,
    needs_human_review:
      typeof parsed?.needs_human_review === 'boolean' ? parsed.needs_human_review : defaults.needs_human_review,
  };
}

async function runOllamaProvider(input) {
  const prompt = buildModerationPrompt(input);
  const response = await axios.post(
    `${OLLAMA_BASE_URL}/api/chat`,
    {
      model: OLLAMA_MODEL,
      stream: false,
      format: 'json',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      options: {
        temperature: 0,
      },
    },
    {
      timeout: 20000,
    },
  );

  const content = stripCodeFence(response?.data?.message?.content);

  if (!content) {
    throw new Error('empty_ollama_response');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('invalid_ollama_json');
  }

  return normalizeLlmResult(parsed, input?.ruleResult);
}

module.exports = {
  runOllamaProvider,
};
