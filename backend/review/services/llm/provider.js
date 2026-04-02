const ollamaProvider = require('./ollamaProvider');
const vipPlaceholderProvider = require('./vipPlaceholderProvider');

function getProvider(providerName) {
  if (providerName === 'vip') {
    return vipPlaceholderProvider;
  }

  return ollamaProvider;
}

module.exports = {
  getProvider,
};
