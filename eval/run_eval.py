# -*- coding: utf-8 -*-
from __future__ import annotations

import csv
import hashlib
from pathlib import Path
from typing import Dict, Iterable, List

from eval.metrics import abnormal_output_rate, accuracy, format_compliance_rate
from eval.parser import parse_model_output
from eval.prompt_templates import (
    build_keyword_extraction_prompt,
    build_sentiment_classification_prompt,
)


ROOT_DIR = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT_DIR / "data" / "labeled" / "sample_eval_dataset.csv"
OUTPUT_PATH = ROOT_DIR / "data" / "outputs" / "eval_results.csv"


def repository_root() -> Path:
    return ROOT_DIR


def read_labeled_dataset(dataset_path: Path) -> List[Dict[str, str]]:
    with dataset_path.open("r", encoding="utf-8", newline="") as csv_file:
        return list(csv.DictReader(csv_file))


def _keywords_from_reference(keyword_reference: str) -> List[str]:
    keywords = [item.strip() for item in keyword_reference.split("|") if item.strip()]
    return keywords[:3]


def generate_mock_output(row: Dict[str, str]) -> str:
    keywords = _keywords_from_reference(row.get("keyword_reference", ""))
    default_keywords = ", ".join(keywords or ["comment"])
    sentiment_label = row.get("sentiment_label", "neutral")
    scenario_type = row.get("scenario_type", "normal")

    if scenario_type == "noisy":
        return f"sentiment: {sentiment_label}\nkeywords: {default_keywords}"

    if scenario_type == "short_text":
        fallback_sentiment = "neutral" if sentiment_label == "positive" else sentiment_label
        return f"sentiment: {fallback_sentiment}\nkeywords: {default_keywords}"

    if scenario_type == "boundary_case":
        return "analysis uncertain"

    comment_hash = hashlib.md5(row.get("comment", "").encode("utf-8")).hexdigest()
    if int(comment_hash[-1], 16) % 5 == 0:
        predicted_sentiment = "neutral"
    else:
        predicted_sentiment = sentiment_label
    return f"sentiment: {predicted_sentiment}\nkeywords: {default_keywords}"


def evaluate_rows(rows: Iterable[Dict[str, str]]) -> List[Dict[str, object]]:
    evaluated_rows: List[Dict[str, object]] = []
    for row in rows:
        sentiment_prompt = build_sentiment_classification_prompt(row["comment"])
        keyword_prompt = build_keyword_extraction_prompt(row["comment"])
        mock_output = generate_mock_output(row)
        parsed_output = parse_model_output(mock_output)

        evaluated_rows.append(
            {
                "id": row["id"],
                "comment": row["comment"],
                "sentiment_label": row["sentiment_label"],
                "keyword_reference": row["keyword_reference"],
                "scenario_type": row["scenario_type"],
                "sentiment_prompt": sentiment_prompt,
                "keyword_prompt": keyword_prompt,
                "mock_raw_output": mock_output,
                "predicted_sentiment": parsed_output["sentiment"],
                "predicted_keywords": "|".join(parsed_output["keywords"]),
                "is_format_compliant": parsed_output["is_format_compliant"],
                "is_abnormal": parsed_output["is_abnormal"],
                "is_sentiment_correct": parsed_output["sentiment"] == row["sentiment_label"],
            }
        )
    return evaluated_rows


def save_eval_results(rows: Iterable[Dict[str, object]], output_path: Path) -> Path:
    rows = list(rows)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "id",
        "comment",
        "sentiment_label",
        "keyword_reference",
        "scenario_type",
        "sentiment_prompt",
        "keyword_prompt",
        "mock_raw_output",
        "predicted_sentiment",
        "predicted_keywords",
        "is_format_compliant",
        "is_abnormal",
        "is_sentiment_correct",
    ]
    with output_path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return output_path


def summarize_results(rows: Iterable[Dict[str, object]]) -> Dict[str, float]:
    rows = list(rows)
    return {
        "accuracy": accuracy(rows),
        "format_compliance_rate": format_compliance_rate(rows),
        "abnormal_output_rate": abnormal_output_rate(rows),
    }


def run_evaluation() -> Path:
    dataset_rows = read_labeled_dataset(DATASET_PATH)
    evaluated_rows = evaluate_rows(dataset_rows)
    return save_eval_results(evaluated_rows, OUTPUT_PATH)
