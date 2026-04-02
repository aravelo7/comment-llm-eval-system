const express = require('express');
const dotenv = require('dotenv');
const reviewRouter = require('./routes/review');

dotenv.config();

const app = express();
const port = Number(process.env.REVIEW_PORT || 8790);

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'review',
  });
});

app.use('/review', reviewRouter);

app.use((error, _request, response, _next) => {
  response.status(500).json({
    ok: false,
    error: error instanceof Error ? error.message : 'unexpected_error',
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[review-service] listening on http://0.0.0.0:${port}`);
  console.log(`[review-service] free model: ${process.env.FREE_REVIEW_MODEL || 'qwen2.5:7b'}`);
  console.log(`[review-service] vip model placeholder: ${process.env.VIP_MODEL_NAME || 'reserved-premium-model'}`);
});
