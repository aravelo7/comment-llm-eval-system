const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname);
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'outputs');
const DEFAULT_INPUT_PATH = path.resolve(OUTPUT_DIR, 'review_eval_latest.json');
const DEFAULT_SUMMARY_PATH = path.resolve(OUTPUT_DIR, 'review_eval_summary_latest.json');
const DEFAULT_MARKDOWN_LATEST_PATH = path.resolve(OUTPUT_DIR, 'review_eval_report_latest.md');
const KNOWN_FAILURE_REASONS = [
  'http_request_failed',
  'response_not_ok',
  'malformed_result',
  'missing_rule_codes',
  'decision_out_of_expected_range',
  'needs_human_review_out_of_range',
];

function parseArgs(argv) {
  const directPathArg = argv.find((arg) => !arg.startsWith('--'));
  const fileFlagArg = argv.find((arg) => arg.startsWith('--file='));
  const inputPath = fileFlagArg
    ? path.resolve(process.cwd(), fileFlagArg.slice('--file='.length).trim())
    : directPathArg
      ? path.resolve(process.cwd(), directPathArg)
      : DEFAULT_INPUT_PATH;

  return { inputPath };
}

function createTimestamp() {
  return new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-').replace(/Z$/, '');
}

function formatPercent(numerator, denominator) {
  if (!denominator) {
    return '0.0%';
  }

  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function writeTextFile(filePath, content) {
  await fs.writeFile(filePath, content, 'utf8');
}

function normalizeRecords(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.records)) {
    return payload.records;
  }

  return [];
}

function initCategorySummary() {
  return {
    total: 0,
    passed: 0,
    failed: 0,
    pass_rate: '0.0%',
  };
}

function collectFailureReasonCounts(records) {
  const counts = {};

  KNOWN_FAILURE_REASONS.forEach((reason) => {
    counts[reason] = 0;
  });

  records.forEach((record) => {
    const assertion = record && record.assertion ? record.assertion : {};
    const reasons = Array.isArray(assertion.failure_reasons) ? assertion.failure_reasons : [];
    reasons.forEach((reason) => {
      counts[reason] = (counts[reason] || 0) + 1;
    });
  });

  return counts;
}

function getMissingRuleCodes(record) {
  const checks = record && record.assertion && Array.isArray(record.assertion.checks) ? record.assertion.checks : [];
  const missingCodesCheck = checks.find((check) => check && check.name === 'must_include_rule_codes');
  return missingCodesCheck && Array.isArray(missingCodesCheck.missing_rule_codes)
    ? missingCodesCheck.missing_rule_codes
    : [];
}

function buildFailureRow(record) {
  const sample = record && record.sample ? record.sample : {};
  const result = record && record.result ? record.result : {};
  const expected = sample && sample.expected ? sample.expected : {};

  return {
    sample_id: sample.id || '',
    category: sample.category || '',
    actual_decision: typeof result.decision === 'string' ? result.decision : '',
    expected_decision_in: Array.isArray(expected.decision_in) ? expected.decision_in : [],
    missing_rule_codes: getMissingRuleCodes(record),
    error: record && record.error ? record.error : null,
    failure_reasons:
      record && record.assertion && Array.isArray(record.assertion.failure_reasons)
        ? record.assertion.failure_reasons
        : [],
  };
}

function summarizeRecords(records) {
  const summary = {
    total_samples: records.length,
    request_success: 0,
    request_failed: 0,
    assertion_passed: 0,
    assertion_failed: 0,
    total_pass_rate: '0.0%',
    by_category: {},
    failure_reason_counts: {},
    failed_samples: [],
    conclusion_hints: [],
  };

  records.forEach((record) => {
    const sample = record && record.sample ? record.sample : {};
    const category = sample.category || 'unknown';
    const bucket = summary.by_category[category] || initCategorySummary();

    bucket.total += 1;

    if (record && record.error) {
      summary.request_failed += 1;
    } else {
      summary.request_success += 1;
    }

    if (record && record.assertion && record.assertion.passed) {
      summary.assertion_passed += 1;
      bucket.passed += 1;
    } else {
      summary.assertion_failed += 1;
      bucket.failed += 1;
      summary.failed_samples.push(buildFailureRow(record));
    }

    summary.by_category[category] = bucket;
  });

  Object.keys(summary.by_category).forEach((category) => {
    const bucket = summary.by_category[category];
    bucket.pass_rate = formatPercent(bucket.passed, bucket.total);
  });

  summary.total_pass_rate = formatPercent(summary.assertion_passed, summary.total_samples);
  summary.failure_reason_counts = collectFailureReasonCounts(records);
  summary.conclusion_hints = buildConclusionHints(summary);

  return summary;
}

