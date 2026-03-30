# -*- coding: utf-8 -*-
"""Fast Douban short-comment crawler based on requests + BeautifulSoup."""

from __future__ import annotations

import argparse
import csv
import random
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from requests.exceptions import RequestException, Timeout

DEFAULT_MAX_PAGES = 5
REQUEST_TIMEOUT = 15
PAGE_SIZE = 20
PAGE_SLEEP_RANGE = (4.0, 8.0)
MOVIE_SLEEP_RANGE = (20.0, 40.0)
RETRY_BACKOFF_SECONDS = (30, 60, 120)
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "data" / "raw" / "comments.csv"
CSV_COLUMNS = ["movie_name", "subject_id", "comment"]
BASE_URL = (
    "https://movie.douban.com/subject/{subject_id}/comments"
    "?start={start}&limit=20&status=P&sort=new_score"
)
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Referer": "https://movie.douban.com/",
    "Accept-Language": "zh-CN,zh;q=0.9",
}
COOKIES = {
    "bid": "...",
    "ll": '"118238"',
    "dbcl2": "...",
    "ck": "...",
}
MOVIES = [
    {"movie_name": "\u6ee1\u6c5f\u7ea2", "subject_id": "35766491"},
    {"movie_name": "\u6d41\u6d6a\u5730\u74032", "subject_id": "35267208"},
    {"movie_name": "\u5b64\u6ce8\u4e00\u63b7", "subject_id": "35209992"},
    {"movie_name": "\u5c01\u795e\u7b2c\u4e00\u90e8", "subject_id": "34780991"},
    {"movie_name": "\u70ed\u8fa3\u6eda\u70eb", "subject_id": "36081094"},
    {"movie_name": "\u98de\u9a70\u4eba\u751f2", "subject_id": "36204555"},
    {"movie_name": "\u6d88\u5931\u7684\u5979", "subject_id": "30337388"},
    {"movie_name": "\u7b2c\u4e8c\u5341\u6761", "subject_id": "36490484"},
    {"movie_name": "\u5e74\u4f1a\u4e0d\u80fd\u505c", "subject_id": "35503118"},
    {"movie_name": "\u516b\u89d2\u7b3c\u4e2d", "subject_id": "35575567"},
    {"movie_name": "\u4eba\u751f\u5927\u4e8b", "subject_id": "35068230"},
    {"movie_name": "\u957f\u6d25\u6e56", "subject_id": "25845392"},
    {"movie_name": "\u957f\u6d25\u6e56\u4e4b\u6c34\u95e8\u6865", "subject_id": "35284253"},
    {"movie_name": "\u6211\u548c\u6211\u7684\u7956\u56fd", "subject_id": "32659890"},
    {"movie_name": "\u6211\u4e0d\u662f\u836f\u795e", "subject_id": "26752088"},
    {"movie_name": "\u4f60\u597d\uff0c\u674e\u7115\u82f1", "subject_id": "34841067"},
    {"movie_name": "\u60ac\u5d16\u4e4b\u4e0a", "subject_id": "30335059"},
    {"movie_name": "\u9001\u4f60\u4e00\u6735\u5c0f\u7ea2\u82b1", "subject_id": "35096844"},
    {"movie_name": "\u4e2d\u56fd\u533b\u751f", "subject_id": "35068275"},
    {"movie_name": "\u72ec\u884c\u6708\u7403", "subject_id": "35131346"},
]


def build_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(HEADERS)
    return session


def fetch_with_retry(
    session: requests.Session, url: str, max_retries: int = 3
) -> requests.Response | None:
    for attempt in range(max_retries):
        try:
            response = session.get(url, headers=HEADERS, cookies=COOKIES, timeout=REQUEST_TIMEOUT)
            if response.status_code == 200:
                return response

            wait_seconds = RETRY_BACKOFF_SECONDS[min(attempt, len(RETRY_BACKOFF_SECONDS) - 1)]
            if response.status_code == 429:
                print(f"request 429 for {url}, retry {attempt + 1}/{max_retries} after {wait_seconds}s")
                if attempt == max_retries - 1:
                    return None
                time.sleep(wait_seconds)
                continue

            print(
                f"request failed for {url}, status_code={response.status_code}, "
                f"retry {attempt + 1}/{max_retries} after {wait_seconds}s"
            )
            if attempt == max_retries - 1:
                return None
            time.sleep(wait_seconds)
        except (Timeout, RequestException) as exc:
            wait_seconds = RETRY_BACKOFF_SECONDS[min(attempt, len(RETRY_BACKOFF_SECONDS) - 1)]
            print(
                f"request exception for {url}: {exc}, "
                f"retry {attempt + 1}/{max_retries} after {wait_seconds}s"
            )
            if attempt == max_retries - 1:
                return None
            time.sleep(wait_seconds)

    return None


def crawl_movie(
    session: requests.Session, movie_name: str, subject_id: str, max_pages: int = DEFAULT_MAX_PAGES
) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    for page_number in range(1, max_pages + 1):
        start = (page_number - 1) * PAGE_SIZE
        url = BASE_URL.format(subject_id=subject_id, start=start)

        response = fetch_with_retry(session, url)
        if response is None:
            print(f"[{movie_name}] page {page_number} failed, stop current movie")
            break

        soup = BeautifulSoup(response.text, "html.parser")
        comment_items = soup.select(".comment-item")
        if not comment_items:
            print(f"[{movie_name}] page {page_number} collected=0 total={len(rows)}")
            break

        page_rows: list[dict[str, str]] = []
        for item in comment_items:
            comment_node = item.select_one(".short")
            if comment_node is None:
                continue

            comment = comment_node.text.strip()
            if not comment:
                continue

            page_rows.append(
                {
                    "movie_name": movie_name,
                    "subject_id": subject_id,
                    "comment": comment,
                }
            )

        rows.extend(page_rows)
        print(f"[{movie_name}] page {page_number} collected={len(page_rows)} total={len(rows)}")
        time.sleep(random.uniform(*PAGE_SLEEP_RANGE))

    print(f"[{movie_name}] finished total={len(rows)}")
    return rows


def save_to_csv(rows: list[dict[str, str]], output_path: Path = OUTPUT_FILE) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Crawl Douban movie short comments with requests + BeautifulSoup."
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=DEFAULT_MAX_PAGES,
        help="Maximum pages to crawl per movie.",
    )
    args = parser.parse_args()

    session = build_session()
    all_rows: list[dict[str, str]] = []

    for movie in MOVIES:
        movie_name = str(movie["movie_name"]).strip()
        subject_id = str(movie["subject_id"]).strip()

        if not movie_name or not subject_id:
            print(f"skip invalid movie config: {movie}")
            continue

        print(f"current movie = {movie_name} ({subject_id})")
        movie_rows = crawl_movie(session, movie_name, subject_id, args.max_pages)
        all_rows.extend(movie_rows)
        time.sleep(random.uniform(*MOVIE_SLEEP_RANGE))

    save_to_csv(all_rows, OUTPUT_FILE)
    print(f"total comments = {len(all_rows)}")


if __name__ == "__main__":
    main()
