function getModelRoute(user) {
  const plan = user && typeof user.plan === 'string' ? user.plan.toLowerCase() : 'free';
  if (plan === 'vip') {
    return {
      provider: 'vip',
      model_tier: 'vip',
    };
  }

  return {
    provider: 'ollama',
    model_tier: 'free',
  };
}

module.exports = {
  getModelRoute,
};
