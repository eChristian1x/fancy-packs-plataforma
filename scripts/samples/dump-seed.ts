// Exporta los recursos de ejemplo como JSON para scripts/samples/build_samples.py
import { SAMPLE_RESOURCES } from "../seed-data";
console.log(
  JSON.stringify(
    SAMPLE_RESOURCES.map((r) => ({
      slug: r.slug,
      name: r.name,
      type: r.type,
      summary: r.summary,
      owner: r.owner,
      resolution: r.resolution ?? null,
      versions: r.versions,
      loaders: r.loaders ?? [],
      history: (r.versionHistory ?? []).map((v) => v.number),
    })),
  ),
);
