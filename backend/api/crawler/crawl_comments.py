# -*- coding: utf-8 -*-
r"""Configurable Selenium crawler for Douban movie short comments.

运行前注意：
1. 请先关闭所有正在占用目标 profile 的 Chrome 进程。
2. profile 目录需要提前在本机登录豆瓣。
3. 当前脚本会先启动普通 Chrome，再通过 remote debugging 让 Selenium 接管，
   避免直接由 ChromeDriver 新建受控浏览器导致被豆瓣重定向到首页。
"""

from __future__ import annotations

import argparse
import csv
import os
print("RUNNING FILE:", os.path.abspath(__file__))
import random
import socket
import subprocess
import time
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import (
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
    WebDriverException,
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.webdriver import WebDriver
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

DEFAULT_MAX_PAGES = 10
WAIT_TIMEOUT = 15
SLEEP_RANGE = (3.0, 6.0)
PROFILE_ROOT = Path(r"C:\Users\ysh\AppData\Local\ChromeSeleniumProfile")
PROFILE_DIRECTORY = "Default"
REMOTE_DEBUGGING_HOST = "127.0.0.1"
REMOTE_DEBUGGING_PORT = 9222
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "data" / "raw" / "comments.csv"
CSV_COLUMNS = [
    "movie_name",
    "subject_id",
    "author",
    "rank",
    "comment_time",
    "ip",
    "comment",
]

# Edit this list to crawl more movies. Each item needs a Douban subject ID.
MOVIES = [
    {"movie_name": "婵犲ň鍓濋惈娆戠棯?", "subject_id": "35766491"},
    {"movie_name": "婵炵繝鐒﹀顕€宕烽幍顔藉€?", "subject_id": "35267208"},
    {"movie_name": "閻庢稏鍊栭弫鐐寸▔閳ь剟骞?", "subject_id": "35267209"},
    {"movie_name": "婵炴垵鐗嗛妵鎴︽儍閸曨偁鍋?", "subject_id": "30337388"},
    {"movie_name": "闁绘埈鍙€閼藉棗顭ㄥ鍗炲姰", "subject_id": "36081094"},
    {"movie_name": "濡炲鍋ら埞灞剧閾忚鏅?", "subject_id": "36206098"},
    {"movie_name": "妤犵偟绻濈槐鐗堢▔瀹ュ牆鍘撮柛?", "subject_id": "35503118"},
]
# {
#     "movie_name": "Another Movie",
#     "subject_id": "replace_with_douban_subject_id",
# },


def find_chrome_executable() -> str:
    candidates = [
        Path(os.environ.get("LOCALAPPDATA", "")) / "Google" / "Chrome" / "Application" / "chrome.exe",
        Path(os.environ.get("PROGRAMFILES", "")) / "Google" / "Chrome" / "Application" / "chrome.exe",
        Path(os.environ.get("PROGRAMFILES(X86)", "")) / "Google" / "Chrome" / "Application" / "chrome.exe",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    raise FileNotFoundError("Cannot find chrome.exe. Please install Google Chrome first.")


def wait_for_debug_port(host: str, port: int, timeout: float = 15.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1):
                return
        except OSError:
            time.sleep(0.3)
    raise TimeoutError(f"Chrome remote debugging port is not ready: {host}:{port}")


def launch_debug_chrome() -> subprocess.Popen:
    chrome_executable = find_chrome_executable()
    command = [
        chrome_executable,
        f"--remote-debugging-port={REMOTE_DEBUGGING_PORT}",
        f"--user-data-dir={PROFILE_ROOT}",
        f"--profile-directory={PROFILE_DIRECTORY}",
        "--lang=zh-CN",
        "--window-size=1400,1000",
        "--disable-blink-features=AutomationControlled",
        "https://www.douban.com/",
    ]
    process = subprocess.Popen(command)
    wait_for_debug_port(REMOTE_DEBUGGING_HOST, REMOTE_DEBUGGING_PORT)
    return process


def is_redirected_to_douban_home(driver: WebDriver) -> bool:
    current_url = (driver.current_url or "").rstrip("/")
    title = driver.title or ""
    return current_url == "https://movie.douban.com" and "豆瓣电影" in title


def build_driver() -> tuple[WebDriver, subprocess.Popen]:
    chrome_process = launch_debug_chrome()

    options = Options()
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--start-maximized")
    options.add_argument("--disable-infobars")
    options.add_argument("--disable-extensions")
    options.add_experimental_option(
        "debuggerAddress", f"{REMOTE_DEBUGGING_HOST}:{REMOTE_DEBUGGING_PORT}"
    )

    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(45)

    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {
            "source": """
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['zh-CN', 'zh']
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            """
        },
    )
    driver.execute_cdp_cmd("Network.enable", {})
    driver.execute_cdp_cmd(
        "Network.setUserAgentOverride",
        {
            "userAgent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            ),
            "acceptLanguage": "zh-CN,zh;q=0.9,en;q=0.8",
            "platform": "Windows",
        },
    )

    print(f"USING PROFILE ROOT: {PROFILE_ROOT}")
    print(f"USING PROFILE DIRECTORY: {PROFILE_DIRECTORY}")
    print(f"REMOTE DEBUGGING: {REMOTE_DEBUGGING_HOST}:{REMOTE_DEBUGGING_PORT}")

    return driver, chrome_process


def save_debug_snapshot(driver: WebDriver, prefix: str) -> None:
    timestamp = int(time.time())
    debug_dir = Path(__file__).resolve().parent
    screenshot_path = debug_dir / f"{prefix}_{timestamp}.png"
    html_path = debug_dir / f"{prefix}_{timestamp}.html"
    try:
        driver.save_screenshot(str(screenshot_path))
        print("saved_screenshot:", screenshot_path)
    except WebDriverException as screenshot_exc:
        print(f"save_screenshot failed: {screenshot_exc}")
    try:
        html_path.write_text(driver.page_source, encoding="utf-8")
        print("saved_html:", html_path)
    except OSError as html_exc:
        print(f"save_html failed: {html_exc}")


def open_page_with_retry(driver: WebDriver, url: str, max_retries: int = 3) -> bool:
    """Open a page with retries and wait for comment items to appear."""
    for attempt in range(1, max_retries + 1):
        try:
            driver.get("https://movie.douban.com/")
            time.sleep(random.uniform(3, 6))
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2)")
            time.sleep(random.uniform(1, 2))
            driver.get(url)
            WebDriverWait(driver, WAIT_TIMEOUT).until(
                lambda current_driver: (
                    bool(current_driver.find_elements(By.CSS_SELECTOR, "div.comment-item"))
                    or is_redirected_to_douban_home(current_driver)
                )
            )
            if is_redirected_to_douban_home(driver):
                raise TimeoutException(
                    "Redirected to Douban movie home page instead of the target comments page"
                )
            return True
        except (TimeoutException, WebDriverException) as exc:
            print(f"[retry {attempt}/{max_retries}] open failed: {exc}")
            print("current_url:", driver.current_url)
            print("title:", driver.title)
            save_debug_snapshot(driver, "debug_open_page")
            try:
                driver.get("https://movie.douban.com/")
                time.sleep(random.uniform(3, 6))
                driver.get(url)
            except WebDriverException as retry_exc:
                print(f"[retry {attempt}/{max_retries}] second visit failed: {retry_exc}")
            time.sleep(random.uniform(3, 6))
    return False


