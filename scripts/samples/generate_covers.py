#!/usr/bin/env python3
"""
Genera las imágenes de ejemplo (portadas de packs, iconos de mods, overlays).

Todo el pixel art se dibuja aquí con formas simples (no se copia ninguna textura de
Minecraft). Las imágenes solo sirven para los datos de ejemplo; los packs reales usan
las capturas que suben sus creadores.

Uso:  python3 scripts/samples/generate_covers.py public/samples
"""
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

S = 16  # tamaño de los sprites


# ---------------------------------------------------------------- utilidades de color
def hx(c):
    c = c.lstrip("#")
    return tuple(int(c[i : i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def shade(c, k):
    """k>0 aclara hacia blanco, k<0 oscurece hacia negro."""
    return mix(c, (255, 255, 255), k) if k > 0 else mix(c, (0, 0, 0), -k)


# ---------------------------------------------------------------- sprites
class Sprite:
    def __init__(self):
        self.px = {}

    def set(self, x, y, c):
        if 0 <= x < S and 0 <= y < S:
            self.px[(x, y)] = c

    def outline(self, color):
        add = {}
        for (x, y) in self.px:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if n not in self.px and 0 <= n[0] < S and 0 <= n[1] < S:
                    add[n] = color
        self.px.update(add)
        return self

    def image(self, scale):
        im = Image.new("RGBA", (S * scale, S * scale), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        for (x, y), c in self.px.items():
            d.rectangle([x * scale, y * scale, (x + 1) * scale - 1, (y + 1) * scale - 1], fill=c + (255,))
        return im


def sword(p):
    s = Sprite()
    blade_l, blade, blade_d = p["blade"]
    for i in range(9):
        x, y = 13 - i, 2 + i
        s.set(x, y, blade)
        s.set(x - 1, y, blade_l)
        s.set(x, y + 1, blade_d)
    s.set(14, 1, blade_l)
    s.set(14, 2, blade)
    g = p["guard"]
    for (x, y) in ((2, 9), (3, 10), (4, 11), (5, 12), (6, 13)):
        s.set(x, y, g)
    s.set(3, 9, shade(g, 0.35))
    h = p["handle"]
    s.set(3, 12, h)
    s.set(2, 13, shade(h, -0.25))
    s.set(1, 14, p["pommel"])
    s.set(2, 14, shade(p["pommel"], -0.3))
    return s.outline(p["ink"])


def gem(p):
    """Gema facetada (rombo)."""
    s = Sprite()
    a_l, a, a_d = p["accent"]
    cx, cy = 7.5, 7.5
    for y in range(2, 14):
        for x in range(2, 14):
            if abs(x - cx) + abs(y - cy) * 0.9 <= 6:
                c = a
                if x < cx and y < cy:
                    c = a_l
                elif x > cx and y > cy:
                    c = a_d
                elif x > cx:
                    c = shade(a, -0.12)
                s.set(x, y, c)
    for y in range(4, 7):
        s.set(6, y, (255, 255, 255))
    s.set(7, 4, shade(a_l, 0.6))
    return s.outline(p["ink"])


def potion(p):
    s = Sprite()
    a_l, a, a_d = p["accent"]
    glass = (225, 236, 245)
    for y in range(7, 15):
        for x in range(2, 14):
            if (x - 7.5) ** 2 + (y - 10.5) ** 2 <= 22:
                c = a if y > 8 else glass
                if x < 6 and y > 8:
                    c = a_l
                if x > 10 and y > 9:
                    c = a_d
                s.set(x, y, c)
    for y in range(3, 7):
        s.set(7, y, glass)
        s.set(8, y, shade(glass, -0.15))
    cork = (150, 104, 64)
    for x in (6, 7, 8, 9):
        s.set(x, 2, cork)
    s.set(5, 10, (255, 255, 255))
    s.set(5, 11, shade(a_l, 0.5))
    return s.outline(p["ink"])


def apple(p):
    s = Sprite()
    a_l, a, a_d = p["fruit"]
    for y in range(4, 15):
        for x in range(1, 15):
            dx = x - 7.5
            dy = y - 9.5
            if dx * dx / 40 + dy * dy / 30 <= 1 and not (y == 4 and 6 <= x <= 9):
                c = a
                if dx < -2 and dy < 1:
                    c = a_l
                if dx > 2 or dy > 3:
                    c = a_d
                s.set(x, y, c)
    s.set(4, 7, (255, 255, 255))
    s.set(5, 6, shade(a_l, 0.5))
    stem = (110, 72, 40)
    s.set(8, 3, stem)
    s.set(8, 2, stem)
    leaf = (80, 196, 110)
    for (x, y) in ((9, 2), (10, 1), (11, 1), (10, 2)):
        s.set(x, y, leaf)
    return s.outline(p["ink"])


def orb(p):
    s = Sprite()
    a_l, a, a_d = p["accent"]
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 7.5, y - 7.5)
            if d <= 6.2:
                c = a
                if (x - 5.5) ** 2 + (y - 5.5) ** 2 <= 6:
                    c = a_l
                elif d > 4.6 and (x + y) > 15:
                    c = a_d
                s.set(x, y, c)
    s.set(5, 4, (255, 255, 255))
    s.set(4, 5, (255, 255, 255))
    return s.outline(p["ink"])


def block(p):
    """Bloque con textura de ruido (fondo de las portadas)."""
    s = Sprite()
    rnd = random.Random(p["seed"])
    tones = p["block"]
    for y in range(S):
        for x in range(S):
            s.set(x, y, tones[min(3, int(rnd.random() ** 1.6 * 4))])
    return s


def trident(p):
    s = Sprite()
    m_l, m, m_d = p["blade"]
    for i in range(10):
        s.set(4 + i, 11 - i, m if i % 3 else m_l)
        s.set(4 + i, 12 - i, m_d)
    for (x, y) in ((11, 1), (12, 1), (14, 3), (14, 4), (10, 2), (13, 5)):
        s.set(x, y, m_l)
    s.set(13, 0, m_l)
    s.set(15, 2, m_l)
    h = p["handle"]
    for i in range(4):
        s.set(1 + i, 14 - i, h)
    return s.outline(p["ink"])


def mace(p):
    s = Sprite()
    m_l, m, m_d = p["blade"]
    for y in range(1, 8):
        for x in range(7, 15):
            if (x - 10.5) ** 2 + (y - 4) ** 2 <= 11:
                s.set(x, y, m_l if x < 10 and y < 4 else (m_d if x > 12 else m))
    for (x, y) in ((10, 0), (15, 4), (6, 4)):
        s.set(x, y, m_d)
    h = p["handle"]
    for i in range(8):
        s.set(8 - i, 7 + i, h if i % 2 else shade(h, -0.2))
    return s.outline(p["ink"])


def flame(p):
    s = Sprite()
    a_l, a, a_d = p["accent"]
    for y in range(2, 15):
        w = (y - 2) / 12
        half = 1 + w * 5.2 - max(0, (y - 12)) * 1.6
        for x in range(16):
            dx = abs(x - 7.5 - math.sin(y * 0.9) * 0.8)
            if dx <= half:
                c = a_d
                if dx <= half * 0.66:
                    c = a
                if dx <= half * 0.3 and y > 6:
                    c = a_l
                s.set(x, y, c)
    s.set(7, 1, a_d)
    s.set(10, 4, a_d)
    return s.outline(p["ink"])


def shield(p):
    s = Sprite()
    a_l, a, a_d = p["accent"]
    rim = p["guard"]
    for y in range(1, 15):
        half = 6 if y < 9 else 6 - (y - 8) * 0.9
        for x in range(16):
            dx = abs(x - 7.5)
            if dx <= half:
                c = rim if dx > half - 1.2 or y < 2 else (a if x < 8 else a_d)
                if x < 6 and 3 < y < 7 and c != rim:
                    c = a_l
                s.set(x, y, c)
    return s.outline(p["ink"])


def heart(p):
    s = Sprite()
    a_l, a, a_d = p["accent"]
    for y in range(16):
        for x in range(16):
            u, v = (x - 7.5) / 6.5, (7 - y) / 6.5
            if (u * u + v * v - 1) ** 3 - u * u * v ** 3 <= 0:
                c = a
                if u < -0.2 and v > 0.2:
                    c = a_l
                if u > 0.3 or v < -0.5:
                    c = a_d
                s.set(x, y, c)
    s.set(4, 5, (255, 255, 255))
    return s.outline(p["ink"])


def cloud(p):
    s = Sprite()
    a_l, a, a_d = p["accent"]
    blue = (196, 214, 238)
    for (cx, cy, r) in ((4.5, 9.5, 3.0), (8, 7, 4.0), (11.5, 9, 3.2), (7.5, 11, 2.6), (12.5, 11, 2.2)):
        for y in range(16):
            for x in range(16):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r and y <= 12:
                    s.set(x, y, a if y < 10 else blue)
    for x in range(6, 10):
        s.set(x, 4, (255, 255, 255))
    return s.outline(p["ink"])


def grid_ui(p):
    """Ventana de inventario simplificada (para 'interfaz')."""
    s = Sprite()
    a_l, a, a_d = p["accent"]
    for y in range(2, 14):
        for x in range(1, 15):
            s.set(x, y, a_d)
    for y in (4, 7, 10):
        for x in (3, 6, 9, 12):
            s.set(x, y, a_l)
            s.set(x - 1, y, a)
    return s.outline(p["ink"])


def sparkles(p):
    s = Sprite()
    a_l, a, a_d = p["accent"]
    for (cx, cy, r) in ((5, 5, 3), (11, 10, 2), (4, 12, 1), (12, 3, 1)):
        for i in range(-r, r + 1):
            s.set(cx + i, cy, a if abs(i) < r else a_d)
            s.set(cx, cy + i, a if abs(i) < r else a_d)
        s.set(cx, cy, a_l)
    return s.outline(p["ink"])


def magnifier(p):
    s = Sprite()
    a_l, a, a_d = p["accent"]
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 6, y - 6)
            if 3.2 < d <= 5:
                s.set(x, y, a if x + y < 12 else a_d)
            elif d <= 3.2:
                s.set(x, y, (236, 246, 255) if x + y < 10 else (196, 220, 240))
    for i in range(5):
        s.set(10 + i, 10 + i, p["handle"])
        s.set(11 + i, 10 + i, shade(p["handle"], -0.25))
    return s.outline(p["ink"])


def crosshair(p):
    s = Sprite()
    a_l, a, a_d = p["accent"]
    for i in range(1, 15):
        if not 6 <= i <= 9:
            s.set(i, 7, a)
            s.set(i, 8, a_d)
            s.set(7, i, a)
            s.set(8, i, a_d)
    for (x, y) in ((7, 7), (8, 8), (7, 8), (8, 7)):
        s.set(x, y, a_l)
    return s.outline(p["ink"])


def bolt(p):
    s = Sprite()
    a_l, a, a_d = p["accent"]
    pts = [(10, 1), (9, 2), (8, 3), (7, 4), (6, 5), (5, 6), (4, 7), (5, 8), (6, 8), (7, 8), (8, 8),
           (7, 9), (6, 10), (5, 11), (4, 12), (3, 13), (2, 14)]
    for (x, y) in pts:
        s.set(x, y, a)
        s.set(x + 1, y, a_l)
        s.set(x + 2, y, a_d)
    return s.outline(p["ink"])


def chat(p):
    s = Sprite()
    a_l, a, a_d = p["accent"]
    for y in range(2, 11):
        for x in range(1, 15):
            s.set(x, y, a if y > 2 else a_l)
    for (x, y) in ((3, 11), (3, 12), (4, 11)):
        s.set(x, y, a)
    for x in (4, 5, 6, 7, 8, 9, 10, 11):
        s.set(x, 5, a_d)
    for x in (4, 5, 6, 7, 8):
        s.set(x, 8, a_d)
    return s.outline(p["ink"])


def armor(p):
    s = Sprite()
    a_l, a, a_d = p["blade"]
    for y in range(2, 15):
        for x in range(1, 15):
            body = 4 <= x <= 11 and y >= 4
            shoulders = y <= 6 and (x <= 5 or x >= 10)
            if (body or shoulders) and not (6 <= x <= 9 and y <= 4):
                s.set(x, y, a_l if x < 7 else (a_d if x > 10 else a))
    return s.outline(p["ink"])


SPRITES = dict(sword=sword, gem=gem, potion=potion, apple=apple, orb=orb, trident=trident, mace=mace,
               flame=flame, shield=shield, heart=heart, cloud=cloud, gui=grid_ui, sparkles=sparkles,
               magnifier=magnifier, crosshair=crosshair, bolt=bolt, chat=chat, armor=armor)


# ---------------------------------------------------------------- temas (paletas por pack)
def theme(seed, block, blade, guard, handle, accent, fruit=None, pommel=None):
    b = [hx(c) for c in block]
    bl = hx(blade)
    ac = hx(accent)
    fr = hx(fruit) if fruit else hx("#f2c230")
    return {
        "seed": seed,
        "block": b,
        "blade": (shade(bl, 0.45), bl, shade(bl, -0.3)),
        "guard": hx(guard),
        "handle": hx(handle),
        "pommel": hx(pommel or guard),
        "accent": (shade(ac, 0.45), ac, shade(ac, -0.32)),
        "fruit": (shade(fr, 0.4), fr, shade(fr, -0.3)),
        "ink": (24, 16, 28),
    }


THEMES = {
    "strawberry": theme(1, ["#5b1d33", "#6e2440", "#80304d", "#4a1729"], "#ff8fc4", "#5fd17e", "#7a4a2c", "#ff5a8a"),
    "obsidian-pink": theme(2, ["#1f1530", "#271b3b", "#33234a", "#170f25"], "#ff6fb1", "#b48cff", "#3c2f52", "#c77dff"),
    "marshmallow": theme(3, ["#e9d7e6", "#f3e5f0", "#dcc4d8", "#cfb3cb"], "#ffffff", "#ffb3d4", "#c49a7c", "#ff9cc9"),
    "snow": theme(4, ["#cfe0ec", "#e2eef6", "#b9cfdf", "#a7c0d3"], "#e9f6ff", "#5ab0ff", "#6d4a35", "#7cc8ff"),
    "copper": theme(5, ["#6b3b24", "#7d4a2d", "#5a3020", "#3f8f7a"], "#e8935c", "#3fb59a", "#4a2c1e", "#ff8a4c"),
    "midnight": theme(6, ["#121a33", "#18223f", "#0e1428", "#1f2b4f"], "#8fb4ff", "#ffd447", "#2b2f45", "#6f8cff"),
    "lemon": theme(7, ["#6f6a1c", "#827c24", "#5d5916", "#938c2d"], "#fff27a", "#ff9f43", "#6b4a2b", "#ffe14a", fruit="#ffd447"),
    "amber": theme(8, ["#5a3412", "#6c4018", "#7d4c1d", "#48290d"], "#ffc069", "#ffe08a", "#3e2a1a", "#ffb03a"),
    "coral": theme(9, ["#14424d", "#195160", "#103844", "#1e6070"], "#ff8a7a", "#ffd0c4", "#4a3a3a", "#ff6f61"),
    "jade": theme(10, ["#163b2c", "#1c4a37", "#123224", "#235a43"], "#66e0a3", "#ffe17a", "#3d2c22", "#3fd08c"),
    "ocean": theme(11, ["#0f2f4a", "#143a5a", "#0b2439", "#1a4a70"], "#7fe3ff", "#ffd447", "#2a3a4a", "#44c4ff"),
    "gold": theme(12, ["#3b2a12", "#4a3516", "#5a411c", "#2f210e"], "#ffd447", "#ffefa6", "#5a3b25", "#ffcc33"),
    "lavender": theme(13, ["#3d2f5c", "#4a396e", "#33274d", "#574482"], "#d9c2ff", "#ffb3e1", "#4a3a5a", "#b58cff"),
    "graphite": theme(14, ["#25252b", "#2d2d34", "#1d1d22", "#36363f"], "#c9ccd6", "#ff6fb1", "#1a1a1f", "#9aa3ad"),
    "cherry-neon": theme(15, ["#2b0d22", "#3a1030", "#20091a", "#4a153d"], "#ff4fa0", "#5ef2ff", "#2a1426", "#ff2f8e"),
    "sand": theme(16, ["#c9b07a", "#d6bf8b", "#bba06a", "#a88d58"], "#fff3d1", "#7a5a3a", "#6b4a2b", "#ff9f6b"),
    # overlays y mods
    "fire": theme(21, ["#2a1410", "#341912", "#22100c", "#3d1d14"], "#ffd447", "#ffd447", "#6b4a2b", "#ff7a2f"),
    "shield": theme(22, ["#1d2333", "#232a3d", "#171c29", "#2a3248"], "#c9ccd6", "#c9a65a", "#6b4a2b", "#ff6fb1"),
    "totem": theme(23, ["#2a2212", "#332a16", "#221b0e", "#3b311a"], "#ffd447", "#ffd447", "#6b4a2b", "#ffd447"),
    "sky": theme(24, ["#1f4d7a", "#285c8f", "#1a4269", "#3169a3"], "#ffffff", "#ffffff", "#6b4a2b", "#f4f8ff"),
    "gui": theme(25, ["#1b1820", "#221e28", "#16131a", "#2a2531"], "#c9ccd6", "#ff6fb1", "#6b4a2b", "#8a7f99"),
    "particles": theme(26, ["#1e1430", "#26193b", "#180f27", "#2f2047"], "#ffffff", "#ffd447", "#6b4a2b", "#ff9cd0"),
    "mod-pink": theme(31, ["#000000"] * 4, "#ffffff", "#ff6fb1", "#7a4a2c", "#ff6fb1"),
    "mod-yellow": theme(32, ["#000000"] * 4, "#ffffff", "#ffd447", "#7a4a2c", "#ffd447"),
    "mod-white": theme(33, ["#000000"] * 4, "#e8e3ee", "#c9ccd6", "#7a4a2c", "#fff6fa"),
    "mod-mint": theme(34, ["#000000"] * 4, "#7ef0c0", "#7ef0c0", "#7a4a2c", "#5ee0a8"),
}

# Objetos que se ven en la hotbar de cada portada, según la modalidad.
HOTBAR = {
    "sword": ["sword", "apple", "gem", "potion", "orb"],
    "crystal": ["gem", "sword", "orb", "apple", "potion"],
    "netherite": ["potion", "sword", "apple", "orb", "gem"],
    "uhc": ["apple", "sword", "potion", "gem", "orb"],
    "smp": ["sword", "gem", "apple", "potion", "orb"],
    "boxpvp": ["sword", "potion", "apple", "gem", "orb"],
    "tridente": ["trident", "sword", "potion", "apple", "orb"],
    "mazo": ["mace", "sword", "orb", "apple", "potion"],
}
HERO = {"sword": "sword", "crystal": "gem", "netherite": "potion", "uhc": "apple", "smp": "sword",
        "boxpvp": "sword", "tridente": "trident", "mazo": "mace"}


# ---------------------------------------------------------------- composiciones
W, H = 960, 600


def background(t, w=W, h=H, scale=8):
    tile = block(t).image(scale)
    bg = Image.new("RGBA", (w, h))
    for y in range(0, h, tile.height):
        for x in range(0, w, tile.width):
            bg.paste(tile, (x, y))
    # oscurecer hacia los bordes para que el objeto resalte
    shadow = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(shadow)
    d.ellipse([-w * 0.25, -h * 0.4, w * 1.25, h * 1.25], fill=255)
    shadow = shadow.filter(ImageFilter.GaussianBlur(120))
    dark = Image.new("RGBA", (w, h), (12, 8, 16, 255))
    return Image.composite(bg, Image.blend(bg, dark, 0.62), shadow)


def drop_shadow(sprite_img, offset=(14, 18), alpha=110, blur=6):
    a = sprite_img.split()[3]
    sh = Image.new("RGBA", sprite_img.size, (8, 4, 12, 0))
    sh.putalpha(a.point(lambda v: alpha if v else 0))
    pad = 40
    canvas = Image.new("RGBA", (sprite_img.width + pad * 2, sprite_img.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(sh, (pad + offset[0], pad + offset[1]), sh)
    canvas = canvas.filter(ImageFilter.GaussianBlur(blur))
    canvas.paste(sprite_img, (pad, pad), sprite_img)
    return canvas, pad


def hotbar(items, t, slot=88, scale=4):
    n = len(items)
    bar = Image.new("RGBA", (slot * n + 8, slot + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(bar)
    d.rectangle([0, 0, bar.width - 1, bar.height - 1], fill=(20, 14, 24, 235))
    for i, name in enumerate(items):
        x0 = 4 + i * slot
        d.rectangle([x0 + 3, 7, x0 + slot - 3, slot + 1], fill=(52, 44, 60, 255))
        d.line([x0 + 3, 7, x0 + slot - 3, 7], fill=(78, 68, 88, 255), width=3)
        d.line([x0 + 3, 7, x0 + 3, slot + 1], fill=(78, 68, 88, 255), width=3)
        spr = SPRITES[name](t).image(scale)
        bar.paste(spr, (x0 + (slot - spr.width) // 2, 4 + (slot - spr.height) // 2), spr)
    # casilla seleccionada
    d.rectangle([2, 2, slot + 5, slot + 5], outline=(255, 255, 255, 255), width=4)
    return bar


def texture_cover(theme_name, mode, out):
    t = THEMES[theme_name]
    im = background(t)
    hero = SPRITES[HERO[mode]](t).image(22)
    hero_s, pad = drop_shadow(hero)
    im.alpha_composite(hero_s, (W - hero.width - 90 - pad, (H - hero.height) // 2 - 40 - pad))
    bar = hotbar(HOTBAR[mode], t)
    im.alpha_composite(bar, (44, H - bar.height - 40))
    im.convert("RGB").save(out, "WEBP", quality=88, method=6)


def overlay_cover(theme_name, sprite_name, out):
    t = THEMES[theme_name]
    im = background(t)
    hero = SPRITES[sprite_name](t).image(24)
    hero_s, pad = drop_shadow(hero)
    im.alpha_composite(hero_s, ((W - hero.width) // 2 - pad, (H - hero.height) // 2 - pad))
    im.convert("RGB").save(out, "WEBP", quality=88, method=6)


def mod_icon(theme_name, sprite_name, bg_hex, out):
    t = THEMES[theme_name]
    size = 256
    im = Image.new("RGBA", (size, size), hx(bg_hex) + (255,))
    spr = SPRITES[sprite_name](t).image(12)
    s2, pad = drop_shadow(spr, offset=(6, 8), alpha=90, blur=4)
    im.alpha_composite(s2, ((size - spr.width) // 2 - pad, (size - spr.height) // 2 - pad))
    im.convert("RGB").save(out, "WEBP", quality=90, method=6)


TEXTURES = [
    ("fresa-helada", "strawberry", "sword"),
    ("obsidiana-rosa", "obsidian-pink", "crystal"),
    ("malvavisco-32x", "marshmallow", "smp"),
    ("nieve-limpia", "snow", "sword"),
    ("cobre-frio", "copper", "netherite"),
    ("medianoche-16x", "midnight", "netherite"),
    ("limonada", "lemon", "uhc"),
    ("ambar-ligero", "amber", "sword"),
    ("coral-pvp", "coral", "crystal"),
    ("jade-mini", "jade", "boxpvp"),
    ("tridente-azul", "ocean", "tridente"),
    ("mazo-dorado", "gold", "mazo"),
    ("lavanda-64x", "lavender", "smp"),
    ("grafito", "graphite", "sword"),
    ("cereza-neon", "cherry-neon", "crystal"),
    ("arena-128x", "sand", "smp"),
]
OVERLAYS = [
    ("fuego-bajo-plus", "fire", "flame"),
    ("escudo-mini", "shield", "shield"),
    ("totem-chico", "totem", "orb"),
    ("cielo-despejado", "sky", "cloud"),
    ("gui-oscura", "gui", "gui"),
    ("particulas-limpias", "particles", "sparkles"),
]
MODS = [
    ("hitbox-clara", "mod-pink", "crosshair", "#3a1f33"),
    ("zoom-suave", "mod-yellow", "magnifier", "#33291a"),
    ("contador-de-totems", "mod-yellow", "orb", "#2b2333"),
    ("menos-particulas", "mod-pink", "sparkles", "#241b2e"),
    ("mira-personalizada", "mod-white", "crosshair", "#1f2a3a"),
    ("fps-ligero", "mod-yellow", "bolt", "#2e1f2b"),
    ("chat-limpio", "mod-mint", "chat", "#16302a"),
    ("armadura-hud", "mod-white", "armor", "#2a2436"),
]


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "public/samples")
    for sub in ("textures", "overlays", "mods"):
        (out / sub).mkdir(parents=True, exist_ok=True)
    for slug, th, mode in TEXTURES:
        texture_cover(th, mode, out / "textures" / f"{slug}.webp")
    for slug, th, spr in OVERLAYS:
        overlay_cover(th, spr, out / "overlays" / f"{slug}.webp")
    for slug, th, spr, bg in MODS:
        mod_icon(th, spr, bg, out / "mods" / f"{slug}.webp")
    print("ok", out)


if __name__ == "__main__":
    main()
