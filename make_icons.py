#!/usr/bin/env python3
"""Generate RetaLog modern Apple-style app icons with pure Python standard library."""
import os, math, zlib, struct

def write_png(width, height, pixel_fn, filepath):
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # No PNG filter
        for x in range(width):
            r, g, b, a = pixel_fn(x, y, width, height)
            raw.extend((
                max(0, min(255, int(r))),
                max(0, min(255, int(g))),
                max(0, min(255, int(b))),
                max(0, min(255, int(a)))
            ))
    compressed = zlib.compress(raw, 9)
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    png_bytes = (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', compressed)
        + chunk(b'IEND', b'')
    )
    with open(filepath, 'wb') as f:
        f.write(png_bytes)

def lerp(c1, c2, t):
    return tuple(c1[i] + (c2[i] - c1[i]) * t for i in range(len(c1)))

def rounded_rect_dist(x, y, w, h, r):
    dx = max(r - x, 0, x - (w - r))
    dy = max(r - y, 0, y - (h - r))
    if dx > 0 and dy > 0:
        return math.sqrt(dx*dx + dy*dy) - r
    return max(x - w, -x, y - h, -y)

def make_icon_pixels(mask_corner=True):
    def get_pixel(x, y, w, h):
        nx = x / w
        ny = y / h

        r_corner = 0.225 * w
        dist = rounded_rect_dist(x, y, w, h, r_corner)
        if mask_corner:
            if dist > 1.0:
                return (0, 0, 0, 0)
            corner_alpha = max(0.0, min(1.0, 1.0 - dist))
        else:
            corner_alpha = 1.0

        diag = (nx * 0.6 + ny * 0.4)
        c_top = (8, 22, 36)
        c_mid = (11, 34, 52)
        c_bot = (6, 16, 26)
        if diag < 0.5:
            bg = lerp(c_top, c_mid, diag * 2.0)
        else:
            bg = lerp(c_mid, c_bot, (diag - 0.5) * 2.0)

        cx, cy = 0.52 * w, 0.46 * h
        glow_dist = math.sqrt((x - cx)**2 + (y - cy)**2) / (0.35 * w)
        glow_amt = max(0.0, 1.0 - glow_dist**1.8) * 0.45
        glow_color = (0, 245, 160)
        bg = lerp(bg, glow_color, glow_amt)

        border_dist = abs(dist)
        if dist <= 0 and border_dist < 2.5:
            spec_intensity = (1.0 - border_dist / 2.5) * (1.0 - ny * 0.8) * 0.35
            bg = lerp(bg, (255, 255, 255), spec_intensity)

        in_glyph = 0.0

        stem_left = 0.34
        stem_right = 0.435
        stem_top = 0.24
        stem_bottom = 0.80
        if stem_left <= nx <= stem_right and stem_top <= ny <= stem_bottom:
            in_glyph = 1.0

        loop_cx, loop_cy = 0.435, 0.415
        dx_loop = nx - loop_cx
        dy_loop = ny - loop_cy
        if dx_loop >= 0:
            rad = math.sqrt(dx_loop**2 + dy_loop**2)
            if 0.09 <= rad <= 0.215:
                d_edge = min(abs(rad - 0.09), abs(rad - 0.215)) * w
                in_glyph = max(in_glyph, max(0.0, min(1.0, d_edge + 0.5)))

        if 0.38 <= nx <= 0.44:
            if (0.20 <= ny <= 0.26) or (0.57 <= ny <= 0.63):
                in_glyph = 1.0

        leg_t = (ny - 0.58) / (0.80 - 0.58)
        if 0.0 <= leg_t <= 1.0:
            center_x = 0.46 + leg_t * 0.24
            width_leg = 0.05
            if abs(nx - center_x) < width_leg:
                d_leg = (width_leg - abs(nx - center_x)) * w
                in_glyph = max(in_glyph, max(0.0, min(1.0, d_leg + 0.5)))

        g_t = (nx * 0.5 + ny * 0.5)
        c_g1 = (16, 230, 160)
        c_g2 = (6, 182, 236)
        c_g3 = (59, 130, 246)
        if g_t < 0.5:
            glyph_color = lerp(c_g1, c_g2, g_t * 2.0)
        else:
            glyph_color = lerp(c_g2, c_g3, (g_t - 0.5) * 2.0)

        dot_cx, dot_cy = 0.54, 0.415
        dot_r = math.sqrt((nx - dot_cx)**2 + (ny - dot_cy)**2) * w
        if dot_r < 0.045 * w:
            dot_amt = max(0.0, min(1.0, (0.045 * w - dot_r) * 1.5))
            in_glyph = max(in_glyph, dot_amt)
            glyph_color = lerp(glyph_color, (255, 255, 255), dot_amt * 0.9)

        final_rgb = lerp(bg, glyph_color, in_glyph)
        return (final_rgb[0], final_rgb[1], final_rgb[2], int(corner_alpha * 255))

    return get_pixel

