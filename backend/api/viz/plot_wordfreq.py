# -*- coding: utf-8 -*-
from collections import Counter
from pathlib import Path

import jieba.posseg as pseg
import matplotlib.pyplot as plt
from wordcloud import STOPWORDS

from viz.common import (
    RAW_DATA_PATH,
    build_output_path,
    configure_matplotlib_chinese_font,
    load_comments_dataframe,
    require_columns,
)

DEFAULT_STOPWORDS = {
    "\u4e00\u4e2a",
    "\u611f\u89c9",
    "\u771f\u7684",
    "\u5c31\u662f",
    "\u8fd8\u662f",
    "\u89c9\u5f97",
}


def extract_comment_words(
    comments: list[str],
    custom_stopwords: set[str] | None = None,
) -> list[str]:
    stopwords = set(STOPWORDS)
    stopwords.update(DEFAULT_STOPWORDS)
    if custom_stopwords:
        stopwords.update(custom_stopwords)

    words: list[str] = []
    for comment in comments:
        for word, _ in pseg.cut(comment):
            cleaned_word = word.strip()
            if len(cleaned_word) >= 2 and cleaned_word not in stopwords:
                words.append(cleaned_word)
    return words


def create_word_frequency_plot(
    words: list[str],
    save_path: Path,
    title: str = "\u8bc4\u8bba\u8bcd\u9891 Top 10 \u7edf\u8ba1\u56fe",
    top_n: int = 10,
    show: bool = False,
) -> Path:
    if not words:
        raise ValueError("No words were extracted from the comments.")

    word_counts = Counter(words).most_common(top_n)
    labels, counts = zip(*word_counts)

    configure_matplotlib_chinese_font()
    save_path.parent.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.bar(labels, counts, color="#4C78A8")
    ax.set_title(title, fontsize=16)
    ax.set_xlabel("\u8bcd\u8bed", fontsize=12)
    ax.set_ylabel("\u51fa\u73b0\u6b21\u6570", fontsize=12)
    ax.tick_params(axis="x", rotation=45, labelsize=11)
    ax.grid(axis="y", linestyle="--", alpha=0.4)

    fig.tight_layout()
    fig.savefig(save_path, dpi=300)

    if show:
        plt.show()

    plt.close(fig)
    return save_path


def run_word_frequency_visualization(
    input_path: Path = RAW_DATA_PATH,
    output_path: Path | None = None,
    comment_column: str = "comment",
    show: bool = False,
) -> Path:
    df = load_comments_dataframe(input_path)
    require_columns(df, [comment_column])

    comments = df[comment_column].dropna().astype(str).tolist()
    words = extract_comment_words(comments)

    final_output_path = output_path or build_output_path("wordfreq.png")
    return create_word_frequency_plot(words=words, save_path=final_output_path, show=show)


def main() -> None:
    run_word_frequency_visualization(show=True)


if __name__ == "__main__":
    main()
