#!/usr/bin/env python3
"""Refresh Bilibili hot-comment snapshots for the blog.

Reads BV ids from .github/bili-videos.txt (one per line), fetches each
video's hot comments from Bilibili's public reply API (requests carry
no Origin/Referer, which is what Bilibili's edge requires), and writes
slim snapshots to source/data/bili-comments/<bvid>.json. Exits non-zero
if any fetch fails so a broken run is visible in the Actions log.
"""
import json
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIST_FILE = ROOT / ".github" / "bili-videos.txt"
OUT_DIR = ROOT / "source" / "data" / "bili-comments"

XOR_CODE = 23442827791579
MASK_CODE = 2251799813685247
BASE = 58
TABLE = "FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf"


def bv2av(bvid: str) -> int:
    chars = list(bvid)
    chars[3], chars[9] = chars[9], chars[3]
    chars[4], chars[7] = chars[7], chars[4]
    tmp = 0
    for ch in chars[3:]:
        tmp = tmp * BASE + TABLE.index(ch)
    return (tmp & MASK_CODE) ^ XOR_CODE


def fetch_comments(aid: int) -> list:
    url = (
        "https://api.bilibili.com/x/v2/reply/main"
        f"?oid={aid}&type=1&mode=3&ps=20"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    if payload.get("code") != 0:
        raise RuntimeError(f"bilibili api code={payload.get('code')}")
    data = payload["data"]
    seen, out = set(), []

    def push(arr):
        for c in arr or []:
            if c["rpid"] in seen:
                continue
            seen.add(c["rpid"])
            out.append(
                {
                    "uname": c["member"]["uname"],
                    "avatar": c["member"]["avatar"],
                    "message": c["content"]["message"],
                    "like": c.get("like", 0),
                    "ctime": c.get("ctime", 0),
                    "rcount": c.get("rcount", 0),
                }
            )

    push(data.get("top_replies"))
    push(data.get("replies"))
    return out[:12]


def main() -> int:
    bvids = [
        line.strip()
        for line in LIST_FILE.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    if not bvids:
        print("no BV ids listed, nothing to do")
        return 0
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    failed = False
    for bvid in bvids:
        try:
            comments = fetch_comments(bv2av(bvid))
        except Exception as exc:  # noqa: BLE001 - report and mark run failed
            print(f"ERROR {bvid}: {exc}")
            failed = True
            continue
        snapshot = {
            "bvid": bvid,
            "fetched_at": int(time.time()),
            "comments": comments,
        }
        (OUT_DIR / f"{bvid}.json").write_text(
            json.dumps(snapshot, ensure_ascii=False, indent=1), encoding="utf-8"
        )
        print(f"OK {bvid}: {len(comments)} comments")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
