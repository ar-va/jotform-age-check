# Assembles frames/f*.png (80 ms apart) into a GIF: one shared palette, no dithering,
# identical consecutive frames merged, a longer hold on the last frame.
# Usage: python assemble.py <gif dir> <output.gif> <width>
import pathlib
import sys

from PIL import Image, ImageChops

G, out, width = pathlib.Path(sys.argv[1]), sys.argv[2], int(sys.argv[3])
STEP_MS, END_HOLD_MS = 80, 2600

paths = sorted((G / 'frames').glob('f*.png'))
frames = []
for p in paths:
    im = Image.open(p).convert('RGB')
    frames.append(im.resize((width, round(im.height * width / im.width)), Image.LANCZOS))

# Shared palette from a strip of evenly spaced frames, so colours don't flicker between frames.
sample = frames[::max(1, len(frames) // 12)]
strip = Image.new('RGB', (width, sample[0].height * len(sample)))
for i, im in enumerate(sample):
    strip.paste(im, (0, i * im.height))
palette_img = strip.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)

# Pillow matches colours at reduced precision, so pure white lands on a near-white entry (#fcfcfc).
# Find the entry a pure-white pixel actually maps to and make that entry exact white in every frame.
src = frames[-1]
white_xy = next((x, y) for y in range(0, src.height, 4) for x in range(0, src.width, 4) if src.getpixel((x, y)) == (255, 255, 255))
white_idx = src.quantize(palette=palette_img, dither=Image.Dither.NONE).getpixel(white_xy)


def fix_white(q):
    pal = q.getpalette()
    pal[white_idx * 3:white_idx * 3 + 3] = [255, 255, 255]
    q.putpalette(pal)
    return q

quantized, durations = [], []
for im in frames:
    q = fix_white(im.quantize(palette=palette_img, dither=Image.Dither.NONE))
    if quantized and ImageChops.difference(q.convert('RGB'), quantized[-1].convert('RGB')).getbbox() is None:
        durations[-1] += STEP_MS
        continue
    quantized.append(q)
    durations.append(STEP_MS)
durations[-1] += END_HOLD_MS

quantized[0].save(out, save_all=True, append_images=quantized[1:], duration=durations, loop=0, optimize=True, disposal=1)
print(f'{len(paths)} frames -> {len(quantized)} unique, {sum(durations) / 1000:.1f}s, '
      f'{pathlib.Path(out).stat().st_size / 1024:.0f} KB, {width}x{quantized[0].height}')
