# -*- coding: utf-8 -*-
import argparse

from viz.make_wordcloud import run_wordcloud
from viz.plot_ip import run_ip_visualization
from viz.plot_rating import run_rating_visualization
from viz.plot_wordfreq import run_word_frequency_visualization


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Comment visualization CLI",
    )
    parser.add_argument(
        "command",
        choices=[
            "visualize-wordfreq",
            "visualize-rating",
            "visualize-ip",
            "wordcloud",
        ],
        help="Visualization command to run",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    command_handlers = {
        "visualize-wordfreq": run_word_frequency_visualization,
        "visualize-rating": run_rating_visualization,
        "visualize-ip": run_ip_visualization,
        "wordcloud": run_wordcloud,
    }
    command_handlers[args.command]()


if __name__ == "__main__":
    main()
