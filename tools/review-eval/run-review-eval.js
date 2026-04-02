const fs = require('fs/promises');
const path = require('path');
const http = require('http');
const https = require('https');

const DEFAULT_BASE_URL = process.env.REVIEW_EVAL_BASE_URL || 'http://127.0.0.1:8790';
const REVIEW_RUN_PATH = '/review/run';
const DEFAULT_PLAN = 'free';
const DEFAULT_TIMEOUT_MS = Number(process.env.REVIEW_EVAL_TIMEOUT_MS || 30000);

const ROOT_DIR = path.resolve(__dirname);
const DATASET_PATH = path.resolve(ROOT_DIR, 'dataset', 'review_samples.json');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'outputs');
const LATEST_OUTPUT_PATH = path.resolve(OUTPUT_DIR, 'review_eval_latest.json');

function parseArgs(argv) {
  const options = {
    plan: DEFAULT_PLAN,
    baseUrl: DEFAULT_BASE_URL,
    datasetPath: DATASET_PATH,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--plan=')) {
      options.plan = arg.slice('--plan='.length).trim().toLowerCase() || DEFAULT_PLAN;
    } else if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice('--base-url='.length).trim() || DEFAULT_BASE_URL;
    } else if (arg.startsWith('--dataset=')) {
      options.datasetPath = path.resolve(process.cwd(), arg.slice('--dataset='.length).trim());
    } else if (arg.startsWith('--timeout-ms=')) {
      const value = Number(arg.slice('--timeout-ms='.length).trim());
      if (Number.isFinite(value) && value > 0) {
        options.timeoutMs = value;
      }
    }
  });

  if (!['free', 'vip'].includes(options.plan)) {
    options.plan = DEFAULT_PLAN;
  }

  return options;
}

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJsonFile(filePath, data) {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, `${content}\n`, 'utf8');
}

function createTimestamp() {
  return new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-').replace(/Z$/, '');
}

function buildRequestPayload(sample, plan) {
  return {
    user: {
      id: `eval_user_${plan}`,
      email: 'eval@example.com',
      plan,
    },
    submission: {
      id: sample.id,
      content: sample.content,
      platform: sample.platform,
      metadata: {
        sourceType: 'review_eval',
      },
    },
    policy: {
      rawText: sample.policy_raw_text,
    },
  };
}

function getRuleCodes(result) {
  if (!result || !Array.isArray(result.rule_hits)) {
    return [];
  }

  return result.rule_hits
    .map((item) => (item && item.code ? String(item.code) : ''))
    .filter(Boolean);
}

function isVipPlaceholderResult(result, plan) {
  if (plan !== 'vip' || !result || typeof result !== 'object') {
    return false;
  }

  const labels = Array.isArray(result.labels) ? result.labels.map(String) : [];
  return labels.includes('vip_model_not_enabled') || result.model_tier === 'vip';
}

function buildCheck(name, passed, detail, extra = {}) {
  return {
    name,
    passed: Boolean(passed),
    detail,
    ...extra,
  };
}

function assertRecord({ sample, responseBody, result, httpInfo, error, plan }) {
  const checks = [];
  const expected = sample && sample.expected ? sample.expected : {};
  const actualDecision = result && typeof result.decision === 'string' ? result.decision : null;
  const actualNeedsHumanReview =
    result && typeof result.needs_human_review === 'boolean' ? result.needs_human_review : null;
  const ruleCodes = getRuleCodes(result);
  const expectedDecisionIn = Array.isArray(expected.decision_in) ? expected.decision_in.map(String) : [];
  const expectedNeedsHumanReviewIn = Array.isArray(expected.needs_human_review_in)
    ? expected.needs_human_review_in.filter((value) => typeof value === 'boolean')
    : [];
  const expectedRuleCodes = Array.isArray(expected.must_include_rule_codes)
    ? expected.must_include_rule_codes.map(String).filter(Boolean)
    : [];
  const missingRuleCodes = expectedRuleCodes.filter((code) => !ruleCodes.includes(code));
  const vipPlaceholder = isVipPlaceholderResult(result, plan);
  const effectiveDecisionIn =
    vipPlaceholder && !expectedDecisionIn.includes('review')
      ? [...expectedDecisionIn, 'review']
      : expectedDecisionIn;

  if (error) {
    checks.push(
      buildCheck('http_request', false, `request failed: ${error}`, {
        failure_reason: 'http_request_failed',
      }),
    );
    return {
      passed: false,
      checks,
      failure_reasons: ['http_request_failed'],
    };
  }

  checks.push(
    buildCheck(
      'response_ok',
      Boolean(responseBody && responseBody.ok === true),
      `actual=${responseBody ? String(responseBody.ok) : 'undefined'} expected=true`,
      {
        failure_reason: 'response_not_ok',
      },
    ),
  );

  const hasResult = Boolean(result && typeof result === 'object');
  checks.push(
    buildCheck('result_exists', hasResult, `actual=${hasResult ? 'present' : 'missing'} expected=present`, {
      failure_reason: 'malformed_result',
    }),
  );

  const hasRuleHitsArray = Boolean(result && Array.isArray(result.rule_hits));
  checks.push(
    buildCheck(
      'rule_hits_array',
      hasRuleHitsArray,
      `actual=${result && result.rule_hits ? typeof result.rule_hits : 'missing'} expected=array`,
      {
        failure_reason: 'malformed_result',
      },
    ),
  );

  checks.push(
    buildCheck(
      'decision_in',
      effectiveDecisionIn.length === 0 ? actualDecision !== null : effectiveDecisionIn.includes(actualDecision),
      `actual=${actualDecision} expected in [${effectiveDecisionIn.join(',')}]`,
      {
        failure_reason: 'decision_out_of_expected_range',
      },
    ),
  );

  checks.push(
    buildCheck(
      'must_include_rule_codes',
      missingRuleCodes.length === 0,
      missingRuleCodes.length === 0
        ? `actual includes all expected codes [${expectedRuleCodes.join(',')}]`
        : `missing=${missingRuleCodes.join(',')} actual=[${ruleCodes.join(',')}]`,
      {
        failure_reason: 'missing_rule_codes',
        missing_rule_codes: missingRuleCodes,
      },
    ),
  );

  checks.push(
    buildCheck(
      'needs_human_review_in',
      expectedNeedsHumanReviewIn.length === 0
        ? actualNeedsHumanReview !== null
        : expectedNeedsHumanReviewIn.includes(actualNeedsHumanReview),
      `actual=${actualNeedsHumanReview} expected in [${expectedNeedsHumanReviewIn.join(',')}]`,
      {
        failure_reason: 'needs_human_review_out_of_range',
      },
    ),
  );

  const failureReasons = [...new Set(checks.filter((check) => !check.passed).map((check) => check.failure_reason))];

  return {
    passed: failureReasons.length === 0,
    checks,
    failure_reasons: failureReasons,
  };
}

