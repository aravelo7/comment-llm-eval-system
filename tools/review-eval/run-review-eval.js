const fs = require('fs/promises');
const path = require('path');

const DEFAULT_BASE_URL = process.env.REVIEW_EVAL_BASE_URL || 'http://127.0.0.1:8790';
const DEFAULT_TIMEOUT_MS = Number(process.env.REVIEW_EVAL_TIMEOUT_MS || 20000);
const ROOT_DIR = path.resolve(__dirname);
const DATASET_PATH = path.resolve(ROOT_DIR, 'dataset', 'review_samples.json');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'outputs');
const RESULTS_OUTPUT_PATH = path.resolve(OUTPUT_DIR, 'review_eval_results.json');

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    datasetPath: DATASET_PATH,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice('--base-url='.length).trim() || DEFAULT_BASE_URL;
    } else if (arg.startsWith('--dataset=')) {
      options.datasetPath = path.resolve(process.cwd(), arg.slice('--dataset='.length).trim());
    } else if (arg.startsWith('--timeout-ms=')) {
      const timeoutMs = Number(arg.slice('--timeout-ms='.length).trim());
      if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
        options.timeoutMs = timeoutMs;
      }
    }
  });

  return options;
}

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildPayload(sample) {
  return {
    text: sample.text,
    platform: sample.platform || 'weibo',
    plan: 'free',
  };
}

function getCoreIssueType(expectedLabel, actualLabel) {
  if (expectedLabel === 'negative_feedback' && actualLabel === 'abuse') {
    return 'false_positive_negative_feedback_to_abuse';
  }

  if (expectedLabel === 'promo_contact' && actualLabel !== 'promo_contact') {
    return 'high_risk_miss';
  }

  if (expectedLabel === 'external_link' && actualLabel !== 'external_link') {
    return 'high_risk_miss';
  }

  if (expectedLabel === 'conflict_incitement' && actualLabel !== 'conflict_incitement') {
    return 'high_risk_miss';
  }

  return null;
}

async function requestReview(baseUrl, payload, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(new URL('/review/run', baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let body = null;

    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  await ensureOutputDir();

  const dataset = await readJson(options.datasetPath);
  if (!Array.isArray(dataset)) {
    throw new Error(`Dataset must be a JSON array: ${options.datasetPath}`);
  }

  const records = [];

  for (const sample of dataset) {
    console.log(`Running sample ${sample.id} ...`);

    const payload = buildPayload(sample);
    let responseInfo = null;
    let error = null;

    try {
      responseInfo = await requestReview(options.baseUrl, payload, options.timeoutMs);
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : String(requestError);
    }

    const responseBody = responseInfo ? responseInfo.body : null;
    const result = responseBody && typeof responseBody === 'object' ? responseBody.result || null : null;
    const meta = responseBody && typeof responseBody === 'object' ? responseBody.meta || null : null;
    const actualLabel = result && typeof result.label === 'string' ? result.label : null;
    const matched = actualLabel === sample.expected_label;

    records.push({
      id: sample.id,
      text: sample.text,
      expected_label: sample.expected_label,
      actual_label: actualLabel,
      matched,
      result,
      meta,
      error: error || (responseInfo && !responseInfo.ok ? 'http_request_failed' : null),
      issue_type: getCoreIssueType(sample.expected_label, actualLabel),
    });
  }

  await writeJson(RESULTS_OUTPUT_PATH, records);

  const successCount = records.filter((item) => item.error === null).length;
  const failedCount = records.length - successCount;
  const matchedCount = records.filter((item) => item.matched).length;

  console.log(`Review eval finished: ${RESULTS_OUTPUT_PATH}`);
  console.log(`- total: ${records.length}`);
  console.log(`- success: ${successCount}`);
  console.log(`- failed: ${failedCount}`);
  console.log(`- matched: ${matchedCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
