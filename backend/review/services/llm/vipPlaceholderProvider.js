const VIP_MODEL_NAME = process.env.VIP_MODEL_NAME || 'reserved-premium-model';

async function review() {
  return {
    parsed: {
      decision: 'review',
      risk_score: 50,
      confidence: 0.3,
      labels: ['vip_model_not_enabled'],
      reason: 'VIP 模型路由已预留但当前未启用，已转人工复核',
      evidence: [],
      needs_human_review: true,
    },
    model_name: VIP_MODEL_NAME,
  };
}

module.exports = {
  review,
};
