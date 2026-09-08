"""Build a looping email GIF: cursor moves to Enhance, then the photo crossfades."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps" / "web" / "public"
BEFORE = PUBLIC / "marketing" / "ai-photo-before.png"
AFTER = PUBLIC / "marketing" / "ai-photo-after.png"
OUT = PUBLIC / "ai-photo-studio-demo.gif"

W, H = 640, 360
NAVY = (13, 24, 48, 255)


def load_photo(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    img = img.resize((W, H), Image.Resampling.LANCZOS)
    return img


def draw_chrome(base: Image.Image, enhance_pressed: bool) -> Image.Image:
    frame = Image.new("RGBA", (W, H), NAVY)
    frame.paste(base, (0, 0))
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle((0, 0, W, 36), fill=(13, 24, 48, 210))
    draw.ellipse((16, 12, 26, 22), fill=(251, 113, 133, 255))
    draw.ellipse((32, 12, 42, 22), fill=(252, 211, 77, 255))
    draw.ellipse((48, 12, 58, 22), fill=(52, 211, 153, 255))
    draw.rectangle((0, H - 64, W, H), fill=(13, 24, 48, 200))
    btn_fill = (180, 83, 9, 255) if enhance_pressed else (251, 191, 36, 255)
    draw.rounded_rectangle((W - 132, H - 48, W - 18, H - 16), 14, fill=btn_fill)
    draw.text((W - 108, H - 42), "Enhance", fill=(13, 24, 48, 255))
    return Image.alpha_composite(frame, overlay)


def draw_cursor(frame: Image.Image, x: int, y: int, pressed: bool) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    scale = 0.85 if pressed else 1.0
    pts = [
        (x, y),
        (x + int(16 * scale), y + int(10 * scale)),
        (x + int(9 * scale), y + int(12 * scale)),
        (x + int(13 * scale), y + int(22 * scale)),
        (x + int(9 * scale), y + int(24 * scale)),
        (x + int(5 * scale), y + int(14 * scale)),
        (x - int(2 * scale), y + int(20 * scale)),
    ]
    draw.polygon(pts, fill=(13, 24, 48, 255), outline=(246, 231, 195, 255))
    return Image.alpha_composite(frame, layer)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def main() -> None:
    before = load_photo(BEFORE)
    after = load_photo(AFTER)
    start = (90, 250)
    end = (W - 70, H - 32)
    frames: list[Image.Image] = []
    durations: list[int] = []

    for i in range(8):
        t = i / 7
        x = int(lerp(start[0], end[0], t))
        y = int(lerp(start[1], end[1], t))
        frames.append(draw_cursor(draw_chrome(before, False), x, y, False))
        durations.append(90)

    frames.append(draw_cursor(draw_chrome(before, True), end[0], end[1], True))
    durations.append(140)

    for i in range(8):
        t = (i + 1) / 8
        blended = Image.blend(before, after, t).filter(ImageFilter.GaussianBlur(radius=1.2 * (1 - t)))
        if t > 0.6:
            blended = ImageEnhance.Contrast(blended).enhance(1.05)
        frames.append(draw_cursor(draw_chrome(blended, False), end[0], end[1], False))
        durations.append(110)

    for _ in range(6):
        frames.append(draw_chrome(after, False))
        durations.append(180)

    rgb_frames = [frame.convert("P", palette=Image.Palette.ADAPTIVE, colors=128) for frame in frames]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    rgb_frames[0].save(
        OUT,
        save_all=True,
        append_images=rgb_frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
