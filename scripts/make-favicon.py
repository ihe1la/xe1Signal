"""Restore the original light Pinterest alien icons and rebuild favicon.ico."""
from __future__ import annotations

import io
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def git_bytes(rev: str, path: str) -> bytes:
    return subprocess.check_output(["git", "show", f"{rev}:{path}"], cwd=ROOT)


def git_image(rev: str, path: str) -> Image.Image:
    return Image.open(io.BytesIO(git_bytes(rev, path))).convert("RGBA")


def write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    print(f"wrote {path.relative_to(ROOT)} ({len(data)} bytes)")


# Original Pinterest alien (light lavender), before the darker polish.
write(ROOT / "src" / "app" / "icon.png", git_bytes("41bde32", "src/app/icon.png"))
write(ROOT / "public" / "icon-192x192.png", git_bytes("a402052", "public/icon-192x192.png"))
write(ROOT / "public" / "icon-512x512.png", git_bytes("a402052", "public/icon-512x512.png"))
write(ROOT / "public" / "icon-maskable-512x512.png", git_bytes("a402052", "public/icon-maskable-512x512.png"))
write(ROOT / "public" / "apple-touch-icon.png", git_bytes("a402052", "public/apple-touch-icon.png"))

# New filenames so pinned PWAs cannot keep serving the old cached dark icon.
for src, dest in [
    ("icon-192x192.png", "alien-192.png"),
    ("icon-512x512.png", "alien-512.png"),
    ("icon-maskable-512x512.png", "alien-maskable-512.png"),
]:
    data = (ROOT / "public" / src).read_bytes()
    write(ROOT / "public" / dest, data)

source = Image.open(ROOT / "public" / "icon-512x512.png").convert("RGBA")
sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (256, 256)]
source.save(ROOT / "public" / "favicon.ico", format="ICO", sizes=sizes)
(ROOT / "src" / "app" / "favicon.ico").write_bytes((ROOT / "public" / "favicon.ico").read_bytes())
print(f"wrote public/favicon.ico ({(ROOT / 'public' / 'favicon.ico').stat().st_size} bytes)")

source.resize((32, 32), Image.Resampling.NEAREST).save(ROOT / "public" / "alien-32.png", format="PNG")
source.resize((32, 32), Image.Resampling.NEAREST).save(ROOT / "public" / "icon-32x32.png", format="PNG")
print("wrote public/alien-32.png")
print("restore complete")
