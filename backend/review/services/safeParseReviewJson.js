const DEFAULT_RESULT = {
  decision: 'review',
  risk_score: 50,
  confidence: 0.2,
  labels: ['parse_failed'],
  reason: '模型输出无法解析，已自动转人工复核',
  evidence: [],
  needs_human_review: true,
};

function stripCodeFence(text) {
  const trimmed = String(text || '').trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))]
    : [];
}

function normalizeParsedResult(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ...DEFAULT_RESULT };
  }

  const decision = ['approve', 'reject', 'review'].includes(parsed.decision) ? parsed.decision : 'review';

  return {
    decision,
    risk_score:
      typeof parsed.risk_score === 'number'
        ? Math.max(0, Math.min(100, Math.round(parsed.risk_score)))
        : DEFAULT_RESULT.risk_score,
    confidence:
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : DEFAULT_RESULT.confidence,
    labels: normalizeStringArray(parsed.labels),
    reason: typeof parsed.reason === 'string' ? parsed.reason : DEFAULT_RESULT.reason,
    evidence: normalizeStringArray(parsed.evidence),
    needs_human_review:
      typeof parsed.needs_human_review === 'boolean'
        ? parsed.needs_human_review
        : decision === 'review'
          ? true
          : DEFAULT_RESULT.needs_human_review,
  };
}

function safeParseReviewJson(rawText) {
  const text = stripCodeFence(rawText);

  try {
    return normalizeParsedResult(JSON.parse(text));
  } catch {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return normalizeParsedResult(JSON.parse(objectMatch[0]));
      } catch {
        return { ...DEFAULT_RESULT };
      }
    }

    return { ...DEFAULT_RESULT };
  }
}

module.exports = safeParseReviewJson;
