"""Build Signal Archive icons from the darker embossed alien."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

# Prefer the committed dark master asset.
source_path = ROOT / "public" / "icon-dark-512x512.png"
if not source_path.exists():
    raise SystemExit(f"missing {source_path}")

source = Image.open(source_path).convert("RGBA")


def write_png(path: Path, image: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG")
    print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")


write_png(ROOT / "src" / "app" / "icon.png", source)
write_png(ROOT / "public" / "icon-512x512.png", source)
write_png(ROOT / "public" / "alien-512.png", source)
write_png(ROOT / "public" / "alien-dark-512.png", source)
write_png(ROOT / "public" / "icon-maskable-512x512.png", source)
write_png(ROOT / "public" / "alien-maskable-512.png", source)
write_png(ROOT / "public" / "alien-dark-maskable-512.png", source)

im192 = source.resize((192, 192), Image.Resampling.LANCZOS)
write_png(ROOT / "public" / "icon-192x192.png", im192)
write_png(ROOT / "public" / "alien-192.png", im192)
write_png(ROOT / "public" / "alien-dark-192.png", im192)

im180 = source.resize((180, 180), Image.Resampling.LANCZOS).convert("RGB")
write_png(ROOT / "public" / "apple-touch-icon.png", im180)

im32 = source.resize((32, 32), Image.Resampling.LANCZOS)
write_png(ROOT / "public" / "alien-32.png", im32)
write_png(ROOT / "public" / "alien-dark-32.png", im32)
write_png(ROOT / "public" / "icon-32x32.png", im32)

sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (256, 256)]
favicon = ROOT / "public" / "favicon.ico"
source.save(favicon, format="ICO", sizes=sizes)
(ROOT / "src" / "app" / "favicon.ico").write_bytes(favicon.read_bytes())
print(f"wrote public/favicon.ico ({favicon.stat().st_size} bytes)")
print("dark icons ready")
