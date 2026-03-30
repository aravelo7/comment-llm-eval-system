# -*- coding: utf-8 -*-
from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path
from typing import Dict, List

from eval.metrics import abnormal_output_rate, accuracy, format_compliance_rate


ROOT_DIR = Path(__file__).resolve().parents[1]
EVAL_RESULTS_PATH = ROOT_DIR / "data" / "outputs" / "eval_results.csv"
REPORT_PATH = ROOT_DIR / "data" / "outputs" / "report.md"


def repository_root() -> Path:
    return ROOT_DIR


def read_eval_results(results_path: Path) -> List[Dict[str, str]]:
    with results_path.open("r", encoding="utf-8", newline="") as csv_file:
        return list(csv.DictReader(csv_file))


def _dataset_summary(rows: List[Dict[str, str]]) -> List[str]:
    scenario_counts = Counter(row.get("scenario_type", "unknown") for row in rows)
    sentiment_counts = Counter(row.get("sentiment_label", "unknown") for row in rows)

    lines = [
        f"- Total examples: {len(rows)}",
        f"- Scenario distribution: {dict(scenario_counts)}",
        f"- Sentiment distribution: {dict(sentiment_counts)}",
    ]
    return lines


def _metrics_summary(rows: List[Dict[str, str]]) -> List[str]:
    return [
        f"- Accuracy: {accuracy(rows):.2%}",
        f"- Format compliance rate: {format_compliance_rate(rows):.2%}",
        f"- Abnormal output rate: {abnormal_output_rate(rows):.2%}",
    ]


def _failed_examples(rows: List[Dict[str, str]], limit: int = 3) -> List[Dict[str, str]]:
    failed: List[Dict[str, str]] = []
    for row in rows:
        is_correct = str(row.get("is_sentiment_correct", "")).strip().lower() == "true"
        is_abnormal = str(row.get("is_abnormal", "")).strip().lower() == "true"
        if (not is_correct) or is_abnormal:
            failed.append(row)
        if len(failed) >= limit:
            break
    return failed


def build_markdown_report(rows: List[Dict[str, str]]) -> str:
    failed_examples = _failed_examples(rows)
    lines = [
        "# LLM Evaluation Prototype Report",
        "",
        "## Dataset Summary",
        * _dataset_summary(rows),
        "",
        "## Metrics Summary",
        * _metrics_summary(rows),
        "",
        "## Failed Examples",
    ]

    if not failed_examples:
        lines.append("- No failed examples in this run.")
    else:
        for example in failed_examples:
            lines.extend(
                [
                    f"- ID: {example.get('id', '')}",
                    f"  Comment: {example.get('comment', '')}",
                    f"  Gold sentiment: {example.get('sentiment_label', '')}",
                    f"  Predicted sentiment: {example.get('predicted_sentiment', '')}",
                    f"  Raw output: {example.get('mock_raw_output', '')}",
                ]
            )
    return "\n".join(lines) + "\n"


def save_report(markdown_text: str, report_path: Path) -> Path:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(markdown_text, encoding="utf-8")
    return report_path


def run_report_generation() -> Path:
    rows = read_eval_results(EVAL_RESULTS_PATH)
    markdown_text = build_markdown_report(rows)
    return save_report(markdown_text, REPORT_PATH)
