# -*- coding: utf-8 -*-
import time
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

OUTPUT_FILE = Path(__file__).resolve().parent.parent / "data" / "raw" / "comments.xlsx"

# 定义一个函数，用于发送HTTP请求获取特定页面的HTML内容
def get_html(page_num):
    # cookies用于模拟浏览器身份，可能需要根据实际情况更新
    cookies = {
        'bid': 'U9EqvqHAbCY',
        '_pk_id.100001.4cf6': 'f14817584627635d.1732759574.',
        'll': '"118238"',
        '__yadk_uid': 'BSkX5pJpiPK9bqk2QuFmtTDesSSlEz8O',
        '_vwo_uuid_v2': 'DDDB98C5184B5FEE80B09C732FFABCDD1|7fe6ef3228409e0ec72364dfaec88672',
        '_pk_ref.100001.4cf6': '%5B%22%22%2C%22%22%2C1733148911%2C%22https%3A%2F%2Fwww.baidu.com%2Flink%3Furl%3Dpua9DnQahPq9iQYofjZIyYX46qpUqBGDLddDcO51MtnXMQRB3ZbeKlUeP1DcWzzL%26wd%3D%26eqid%3Dfde0c19a00015ca700000002674dc0eb%22%5D',
        '_pk_ses.100001.4cf6': '1',
        'ap_v': '0,6.0',
        '__utma': '30149280.481643990.1732730679.1732759612.1733148912.4',
        '__utmb': '30149280.0.10.1733148912',
        '__utmc': '30149280',
        '__utmz': '30149280.1733148912.4.4.utmcsr=baidu|utmccn=(organic)|utmcmd=organic',
        '__utma': '223695111.1961533888.1732759577.1732759612.1733148912.3',
        '__utmb': '223695111.0.10.1733148912',
        '__utmc': '223695111',
        '__utmz': '223695111.1733148912.3.3.utmcsr=baidu|utmccn=(organic)|utmcmd=organic',
    }
    # headers用于模拟浏览器请求头，可能需要根据实际情况更新
    headers = {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'referer': 'https://movie.douban.com/subject/36154853/comments?start=60&limit=20&status=P&sort=new_score',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    }
    # params用于构造请求参数
    params = {
        'percent_type': '',
        'start': page_num * 20,  # 计算评论的起始位置
        'limit': '20',  # 每页请求的评论数
        'status': 'P',
        'sort': 'new_score',
        'comments_only': '1',
    }
    # 发送GET请求，获取页面HTML
    response = requests.get('https://movie.douban.com/subject/36154853/comments', params=params, cookies=cookies, headers=headers)
    # 如果请求成功，返回HTML内容
    if response.status_code == 200:
        return response.json()['html']
    else:
        # 如果请求失败，打印错误状态码和响应内容
        print(response.status_code)
        print(response.text)
        return None

# 程序
if __name__ == '__main__':
    comments_list = []  # 初始化评论列表
    print("开始爬取评论....")  # 打印开始爬取评论的信息
    # 循环爬取6页评论
    for i in range(6):
        time.sleep(2)  # 每请求一次，等待2秒，避免频繁请求被封IP
        html = get_html(i)  # 获取HTML内容
        # 如果获取成功，使用BeautifulSoup解析HTML
        if html:
            soup = BeautifulSoup(html, "html.parser")
            elements = soup.select("div.comment")  # 选择所有评论元素
            for element in elements:
                # 提取评论信息
                author = element.select("h3 > span.comment-info > a")[0].text
                rank = element.select("h3 > span.comment-info > span:nth-child(3)")[0].get('title')
                comment_time = element.select("span.comment-info > span.comment-time")[0].text
                ip = element.select("h3 > span.comment-info > span.comment-location")[0].text
                comment = element.select("p > span")[0].text
                # 将评论信息存储到字典中
                temporary = {
                    "author": author.strip(),
                    "rank": rank,
                    "comment_time": comment_time.strip(),
                    "ip": ip.strip(),
                    "comment": comment.strip()
                }
                print(temporary)  # 打印评论信息
                comments_list.append(temporary)  # 添加到评论列表
    # 将评论列表保存到Excel文件
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(comments_list).to_excel(OUTPUT_FILE, index=False)
    print("爬取数据完毕....")  # 打印完成信息
    print("已保存为comments.xlsx文件")  # 打印保存信息
