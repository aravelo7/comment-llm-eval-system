from __future__ import annotations

from python.crawler.common.models import UnifiedContentRecord


def normalize_tieba_item(payload: dict) -> UnifiedContentRecord:
    return UnifiedContentRecord(
        id=str(payload["id"]),
        platform="tieba",
        channel=payload["channel"],
        content_type=payload["content_type"],
        source_url=payload.get("source_url"),
        content_text=payload["content_text"],
        content_html=None,
        author_name=payload["author_name"],
        author_id=payload.get("author_id"),
        target_author_name=payload.get("target_author_name"),
        target_author_id=payload.get("target_author_id"),
        publish_time=payload["publish_time"],
        collected_at=payload["collected_at"],
        tags=list(payload.get("tags", [])),
        risk_signals=list(payload.get("risk_signals", [])),
        platform_metadata=dict(payload.get("platform_metadata", {})),
        conversation_id=payload.get("conversation_id"),
        message_id=payload.get("message_id"),
        direction=payload.get("direction"),
        receiver_id=payload.get("receiver_id"),
        receiver_name=payload.get("receiver_name"),
        is_first_contact=payload.get("is_first_contact"),
    )
