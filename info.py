from yt_dlp import YoutubeDL
from pprint import pprint
import sys

url = sys.argv[1:]
opts = {
    'ignoreerrors': True,
    'extract_flat': True
}
links = []


def is_playlist(link):
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(link, download=False)
        if 'entries' in info:
            for i in range(len(info['entries'])):
                links.append(info['entries'][i]['webpage_url'])
        else:
            links.append(link)

if isinstance(url, list):
    for i in range(len(url)):
        is_playlist(url[i])
else:
    is_playlist(url)

print(links)
