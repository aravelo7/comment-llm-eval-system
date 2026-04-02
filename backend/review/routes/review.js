const express = require('express');
const { runReview } = require('../services/reviewEngine');

const router = express.Router();

function validateRequestBody(body) {
  const submission = body && body.submission ? body.submission : {};
  const policy = body && body.policy ? body.policy : {};

  if (!submission.content || !String(submission.content).trim()) {
    return 'submission.content 不能为空';
  }

  if (!policy.rawText || !String(policy.rawText).trim()) {
    return 'policy.rawText 不能为空';
  }

  return null;
}

function buildReviewRequest(body) {
  return {
    user: body && body.user ? body.user : { id: 'anonymous', email: '', plan: 'free' },
    submission: {
      id: body && body.submission && body.submission.id ? body.submission.id : 'policy_test_submission',
      content: body.submission.content,
      platform: body.submission.platform || 'unknown',
      metadata: body.submission.metadata || {},
    },
    policy: {
      rawText: body.policy.rawText,
    },
  };
}

router.post('/run', async (request, response) => {
  const error = validateRequestBody(request.body);
  if (error) {
    response.status(400).json({ ok: false, error });
    return;
  }

  try {
    const result = await runReview(buildReviewRequest(request.body));
    response.json({ ok: true, result });
  } catch (serviceError) {
    response.status(500).json({
      ok: false,
      error: serviceError instanceof Error ? serviceError.message : 'review_failed',
    });
  }
});

router.post('/policy/test', async (request, response) => {
  const error = validateRequestBody(request.body);
  if (error) {
    response.status(400).json({ ok: false, error });
    return;
  }

  try {
    const result = await runReview(buildReviewRequest(request.body));
    response.json({ ok: true, result });
  } catch (serviceError) {
    response.status(500).json({
      ok: false,
      error: serviceError instanceof Error ? serviceError.message : 'policy_test_failed',
    });
  }
});

module.exports = router;
