# -*- coding: utf-8 -*-
from pathlib import Path

import pandas as pd
from matplotlib import font_manager, rcParams

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DATA_PATH = PROJECT_ROOT / "data" / "raw" / "comments.xlsx"
OUTPUT_DIR = PROJECT_ROOT / "data" / "outputs"
PREFERRED_CHINESE_FONTS = ("Microsoft YaHei", "SimHei", "SimSun")


def load_comments_dataframe(file_path: Path = RAW_DATA_PATH) -> pd.DataFrame:
    if not file_path.exists():
        raise FileNotFoundError(f"Input file not found: {file_path}")
    return pd.read_excel(file_path)


def require_columns(df: pd.DataFrame, required_columns: list[str]) -> None:
    missing_columns = [column for column in required_columns if column not in df.columns]
    if missing_columns:
        raise KeyError(
            f"Missing required columns: {missing_columns}. Available columns: {df.columns.tolist()}"
        )


def ensure_output_dir() -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR


def build_output_path(filename: str) -> Path:
    return ensure_output_dir() / filename


def detect_chinese_font() -> tuple[str, str]:
    font_entries = font_manager.fontManager.ttflist
    font_map = {entry.name: entry.fname for entry in font_entries}

    for font_name in PREFERRED_CHINESE_FONTS:
        font_path = font_map.get(font_name)
        if font_path:
            return font_name, font_path

    raise RuntimeError(
        "No supported Chinese font found for matplotlib. "
        "Install one of these fonts on Windows: Microsoft YaHei, SimHei, SimSun."
    )


def configure_matplotlib_chinese_font() -> str:
    font_name, _ = detect_chinese_font()
    rcParams["font.sans-serif"] = [font_name]
    rcParams["axes.unicode_minus"] = False
    return font_name


def get_wordcloud_font_path() -> str:
    _, font_path = detect_chinese_font()
    return font_path
