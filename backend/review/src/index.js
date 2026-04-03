const express = require('express');
const cors = require('cors');
const { REVIEW_PORT } = require('./config');
const { runModerationPipeline } = require('./services/moderationPipeline');

const app = express();
const port = REVIEW_PORT;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function createTraceId() {
  return `rvw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeInput(body) {
  const text =
    typeof body?.text === 'string'
      ? body.text
      : typeof body?.submission?.content === 'string'
        ? body.submission.content
        : '';
  const platform =
    typeof body?.platform === 'string'
      ? body.platform
      : typeof body?.submission?.platform === 'string'
        ? body.submission.platform
        : 'unknown';
  const plan =
    typeof body?.plan === 'string'
      ? body.plan
      : typeof body?.user?.plan === 'string'
        ? body.user.plan
        : 'free';

  return {
    text: String(text || '').trim(),
    platform: String(platform || 'unknown').trim() || 'unknown',
    plan: String(plan || 'free').trim() || 'free',
  };
}

app.get('/health', (_request, response) => {
  response.type('text/plain').send('ok');
});

app.post('/review/run', async (request, response) => {
  const startedAt = Date.now();
  const traceId = createTraceId();
  const input = normalizeInput(request.body || {});

  try {
    const pipelineResult = await runModerationPipeline(input);
    const latencyMs = Math.max(Date.now() - startedAt, 1);

    response.json({
      ok: true,
      trace_id: traceId,
      input,
      result: pipelineResult.result,
      meta: {
        ...pipelineResult.meta,
        latency_ms: latencyMs,
      },
    });
  } catch (error) {
    const latencyMs = Math.max(Date.now() - startedAt, 1);

    response.json({
      ok: true,
      trace_id: traceId,
      input,
      result: {
        label: 'gray_area',
        risk_level: 'medium',
        confidence: 0.6,
        action: 'review',
        reason: 'unexpected pipeline error',
        rule_hits: [],
        evidence: [],
        needs_human_review: true,
      },
      meta: {
        mode: 'rule_fallback',
        provider: 'fallback',
        fallback_used: true,
        fallback_reason: error instanceof Error ? error.message : 'unexpected_error',
        latency_ms: latencyMs,
      },
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[review-rule-service] listening on http://0.0.0.0:${port}`);
});
