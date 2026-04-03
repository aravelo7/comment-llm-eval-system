const { runOllamaProvider } = require('./ollamaProvider');
const { runFallbackProvider } = require('./fallbackProvider');

async function runProviderRouter(input) {
  try {
    const result = await runOllamaProvider(input);

    return {
      result,
      meta: {
        mode: 'rule_plus_llm',
        provider: 'ollama',
        fallback_used: false,
      },
    };
  } catch (error) {
    const fallback = runFallbackProvider(input);

    return {
      ...fallback,
      meta: {
        ...fallback.meta,
        fallback_reason: error instanceof Error ? error.message : 'provider_error',
      },
    };
  }
}

module.exports = {
  runProviderRouter,
};
