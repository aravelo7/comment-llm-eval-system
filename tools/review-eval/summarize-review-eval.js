const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname);
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'outputs');
const DEFAULT_INPUT_PATH = path.resolve(OUTPUT_DIR, 'review_eval_results.json');
const DEFAULT_SUMMARY_PATH = path.resolve(OUTPUT_DIR, 'review_eval_summary.json');

function parseArgs(argv) {
  const directPath = argv.find((arg) => !arg.startsWith('--'));
  return {
    inputPath: directPath ? path.resolve(process.cwd(), directPath) : DEFAULT_INPUT_PATH,
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildEmptyBucket() {
  return {
    total: 0,
    success: 0,
    matched: 0,
    accuracy: 0,
  };
}

function isHighRiskLabel(label) {
  return label === 'promo_contact' || label === 'external_link' || label === 'conflict_incitement';
}

function buildSummary(records, sourceFile) {
  const summary = {
    generated_at: new Date().toISOString(),
    source_file: sourceFile,
    total_samples: 0,
    total_success: 0,
    total_failed: 0,
    overall_accuracy: 0,
    by_label: {},
    false_positive_negative_feedback_to_abuse: 0,
    high_risk_miss_count: 0,
    fallback_count: 0,
    mode_breakdown: {
      rule_only: 0,
      rule_plus_llm: 0,
      rule_fallback: 0,
      unknown: 0,
    },
    top_mismatches: [],
  };

  records.forEach((record) => {
    summary.total_samples += 1;

    if (record.error === null) {
      summary.total_success += 1;
    } else {
      summary.total_failed += 1;
    }

    if (record.meta && record.meta.fallback_used) {
      summary.fallback_count += 1;
    }

    const mode = record.meta && typeof record.meta.mode === 'string' ? record.meta.mode : 'unknown';
    summary.mode_breakdown[mode] = (summary.mode_breakdown[mode] || 0) + 1;

    const bucket = summary.by_label[record.expected_label] || buildEmptyBucket();
    bucket.total += 1;
    if (record.error === null) {
      bucket.success += 1;
    }
    if (record.matched) {
      bucket.matched += 1;
    }
    summary.by_label[record.expected_label] = bucket;

    if (record.expected_label === 'negative_feedback' && record.actual_label === 'abuse') {
      summary.false_positive_negative_feedback_to_abuse += 1;
    }

    if (isHighRiskLabel(record.expected_label) && record.actual_label !== record.expected_label) {
      summary.high_risk_miss_count += 1;
    }

    if (!record.matched) {
      summary.top_mismatches.push({
        id: record.id,
        text: record.text,
        expected_label: record.expected_label,
        actual_label: record.actual_label,
        fallback_used: Boolean(record.meta && record.meta.fallback_used),
        mode,
        error: record.error,
      });
    }
  });

  Object.keys(summary.by_label).forEach((label) => {
    const bucket = summary.by_label[label];
    bucket.accuracy = bucket.total === 0 ? 0 : Number((bucket.matched / bucket.total).toFixed(4));
  });

  const matchedCount = records.filter((record) => record.matched).length;
  summary.overall_accuracy =
    summary.total_samples === 0 ? 0 : Number((matchedCount / summary.total_samples).toFixed(4));
  summary.top_mismatches = summary.top_mismatches.slice(0, 10);

  return summary;
}

function printSummary(summary) {
  console.log('Review Eval Summary');
  console.log(`- total: ${summary.total_samples}`);
  console.log(`- success: ${summary.total_success}`);
  console.log(`- failed: ${summary.total_failed}`);
  console.log(`- accuracy: ${summary.overall_accuracy}`);
  console.log(`- fallback_count: ${summary.fallback_count}`);
  console.log(`- negative_feedback_to_abuse: ${summary.false_positive_negative_feedback_to_abuse}`);
  console.log(`- high_risk_miss_count: ${summary.high_risk_miss_count}`);
}

async function main() {
  const { inputPath } = parseArgs(process.argv.slice(2));
  const records = await readJson(inputPath);

  if (!Array.isArray(records)) {
    throw new Error(`Eval input must be a JSON array: ${inputPath}`);
  }

  const summary = buildSummary(records, inputPath);
  await writeJson(DEFAULT_SUMMARY_PATH, summary);

  printSummary(summary);

  if (summary.top_mismatches.length > 0) {
    console.log('- top_mismatches:');
    summary.top_mismatches.forEach((item) => {
      console.log(`  - ${item.id}: expected=${item.expected_label}, actual=${item.actual_label || 'null'}, error=${item.error || 'none'}`);
    });
  }

  console.log(`Summary JSON saved to: ${DEFAULT_SUMMARY_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
