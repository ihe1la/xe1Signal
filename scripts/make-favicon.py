from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Image.open(root / "public" / "icon-512x512.png").convert("RGBA")
sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (256, 256)]

favicon = root / "public" / "favicon.ico"
app_favicon = root / "src" / "app" / "favicon.ico"
source.save(favicon, format="ICO", sizes=sizes)
app_favicon.write_bytes(favicon.read_bytes())

png32 = root / "public" / "icon-32x32.png"
source.resize((32, 32), Image.Resampling.LANCZOS).save(png32, format="PNG")
print(f"wrote {favicon} ({favicon.stat().st_size} bytes)")
print(f"wrote {app_favicon}")
print(f"wrote {png32}")
