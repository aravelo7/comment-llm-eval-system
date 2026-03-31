# -*- coding: utf-8 -*-
from __future__ import annotations


def build_sentiment_classification_prompt(comment: str) -> str:
    return (
        "You are labeling comment sentiment for evaluation.\n"
        "Choose exactly one sentiment label from: positive, neutral, negative.\n"
        "Respond using this format:\n"
        "sentiment: <label>\n"
        "keywords: <keyword1, keyword2>\n"
        f"comment: {comment}"
    )


def build_keyword_extraction_prompt(comment: str) -> str:
    return (
        "Extract the most relevant keywords from the comment.\n"
        "Return 1 to 3 concise keywords.\n"
        "Respond using this format:\n"
        "sentiment: <positive|neutral|negative>\n"
        "keywords: <keyword1, keyword2>\n"
        f"comment: {comment}"
    )