function sortCategoryEntries(byCategory) {
  return Object.entries(byCategory).sort((left, right) => {
    if (right[1].failed !== left[1].failed) {
      return right[1].failed - left[1].failed;
    }

    return left[0].localeCompare(right[0]);
  });
}

function buildConclusionHints(summary) {
  const hints = [];
  if (summary.total_samples === 0) {
    hints.push('当前没有可汇总的样本记录。');
    return hints;
  }

  if (summary.request_failed === summary.total_samples) {
    hints.push('当前失败主要由服务不可达导致，建议先检查 review 与 ollama 是否已启动。');
    return hints;
  }

  const categoryEntries = sortCategoryEntries(summary.by_category);
  if (categoryEntries.length > 0) {
    const [topCategory, topStats] = categoryEntries[0];
    if (topStats.failed > 0) {
      hints.push(`当前主要失败集中在 ${topCategory} 类别，共 ${topStats.failed} 条。`);
    }
  }

  const failureCounts = summary.failure_reason_counts;
  if ((failureCounts.missing_rule_codes || 0) > 0 && (failureCounts.decision_out_of_expected_range || 0) === 0) {
    hints.push('当前主要问题在规则命中不足，建议优先检查预检规则与样本文案覆盖。');
  }

  if ((failureCounts.decision_out_of_expected_range || 0) > 0 && (failureCounts.missing_rule_codes || 0) === 0) {
    hints.push('当前规则命中基本正常，但 decision 偏离预期区间，可能存在模型判断偏保守或偏激进。');
  }

  if ((failureCounts.response_not_ok || 0) > 0 || (failureCounts.malformed_result || 0) > 0) {
    hints.push('当前存在接口结构或返回状态异常，建议先排查 review 服务日志。');
  }

  if (hints.length === 0) {
    hints.push('当前未发现明显集中失败模式，可优先抽查失败样本明细。');
  }

  return hints;
}

function printSection(title) {
  console.log('');
  console.log(title);
}

function printBasicInfo(inputPath, meta, summary) {
  console.log(`Input file: ${inputPath}`);
  console.log(`Plan: ${meta && meta.plan ? meta.plan : 'unknown'}`);
  console.log(`Generated at: ${meta && meta.generated_at ? meta.generated_at : 'unknown'}`);
  console.log(`Total samples: ${summary.total_samples}`);
  console.log(`Request success: ${summary.request_success}`);
  console.log(`Request failed: ${summary.request_failed}`);
  console.log(`Assertions passed: ${summary.assertion_passed}`);
  console.log(`Assertions failed: ${summary.assertion_failed}`);
  console.log(`Total pass rate: ${summary.total_pass_rate}`);
}

function printCategorySummary(byCategory) {
  const entries = Object.entries(byCategory).sort((a, b) => a[0].localeCompare(b[0]));
  if (entries.length === 0) {
    console.log('- No category stats available');
    return;
  }

  entries.forEach(([category, item]) => {
    console.log(
      `- ${category}: total=${item.total} passed=${item.passed} failed=${item.failed} pass_rate=${item.pass_rate}`,
    );
  });
}

function printFailureReasons(counts) {
  KNOWN_FAILURE_REASONS.forEach((reason) => {
    console.log(`- ${reason}: ${counts[reason] || 0}`);
  });

  const extraReasons = Object.keys(counts).filter((reason) => !KNOWN_FAILURE_REASONS.includes(reason));
  extraReasons.sort().forEach((reason) => {
    console.log(`- ${reason}: ${counts[reason]}`);
  });
}

function printFailedSamples(rows, limit = 10) {
  if (rows.length === 0) {
    console.log('- No failed samples');
    return;
  }

  rows.slice(0, limit).forEach((row) => {
    const missingText = row.missing_rule_codes.length > 0 ? row.missing_rule_codes.join(',') : '-';
    const expectedText = row.expected_decision_in.length > 0 ? row.expected_decision_in.join(',') : '-';
    const errorText = row.error || '-';
    console.log(
      `- ${row.sample_id} | ${row.category} | actual=${row.actual_decision || '-'} | expected=${expectedText} | missing_rule_codes=${missingText} | error=${errorText}`,
    );
  });

  if (rows.length > limit) {
    console.log(`- ... ${rows.length - limit} more failed samples omitted`);
  }
}

