/**
 * Mismo contenido que seedSampleAssets, como SQL para aplicarlo en Supabase desde el editor SQL
 * (la app no tiene permisos de DDL, pero esto solo es DML).
 *   npx tsx scripts/sample-assets-sql.ts > /tmp/assets.sql
 */
import { loadManifest } from "./sample-assets";

const m = loadManifest();
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const e = Object.entries(m);
const sample = `(select id from resources where is_sample)`;
const out: string[] = [
  `delete from gallery_images where resource_id in ${sample};`,
  `delete from image_features where resource_id in ${sample};`,
  `delete from resource_files where version_id in (select id from resource_versions where resource_id in ${sample});`,
  `delete from dependencies where version_id in (select id from resource_versions where resource_id in ${sample});`,
];
const gal = e.flatMap(([slug, x]) => x.gallery.map((u, i) => `(${q(slug)}, ${q(u)}, ${i})`));
if (gal.length)
  out.push(`insert into gallery_images (resource_id, url, width, height, sort_order) select r.id, g.url, 960, 600, g.ord from (values ${gal.join(",")}) g(slug, url, ord) join resources r on r.slug = g.slug and r.is_sample;`);
const latest = e.filter(([, x]) => x.file).map(([slug, x]) => `(${q(slug)}, ${q(x.file!.path)}, ${q(x.file!.name)}, ${x.file!.size}, ${q(x.file!.sha1)}, ${q(x.file!.sha512)})`);
if (latest.length)
  out.push(`insert into resource_files (version_id, storage_path, file_name, size_bytes, sha1, sha512, is_primary, scan_status) select (select v.id from resource_versions v where v.resource_id = r.id order by v.published_at desc limit 1), f.path, f.name, f.size, f.sha1, f.sha512, true, 'clean' from (values ${latest.join(",")}) f(slug, path, name, size, sha1, sha512) join resources r on r.slug = f.slug and r.is_sample;`);
const perVersion = e.flatMap(([slug, x]) => Object.entries(x.versionFiles ?? {}).map(([n, f]) => `(${q(slug)}, ${q(n)}, ${q(f.path)}, ${q(f.name)}, ${f.size}, ${q(f.sha1)}, ${q(f.sha512)})`));
if (perVersion.length)
  out.push(`insert into resource_files (version_id, storage_path, file_name, size_bytes, sha1, sha512, is_primary, scan_status) select v.id, f.path, f.name, f.size, f.sha1, f.sha512, true, 'clean' from (values ${perVersion.join(",")}) f(slug, num, path, name, size, sha1, sha512) join resources r on r.slug = f.slug and r.is_sample join resource_versions v on v.resource_id = r.id and v.version_number = f.num;`);
const deps = e.flatMap(([slug, x]) => (x.deps ?? []).map((d) => `(${q(slug)}, ${q(d.name)}, ${q(d.url)})`));
if (deps.length)
  out.push(`insert into dependencies (version_id, external_name, external_url, kind) select v.id, d.name, d.url, 'required' from (values ${deps.join(",")}) d(slug, name, url) join resources r on r.slug = d.slug and r.is_sample join resource_versions v on v.resource_id = r.id;`);
const feats = e.flatMap(([slug, x]) => x.features.map((f) => `(${q(slug)}, ${q(f.url)}, ${q(f.kind)}, '{${f.vector.join(",")}}')`));
if (feats.length)
  out.push(`insert into image_features (resource_id, url, kind, vector) select r.id, f.url, f.kind, f.vec::real[] from (values ${feats.join(",")}) f(slug, url, kind, vec) join resources r on r.slug = f.slug and r.is_sample;`);
console.log(out.join("\n"));
