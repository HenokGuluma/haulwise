#!/usr/bin/env python3
"""Generate dark-surface-optimized brand images.

The source artwork (assets/Cober Freight.jpeg, assets/cober-text.jpeg) is on a
white background with navy elements — perfect for light surfaces, but it needs
a white plate to sit on the app's dark chrome. This produces transparent PNGs
where the white background becomes transparent and the dark navy is recolored
to off-white, so the logo drops straight onto the dark sidebar/hero and blends
(the light-blue and orange are kept as-is).

    python3 scripts/make-brand-assets.py

Requires Pillow (pip install Pillow).
"""
from PIL import Image
import os

LIGHT = (234, 240, 251)  # off-white the navy becomes (matches sidebar ink)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

JOBS = [
    ("assets/Cober Freight.jpeg", "public/logo-light.png"),
    ("assets/cober-text.jpeg", "public/cober-text-light.png"),
]


def convert(src, dst):
    im = Image.open(src).convert("RGB")
    px = im.load()
    w, h = im.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            mn = min(r, g, b)
            # Alpha ramps opaque (mn<=205) -> transparent (mn>=240) so only the
            # near-white background fades out and edges stay soft.
            if mn >= 240:
                continue
            a = 255 if mn <= 205 else int(round((240 - mn) / 35.0 * 255))
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            op[x, y] = (*LIGHT, a) if lum < 95 else (r, g, b, a)
    out.save(dst)
    print("wrote", dst, out.size)


if __name__ == "__main__":
    for src, dst in JOBS:
        convert(os.path.join(ROOT, src), os.path.join(ROOT, dst))
