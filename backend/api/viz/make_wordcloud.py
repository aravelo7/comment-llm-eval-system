# -*- coding: utf-8 -*-
from collections import Counter
from pathlib import Path

import jieba.posseg as pseg
import matplotlib.pyplot as plt
from wordcloud import STOPWORDS, WordCloud

from viz.common import (
    RAW_DATA_PATH,
    build_output_path,
    configure_matplotlib_chinese_font,
    get_wordcloud_font_path,
    load_comments_dataframe,
    require_columns,
)


def build_wordcloud_frequencies(comments: list[str]) -> dict[str, int]:
    stopwords = set(STOPWORDS)
    words = []

    for word, flag in pseg.cut(" ".join(comments)):
        cleaned_word = word.strip()
        if len(cleaned_word) >= 2 and "n" in flag and cleaned_word not in stopwords:
            words.append(cleaned_word)

    frequencies = dict(Counter(words).most_common(100))
    if not frequencies:
        raise ValueError("No valid words were found for the word cloud.")
    return frequencies


def create_wordcloud_image(
    frequencies: dict[str, int],
    save_path: Path,
    show: bool = False,
) -> Path:
    configure_matplotlib_chinese_font()
    save_path.parent.mkdir(parents=True, exist_ok=True)

    wordcloud = WordCloud(
        width=1000,
        height=600,
        scale=2,
        background_color="white",
        colormap="viridis",
        font_path=get_wordcloud_font_path(),
    ).generate_from_frequencies(frequencies)

    fig, ax = plt.subplots(figsize=(12, 7))
    ax.imshow(wordcloud, interpolation="bilinear")
    ax.axis("off")

    fig.tight_layout()
    wordcloud.to_file(str(save_path))

    if show:
        plt.show()

    plt.close(fig)
    return save_path


def run_wordcloud(
    input_path: Path = RAW_DATA_PATH,
    output_path: Path | None = None,
    comment_column: str = "comment",
    show: bool = False,
) -> Path:
    df = load_comments_dataframe(input_path)
    require_columns(df, [comment_column])

    comments = df[comment_column].dropna().astype(str).tolist()
    frequencies = build_wordcloud_frequencies(comments)
    final_output_path = output_path or build_output_path("wordcloud.png")
    return create_wordcloud_image(frequencies=frequencies, save_path=final_output_path, show=show)


def main() -> None:
    run_wordcloud(show=True)


if __name__ == "__main__":
    main()
