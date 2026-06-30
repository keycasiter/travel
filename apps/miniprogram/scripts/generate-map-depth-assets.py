#!/usr/bin/env python3
"""Generate local Hangzhou depth layers for the Mini Program home map."""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
MAP_DIR = ROOT / "assets" / "maps"
MASTER_IMAGE = REPO_ROOT / "docs" / "assets" / "maps" / "home-map-master.jpg"
BASE_IMAGE = MAP_DIR / "home-map-mobile.jpg"
CITY_FOCUS_IMAGE = MAP_DIR / "home-map-hangzhou-focus.jpg"
AREA_DETAIL_IMAGE = MAP_DIR / "home-map-hangzhou-areas.png"
POI_DETAIL_IMAGE = MAP_DIR / "home-map-hangzhou-poi-detail.png"
RUNTIME_WIDTH = 1800

HANGZHOU_CENTER = (73.0, 55.0)

AREAS = [
    ("westlake", 72.6, 54.7, (190, 139, 57, 142)),
    ("lingyin", 70.3, 55.7, (77, 115, 96, 126)),
    ("hubin", 74.4, 53.9, (158, 57, 43, 118)),
    ("shangcheng", 75.1, 55.8, (191, 143, 61, 120)),
    ("canal", 73.4, 51.6, (65, 111, 118, 112)),
    ("xixi", 68.8, 53.8, (82, 125, 95, 116)),
]

POIS = [
    (72.7, 54.6, "landmark"),
    (73.2, 53.8, "landmark"),
    (73.1, 55.8, "landmark"),
    (72.1, 54.2, "scenic"),
    (72.8, 54.1, "inspiration"),
    (70.6, 54.9, "scenic"),
    (70.4, 54.6, "scenic"),
    (69.8, 56.1, "food"),
    (70.5, 57.1, "scenic"),
    (74.4, 54.8, "landmark"),
    (74.3, 53.5, "food"),
    (75.2, 55.7, "food"),
    (75.0, 55.3, "landmark"),
    (73.5, 51.7, "inspiration"),
    (73.5, 51.3, "landmark"),
    (68.7, 53.8, "scenic"),
    (74.2, 54.6, "transport"),
    (76.3, 52.5, "transport"),
    (79.1, 58.6, "transport"),
    (72.6, 54.9, "transport"),
]


def main() -> None:
    if not MASTER_IMAGE.exists():
        raise SystemExit(f"missing map master image: {MASTER_IMAGE}")

    random.seed(20260701)
    master = Image.open(MASTER_IMAGE).convert("RGB")
    base = generate_runtime_base(master)
    generate_city_focus(base)
    generate_area_detail(base.size)
    generate_poi_detail(base.size)


def generate_runtime_base(master: Image.Image) -> Image.Image:
    target_height = round(master.height * (RUNTIME_WIDTH / master.width))
    runtime = master.resize((RUNTIME_WIDTH, target_height), Image.Resampling.LANCZOS)
    runtime = ImageEnhance.Sharpness(runtime).enhance(1.06)
    runtime.save(BASE_IMAGE, "JPEG", quality=78, optimize=True, progressive=True)
    return Image.open(BASE_IMAGE).convert("RGB")


def generate_city_focus(base: Image.Image) -> None:
    width, height = base.size
    cx, cy = point(width, height, *HANGZHOU_CENTER)

    softened = base.filter(ImageFilter.GaussianBlur(1.1))
    softened = ImageEnhance.Color(softened).enhance(0.9)
    paper = Image.new("RGB", base.size, (238, 231, 213))
    softened = Image.blend(softened, paper, 0.12)

    detailed = base.filter(ImageFilter.UnsharpMask(radius=2.1, percent=185, threshold=2))
    detailed = ImageEnhance.Contrast(detailed).enhance(1.1)
    detailed = ImageEnhance.Sharpness(detailed).enhance(1.18)

    mask = Image.new("L", base.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    rx = int(width * 0.22)
    ry = int(height * 0.16)
    mask_draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=225)
    mask = mask.filter(ImageFilter.GaussianBlur(int(width * 0.045)))

    focused = Image.composite(detailed, softened, mask)

    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        (cx - width * 0.045, cy - width * 0.045, cx + width * 0.045, cy + width * 0.045),
        fill=(197, 147, 57, 34),
        outline=(151, 54, 43, 55),
        width=max(2, int(width * 0.002)),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(int(width * 0.012)))
    focused = Image.alpha_composite(focused.convert("RGBA"), glow).convert("RGB")

    focused.save(CITY_FOCUS_IMAGE, "JPEG", quality=64, optimize=True, progressive=True)


