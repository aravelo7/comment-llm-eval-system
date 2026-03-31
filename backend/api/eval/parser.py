# -*- coding: utf-8 -*-
from __future__ import annotations

import re
from typing import Dict, List


VALID_SENTIMENTS = {"positive", "neutral", "negative"}


def _normalize_sentiment(value: str) -> str:
    lowered = value.strip().lower()
    alias_map = {
        "pos": "positive",
        "neg": "negative",
        "mixed": "neutral",
    }
    lowered = alias_map.get(lowered, lowered)
    if lowered in VALID_SENTIMENTS:
        return lowered
    return ""


def _parse_keywords(value: str) -> List[str]:
    parts = re.split(r"[|,;/]+", value)
    keywords: List[str] = []
    for part in parts:
        cleaned = part.strip()
        if cleaned and cleaned not in keywords:
            keywords.append(cleaned)
    return keywords


def parse_model_output(raw_output: str) -> Dict[str, object]:
    parsed: Dict[str, object] = {
        "raw_output": raw_output,
        "sentiment": "",
        "keywords": [],
        "is_format_compliant": False,
        "is_abnormal": False,
    }

    if not raw_output or not raw_output.strip():
        parsed["is_abnormal"] = True
        return parsed

    sentiment_match = re.search(r"sentiment\s*:\s*([^\n\r]+)", raw_output, flags=re.IGNORECASE)
    keywords_match = re.search(r"keywords\s*:\s*([^\n\r]+)", raw_output, flags=re.IGNORECASE)

    if sentiment_match:
        parsed["sentiment"] = _normalize_sentiment(sentiment_match.group(1))
    if keywords_match:
        parsed["keywords"] = _parse_keywords(keywords_match.group(1))

    parsed["is_format_compliant"] = bool(parsed["sentiment"] and keywords_match)
    parsed["is_abnormal"] = not parsed["is_format_compliant"]
    return parsed
