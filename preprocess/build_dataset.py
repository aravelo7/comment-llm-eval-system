# -*- coding: utf-8 -*-
from __future__ import annotations

import re
from pathlib import Path

import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_XLSX_PATH = ROOT_DIR / "data" / "raw" / "comments.xlsx"
OUTPUT_CSV_PATH = ROOT_DIR / "data" / "labeled" / "sample_eval_dataset.csv"
REQUIRED_COLUMNS = ["comment", "rank"]
OUTPUT_COLUMNS = [
    "id",
    "comment",
    "sentiment_label",
    "keyword_reference",
    "scenario_type",
]


def repository_root() -> Path:
    return ROOT_DIR


def read_comments_from_xlsx(xlsx_path: Path) -> pd.DataFrame:
    dataframe = pd.read_excel(xlsx_path)
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in dataframe.columns]
    if missing_columns:
        missing = ", ".join(missing_columns)
        raise ValueError(f"Missing required columns in Excel file: {missing}")

    dataframe = dataframe.copy()
    dataframe["comment"] = dataframe["comment"].fillna("").astype(str).str.strip()
    dataframe["rank"] = dataframe["rank"].fillna("").astype(str).str.strip()
    dataframe = dataframe[dataframe["comment"] != ""].reset_index(drop=True)
    return dataframe


def _normalize_rank(rank_value: str) -> str:
    normalized = str(rank_value).strip().lower()
    replacements = {
        "力荐": "positive",
        "推荐": "positive",
        "较差": "negative",
        "很差": "negative",
        "还行": "neutral",
        "positive": "positive",
        "negative": "negative",
        "neutral": "neutral",
    }
    return replacements.get(normalized, "neutral")


def _extract_keywords(comment: str, limit: int = 3) -> str:
    cleaned = re.sub(r"[^\w\s\u4e00-\u9fff]", " ", comment.lower())
    tokens = [token.strip() for token in cleaned.split() if len(token.strip()) >= 2]

    unique_tokens: list[str] = []
    for token in tokens:
        if token not in unique_tokens:
            unique_tokens.append(token)
        if len(unique_tokens) >= limit:
            break

    if not unique_tokens:
        fallback = comment.strip()[:12]
        return fallback or "unknown"
    return "|".join(unique_tokens)


def _scenario_type(index: int) -> str:
    scenario_cycle = ["normal", "noisy", "short_text", "boundary_case"]
    return scenario_cycle[index % len(scenario_cycle)]


def build_labeled_dataset(dataframe: pd.DataFrame, sample_size: int = 16) -> pd.DataFrame:
    sampled = dataframe.head(sample_size).copy().reset_index(drop=True)
    sampled["id"] = [f"sample-{index + 1:03d}" for index in range(len(sampled))]
    sampled["comment"] = sampled["comment"]
    sampled["sentiment_label"] = sampled["rank"].map(_normalize_rank)
    sampled["keyword_reference"] = sampled["comment"].map(_extract_keywords)
    sampled["scenario_type"] = [_scenario_type(index) for index in range(len(sampled))]
    return sampled[OUTPUT_COLUMNS]


def save_dataset(dataframe: pd.DataFrame, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    dataframe.to_csv(output_path, index=False, encoding="utf-8")
    return output_path


def run_build_dataset() -> Path:
    dataframe = read_comments_from_xlsx(RAW_XLSX_PATH)
    dataset = build_labeled_dataset(dataframe)
    return save_dataset(dataset, OUTPUT_CSV_PATH)