def generate_area_detail(size: tuple[int, int]) -> None:
    width, height = size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))

    draw_hangzhou_context(layer, detail="area")

    for name, x, y, color in AREAS:
        px, py = point(width, height, x, y)
        blob = watercolor_blob(size, px, py, int(width * 0.05), int(height * 0.034), color, seed=name)
        layer = Image.alpha_composite(layer, blob)
        draw_area_strokes(layer, px, py, color)

    line = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(line)
    route = [point(width, height, x, y) for _, x, y, _ in AREAS]
    draw.line(route, fill=(62, 90, 79, 84), width=max(4, int(width * 0.0024)), joint="curve")
    line = line.filter(ImageFilter.GaussianBlur(1.2))
    layer = Image.alpha_composite(layer, line)

    layer.save(AREA_DETAIL_IMAGE, "PNG", optimize=True)


def generate_poi_detail(size: tuple[int, int]) -> None:
    width, height = size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    draw_hangzhou_context(layer, detail="poi")

    palette = {
        "landmark": ((157, 55, 42, 178), (213, 166, 67, 82)),
        "scenic": ((64, 108, 90, 158), (114, 145, 112, 72)),
        "food": ((144, 69, 44, 158), (208, 141, 67, 72)),
        "transport": ((56, 91, 108, 164), (87, 127, 144, 70)),
        "inspiration": ((92, 87, 69, 138), (168, 143, 93, 62)),
    }

    for index, (x, y, kind) in enumerate(POIS):
        px, py = point(width, height, x, y)
        main, wash = palette[kind]
        radius = int(width * (0.0056 if kind != "transport" else 0.0068))
        draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=main)
        draw.ellipse((px - radius * 4, py - radius * 4, px + radius * 4, py + radius * 4), outline=wash, width=2)
        draw_micro_strokes(draw, px, py, width, main, index)

    transport_points = [point(width, height, x, y) for x, y, kind in POIS if kind == "transport"]
    for first, second in zip(transport_points, transport_points[1:]):
        draw.line((first, second), fill=(45, 82, 103, 116), width=max(3, int(width * 0.0017)))

    for _ in range(520):
        x = random.uniform(68.2, 79.5)
        y = random.uniform(51.0, 59.0)
        px, py = point(width, height, x, y)
        length = random.randint(5, 18)
        angle = random.uniform(-0.9, 0.9)
        color = random.choice([(57, 83, 74, 64), (139, 97, 54, 58), (108, 128, 103, 54)])
        draw.line(
            (px, py, px + math.cos(angle) * length, py + math.sin(angle) * length),
            fill=color,
            width=random.choice([1, 1, 2]),
        )

    soft = layer.filter(ImageFilter.GaussianBlur(0.28))
    layer = Image.alpha_composite(soft, layer)
    layer.save(POI_DETAIL_IMAGE, "PNG", optimize=True)


