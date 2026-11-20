import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  categories,
  comments,
  downloads,
  profiles,
  reports,
  resourceCategories,
  resourceFiles,
  resourceVersions,
  resources,
  type ResourceType,
} from "@/lib/db/schema";

const RID = sql.raw(`"resources"."id"`);
const PID = sql.raw(`"profiles"."id"`);

export async function getOverview() {
  const db = await getDb();
  const [[users], byStatus, [dl], [rep], [pendingVersions], series, top, sources] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        week: sql<number>`count(*) filter (where ${profiles.createdAt} > now() - interval '7 days')::int`,
        banned: sql<number>`count(*) filter (where ${profiles.isBanned})::int`,
      })
      .from(profiles)
      .where(eq(profiles.isSample, false)),
    db.select({ status: resources.status, n: sql<number>`count(*)::int` }).from(resources).groupBy(resources.status),
    db
      .select({
        today: sql<number>`count(*) filter (where ${downloads.createdAt} > date_trunc('day', now()))::int`,
        week: sql<number>`count(*) filter (where ${downloads.createdAt} > now() - interval '7 days')::int`,
        month: sql<number>`count(*) filter (where ${downloads.createdAt} > now() - interval '30 days')::int`,
      })
      .from(downloads)
      .where(sql`${downloads.ipHash} is not null`),
    db.select({ n: sql<number>`count(*)::int` }).from(reports).where(eq(reports.status, "open")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(resourceVersions)
      .innerJoin(resources, and(eq(resources.id, resourceVersions.resourceId), eq(resources.status, "published")))
      .where(isNull(resourceVersions.publishedAt)),
    downloadSeries(30),
    db
      .select({ id: resources.id, name: resources.name, type: resources.type, slug: resources.slug, n: sql<number>`count(${downloads.id})::int` })
      .from(downloads)
      .innerJoin(resources, eq(resources.id, downloads.resourceId))
      .where(and(sql`${downloads.ipHash} is not null`, sql`${downloads.createdAt} > now() - interval '7 days'`))
      .groupBy(resources.id)
      .orderBy(desc(sql`count(${downloads.id})`))
      .limit(8),
    db
      .select({ source: downloads.source, n: sql<number>`count(*)::int` })
      .from(downloads)
      .where(and(sql`${downloads.ipHash} is not null`, sql`${downloads.createdAt} > now() - interval '30 days'`))
      .groupBy(downloads.source),
  ]);
  const status = Object.fromEntries(byStatus.map((s) => [s.status, s.n])) as Record<string, number>;
  return { users, status, downloads: dl, openReports: rep.n, pendingVersions: pendingVersions.n, series, top, sources };
}

