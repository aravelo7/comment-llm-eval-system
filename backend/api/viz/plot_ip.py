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


def summarize_ip_counts(ip_values) -> tuple[list[str], list[int]]:
    ip_counts = ip_values.value_counts()
    labels = ip_counts.index.astype(str).tolist()
    counts = ip_counts.values.tolist()
    if not counts:
        raise ValueError("No IP data found in the input file.")
    return labels, counts


def create_ip_plot(
    labels: list[str],
    counts: list[int],
    save_path: Path,
    title: str = "IP \u5206\u5e03",
    show: bool = False,
) -> Path:
    configure_matplotlib_chinese_font()
    save_path.parent.mkdir(parents=True, exist_ok=True)

    color_map = plt.cm.Set3(range(max(len(counts), 3)))
    colors = color_map[: len(counts)]
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
        textprops={"fontsize": 10},
    )

    for autotext in autotexts:
        autotext.set_color("white")
        autotext.set_fontsize(10)

    ax.set_title(title)
    ax.legend(wedges, labels, title="IP", loc="center left", bbox_to_anchor=(1, 0, 0.5, 1))

    fig.tight_layout()
    fig.savefig(save_path, dpi=300)

    if show:
        plt.show()

    plt.close(fig)
    return save_path


def run_ip_visualization(
    input_path: Path = RAW_DATA_PATH,
    output_path: Path | None = None,
    ip_column: str = "ip",
    show: bool = False,
) -> Path:
    df = load_comments_dataframe(input_path)
    require_columns(df, [ip_column])

    labels, counts = summarize_ip_counts(df[ip_column].dropna().astype(str))
    final_output_path = output_path or build_output_path("ip.png")
    return create_ip_plot(labels=labels, counts=counts, save_path=final_output_path, show=show)


def main() -> None:
    run_ip_visualization(show=True)


if __name__ == "__main__":
    main()