def draw_hangzhou_context(layer: Image.Image, detail: str) -> None:
    width, height = layer.size
    draw = ImageDraw.Draw(layer)
    cx, cy = point(width, height, *HANGZHOU_CENTER)

    wash = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    wash_draw = ImageDraw.Draw(wash)
    points = []
    radius_x = width * 0.12
    radius_y = height * 0.092
    local_random = random.Random(f"context-{detail}")
    for step in range(30):
        angle = (math.tau * step) / 30
        jitter = local_random.uniform(0.76, 1.18)
        points.append((cx + math.cos(angle) * radius_x * jitter, cy + math.sin(angle) * radius_y * jitter))
    wash_draw.polygon(points, fill=(224, 208, 165, 42 if detail == "area" else 32))
    wash_draw.ellipse(
        (
            cx - int(width * 0.055),
            cy - int(height * 0.038),
            cx + int(width * 0.035),
            cy + int(height * 0.035),
        ),
        fill=(76, 128, 126, 42 if detail == "area" else 30),
        outline=(47, 88, 92, 84 if detail == "area" else 62),
        width=max(2, int(width * 0.0017)),
    )
    wash = wash.filter(ImageFilter.GaussianBlur(9 if detail == "area" else 7))
    layer.alpha_composite(wash)

    contour_alpha = 68 if detail == "area" else 82
    for index in range(22 if detail == "area" else 34):
        origin_x = random.uniform(68.0, 76.0)
        origin_y = random.uniform(52.0, 57.8)
        px, py = point(width, height, origin_x, origin_y)
        radius = random.uniform(width * 0.025, width * 0.072)
        squash = random.uniform(0.24, 0.48)
        start = random.uniform(-1.7, 1.2)
        points = []
        for step in range(18):
            angle = start + step * random.uniform(0.08, 0.13)
            points.append((px + math.cos(angle) * radius, py + math.sin(angle) * radius * squash))
        color = random.choice(
            [
                (51, 75, 62, contour_alpha),
                (88, 106, 82, contour_alpha - 14),
                (136, 92, 52, contour_alpha - 20),
            ]
        )
        draw.line(points, fill=color, width=random.choice([2, 2, 3, 4]))

    water_points = [
        point(width, height, 72.6, 54.0),
        point(width, height, 73.0, 54.4),
        point(width, height, 73.1, 55.0),
        point(width, height, 72.8, 55.5),
        point(width, height, 72.4, 55.1),
        point(width, height, 72.2, 54.5),
    ]
    draw.line(water_points, fill=(39, 88, 96, 96 if detail == "area" else 116), width=max(3, int(width * 0.0025)), joint="curve")
    canal = [
        point(width, height, 72.8, 51.0),
        point(width, height, 73.2, 51.7),
        point(width, height, 73.7, 52.4),
        point(width, height, 74.2, 53.0),
    ]
    draw.line(canal, fill=(45, 92, 102, 90 if detail == "area" else 112), width=max(3, int(width * 0.0021)), joint="curve")


def watercolor_blob(
    size: tuple[int, int],
    cx: int,
    cy: int,
    rx: int,
    ry: int,
    color: tuple[int, int, int, int],
    seed: str,
) -> Image.Image:
    width, height = size
    random_state = random.Random(seed)
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    points = []
    for step in range(22):
        angle = (math.tau * step) / 22
        jitter = random_state.uniform(0.72, 1.18)
        px = cx + math.cos(angle) * rx * jitter
        py = cy + math.sin(angle) * ry * jitter
        points.append((px, py))
    draw.polygon(points, fill=color[3])
    for _ in range(20):
        ox = random_state.randint(-rx, rx)
        oy = random_state.randint(-ry, ry)
        scale = random_state.uniform(0.28, 0.62)
        draw.ellipse(
            (cx + ox - rx * scale, cy + oy - ry * scale, cx + ox + rx * scale, cy + oy + ry * scale),
            fill=random_state.randint(16, color[3]),
        )
    mask = mask.filter(ImageFilter.GaussianBlur(max(12, int(rx * 0.42))))

    fill = Image.new("RGBA", size, color[:3] + (0,))
    fill.putalpha(mask)
    return fill


def draw_area_strokes(layer: Image.Image, cx: int, cy: int, color: tuple[int, int, int, int]) -> None:
    draw = ImageDraw.Draw(layer)
    width, _ = layer.size
    stroke_color = (max(25, color[0] - 50), max(25, color[1] - 45), max(25, color[2] - 35), 82)
    for index in range(8):
        start = -0.95 + index * 0.25
        radius = width * (0.012 + index * 0.0018)
        points = []
        for step in range(12):
            angle = start + step * 0.13
            points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius * 0.58))
        draw.line(points, fill=stroke_color, width=random.choice([2, 3]))


def draw_micro_strokes(draw: ImageDraw.ImageDraw, cx: int, cy: int, width: int, color: tuple[int, int, int, int], index: int) -> None:
    random_state = random.Random(index * 97)
    for _ in range(9):
        angle = random_state.uniform(0, math.tau)
        distance = random_state.uniform(width * 0.006, width * 0.018)
        length = random_state.uniform(width * 0.004, width * 0.014)
        sx = cx + math.cos(angle) * distance
        sy = cy + math.sin(angle) * distance * 0.72
        ex = sx + math.cos(angle + random_state.uniform(-0.9, 0.9)) * length
        ey = sy + math.sin(angle + random_state.uniform(-0.9, 0.9)) * length
        draw.line((sx, sy, ex, ey), fill=color[:3] + (64,), width=random_state.choice([1, 1, 2]))


def point(width: int, height: int, x: float, y: float) -> tuple[int, int]:
    return int(width * x / 100), int(height * y / 100)


if __name__ == "__main__":
    main()