def parse_comment_items(
    driver: WebDriver, movie_name: str, subject_id: str
) -> list[dict[str, str]]:
    """Parse visible short comments from the current rendered page."""
    rows: list[dict[str, str]] = []

    try:
        WebDriverWait(driver, WAIT_TIMEOUT).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.comment-item"))
        )
    except TimeoutException:
        return rows

    try:
        comment_elements = driver.find_elements(By.CSS_SELECTOR, "div.comment-item")
    except WebDriverException as exc:
        print(f"[{movie_name}] failed to locate comment items: {exc}")
        return rows

    for element in comment_elements:
        try:
            author = ""
            rank = ""
            comment_time = ""
            ip = ""
            comment = ""

            author_elements = element.find_elements(By.CSS_SELECTOR, "span.comment-info a")
            if author_elements:
                author = author_elements[0].text.strip()

            rank_elements = element.find_elements(
                By.CSS_SELECTOR, "span.comment-info span[class*='allstar']"
            )
            if rank_elements:
                rank = (rank_elements[0].get_attribute("title") or "").strip()

            time_elements = element.find_elements(
                By.CSS_SELECTOR, "span.comment-info span.comment-time"
            )
            if time_elements:
                comment_time = time_elements[0].text.strip()

            ip_elements = element.find_elements(
                By.CSS_SELECTOR, "span.comment-info span.comment-location"
            )
            if ip_elements:
                ip = ip_elements[0].text.strip()

            short_comment_elements = element.find_elements(By.CSS_SELECTOR, "span.short")
            if short_comment_elements:
                comment = short_comment_elements[0].text.strip()

            rows.append(
                {
                    "movie_name": movie_name,
                    "subject_id": subject_id,
                    "author": author,
                    "rank": rank,
                    "comment_time": comment_time,
                    "ip": ip,
                    "comment": comment,
                }
            )
        except (NoSuchElementException, StaleElementReferenceException) as exc:
            print(f"[{movie_name}] skipped one comment item due to parse error: {exc}")

    return rows


