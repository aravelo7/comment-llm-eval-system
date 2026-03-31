# -*- coding: utf-8 -*-
from pathlib import Path

import matplotlib.pyplot as plt

from viz.common import (
    RAW_DATA_PATH,
    build_output_path,
    configure_matplotlib_chinese_font,
    load_comments_dataframe,
    require_columns,
)


def summarize_rating_counts(ratings) -> tuple[list[str], list[int]]:
    rating_counts = ratings.value_counts().sort_index()
    labels = rating_counts.index.astype(str).tolist()
    counts = rating_counts.values.tolist()
    if not counts:
        raise ValueError("No rating data found in the input file.")
    return labels, counts


def create_rating_plot(
    labels: list[str],
    counts: list[int],
    save_path: Path,
    title: str = "\u8bc4\u5206\u5206\u5e03",
    show: bool = False,
) -> Path:
    configure_matplotlib_chinese_font()
    save_path.parent.mkdir(parents=True, exist_ok=True)

    colors = plt.cm.Blues([0.45, 0.58, 0.7, 0.82, 0.94])[: len(counts)]
    explode = [0.08] + [0] * (len(counts) - 1)

    fig, ax = plt.subplots(figsize=(8, 8))
    wedges, _, autotexts = ax.pie(
        counts,
        labels=labels,
        autopct="%.1f%%",
        startangle=140,
        colors=colors,
        explode=explode,
        wedgeprops={"edgecolor": "white", "linewidth": 1},
        textprops={"fontsize": 11},
    )

    for autotext in autotexts:
        autotext.set_color("white")
        autotext.set_fontsize(11)

    ax.set_title(title)
    ax.legend(
        wedges,
        labels,
        title="\u8bc4\u5206",
        loc="center left",
        bbox_to_anchor=(1, 0, 0.5, 1),
    )

    fig.tight_layout()
    fig.savefig(save_path, dpi=300)

    if show:
        plt.show()

    plt.close(fig)
    return save_path


def run_rating_visualization(
    input_path: Path = RAW_DATA_PATH,
    output_path: Path | None = None,
    rating_column: str = "rank",
    show: bool = False,
) -> Path:
    df = load_comments_dataframe(input_path)
    require_columns(df, [rating_column])

    labels, counts = summarize_rating_counts(df[rating_column].dropna())
    final_output_path = output_path or build_output_path("rating.png")
    return create_rating_plot(labels=labels, counts=counts, save_path=final_output_path, show=show)


def main() -> None:
    run_rating_visualization(show=True)


if __name__ == "__main__":
    main()
