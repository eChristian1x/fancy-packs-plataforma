#!/usr/bin/env python3
"""
Genera el material de ejemplo de las etapas 4+ y su manifiesto:
  public/samples/gallery/<slug>-1.webp, -2.webp   capturas de galería
  public/samples/files/<slug>.zip                  resource pack de ejemplo (válido, arte propio)
  public/samples/files/<slug>-<versión>.jar        mod de ejemplo: solo metadatos, no hace nada
  scripts/samples/manifest.json                    rutas, tamaños, hashes y huellas visuales

Uso: npx tsx scripts/samples/dump-seed.ts > /tmp/seed.json && python3 scripts/samples/build_samples.py /tmp/seed.json
"""
import hashlib
import io
import json
import zipfile
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import generate_covers as g  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "public" / "samples"
seed = {r["slug"]: r for r in json.load(open(sys.argv[1]))}
(PUB / "gallery").mkdir(parents=True, exist_ok=True)
(PUB / "files").mkdir(parents=True, exist_ok=True)

manifest = {}
for slug, theme, mode in g.TEXTURES:
    manifest[slug] = {"theme": theme, "mode": mode, "kind": "texture"}
for slug, theme, sprite in g.OVERLAYS:
    manifest[slug] = {"theme": theme, "mode": sprite, "kind": "overlay"}

for slug, m in manifest.items():
    r = seed[slug]
    gal = []
    if m["kind"] == "texture":
        g.gallery_items(m["theme"], m["mode"], PUB / "gallery" / f"{slug}-1.webp")
        g.gallery_blocks(m["theme"], g.HERO[m["mode"]], PUB / "gallery" / f"{slug}-2.webp")
    else:
        g.gallery_items(m["theme"], "sword", PUB / "gallery" / f"{slug}-1.webp")
        g.gallery_blocks(m["theme"], m["mode"], PUB / "gallery" / f"{slug}-2.webp")
    gal = [f"/samples/gallery/{slug}-1.webp", f"/samples/gallery/{slug}-2.webp"]

    data = g.sample_zip(slug, r["name"], m["theme"], m["mode"], r["resolution"], r["versions"], m["kind"])
    fname = f"{slug}.zip"
    (PUB / "files" / fname).write_bytes(data)

    cover = f"/samples/{'textures' if m['kind'] == 'texture' else 'overlays'}/{slug}.webp"
    feats = [{"url": u, "kind": k, "vector": g.features(ROOT / "public" / u.lstrip("/"))}
             for u, k in [(cover, "cover"), (gal[0], "gallery"), (gal[1], "gallery")]]
    m.update({
        "gallery": gal,
        "file": {
            "path": f"/samples/files/{fname}",
            "name": fname,
            "size": len(data),
            "sha1": hashlib.sha1(data).hexdigest(),
            "sha512": hashlib.sha512(data).hexdigest(),
        },
        "features": feats,
    })

def fileinfo(fname, data):
    return {"path": f"/samples/files/{fname}", "name": fname, "size": len(data),
            "sha1": hashlib.sha1(data).hexdigest(), "sha512": hashlib.sha512(data).hexdigest()}


def sample_jar(r, number):
    """Mod de ejemplo: un .jar con los metadatos de Fabric/Quilt/Forge, sin código."""
    mid = r["slug"].replace("-", "_")
    note = ("Archivo de ejemplo de Fancy Packs.\n"
            "Solo contiene los metadatos del mod para probar las descargas y la revisión de archivos.\n"
            "No agrega nada al juego.\n")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("META-INF/MANIFEST.MF", "Manifest-Version: 1.0\n\n")
        z.writestr("LEEME.txt", note)
        vs = sorted(r["versions"], key=lambda v: [int(x) for x in v.split(".")])
        if "fabric" in r["loaders"] or "quilt" in r["loaders"]:
            z.writestr("fabric.mod.json", json.dumps({
                "schemaVersion": 1, "id": mid, "version": number, "name": r["name"],
                "description": r["summary"] + " (ejemplo)", "authors": [r["owner"]], "environment": "client",
                "depends": {"fabricloader": ">=0.16.0", "minecraft": f">={vs[0]} <={vs[-1]}", "fabric-api": "*"},
            }, ensure_ascii=False, indent=2))
        if "forge" in r["loaders"] or "neoforge" in r["loaders"]:
            loader = "neoforge" if "neoforge" in r["loaders"] else "forge"
            toml = (f'modLoader="javafml"\nloaderVersion="[1,)"\nlicense="All rights reserved"\n\n[[mods]]\n'
                    f'modId="{mid}"\nversion="{number}"\ndisplayName="{r["name"]}"\ndescription="""{r["summary"]} (ejemplo)"""\n\n'
                    f'[[dependencies.{mid}]]\nmodId="minecraft"\ntype="required"\nversionRange="[{vs[0]},{vs[-1]}]"\nside="CLIENT"\n')
            z.writestr("META-INF/neoforge.mods.toml" if loader == "neoforge" else "META-INF/mods.toml", toml)
    return buf.getvalue()


for r in seed.values():
    if r["type"] != "mod":
        continue
    files = {}
    for number in r["history"]:
        data = sample_jar(r, number)
        fname = f"{r['slug']}-{number}.jar"
        (PUB / "files" / fname).write_bytes(data)
        files[number] = fileinfo(fname, data)
    manifest[r["slug"]] = {"kind": "mod", "gallery": [], "versionFiles": files, "features": [],
                           "deps": [{"name": "Fabric API", "url": "https://modrinth.com/mod/fabric-api"}] if "fabric" in r["loaders"] or "quilt" in r["loaders"] else []}

out = ROOT / "scripts" / "samples" / "manifest.json"
out.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")))
print("ok", len(manifest), "recursos;", out.stat().st_size // 1024, "KB de manifiesto")