def go_to_next_page(driver: WebDriver) -> bool:
    """Click the next-page button when available and wait for page content to change."""
    current_url = driver.current_url
    current_first = ""

    try:
        current_items = driver.find_elements(By.CSS_SELECTOR, "div.comment-item")
        if current_items:
            current_first = current_items[0].text.strip()

        next_buttons = driver.find_elements(By.CSS_SELECTOR, "a.next")
        if not next_buttons:
            return False

        next_button = next_buttons[0]
        if not next_button.is_displayed() or not next_button.is_enabled():
            return False

        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", next_button)
        WebDriverWait(driver, WAIT_TIMEOUT).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "a.next"))
        )
        next_button.click()

        def page_changed(current_driver: WebDriver) -> bool:
            try:
                if is_redirected_to_douban_home(current_driver):
                    return True
                if current_driver.current_url != current_url:
                    return True
                new_items: list[WebElement] = current_driver.find_elements(
                    By.CSS_SELECTOR, "div.comment-item"
                )
                if not new_items:
                    return False
                return new_items[0].text.strip() != current_first
            except StaleElementReferenceException:
                return True

        WebDriverWait(driver, WAIT_TIMEOUT).until(page_changed)
        if is_redirected_to_douban_home(driver):
            print("Redirected to Douban movie home page after clicking next page")
            return False
        return True
    except (TimeoutException, WebDriverException) as exc:
        print(f"Failed to go to next page: {exc}")
        return False


def crawl_movie(
    driver: WebDriver, movie_name: str, subject_id: str, max_pages: int
) -> list[dict[str, str]]:
    """Crawl short comments for a single movie."""
    url = f"https://movie.douban.com/subject/{subject_id}/comments?status=P"
    rows: list[dict[str, str]] = []
    seen_keys: set[tuple[str, str, str, str]] = set()
    seen_first_comments: set[tuple[str, str, str]] = set()
    seen_page_signatures: set[tuple[tuple[str, str, str], ...]] = set()

    print(f"[{movie_name}] start crawling: {url}")
    ok = open_page_with_retry(driver, url)
    if not ok:
        print(f"[{movie_name}] failed to open first page, skip movie")
        print("current_url:", driver.current_url)
        print("title:", driver.title)
        return []

    for page_number in range(1, max_pages + 1):
        try:
            page_rows = parse_comment_items(driver, movie_name, subject_id)
        except Exception as exc:
            print(f"[{movie_name}] page {page_number}: parse error {exc}, skip page")
            print("current_url:", driver.current_url)
            print("title:", driver.title)
            continue
        page_rows = [row for row in page_rows if row["comment"]]

        if not page_rows:
            print(f"[{movie_name}] page {page_number}: empty page, retry once")
            print("current_url:", driver.current_url)
            print("title:", driver.title)
            time.sleep(random.uniform(2, 4))
            try:
                page_rows = parse_comment_items(driver, movie_name, subject_id)
            except Exception as exc:
                print(f"[{movie_name}] page {page_number}: parse error {exc}, skip page")
                print("current_url:", driver.current_url)
                print("title:", driver.title)
                continue
            page_rows = [row for row in page_rows if row["comment"]]

            if not page_rows:
                print(f"[{movie_name}] page {page_number}: confirmed empty, stop")
                print("current_url:", driver.current_url)
                print("title:", driver.title)
                break

        page_signature = tuple(
            (row["author"], row["comment_time"], row["comment"]) for row in page_rows
        )
        first_comment_signature = page_signature[0]

        if first_comment_signature in seen_first_comments:
            print(
                f"[{movie_name}] page {page_number}: comments found={len(page_rows)}, "
                f"current unique total={len(rows)}"
            )
            print(f"[{movie_name}] page {page_number}: early stop, repeated first comment detected")
            break

        if page_signature in seen_page_signatures:
            print(
                f"[{movie_name}] page {page_number}: comments found={len(page_rows)}, "
                f"current unique total={len(rows)}"
            )
            print(f"[{movie_name}] page {page_number}: early stop, repeated page signature detected")
            break

        seen_first_comments.add(first_comment_signature)
        seen_page_signatures.add(page_signature)

        for row in page_rows:
            dedup_key = (
                row["movie_name"],
                row["author"],
                row["comment_time"],
                row["comment"],
            )
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)
            rows.append(row)

        print(
            f"[{movie_name}] page {page_number}: comments found={len(page_rows)}, "
            f"current unique total={len(rows)}"
        )

        if page_number >= max_pages:
            break

        sleep_seconds = random.uniform(*SLEEP_RANGE)
        time.sleep(sleep_seconds)

        success = go_to_next_page(driver)
        if not success:
            print(f"[{movie_name}] next page failed, retry once")
            print("current_url:", driver.current_url)
            print("title:", driver.title)
            time.sleep(random.uniform(2, 4))
            success = go_to_next_page(driver)

            if not success:
                print(f"[{movie_name}] page {page_number}: early stop, next page unavailable")
                print("current_url:", driver.current_url)
                print("title:", driver.title)
                break

    return rows


