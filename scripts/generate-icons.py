#!/usr/bin/env python3
"""
Generates Cove geometric bay icons (16x16, 32x32, 48x48, 128x128 PNG + SVG)
using pure Python stdlib (4x supersampling anti-aliasing).
Logo concept: Two calm sweeping curves meeting at a sheltered headland point,
forming a quiet bay with still water.
"""
import math
import os
import struct
import zlib


def write_png(path: str, width: int, height: int, rgba_bytes: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)  # filter type 0
        raw.extend(rgba_bytes[y * stride : (y + 1) * stride])

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)


def sd_rounded_box(px: float, py: float, bx: float, by: float, r: float) -> float:
    qx = abs(px) - bx + r
    qy = abs(py) - by + r
    return math.hypot(max(qx, 0.0), max(qy, 0.0)) + min(max(qx, qy), 0.0) - r


def dist_to_quad_bezier(
    px: float,
    py: float,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    steps: int = 28,
) -> float:
    best = 1e9
    prev_x, prev_y = x0, y0
    for i in range(1, steps + 1):
        t = i / steps
        mt = 1.0 - t
        cx = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2
        cy = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2
        dx, dy = cx - prev_x, cy - prev_y
        seg_len2 = dx * dx + dy * dy
        if seg_len2 > 1e-9:
            u = max(0.0, min(1.0, ((px - prev_x) * dx + (py - prev_y) * dy) / seg_len2))
            nx = prev_x + u * dx
            ny = prev_y + u * dy
        else:
            nx, ny = cx, cy
        d = math.hypot(px - nx, py - ny)
        if d < best:
            best = d
        prev_x, prev_y = cx, cy
    return best


def sample_icon(nx: float, ny: float):
    """nx, ny in [-1, 1]. Returns (r, g, b, a) in 0..255."""
    # Rounded square badge
    d_box = sd_rounded_box(nx, ny, 0.90, 0.90, 0.24)
    if d_box > 0.02:
        return (0, 0, 0, 0)

    # Background: calm deep harbor (#1a1a2e -> #21243d subtle vertical gradient)
    t_bg = (ny + 1.0) * 0.5
    bg_r = 34 * (1 - t_bg) + 24 * t_bg
    bg_g = 37 * (1 - t_bg) + 26 * t_bg
    bg_b = 61 * (1 - t_bg) + 46 * t_bg

    # Two sweeping curves of the cove meeting at a calm point (0.0, -0.44)
    # Left curve: from (-0.60, 0.34) sweeping inward through (-0.52, -0.34) to (0.0, -0.44)
    # Wait: ny=-1 is top, ny=+1 is bottom!
    # Let's make the two curves form a sheltered bay opening softly upward or cradling still water:
    # Left headland arc: (-0.56, -0.22) -> control (-0.54, 0.42) -> meeting point (0.0, 0.46)
    # Right headland arc: (0.56, -0.22) -> control (0.54, 0.42) -> meeting point (0.0, 0.46)
    # Plus upper inner horizon arc / still water ripple inside the bay!
    d_left = dist_to_quad_bezier(nx, ny, -0.56, -0.26, -0.52, 0.38, 0.0, 0.48)
    d_right = dist_to_quad_bezier(nx, ny, 0.56, -0.26, 0.52, 0.38, 0.0, 0.48)
    d_cove = min(d_left, d_right)

    # Secondary gentle inner curve (protective outer/inner bay contour)
    d_horizon = dist_to_quad_bezier(nx, ny, -0.30, 0.04, 0.0, 0.14, 0.30, 0.04, steps=18)

    # Stroke widths
    stroke_main = 0.095
    stroke_inner = 0.062

    # Accent color: muted teal #5f9ea0 (lightened slightly to #76b5b7 on dark icon for crispness at 16px)
    fg_r, fg_g, fg_b = 114.0, 179.0, 181.0
    water_r, water_g, water_b = 95.0, 158.0, 160.0

    r, g, b = bg_r, bg_g, bg_b

    # Inner calm water line
    if d_horizon < stroke_inner + 0.03:
        cov = max(0.0, min(1.0, (stroke_inner + 0.015 - d_horizon) / 0.03)) * 0.72
        r = r * (1 - cov) + water_r * cov
        g = g * (1 - cov) + water_g * cov
        b = b * (1 - cov) + water_b * cov

    # Main cove curves meeting at a point
    if d_cove < stroke_main + 0.03:
        cov = max(0.0, min(1.0, (stroke_main + 0.015 - d_cove) / 0.03))
        r = r * (1 - cov) + fg_r * cov
        g = g * (1 - cov) + fg_g * cov
        b = b * (1 - cov) + fg_b * cov

    alpha = max(0.0, min(1.0, (0.01 - d_box) / 0.025))
    return (int(round(r)), int(round(g)), int(round(b)), int(round(alpha * 255)))


def render_icon(size: int) -> bytes:
    ss = 4 if size <= 48 else 3
    out = bytearray(size * size * 4)
    idx = 0
    for y in range(size):
        for x in range(size):
            ar = ag = ab = aa = 0
            for sy in range(ss):
                for sx in range(ss):
                    nx = ((x + (sx + 0.5) / ss) / size) * 2.0 - 1.0
                    ny = ((y + (sy + 0.5) / ss) / size) * 2.0 - 1.0
                    r, g, b, a = sample_icon(nx, ny)
                    ar += r * a
                    ag += g * a
                    ab += b * a
                    aa += a
            total_samples = ss * ss
            final_a = aa // total_samples
            if aa > 0:
                final_r = ar // aa
                final_g = ag // aa
                final_b = ab // aa
            else:
                final_r = final_g = final_b = 0
            out[idx] = min(255, final_r)
            out[idx + 1] = min(255, final_g)
            out[idx + 2] = min(255, final_b)
            out[idx + 3] = min(255, final_a)
            idx += 4
    return bytes(out)


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
    os.makedirs(out_dir, exist_ok=True)
    for sz in (16, 32, 48, 128):
        path = os.path.join(out_dir, f"icon{sz}.png")
        write_png(path, sz, sz, render_icon(sz))
        print(f"Generated {path}")

    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect x="3" y="3" width="58" height="58" rx="14" fill="#1A1A2E" stroke="#5F9EA0" stroke-opacity="0.28" stroke-width="1.5"/>
  <path d="M14 23.5C15.2 43.5 23.5 47.2 32 49C40.5 47.2 48.8 43.5 50 23.5" stroke="#72B3B5" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M22.5 33.2C26.2 36.2 37.8 36.2 41.5 33.2" stroke="#5F9EA0" stroke-opacity="0.78" stroke-width="3.6" stroke-linecap="round"/>
</svg>
"""
    svg_path = os.path.join(out_dir, "cove.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"Generated {svg_path}")


if __name__ == "__main__":
    main()
