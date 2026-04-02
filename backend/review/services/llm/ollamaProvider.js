const { buildPrompt } = require('../promptBuilder');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://ollama:11434';
const FREE_REVIEW_MODEL = process.env.FREE_REVIEW_MODEL || 'qwen2.5:7b';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 45000);

async function review({ submission, policy, rule_hits, safeParseReviewJson }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  const prompt = buildPrompt({ submission, policy, rule_hits });

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: FREE_REVIEW_MODEL,
        stream: false,
        keep_alive: '10m',
        options: {
          temperature: 0.2,
        },
        messages: [
          {
            role: 'system',
            content: [
              '你是内容审核助手。',
              '必须只输出 JSON。',
              '字段必须符合约定结构。',
              '不得输出 markdown 代码块。',
            ].join('\n'),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        parsed: {
          decision: 'review',
          risk_score: 50,
          confidence: 0.2,
          labels: ['ollama_http_error'],
          reason: errorText ? `Ollama 调用失败：${errorText.slice(0, 120)}` : 'Ollama 调用失败，已转人工复核',
          evidence: [],
          needs_human_review: true,
        },
        model_name: FREE_REVIEW_MODEL,
      };
    }

    const payload = await response.json();
    const content = payload && payload.message && typeof payload.message.content === 'string'
      ? payload.message.content
      : '';

    return {
      parsed: safeParseReviewJson(content),
      model_name: FREE_REVIEW_MODEL,
    };
  } catch (error) {
    const isAbort = error && error.name === 'AbortError';
    return {
      parsed: {
        decision: 'review',
        risk_score: 50,
        confidence: 0.2,
        labels: [isAbort ? 'ollama_timeout' : 'ollama_unavailable'],
        reason: isAbort ? 'Ollama 调用超时，已自动转人工复核' : 'Ollama 不可用，已自动转人工复核',
        evidence: [],
        needs_human_review: true,
      },
      model_name: FREE_REVIEW_MODEL,
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  review,
};