def main():
    os.makedirs('icons', exist_ok=True)
    print('Generating icons...')
    write_png(192, 192, make_icon_pixels(True), 'icons/icon-192.png')
    print('Generated icons/icon-192.png')
    write_png(512, 512, make_icon_pixels(True), 'icons/icon-512.png')
    print('Generated icons/icon-512.png')
    write_png(512, 512, make_icon_pixels(False), 'icons/maskable-512.png')
    print('Generated icons/maskable-512.png')
    write_png(180, 180, make_icon_pixels(False), 'icons/apple-touch-icon.png')
    print('Generated icons/apple-touch-icon.png')

    svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#081624"/>
      <stop offset="50%" stop-color="#0B2234"/>
      <stop offset="100%" stop-color="#05101A"/>
    </linearGradient>
    <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F5A0"/>
      <stop offset="45%" stop-color="#10E5B6"/>
      <stop offset="85%" stop-color="#00D2FF"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
    <linearGradient id="specular" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.02"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="24" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect width="512" height="512" rx="116" fill="url(#bg)"/>
  <rect x="1.5" y="1.5" width="509" height="509" rx="114.5" stroke="url(#specular)" stroke-width="2.5" fill="none"/>

  <!-- Ambient Vitality Aura -->
  <circle cx="265" cy="245" r="140" fill="#00F5A0" opacity="0.18" filter="url(#glow)"/>

  <!-- Glowing Underlay -->
  <g filter="url(#glow)" opacity="0.45">
    <path d="M174 130 C174 121 181 114 190 114 L282 114 C344 114 388 156 388 216 C388 266 350 304 302 314 L370 416 C376 424 370 436 358 436 L316 436 C307 436 299 431 293 423 L236 332 L236 424 C236 431 230 436 223 436 L187 436 C180 436 174 431 174 424 Z" fill="url(#brand)"/>
  </g>

  <!-- Sharp Main R-Glyph -->
  <path d="M174 130 C174 121 181 114 190 114 L282 114 C344 114 388 156 388 216 C388 266 350 304 302 314 L370 416 C376 424 370 436 358 436 L316 436 C307 436 299 431 293 423 L236 332 L236 424 C236 431 230 436 223 436 L187 436 C180 436 174 431 174 424 Z M236 174 L236 276 L280 276 C314 276 334 254 334 216 C334 178 314 174 280 174 Z" fill="url(#brand)"/>

  <!-- Radiant Metabolic Core Dot -->
  <circle cx="280" cy="216" r="16" fill="#FFFFFF" opacity="0.95"/>
  <circle cx="280" cy="216" r="26" fill="#00F5A0" opacity="0.4" filter="url(#glow)"/>
</svg>'''
    with open('icons/icon.svg', 'w') as f:
        f.write(svg_content)
    print('Generated icons/icon.svg')

if __name__ == '__main__':
    main()

