from __future__ import annotations

from typing import Any, Protocol

from .models import UnifiedContentRecord


class RawFetcher(Protocol):
    def fetch(self) -> list[dict[str, Any]]:
        """Fetch raw records through an authorized source.

        This interface is intentionally abstract. Implementations must not
        bypass login, captcha, rate limit, or platform protection mechanisms.
        """


class RawParser(Protocol):
    def parse(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Parse one raw payload into a structured intermediate dict."""


class ContentNormalizer(Protocol):
    def normalize(self, payload: dict[str, Any]) -> UnifiedContentRecord:
        """Map one platform payload into the unified moderation record."""