async function requestJson(url, payload, timeoutMs) {
  if (typeof fetch === 'function') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : null;
      return {
        ok: response.ok,
        status: response.status,
        body,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === 'https:' ? https : http;
    const requestBody = JSON.stringify(payload);
    const request = transport.request(
      {
        method: 'POST',
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf8');
            resolve({
              ok: response.statusCode >= 200 && response.statusCode < 300,
              status: response.statusCode || 0,
              body: text ? JSON.parse(text) : null,
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`request timeout after ${timeoutMs}ms`));
    });
    request.on('error', reject);
    request.write(requestBody);
    request.end();
  });
}

function createRunSummary(records) {
  return records.reduce(
    (summary, record) => {
      summary.total += 1;
      if (record.error) {
        summary.request_failed += 1;
      } else {
        summary.request_succeeded += 1;
      }

      if (record.assertion && record.assertion.passed) {
        summary.assertion_passed += 1;
      } else {
        summary.assertion_failed += 1;
      }

      return summary;
    },
    {
      total: 0,
      request_succeeded: 0,
      request_failed: 0,
      assertion_passed: 0,
      assertion_failed: 0,
    },
  );
}

function printRunSummary(summary, outputPath) {
  console.log(`Review eval completed: ${outputPath}`);
  console.log(`- Total samples: ${summary.total}`);
  console.log(`- Success: ${summary.request_succeeded}`);
  console.log(`- Failed: ${summary.request_failed}`);
  console.log(`- Assertions passed: ${summary.assertion_passed}`);
  console.log(`- Assertions failed: ${summary.assertion_failed}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const requestUrl = new URL(REVIEW_RUN_PATH, options.baseUrl).toString();

  await ensureOutputDir();

  let samples;
  try {
    samples = await readJsonFile(options.datasetPath);
  } catch (error) {
    console.error(`Failed to read dataset: ${options.datasetPath}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  if (!Array.isArray(samples)) {
    console.error(`Dataset must be a JSON array: ${options.datasetPath}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Running review eval against ${requestUrl}`);
  console.log(`- Plan: ${options.plan}`);
  console.log(`- Dataset: ${options.datasetPath}`);
  console.log(`- Samples: ${samples.length}`);

  const records = [];
  for (const sample of samples) {
    const requestPayload = buildRequestPayload(sample, options.plan);
    let httpInfo = {
      ok: false,
      status: null,
    };
    let responseBody = null;
    let errorMessage = null;

    try {
      const response = await requestJson(requestUrl, requestPayload, options.timeoutMs);
      httpInfo = {
        ok: response.ok,
        status: response.status,
      };
      responseBody = response.body;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    const result = responseBody && typeof responseBody === 'object' ? responseBody.result || null : null;
    const assertion = assertRecord({
      sample,
      responseBody,
      result,
      httpInfo,
      error: errorMessage,
      plan: options.plan,
    });

    records.push({
      sample,
      request_payload: requestPayload,
      http: httpInfo,
      response_body: responseBody,
      result,
      assertion,
      error: errorMessage,
    });
  }

  const timestamp = createTimestamp();
  const versionedOutputPath = path.resolve(OUTPUT_DIR, `review_eval_${options.plan}_${timestamp}.json`);
  const summary = createRunSummary(records);
  const payload = {
    meta: {
      generated_at: new Date().toISOString(),
      base_url: options.baseUrl,
      request_url: requestUrl,
      plan: options.plan,
      dataset_path: options.datasetPath,
      total_samples: samples.length,
    },
    summary,
    records,
  };

  try {
    await writeJsonFile(versionedOutputPath, payload);
    await writeJsonFile(LATEST_OUTPUT_PATH, payload);
  } catch (error) {
    console.error('Failed to write output files.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  printRunSummary(summary, versionedOutputPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
