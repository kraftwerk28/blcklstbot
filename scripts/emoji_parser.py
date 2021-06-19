from bs4 import BeautifulSoup
import requests
import sys
import json

url = "https://character.construction/emoji-categories"
resp = requests.get(url)
resp.encoding = "utf-8"
soup = BeautifulSoup(resp.text, "lxml")
emoji_id = 0

categories = []
for table in soup.select("article.post > h3 + table"):
    h3 = table.find_previous()
    emojis = []
    for emoji in table.select("tbody tr"):
        codes = [
            s[2:] for s in
            emoji.select_one("td:nth-child(3)").decode_contents().split("<br/>")
        ]
        emojis.append({
            "id": emoji_id,
            "name": emoji.select_one("td:nth-child(1)").text,
            "emoji": emoji.select_one("td:nth-child(2) span").text,
            "codes": codes,
        })
        emoji_id += 1
    categories.append({
        "name": h3.attrs["id"],
        "title": h3.text,
        "emojis": emojis,
    })

result = {"categories": categories}

with open(sys.argv[1], 'w') as out_file:
    json.dump(result, out_file, indent=2, ensure_ascii=False)
