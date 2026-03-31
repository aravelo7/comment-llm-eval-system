# -*- coding: utf-8 -*-
from __future__ import annotations

from typing import Iterable, Mapping


def accuracy(rows: Iterable[Mapping[str, object]]) -> float:
    rows = list(rows)
    if not rows:
        return 0.0

    correct = 0
    for row in rows:
        if row.get("predicted_sentiment") == row.get("sentiment_label"):
            correct += 1
    return correct / len(rows)


def format_compliance_rate(rows: Iterable[Mapping[str, object]]) -> float:
    rows = list(rows)
    if not rows:
        return 0.0

    compliant = 0
    for row in rows:
        if bool(row.get("is_format_compliant")):
            compliant += 1
    return compliant / len(rows)


def abnormal_output_rate(rows: Iterable[Mapping[str, object]]) -> float:
    rows = list(rows)
    if not rows:
        return 0.0

    abnormal = 0
    for row in rows:
        if bool(row.get("is_abnormal")):
            abnormal += 1
    return abnormal / len(rows)