function printConclusionHints(hints) {
  hints.forEach((hint) => {
    console.log(`- ${hint}`);
  });
}

function buildMarkdownReport({ inputPath, meta, summary }) {
  const categoryLines = Object.entries(summary.by_category)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([category, item]) =>
        `| ${category} | ${item.total} | ${item.passed} | ${item.failed} | ${item.pass_rate} |`,
    )
    .join('\n');

  const failureReasonLines = [...KNOWN_FAILURE_REASONS]
    .map((reason) => `| ${reason} | ${summary.failure_reason_counts[reason] || 0} |`)
    .join('\n');

  const failedSampleLines =
    summary.failed_samples.length === 0
      ? '| - | - | - | - | - | - |'
      : summary.failed_samples
          .slice(0, 20)
          .map((row) => {
            const expectedText = row.expected_decision_in.length > 0 ? row.expected_decision_in.join(', ') : '-';
            const missingText = row.missing_rule_codes.length > 0 ? row.missing_rule_codes.join(', ') : '-';
            const errorText = row.error ? row.error.replace(/\r?\n/g, ' ') : '-';
            return `| ${row.sample_id || '-'} | ${row.category || '-'} | ${row.actual_decision || '-'} | ${expectedText} | ${missingText} | ${errorText} |`;
          })
          .join('\n');

  const hintLines = summary.conclusion_hints.map((hint) => `- ${hint}`).join('\n');

  return [
    '# Review Eval Report',
    '',
    `- Generated at: ${new Date().toISOString()}`,
    `- Input file: ${inputPath}`,
    `- Plan: ${meta && meta.plan ? meta.plan : 'unknown'}`,
    `- Eval generated at: ${meta && meta.generated_at ? meta.generated_at : 'unknown'}`,
    '',
    '## Overview',
    '',
    `- Total samples: ${summary.total_samples}`,
    `- Request success: ${summary.request_success}`,
    `- Request failed: ${summary.request_failed}`,
    `- Assertions passed: ${summary.assertion_passed}`,
    `- Assertions failed: ${summary.assertion_failed}`,
    `- Total pass rate: ${summary.total_pass_rate}`,
    '',
    '## Category Summary',
    '',
    '| Category | Total | Passed | Failed | Pass Rate |',
    '| --- | ---: | ---: | ---: | ---: |',
    categoryLines || '| - | - | - | - | - |',
    '',
    '## Failure Reasons',
    '',
    '| Reason | Count |',
    '| --- | ---: |',
    failureReasonLines,
    '',
    '## Failed Samples',
    '',
    '| Sample ID | Category | Actual Decision | Expected Decision | Missing Rule Codes | Error |',
    '| --- | --- | --- | --- | --- | --- |',
    failedSampleLines,
    '',
    '## Conclusion',
    '',
    hintLines || '- No conclusion hints available.',
    '',
  ].join('\n');
}

async function main() {
  const { inputPath } = parseArgs(process.argv.slice(2));

  let payload;
  try {
    payload = await readJsonFile(inputPath);
  } catch (error) {
    console.error(`Failed to read eval output: ${inputPath}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const records = normalizeRecords(payload);
  const meta = payload && payload.meta ? payload.meta : {};
  const summary = summarizeRecords(records);
  const timestamp = createTimestamp();
  const markdown = buildMarkdownReport({ inputPath, meta, summary });
  const timestampedMarkdownPath = path.resolve(OUTPUT_DIR, `review_eval_report_${timestamp}.md`);

  printSection('Review Eval Summary');
  printBasicInfo(inputPath, meta, summary);

  printSection('Category Summary');
  printCategorySummary(summary.by_category);

  printSection('Failure Reasons');
  printFailureReasons(summary.failure_reason_counts);

  printSection('Failed Samples Top');
  printFailedSamples(summary.failed_samples, 10);

  printSection('Conclusion');
  printConclusionHints(summary.conclusion_hints);

  try {
    await writeJsonFile(DEFAULT_SUMMARY_PATH, {
      generated_at: new Date().toISOString(),
      source_file: inputPath,
      plan: meta && meta.plan ? meta.plan : 'unknown',
      summary,
    });
    await writeTextFile(DEFAULT_MARKDOWN_LATEST_PATH, markdown);
    await writeTextFile(timestampedMarkdownPath, markdown);
  } catch (error) {
    console.error('Failed to write summary report files.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  console.log('');
  console.log(`Summary JSON: ${DEFAULT_SUMMARY_PATH}`);
  console.log(`Markdown report: ${DEFAULT_MARKDOWN_LATEST_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
