"""Builds the zip to upload to itch.io as an "HTML" game.

Usage:  python3 tools/make_itch_zip.py https://your-commercial-site.laravel.cloud SAHRA-YOURCODE
Writes docs/store/sahra-itch.zip (the page buyers see after paying).
"""
import pathlib
import sys
import zipfile

if len(sys.argv) != 3 or not sys.argv[1].startswith("https://"):
    sys.exit(__doc__)
url, code = sys.argv[1].rstrip("/") + "/", sys.argv[2].strip().upper()
root = pathlib.Path(__file__).resolve().parent.parent / "docs" / "store"
html = (root / "itch-launcher" / "index.html").read_text(encoding="utf-8")
html = html.replace("https://example.com/", url).replace("SAHRA-CODE", code)
out = root / "sahra-itch.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("index.html", html)
print("wrote", out)
