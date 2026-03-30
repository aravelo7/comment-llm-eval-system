from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from .models import UnifiedContentRecord


def write_jsonl(records: Iterable[UnifiedContentRecord], output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        for record in records:
            file.write(json.dumps(record.to_dict(), ensure_ascii=False) + "\n")
    return output_path