export async function downloadSeries(days: number) {
  const db = await getDb();
  const rows = await db
    .select({ day: sql<string>`to_char(date_trunc('day', ${downloads.createdAt}), 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
    .from(downloads)
    .where(and(sql`${downloads.ipHash} is not null`, sql`${downloads.createdAt} > now() - make_interval(days => ${days})`))
    .groupBy(sql`1`);
  const map = new Map(rows.map((r) => [r.day, r.n]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
    return { day: d, n: map.get(d) ?? 0 };
  });
}

/** Publicaciones en revisión y versiones nuevas de publicaciones ya aprobadas. */
export async function getPending() {
  const db = await getDb();
  const items = await db
    .select({
      id: resources.id,
      type: resources.type,
      slug: resources.slug,
      name: resources.name,
      summary: resources.summary,
      coverUrl: resources.coverUrl,
      authorName: resources.authorName,
      permissionNote: resources.permissionNote,
      updatedAt: resources.updatedAt,
      owner: profiles.username,
      ownerName: profiles.displayName,
      ownerVerified: profiles.isVerified,
    })
    .from(resources)
    .innerJoin(profiles, eq(profiles.id, resources.ownerId))
    .where(eq(resources.status, "pending"))
    .orderBy(asc(resources.updatedAt));
  const versions = await db
    .select({
      versionId: resourceVersions.id,
      versionNumber: resourceVersions.versionNumber,
      changelog: resourceVersions.changelog,
      mcVersions: resourceVersions.mcVersions,
      createdAt: resourceVersions.createdAt,
      resourceId: resources.id,
      type: resources.type,
      slug: resources.slug,
      name: resources.name,
      owner: profiles.username,
    })
    .from(resourceVersions)
    .innerJoin(resources, and(eq(resources.id, resourceVersions.resourceId), eq(resources.status, "published")))
    .innerJoin(profiles, eq(profiles.id, resources.ownerId))
    .where(isNull(resourceVersions.publishedAt))
    .orderBy(asc(resourceVersions.createdAt));
  const ids = [...items.map((i) => i.id)];
  const vIds = versions.map((v) => v.versionId);
  const files = ids.length || vIds.length
    ? await db
        .select({ resourceId: resourceVersions.resourceId, versionId: resourceFiles.versionId, fileName: resourceFiles.fileName, sizeBytes: resourceFiles.sizeBytes, storagePath: resourceFiles.storagePath, sha1: resourceFiles.sha1, mc: resourceVersions.mcVersions, number: resourceVersions.versionNumber })
        .from(resourceFiles)
        .innerJoin(resourceVersions, eq(resourceVersions.id, resourceFiles.versionId))
        .where(or(ids.length ? inArray(resourceVersions.resourceId, ids) : undefined, vIds.length ? inArray(resourceFiles.versionId, vIds) : undefined))
    : [];
  const cats = ids.length
    ? await db
        .select({ resourceId: resourceCategories.resourceId, name: categories.name })
        .from(resourceCategories)
        .innerJoin(categories, eq(categories.id, resourceCategories.categoryId))
        .where(inArray(resourceCategories.resourceId, ids))
    : [];
  return {
    items: items.map((i) => ({ ...i, updatedAt: new Date(i.updatedAt).toISOString(), files: files.filter((f) => f.resourceId === i.id), categories: cats.filter((c) => c.resourceId === i.id).map((c) => c.name) })),
    versions: versions.map((v) => ({ ...v, createdAt: new Date(v.createdAt).toISOString(), files: files.filter((f) => f.versionId === v.versionId) })),
  };
}

export async function listResources(opts: { q: string; status: string; type: string; page: number }) {
  const db = await getDb();
  const where: (SQL | undefined)[] = [];
  if (opts.q) where.push(or(ilike(resources.name, `%${opts.q.replace(/[\\%_]/g, (c) => "\\" + c)}%`), ilike(profiles.username, `%${opts.q.replace(/[\\%_]/g, (c) => "\\" + c)}%`)));
  if (opts.status) where.push(eq(resources.status, opts.status as never));
  if (opts.type) where.push(eq(resources.type, opts.type as ResourceType));
  const w = and(...where);
  const size = 30;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({
        id: resources.id,
        type: resources.type,
        slug: resources.slug,
        name: resources.name,
        status: resources.status,
        featured: resources.featured,
        isSample: resources.isSample,
        downloadCount: resources.downloadCount,
        updatedAt: resources.updatedAt,
        owner: profiles.username,
        coverUrl: resources.coverUrl,
        reports: sql<number>`(select count(*)::int from reports r where r.target_id = ${RID} and r.status = 'open')`,
      })
      .from(resources)
      .innerJoin(profiles, eq(profiles.id, resources.ownerId))
      .where(w)
      .orderBy(desc(resources.updatedAt))
      .limit(size)
      .offset((opts.page - 1) * size),
    db.select({ n: sql<number>`count(*)::int` }).from(resources).innerJoin(profiles, eq(profiles.id, resources.ownerId)).where(w),
  ]);
  return { rows: rows.map((r) => ({ ...r, updatedAt: new Date(r.updatedAt).toISOString() })), total: n, pages: Math.max(1, Math.ceil(n / size)) };
}

export async function listUsers(opts: { q: string; filter: string; page: number }) {
  const db = await getDb();
  const where: (SQL | undefined)[] = [];
  if (opts.q) where.push(or(ilike(profiles.username, `%${opts.q.replace(/[\\%_]/g, (c) => "\\" + c)}%`), ilike(profiles.displayName, `%${opts.q.replace(/[\\%_]/g, (c) => "\\" + c)}%`)));
  if (opts.filter === "suspendidos") where.push(eq(profiles.isBanned, true));
  if (opts.filter === "equipo") where.push(inArray(profiles.role, ["admin", "moderator"]));
  if (opts.filter === "verificados") where.push(eq(profiles.isVerified, true));
  if (opts.filter !== "ejemplo") where.push(eq(profiles.isSample, false));
  else where.push(eq(profiles.isSample, true));
  const w = and(...where);
  const size = 40;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({
        id: profiles.id,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        role: profiles.role,
        isBanned: profiles.isBanned,
        isVerified: profiles.isVerified,
        createdAt: profiles.createdAt,
        resources: sql<number>`(select count(*)::int from resources r where r.owner_id = ${PID} and r.status = 'published')`,
        comments: sql<number>`(select count(*)::int from comments c where c.user_id = ${PID})`,
      })
      .from(profiles)
      .where(w)
      .orderBy(desc(profiles.createdAt))
      .limit(size)
      .offset((opts.page - 1) * size),
    db.select({ n: sql<number>`count(*)::int` }).from(profiles).where(w),
  ]);
  return { rows: rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() })), total: n, pages: Math.max(1, Math.ceil(n / size)) };
}

export async function listCategories() {
  const db = await getDb();
  return db
    .select({
      id: categories.id,
      type: categories.type,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      icon: categories.icon,
      sortOrder: categories.sortOrder,
      n: sql<number>`(select count(*)::int from resource_categories rc where rc.category_id = ${sql.raw(`"categories"."id"`)})`,
    })
    .from(categories)
    .orderBy(asc(categories.type), asc(categories.sortOrder));
}

export async function listReports(status: string) {
  const db = await getDb();
  const rows = await db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      createdAt: reports.createdAt,
      reporter: profiles.username,
    })
    .from(reports)
    .leftJoin(profiles, eq(profiles.id, reports.reporterId))
    .where(eq(reports.status, status))
    .orderBy(desc(reports.createdAt))
    .limit(100);
  const resIds = rows.filter((r) => r.targetType === "resource").map((r) => r.targetId);
  const comIds = rows.filter((r) => r.targetType === "comment").map((r) => r.targetId);
  const [res, com] = await Promise.all([
    resIds.length ? db.select({ id: resources.id, name: resources.name, slug: resources.slug, type: resources.type, status: resources.status }).from(resources).where(inArray(resources.id, resIds)) : [],
    comIds.length ? db.select({ id: comments.id, body: comments.body, status: comments.status }).from(comments).where(inArray(comments.id, comIds)) : [],
  ]);
  return rows.map((r) => ({
    ...r,
    createdAt: new Date(r.createdAt).toISOString(),
    resource: res.find((x) => x.id === r.targetId) ?? null,
    comment: com.find((x) => x.id === r.targetId) ?? null,
  }));
}

export async function getDownloadStats(days: number) {
  const db = await getDb();
  const [series, byType, byVersion, top] = await Promise.all([
    downloadSeries(days),
    db
      .select({ type: resources.type, source: downloads.source, n: sql<number>`count(*)::int` })
      .from(downloads)
      .innerJoin(resources, eq(resources.id, downloads.resourceId))
      .where(and(sql`${downloads.ipHash} is not null`, sql`${downloads.createdAt} > now() - make_interval(days => ${days})`))
      .groupBy(resources.type, downloads.source),
    db
      .select({ v: sql<string>`v`, n: sql<number>`count(*)::int` })
      .from(sql`${downloads} join ${resourceVersions} on ${resourceVersions.id} = ${downloads.versionId}, unnest(${resourceVersions.mcVersions}) as v`)
      .where(and(sql`${downloads.ipHash} is not null`, sql`${downloads.createdAt} > now() - make_interval(days => ${days})`))
      .groupBy(sql`v`)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    db
      .select({ name: resources.name, slug: resources.slug, type: resources.type, n: sql<number>`count(*)::int` })
      .from(downloads)
      .innerJoin(resources, eq(resources.id, downloads.resourceId))
      .where(and(sql`${downloads.ipHash} is not null`, sql`${downloads.createdAt} > now() - make_interval(days => ${days})`))
      .groupBy(resources.id)
      .orderBy(desc(sql`count(*)`))
      .limit(20),
  ]);
  return { series, byType, byVersion, top };
}
