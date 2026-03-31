from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal


PlatformKey = Literal["weibo", "douban", "tieba"]
PlatformChannel = Literal["public_comment", "private_message"]
ContentType = Literal[
    "post",
    "comment",
    "reply",
    "thread_reply",
    "short_review",
    "long_review",
    "group_reply",
    "dm_message",
    "conversation_message",
]
MessageDirection = Literal["inbound", "outbound"]


@dataclass(slots=True)
class AttachmentItem:
    id: str
    type: Literal["image", "link", "file"]
    name: str
    url: str | None = None


@dataclass(slots=True)
class ReviewTraceItem:
    step: str
    detail: str
    created_at: str


@dataclass(slots=True)
class UnifiedContentRecord:
    id: str
    platform: PlatformKey
    channel: PlatformChannel
    content_type: ContentType
    source_url: str | None
    content_text: str
    content_html: str | None
    author_name: str
    author_id: str | None
    target_author_name: str | None
    target_author_id: str | None
    publish_time: str
    collected_at: str
    tags: list[str] = field(default_factory=list)
    risk_signals: list[str] = field(default_factory=list)
    moderation_status: str = "pending"
    moderation_reason: str | None = None
    review_trace: list[ReviewTraceItem] = field(default_factory=list)
    attachments: list[AttachmentItem] = field(default_factory=list)
    platform_metadata: dict[str, Any] = field(default_factory=dict)
    thread_id: str | None = None
    post_id: str | None = None
    comment_id: str | None = None
    parent_id: str | None = None
    conversation_id: str | None = None
    message_id: str | None = None
    direction: MessageDirection | None = None
    receiver_id: str | None = None
    receiver_name: str | None = None
    is_first_contact: bool | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