def save_to_csv(rows: list[dict[str, str]], output_path: Path) -> None:
    """Save all rows into one CSV file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    """Crawl configured movies and save all deduplicated rows into one CSV."""
    parser = argparse.ArgumentParser(
        description="Crawl Douban movie short comments with Selenium."
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=DEFAULT_MAX_PAGES,
        help="Maximum pages to crawl per movie.",
    )
    args = parser.parse_args()

    driver: WebDriver | None = None
    chrome_process: subprocess.Popen | None = None
    all_rows: list[dict[str, str]] = []
    failed_movies: list[dict[str, str]] = []
    success_movies = 0
    global_seen_keys: set[tuple[str, str, str, str]] = set()

    try:
        driver, chrome_process = build_driver()

        for movie in MOVIES:
            movie_name = str(movie["movie_name"]).strip()
            subject_id = str(movie["subject_id"]).strip()

            if not movie_name or not subject_id:
                print(f"Skip invalid movie config: {movie}")
                continue

            try:
                movie_rows = crawl_movie(driver, movie_name, subject_id, args.max_pages)
            except TimeoutError as exc:
                error_reason = f"TimeoutError: {exc}"
                failed_movies.append(
                    {
                        "movie_name": movie_name,
                        "subject_id": subject_id,
                        "reason": error_reason,
                    }
                )
                print(
                    f"[FAILED] movie_name={movie_name}, subject_id={subject_id}, "
                    f"reason={error_reason}"
                )
                continue
            except TimeoutException as exc:
                error_reason = f"TimeoutException: {exc}"
                failed_movies.append(
                    {
                        "movie_name": movie_name,
                        "subject_id": subject_id,
                        "reason": error_reason,
                    }
                )
                print(
                    f"[FAILED] movie_name={movie_name}, subject_id={subject_id}, "
                    f"reason={error_reason}"
                )
                continue
            except WebDriverException as exc:
                error_reason = f"WebDriverException: {exc}"
                failed_movies.append(
                    {
                        "movie_name": movie_name,
                        "subject_id": subject_id,
                        "reason": error_reason,
                    }
                )
                print(
                    f"[FAILED] movie_name={movie_name}, subject_id={subject_id}, "
                    f"reason={error_reason}"
                )
                continue
            except Exception as exc:
                error_reason = f"Unexpected Exception: {exc}"
                failed_movies.append(
                    {
                        "movie_name": movie_name,
                        "subject_id": subject_id,
                        "reason": error_reason,
                    }
                )
                print(
                    f"[FAILED] movie_name={movie_name}, subject_id={subject_id}, "
                    f"reason={error_reason}"
                )
                continue

            for row in movie_rows:
                dedup_key = (
                    row["movie_name"],
                    row["author"],
                    row["comment_time"],
                    row["comment"],
                )
                if dedup_key in global_seen_keys:
                    continue
                global_seen_keys.add(dedup_key)
                all_rows.append(row)

            success_movies += 1

        save_to_csv(all_rows, OUTPUT_FILE)
        print(f"Saved {len(all_rows)} unique comments to {OUTPUT_FILE}")
        print(f"Total success movies: {success_movies}")
        print(f"Total failed movies: {len(failed_movies)}")
        print("Failed movie list:")
        for failed_movie in failed_movies:
            print(
                f"- movie_name={failed_movie['movie_name']}, "
                f"subject_id={failed_movie['subject_id']}, "
                f"reason={failed_movie['reason']}"
            )
    finally:
        if driver is not None:
            driver.quit()
        if chrome_process is not None and chrome_process.poll() is None:
            chrome_process.terminate()


if __name__ == "__main__":
    main()
