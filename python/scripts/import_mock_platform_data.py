from __future__ import annotations

from pathlib import Path

from python.crawler.common.normalizer import write_jsonl
from python.crawler.douban.normalizer import normalize_douban_item
from python.crawler.tieba.normalizer import normalize_tieba_item
from python.crawler.weibo.normalizer import normalize_weibo_item


ROOT_DIR = Path(__file__).resolve().parents[2]
OUTPUT_PATH = ROOT_DIR / "python" / "data" / "normalized" / "mock_platform_content.jsonl"


MOCK_PAYLOADS = [
    {
        "id": "weibo-py-001",
        "platform": "weibo",
        "channel": "public_comment",
        "content_type": "comment",
        "source_url": "https://weibo.example.com/post/1#comment-1",
        "content_text": "微博评论 mock 数据。",
        "author_name": "微博用户",
        "author_id": "wb_py_001",
        "publish_time": "2026-03-27 10:00",
        "collected_at": "2026-03-27 10:05",
        "tags": ["微博", "mock"],
        "risk_signals": [],
        "platform_metadata": {"topic": "#mock#"},
    },
    {
        "id": "douban-py-001",
        "platform": "douban",
        "channel": "private_message",
        "content_type": "conversation_message",
        "source_url": "https://douban.example.com/messages/1",
        "content_text": "豆瓣私信 mock 数据。",
        "author_name": "豆瓣用户",
        "author_id": "db_py_001",
        "publish_time": "2026-03-27 10:10",
        "collected_at": "2026-03-27 10:12",
        "tags": ["豆瓣", "mock"],
        "risk_signals": ["sensitive_private_message"],
        "platform_metadata": {"group_name": "mock 小组"},
        "conversation_id": "db-conv-001",
        "message_id": "db-msg-001",
        "direction": "inbound",
        "receiver_name": "审稿Bot",
        "receiver_id": "db_bot_001",
        "is_first_contact": True,
    },
    {
        "id": "tieba-py-001",
        "platform": "tieba",
        "channel": "public_comment",
        "content_type": "thread_reply",
        "source_url": "https://tieba.example.com/p/1?pid=2",
        "content_text": "贴吧楼层回复 mock 数据。",
        "author_name": "吧友",
        "author_id": "tb_py_001",
        "publish_time": "2026-03-27 10:15",
        "collected_at": "2026-03-27 10:18",
        "tags": ["贴吧", "mock"],
        "risk_signals": ["thread_bumping"],
        "platform_metadata": {"forum_name": "校园吧", "floor": 8},
    },
]


def main() -> None:
    normalizers = {
        "weibo": normalize_weibo_item,
        "douban": normalize_douban_item,
        "tieba": normalize_tieba_item,
    }
    records = [normalizers[payload["platform"]](payload) for payload in MOCK_PAYLOADS]
    output = write_jsonl(records, OUTPUT_PATH)
    print(f"wrote {len(records)} records to {output}")


if __name__ == "__main__":
    main()
