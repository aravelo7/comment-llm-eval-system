const path = require('path');
const http = require('http');
const https = require('https');
const { spawnSync } = require('child_process');

const DEFAULT_PLAN = 'free';
const DEFAULT_BASE_URL = 'http://127.0.0.1:8790';
const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.FREE_REVIEW_MODEL || 'qwen2.5:7b';
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_INTERVAL_MS = 2000;
const ROOT_DIR = path.resolve(__dirname);
const RUN_SCRIPT_PATH = path.resolve(ROOT_DIR, 'run-review-eval.js');
const SUMMARY_SCRIPT_PATH = path.resolve(ROOT_DIR, 'summarize-review-eval.js');
const LATEST_OUTPUT_PATH = path.resolve(ROOT_DIR, 'outputs', 'review_eval_latest.json');

function parseArgs(argv) {
  const options = {
    plan: DEFAULT_PLAN,
    baseUrl: DEFAULT_BASE_URL,
    ollamaUrl: DEFAULT_OLLAMA_URL,
    model: DEFAULT_MODEL,
    skipCompose: false,
    skipModelCheck: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    intervalMs: DEFAULT_INTERVAL_MS,
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--plan=')) {
      options.plan = arg.slice('--plan='.length).trim().toLowerCase() || DEFAULT_PLAN;
    } else if (arg === '--skip-compose') {
      options.skipCompose = true;
    } else if (arg === '--skip-model-check') {
      options.skipModelCheck = true;
    } else if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice('--base-url='.length).trim() || DEFAULT_BASE_URL;
    } else if (arg.startsWith('--ollama-url=')) {
      options.ollamaUrl = arg.slice('--ollama-url='.length).trim() || DEFAULT_OLLAMA_URL;
    } else if (arg.startsWith('--model=')) {
      options.model = arg.slice('--model='.length).trim() || DEFAULT_MODEL;
    } else if (arg.startsWith('--timeout-ms=')) {
      const value = Number(arg.slice('--timeout-ms='.length).trim());
      if (Number.isFinite(value) && value > 0) {
        options.timeoutMs = value;
      }
    } else if (arg.startsWith('--interval-ms=')) {
      const value = Number(arg.slice('--interval-ms='.length).trim());
      if (Number.isFinite(value) && value > 0) {
        options.intervalMs = value;
      }
    }
  });

  if (!['free', 'vip'].includes(options.plan)) {
    options.plan = DEFAULT_PLAN;
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCommand(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: path.resolve(ROOT_DIR, '..', '..'),
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    throw new Error(`${label} failed: ${result.error.message}`);
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function detectComposeCommand() {
  const dockerCompose = spawnSync('docker', ['compose', 'version'], {
    cwd: path.resolve(ROOT_DIR, '..', '..'),
    stdio: 'ignore',
    shell: false,
  });
  if (!dockerCompose.error && dockerCompose.status === 0) {
    return { command: 'docker', argsPrefix: ['compose'], label: 'docker compose' };
  }

  const legacyCompose = spawnSync('docker-compose', ['version'], {
    cwd: path.resolve(ROOT_DIR, '..', '..'),
    stdio: 'ignore',
    shell: false,
  });
  if (!legacyCompose.error && legacyCompose.status === 0) {
    return { command: 'docker-compose', argsPrefix: [], label: 'docker-compose' };
  }

  return null;
}

async function requestJson(url, timeoutMs) {
  if (typeof fetch === 'function') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      const text = await response.text();
      let body = null;
      if (text) {
        body = JSON.parse(text);
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

  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === 'https:' ? https : http;
    const request = transport.request(
      {
        method: 'GET',
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        headers: {
          Accept: 'application/json',
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
    request.end();
  });
}

async function waitForService({ label, url, timeoutMs, intervalMs, validate }) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await requestJson(url, intervalMs);
      if (validate(response)) {
        return response;
      }

      lastError = `${label} returned status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await sleep(intervalMs);
  }

  throw new Error(`${label} did not become ready within ${Math.round(timeoutMs / 1000)}s. Last error: ${lastError || 'unknown error'}`);
}

async function checkModelAvailability(ollamaUrl, model, timeoutMs) {
  const tagsUrl = new URL('/api/tags', ollamaUrl).toString();
  const response = await requestJson(tagsUrl, timeoutMs);
  const models = response && response.body && Array.isArray(response.body.models) ? response.body.models : [];
  const names = models
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return '';
      }

      return String(item.name || item.model || '');
    })
    .filter(Boolean);

  return {
    found: names.includes(model),
    models: names,
  };
}

function printDivider(title) {
  console.log('');
  console.log(title);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const compose = detectComposeCommand();

  printDivider('Review Dev Eval');
  console.log(`Plan: ${options.plan}`);
  console.log(`Review base URL: ${options.baseUrl}`);
  console.log(`Ollama URL: ${options.ollamaUrl}`);
  console.log(`Model target: ${options.model}`);

  if (!options.skipCompose) {
    if (!compose) {
      console.error('Docker Compose is not available. Install Docker Desktop or ensure docker compose is on PATH.');
      process.exitCode = 1;
      return;
    }

    console.log(`Starting containers with ${compose.label} ...`);
    try {
      runCommand(compose.command, [...compose.argsPrefix, 'up', '-d', 'review', 'ollama'], 'docker compose up');
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
      return;
    }
  } else {
    console.log('Skipping docker compose startup as requested.');
  }

  printDivider('Health Checks');
  try {
    await waitForService({
      label: 'review service',
      url: new URL('/health', options.baseUrl).toString(),
      timeoutMs: options.timeoutMs,
      intervalMs: options.intervalMs,
      validate: (response) => Boolean(response && response.ok && response.body && response.body.ok === true),
    });
    console.log('Review service is ready.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  let ollamaReady = false;
  try {
    await waitForService({
      label: 'ollama service',
      url: new URL('/api/tags', options.ollamaUrl).toString(),
      timeoutMs: options.timeoutMs,
      intervalMs: options.intervalMs,
      validate: (response) => Boolean(response && response.ok),
    });
    ollamaReady = true;
    console.log('Ollama API is ready.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  printDivider('Model Check');
  if (options.skipModelCheck) {
    console.log('Skipping model existence check as requested.');
  } else if (options.plan !== 'free') {
    console.log('Skipping model existence check for vip plan.');
  } else if (ollamaReady) {
    try {
      const modelCheck = await checkModelAvailability(options.ollamaUrl, options.model, options.intervalMs);
      if (modelCheck.found) {
        console.log(`Detected Ollama model: ${options.model}`);
      } else {
        console.log(`Model not found: ${options.model}`);
        console.log(`You can run: ollama pull ${options.model}`);
        console.log('Eval can still continue, but the free route may fall back to the placeholder result.');
      }
    } catch (error) {
      console.log(`Model check failed: ${error instanceof Error ? error.message : String(error)}`);
      console.log('Eval will continue, but free route may fall back if Ollama is unavailable or the model is missing.');
    }
  }

  printDivider('Run Eval');
  try {
    runCommand(process.execPath, [RUN_SCRIPT_PATH, `--plan=${options.plan}`, `--base-url=${options.baseUrl}`], 'run-review-eval');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  printDivider('Summarize Eval');
  try {
    runCommand(process.execPath, [SUMMARY_SCRIPT_PATH, LATEST_OUTPUT_PATH], 'summarize-review-eval');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  printDivider('Final');
  console.log(`Completed review dev eval for plan=${options.plan}.`);
  console.log(`Latest eval output: ${LATEST_OUTPUT_PATH}`);
  console.log(`Latest summary report: ${path.resolve(ROOT_DIR, 'outputs', 'review_eval_summary_latest.json')}`);
  console.log(`Latest markdown report: ${path.resolve(ROOT_DIR, 'outputs', 'review_eval_report_latest.md')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
