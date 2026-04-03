module.exports = {
  REVIEW_PORT: Number(process.env.REVIEW_PORT || 8790),
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://ollama:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
  REVIEW_MODE: process.env.REVIEW_MODE || 'rule_plus_llm',
};
