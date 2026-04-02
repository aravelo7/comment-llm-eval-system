const builtins = require('./builtins');

function createEmptyResult() {
  return {
    rule_hits: [],
    summary: {
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
  };
}

function normalizeHit(hit) {
  if (!hit || typeof hit !== 'object') {
    return null;
  }

  const severity = ['low', 'medium', 'high'].includes(hit.severity) ? hit.severity : 'low';
  const evidence = [...new Set((Array.isArray(hit.evidence) ? hit.evidence : []).filter(Boolean).map(String))];

  return {
    code: String(hit.code || ''),
    severity,
    message: String(hit.message || ''),
    evidence,
  };
}

function mergeHits(hits) {
  const merged = new Map();

  hits.forEach((hit) => {
    const normalized = normalizeHit(hit);
    if (!normalized || !normalized.code) {
      return;
    }

    const existing = merged.get(normalized.code);
    if (!existing) {
      merged.set(normalized.code, normalized);
      return;
    }

    merged.set(normalized.code, {
      code: existing.code,
      severity: existing.severity,
      message: existing.message,
      evidence: [...new Set([...existing.evidence, ...normalized.evidence])],
    });
  });

  return Array.from(merged.values());
}

function buildSummary(ruleHits) {
  return ruleHits.reduce(
    (summary, hit) => {
      summary.total += 1;
      summary[hit.severity] += 1;
      return summary;
    },
    {
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
  );
}

function runPrecheck(content) {
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text) {
    return createEmptyResult();
  }

  const hits = [];
  builtins.forEach((rule) => {
    try {
      const result = rule.run(text);
      if (result) {
        hits.push(result);
      }
    } catch {
      // 单条规则异常时降级跳过
    }
  });

  const ruleHits = mergeHits(hits);
  return {
    rule_hits: ruleHits,
    summary: buildSummary(ruleHits),
  };
}

module.exports = runPrecheck;
