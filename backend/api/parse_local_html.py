import csv
import os

from bs4 import BeautifulSoup


HTML_DIR = "html"
OUTPUT_PATH = os.path.join("data", "raw", "comments_manual.csv")


def parse_file(filepath, filename):
    rows = []

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            html = f.read()

        soup = BeautifulSoup(html, "html.parser")
        items = soup.select(".comment-item")
        print(filename, "->", len(items))

        for item in items:
            try:
                comment = item.select_one(".short").text.strip()
                if not comment:
                    continue
                rows.append([filename, comment])
            except Exception:
                continue
    except Exception as e:
        print("failed to parse", filename, ":", e)

    return rows


def main():
    rows = []

    if not os.path.isdir(HTML_DIR):
        print("html directory not found:", HTML_DIR)
        return

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    for filename in os.listdir("html"):
        if filename.endswith(".html"):
            filepath = os.path.join(HTML_DIR, filename)
            rows.extend(parse_file(filepath, filename))

    with open(OUTPUT_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["source", "comment"])
        writer.writerows(rows)

    print("total:", len(rows))
    print("saved:", OUTPUT_PATH)


if __name__ == "__main__":
    main()


# 运行方式：
# py parse_local_html.py
#
# 说明：
# 1. 该方法比 requests / selenium 爬虫更稳定，因为评论页面由浏览器手动打开和保存，
#    避开了登录校验、频率限制、反爬策略变化、动态加载不完整等问题。
# 2. 该方法适用于当前项目，因为它直接解析本地 HTML 文件，不依赖在线抓取流程，
#    可以绕过豆瓣反爬带来的不稳定性，稳定产出 CSV 数据供后续清洗和评测使用。
# 3. 数据规模可以通过“多电影 + 多分页”继续扩展，只需把更多保存好的页面放进 html/
#    目录，例如 movie1_page1.html、movie1_page2.html、movie2_page1.html，脚本会自动遍历汇总。
